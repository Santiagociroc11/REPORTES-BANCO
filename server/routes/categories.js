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
