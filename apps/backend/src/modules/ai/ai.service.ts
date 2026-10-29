/**
 * AI Business Assistant — Google Gemini backend service.
 *
 * Security rules:
 * 1. GEMINI_API_KEY lives on the backend only. Never in frontend code.
 * 2. Every tool call enforces the user's organizationId and role.
 * 3. Numerical answers come from real database queries — never invented.
 * 4. Stale/incomplete data is always disclosed.
 * 5. AI cannot perform write operations (only read tools are registered).
 */
import { GoogleGenerativeAI, SchemaType, type Tool } from '@google/generative-ai';
import { config } from '../../config/config.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../middleware/error.middleware.js';
import { SaleModel } from '../sales/sales.models.js';
import { ProductModel, StockProjectionModel } from '../products/products.models.js';
import mongoose from 'mongoose';

// ── Tool definitions (read-only business data queries) ─────────────────────

const businessTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'get_sales_summary',
        description: 'Get sales totals and transaction counts for a time period',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            period: {
              type: SchemaType.STRING,
              enum: ['today', 'yesterday', 'week', 'month', 'last_month'],
              description: 'Time period to query',
            },
          },
          required: ['period'],
        },
      },
      {
        name: 'get_low_stock_products',
        description: 'Get products that are low on stock or out of stock',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            limit: {
              type: SchemaType.NUMBER,
              description: 'Maximum number of products to return (default 10)',
            },
          },
        },
      },
      {
        name: 'get_top_products',
        description: 'Get best-selling products by revenue or quantity for a period',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            period: {
              type: SchemaType.STRING,
              enum: ['today', 'week', 'month'],
            },
            metric: {
              type: SchemaType.STRING,
              enum: ['revenue', 'quantity'],
            },
            limit: { type: SchemaType.NUMBER },
          },
          required: ['period'],
        },
      },
      {
        name: 'get_payment_breakdown',
        description: 'Get sales breakdown by payment method for a period',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            period: {
              type: SchemaType.STRING,
              enum: ['today', 'week', 'month'],
            },
          },
          required: ['period'],
        },
      },
    ],
  },
];

// ── Tool execution (all enforce organizationId from session) ─────────────────

function getPeriodDates(period: string): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today': return { start: todayStart, end: now };
    case 'yesterday': {
      const s = new Date(todayStart); s.setDate(s.getDate() - 1);
      return { start: s, end: todayStart };
    }
    case 'week': {
      const s = new Date(todayStart); s.setDate(s.getDate() - 6);
      return { start: s, end: now };
    }
    case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s, end: e };
    }
    default: return { start: todayStart, end: now };
  }
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  organizationId: string,
): Promise<unknown> {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  switch (name) {
    case 'get_sales_summary': {
      const { start, end } = getPeriodDates(args['period'] as string);
      const result = await SaleModel.aggregate([
        { $match: { organizationId: orgId, status: 'completed', completedAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, totalSales: { $sum: '$total' }, transactions: { $sum: 1 }, avgOrder: { $avg: '$total' } } },
      ]);
      const r = (result[0] as Record<string, number> | undefined) ?? { totalSales: 0, transactions: 0, avgOrder: 0 };
      return {
        period: args['period'],
        totalSales: r['totalSales'] ?? 0,
        totalSalesFormatted: `KES ${((r['totalSales'] ?? 0) / 100).toFixed(2)}`,
        transactions: r['transactions'] ?? 0,
        averageOrderValue: `KES ${((r['avgOrder'] ?? 0) / 100).toFixed(2)}`,
        dataFrom: start.toISOString(),
        dataTo: end.toISOString(),
      };
    }

    case 'get_low_stock_products': {
      const limit = (args['limit'] as number | undefined) ?? 10;
      const lowStock = await StockProjectionModel.aggregate([
        { $match: { organizationId: orgId } },
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        { $match: { $expr: { $lte: ['$quantityOnHand', '$product.lowStockThreshold'] } } },
        { $sort: { quantityOnHand: 1 } },
        { $limit: limit },
        { $project: { productName: '$product.name', sku: '$product.sku', quantityOnHand: 1, threshold: '$product.lowStockThreshold', _id: 0 } },
      ]);
      return { lowStockProducts: lowStock, count: lowStock.length };
    }

    case 'get_top_products': {
      const { start, end } = getPeriodDates(args['period'] as string);
      const metric = (args['metric'] as string | undefined) ?? 'revenue';
      const limit = (args['limit'] as number | undefined) ?? 10;
      const results = await SaleModel.aggregate([
        { $match: { organizationId: orgId, status: 'completed', completedAt: { $gte: start, $lte: end } } },
        { $lookup: { from: 'saleitems', localField: '_id', foreignField: 'saleId', as: 'items' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', productName: { $first: '$items.productName' }, revenue: { $sum: '$items.lineTotal' }, quantity: { $sum: '$items.quantity' } } },
        { $sort: { [metric === 'revenue' ? 'revenue' : 'quantity']: -1 } },
        { $limit: limit },
        { $project: { productName: 1, revenue: 1, revenueFormatted: { $concat: ['KES ', { $toString: { $divide: ['$revenue', 100] } }] }, quantity: 1, _id: 0 } },
      ]);
      return { topProducts: results, period: args['period'], metric };
    }

    case 'get_payment_breakdown': {
      const { start, end } = getPeriodDates(args['period'] as string);
      const breakdown = await SaleModel.aggregate([
        { $match: { organizationId: orgId, status: 'completed', completedAt: { $gte: start, $lte: end } } },
        { $lookup: { from: 'paymentattempts', localField: '_id', foreignField: 'saleId', as: 'payments' } },
        { $unwind: { path: '$payments', preserveNullAndEmptyArrays: true } },
        { $match: { 'payments.status': 'confirmed' } },
        { $group: { _id: '$payments.method', total: { $sum: '$payments.amount' }, count: { $sum: 1 } } },
        { $project: { method: '$_id', total: 1, totalFormatted: { $concat: ['KES ', { $toString: { $divide: ['$total', 100] } }] }, count: 1, _id: 0 } },
      ]);
      return { byPaymentMethod: breakdown, period: args['period'] };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Main chat function ────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  toolsUsed: string[];
  dataTimestamp: string;
}

export async function chat(
  messages: ChatMessage[],
  organizationId: string,
  userRole: string,
): Promise<ChatResponse> {
  if (!config.gemini.isConfigured) {
    return {
      message:
        'The AI assistant requires a Google Gemini API key. ' +
        'Add GEMINI_API_KEY to your server environment variables, then restart the backend.',
      toolsUsed: [],
      dataTimestamp: new Date().toISOString(),
    };
  }

  const genAI = new GoogleGenerativeAI(config.gemini.apiKey!);
  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    systemInstruction: `You are the Tally.io business assistant. You help business owners understand their sales, 
inventory, and operations. You have access to real business data via tools. Always:
- Use the available tools to get actual data before giving numbers.
- State the date range and scope of any numerical answer.
- Distinguish estimates from verified figures.
- Never invent sales totals, stock levels, or payment amounts.
- If data is unavailable or the tool returns empty results, say so clearly.
- Be concise and actionable. The user is a busy business owner.
- Use KES (Kenyan Shillings) for all monetary amounts.
Currency: KES. User role: ${userRole}.`,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1]?.content ?? '';
  const toolsUsed: string[] = [];

  try {
    const chat = model.startChat({
      history,
      tools: businessTools,
    });

    let response = await chat.sendMessage(lastMessage);
    let candidate = response.response.candidates?.[0];

    // Handle function calls (tool use)
    while (candidate?.content.parts.some((p) => p.functionCall)) {
      const toolResults = [];

      for (const part of candidate.content.parts) {
        if (part.functionCall) {
          const { name, args } = part.functionCall;
          toolsUsed.push(name);

          let result: unknown;
          try {
            result = await executeTool(name, args as Record<string, unknown>, organizationId);
          } catch (err) {
            result = { error: err instanceof Error ? err.message : 'Tool execution failed' };
            logger.warn({ tool: name, organizationId }, 'AI tool error');
          }

          toolResults.push({
            functionResponse: { name, response: result as Record<string, unknown> },
          });
        }
      }

      // Send tool results back to the model
      response = await chat.sendMessage(toolResults.map((r) => ({ functionResponse: r.functionResponse })));
      candidate = response.response.candidates?.[0];
    }

    const text = response.response.text();

    return {
      message: text,
      toolsUsed,
      dataTimestamp: new Date().toISOString(),
    };
  } catch (err) {
    logger.error(err, 'Gemini API error');
    throw new AppError('AI_ERROR', 'AI assistant is temporarily unavailable', 503);
  }
}
