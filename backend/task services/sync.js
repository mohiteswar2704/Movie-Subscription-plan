const mongoose = require('mongoose');
const pgPool = require('./pg');
const { User, Plan, Subscription } = require('./models');

// Helper to convert PostgreSQL integer IDs to valid 24-character hex MongoDB ObjectIds
function pgIdToObjectId(pgId) {
  if (!pgId) return null;
  const hex = Number(pgId).toString(16);
  const padded = hex.padStart(24, '0');
  return new mongoose.Types.ObjectId(padded);
}

// Syncs ALL users, plans, and subscriptions from PostgreSQL to MongoDB in bulk
async function syncAllFromPostgres() {
  console.log('Starting bulk synchronization from PostgreSQL to MongoDB...');
  try {
    // 1. Sync all Users
    const usersRes = await pgPool.query('SELECT * FROM users');
    console.log(`Found ${usersRes.rows.length} users in PostgreSQL.`);
    for (const pgUser of usersRes.rows) {
      const mongoUserId = pgIdToObjectId(pgUser.id);
      
      // Delete any existing user with the same email but a different ID to prevent duplicate key errors
      await User.deleteMany({ 
        email: pgUser.email.toLowerCase(), 
        _id: { $ne: mongoUserId } 
      });

      await User.findByIdAndUpdate(
        mongoUserId,
        {
          fullname: pgUser.fullname,
          phone: pgUser.phone,
          email: pgUser.email.toLowerCase(),
          password: pgUser.password,
          role: pgUser.role,
          status: pgUser.status
        },
        { upsert: true }
      );
    }
    console.log('All users synchronized successfully.');

    // 2. Sync all Plans
    const plansRes = await pgPool.query('SELECT * FROM plans');
    console.log(`Found ${plansRes.rows.length} plans in PostgreSQL.`);
    for (const pgPlan of plansRes.rows) {
      const mongoPlanId = pgIdToObjectId(pgPlan.id);
      
      // Prevent duplicate key errors if any exists
      await Plan.deleteMany({
        planName: pgPlan.plan_name,
        _id: { $ne: mongoPlanId }
      });

      await Plan.findByIdAndUpdate(
        mongoPlanId,
        {
          planName: pgPlan.plan_name,
          description: pgPlan.description,
          category: pgPlan.category,
          features: pgPlan.features,
          monthlyPrice: Number(pgPlan.monthly_price),
          durationMonths: pgPlan.duration_months,
          active: pgPlan.active
        },
        { upsert: true }
      );
    }
    console.log('All plans synchronized successfully.');

    // 3. Sync all Subscriptions
    const subsRes = await pgPool.query('SELECT * FROM subscriptions');
    console.log(`Found ${subsRes.rows.length} subscriptions in PostgreSQL.`);
    for (const pgSub of subsRes.rows) {
      const mongoSubId = pgIdToObjectId(pgSub.id);
      const mongoUserId = pgIdToObjectId(pgSub.user_id);
      const mongoPlanId = pgIdToObjectId(pgSub.plan_id);

      // Delete any duplicates
      await Subscription.deleteMany({
        _id: { $ne: mongoSubId },
        userId: mongoUserId,
        planId: mongoPlanId
      });

      await Subscription.findByIdAndUpdate(
        mongoSubId,
        {
          userId: mongoUserId,
          planId: mongoPlanId,
          status: pgSub.status.toUpperCase(),
          startDate: pgSub.start_date,
          endDate: pgSub.end_date,
          renewalDate: pgSub.renewal_date,
          notes: pgSub.notes
        },
        { upsert: true }
      );
    }
    console.log('All subscriptions synchronized successfully.');
    console.log('Bulk synchronization completed successfully!');
  } catch (err) {
    console.error('Error during bulk synchronization:', err.message);
  }
}

// Syncs user, active subscription, and active plan from PostgreSQL into MongoDB by User Email (on-demand)
async function syncUserAndSubscription(email) {
  try {
    if (!email) return null;
    
    // Query PostgreSQL for the user by email
    const userRes = await pgPool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    
    if (userRes.rows.length === 0) {
      console.log(`User ${email} not found in PostgreSQL. Sync skipped.`);
      return null;
    }
    
    const pgUser = userRes.rows[0];
    const mongoUserId = pgIdToObjectId(pgUser.id);
    
    // Delete conflicting email documents
    await User.deleteMany({ 
      email: pgUser.email.toLowerCase(), 
      _id: { $ne: mongoUserId } 
    });

    // Upsert the User into MongoDB
    const mongoUser = await User.findByIdAndUpdate(
      mongoUserId,
      {
        fullname: pgUser.fullname,
        phone: pgUser.phone,
        email: pgUser.email.toLowerCase(),
        password: pgUser.password,
        role: pgUser.role,
        status: pgUser.status
      },
      { upsert: true, new: true }
    );
    console.log(`User synced to MongoDB: ${mongoUser.email} (ID: ${mongoUser._id})`);
    
    // Query PostgreSQL for their active subscription and associated plan
    const subRes = await pgPool.query(
      `SELECT s.*, p.plan_name, p.description, p.category, p.features, p.monthly_price, p.duration_months, p.active as plan_active
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND LOWER(s.status) = 'active'
       ORDER BY s.updated_at DESC LIMIT 1`,
      [pgUser.id]
    );
    
    if (subRes.rows.length === 0) {
      console.log(`No active PostgreSQL subscription found for user ${email}.`);
      return { user: mongoUser, subscription: null };
    }
    
    const pgSub = subRes.rows[0];
    const mongoPlanId = pgIdToObjectId(pgSub.plan_id);
    const mongoSubId = pgIdToObjectId(pgSub.id);
    
    // Delete conflicting plan names
    await Plan.deleteMany({
      planName: pgSub.plan_name,
      _id: { $ne: mongoPlanId }
    });

    // Upsert the Plan into MongoDB
    const mongoPlan = await Plan.findByIdAndUpdate(
      mongoPlanId,
      {
        planName: pgSub.plan_name,
        description: pgSub.description,
        category: pgSub.category,
        features: pgSub.features,
        monthlyPrice: Number(pgSub.monthly_price),
        durationMonths: pgSub.duration_months,
        active: pgSub.plan_active
      },
      { upsert: true, new: true }
    );
    
    // Upsert the Subscription into MongoDB
    const mongoSub = await Subscription.findByIdAndUpdate(
      mongoSubId,
      {
        userId: mongoUserId,
        planId: mongoPlanId,
        status: pgSub.status.toUpperCase(),
        startDate: pgSub.start_date,
        endDate: pgSub.end_date,
        renewalDate: pgSub.renewal_date,
        notes: pgSub.notes
      },
      { upsert: true, new: true }
    );
    
    console.log(`Active subscription synced to MongoDB for user ${email} (Sub ID: ${mongoSub._id})`);
    return { user: mongoUser, subscription: mongoSub, plan: mongoPlan };
    
  } catch (err) {
    console.error(`Error in syncUserAndSubscription for ${email}:`, err);
    return null;
  }
}

// Syncs specific subscription by its 24-character mapped hex ID (on-demand)
async function syncSubscriptionById(mongoSubIdStr) {
  try {
    if (!/^[0-9a-fA-F]{24}$/.test(mongoSubIdStr)) return null;
    
    // Check if it already exists in MongoDB
    let sub = await Subscription.findById(mongoSubIdStr).populate('userId').populate('planId');
    if (sub && sub.userId && sub.planId) {
      return sub;
    }
    
    // Parse PostgreSQL ID from the hex string (e.g. "000000000000000000000005" -> 5)
    const pgSubId = parseInt(mongoSubIdStr, 16);
    if (isNaN(pgSubId)) return null;
    
    console.log(`Subscription not found in MongoDB. Attempting sync from PostgreSQL for ID: ${pgSubId}`);
    
    // Query PostgreSQL
    const res = await pgPool.query(
      `SELECT s.*, u.fullname, u.phone, u.email, u.password, u.role, u.status as user_status,
              p.plan_name, p.description, p.category, p.features, p.monthly_price, p.duration_months, p.active as plan_active
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN plans p ON s.plan_id = p.id
       WHERE s.id = $1`,
      [pgSubId]
    );
    
    if (res.rows.length === 0) {
      console.log(`Subscription ${pgSubId} not found in PostgreSQL.`);
      return null;
    }
    
    const row = res.rows[0];
    const mongoUserId = pgIdToObjectId(row.user_id);
    const mongoPlanId = pgIdToObjectId(row.plan_id);
    
    // Upsert User
    await User.deleteMany({ email: row.email.toLowerCase(), _id: { $ne: mongoUserId } });
    await User.findByIdAndUpdate(mongoUserId, {
      fullname: row.fullname,
      phone: row.phone,
      email: row.email.toLowerCase(),
      password: row.password,
      role: row.role,
      status: row.user_status
    }, { upsert: true });
    
    // Upsert Plan
    await Plan.deleteMany({ planName: row.plan_name, _id: { $ne: mongoPlanId } });
    await Plan.findByIdAndUpdate(mongoPlanId, {
      planName: row.plan_name,
      description: row.description,
      category: row.category,
      features: row.features,
      monthlyPrice: Number(row.monthly_price),
      durationMonths: row.duration_months,
      active: row.plan_active
    }, { upsert: true });
    
    // Upsert Subscription
    sub = await Subscription.findByIdAndUpdate(new mongoose.Types.ObjectId(mongoSubIdStr), {
      userId: mongoUserId,
      planId: mongoPlanId,
      status: row.status.toUpperCase(),
      startDate: row.start_date,
      endDate: row.end_date,
      renewalDate: row.renewal_date,
      notes: row.notes
    }, { upsert: true, new: true }).populate('userId').populate('planId');
    
    console.log(`Subscription ID ${mongoSubIdStr} successfully synced from PostgreSQL.`);
    return sub;
  } catch (err) {
    console.error(`Error in syncSubscriptionById for ID ${mongoSubIdStr}:`, err);
    return null;
  }
}

module.exports = {
  syncAllFromPostgres,
  syncUserAndSubscription,
  syncSubscriptionById,
  pgIdToObjectId
};
