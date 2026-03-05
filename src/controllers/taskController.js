const Task = require('../models/Task');
const { logActivity } = require('../utils/activityLogger');

exports.getTasks = async (req, res, next) => {
    try {
        const tasks = await Task.find({ service_order: req.params.id })
            .populate('assigned_to', 'name email')
            .populate('created_by', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: tasks });
    } catch (err) { next(err); }
};

exports.createTask = async (req, res, next) => {
    try {
        const { title, description, assigned_to } = req.body;
        const task = await Task.create({
            service_order: req.params.id, title, description,
            assigned_to, created_by: req.user._id,
        });
        await logActivity({ entity_type: 'service_order', entity_id: req.params.id, action: 'task_created', performed_by: req.user._id, description: `Task '${task.title}' created` });
        res.status(201).json({ success: true, data: task });
    } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
    try {
        const { status, remarks } = req.body;
        const task = await Task.findOneAndUpdate(
            { _id: req.params.taskId, service_order: req.params.id },
            { status, remarks },
            { new: true, runValidators: true }
        );
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        await logActivity({ entity_type: 'service_order', entity_id: req.params.id, action: 'task_updated', performed_by: req.user._id, description: `Task '${task.title}' status updated to '${status}'` });
        res.json({ success: true, data: task });
    } catch (err) { next(err); }
};
