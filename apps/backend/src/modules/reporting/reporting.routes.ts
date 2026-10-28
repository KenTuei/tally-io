import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import mongoose from 'mongoose';
import { ForbiddenError } from '../../middleware/error.middleware.js';
import { can } from '../../middleware/tenant.middleware.js';
import { SaleModel } from '../sales/sales.models.js';
import { StockProjectionModel, ProductModel } from '../products/products.models.js';

const salesReportSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'custom']).default('week'),
  from: z.string().optional(),
  to: z.string().optional(),
  branchId: z.string().optional(),
});

function getPeriodDates(period: string, from?: string, to?: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { start: todayStart, end: now };
    case 'week': {
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 6);
      return { start: weekStart, end: now };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: now };
    }
    case 'custom':
      return {
        start: from ? new Date(from) : todayStart,
        end: to ? new Date(to + 'T23:59:59Z') : now,
      };
    default:
      return { start: todayStart, end: now };
  }
}

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/reports/dashboard — overview page data
  app.get('/dashboard', async (request, reply) => {
    const orgId = new mongoose.Types.ObjectId(request.tenantId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const [todaySales, yesterdaySales, weekSales, monthSales, lowStockCount, recentSales] =
      await Promise.all([
        SaleModel.aggregate([
          {
            $match: {
              organizationId: orgId,
              status: 'completed',
              completedAt: { $gte: todayStart },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$total' },
              count: { $sum: 1 },
            },
          },
        ]),
        SaleModel.aggregate([
          {
            $match: {
              organizationId: orgId,
              status: 'completed',
              completedAt: { $gte: yesterdayStart, $lt: todayStart },
            },
          },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        SaleModel.aggregate([
          {
            $match: {
              organizationId: orgId,
              status: 'completed',
              completedAt: { $gte: weekStart },
            },
          },
          { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
        ]),
        SaleModel.aggregate([
          {
            $match: {
              organizationId: orgId,
              status: 'completed',
              completedAt: { $gte: monthStart },
            },
          },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        StockProjectionModel.aggregate([
          { $match: { organizationId: orgId } },
          {
            $lookup: {
              from: 'products',
              localField: 'productId',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $match: {
              $expr: {
                $and: [
                  { $gt: ['$quantityOnHand', 0] },
                  { $lte: ['$quantityOnHand', '$product.lowStockThreshold'] },
                ],
              },
            },
          },
          { $count: 'total' },
        ]),
        SaleModel.find({ organizationId: orgId, status: 'completed' })
          .sort({ completedAt: -1 })
          .limit(10)
          .lean(),
      ]);

    const todayTotal = (todaySales[0] as { total?: number } | undefined)?.total ?? 0;
    const todayCount = (todaySales[0] as { count?: number } | undefined)?.count ?? 0;
    const yesterdayTotal = (yesterdaySales[0] as { total?: number } | undefined)?.total ?? 0;
    const weekTotal = (weekSales[0] as { total?: number } | undefined)?.total ?? 0;
    const weekCount = (weekSales[0] as { count?: number } | undefined)?.count ?? 0;
    const monthTotal = (monthSales[0] as { total?: number } | undefined)?.total ?? 0;
    const lowCount = (lowStockCount[0] as { total?: number } | undefined)?.total ?? 0;

    const todaySalesChange =
      yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;

    // Build 7-day trend
    const salesTrend = await SaleModel.aggregate([
      {
        $match: {
          organizationId: orgId,
          status: 'completed',
          completedAt: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%m/%d', date: '$completedAt' },
          },
          sales: { $sum: '$total' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', sales: 1, transactions: 1, _id: 0 } },
    ]);

    return reply.send({
      data: {
        todaySales: todayTotal,
        todayTransactions: todayCount,
        todaySalesChange,
        weekSales: weekTotal,
        weekTransactions: weekCount,
        monthSales: monthTotal,
        lowStockCount: lowCount,
        pendingSyncCount: 0,
        recentSales: recentSales.map((s) => ({
          id: s._id.toString(),
          receiptNumber: s.receiptNumber,
          total: s.total,
          completedAt: s.completedAt?.toISOString() ?? '',
          cashierName: s.cashierId.toString(),
          itemCount: 0,
        })),
        salesTrend,
        topProducts: [],
      },
    });
  });

  // GET /api/v1/reports/sales
  app.get('/sales', async (request, reply) => {
    if (!can(request.userRole, 'report:view') && !can(request.userRole, 'report:view:branch')) {
      throw new ForbiddenError('You do not have permission to view reports');
    }

    const query = salesReportSchema.parse(request.query);
    const orgId = new mongoose.Types.ObjectId(request.tenantId);
    const { start, end } = getPeriodDates(query.period, query.from, query.to);

    const matchFilter: Record<string, unknown> = {
      organizationId: orgId,
      status: 'completed',
      completedAt: { $gte: start, $lte: end },
    };
    if (query.branchId) matchFilter['branchId'] = new mongoose.Types.ObjectId(query.branchId);

    const [summary, byDay, byPaymentMethod] = await Promise.all([
      SaleModel.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            grossSales: { $sum: '$subtotal' },
            discounts: { $sum: '$discountAmount' },
            taxes: { $sum: '$taxAmount' },
            total: { $sum: '$total' },
            refunds: { $sum: 0 },
            costOfGoods: { $sum: 0 },
            transactions: { $sum: 1 },
          },
        },
      ]),
      SaleModel.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: '%m/%d', date: '$completedAt' } },
            sales: { $sum: '$total' },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', sales: 1, transactions: 1, profit: 0, _id: 0 } },
      ]),
      SaleModel.aggregate([
        { $match: matchFilter },
        { $unwind: '$payments' },
        {
          $group: {
            _id: '$payments.method',
            amount: { $sum: '$payments.amount' },
            count: { $sum: 1 },
          },
        },
        { $project: { method: '$_id', amount: 1, count: 1, _id: 0 } },
      ]),
    ]);

    const s = summary[0] as Record<string, number> | undefined;
    const grossSales = s?.['grossSales'] ?? 0;
    const discounts = s?.['discounts'] ?? 0;
    const taxes = s?.['taxes'] ?? 0;
    const netSales = grossSales - discounts;
    const transactions = s?.['transactions'] ?? 0;

    return reply.send({
      data: {
        summary: {
          grossSales,
          netSales,
          discounts,
          taxes,
          refunds: 0,
          costOfGoods: 0,
          grossProfit: netSales,
          transactions,
          averageOrderValue: transactions > 0 ? Math.round(netSales / transactions) : 0,
        },
        byDay,
        byPaymentMethod,
        byCategory: [],
      },
    });
  });
}
