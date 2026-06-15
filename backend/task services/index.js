const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const { connectDB } = require('./db');
const { User, Plan, Subscription } = require('./models');
const { syncUserAndSubscription, syncSubscriptionById } = require('./sync');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database Connection
connectDB();

/* ==========================================================================
   NODE.JS CRUD OPERATIONS (Plans API)
   ========================================================================== */

// 1. GET ALL PLANS
app.get('/api/node/plans', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ monthlyPrice: 1 });
    res.status(200).json(plans);
  } catch (err) {
    console.error('Error retrieving plans:', err);
    res.status(500).json({ error: 'Failed to retrieve plans' });
  }
});

// 2. GET SINGLE PLAN
app.get('/api/node/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(200).json(plan);
  } catch (err) {
    console.error(`Error retrieving plan ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to retrieve plan' });
  }
});

// 3. CREATE NEW PLAN
app.post('/api/node/plans', async (req, res) => {
  try {
    const { planName, description, category, features, monthlyPrice, durationMonths, active } = req.body;
    const isActive = active !== undefined ? active : true;
    
    const newPlan = await Plan.create({
      planName,
      description,
      category,
      features,
      monthlyPrice,
      durationMonths: durationMonths || 1,
      active: isActive
    });
    res.status(201).json(newPlan);
  } catch (err) {
    console.error('Error creating plan:', err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// 4. DELETE A PLAN
app.delete('/api/node/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPlan = await Plan.findByIdAndDelete(id);
    if (!deletedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(200).json({ message: 'Plan deleted successfully', plan: deletedPlan });
  } catch (err) {
    console.error(`Error deleting plan ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

/* ==========================================================================
   GET CURRENT ACTIVE SUBSCRIPTION BY USER EMAIL
   ========================================================================== */
app.get('/api/node/current-sub', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }
    
    // Run on-demand sync from PostgreSQL to MongoDB for this email
    await syncUserAndSubscription(email);

    // Case-insensitive query for user email
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Find active subscription for user, sorted by updatedAt desc, populate plan
    const sub = await Subscription.findOne({ userId: user._id, status: 'ACTIVE' })
      .sort({ updatedAt: -1 })
      .populate('planId');
      
    if (!sub) {
      return res.status(404).json({ error: 'No active subscription found for this email' });
    }
    
    // Format renewal date
    let renewal_date = 'N/A';
    if (sub.renewalDate) {
      renewal_date = sub.renewalDate.toISOString().split('T')[0];
    }
    
    res.status(200).json({
      subscription_id: sub._id,
      plan_name: sub.planId ? sub.planId.planName : 'N/A',
      status: sub.status,
      renewal_date: renewal_date
    });
  } catch (err) {
    console.error('Error retrieving active subscription:', err);
    res.status(500).json({ error: 'Failed to retrieve active subscription' });
  }
});

/* ==========================================================================
   DYNAMIC PDF INVOICE GENERATOR
   ========================================================================== */
app.get('/invoice/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    // Fetch and sync subscription from PostgreSQL if needed, and populate both user and plan details
    const sub = await syncSubscriptionById(subscriptionId);
      
    if (!sub) {
      return res.status(404).json({ error: 'Subscription invoice record not found' });
    }
    
    const user = sub.userId;
    const plan = sub.planId;
    
    if (!user || !plan) {
      return res.status(404).json({ error: 'Incomplete subscription record (missing user or plan reference)' });
    }
    
    // Format dates for display
    const startDateStr = sub.startDate ? sub.startDate.toISOString().split('T')[0] : 'N/A';
    const renewalDateStr = sub.renewalDate ? sub.renewalDate.toISOString().split('T')[0] : 'N/A';
    
    // Initialize PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Stream PDF directly back as attachment response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${subscriptionId}.pdf`);
    doc.pipe(res);
    
    // Draw header elements (Red/Dark Premium Accent)
    doc.fillColor('#E50914') // Brand Red
       .fontSize(28)
       .text('MOVIE TIME', 50, 50, { align: 'left' });

    doc.fillColor('#555555')
       .fontSize(10)
       .text('Premium Movie Streaming Catalog Inc.', 50, 85);

    doc.fontSize(18)
       .fillColor('#111111')
       .text('PAYMENT RECEIPT / INVOICE', 50, 115, { align: 'right' });

    doc.moveTo(50, 140)
       .lineTo(550, 140)
       .stroke('#DDDDDD');

    // Customer & Metadata Info
    doc.fontSize(11)
       .fillColor('#333333')
       .text('CUSTOMER DETAILS', 50, 165, { underline: true });
    doc.fontSize(10)
       .fillColor('#111111')
       .text(`Name:   ${user.fullname}`, 50, 185)
       .text(`Email:  ${user.email}`, 50, 200)
       .text(`Phone:  ${user.phone || 'N/A'}`, 50, 215);

    doc.fontSize(11)
       .fillColor('#333333')
       .text('INVOICE INFORMATION', 330, 165, { underline: true });
    doc.fontSize(10)
       .fillColor('#111111')
       .text(`Invoice Number: MT-SUB-${sub._id}`, 330, 185)
       .text(`Status:         ${sub.status.toUpperCase()}`, 330, 200)
       .text(`Start Date:     ${startDateStr}`, 330, 215)
       .text(`Renewal Date:   ${renewalDateStr}`, 330, 230);

    doc.moveTo(50, 260)
       .lineTo(550, 260)
       .stroke('#DDDDDD');

    // Invoice Table Headers
    doc.fontSize(10)
       .fillColor('#555555')
       .text('Item / Tier Description', 50, 285)
       .text('Billing Arrangement', 300, 285)
       .text('Price Charged', 450, 285, { align: 'right' });

    doc.moveTo(50, 305)
       .lineTo(550, 305)
       .stroke('#E50914');

    // Invoice Row Data
    doc.fontSize(10)
       .fillColor('#111111')
       .text(`${plan.planName} Movie Tier Plan`, 50, 325)
       .text(plan.durationMonths === 12 ? 'Yearly Cycle' : 'Monthly Cycle', 300, 325)
       .text(`$${plan.monthlyPrice.toFixed(2)}`, 450, 325, { align: 'right' });

    doc.moveTo(50, 355)
       .lineTo(550, 355)
       .stroke('#DDDDDD');

    // Total Calculation Section
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Total Paid:', 300, 380)
       .fontSize(14)
       .fillColor('#E50914')
       .text(`$${plan.monthlyPrice.toFixed(2)} USD`, 450, 380, { align: 'right' });

    // Terms / Branding footer
    doc.moveTo(50, 450)
       .lineTo(550, 450)
       .stroke('#EEEEEE');

    doc.fontSize(8)
       .fillColor('#888888')
       .text('Thank you for subscribing to Movie Time! Access thousands of top tier cinematic catalogs instantly.', 50, 480, { align: 'center' })
       .text('This PDF document acts as a verified proof of transaction fee clearance.', 50, 495, { align: 'center' });

    // Finalize PDF file
    doc.end();

  } catch (err) {
    console.error('Error generating PDF invoice:', err);
    res.status(500).json({ error: 'Failed to generate PDF billing invoice receipt' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Node.js billing microservice running on port ${PORT}`);
});
