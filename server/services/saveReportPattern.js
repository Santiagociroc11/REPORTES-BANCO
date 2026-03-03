import { ReportPattern } from '../models/ReportPattern.js';
import { Category } from '../models/Category.js';

export async function saveReportPattern({ transaction, userId }) {
  if (!transaction || !userId) return;

  let categoryName = 'Sin categoría';
  if (transaction.category_id) {
    const cat = await Category.findById(transaction.category_id).lean();
    if (cat) categoryName = cat.name;
  }

  await ReportPattern.findOneAndUpdate(
    { transaction_id: transaction._id },
    {
      user_id: userId,
      transaction_id: transaction._id,
      description: transaction.description,
      amount: transaction.amount,
      transaction_type: transaction.transaction_type,
      category_id: transaction.category_id || '',
      category_name: categoryName,
      comment: transaction.comment || ''
    },
    { upsert: true, new: true }
  );
}
