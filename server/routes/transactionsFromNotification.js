import { Router } from 'express';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { randomUUID } from 'crypto';

const router = Router();

const VALID_TRANSACTION_TYPES = ['compra con tarjeta', 'pago por pse', 'transferencia', 'pago programado', 'gasto manual'];
const VALID_TYPES = ['ingreso', 'gasto'];

/** Notificaciones de dinero recibido (p. ej. Bancolombia “Recibiste…”) — no deben crearse como movimiento registrable. */
function isIncomingMoneyNotification(body) {
  const snippet = String(body.notification_snippet ?? body.snippet ?? '').toLowerCase();
  const desc = String(body.description ?? '').toLowerCase();
  return snippet.includes('recibiste') || desc.includes('recibiste');
}

router.post('/', async (req, res) => {
  try {
    let {
      amount,
      description,
      transaction_date,
      transaction_type,
      type,
      notification_email,
      banco,
      destination_account,
    } = req.body;
    if (isIncomingMoneyNotification(req.body)) {
      return res.status(200).json({ skipped: true, reason: 'incoming_transfer_notification' });
    }
    if (!notification_email || !amount || !description || !transaction_date) {
      return res.status(400).json({ error: 'Faltan campos requeridos: notification_email, amount, description, transaction_date' });
    }
    if (!VALID_TRANSACTION_TYPES.includes(transaction_type)) {
      transaction_type = 'gasto manual';
    }
    if (!VALID_TYPES.includes(type)) {
      type = 'gasto';
    }
    const user = await User.findOne({ email: notification_email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado con ese correo de notificación' });
    }

    const amountNum = Number(amount);
    const descTrim = String(description).trim();
    const destAcc =
      destination_account != null && String(destination_account).trim() !== ''
        ? String(destination_account).trim()
        : null;
    const txDate = new Date(transaction_date);
    const from = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate(), txDate.getHours(), txDate.getMinutes(), 0, 0);
    const to = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate(), txDate.getHours(), txDate.getMinutes(), 59, 999);

    const existing = await Transaction.findOne({
      user_id: user._id,
      amount: amountNum,
      transaction_date: { $gte: from, $lte: to }
    }).lean();

    if (existing) {
      const result = { ...existing, id: existing._id };
      return res.status(200).json(result);
    }

    const transactionId = randomUUID();
    const transaction = await Transaction.create({
      _id: transactionId,
      amount: amountNum,
      description: descTrim,
      transaction_date: txDate,
      transaction_type,
      type,
      notification_email: notification_email.trim(),
      banco: banco || 'Bancolombia',
      destination_account: destAcc,
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
