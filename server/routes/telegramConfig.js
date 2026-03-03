import { Router } from 'express';
import { TelegramConfig } from '../models/TelegramConfig.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id es requerido' });
    }

    const configs = await TelegramConfig.find({ user_id }).lean();
    const result = configs.map((c) => ({ ...c, id: c._id }));
    res.json(result);
  } catch (error) {
    console.error('Get telegram config error:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { user_id, chat_id, enabled, id } = req.body;

    const config = await TelegramConfig.findOneAndUpdate(
      { user_id },
      { chat_id, enabled },
      { new: true, upsert: true }
    );

    const result = config.toJSON();
    res.json({ ...result, id: result._id });
  } catch (error) {
    console.error('Upsert telegram config error:', error);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

export default router;
