import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bank_notification_email: { type: String, default: null },
  active: { type: Boolean, default: true },
  role: { type: String, default: 'user' }
}, { timestamps: true, _id: false });

userSchema.virtual('id').get(function() {
  return this._id;
});

userSchema.set('toJSON', { virtuals: true });

export const User = mongoose.model('User', userSchema);
