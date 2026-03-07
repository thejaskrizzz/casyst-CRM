const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const ServiceOrder = require('../models/ServiceOrder');
const { protect } = require('../middleware/auth');

router.use(protect);

/**
 * GET /api/tasks/mine
 * Returns a role-specific work feed:
 *   - ALL roles: manual tasks assigned to them (grouped new today / pending)
 *   - sales: newly assigned leads + leads requiring follow-up
 *   - operations: newly assigned service orders (converted leads)
 */
router.get('/mine', async (req, res, next) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // ── Manual tasks assigned to this user ──
        const tasks = await Task.find({
            assigned_to: req.user._id,
            status: { $ne: 'done' },
        })
            .populate({
                path: 'service_order',
                populate: { path: 'client', select: 'company_name contact_person' },
                select: 'client package status',
            })
            .populate('created_by', 'name')
            .sort({ createdAt: -1 });

        const myNew = tasks.filter(t => t.createdAt >= todayStart && t.createdAt <= todayEnd);
        const myPending = tasks.filter(t => !(t.createdAt >= todayStart && t.createdAt <= todayEnd));

        // ── Sales: newly assigned leads (today) + all active leads ──
        let newLeads = [];
        let activeLeads = [];
        if (req.user.role === 'sales') {
            newLeads = await Lead.find({
                assigned_to: req.user._id,
                createdAt: { $gte: todayStart, $lte: todayEnd },
            })
                .populate('created_by', 'name')
                .select('name phone email status source createdAt created_by')
                .sort({ createdAt: -1 });

            activeLeads = await Lead.find({
                assigned_to: req.user._id,
                status: { $nin: ['converted', 'lost'] },
                createdAt: { $lt: todayStart },
            })
                .select('name phone email status source createdAt')
                .sort({ updatedAt: -1 })
                .limit(20);
        }

        // ── Operations: newly assigned service orders ──
        let newOrders = [];
        let activeOrders = [];
        if (req.user.role === 'operations') {
            newOrders = await ServiceOrder.find({
                assigned_to: req.user._id,
                createdAt: { $gte: todayStart, $lte: todayEnd },
                is_archived: false,
            })
                .populate('client', 'company_name contact_person phone')
                .populate('package', 'name')
                .populate('assigned_by', 'name')
                .select('client package status priority due_date assigned_by createdAt')
                .sort({ createdAt: -1 });

            activeOrders = await ServiceOrder.find({
                assigned_to: req.user._id,
                status: { $nin: ['completed', 'rejected'] },
                createdAt: { $lt: todayStart },
                is_archived: false,
            })
                .populate('client', 'company_name contact_person phone')
                .populate('package', 'name')
                .select('client package status priority due_date createdAt')
                .sort({ updatedAt: -1 })
                .limit(20);
        }

        res.json({
            success: true,
            data: {
                // Manual tasks (all roles)
                new_today: myNew,
                pending: myPending,
                total_tasks: tasks.length,
                // Sales-specific
                new_leads: newLeads,
                active_leads: activeLeads,
                // Operations-specific
                new_orders: newOrders,
                active_orders: activeOrders,
            },
        });
    } catch (err) { next(err); }
});

/**
 * PATCH /api/tasks/:taskId/status
 * Quick status update from the tasks page
 */
router.patch('/:taskId/status', async (req, res, next) => {
    try {
        const { status, remarks } = req.body;
        const task = await Task.findByIdAndUpdate(
            req.params.taskId,
            { status, remarks },
            { new: true, runValidators: true }
        ).populate('service_order', 'client').populate('assigned_to', 'name');
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, data: task });
    } catch (err) { next(err); }
});

module.exports = router;
