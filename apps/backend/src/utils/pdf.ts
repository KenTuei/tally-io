/**
 * PDF generation utility using pdf-lib.
 * Generates professional A4 receipts and invoices server-side.
 * All amounts are in cents — format to KES display internally.
 */
import { PDFDocument, rgb, StandardFonts, type PDFPage, type RGB } from 'pdf-lib';

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  black: rgb(0.06, 0.07, 0.09),
  darkGray: rgb(0.2, 0.22, 0.26),
  gray: rgb(0.45, 0.47, 0.52),
  lightGray: rgb(0.88, 0.90, 0.93),
  veryLight: rgb(0.97, 0.97, 0.98),
  white: rgb(1, 1, 1),
  accent: rgb(0.06, 0.60, 0.42),   // emerald-ish
  accentDark: rgb(0.04, 0.45, 0.32),
} as const;

const fmt = (cents: number, currency = 'KES') =>
  `${currency} ${(cents / 100).toFixed(2)}`;

type FontKey = 'regular' | 'bold';

async function loadFonts(doc: PDFDocument) {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: { size?: number; font?: ReturnType<PDFDocument['embedFont']> extends Promise<infer F> ? F : never; color?: RGB; maxWidth?: number },
) {
  page.drawText(String(text ?? ''), {
    x,
    y,
    size: opts.size ?? 10,
    font: opts.font,
    color: opts.color ?? C.black,
    maxWidth: opts.maxWidth,
    lineHeight: (opts.size ?? 10) * 1.4,
  });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: RGB = C.lightGray, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

function drawRect(page: PDFPage, x: number, y: number, w: number, h: number, color: RGB) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

// ── Receipt PDF ────────────────────────────────────────────────────────────────
export interface ReceiptData {
  receiptNumber: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  branchName?: string;
  cashierName?: string;
  customerName?: string;
  date: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;    // cents
    discountAmount: number;
    lineTotal: number;
  }>;
  subtotal: number;       // cents
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  change: number;
  payments: Array<{ method: string; amount: number; reference?: string }>;
  currency?: string;
  footerMessage?: string;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // A4 page
  const page = doc.addPage([595, 842]);
  const fonts = await loadFonts(doc);
  const margin = 50;
  const width = 595 - margin * 2;
  let y = 800;

  // Header
  drawRect(page, 0, 800, 595, 42, C.accentDark);
  drawText(page, data.businessName.toUpperCase(), margin, 815, {
    font: fonts.bold, size: 14, color: C.white,
  });

  y = 760;
  drawText(page, `Receipt #${data.receiptNumber}`, margin, y, { font: fonts.bold, size: 12 });
  drawText(page, data.date.toLocaleString('en-KE'), 595 - margin - 140, y, {
    font: fonts.regular, size: 9, color: C.gray,
  });

  y -= 14;
  if (data.branchName) {
    drawText(page, `Branch: ${data.branchName}`, margin, y, { font: fonts.regular, size: 9, color: C.gray });
    y -= 12;
  }
  if (data.cashierName) {
    drawText(page, `Cashier: ${data.cashierName}`, margin, y, { font: fonts.regular, size: 9, color: C.gray });
    y -= 12;
  }
  if (data.customerName) {
    drawText(page, `Customer: ${data.customerName}`, margin, y, { font: fonts.regular, size: 9, color: C.gray });
    y -= 12;
  }

  y -= 10;
  drawLine(page, margin, y, 595 - margin, y);
  y -= 16;

  // Items header
  drawRect(page, margin, y - 4, width, 18, C.veryLight);
  drawText(page, 'Item', margin + 4, y + 2, { font: fonts.bold, size: 9, color: C.darkGray });
  drawText(page, 'Qty', margin + 220, y + 2, { font: fonts.bold, size: 9, color: C.darkGray });
  drawText(page, 'Unit Price', margin + 260, y + 2, { font: fonts.bold, size: 9, color: C.darkGray });
  drawText(page, 'Total', margin + 380, y + 2, { font: fonts.bold, size: 9, color: C.darkGray });
  y -= 22;

  const cur = data.currency ?? 'KES';

  for (const item of data.items) {
    const nameText = item.description.length > 28 ? item.description.slice(0, 28) + '…' : item.description;
    drawText(page, nameText, margin + 4, y, { font: fonts.regular, size: 9 });
    drawText(page, String(item.quantity), margin + 226, y, { font: fonts.regular, size: 9 });
    drawText(page, fmt(item.unitPrice, cur), margin + 260, y, { font: fonts.regular, size: 9 });
    drawText(page, fmt(item.lineTotal, cur), margin + 380, y, { font: fonts.regular, size: 9 });
    if (item.discountAmount > 0) {
      y -= 11;
      drawText(page, `  Discount: -${fmt(item.discountAmount, cur)}`, margin + 4, y, {
        font: fonts.regular, size: 8, color: C.accent,
      });
    }
    y -= 14;
    drawLine(page, margin, y + 2, 595 - margin, y + 2, C.veryLight);
  }

  y -= 10;
  drawLine(page, margin, y, 595 - margin, y);
  y -= 20;

  // Totals
  const rightCol = 595 - margin - 100;
  const totals: Array<[string, number, boolean]> = [
    ['Subtotal', data.subtotal, false],
    ...(data.discountAmount > 0 ? [['Discount', -data.discountAmount, false] as [string, number, boolean]] : []),
    ...(data.taxAmount > 0 ? [['Tax', data.taxAmount, false] as [string, number, boolean]] : []),
  ];

  for (const [label, amount, bold] of totals) {
    drawText(page, label, rightCol - 60, y, { font: bold ? fonts.bold : fonts.regular, size: 9, color: C.gray });
    drawText(page, fmt(Math.abs(amount), cur), rightCol, y, { font: bold ? fonts.bold : fonts.regular, size: 9 });
    y -= 14;
  }

  // Total box
  drawRect(page, margin, y - 6, width, 24, C.accentDark);
  drawText(page, 'TOTAL', margin + 8, y + 4, { font: fonts.bold, size: 11, color: C.white });
  drawText(page, fmt(data.total, cur), rightCol, y + 4, { font: fonts.bold, size: 13, color: C.white });
  y -= 36;

  // Payments
  drawText(page, 'Payment', margin, y, { font: fonts.bold, size: 9 });
  y -= 14;
  for (const pmt of data.payments) {
    const label = pmt.method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    drawText(page, `${label}${pmt.reference ? ` (${pmt.reference})` : ''}`, margin + 4, y, {
      font: fonts.regular, size: 9, color: C.gray,
    });
    drawText(page, fmt(pmt.amount, cur), rightCol, y, { font: fonts.regular, size: 9 });
    y -= 13;
  }

  if (data.change > 0) {
    drawText(page, 'Change', margin + 4, y, { font: fonts.bold, size: 9, color: C.accent });
    drawText(page, fmt(data.change, cur), rightCol, y, { font: fonts.bold, size: 9, color: C.accent });
    y -= 13;
  }

  // Footer
  if (data.footerMessage) {
    y -= 20;
    drawLine(page, margin, y, 595 - margin, y, C.lightGray);
    y -= 16;
    drawText(page, data.footerMessage, margin, y, {
      font: fonts.regular, size: 8, color: C.gray, maxWidth: width,
    });
  }

  y = 40;
  drawText(page, 'Generated by Tally.io', margin, y, { font: fonts.regular, size: 7, color: C.lightGray });

  return doc.save();
}

// ── Invoice PDF ────────────────────────────────────────────────────────────────
export interface InvoiceData {
  invoiceNumber: string;
  type: 'Invoice' | 'Quote' | 'Credit Note';
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: string;
  issueDate: Date;
  dueDate?: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;    // cents
    discountAmount: number;
    taxRate: number;      // integer e.g. 1600 = 16%
    taxAmount: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  terms?: string;
  currency?: string;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const fonts = await loadFonts(doc);
  const margin = 50;
  const width = 595 - margin * 2;
  const cur = data.currency ?? 'KES';
  let y = 800;

  // Header bar
  drawRect(page, 0, 780, 595, 62, C.black);
  drawText(page, data.businessName.toUpperCase(), margin, 820, {
    font: fonts.bold, size: 16, color: C.white,
  });
  drawText(page, data.type.toUpperCase(), 595 - margin - 70, 820, {
    font: fonts.bold, size: 13, color: C.accent,
  });

  if (data.businessAddress) {
    drawText(page, data.businessAddress, margin, 800, {
      font: fonts.regular, size: 8, color: rgb(0.7, 0.7, 0.7),
    });
  }

  y = 760;

  // Invoice meta
  const infoRight = 380;
  drawText(page, `${data.type} #:`, infoRight, y, { font: fonts.bold, size: 9 });
  drawText(page, data.invoiceNumber, infoRight + 80, y, { font: fonts.regular, size: 9 });
  y -= 14;
  drawText(page, 'Issue Date:', infoRight, y, { font: fonts.bold, size: 9 });
  drawText(page, data.issueDate.toLocaleDateString('en-KE'), infoRight + 80, y, { font: fonts.regular, size: 9 });
  y -= 14;
  if (data.dueDate) {
    drawText(page, 'Due Date:', infoRight, y, { font: fonts.bold, size: 9 });
    drawText(page, data.dueDate.toLocaleDateString('en-KE'), infoRight + 80, y, {
      font: fonts.regular, size: 9, color: data.balanceDue > 0 ? rgb(0.8, 0.2, 0.2) : C.black,
    });
  }

  // Bill to
  let billY = 760;
  drawText(page, 'BILL TO', margin, billY, { font: fonts.bold, size: 9, color: C.gray });
  billY -= 14;
  drawText(page, data.customerName, margin, billY, { font: fonts.bold, size: 11 });
  billY -= 13;
  if (data.customerEmail) {
    drawText(page, data.customerEmail, margin, billY, { font: fonts.regular, size: 9, color: C.gray });
    billY -= 12;
  }
  if (data.customerPhone) {
    drawText(page, data.customerPhone, margin, billY, { font: fonts.regular, size: 9, color: C.gray });
  }

  y = 690;
  drawLine(page, margin, y, 595 - margin, y);
  y -= 20;

  // Table header
  drawRect(page, margin, y - 5, width, 20, C.black);
  const colX = [margin + 5, margin + 195, margin + 255, margin + 315, margin + 385];
  const headers = ['Description', 'Qty', 'Unit Price', 'Tax', 'Total'];
  headers.forEach((h, i) => {
    drawText(page, h, colX[i]!, y + 2, { font: fonts.bold, size: 8, color: C.white });
  });
  y -= 26;

  let rowBg = false;
  for (const item of data.items) {
    if (rowBg) drawRect(page, margin, y - 5, width, 18, C.veryLight);
    const desc = item.description.length > 30 ? item.description.slice(0, 30) + '…' : item.description;
    drawText(page, desc, colX[0]!, y, { font: fonts.regular, size: 9 });
    drawText(page, String(item.quantity), colX[1]!, y, { font: fonts.regular, size: 9 });
    drawText(page, fmt(item.unitPrice, cur), colX[2]!, y, { font: fonts.regular, size: 9 });
    drawText(page, item.taxRate > 0 ? `${(item.taxRate / 100).toFixed(0)}%` : '–', colX[3]!, y, {
      font: fonts.regular, size: 9, color: C.gray,
    });
    drawText(page, fmt(item.lineTotal, cur), colX[4]!, y, { font: fonts.regular, size: 9 });
    rowBg = !rowBg;
    y -= 18;
  }

  y -= 10;
  drawLine(page, margin, y, 595 - margin, y);
  y -= 20;

  // Totals
  const totRight = 595 - margin;
  const totLabel = totRight - 150;

  const totals: Array<[string, number, boolean, RGB?]> = [
    ['Subtotal', data.subtotal, false],
    ...(data.discountAmount > 0 ? [['Discount', -data.discountAmount, false, C.accent] as [string, number, boolean, RGB]] : []),
    ...(data.taxAmount > 0 ? [['Tax', data.taxAmount, false] as [string, number, boolean]] : []),
  ];

  for (const [label, amount, , color] of totals) {
    drawText(page, label, totLabel, y, { font: fonts.regular, size: 9, color: C.gray });
    drawText(page, fmt(Math.abs(amount), cur), totRight - 70, y, { font: fonts.regular, size: 9, color: color ?? C.black });
    y -= 14;
  }

  // Total row
  drawRect(page, margin, y - 6, width, 26, C.black);
  drawText(page, 'TOTAL', totLabel, y + 5, { font: fonts.bold, size: 11, color: C.white });
  drawText(page, fmt(data.total, cur), totRight - 80, y + 5, { font: fonts.bold, size: 13, color: C.white });
  y -= 38;

  // Balance due
  if (data.amountPaid > 0) {
    drawText(page, 'Amount Paid', totLabel, y, { font: fonts.regular, size: 9, color: C.gray });
    drawText(page, fmt(data.amountPaid, cur), totRight - 70, y, { font: fonts.regular, size: 9, color: C.accent });
    y -= 14;
    drawText(page, 'Balance Due', totLabel, y, { font: fonts.bold, size: 10 });
    drawText(page, fmt(data.balanceDue, cur), totRight - 80, y, {
      font: fonts.bold, size: 12,
      color: data.balanceDue > 0 ? rgb(0.8, 0.2, 0.2) : C.accent,
    });
    y -= 20;
  }

  // Notes
  if (data.notes) {
    y -= 10;
    drawLine(page, margin, y, 595 - margin, y, C.lightGray);
    y -= 16;
    drawText(page, 'Notes', margin, y, { font: fonts.bold, size: 9 });
    y -= 13;
    drawText(page, data.notes, margin, y, { font: fonts.regular, size: 9, color: C.gray, maxWidth: width });
  }

  if (data.terms) {
    y -= 24;
    drawText(page, 'Terms & Conditions', margin, y, { font: fonts.bold, size: 9 });
    y -= 13;
    drawText(page, data.terms, margin, y, { font: fonts.regular, size: 8, color: C.gray, maxWidth: width });
  }

  y = 40;
  drawLine(page, margin, y + 10, 595 - margin, y + 10, C.lightGray);
  drawText(page, 'Generated by Tally.io', margin, y, { font: fonts.regular, size: 7, color: C.lightGray });

  return doc.save();
}
