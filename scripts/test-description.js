#!/usr/bin/env node
/**
 * Script para ver cómo se procesa una descripción y qué patrones encuentra en MongoDB.
 *
 * Uso:
 *   node scripts/test-description.js
 *   node scripts/test-description.js "Otra descripción"
 *   USER_ID=xxx node scripts/test-description.js
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const description = process.argv[2] || 'Compra en MC DONALD S con tarjeta TDeb 1155';
const transaction_type = 'compra con tarjeta';
const amount = 50000;
const userId = process.env.USER_ID || process.env.user_id;

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco').trim();
let uri = MONGODB_URI;
if (!uri.includes('/reportes-banco') && !uri.includes('reportes-banco?')) {
  uri = uri.includes('?') ? uri.replace(/\/*\?/, '/reportes-banco?') : uri.replace(/\/$/, '') + '/reportes-banco';
}
uri = uri.replace(/(?<!:)\/\//g, '/');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  console.log('=== Entrada ===');
  console.log('Descripción:', description);
  console.log('Tipo:', transaction_type);
  console.log('Monto:', amount);
  console.log('user_id:', userId || '(todos si no se especifica)');
  console.log('');

  const searchText = `${description} ${String(amount)}`;
  const words = searchText.split(/\s+/).filter((w) => w.length > 1);

  console.log('=== Palabras extraídas ===');
  console.log(words);
  console.log('');

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const coll = db.collection('reportpatterns');

    const total = await coll.countDocuments({});
    console.log('=== MongoDB ===');
    console.log('Total patrones en reportpatterns:', total);

    const baseFilter = { transaction_type };
    if (userId) baseFilter.user_id = userId;

    const totalTipo = await coll.countDocuments(baseFilter);
    console.log(`Patrones del tipo "${transaction_type}"${userId ? ` (user: ${userId})` : ''}:`, totalTipo);
    console.log('');

    if (words.length > 0) {
      const orConditions = words.flatMap((w) => {
        const re = new RegExp(escapeRegex(w), 'i');
        return [{ description: re }, { category_name: re }];
      });

      const patterns = await coll
        .find({ ...baseFilter, $or: orConditions })
        .sort({ createdAt: -1 })
        .limit(8)
        .toArray();

      console.log('=== Patrones similares encontrados ===');
      if (patterns.length === 0) {
        console.log('(ninguno)');
        const fallback = await coll.find(baseFilter).sort({ createdAt: -1 }).limit(5).toArray();
        if (fallback.length > 0) {
          console.log('\n--- Fallback: últimos del mismo tipo ---');
          fallback.forEach((p, i) => {
            console.log(`${i + 1}. "${p.description}" → ${p.category_name} | ${p.comment || '-'}`);
          });
        }
      } else {
        patterns.forEach((p, i) => {
          console.log(`${i + 1}. "${p.description}" (${p.amount})`);
          console.log(`   → categoría: ${p.category_name} | comentario: ${p.comment || '(ninguno)'}`);
        });
      }
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
