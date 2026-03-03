#!/usr/bin/env node
/**
 * Script de migración: Supabase → MongoDB
 * Usa el driver nativo de MongoDB para mayor compatibilidad con conexiones remotas.
 *
 * Uso:
 *   node scripts/migrate-supabase-to-mongo.js
 *   node scripts/migrate-supabase-to-mongo.js --dry-run
 *   node scripts/migrate-supabase-to-mongo.js --clear
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DRY_RUN = process.argv.includes('--dry-run');
const CLEAR_FIRST = process.argv.includes('--clear');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Faltan variables: SUPABASE_URL y SUPABASE_ANON_KEY');
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
  if (!response.ok) throw new Error(`Supabase ${table}: ${response.status}`);
  return response.json();
}

function toMongoDoc(doc, idField = 'id') {
  const { [idField]: id, ...rest } = doc;
  return id ? { _id: id, ...rest } : rest;
}

async function migrate() {
  console.log('🚀 Migración Supabase → MongoDB\n');
  if (DRY_RUN) console.log('   [MODO DRY-RUN]\n');

  let client;
  if (!DRY_RUN) {
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    await client.connect();
    console.log('✓ Conectado a MongoDB\n');
  }

  try {
    const db = client?.db('reportes-banco');

    if (CLEAR_FIRST && !DRY_RUN) {
      console.log('🗑️  Limpiando colecciones...');
      const collections = ['transactiontags', 'transactions', 'telegramconfigs', 'tags', 'categories', 'users'];
      for (const name of collections) {
        try {
          await db.collection(name).deleteMany({});
        } catch (_) {}
      }
      console.log('✓ Limpiado\n');
    }

    // Usuarios
    console.log('📥 Extrayendo usuarios...');
    const users = await fetchFromSupabase('users');
    console.log(`   Encontrados: ${users.length}`);
    if (!DRY_RUN && users.length > 0) {
      const docs = users.map(u => toMongoDoc(u));
      await db.collection('users').insertMany(docs);
      console.log('✓ Usuarios migrados\n');
    } else if (users.length > 0) console.log('   [dry-run]\n');

    // Categorías
    console.log('📥 Extrayendo categorías...');
    const categories = await fetchFromSupabase('categories');
    console.log(`   Encontradas: ${categories.length}`);
    if (!DRY_RUN && categories.length > 0) {
      const docs = categories.map(c => toMongoDoc(c));
      await db.collection('categories').insertMany(docs);
      console.log('✓ Categorías migradas\n');
    } else if (categories.length > 0) console.log('   [dry-run]\n');

    // Tags
    console.log('📥 Extrayendo tags...');
    const tags = await fetchFromSupabase('tags');
    console.log(`   Encontrados: ${tags.length}`);
    if (!DRY_RUN && tags.length > 0) {
      const docs = tags.map(t => toMongoDoc(t));
      await db.collection('tags').insertMany(docs);
      console.log('✓ Tags migrados\n');
    } else if (tags.length > 0) console.log('   [dry-run]\n');

    // Telegram config
    console.log('📥 Extrayendo telegram_config...');
    let telegramConfigs = [];
    try {
      telegramConfigs = await fetchFromSupabase('telegram_config');
    } catch (_) {}
    console.log(`   Encontradas: ${telegramConfigs.length}`);
    if (!DRY_RUN && telegramConfigs.length > 0) {
      const docs = telegramConfigs.map(t => toMongoDoc(t));
      await db.collection('telegramconfigs').insertMany(docs);
      console.log('✓ Telegram config migrada\n');
    } else if (telegramConfigs.length > 0) console.log('   [dry-run]\n');

    // Transacciones
    console.log('📥 Extrayendo transacciones...');
    const transactions = await fetchFromSupabase('transactions');
    console.log(`   Encontradas: ${transactions.length}`);
    if (!DRY_RUN && transactions.length > 0) {
      const docs = transactions.map(t => {
        const doc = toMongoDoc(t);
        if (doc.transaction_date && typeof doc.transaction_date === 'string') {
          doc.transaction_date = new Date(doc.transaction_date);
        }
        return doc;
      });
      // Insertar en lotes de 100
      const BATCH = 100;
      for (let i = 0; i < docs.length; i += BATCH) {
        const batch = docs.slice(i, i + BATCH);
        await db.collection('transactions').insertMany(batch);
        process.stdout.write(`   ${Math.min(i + BATCH, docs.length)}/${docs.length}\r`);
      }
      console.log('✓ Transacciones migradas\n');
    } else if (transactions.length > 0) console.log('   [dry-run]\n');

    // Transaction tags
    console.log('📥 Extrayendo transaction_tags...');
    let transactionTags = [];
    try {
      transactionTags = await fetchFromSupabase('transaction_tags');
    } catch (_) {}
    console.log(`   Encontradas: ${transactionTags.length}`);
    if (!DRY_RUN && transactionTags.length > 0) {
      const docs = transactionTags.map(tt => {
        const { id, ...rest } = tt;
        return { _id: id || `tt-${rest.transaction_id}-${rest.tag_id}`, ...rest };
      });
      await db.collection('transactiontags').insertMany(docs);
      console.log('✓ Transaction_tags migradas\n');
    } else if (transactionTags.length > 0) console.log('   [dry-run]\n');

    console.log('✅ Migración completada correctamente');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✓ Desconectado de MongoDB');
    }
  }
}

migrate();
