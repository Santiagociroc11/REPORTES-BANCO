import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const telegramConfigSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  user_id: { type: String, required: true, unique: true },
  chat_id: { type: String, required: true },
  enabled: { type: Boolean, default: true }
}, { _id: false });

telegramConfigSchema.virtual('id').get(function() {
  return this._id;
});

telegramConfigSchema.set('toJSON', { virtuals: true });

export const TelegramConfig = mongoose.model('TelegramConfig', telegramConfigSchema);
