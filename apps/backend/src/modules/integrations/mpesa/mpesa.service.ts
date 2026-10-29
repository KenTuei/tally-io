/**
 * M-Pesa Daraja integration — STK Push, callback handling, reconciliation.
 *
 * SECURITY RULES enforced here:
 * 1. All credentials come from config (environment variables) — never client code.
 * 2. A payment is NOT confirmed until the server callback is verified.
 * 3. Callbacks are idempotent — duplicate callbacks have no additional effect.
 * 4. organizationId always comes from the authenticated session, never the request body.
 * 5. Sensitive auth data is never logged.
 */

import { config } from '../../../config/config.js';
import { logger } from '../../../config/logger.js';
import { AppError } from '../../../middleware/error.middleware.js';
import { PaymentAttemptModel } from '../../sales/sales.models.js';
import { SaleModel } from '../../sales/sales.models.js';
import mongoose from 'mongoose';

interface StkPushRequest {
  phoneNumber: string;    // 254XXXXXXXXX format
  amount: number;         // KES — whole shillings (not cents)
  accountReference: string; // receipt number
  transactionDesc: string;
  saleId: string;
  organizationId: string;
  idempotencyKey: string;
}

interface DarajaAuthResponse {
  access_token: string;
  expires_in: string;
}

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface StkCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

/** Get OAuth token from Daraja. Never log the credentials. */
async function getDarajaToken(): Promise<string> {
  if (!config.mpesa.isConfigured) {
    throw new AppError('MPESA_NOT_CONFIGURED', 'M-Pesa is not configured', 503);
  }

  const credentials = Buffer.from(
    `${config.mpesa.consumerKey}:${config.mpesa.consumerSecret}`,
  ).toString('base64');

  const baseUrl =
    config.mpesa.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.ok) {
    logger.error({ status: response.status }, 'Daraja auth failed');
    throw new AppError('MPESA_AUTH_FAILED', 'M-Pesa authentication failed', 502);
  }

  const data = (await response.json()) as DarajaAuthResponse;
  return data.access_token;
}

/** Initiate STK Push to customer's phone */
export async function initiateSTKPush(req: StkPushRequest): Promise<{
  checkoutRequestId: string;
  merchantRequestId: string;
}> {
  if (!config.mpesa.isConfigured) {
    throw new AppError(
      'MPESA_NOT_CONFIGURED',
      'M-Pesa Daraja credentials are not configured. Add them in Settings → Integrations.',
      503,
    );
  }

  // Check idempotency — don't initiate twice for same key
  const existing = await PaymentAttemptModel.findOne({
    idempotencyKey: req.idempotencyKey,
  });
  if (existing) {
    return {
      checkoutRequestId: (existing.reference as string) ?? '',
      merchantRequestId: existing._id.toString(),
    };
  }

  const token = await getDarajaToken();

  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14);

  const password = Buffer.from(
    `${config.mpesa.shortcode}${config.mpesa.passkey}${timestamp}`,
  ).toString('base64');

  const baseUrl =
    config.mpesa.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  const body = {
    BusinessShortCode: config.mpesa.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: req.amount, // whole KES shillings
    PartyA: req.phoneNumber,
    PartyB: config.mpesa.shortcode,
    PhoneNumber: req.phoneNumber,
    CallBackURL: config.mpesa.callbackUrl,
    AccountReference: req.accountReference.slice(0, 12),
    TransactionDesc: req.transactionDesc.slice(0, 13),
  };

  const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text();
    logger.error({ status: response.status, saleId: req.saleId }, 'STK push failed');
    throw new AppError('MPESA_STK_FAILED', 'Failed to initiate M-Pesa payment', 502);
  }

  const data = (await response.json()) as StkPushResponse;

  if (data.ResponseCode !== '0') {
    throw new AppError(
      'MPESA_STK_REJECTED',
      data.ResponseDescription ?? 'STK Push rejected',
      400,
    );
  }

  // Record pending payment attempt
  await PaymentAttemptModel.create({
    organizationId: new mongoose.Types.ObjectId(req.organizationId),
    saleId: new mongoose.Types.ObjectId(req.saleId),
    method: 'mpesa',
    amount: req.amount * 100, // store as cents
    currency: 'KES',
    status: 'pending',
    reference: data.CheckoutRequestID,
    idempotencyKey: req.idempotencyKey,
    initiatedAt: new Date(),
  });

  logger.info({ saleId: req.saleId, checkoutId: data.CheckoutRequestID }, 'STK Push initiated');

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
  };
}

/** Handle Daraja STK Push callback. Idempotent — safe to call multiple times. */
export async function handleSTKCallback(body: StkCallbackBody): Promise<void> {
  const cb = body.Body.stkCallback;

  logger.info(
    {
      checkoutRequestId: cb.CheckoutRequestID,
      resultCode: cb.ResultCode,
    },
    'M-Pesa callback received',
  );

  // Find the pending payment attempt by checkoutRequestId
  const attempt = await PaymentAttemptModel.findOne({
    reference: cb.CheckoutRequestID,
  });

  if (!attempt) {
    logger.warn({ checkoutId: cb.CheckoutRequestID }, 'No payment attempt found for callback');
    return;
  }

  // Idempotency — already processed
  if (attempt.status === 'confirmed' || attempt.status === 'failed') {
    logger.info({ checkoutId: cb.CheckoutRequestID }, 'Callback already processed, skipping');
    return;
  }

  if (cb.ResultCode === 0) {
    // SUCCESS — extract transaction metadata from callback
    const items = cb.CallbackMetadata?.Item ?? [];
    const getMeta = (name: string) => items.find((i) => i.Name === name)?.Value;

    const mpesaRef = getMeta('MpesaReceiptNumber') as string | undefined;
    const amount = getMeta('Amount') as number | undefined;
    const phone = getMeta('PhoneNumber') as string | undefined;

    // Verify amount matches what was requested (±1 KES tolerance for rounding)
    const expectedKes = Math.round(attempt.amount / 100);
    if (amount !== undefined && Math.abs(Number(amount) - expectedKes) > 1) {
      logger.error(
        { expected: expectedKes, received: amount, checkoutId: cb.CheckoutRequestID },
        'M-Pesa amount mismatch — rejecting callback',
      );
      await attempt.updateOne({ status: 'failed' });
      return;
    }

    await attempt.updateOne({
      status: 'confirmed',
      confirmedAt: new Date(),
      reference: mpesaRef ?? cb.CheckoutRequestID,
    });

    // Update sale status to completed
    await SaleModel.updateOne(
      { _id: attempt.saleId, status: { $in: ['pending_payment', 'draft'] } },
      { $set: { status: 'completed', completedAt: new Date() } },
    );

    logger.info(
      { saleId: attempt.saleId.toString(), mpesaRef },
      'M-Pesa payment confirmed',
    );
  } else {
    // FAILURE
    await attempt.updateOne({ status: 'failed' });

    logger.warn(
      { checkoutId: cb.CheckoutRequestID, reason: cb.ResultDesc },
      'M-Pesa payment failed',
    );
  }
}

/** Query payment status from Daraja (for reconciliation) */
export async function querySTKStatus(checkoutRequestId: string): Promise<string> {
  if (!config.mpesa.isConfigured) {
    throw new AppError('MPESA_NOT_CONFIGURED', 'M-Pesa not configured', 503);
  }

  const token = await getDarajaToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(
    `${config.mpesa.shortcode}${config.mpesa.passkey}${timestamp}`,
  ).toString('base64');

  const baseUrl =
    config.mpesa.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BusinessShortCode: config.mpesa.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });

  const data = (await response.json()) as { ResultCode?: string; ResultDesc?: string };
  return data.ResultDesc ?? 'Unknown';
}
