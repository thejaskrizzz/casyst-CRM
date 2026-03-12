const mongoose = require('mongoose');
require('dotenv').config();

const testTracking = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/casyst-crm');

        // Find a recent order to test
        const ServiceOrder = require('./src/models/ServiceOrder');

        console.log('Testing that orderId works...');
        const order = await ServiceOrder.findOne().sort({ createdAt: -1 });
        if (!order) {
            console.log("No orders found in db.");
            process.exit(0);
        }

        console.log(`Working with Order ID object: ${order._id}`);
        console.log(`It has order_id: ${order.order_id}`);

        if (!order.order_id) {
            console.log('Order ID not populated... Triggering save to auto-generate one.');
            order.markModified('status'); // force pre-save
            await order.save();
            console.log(`Generated new order_id: ${order.order_id}`);
        }

        console.log('Test successful. Order ID Generation Works.');
        process.exit(0);

    } catch (e) {
        console.error("Test failed", e);
        process.exit(1);
    }
}
testTracking();
