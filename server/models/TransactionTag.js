import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const transactionTagSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  transaction_id: { type: String, required: true },
  tag_id: { type: String, required: true }
}, { _id: false });

export const TransactionTag = mongoose.model('TransactionTag', transactionTagSchema);
