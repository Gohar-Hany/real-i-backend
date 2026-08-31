import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role:          { type: String, enum: ['admin', 'student', 'instructor'], default: 'student' },
  avatar:        { type: String, default: null },
  enrolled_courses: [{ type: String }],               // array of course IDs
  completed_lessons: [{ type: String }],              // array of lesson IDs
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// ── Static: hash password ────────────────────────────────────
userSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, 12);
};

// ── Instance: verify password ────────────────────────────────
userSchema.methods.verifyPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password_hash);
};

// ── Transform _id → id in JSON output ────────────────────────
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password_hash;
    return ret;
  },
});

const User = mongoose.model('User', userSchema, 'users');
export default User;
