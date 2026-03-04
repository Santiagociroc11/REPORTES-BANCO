import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const CATEGORY_TYPES = ['obligatorio', 'alimentos', 'discrecional', 'familia', 'ahorro', 'negocio', 'otros'];

const categorySchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  name: { type: String, required: true },
  parent_id: { type: String, default: null },
  user_id: { type: String, required: true },
  type: { type: String, enum: [...CATEGORY_TYPES, null], default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: false });

categorySchema.virtual('id').get(function() {
  return this._id;
});

categorySchema.set('toJSON', { virtuals: true });

export const Category = mongoose.model('Category', categorySchema);
