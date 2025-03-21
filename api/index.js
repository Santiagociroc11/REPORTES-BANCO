import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Servicios',
  'Entretenimiento',
  'Salud',
  'Educación',
  'Hogar',
  'Otros'
];

// Setup file paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_FILE = join(__dirname, 'data', 'users.json');
const LOCK_FILE = join(__dirname, 'data', 'bot.lock');

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Check if another instance is running
async function checkLock() {
  try {
    await fs.access(LOCK_FILE);
    const stats = await fs.stat(LOCK_FILE);
    const now = new Date();
    const lockAge = (now.getTime() - stats.mtime.getTime()) / 1000;
    
    if (lockAge < 60) {
      console.error('Another bot instance is already running');
      process.exit(1);
    }
    
    await fs.unlink(LOCK_FILE);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error checking lock file:', err);
      process.exit(1);
    }
  }
}

// Create lock file
async function createLock() {
  try {
    await fs.writeFile(LOCK_FILE, process.pid.toString());
  } catch (err) {
    console.error('Error creating lock file:', err);
    process.exit(1);
  }
}

// Remove lock file on exit
async function cleanup() {
  try {
    await fs.unlink(LOCK_FILE);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error removing lock file:', err);
    }
  }
}

// Store user chat IDs
async function saveUser(chatId, username) {
  try {
    let users = {};
    try {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    users[chatId] = {
      username,
      registeredAt: new Date().toISOString()
    };

    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error saving user:', err);
  }
}

async function startBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
    return null;
  }

  await ensureDataDirectory();
  await checkLock();
  await createLock();

  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: true,
    filepath: false
  });

  // Error handling
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
    if (error.code === 'ETELEGRAM' && error.message.includes('terminated by other getUpdates')) {
      console.log('Detected conflict with another instance, shutting down...');
      cleanup().then(() => process.exit(1));
    }
  });

  bot.on('error', (error) => {
    console.error('Bot error:', error);
  });

  // Comandos disponibles
  const commands = [
    { command: 'start', description: 'Iniciar el bot' },
    { command: 'pendientes', description: 'Ver transacciones pendientes' },
    { command: 'resumen', description: 'Ver resumen de gastos' },
    { command: 'ayuda', description: 'Ver comandos disponibles' },
    { command: 'menu', description: 'Mostrar menú principal' }
  ];

  // Configurar comandos en el menú del bot
  bot.setMyCommands(commands);

  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;

    await saveUser(chatId, username);
    await mostrarMenuPrincipal(chatId);
  });

  // Handle /menu command
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    await mostrarMenuPrincipal(chatId);
  });

  // Mostrar menú principal
  async function mostrarMenuPrincipal(chatId) {
    const keyboard = {
      keyboard: [
        ['📝 Transacciones Pendientes', '📊 Resumen'],
        ['💰 Últimos Gastos', '📈 Estadísticas'],
        ['❓ Ayuda', '⚙️ Configuración']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    };

    bot.sendMessage(
      chatId,
      `🤖 *Menú Principal de FinanceTracker*\n\n` +
      `Selecciona una opción del menú:\n\n` +
      `• 📝 Ver y categorizar transacciones pendientes\n` +
      `• 📊 Ver resumen de gastos e ingresos\n` +
      `• 💰 Ver últimos movimientos\n` +
      `• 📈 Ver estadísticas detalladas\n` +
      `• ❓ Obtener ayuda\n` +
      `• ⚙️ Configurar notificaciones\n\n` +
      `Tu Chat ID es: \`${chatId}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
  }

  // Handle text messages (keyboard buttons)
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    
    switch (msg.text) {
      case '📝 Transacciones Pendientes':
        await mostrarTransaccionesPendientes(chatId);
        break;
      case '📊 Resumen':
        await mostrarResumen(chatId);
        break;
      case '💰 Últimos Gastos':
        await mostrarUltimosGastos(chatId);
        break;
      case '📈 Estadísticas':
        await mostrarEstadisticas(chatId);
        break;
      case '❓ Ayuda':
        await mostrarAyuda(chatId);
        break;
      case '⚙️ Configuración':
        await mostrarConfiguracion(chatId);
        break;
    }
  });

  // Handle callback queries
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const action = callbackQuery.data;

    switch (action) {
      case 'pendientes':
        await mostrarTransaccionesPendientes(chatId);
        break;
      case 'resumen':
        await mostrarResumen(chatId);
        break;
      case 'ultimos_gastos':
        await mostrarUltimosGastos(chatId);
        break;
      case 'estadisticas':
        await mostrarEstadisticas(chatId);
        break;
      case 'ayuda':
        await mostrarAyuda(chatId);
        break;
      case 'config':
        await mostrarConfiguracion(chatId);
        break;
      case 'menu':
        await mostrarMenuPrincipal(chatId);
        break;
      default:
        if (action.startsWith('cat_')) {
          await categorizarTransaccion(chatId, action.replace('cat_', ''));
        } else if (action.startsWith('periodo_')) {
          await cambiarPeriodoEstadisticas(chatId, action.replace('periodo_', ''));
        }
    }

    bot.answerCallbackQuery(callbackQuery.id);
  });

  // Mostrar transacciones pendientes
  async function mostrarTransaccionesPendientes(chatId) {
    try {
      const { data: config } = await supabase
        .from('telegram_config')
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      if (!config) {
        bot.sendMessage(chatId, '❌ Este chat no está configurado en la aplicación.');
        return;
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('reported', false)
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (!transactions?.length) {
        const keyboard = {
          inline_keyboard: [
            [{ text: '🔄 Actualizar', callback_data: 'pendientes' }],
            [{ text: '📊 Ver Resumen', callback_data: 'resumen' }],
            [{ text: '🏠 Menú Principal', callback_data: 'menu' }]
          ]
        };

        bot.sendMessage(
          chatId,
          '✅ No hay transacciones pendientes por categorizar.',
          { reply_markup: keyboard }
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        `📝 *Transacciones Pendientes*\n\n` +
        `Tienes ${transactions.length} transacción(es) por categorizar.\n` +
        `Te las mostraré una por una:`,
        { parse_mode: 'Markdown' }
      );

      for (const transaction of transactions) {
        const keyboard = {
          inline_keyboard: [
            ...chunk(CATEGORIES.map(cat => ({
              text: cat,
              callback_data: `cat_${transaction.id}_${cat}`
            })), 2),
            [{ text: '🏠 Volver al Menú', callback_data: 'menu' }]
          ]
        };

        await bot.sendMessage(
          chatId,
          `💰 *Transacción #${transactions.indexOf(transaction) + 1}*\n\n` +
          `💵 Monto: $${transaction.amount.toLocaleString('es-CO')}\n` +
          `🏷️ Tipo: ${transaction.transaction_type}\n` +
          `📅 Fecha: ${new Date(transaction.transaction_date).toLocaleDateString('es-CO')}\n` +
          `📝 Descripción: ${transaction.description}\n\n` +
          `Selecciona una categoría:`,
          {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          }
        );
      }
    } catch (error) {
      console.error('Error:', error);
      bot.sendMessage(chatId, '❌ Ocurrió un error.');
    }
  }

  // Mostrar últimos gastos
  async function mostrarUltimosGastos(chatId) {
    try {
      const { data: config } = await supabase
        .from('telegram_config')
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      if (!config) {
        bot.sendMessage(chatId, '❌ Este chat no está configurado en la aplicación.');
        return;
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (!transactions?.length) {
        bot.sendMessage(chatId, 'No hay transacciones recientes.');
        return;
      }

      let mensaje = `📋 *Últimas Transacciones*\n\n`;

      transactions.forEach((t, i) => {
        mensaje += `${i + 1}. ${t.type === 'gasto' ? '💸' : '💰'} ` +
          `$${t.amount.toLocaleString('es-CO')}\n` +
          `📝 ${t.description}\n` +
          `🏷️ ${t.category || 'Sin categoría'}\n` +
          `📅 ${new Date(t.transaction_date).toLocaleDateString('es-CO')}\n\n`;
      });

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Actualizar', callback_data: 'ultimos_gastos' },
            { text: '📊 Ver Resumen', callback_data: 'resumen' }
          ],
          [{ text: '🏠 Menú Principal', callback_data: 'menu' }]
        ]
      };

      bot.sendMessage(chatId, mensaje, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error:', error);
      bot.sendMessage(chatId, '❌ Ocurrió un error.');
    }
  }

  // Mostrar estadísticas
  async function mostrarEstadisticas(chatId, periodo = '30') {
    try {
      const { data: config } = await supabase
        .from('telegram_config')
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      if (!config) {
        bot.sendMessage(chatId, '❌ Este chat no está configurado en la aplicación.');
        return;
      }

      const dias = parseInt(periodo);
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - dias);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', fechaInicio.toISOString());

      if (!transactions?.length) {
        bot.sendMessage(chatId, `No hay transacciones en los últimos ${dias} días.`);
        return;
      }

      const stats = {
        totalGastos: 0,
        totalIngresos: 0,
        porCategoria: {},
        porTipo: {},
        promedioDiario: 0
      };

      transactions.forEach(t => {
        if (t.type === 'gasto') {
          stats.totalGastos += Number(t.amount);
          if (t.category) {
            stats.porCategoria[t.category] = (stats.porCategoria[t.category] || 0) + Number(t.amount);
          }
          stats.porTipo[t.transaction_type] = (stats.porTipo[t.transaction_type] || 0) + Number(t.amount);
        } else {
          stats.totalIngresos += Number(t.amount);
        }
      });

      stats.promedioDiario = stats.totalGastos / dias;

      let mensaje = `📊 *Estadísticas (${dias} días)*\n\n` +
        `💰 *Balance*\n` +
        `• Ingresos: $${stats.totalIngresos.toLocaleString('es-CO')}\n` +
        `• Gastos: $${stats.totalGastos.toLocaleString('es-CO')}\n` +
        `• Promedio diario: $${stats.promedioDiario.toLocaleString('es-CO')}\n\n` +
        `📈 *Gastos por Categoría*\n`;

      Object.entries(stats.porCategoria)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, amount]) => {
          const porcentaje = ((amount / stats.totalGastos) * 100).toFixed(1);
          mensaje += `• ${cat}: $${amount.toLocaleString('es-CO')} (${porcentaje}%)\n`;
        });

      mensaje += `\n🏷️ *Gastos por Tipo*\n`;
      Object.entries(stats.porTipo)
        .sort(([, a], [, b]) => b - a)
        .forEach(([tipo, amount]) => {
          const porcentaje = ((amount / stats.totalGastos) * 100).toFixed(1);
          mensaje += `• ${tipo}: $${amount.toLocaleString('es-CO')} (${porcentaje}%)\n`;
        });

      const keyboard = {
        inline_keyboard: [
          [
            { text: '7 días', callback_data: 'periodo_7' },
            { text: '30 días', callback_data: 'periodo_30' },
            { text: '90 días', callback_data: 'periodo_90' }
          ],
          [
            { text: '📊 Ver Resumen', callback_data: 'resumen' },
            { text: '🏠 Menú Principal', callback_data: 'menu' }
          ]
        ]
      };

      bot.sendMessage(chatId, mensaje, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error:', error);
      bot.sendMessage(chatId, '❌ Ocurrió un error.');
    }
  }

  // Cambiar periodo de estadísticas
  async function cambiarPeriodoEstadisticas(chatId, periodo) {
    await mostrarEstadisticas(chatId, periodo);
  }

  // Mostrar resumen
  async function mostrarResumen(chatId) {
    try {
      const { data: config } = await supabase
        .from('telegram_config')
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      if (!config) {
        bot.sendMessage(chatId, '❌ Este chat no está configurado en la aplicación.');
        return;
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('transaction_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!transactions?.length) {
        const keyboard = {
          inline_keyboard: [
            [{ text: '🔄 Actualizar', callback_data: 'resumen' }],
            [{ text: '🏠 Menú Principal', callback_data: 'menu' }]
          ]
        };

        bot.sendMessage(
          chatId,
          'No hay transacciones en los últimos 30 días.',
          { reply_markup: keyboard }
        );
        return;
      }

      const stats = {
        totalGastos: 0,
        totalIngresos: 0,
        pendientes: 0,
        porCategoria: {}
      };

      transactions.forEach(t => {
        if (!t.reported) stats.pendientes++;
        if (t.type === 'gasto') {
          stats.totalGastos += Number(t.amount);
          if (t.category) {
            stats.porCategoria[t.category] = (stats.porCategoria[t.category] || 0) + Number(t.amount);
          }
        } else {
          stats.totalIngresos += Number(t.amount);
        }
      });

      let mensaje = `📊 *Resumen últimos 30 días*\n\n` +
        `💰 *Balance*\n` +
        `• Ingresos: $${stats.totalIngresos.toLocaleString('es-CO')}\n` +
        `• Gastos: $${stats.totalGastos.toLocaleString('es-CO')}\n` +
        `• Balance: $${(stats.totalIngresos - stats.totalGastos).toLocaleString('es-CO')}\n\n` +
        `📝 Transacciones pendientes: ${stats.pendientes}\n\n` +
        `📈 *Principales Gastos*\n`;

      Object.entries(stats.porCategoria)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([cat, amount]) => {
          const porcentaje = ((amount / stats.totalGastos) * 100).toFixed(1);
          mensaje += `• ${cat}: $${amount.toLocaleString('es-CO')} (${porcentaje}%)\n`;
        });

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📝 Ver Pendientes', callback_data: 'pendientes' },
            { text: '📊 Ver Estadísticas', callback_data: 'estadisticas' }
          ],
          [
            { text: '🔄 Actualizar', callback_data: 'resumen' },
            { text: '🏠 Menú Principal', callback_data: 'menu' }
          ]
        ]
      };

      bot.sendMessage(chatId, mensaje, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error:', error);
      bot.sendMessage(chatId, '❌ Ocurrió un error.');
    }
  }

  // Mostrar ayuda
  async function mostrarAyuda(chatId) {
    const mensaje = `🤖 *Guía de FinanceTracker*\n\n` +
      `*Comandos Disponibles*\n` +
      `/start - Iniciar el bot\n` +
      `/menu - Mostrar menú principal\n` +
      `/pendientes - Ver transacciones pendientes\n` +
      `/resumen - Ver resumen de gastos\n` +
      `/ayuda - Ver esta ayuda\n\n` +
      `*Funciones Principales*\n` +
      `• Ver y categorizar transacciones\n` +
      `• Consultar resumen de gastos\n` +
      `• Ver estadísticas detalladas\n` +
      `• Recibir notificaciones\n\n` +
      `*Consejos*\n` +
      `• Usa el menú principal para navegar\n` +
      `• Categoriza tus gastos regularmente\n` +
      `• Revisa las estadísticas mensualmente\n\n` +
      `*¿Necesitas más ayuda?*\n` +
      `Contacta al soporte técnico desde la aplicación web.`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📝 Ver Pendientes', callback_data: 'pendientes' },
          { text: '📊 Ver Resumen', callback_data: 'resumen' }
        ],
        [{ text: '🏠 Menú Principal', callback_data: 'menu' }]
      ]
    };

    bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // Mostrar configuración
  async function mostrarConfiguracion(chatId) {
    try {
      const { data: config } = await supabase
        .from('telegram_config')
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      const mensaje = config
        ? `⚙️ *Configuración Actual*\n\n` +
          `• Estado: ${config.enabled ? '✅ Activado' : '❌ Desactivado'}\n` +
          `• Chat ID: \`${config.chat_id}\`\n\n` +
          `Para cambiar la configuración, usa la aplicación web.`
        : `⚙️ *Configuración*\n\n` +
          `No estás configurado en la aplicación.\n\n` +
          `Tu Chat ID es: \`${chatId}\`\n\n` +
          `Copia este ID y pégalo en la sección de configuración de la aplicación web.`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🏠 Volver al Menú', callback_data: 'menu' }]
        ]
      };

      bot.sendMessage(chatId, mensaje, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error:', error);
      bot.sendMessage(chatId, '❌ Ocurrió un error.');
    }
  }

  // Categorizar transacción
  async function categorizarTransaccion(chatId, data) {
    const [transactionId, category] = data.split('_');

    try {
      const { data: config } = await supabase
        .from('telegram_config')
        .select('*')
        .eq('chat_id', chatId.toString())
        .single();

      if (!config) {
        bot.sendMessage(chatId, '❌ Este chat no está configurado en la aplicación.');
        return;
      }

      const { error } = await supabase
        .from('transactions')
        .update({
          category,
          reported: true,
          comment: 'Categorizado vía Telegram'
        })
        .eq('id', transactionId);

      if (error) throw error;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📝 Ver Más Pendientes', callback_data: 'pendientes' },
            { text: '📊 Ver Resumen', callback_data: 'resumen' }
          ],
          [{ text: '🏠 Menú Principal', callback_data: 'menu' }]
        ]
      };

      bot.sendMessage(
        chatId,
        `✅ Transacción categorizada como "${category}"\n\n¿Qué más te gustaría hacer?`,
        { reply_markup: keyboard }
      );
    } catch (error) {
      console.error('Error:', error);
      bot.sendMessage(chatId, '❌ Ocurrió un error.');
    }
  }

  return bot;
}

let bot;

// Start the bot
try {
  bot = await startBot();
  if (bot) {
    console.log('Telegram bot started successfully');
  }
} catch (error) {
  console.error('Failed to start Telegram bot:', error);
}

// Endpoint for sending notifications
app.post('/api/notify', async (req, res) => {
  try {
    const { transaction_id } = req.body;

    if (!bot) {
      throw new Error('Telegram bot not initialized');
    }

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (transactionError) throw transactionError;

    const { data: configs, error: configError } = await supabase
      .from('telegram_config')
      .select('*')
      .eq('enabled', true);

    if (configError) throw configError;

    for (const config of configs) {
      try {
        const message = `💰 *Nueva Transacción*\n\n` +
          `Monto: $${transaction.amount.toLocaleString('es-CO')}\n` +
          `Tipo: ${transaction.transaction_type}\n` +
          `Descripción: ${transaction.description}\n` +
          `Fecha: ${new Date(transaction.transaction_date).toLocaleString('es-CO')}`;

        await bot.sendMessage(config.chat_id, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Categorizar Ahora', callback_data: `cat_${transaction.id}` }],
              [{ text: '🏠 Menú Principal', callback_data: 'menu' }]
            ]
          }
        });
      } catch (error) {
        console.error(`Error sending message to chat ${config.chat_id}:`, error);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al enviar notificación' });
  }
});

// Health check endpoint
app.get('/health', (_, res) => {
  res.send('OK');
});

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('Shutting down...');
  cleanup().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  cleanup().then(() => process.exit(0));
});

// Utility function to chunk arrays
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});