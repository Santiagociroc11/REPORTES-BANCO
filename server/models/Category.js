import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const categorySchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  name: { type: String, required: true },
  parent_id: { type: String, default: null },
  user_id: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: false });

categorySchema.virtual('id').get(function() {
  return this._id;
});

categorySchema.set('toJSON', { virtuals: true });

export const Category = mongoose.model('Category', categorySchema);
