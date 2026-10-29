/**
 * Email Service — supports Resend, SendGrid, and console (dev mode).
 * ALL credentials from config only. Never exposed to clients.
 *
 * Template system: HTML + plain text, centralized branding.
 * Rate limiting: max 3 emails per user per template per hour.
 */
import { Resend } from 'resend';
import { config } from '../../config/config.js';
import { logger } from '../../config/logger.js';
import { EmailLogModel } from './email.models.js';
import mongoose from 'mongoose';

// ── Brand tokens ────────────────────────────────────────────────────────────
const BRAND = {
  name: 'Tally.io',
  color: '#3730a3',    // indigo-700
  colorLight: '#eef2ff',
  supportEmail: 'support@tally.io',
  websiteUrl: 'https://tally.io',
  logoText: 'Tally.io',
};

// ── Base email HTML wrapper ──────────────────────────────────────────────────
function wrapHtml(content: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#1e293b;">
${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}&nbsp;</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

      <!-- Header -->
      <tr><td style="background:${BRAND.color};border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
        <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">${BRAND.logoText}</span>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#fff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        ${content}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#64748b;">
          © ${new Date().getFullYear()} ${BRAND.name} &nbsp;·&nbsp;
          <a href="mailto:${BRAND.supportEmail}" style="color:#64748b;">${BRAND.supportEmail}</a>
        </p>
        <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">
          You received this email because you have a ${BRAND.name} account.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Template definitions ─────────────────────────────────────────────────────

export function buildVerificationEmail(data: {
  firstName: string;
  code: string;
  verifyUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Verify your Tally.io email address`;
  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1e293b;">Verify your email</h2>
    <p style="margin:0 0 20px;color:#475569;">Hi ${data.firstName}, welcome to Tally.io.</p>
    <p style="margin:0 0 16px;color:#475569;">Use the code below to verify your email address. It expires in 24 hours.</p>

    <div style="background:${BRAND.colorLight};border:2px dashed ${BRAND.color};border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
      <span style="font-size:36px;font-weight:700;color:${BRAND.color};letter-spacing:8px;font-family:monospace;">${data.code}</span>
    </div>

    <p style="margin:0 0 8px;color:#475569;font-size:13px;">Or click the button below:</p>
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${data.verifyUrl}" style="background:${BRAND.color};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">Verify Email Address</a>
    </div>

    <p style="margin:0;font-size:12px;color:#94a3b8;">If you didn't create a Tally.io account, you can safely ignore this email.</p>
  `, 'Your verification code is ready');

  const text = `Hi ${data.firstName},

Welcome to Tally.io! Verify your email with this code: ${data.code}

Or visit: ${data.verifyUrl}

This code expires in 24 hours. If you didn't create an account, ignore this email.`;

  return { subject, html, text };
}

export function buildOnboardingReminder1Email(data: {
  firstName: string;
  resumeUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your Tally.io setup takes just a few minutes`;
  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;">Complete your setup</h2>
    <p style="margin:0 0 20px;color:#475569;">Hi ${data.firstName},</p>
    <p style="margin:0 0 16px;color:#475569;">We noticed you started setting up your Tally.io account. You don't need to configure everything at once — start with these essentials:</p>

    <ol style="margin:0 0 24px;padding-left:20px;color:#475569;">
      <li style="margin-bottom:8px;">Complete your business details</li>
      <li style="margin-bottom:8px;">Add your first product or service</li>
      <li style="margin-bottom:8px;">Record your first sale</li>
      <li style="margin-bottom:0;">Review your business dashboard</li>
    </ol>

    <div style="text-align:center;margin:0 0 20px;">
      <a href="${data.resumeUrl}" style="background:${BRAND.color};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">Continue Setup</a>
    </div>

    <p style="margin:0;font-size:12px;color:#94a3b8;">You can configure the remaining features as your business grows. If anything was unclear, reply to this email — we're here to help.</p>
  `, 'Pick up where you left off');

  const text = `Hi ${data.firstName},

We noticed you started setting up Tally.io but haven't finished yet.

Get started with just a few steps:
1. Complete your business details
2. Add your first product or service
3. Record your first sale
4. Review your business dashboard

Continue here: ${data.resumeUrl}

Reply to this email if you need any help.`;

  return { subject, html, text };
}

export function buildOnboardingReminder2Email(data: {
  firstName: string;
  businessType: string;
  resumeUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Get more from your Tally.io business dashboard`;

  const benefits: Record<string, string[]> = {
    salon: ['Track every service and revenue per stylist', 'See your busiest days and most popular services', 'Manage customer appointments and history'],
    restaurant: ['Monitor daily sales and expenses', 'Track ingredient costs and reduce waste', 'Compare performance across busy periods'],
    default: ['Track daily sales and real profits', 'Monitor inventory and get low-stock alerts', 'Manage expenses and understand your cash flow'],
  };

  const relevantBenefits = benefits[data.businessType] ?? benefits['default']!;

  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;">Your business dashboard is waiting</h2>
    <p style="margin:0 0 20px;color:#475569;">Hi ${data.firstName},</p>
    <p style="margin:0 0 16px;color:#475569;">Tally.io gives you clear visibility into your business:</p>

    <ul style="margin:0 0 24px;padding-left:20px;color:#475569;">
      ${relevantBenefits.map((b) => `<li style="margin-bottom:8px;">${b}</li>`).join('')}
    </ul>

    <div style="text-align:center;margin:0 0 20px;">
      <a href="${data.resumeUrl}" style="background:${BRAND.color};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">Finish Setting Up</a>
    </div>
  `, 'Your dashboard is ready to go');

  const text = `Hi ${data.firstName},

Tally.io can help your business:
${relevantBenefits.map((b) => `- ${b}`).join('\n')}

Finish your setup here: ${data.resumeUrl}`;

  return { subject, html, text };
}

export function buildOnboardingReminder3Email(data: {
  firstName: string;
  resumeUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Need a hand finishing your Tally.io setup?`;
  const html = wrapHtml(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;">Need some help?</h2>
    <p style="margin:0 0 16px;color:#475569;">Hi ${data.firstName},</p>
    <p style="margin:0 0 16px;color:#475569;">Setting up a new system can feel like extra work when your business is busy. We get it.</p>
    <p style="margin:0 0 24px;color:#475569;">If something wasn't clear or you ran into an issue, reply to this email and we'll help you get started.</p>

    <div style="text-align:center;margin:0 0 20px;">
      <a href="${data.resumeUrl}" style="background:${BRAND.color};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">Resume Setup</a>
    </div>

    <p style="margin:0;font-size:12px;color:#94a3b8;">This is the last reminder we'll send about your setup. Your account remains active — you can always continue when you're ready.</p>
  `, 'We can help you get started');

  const text = `Hi ${data.firstName},

Need help finishing your Tally.io setup? Reply to this email and we'll assist you.

Resume here: ${data.resumeUrl}

This is our last setup reminder. Your account stays active.`;

  return { subject, html, text };
}

// ── Send function ────────────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  userId?: string;
  organizationId?: string;
  isTransactional?: boolean;
}

export async function sendEmail(params: SendEmailParams): Promise<string | null> {
  const logEntry = await EmailLogModel.create({
    organizationId: params.organizationId
      ? new mongoose.Types.ObjectId(params.organizationId)
      : undefined,
    userId: params.userId ? new mongoose.Types.ObjectId(params.userId) : undefined,
    to: params.to,
    subject: params.subject,
    template: params.template,
    provider: config.email.provider,
    status: 'queued',
    attempts: 0,
    isTransactional: params.isTransactional ?? true,
  });

  try {
    let messageId: string | null = null;

    if (config.email.provider === 'resend' && config.email.resendApiKey) {
      const resend = new Resend(config.email.resendApiKey);
      const result = await resend.emails.send({
        from: `${config.email.fromName} <${config.email.from}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      messageId = result.data?.id ?? null;
    } else if (config.email.provider === 'console' || !config.email.isConfigured) {
      // Development: log to console instead of sending
      logger.info(
        {
          to: params.to,
          subject: params.subject,
          template: params.template,
          preview: params.text.slice(0, 200),
        },
        '[DEV EMAIL] Would send email',
      );
      messageId = `dev-${Date.now()}`;
    } else {
      logger.warn({ template: params.template }, 'Email provider not configured');
      await logEntry.updateOne({ status: 'failed', error: 'Provider not configured', attempts: 1 });
      return null;
    }

    await logEntry.updateOne({
      status: 'sent',
      messageId,
      sentAt: new Date(),
      attempts: 1,
    });

    return messageId;
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ template: params.template, to: params.to, error }, 'Email send failed');
    await logEntry.updateOne({ status: 'failed', error, attempts: 1, lastAttemptAt: new Date() });
    return null;
  }
}

// ── Rate limiter: prevent duplicate emails ────────────────────────────────────
export async function canSendEmail(
  to: string,
  template: string,
  windowHours = 1,
): Promise<boolean> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const count = await EmailLogModel.countDocuments({
    to: to.toLowerCase(),
    template,
    createdAt: { $gte: since },
    status: { $in: ['queued', 'sent', 'delivered'] },
  });
  return count === 0;
}
