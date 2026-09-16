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
    const adminPassword = process.env.ADMIN_PASSWORD;
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      if (!adminPassword) {
        console.error('❌ Error: ADMIN_PASSWORD environment variable is required to create OE Admin.');
        process.exit(1);
      }
      admin = new User({
        name: 'OE Admin',
        email: adminEmail,
        password: adminPassword,
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
    const admin2Password = process.env.ADMIN2_PASSWORD;
    let admin2 = await User.findOne({ email: admin2Email });
    if (!admin2) {
      if (!admin2Password) {
        console.error('❌ Error: ADMIN2_PASSWORD environment variable is required to create FY Club Admin.');
        process.exit(1);
      }
      admin2 = new User({
        name: 'First Year Club Admin',
        email: admin2Email,
        password: admin2Password,
        role: 'FY_ADMIN'
      });
      await admin2.save();
      console.log(`✓ Admin 2 created: ${admin2Email} (role: FY_ADMIN)`);
    } else {
      if (admin2.role !== 'FY_ADMIN') {
        admin2.role = 'FY_ADMIN';
        await admin2.save();
      }
      console.log(`✓ Admin 2 verified: ${admin2Email} (role: FY_ADMIN)`);
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
