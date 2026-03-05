const Lead = require('../models/Lead');
const Quote = require('../models/Quote');
const ServiceOrder = require('../models/ServiceOrder');
const User = require('../models/User');
const CallLog = require('../models/CallLog');
const mongoose = require('mongoose');

/* ─── helpers ─── */
const startOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const monthRange = (offset = 0) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
    return { start, end };
};

/* ═══════════════════════════════════════════════════════
   GET /api/analytics/overview
   Business-wide KPIs + trend data for the admin analytics page
══════════════════════════════════════════════════════ */
exports.getOverview = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const now = new Date();
        const rangeStart = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const rangeEnd = to ? new Date(to) : now;

        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const [
            totalLeads, newThisMonth, convertedThisMonth, convertedLastMonth,
            totalQuotes, quotesThisMonth, acceptedQuotes,
            totalOrders, ordersThisMonth, revenueAgg, revenueLastMonth,
            leadStatusBreakdown, leadSourceBreakdown, quoteStatusBreakdown,
            leadTrend, revenueTrend, conversionTrend, topPackages,
        ] = await Promise.all([
            Lead.countDocuments({ is_archived: false }),
            Lead.countDocuments({ is_archived: false, createdAt: { $gte: thisMonth } }),
            Lead.countDocuments({ status: 'converted', updatedAt: { $gte: thisMonth } }),
            Lead.countDocuments({ status: 'converted', updatedAt: { $gte: lastMonth, $lte: lastMonthEnd } }),
            Quote.countDocuments({ is_archived: false }),
            Quote.countDocuments({ is_archived: false, createdAt: { $gte: thisMonth } }),
            Quote.countDocuments({ status: 'accepted' }),
            ServiceOrder.countDocuments({ is_archived: false }),
            ServiceOrder.countDocuments({ is_archived: false, createdAt: { $gte: thisMonth } }),
            ServiceOrder.aggregate([{ $group: { _id: null, total: { $sum: '$project_value' }, paid: { $sum: '$amount_paid' }, balance: { $sum: '$balance_due' } } }]),
            ServiceOrder.aggregate([{ $match: { createdAt: { $gte: lastMonth, $lte: lastMonthEnd } } }, { $group: { _id: null, total: { $sum: '$project_value' } } }]),
            Lead.aggregate([{ $match: { is_archived: false } }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Lead.aggregate([{ $match: { is_archived: false } }, { $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
            Quote.aggregate([{ $match: { is_archived: false } }, { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$total' } } }]),
            // Lead trend
            Lead.aggregate([
                { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, created: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
                { $sort: { '_id.y': 1, '_id.m': 1 } }
            ]),
            // Revenue trend (service orders value per month)
            ServiceOrder.aggregate([
                { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, value: { $sum: '$project_value' }, paid: { $sum: '$amount_paid' } } },
                { $sort: { '_id.y': 1, '_id.m': 1 } }
            ]),
            // Conversion rate trend
            Lead.aggregate([
                { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
                { $sort: { '_id.y': 1, '_id.m': 1 } }
            ]),
            // Top packages by order count
            ServiceOrder.aggregate([
                { $group: { _id: '$package', count: { $sum: 1 }, revenue: { $sum: '$project_value' } } },
                { $sort: { count: -1 } }, { $limit: 6 },
                { $lookup: { from: 'packages', localField: '_id', foreignField: '_id', as: 'pkg' } },
                { $unwind: { path: '$pkg', preserveNullAndEmptyArrays: true } },

                { $project: { name: { $ifNull: ['$pkg.name', 'Unknown'] }, count: 1, revenue: 1 } }
            ]),
        ]);

        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const norm = (arr) => arr.map(x => ({ month: `${MONTHS[x._id.m - 1]} ${x._id.y}`, ...x }));

        const rev = revenueAgg[0] || { total: 0, paid: 0, balance: 0 };
        const revLast = revenueLastMonth[0]?.total || 0;
        const convRate = totalLeads ? Math.round((convertedThisMonth / newThisMonth || 0) * 100) : 0;

        res.json({
            success: true,
            data: {
                kpis: {
                    total_leads: totalLeads,
                    new_this_month: newThisMonth,
                    converted_this_month: convertedThisMonth,
                    converted_last_month: convertedLastMonth,
                    total_quotes: totalQuotes,
                    quotes_this_month: quotesThisMonth,
                    accepted_quotes: acceptedQuotes,
                    quote_acceptance_rate: totalQuotes ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0,
                    total_orders: totalOrders,
                    orders_this_month: ordersThisMonth,
                    total_revenue: rev.total,
                    total_paid: rev.paid,
                    total_balance: rev.balance,
                    revenue_last_month: revLast,
                    conversion_rate: convRate,
                },
                lead_status_breakdown: leadStatusBreakdown,
                lead_source_breakdown: leadSourceBreakdown,
                quote_status_breakdown: quoteStatusBreakdown,
                lead_trend: norm(leadTrend),
                revenue_trend: norm(revenueTrend),
                conversion_trend: norm(conversionTrend),
                top_packages: topPackages,
            }
        });
    } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════
   GET /api/analytics/staff
   Per-staff breakdown of performance KPIs
══════════════════════════════════════════════════════ */
exports.getStaffPerformance = async (req, res, next) => {
    try {
        const { from, to, role } = req.query;
        const now = new Date();
        const rangeStart = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const rangeEnd = to ? new Date(to) : now;

        // Get all staff (sales + operations + manager)
        const filter = role ? { role } : { role: { $in: ['sales', 'operations', 'manager'] } };
        const staff = await User.find(filter).select('name email role createdAt').lean();

        const staffIds = staff.map(s => s._id);

        // Run all aggregations in parallel
        const [leadStats, quoteStats, orderStats, callStats] = await Promise.all([
            // Leads per sales staff
            Lead.aggregate([
                { $match: { assigned_to: { $in: staffIds }, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                { $group: { _id: '$assigned_to', total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } }, lost: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } }, interested: { $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] } } } }
            ]),
            // Quotes per staff
            Quote.aggregate([
                { $match: { created_by: { $in: staffIds }, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                { $group: { _id: '$created_by', total: { $sum: 1 }, accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } }, value: { $sum: '$total' } } }
            ]),
            // Orders per staff (created by / assigned to)
            ServiceOrder.aggregate([
                { $match: { $or: [{ created_by: { $in: staffIds } }, { assigned_to: { $in: staffIds } }], createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                { $group: { _id: '$created_by', orders: { $sum: 1 }, revenue: { $sum: '$project_value' }, paid: { $sum: '$amount_paid' } } }
            ]),
            // Call logs per staff
            CallLog.aggregate([
                { $match: { performed_by: { $in: staffIds }, createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
                { $group: { _id: '$performed_by', calls: { $sum: 1 } } }
            ]),
        ]);

        // Index results by staff id
        const idx = (arr) => Object.fromEntries(arr.map(x => [x._id.toString(), x]));
        const lIdx = idx(leadStats), qIdx = idx(quoteStats), oIdx = idx(orderStats), cIdx = idx(callStats);

        const result = staff.map(s => {
            const id = s._id.toString();
            const l = lIdx[id] || {};
            const q = qIdx[id] || {};
            const o = oIdx[id] || {};
            const c = cIdx[id] || {};
            const convRate = l.total ? Math.round(((l.converted || 0) / l.total) * 100) : 0;
            const qAccept = q.total ? Math.round(((q.accepted || 0) / q.total) * 100) : 0;
            // Simple performance score (weighted)
            const score = Math.min(100, Math.round(
                (convRate * 0.4) + (qAccept * 0.3) + Math.min(30, (c.calls || 0) * 0.5)
            ));
            return {
                _id: s._id,
                name: s.name,
                email: s.email,
                role: s.role,
                joined: s.createdAt,
                leads: { total: l.total || 0, converted: l.converted || 0, lost: l.lost || 0, interested: l.interested || 0, conv_rate: convRate },
                quotes: { total: q.total || 0, accepted: q.accepted || 0, value: q.value || 0, accept_rate: qAccept },
                orders: { total: o.orders || 0, revenue: o.revenue || 0, paid: o.paid || 0 },
                calls: c.calls || 0,
                performance_score: score,
            };
        });

        // Sort by performance score desc
        result.sort((a, b) => b.performance_score - a.performance_score);

        res.json({ success: true, data: result, range: { from: rangeStart, to: rangeEnd } });
    } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════
   GET /api/analytics/staff/:id/report
   Detailed data for a single staff member (for printable report)
══════════════════════════════════════════════════════ */
exports.getStaffReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const now = new Date();
        const rangeStart = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const rangeEnd = to ? new Date(to) : now;
        const staffId = new mongoose.Types.ObjectId(req.params.id);

        const staff = await User.findById(staffId).select('name email role createdAt phone').lean();
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

        const matchRange = { $gte: rangeStart, $lte: rangeEnd };

        const [leads, quotes, orders, calls, leadTrend, callTrend] = await Promise.all([
            Lead.find({ assigned_to: staffId, createdAt: matchRange }).select('name status source createdAt').lean(),
            Quote.find({ created_by: staffId, createdAt: matchRange }).select('reference_no contact_name status total createdAt').lean(),
            ServiceOrder.find({ created_by: staffId, createdAt: matchRange }).populate('client', 'company_name').select('client status project_value amount_paid payment_status priority createdAt').lean(),
            CallLog.find({ performed_by: staffId, createdAt: matchRange }).select('lead_name outcome duration createdAt').lean(),
            // Monthly lead performance
            Lead.aggregate([
                { $match: { assigned_to: staffId, createdAt: matchRange } },
                { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
                { $sort: { '_id.y': 1, '_id.m': 1 } }
            ]),
            // Daily call activity
            CallLog.aggregate([
                { $match: { performed_by: staffId, createdAt: matchRange } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, calls: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ])
        ]);

        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const convRate = leads.length ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0;
        const qAccept = quotes.length ? Math.round((quotes.filter(q => q.status === 'accepted').length / quotes.length) * 100) : 0;
        const totalRevenue = orders.reduce((s, o) => s + (o.project_value || 0), 0);
        const score = Math.min(100, Math.round((convRate * 0.4) + (qAccept * 0.3) + Math.min(30, calls.length * 0.5)));

        res.json({
            success: true,
            data: {
                staff, range: { from: rangeStart, to: rangeEnd },
                summary: {
                    total_leads: leads.length, converted_leads: leads.filter(l => l.status === 'converted').length, conv_rate: convRate,
                    total_quotes: quotes.length, accepted_quotes: quotes.filter(q => q.status === 'accepted').length, quote_value: quotes.reduce((s, q) => s + (q.total || 0), 0), accept_rate: qAccept,
                    total_orders: orders.length, total_revenue: totalRevenue, total_calls: calls.length,
                    performance_score: score,
                },
                leads, quotes, orders, calls,
                lead_trend: leadTrend.map(x => ({ month: `${MONTHS[x._id.m - 1]} ${x._id.y}`, total: x.total, converted: x.converted })),
                call_trend: callTrend,
            }
        });
    } catch (err) { next(err); }
};
