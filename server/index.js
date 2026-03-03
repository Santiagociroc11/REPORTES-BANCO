import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import transactionsRoutes from './routes/transactions.js';
import categoriesRoutes from './routes/categories.js';
import tagsRoutes from './routes/tags.js';
import telegramConfigRoutes from './routes/telegramConfig.js';

let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco';
if (!MONGODB_URI.includes('/reportes-banco')) {
  MONGODB_URI = MONGODB_URI.includes('?') ? MONGODB_URI.replace('?', '/reportes-banco?') : MONGODB_URI + '/reportes-banco';
}
const PORT = process.env.PORT || 3000;

console.log('[Server] Iniciando...');
console.log('[Server] Puerto:', PORT);
console.log('[Server] MongoDB:', MONGODB_URI.replace(/:[^:@]+@/, ':****@') || 'no configurado');
console.log('[Server] Conectando a MongoDB...');

const app = express();

app.use(cors());
app.use(express.json());

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/telegram-config', telegramConfigRoutes);

// Frontend estático (monolito)
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (_, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[Server] ✓ Conectado a MongoDB');
    app.listen(PORT, () => {
      console.log('[Server] ✓ Servidor listo en http://localhost:' + PORT);
      console.log('[Server] API: /api/auth, /api/transactions, /api/categories, etc.');
    });
  })
  .catch((err) => {
    console.error('[Server] ✗ Error conectando a MongoDB:', err.message);
    process.exit(1);
  });
