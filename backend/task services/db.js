require('dotenv').config();
const mongoose = require('mongoose');
const { User, Plan, Subscription } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sdcproject';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected via Mongoose...');
    
    // Import and trigger PostgreSQL to MongoDB bulk sync
    try {
      const { syncAllFromPostgres } = require('./sync');
      await syncAllFromPostgres();
    } catch (syncErr) {
      console.warn('PostgreSQL synchronization bridge failed to run. Falling back to local MongoDB seeding...', syncErr.message);
      await seedData();
    }
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Seed default Plans if none exist
    const planCount = await Plan.countDocuments();
    if (planCount === 0) {
      console.log('Seeding default plans...');
      const defaultPlans = [
        {
          planName: 'Starter',
          description: 'A lean plan for users who only need one active device and fast browsing.',
          category: 'Solo users',
          features: '1 screen, Offline access, Smart recommendations',
          monthlyPrice: 9.0,
          durationMonths: 1,
          active: true
        },
        {
          planName: 'Plus',
          description: 'A practical plan that fits families or teams who want a little more room.',
          category: 'Shared households',
          features: '3 screens, Profile sharing, Billing reminders',
          monthlyPrice: 14.0,
          durationMonths: 1,
          active: true
        },
        {
          planName: 'Pro',
          description: 'The best fit for users who track status, switch plans often, and need headroom.',
          category: 'Heavy streamers',
          features: '5 screens, Priority queue, Advanced plan insights',
          monthlyPrice: 19.0,
          durationMonths: 1,
          active: true
        },
        {
          planName: 'Elite',
          description: 'Built for users who need the fullest plan and visibility into usage trends.',
          category: 'Power teams',
          features: '8 screens, Dedicated account view, Usage analytics',
          monthlyPrice: 29.0,
          durationMonths: 1,
          active: true
        }
      ];
      await Plan.insertMany(defaultPlans);
      console.log('Default plans seeded successfully!');
    }

    // Seed Default Admin User if not exists
    const adminExists = await User.findOne({ email: 'admin' });
    if (!adminExists) {
      console.log('Seeding default admin user...');
      await User.create({
        fullname: 'Admin User',
        phone: '0000000000',
        email: 'admin',
        password: 'admin@123',
        role: 99,
        status: 1
      });
      await User.create({
        fullname: 'Admin Flow User',
        phone: '0000000000',
        email: 'admin@streamflow.com',
        password: 'admin',
        role: 99,
        status: 1
      });
      console.log('Default admin users seeded successfully!');
    }
  } catch (seedErr) {
    console.error('Error during fallback data seeding:', seedErr);
  }
};

module.exports = { connectDB };
