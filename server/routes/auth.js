import { Router } from 'express';
import { User } from '../models/User.js';
import { randomUUID } from 'crypto';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await User.find({ email });

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    if (user.password !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      bank_notification_email: user.bank_notification_email,
      active: user.active,
      role: user.role || 'user'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const userId = randomUUID();
    const user = await User.create({
      _id: userId,
      username,
      email,
      password,
      active: true,
      role: 'user'
    });

    res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      bank_notification_email: user.bank_notification_email,
      active: user.active,
      role: user.role
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

export default router;
