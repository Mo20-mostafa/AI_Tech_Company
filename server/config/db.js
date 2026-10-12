// ==========================================
// config/db.js
// MongoDB connection + automatic seeding on boot.
// ==========================================

const mongoose = require('mongoose');

// Models (imported so we can seed them after connecting)
const Role = require('../models/Role');
const User = require('../models/User');

// Central registries
const { PERMISSIONS, DEFAULT_ROLES } = require('../utils/permissions');
const { hashPassword } = require('../utils/helpers');

/**
 * Seed default roles on boot.
 * Idempotent — updates existing roles to match the source of truth.
 */
async function seedRoles() {
    try {
        for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
            const existing = await Role.findOne({ name });
            if (!existing) {
                await Role.create({
                    name,
                    displayName: def.displayName,
                    description: def.description,
                    permissions: def.permissions,
                    isSystem: true
                });
                console.log(`==> Role seeded: ${name}`);
            } else {
                existing.displayName = def.displayName;
                existing.description = def.description;
                existing.permissions = def.permissions;
                existing.isSystem = true;
                await existing.save();
            }
        }
    } catch (err) {
        console.error('Error seeding roles:', err.message);
    }
}

/**
 * Ensure the designated admin account exists.
 * Idempotent — creates it if missing, refreshes role/permissions otherwise.
 */
async function seedAdminUser() {
    try {
        const adminEmail = 'emostafamamdoh@gmail.com';
        const adminRole = await Role.findOne({ name: 'admin' });
        const adminPerms = adminRole ? adminRole.permissions : Object.values(PERMISSIONS);

        let admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: await hashPassword('admin123'),
                role: 'admin',
                permissions: adminPerms
            });
            console.log(`==> Admin Account Created: ${adminEmail}`);
        } else {
            let changed = false;
            if (admin.role !== 'admin') { admin.role = 'admin'; changed = true; }
            if (JSON.stringify(admin.permissions) !== JSON.stringify(adminPerms)) {
                admin.permissions = adminPerms; changed = true;
            }
            if (changed) {
                await admin.save();
                console.log(`==> Admin refreshed: ${adminEmail}`);
            }
        }
    } catch (err) {
        console.error('Error seeding admin:', err.message);
    }
}

/**
 * Connect to MongoDB and run seeders.
 * Uses MONGO_URI from .env, with a safe fallback.
 */
async function connectDB() {
    const mongoURI = process.env.MONGO_URI
        || "mongodb+srv://20240602_db_user:Password123m@cluster0.erylrox.mongodb.net/nexus_ai?retryWrites=true&w=majority";

    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connected Successfully');
        await seedRoles();
        await seedAdminUser();
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
}

module.exports = { connectDB };