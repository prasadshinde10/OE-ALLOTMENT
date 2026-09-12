require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

async function seedAdmins() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/oe_allotment';
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. OE Admin
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@mit.asia').toLowerCase();
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        name: 'OE Admin',
        email: adminEmail,
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();
      console.log(`✓ OE Admin created: ${adminEmail} (role: admin)`);
    } else {
      if (admin.name === 'Super Admin') {
        admin.name = 'OE Admin';
        await admin.save();
      }
      console.log(`✓ OE Admin verified: ${adminEmail}`);
    }

    // 2. Second Admin (FY Club Admin)
    const admin2Email = (process.env.ADMIN2_EMAIL || 'admin2@mit.asia').toLowerCase();
    let admin2 = await User.findOne({ email: admin2Email });
    if (!admin2) {
      admin2 = new User({
        name: 'First Year Club Admin',
        email: admin2Email,
        password: 'admin123',
        role: 'FY_ADMIN'
      });
      await admin2.save();
      console.log(`✓ Admin 2 created: ${admin2Email} (password: admin123, role: FY_ADMIN)`);
    } else {
      admin2.role = 'FY_ADMIN';
      admin2.password = 'admin123';
      await admin2.save();
      console.log(`✓ Admin 2 verified and updated: ${admin2Email} (password: admin123, role: FY_ADMIN)`);
    }

    await mongoose.disconnect();
    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedAdmins();
