const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({ entity_type, entity_id, action, performed_by, description, meta }) => {
    try {
        await ActivityLog.create({ entity_type, entity_id, action, performed_by, description, meta });
    } catch (err) {
        console.error('Activity log error:', err.message);
    }
};

module.exports = { logActivity };
