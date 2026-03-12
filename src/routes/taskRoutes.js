const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const ServiceOrder = require('../models/ServiceOrder');
const { protect } = require('../middleware/auth');

router.use(protect);

/** GET /api/tasks/mine — role-specific work feed */
router.get('/mine', async (req, res, next) => {
    try {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        const tasks = await Task.find({ assigned_to: req.user._id, status: { $ne: 'done' } })
            .populate({ path: 'service_order', select: 'client package status', populate: { path: 'client', select: 'company_name' } })
            .populate('created_by', 'name')
            .sort({ createdAt: -1 });

        const myNew = tasks.filter(t => t.createdAt >= todayStart && t.createdAt <= todayEnd);
        const myPending = tasks.filter(t => !(t.createdAt >= todayStart && t.createdAt <= todayEnd));

        let newLeads = [], activeLeads = [], newOrders = [], activeOrders = [];

        if (req.user.role === 'sales') {
            [newLeads, activeLeads] = await Promise.all([
                Lead.find({ assigned_to: req.user._id, createdAt: { $gte: todayStart, $lte: todayEnd } })
                    .populate('created_by', 'name')
                    .select('name phone email status source createdAt created_by')
                    .sort({ createdAt: -1 }),
                Lead.find({ assigned_to: req.user._id, status: { $nin: ['converted', 'lost'] }, createdAt: { $lt: todayStart } })
                    .select('name phone email status source createdAt')
                    .sort({ updatedAt: -1 })
                    .limit(20),
            ]);
        }

        if (req.user.role === 'operations') {
            [newOrders, activeOrders] = await Promise.all([
                ServiceOrder.find({ assigned_to: req.user._id, createdAt: { $gte: todayStart, $lte: todayEnd }, is_archived: false })
                    .populate('client', 'company_name phone')
                    .populate('package', 'name')
                    .select('client package status priority due_date createdAt')
                    .sort({ createdAt: -1 }),
                ServiceOrder.find({ assigned_to: req.user._id, status: { $nin: ['completed', 'rejected'] }, createdAt: { $lt: todayStart }, is_archived: false })
                    .populate('client', 'company_name phone')
                    .populate('package', 'name')
                    .select('client package status priority due_date createdAt')
                    .sort({ updatedAt: -1 })
                    .limit(20),
            ]);
        }

        res.json({
            success: true,
            data: { new_today: myNew, pending: myPending, total_tasks: tasks.length, new_leads: newLeads, active_leads: activeLeads, new_orders: newOrders, active_orders: activeOrders },
        });
    } catch (err) { next(err); }
});

/** PATCH /api/tasks/:taskId/status */
router.patch('/:taskId/status', async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.taskId, { status: req.body.status, remarks: req.body.remarks }, { new: true, runValidators: true });
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, data: task });
    } catch (err) { next(err); }
});

module.exports = router;
