const mongoose = require('mongoose');
const User = require('../models/User');
const Plan = require('../models/Plan');
require('dotenv').config();


async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');

    // Create default admin user if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@smartkorafx.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    let admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      admin = new User({
        fullName: 'Admin User',
        email: adminEmail,
        username: 'admin',
        passwordHash: adminPassword,
        role: 'admin',
        isApproved: true
      });
      await admin.save();
      console.log('✅ Admin user created');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Create default subscription plans
    const defaultPlans = [
      {
        tier: 'Regular',
        priceUSD: 29.99,
        durationDays: 30,
        features: [
          'Unlimited Signal Generation',
          'Basic Technical Analysis',
          'Email Support',
          'Access to Trading Signals'
        ],
        isActive: true,
        displayOrder: 1
      },
      {
        tier: 'Standard',
        priceUSD: 79.99,
        durationDays: 90,
        features: [
          'All Regular Features',
          'Advanced SMC Analysis',
          'Priority Support',
          'Market Trend Reports',
          'Risk Management Tools'
        ],
        isActive: true,
        displayOrder: 2
      },
      {
        tier: 'VIP',
        priceUSD: 249.99,
        durationDays: 365,
        features: [
          'All Standard Features',
          'Personal Trading Consultant',
          '24/7 Premium Support',
          'Custom Strategy Development',
          'API Access',
          'Private Community Access'
        ],
        isActive: true,
        displayOrder: 3
      }
    ];

    for (const planData of defaultPlans) {
      let plan = await Plan.findOne({ tier: planData.tier });
      
      if (!plan) {
        plan = new Plan(planData);
        await plan.save();
        console.log(`✅ Created ${planData.tier} plan - $${planData.priceUSD} for ${planData.durationDays} days`);
      } else {
        console.log(`✅ ${planData.tier} plan already exists`);
      }
    }

    console.log('✅ Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('📦 Connected to MongoDB');
      await initializeDatabase();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
