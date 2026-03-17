const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// inject env from .env
const envPath = path.resolve('C:\\Users\\theja\\Documents\\GitHub\\casyst-CRM', '.env');
dotenv.config({ path: envPath });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/casyst_crm';

mongoose.connect(mongoUri)
    .then(async () => {
        console.log('Connected to DB');
        const db = mongoose.connection.db;
        const orders = await db.collection('serviceorders').find({}).toArray(); // find all
        
        console.log(`Found ${orders.length} service orders`);
        for (const o of orders) {
            console.log(`\nOrder ID: ${o._id} (${o.order_id})`);
            if (o.payments && o.payments.length > 0) {
                console.log('Payments:');
                o.payments.forEach((p, i) => {
                    console.log(`  [${i}] Status: ${p.status}, Amount: ${p.amount}, ID: ${p._id}`);
                });
            } else {
                console.log('No payments');
            }
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
