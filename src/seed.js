require('dotenv').config();
const mongoose = require('mongoose');


const User = require('./models/User');
const Package = require('./models/Package');
const Lead = require('./models/Lead');

const seed = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('🌱 Seeding database...');

    await User.deleteMany({});
    await Package.deleteMany({});
    await Lead.deleteMany({});

    // Create users
    const admin = await User.create({ name: 'Admin User', email: 'admin@casyst.com', phone: '9000000001', password: 'admin123', role: 'admin' });
    const manager = await User.create({ name: 'Rajesh Manager', email: 'manager@casyst.com', phone: '9000000002', password: 'manager123', role: 'manager' });
    const sales1 = await User.create({ name: 'Priya Sales', email: 'sales@casyst.com', phone: '9000000003', password: 'sales123', role: 'sales' });
    const ops1 = await User.create({ name: 'Arun Ops', email: 'ops@casyst.com', phone: '9000000004', password: 'ops123', role: 'operations' });

    // Create packages
    const pvtLtd = await Package.create({
        name: 'Private Limited Registration', description: 'Complete Pvt Ltd company registration with MCA filing',
        price: 12999, estimated_days: 15, required_documents: ['Aadhaar Card', 'PAN Card', 'Passport Photo', 'Address Proof', 'Digital Signature'],
        created_by: admin._id,
    });
    await Package.create({
        name: 'GST Registration', description: 'GST registration for businesses',
        price: 2999, estimated_days: 7, required_documents: ['Aadhaar Card', 'PAN Card', 'Business Address Proof', 'Bank Statement'],
        created_by: admin._id,
    });
    await Package.create({
        name: 'Trademark Registration', description: 'Brand name and logo trademark registration',
        price: 8999, estimated_days: 30, required_documents: ['Logo File', 'PAN Card', 'Aadhaar Card', 'Business Proof'],
        created_by: admin._id,
    });
    await Package.create({
        name: 'LLP Registration', description: 'Limited Liability Partnership registration',
        price: 9999, estimated_days: 20, required_documents: ['Aadhaar Card', 'PAN Card', 'Address Proof', 'Partnership Agreement Draft'],
        created_by: admin._id,
    });

    // Create sample leads
    await Lead.create([
        { name: 'Ramesh Kumar', phone: '9876543210', email: 'ramesh@example.com', source: 'website', interested_package: pvtLtd._id, notes: 'Interested in Pvt Ltd', assigned_to: sales1._id, created_by: sales1._id, status_history: [{ status: 'new', changed_by: sales1._id }] },
        { name: 'Sunita Sharma', phone: '9876543211', email: 'sunita@example.com', source: 'referral', interested_package: pvtLtd._id, notes: 'Referred by existing client', assigned_to: sales1._id, created_by: sales1._id, status: 'followup', status_history: [{ status: 'new', changed_by: sales1._id }, { status: 'followup', changed_by: sales1._id }] },
        { name: 'Amit Patel', phone: '9876543212', email: 'amit@example.com', source: 'ads', notes: 'GST needed urgently', assigned_to: sales1._id, created_by: sales1._id, status: 'interested', status_history: [{ status: 'new', changed_by: sales1._id }, { status: 'interested', changed_by: sales1._id }] },
    ]);

    console.log('✅ Seed data created successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('Admin:      admin@casyst.com      / admin123');
    console.log('Manager:    manager@casyst.com    / manager123');
    console.log('Sales:      sales@casyst.com      / sales123');
    console.log('Operations: ops@casyst.com        / ops123');

    process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
