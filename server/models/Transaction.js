import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const transactionSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  transaction_date: { type: Date, required: true },
  reported: { type: Boolean, default: false },
  category_id: { type: String, default: null },
  comment: { type: String, default: null },
  transaction_type: {
    type: String,
    enum: ['compra con tarjeta', 'pago por pse', 'transferencia', 'pago programado', 'gasto manual'],
    required: true
  },
  type: { type: String, enum: ['ingreso', 'gasto'], required: true },
  user_id: { type: String, required: true },
  banco: { type: String, default: 'Bancolombia' },
  notification_email: { type: String, default: null }
}, { timestamps: true, _id: false });

transactionSchema.virtual('id').get(function() {
  return this._id;
});

transactionSchema.set('toJSON', { virtuals: true });

export const Transaction = mongoose.model('Transaction', transactionSchema);
