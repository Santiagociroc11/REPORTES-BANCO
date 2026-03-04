import { Router } from 'express';
import { Category } from '../models/Category.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id es requerido' });
    }

    const categories = await Category.find({ user_id })
      .sort({ name: 1 })
      .lean();

    const result = categories.map((c) => ({ ...c, id: c._id }));
    res.json(result);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

router.post('/', async (req, res) => {
  try {
    const category = await Category.create(req.body);
    const result = category.toJSON();
    res.json({ ...result, id: result._id });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { user_id } = req.query;
    const { name, type, parent_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id es requerido' });
    }

    const update = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    if (type !== undefined) update.type = type || null;
    if (parent_id !== undefined) update.parent_id = parent_id || null;

    const result = await Category.findOneAndUpdate(
      { _id: req.params.id, user_id },
      { $set: update },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    const json = result.toJSON();
    res.json({ ...json, id: json._id });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

router.post('/merge', async (req, res) => {
  try {
    const { user_id, source_id, target_id } = req.body;
    if (!user_id || !source_id || !target_id || source_id === target_id) {
      return res.status(400).json({ error: 'user_id, source_id y target_id son requeridos (y deben ser distintos)' });
    }

    const { default: mongoose } = await import('mongoose');
    const { default: Transaction } = await import('../models/Transaction.js');
    const { default: ReportPattern } = await import('../models/ReportPattern.js');

    const allCats = await Category.find({ user_id }).select('_id parent_id').lean();
    const catMap = new Map(allCats.map((c) => [c._id, c]));

    const source = catMap.get(source_id);
    const target = catMap.get(target_id);
    if (!source) return res.status(404).json({ error: 'Categoría origen no encontrada' });
    if (!target) return res.status(404).json({ error: 'Categoría destino no encontrada' });

    const isDescendant = (childId, ancestorId) => {
      let c = catMap.get(childId);
      while (c?.parent_id) {
        if (c.parent_id === ancestorId) return true;
        c = catMap.get(c.parent_id);
      }
      return false;
    };
    if (isDescendant(target_id, source_id)) {
      return res.status(400).json({ error: 'La categoría destino no puede estar dentro de la origen' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Transaction.updateMany(
        { user_id, category_id: source_id },
        { $set: { category_id: target_id } },
        { session }
      );
      await ReportPattern.updateMany(
        { user_id, category_id: source_id },
        { $set: { category_id: target_id } },
        { session }
      );
      await Category.updateMany(
        { user_id, parent_id: source_id },
        { $set: { parent_id: target_id } },
        { session }
      );
      await Category.findOneAndDelete({ _id: source_id, user_id }, { session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    res.json({ success: true, merged: true });
  } catch (error) {
    console.error('Merge categories error:', error);
    res.status(500).json({ error: error.message || 'Error al fusionar categorías' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { user_id } = req.query;
    const result = await Category.findOneAndDelete({
      _id: req.params.id,
      user_id
    });
    if (!result) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

export default router;
