// 1. Place this file in your casyst-CRM root folder.
// 2. Open terminal in the casyst-CRM folder.
// 3. Run: node change-password.js

require('dotenv').config(); // Automatically loads MONGODB_URI from your .env
const mongoose = require('mongoose');
const User = require('./src/models/User'); // Mongoose model which contains bcrypt

const updatePassword = async (email, newPassword) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Database');

        const user = await User.findOne({ email });
        if (!user) {
            console.log('❌ User not found!');
            process.exit(1);
        }

        // The Mongoose pre-save hook inside User.js automatically hashes this password!
        user.password = newPassword;
        await user.save();

        console.log(`✅ Password for ${email} has been successfully updated!`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

// 👇 CHANGE THESE VALUES TO YOUR LIKING 👇
updatePassword('admin@casyst.com', 'CAsyst@clct');
