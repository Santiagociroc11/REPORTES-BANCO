import mongoose from 'mongoose';

const reportPatternSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  transaction_id: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  transaction_type: { type: String, required: true },
  category_id: { type: String, required: true },
  category_name: { type: String, required: true },
  comment: { type: String, default: '' }
}, { timestamps: true });

reportPatternSchema.index({ user_id: 1 });
reportPatternSchema.index({ transaction_id: 1 }, { unique: true });

export const ReportPattern = mongoose.model('ReportPattern', reportPatternSchema);
