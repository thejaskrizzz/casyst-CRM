const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const ServiceOrder = require('../models/ServiceOrder');
const { protect } = require('../middleware/auth');

router.use(protect);

/**
 * GET /api/tasks/mine
 * Returns all tasks assigned to the current user, with service order + client context.
 * Grouped by: new (assigned today) and pending/in_progress.
 */
router.get('/mine', async (req, res, next) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Fetch all non-done tasks assigned to this user
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

        // Also fetch tasks created today (assigned to anyone, on orders assigned to this ops user)
        // Only relevant for operations role
        let newAssignments = [];
        if (req.user.role === 'operations') {
            const orders = await ServiceOrder.find({ assigned_to: req.user._id, is_archived: false }).select('_id');
            const orderIds = orders.map(o => o._id);
            newAssignments = await Task.find({
                service_order: { $in: orderIds },
                createdAt: { $gte: todayStart, $lte: todayEnd },
                assigned_to: { $ne: req.user._id }, // assigned to someone else, but on my order
            })
                .populate({ path: 'service_order', populate: { path: 'client', select: 'company_name' }, select: 'client' })
                .populate('assigned_to', 'name')
                .sort({ createdAt: -1 });
        }

        const myNew = tasks.filter(t => t.createdAt >= todayStart && t.createdAt <= todayEnd);
        const myPending = tasks.filter(t => !(t.createdAt >= todayStart && t.createdAt <= todayEnd));

        res.json({
            success: true,
            data: {
                new_today: myNew,        // my tasks created today
                pending: myPending,      // my older pending tasks
                order_updates: newAssignments, // new tasks on my orders (ops only)
                total: tasks.length,
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
