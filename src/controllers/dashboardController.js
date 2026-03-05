const Lead = require('../models/Lead');
const ServiceOrder = require('../models/ServiceOrder');
const Client = require('../models/Client');
const User = require('../models/User');
const CallLog = require('../models/CallLog');
const Package = require('../models/Package');

const Quote = require('../models/Quote');

// @desc    Sales dashboard
exports.salesDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

        // 6-month window
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

        const [myLeads, conversions, lost, interested, followupsToday, statusBreakdown, quoteStats] = await Promise.all([
            Lead.countDocuments({ assigned_to: userId, is_archived: false }),
            Lead.countDocuments({ assigned_to: userId, status: 'converted', updatedAt: { $gte: startOfMonth } }),
            Lead.countDocuments({ assigned_to: userId, status: 'lost' }),
            Lead.countDocuments({ assigned_to: userId, status: 'interested' }),
            CallLog.countDocuments({ performed_by: userId, next_followup_date: { $gte: startOfDay, $lte: endOfDay } }),
            Lead.aggregate([
                { $match: { assigned_to: userId, is_archived: false } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Quote.aggregate([
                { $match: { created_by: userId, is_archived: false } },
                { $group: { _id: null, total: { $sum: 1 }, totalValue: { $sum: '$total' }, accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } }, sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } } } }
            ]),
        ]);

        // 6-month lead trend (created per month)
        const leadTrend = await Lead.aggregate([
            { $match: { assigned_to: userId, createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, created: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Call activity last 7 days
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0);
        const callActivity = await CallLog.aggregate([
            { $match: { performed_by: userId, createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, calls: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Source breakdown
        const sourceBreakdown = await Lead.aggregate([
            { $match: { assigned_to: userId, is_archived: false } },
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Top interested packages
        const topPackages = await Lead.aggregate([
            { $match: { assigned_to: userId, interested_package: { $exists: true, $ne: null } } },
            { $group: { _id: '$interested_package', count: { $sum: 1 } } },
            { $lookup: { from: 'packages', localField: '_id', foreignField: '_id', as: 'pkg' } },
            { $unwind: '$pkg' },
            { $project: { name: '$pkg.name', count: 1 } },
            { $sort: { count: -1 } }, { $limit: 5 }
        ]);

        // Overdue followups
        const overdueFollowups = await CallLog.find({
            performed_by: userId,
            next_followup_date: { $lt: startOfDay }
        }).populate('lead', 'name phone status').sort({ next_followup_date: 1 }).limit(5);

        // Recent leads
        const recentLeads = await Lead.find({ assigned_to: userId, is_archived: false })
            .populate('interested_package', 'name').sort({ createdAt: -1 }).limit(8);

        // Recent quotes
        const recentQuotes = await Quote.find({ created_by: userId, is_archived: false })
            .sort({ createdAt: -1 }).limit(5);

        const qStats = quoteStats[0] || { total: 0, totalValue: 0, accepted: 0, sent: 0 };

        res.json({
            success: true, data: {
                myLeads, conversions_this_month: conversions, lost_leads: lost,
                interested_leads: interested, followups_today: followupsToday,
                status_breakdown: statusBreakdown, lead_trend: leadTrend,
                call_activity: callActivity, source_breakdown: sourceBreakdown,
                top_packages: topPackages, overdue_followups: overdueFollowups,
                recent_leads: recentLeads, recent_quotes: recentQuotes,
                quote_stats: qStats,
            }
        });
    } catch (err) { next(err); }
};

// @desc    Operations dashboard
exports.operationsDashboard = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
        const threeDaysLater = new Date(); threeDaysLater.setDate(threeDaysLater.getDate() + 3); threeDaysLater.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0);

        const [assigned, dueToday, pendingDocs, completedWeek, statusBreakdown, priorityBreakdown, overdue] = await Promise.all([
            ServiceOrder.countDocuments({ assigned_to: userId, is_archived: false }),
            ServiceOrder.countDocuments({ assigned_to: userId, due_date: { $gte: startOfDay, $lte: endOfDay }, status: { $nin: ['completed'] } }),
            ServiceOrder.countDocuments({ assigned_to: userId, status: 'pending_documents' }),
            ServiceOrder.countDocuments({ assigned_to: userId, status: 'completed', updatedAt: { $gte: startOfWeek } }),
            ServiceOrder.aggregate([
                { $match: { assigned_to: userId, is_archived: false } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            ServiceOrder.aggregate([
                { $match: { assigned_to: userId, is_archived: false, status: { $nin: ['completed'] } } },
                { $group: { _id: '$priority', count: { $sum: 1 } } }
            ]),
            ServiceOrder.countDocuments({ assigned_to: userId, due_date: { $lt: startOfDay }, status: { $nin: ['completed', 'on_hold'] } }),
        ]);

        // 7-day completion trend
        const completionTrend = await ServiceOrder.aggregate([
            { $match: { assigned_to: userId, status: 'completed', updatedAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, completed: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Urgent jobs
        const urgentJobs = await ServiceOrder.find({ assigned_to: userId, priority: 'high', status: { $nin: ['completed'] } })
            .populate('client', 'company_name').populate('package', 'name').sort({ due_date: 1 }).limit(5);

        // Due soon (next 3 days)
        const dueSoon = await ServiceOrder.find({
            assigned_to: userId, due_date: { $gte: startOfDay, $lte: threeDaysLater }, status: { $nin: ['completed', 'on_hold'] }
        }).populate('client', 'company_name').populate('package', 'name').sort({ due_date: 1 }).limit(5);

        // Recent completions
        const recentCompletions = await ServiceOrder.find({ assigned_to: userId, status: 'completed' })
            .populate('client', 'company_name').populate('package', 'name').sort({ updatedAt: -1 }).limit(5);

        const total = statusBreakdown.reduce((s, b) => s + b.count, 0);
        const completedCount = statusBreakdown.find(b => b._id === 'completed')?.count || 0;
        const completionRate = total ? Math.round((completedCount / total) * 100) : 0;

        res.json({
            success: true, data: {
                assigned_jobs: assigned, due_today: dueToday,
                pending_documents: pendingDocs, completed_this_week: completedWeek,
                overdue_count: overdue, completion_rate: completionRate,
                status_breakdown: statusBreakdown, priority_breakdown: priorityBreakdown,
                completion_trend: completionTrend,
                urgent_jobs: urgentJobs, due_soon: dueSoon, recent_completions: recentCompletions,
            }
        });
    } catch (err) { next(err); }
};

// @desc    Manager dashboard
exports.managerDashboard = async (req, res, next) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1); sixMonthsAgo.setHours(0, 0, 0, 0);

        const [totalLeads, conversions, delayedServices, totalClients, totalOrders, completedOrders, quoteAgg] = await Promise.all([
            Lead.countDocuments({ is_archived: false }),
            Lead.countDocuments({ status: 'converted', updatedAt: { $gte: startOfMonth } }),
            ServiceOrder.countDocuments({ due_date: { $lt: startOfDay }, status: { $nin: ['completed', 'on_hold'] } }),
            Client.countDocuments({ is_archived: false }),
            ServiceOrder.countDocuments({ is_archived: false }),
            ServiceOrder.countDocuments({ status: 'completed' }),
            Quote.aggregate([
                { $match: { is_archived: false } },
                { $group: { _id: null, total: { $sum: 1 }, totalValue: { $sum: '$total' }, accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } } } }
            ]),
        ]);

        // 6-month lead trend (all staff)
        const leadTrend = await Lead.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, created: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // 6-month service order completion
        const orderTrend = await ServiceOrder.aggregate([
            { $match: { status: 'completed', updatedAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } }, completed: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const salesPerformance = await Lead.aggregate([
            { $match: { is_archived: false } },
            { $group: { _id: '$assigned_to', total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } }, interested: { $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] } } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', total: 1, converted: 1, interested: 1 } },
            { $sort: { total: -1 } }
        ]);

        const revenueByPackage = await ServiceOrder.aggregate([
            { $match: { status: 'completed' } },
            { $lookup: { from: 'packages', localField: 'package', foreignField: '_id', as: 'pkg' } },
            { $unwind: '$pkg' },
            { $group: { _id: '$pkg.name', count: { $sum: 1 }, revenue: { $sum: '$pkg.price' } } },
            { $sort: { revenue: -1 } }
        ]);

        const opsCompletion = await ServiceOrder.aggregate([
            { $match: { assigned_to: { $exists: true } } },
            { $group: { _id: '$assigned_to', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', total: 1, completed: 1 } },
            { $sort: { total: -1 } }
        ]);

        // Lead status full breakdown
        const leadStatusBreakdown = await Lead.aggregate([
            { $match: { is_archived: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Service order status breakdown
        const orderStatusBreakdown = await ServiceOrder.aggregate([
            { $match: { is_archived: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Recent conversions
        const recentConversions = await Lead.find({ status: 'converted' })
            .populate('assigned_to', 'name').populate('interested_package', 'name')
            .sort({ updatedAt: -1 }).limit(5);

        const qStats = quoteAgg[0] || { total: 0, totalValue: 0, accepted: 0 };
        const opsRate = totalOrders ? Math.round((completedOrders / totalOrders) * 100) : 0;

        res.json({
            success: true, data: {
                total_leads: totalLeads, conversions_this_month: conversions,
                delayed_services: delayedServices, total_clients: totalClients,
                total_orders: totalOrders, completed_orders: completedOrders, ops_rate: opsRate,
                quote_stats: qStats, lead_trend: leadTrend, order_trend: orderTrend,
                sales_performance: salesPerformance, revenue_by_package: revenueByPackage,
                ops_completion: opsCompletion, lead_status_breakdown: leadStatusBreakdown,
                order_status_breakdown: orderStatusBreakdown, recent_conversions: recentConversions,
            }
        });
    } catch (err) { next(err); }
};


// @desc    Admin dashboard — rich analytics
exports.adminDashboard = async (req, res, next) => {
    try {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        // Core counts
        const [totalUsers, totalLeads, totalClients, totalOrders, totalPackages, completedOrders] = await Promise.all([
            User.countDocuments(),
            Lead.countDocuments({ is_archived: false }),
            Client.countDocuments({ is_archived: false }),
            ServiceOrder.countDocuments({ is_archived: false }),
            Package.countDocuments({ is_active: true }),
            ServiceOrder.countDocuments({ status: 'completed' }),
        ]);

        // Total revenue from completed orders
        const totalRevenueAgg = await ServiceOrder.aggregate([
            { $match: { status: 'completed' } },
            { $lookup: { from: 'packages', localField: 'package', foreignField: '_id', as: 'pkg' } },
            { $unwind: '$pkg' },
            { $group: { _id: null, total: { $sum: '$pkg.price' } } }
        ]);

        // Users by role (donut)
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // Lead pipeline status breakdown (donut/bar)
        const leadsByStatus = await Lead.aggregate([
            { $match: { is_archived: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Service order pipeline (bar)
        const ordersByStatus = await ServiceOrder.aggregate([
            { $match: { is_archived: false } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Monthly leads created — last 6 months (line chart)
        const leadsOverTime = await Lead.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    created: { $sum: 1 },
                    converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Monthly revenue — last 6 months (bar chart)
        const revenueOverTime = await ServiceOrder.aggregate([
            { $match: { status: 'completed', updatedAt: { $gte: sixMonthsAgo } } },
            { $lookup: { from: 'packages', localField: 'package', foreignField: '_id', as: 'pkg' } },
            { $unwind: '$pkg' },
            {
                $group: {
                    _id: { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
                    revenue: { $sum: '$pkg.price' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Top packages by revenue
        const topPackages = await ServiceOrder.aggregate([
            { $match: { status: 'completed' } },
            { $lookup: { from: 'packages', localField: 'package', foreignField: '_id', as: 'pkg' } },
            { $unwind: '$pkg' },
            { $group: { _id: '$pkg.name', count: { $sum: 1 }, revenue: { $sum: '$pkg.price' } } },
            { $sort: { revenue: -1 } },
            { $limit: 6 }
        ]);

        // Sales performance (bar — leads + conversions per rep)
        const salesPerformance = await Lead.aggregate([
            { $match: { is_archived: false, assigned_to: { $exists: true } } },
            {
                $group: {
                    _id: '$assigned_to',
                    total: { $sum: 1 },
                    converted: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
                    interested: { $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] } },
                }
            },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', total: 1, converted: 1, interested: 1 } },
            { $sort: { total: -1 } },
            { $limit: 6 }
        ]);

        // Ops staff completion (bar)
        const opsCompletion = await ServiceOrder.aggregate([
            { $match: { assigned_to: { $exists: true } } },
            {
                $group: {
                    _id: '$assigned_to',
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
                }
            },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { name: '$user.name', total: 1, completed: 1 } },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        // Recent conversions
        const recentConversions = await Lead.find({ status: 'converted' })
            .populate('assigned_to', 'name')
            .sort({ updatedAt: -1 })
            .limit(5);

        res.json({
            success: true, data: {
                total_users: totalUsers, total_leads: totalLeads,
                total_clients: totalClients, total_service_orders: totalOrders,
                total_packages: totalPackages, completed_orders: completedOrders,
                total_revenue: totalRevenueAgg[0]?.total || 0,
                users_by_role: usersByRole,
                leads_by_status: leadsByStatus,
                orders_by_status: ordersByStatus,
                leads_over_time: leadsOverTime,
                revenue_over_time: revenueOverTime,
                top_packages: topPackages,
                sales_performance: salesPerformance,
                ops_completion: opsCompletion,
                recent_conversions: recentConversions,
            }
        });
    } catch (err) { next(err); }
};
