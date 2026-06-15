const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// PostgreSQL database connection pool configured from properties
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sdcproject',
  user: 'postgres',
  password: 'Mohit@2704',
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('PostgreSQL Connection Error:', err);
  } else {
    console.log('PostgreSQL Connected via Node.js on port 5432');
  }
});

/* ==========================================================================
   NODE.JS CRUD OPERATIONS (Plans API)
   ========================================================================== */

// 1. GET ALL PLANS
app.get('/api/node/plans', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plans ORDER BY monthly_price ASC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve plans' });
  }
});

// 2. GET SINGLE PLAN
app.get('/api/node/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve plan' });
  }
});

// 3. CREATE NEW PLAN
app.post('/api/node/plans', async (req, res) => {
  try {
    const { planName, description, category, features, monthlyPrice, durationMonths, active } = req.body;
    const isActive = active !== undefined ? active : true;
    
    const result = await pool.query(
      `INSERT INTO plans (plan_name, description, category, features, monthly_price, duration_months, active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
      [planName, description, category, features, monthlyPrice, durationMonths || 1, isActive]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// 4. DELETE A PLAN
app.delete('/api/node/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM plans WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    res.status(200).json({ message: 'Plan deleted successfully', plan: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});


/* ==========================================================================
   DYNAMIC PDF INVOICE GENERATOR
   ========================================================================== */

app.get('/invoice/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    // Fetch subscription details joining users and plans
    const query = `
      SELECT s.id as subscription_id, s.status, s.start_date, s.renewal_date, s.notes,
             u.fullname, u.email, u.phone,
             p.plan_name, p.monthly_price, p.duration_months
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      WHERE s.id = $1
    `;
    
    const dbResult = await pool.query(query, [subscriptionId]);
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription invoice record not found' });
    }

    const invoice = dbResult.rows[0];

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
       .text(`Name:   ${invoice.fullname}`, 50, 185)
       .text(`Email:  ${invoice.email}`, 50, 200)
       .text(`Phone:  ${invoice.phone || 'N/A'}`, 50, 215);

    doc.fontSize(11)
       .fillColor('#333333')
       .text('INVOICE INFORMATION', 330, 165, { underline: true });
    doc.fontSize(10)
       .fillColor('#111111')
       .text(`Invoice Number: MT-SUB-${invoice.subscription_id}`, 330, 185)
       .text(`Status:         ${invoice.status.toUpperCase()}`, 330, 200)
       .text(`Start Date:     ${invoice.start_date}`, 330, 215)
       .text(`Renewal Date:   ${invoice.renewal_date || 'N/A'}`, 330, 230);

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
       .text(`${invoice.plan_name} Movie Tier Plan`, 50, 325)
       .text(invoice.duration_months === 12 ? 'Yearly Cycle' : 'Monthly Cycle', 300, 325)
       .text(`$${invoice.monthly_price.toFixed(2)}`, 450, 325, { align: 'right' });

    doc.moveTo(50, 355)
       .lineTo(550, 355)
       .stroke('#DDDDDD');

    // Total Calculation Section
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Total Paid:', 300, 380)
       .fontSize(14)
       .fillColor('#E50914')
       .text(`$${invoice.monthly_price.toFixed(2)} USD`, 450, 380, { align: 'right' });

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
    console.error(err);
    res.status(500).json({ error: 'Failed to generate PDF billing invoice receipt' });
  }
});

// GET CURRENT SUBSCRIPTION ID BY USER EMAIL
app.get('/api/node/current-sub', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }
    const query = `
      SELECT s.id as subscription_id, p.plan_name, s.status, s.renewal_date
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN plans p ON s.plan_id = p.id
      WHERE LOWER(u.email) = LOWER($1) AND s.status = 'ACTIVE'
      ORDER BY s.updated_at DESC LIMIT 1
    `;
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found for this email' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve active subscription' });
  }
});

app.listen(PORT, () => {
  console.log(`Node.js microservice running on port ${PORT}`);
});
