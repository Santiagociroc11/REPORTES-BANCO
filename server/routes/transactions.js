import { Router } from 'express';
import { Transaction } from '../models/Transaction.js';
import { TransactionTag } from '../models/TransactionTag.js';
import { Category } from '../models/Category.js';
import { randomUUID } from 'crypto';
import { suggestReport } from '../services/suggestReportService.js';
import { saveReportPattern } from '../services/saveReportPattern.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id es requerido' });
    }

    const transactions = await Transaction.find({ user_id })
      .sort({ transaction_date: -1 })
      .lean();

    const transactionsWithCategories = await Promise.all(
      transactions.map(async (t) => {
        let categories = null;
        if (t.category_id) {
          const cat = await Category.findById(t.category_id).lean();
          if (cat) {
            categories = { id: cat._id, name: cat.name, parent_id: cat.parent_id };
          }
        }
        const { _id, ...rest } = t;
        return { ...rest, id: _id, categories };
      })
    );

    res.json(transactionsWithCategories);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Error al obtener transacciones' });
  }
});

router.post('/', async (req, res) => {
  try {
    const transactionId = randomUUID();
    const transaction = await Transaction.create({
      _id: transactionId,
      ...req.body
    });

    const result = transaction.toJSON();
    res.json({ ...result, id: result._id });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Error al crear transacción' });
  }
});

router.get('/search-history', async (req, res) => {
  try {
    const { user_id, q } = req.query;
    if (!user_id || !q || String(q).trim().length < 2) {
      return res.status(400).json({ error: 'user_id y q (mínimo 2 caracteres) son requeridos' });
    }

    const term = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(term, 'i');

    const categories = await Category.find({ user_id }).select('_id name').lean();
    const categoryNames = Object.fromEntries(categories.map((c) => [String(c._id), c.name]));
    const matchingCatIds = categories.filter((c) => re.test(c.name)).map((c) => String(c._id));

    const transactions = await Transaction.find({
      user_id,
      reported: true,
      $or: [{ description: re }, { category_id: { $in: matchingCatIds } }]
    })
      .sort({ transaction_date: -1 })
      .limit(20)
      .select('_id description amount transaction_date category_id comment')
      .lean();

    const result = transactions.map((t) => ({
      id: t._id,
      description: t.description,
      amount: t.amount,
      transaction_date: t.transaction_date,
      category_id: t.category_id || null,
      category_name: categoryNames[String(t.category_id)] || null,
      comment: t.comment || ''
    }));

    res.json(result);
  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({ error: 'Error al buscar en historial' });
  }
});

router.post('/suggest-report', async (req, res) => {
  try {
    const { transaction_id, user_id } = req.body;
    if (!transaction_id || !user_id) {
      return res.status(400).json({ error: 'transaction_id y user_id son requeridos' });
    }

    const transaction = await Transaction.findById(transaction_id).lean();
    if (!transaction) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }
    if (String(transaction.user_id) !== String(user_id)) {
      return res.status(403).json({ error: 'Transacción no pertenece al usuario' });
    }

    const suggestion = await suggestReport({
      transaction: {
        description: transaction.description,
        amount: transaction.amount,
        transaction_type: transaction.transaction_type
      },
      userId: user_id
    });

    res.json(suggestion);
  } catch (error) {
    console.error('Suggest report error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener sugerencia' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!transaction) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    if (req.body.reported === true) {
      try {
        await saveReportPattern({
          transaction: transaction.toObject(),
          userId: transaction.user_id
        });
      } catch (err) {
        console.error('Error guardando patrón de reporte:', err);
      }
    }

    const result = transaction.toJSON();
    res.json({ ...result, id: result._id });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Error al actualizar transacción' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await Transaction.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }
    await TransactionTag.deleteMany({ transaction_id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Error al eliminar transacción' });
  }
});

router.post('/:id/tags', async (req, res) => {
  try {
    const { tag_ids } = req.body;
    await TransactionTag.deleteMany({ transaction_id: req.params.id });

    if (tag_ids && tag_ids.length > 0) {
      const associations = tag_ids.map((tag_id) => ({
        transaction_id: req.params.id,
        tag_id
      }));
      await TransactionTag.insertMany(associations);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update transaction tags error:', error);
    res.status(500).json({ error: 'Error al actualizar etiquetas' });
  }
});

export default router;
