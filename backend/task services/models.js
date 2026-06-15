const mongoose = require('mongoose');

// ==========================================
// USER MODEL SCHEMA
// ==========================================
const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  phone: { type: String },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true, 
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  role: { type: Number, default: 1 }, // 1 = USER, 99 = ADMIN
  status: { type: Number, default: 1 } // 1 = ACTIVE
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// PLAN MODEL SCHEMA
// ==========================================
const planSchema = new mongoose.Schema({
  planName: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  features: { type: String }, // Comma-separated features string to match Spring Boot DB structure
  monthlyPrice: { type: Number, required: true },
  durationMonths: { type: Number, default: 1 },
  active: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// SUBSCRIPTION MODEL SCHEMA
// ==========================================
const subscriptionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  planId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Plan', 
    required: true 
  },
  status: { type: String, required: true, default: 'ACTIVE' },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date },
  renewalDate: { type: Date },
  notes: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Define Models
const User = mongoose.model('User', userSchema);
const Plan = mongoose.model('Plan', planSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = { User, Plan, Subscription };
