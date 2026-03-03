#!/usr/bin/env node
/**
 * Script de migración: Supabase → MongoDB
 * 
 * Uso:
 *   node scripts/migrate-supabase-to-mongo.js
 *   node scripts/migrate-supabase-to-mongo.js --dry-run
 *   node scripts/migrate-supabase-to-mongo.js --clear
 * 
 * Variables de entorno requeridas:
 *   SUPABASE_URL      - URL del proyecto Supabase (ej: https://xxx.supabase.co)
 *   SUPABASE_ANON_KEY - Clave anónima de Supabase
 *   MONGODB_URI       - Cadena de conexión MongoDB (ej: mongodb://localhost:27017/reportes-banco)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../server/models/User.js';
import { Transaction } from '../server/models/Transaction.js';
import { Category } from '../server/models/Category.js';
import { Tag } from '../server/models/Tag.js';
import { TransactionTag } from '../server/models/TransactionTag.js';
import { TelegramConfig } from '../server/models/TelegramConfig.js';

const DRY_RUN = process.argv.includes('--dry-run');
const CLEAR_FIRST = process.argv.includes('--clear');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL y SUPABASE_ANON_KEY');
  console.error('   Añádelas a .env o usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function fetchFromSupabase(table) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?select=*`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function toMongoDoc(doc, idField = 'id') {
  const { [idField]: id, ...rest } = doc;
  return id ? { _id: id, ...rest } : rest;
}

async function migrate() {
  console.log('🚀 Migración Supabase → MongoDB\n');
  if (DRY_RUN) console.log('   [MODO DRY-RUN - no se escribirá en MongoDB]\n');

  // 1. Conectar a MongoDB
  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado a MongoDB\n');
  }

  try {
    // 2. Opcional: limpiar colecciones
    if (CLEAR_FIRST && !DRY_RUN) {
      console.log('🗑️  Limpiando colecciones existentes...');
      await TransactionTag.deleteMany({});
      await Transaction.deleteMany({});
      await TelegramConfig.deleteMany({});
      await Tag.deleteMany({});
      await Category.deleteMany({});
      await User.deleteMany({});
      console.log('✓ Colecciones limpiadas\n');
    }

    // 3. Migrar usuarios
    console.log('📥 Extrayendo usuarios de Supabase...');
    const users = await fetchFromSupabase('users');
    console.log(`   Encontrados: ${users.length}`);

    if (!DRY_RUN && users.length > 0) {
      const userDocs = users.map(u => toMongoDoc(u));
      await User.insertMany(userDocs);
      console.log('✓ Usuarios migrados\n');
    } else {
      console.log('   [dry-run] Usuarios listos para migrar\n');
    }

    // 4. Migrar categorías
    console.log('📥 Extrayendo categorías de Supabase...');
    const categories = await fetchFromSupabase('categories');
    console.log(`   Encontradas: ${categories.length}`);

    if (!DRY_RUN && categories.length > 0) {
      const categoryDocs = categories.map(c => toMongoDoc(c));
      await Category.insertMany(categoryDocs);
      console.log('✓ Categorías migradas\n');
    } else {
      console.log('   [dry-run] Categorías listas para migrar\n');
    }

    // 5. Migrar tags
    console.log('📥 Extrayendo tags de Supabase...');
    const tags = await fetchFromSupabase('tags');
    console.log(`   Encontrados: ${tags.length}`);

    if (!DRY_RUN && tags.length > 0) {
      const tagDocs = tags.map(t => toMongoDoc(t));
      await Tag.insertMany(tagDocs);
      console.log('✓ Tags migrados\n');
    } else {
      console.log('   [dry-run] Tags listos para migrar\n');
    }

    // 6. Migrar telegram_config
    console.log('📥 Extrayendo configuración de Telegram...');
    let telegramConfigs = [];
    try {
      telegramConfigs = await fetchFromSupabase('telegram_config');
    } catch (e) {
      console.log('   (tabla telegram_config no existe o vacía)');
    }
    console.log(`   Encontradas: ${telegramConfigs.length}`);

    if (!DRY_RUN && telegramConfigs.length > 0) {
      const tgDocs = telegramConfigs.map(t => toMongoDoc(t));
      await TelegramConfig.insertMany(tgDocs);
      console.log('✓ Configuración Telegram migrada\n');
    } else if (telegramConfigs.length > 0) {
      console.log('   [dry-run] Config Telegram lista para migrar\n');
    }

    // 7. Migrar transacciones
    console.log('📥 Extrayendo transacciones de Supabase...');
    const transactions = await fetchFromSupabase('transactions');
    console.log(`   Encontradas: ${transactions.length}`);

    if (!DRY_RUN && transactions.length > 0) {
      const txDocs = transactions.map(t => {
        const doc = toMongoDoc(t);
        if (doc.transaction_date && typeof doc.transaction_date === 'string') {
          doc.transaction_date = new Date(doc.transaction_date);
        }
        return doc;
      });
      await Transaction.insertMany(txDocs);
      console.log('✓ Transacciones migradas\n');
    } else if (transactions.length > 0) {
      console.log('   [dry-run] Transacciones listas para migrar\n');
    }

    // 8. Migrar transaction_tags
    console.log('📥 Extrayendo relación transacción-etiquetas...');
    let transactionTags = [];
    try {
      transactionTags = await fetchFromSupabase('transaction_tags');
    } catch (e) {
      console.log('   (tabla transaction_tags no existe o vacía)');
    }
    console.log(`   Encontradas: ${transactionTags.length}`);

    if (!DRY_RUN && transactionTags.length > 0) {
      const ttDocs = transactionTags.map((tt) => {
        const { id, ...rest } = tt;
        return { _id: id || `tt-${rest.transaction_id}-${rest.tag_id}`, ...rest };
      });
      await TransactionTag.insertMany(ttDocs);
      console.log('✓ Relaciones transacción-etiquetas migradas\n');
    } else if (transactionTags.length > 0) {
      console.log('   [dry-run] Transaction_tags listas para migrar\n');
    }

    console.log('✅ Migración completada correctamente');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error.message);
    if (error.response) {
      console.error('   Respuesta:', await error.response.text());
    }
    process.exit(1);
  } finally {
    if (!DRY_RUN) {
      await mongoose.disconnect();
      console.log('\n✓ Desconectado de MongoDB');
    }
  }
}

migrate();
