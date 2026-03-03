import { Router } from 'express';
import { Tag } from '../models/Tag.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id es requerido' });
    }

    const tags = await Tag.find({ user_id })
      .sort({ name: 1 })
      .lean();

    const result = tags.map((t) => ({ ...t, id: t._id }));
    res.json(result);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Error al obtener etiquetas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const tag = await Tag.create(req.body);
    const result = tag.toJSON();
    res.json({ ...result, id: result._id });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Error al crear etiqueta' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await Tag.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Error al eliminar etiqueta' });
  }
});

export default router;
