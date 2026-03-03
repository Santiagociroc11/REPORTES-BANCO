import { Router } from 'express';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { amount, description, transaction_date, transaction_type, type, notification_email, banco } = req.body;
    if (!notification_email || !amount || !description || !transaction_date || !transaction_type || !type) {
      return res.status(400).json({ error: 'Faltan campos requeridos: notification_email, amount, description, transaction_date, transaction_type, type' });
    }
    const user = await User.findOne({ email: notification_email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado con ese correo de notificación' });
    }
    const transactionId = randomUUID();
    const transaction = await Transaction.create({
      _id: transactionId,
      amount: Number(amount),
      description: String(description).trim(),
      transaction_date: new Date(transaction_date),
      transaction_type,
      type,
      notification_email: notification_email.trim(),
      banco: banco || 'Bancolombia',
      user_id: user._id,
      reported: false,
      category_id: null,
      comment: null
    });
    const result = transaction.toJSON();
    res.status(201).json({ ...result, id: result._id });
  } catch (error) {
    console.error('Create transaction from notification error:', error);
    res.status(500).json({ error: 'Error al crear transacción' });
  }
});

export default router;
