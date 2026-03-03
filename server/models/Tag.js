import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const tagSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  name: { type: String, required: true },
  color: { type: String, default: null },
  user_id: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, _id: false });

tagSchema.virtual('id').get(function() {
  return this._id;
});

tagSchema.set('toJSON', { virtuals: true });

export const Tag = mongoose.model('Tag', tagSchema);
