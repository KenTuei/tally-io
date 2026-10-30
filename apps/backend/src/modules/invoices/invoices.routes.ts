import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { InvoiceModel } from './invoices.models.js';
import { CustomerModel } from '../customers/customers.models.js';
import { generateInvoicePDF, generateReceiptPDF } from '../../utils/pdf.js';
import { SaleModel, SaleItemModel, PaymentAttemptModel } from '../sales/sales.models.js';
import mongoose2 from 'mongoose';

const invoiceItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unitPrice: z.number().int().nonnegative(),
  discountAmount: z.number().int().nonnegative().default(0),
  taxRateId: z.string().optional(),
  taxRate: z.number().int().min(0).max(10000).default(0),
});

const createInvoiceSchema = z.object({
  type: z.enum(['invoice', 'quote', 'credit_note']).default('invoice'),
  customerId: z.string().optional(),
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    county: z.string().optional(),
    country: z.string().default('KE'),
  }).optional(),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  items: z.array(invoiceItemSchema).min(1),
  notes: z.string().max(1000).optional(),
  terms: z.string().max(1000).optional(),
  currency: z.string().default('KES'),
  branchId: z.string().optional(),
});

const recordPaymentSchema = z.object({
  amount: z.number().int().positive(),
  method: z.enum(['cash', 'mpesa', 'card', 'bank_transfer', 'other']),
  reference: z.string().optional(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const querySchema = z.object({
  type: z.enum(['invoice', 'quote', 'credit_note']).optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

async function generateInvoiceNumber(
  orgId: mongoose.Types.ObjectId,
  type: string,
): Promise<string> {
  const prefix = type === 'quote' ? 'QT' : type === 'credit_note' ? 'CN' : 'INV';
  const year = new Date().getFullYear();
  const count = await InvoiceModel.countDocuments({
    organizationId: orgId,
    type,
    createdAt: { $gte: new Date(`${year}-01-01`) },
  });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

function calculateTotals(items: z.infer<typeof invoiceItemSchema>[]) {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  const enriched = items.map((item) => {
    const lineSubtotal = item.unitPrice * item.quantity;
    const disc = item.discountAmount;
    const taxBase = lineSubtotal - disc;
    const tax = Math.round((taxBase * item.taxRate) / 10000);
    const lineTotal = taxBase + tax;

    subtotal += lineSubtotal;
    discountAmount += disc;
    taxAmount += tax;

    return {
      ...item,
      taxAmount: tax,
      lineTotal,
    };
  });

  const total = subtotal - discountAmount + taxAmount;

  return { enriched, subtotal, discountAmount, taxAmount, total };
}

export async function invoiceRoutes(app: FastifyInstance): Promise<void> {
  // ── List ─────────────────────────────────────────────────────────────────────
  app.get('/', async (request, reply) => {
    const q = querySchema.parse(request.query);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);
    const filter: Record<string, unknown> = { organizationId: orgId };

    if (q.type) filter['type'] = q.type;
    if (q.status) filter['status'] = q.status;
    if (q.customerId) filter['customerId'] = new mongoose.Types.ObjectId(q.customerId);
    if (q.q) filter['$or'] = [
      { invoiceNumber: { $regex: q.q, $options: 'i' } },
      { customerName: { $regex: q.q, $options: 'i' } },
    ];
    if (q.from || q.to) {
      filter['issueDate'] = {
        ...(q.from && { $gte: new Date(q.from) }),
        ...(q.to && { $lte: new Date(q.to + 'T23:59:59Z') }),
      };
    }

    const skip = (q.page - 1) * q.limit;
    const [invoices, total] = await Promise.all([
      InvoiceModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
      InvoiceModel.countDocuments(filter),
    ]);

    // Auto-mark overdue
    const now = new Date();
    const ids = invoices
      .filter((inv) => inv.status === 'sent' && inv.dueDate && inv.dueDate < now)
      .map((inv) => inv._id);
    if (ids.length > 0) {
      await InvoiceModel.updateMany({ _id: { $in: ids } }, { $set: { status: 'overdue' } });
    }

    return reply.send({
      data: invoices.map((i) => ({ ...i, id: i._id.toString() })),
      pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    });
  });

  // ── Get one ──────────────────────────────────────────────────────────────────
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await InvoiceModel.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(request.tenantId),
    }).lean();

    if (!invoice) throw new NotFoundError('Invoice');

    // Mark as viewed if sent
    if (invoice.status === 'sent') {
      await InvoiceModel.findByIdAndUpdate(id, { $set: { status: 'viewed' } });
    }

    return reply.send({ data: { ...invoice, id: invoice._id.toString() } });
  });

  // ── Create ───────────────────────────────────────────────────────────────────
  app.post('/', async (request, reply) => {
    if (!can(request.userRole, 'sale:create')) throw new ForbiddenError('Permission denied');

    const body = createInvoiceSchema.parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const { enriched, subtotal, discountAmount, taxAmount, total } = calculateTotals(body.items);

    const invoiceNumber = await generateInvoiceNumber(orgId, body.type);

    const invoice = await InvoiceModel.create({
      organizationId: orgId,
      branchId: body.branchId ? new mongoose.Types.ObjectId(body.branchId) : undefined,
      invoiceNumber,
      type: body.type,
      status: 'draft',
      customerId: body.customerId ? new mongoose.Types.ObjectId(body.customerId) : undefined,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      billingAddress: body.billingAddress,
      issueDate: new Date(body.issueDate),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      items: enriched.map((i) => ({
        ...i,
        productId: i.productId ? new mongoose.Types.ObjectId(i.productId) : undefined,
        taxRateId: i.taxRateId ? new mongoose.Types.ObjectId(i.taxRateId) : undefined,
      })),
      subtotal,
      discountAmount,
      taxAmount,
      total,
      amountPaid: 0,
      balanceDue: total,
      notes: body.notes,
      terms: body.terms,
      currency: body.currency,
      createdBy: new mongoose.Types.ObjectId(request.userId),
      payments: [],
      isRecurring: false,
    });

    return reply.status(201).send({ data: { ...invoice.toObject(), id: invoice._id.toString() } });
  });

  // ── Update ───────────────────────────────────────────────────────────────────
  app.patch('/:id', async (request, reply) => {
    if (!can(request.userRole, 'sale:create')) throw new ForbiddenError('Permission denied');

    const { id } = request.params as { id: string };
    const orgId = new mongoose.Types.ObjectId(request.tenantId);
    const existing = await InvoiceModel.findOne({ _id: id, organizationId: orgId });
    if (!existing) throw new NotFoundError('Invoice');
    if (!['draft', 'sent', 'viewed'].includes(existing.status)) {
      throw new ValidationError('Cannot edit a paid, cancelled or void invoice');
    }

    const body = createInvoiceSchema.partial().parse(request.body);
    const updates: Record<string, unknown> = { ...body };

    if (body.items) {
      const { enriched, subtotal, discountAmount, taxAmount, total } = calculateTotals(body.items);
      updates['items'] = enriched;
      updates['subtotal'] = subtotal;
      updates['discountAmount'] = discountAmount;
      updates['taxAmount'] = taxAmount;
      updates['total'] = total;
      updates['balanceDue'] = total - existing.amountPaid;
    }

    const invoice = await InvoiceModel.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    return reply.send({ data: { ...invoice, id: invoice?._id.toString() } });
  });

  // ── Send (change status to 'sent') ───────────────────────────────────────────
  app.post('/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await InvoiceModel.findOneAndUpdate(
      { _id: id, organizationId: new mongoose.Types.ObjectId(request.tenantId), status: { $in: ['draft', 'viewed'] } },
      { $set: { status: 'sent' } },
      { new: true },
    ).lean();

    if (!invoice) throw new NotFoundError('Invoice or status cannot be changed');
    return reply.send({ data: { id: invoice._id.toString(), status: invoice.status } });
  });

  // ── Record payment ────────────────────────────────────────────────────────────
  app.post('/:id/payments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = recordPaymentSchema.parse(request.body);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const invoice = await InvoiceModel.findOne({ _id: id, organizationId: orgId });
    if (!invoice) throw new NotFoundError('Invoice');
    if (['cancelled', 'void'].includes(invoice.status)) {
      throw new ValidationError('Cannot record payment on a cancelled or void invoice');
    }

    const newAmountPaid = invoice.amountPaid + body.amount;
    if (newAmountPaid > invoice.total) {
      throw new ValidationError('Payment exceeds invoice total');
    }

    const newBalance = invoice.total - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    const payment = {
      amount: body.amount,
      method: body.method,
      reference: body.reference,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      notes: body.notes,
      recordedBy: new mongoose.Types.ObjectId(request.userId),
    };

    const updated = await InvoiceModel.findByIdAndUpdate(
      id,
      {
        $push: { payments: payment },
        $set: { amountPaid: newAmountPaid, balanceDue: newBalance, status: newStatus },
      },
      { new: true },
    ).lean();

    return reply.send({
      data: {
        id: updated?._id.toString(),
        status: updated?.status,
        amountPaid: updated?.amountPaid,
        balanceDue: updated?.balanceDue,
      },
    });
  });

  // ── Cancel / void ────────────────────────────────────────────────────────────
  app.post('/:id/void', async (request, reply) => {
    if (!can(request.userRole, 'sale:void')) throw new ForbiddenError('Permission denied');

    const { id } = request.params as { id: string };
    const invoice = await InvoiceModel.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(request.tenantId),
        status: { $in: ['draft', 'sent', 'viewed', 'partial', 'overdue'] },
      },
      { $set: { status: 'void' } },
      { new: true },
    ).lean();

    if (!invoice) throw new NotFoundError('Invoice or already void/paid');
    return reply.send({ data: { id: invoice._id.toString(), status: invoice.status } });
  });

  // ── Convert quote to invoice ─────────────────────────────────────────────────
  app.post('/:id/convert', async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const quote = await InvoiceModel.findOne({ _id: id, organizationId: orgId, type: 'quote' });
    if (!quote) throw new NotFoundError('Quote');
    if (quote.convertedToInvoiceId) {
      throw new ConflictError('This quote has already been converted to an invoice');
    }

    const invoiceNumber = await generateInvoiceNumber(orgId, 'invoice');

    const invoice = await InvoiceModel.create({
      organizationId: orgId,
      invoiceNumber,
      type: 'invoice',
      status: 'draft',
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      billingAddress: quote.billingAddress,
      issueDate: new Date(),
      dueDate: undefined,
      items: quote.items,
      subtotal: quote.subtotal,
      discountAmount: quote.discountAmount,
      taxAmount: quote.taxAmount,
      total: quote.total,
      amountPaid: 0,
      balanceDue: quote.total,
      notes: quote.notes,
      terms: quote.terms,
      currency: quote.currency,
      createdBy: new mongoose.Types.ObjectId(request.userId),
      payments: [],
      isRecurring: false,
    });

    // Link quote to invoice
    await InvoiceModel.findByIdAndUpdate(id, {
      $set: { convertedToInvoiceId: invoice._id, status: 'void' },
    });

    return reply.status(201).send({
      data: { ...invoice.toObject(), id: invoice._id.toString(), convertedFromQuoteId: id },
    });
  });

  // ── PDF download ──────────────────────────────────────────────────────────────
  app.get('/:id/pdf', async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const [invoice, org] = await Promise.all([
      InvoiceModel.findOne({ _id: id, organizationId: orgId }).lean(),
      (await import('../auth/auth.models.js')).OrganizationModel.findById(request.tenantId).lean(),
    ]);

    if (!invoice) throw new NotFoundError('Invoice');

    const typeLabel = invoice.type === 'quote' ? 'Quote' : invoice.type === 'credit_note' ? 'Credit Note' : 'Invoice';

    const pdfBytes = await generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      type: typeLabel as 'Invoice' | 'Quote' | 'Credit Note',
      businessName: org?.name ?? 'Business',
      businessAddress: (org as unknown as { address?: { city?: string; county?: string } })?.address?.city,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      items: invoice.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        taxRate: i.taxRate,
        taxAmount: i.taxAmount,
        lineTotal: i.lineTotal,
      })),
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      notes: invoice.notes,
      terms: invoice.terms,
      currency: invoice.currency,
    });

    const filename = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    void reply.header('Content-Type', 'application/pdf');
    void reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(Buffer.from(pdfBytes));
  });

  // ── Duplicate ────────────────────────────────────────────────────────────────
  app.post('/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const original = await InvoiceModel.findOne({ _id: id, organizationId: orgId }).lean();
    if (!original) throw new NotFoundError('Invoice');

    const newNumber = await generateInvoiceNumber(orgId, original.type);

    const copy = await InvoiceModel.create({
      ...original,
      _id: new mongoose.Types.ObjectId(),
      invoiceNumber: newNumber,
      status: 'draft',
      issueDate: new Date(),
      dueDate: undefined,
      amountPaid: 0,
      balanceDue: original.total,
      payments: [],
      convertedToInvoiceId: undefined,
      saleId: undefined,
      createdBy: new mongoose.Types.ObjectId(request.userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return reply.status(201).send({ data: { ...copy.toObject(), id: copy._id.toString() } });
  });
}

// ── Receipt PDF endpoint (attached to sales routes) ──────────────────────────
export async function saleReceiptPDFHandler(
  saleId: string,
  tenantId: string,
): Promise<Uint8Array | null> {
  const orgId = new mongoose.Types.ObjectId(tenantId);

  const [sale, items, org] = await Promise.all([
    SaleModel.findOne({ _id: saleId, organizationId: orgId }).lean(),
    SaleItemModel.find({ saleId, organizationId: orgId }).lean(),
    (await import('../auth/auth.models.js')).OrganizationModel.findById(tenantId).lean(),
    PaymentAttemptModel.find({ saleId, organizationId: orgId }).lean(),
  ]);

  if (!sale) return null;

  const payments = await PaymentAttemptModel.find({ saleId, organizationId: orgId }).lean();

  return generateReceiptPDF({
    receiptNumber: sale.receiptNumber,
    businessName: org?.name ?? 'Business',
    date: sale.completedAt ?? sale.createdAt,
    items: items.map((i) => ({
      description: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountAmount: i.discountAmount,
      lineTotal: i.lineTotal,
    })),
    subtotal: sale.subtotal,
    discountAmount: sale.discountAmount,
    taxAmount: sale.taxAmount,
    total: sale.total,
    amountPaid: sale.amountPaid,
    change: sale.change,
    payments: payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      reference: p.reference,
    })),
    currency: org?.currency ?? 'KES',
  });
}
