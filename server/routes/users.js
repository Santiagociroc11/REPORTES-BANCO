import { Router } from 'express';
import { User } from '../models/User.js';

const router = Router();

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      bank_notification_email: user.bank_notification_email,
      active: user.active,
      role: user.role
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { email, bank_notification_email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { email, bank_notification_email },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Este correo de notificaciones bancarias ya está registrado' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

export default router;
