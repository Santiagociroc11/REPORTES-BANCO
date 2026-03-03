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

const STOP_WORDS = new Set([
  'en', 'con', 'de', 'la', 'el', 'a', 'por', 'al', 'del', 'los', 'las', 'un', 'una', 'su', 'sus',
  'compra', 'pago', 'transferencia', 'programado', 'manual', 'tarjeta', 'tdeb', 't.deb', 'debit', 'credito',
  'desde', 'hacia', 'cuenta', 'bancolombia', 'nequi', 'daviplata', 'pse', 'factura'
]);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDistinctiveWords(desc) {
  const words = desc.split(/\s+/).filter((w) => w.length >= 2);
  return words.filter((w) => {
    const lower = w.toLowerCase();
    if (STOP_WORDS.has(lower)) return false;
    if (/^\d{4}$/.test(w)) return false;
    if (/^\d+[,.]?\d*$/.test(w)) return false;
    return true;
  });
}

async function main() {
  console.log('=== Entrada ===');
  console.log('Descripción:', description);
  console.log('Tipo:', transaction_type);
  console.log('Monto:', amount);
  console.log('user_id:', userId || '(todos si no se especifica)');
  console.log('');

  const distinctive = getDistinctiveWords(description);
  console.log('=== Palabras distintivas (sin stop words) ===');
  console.log(distinctive);
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

    if (distinctive.length > 0) {
      let patterns = [];

      if (distinctive.length >= 2) {
        const andConditions = distinctive.slice(0, 5).map((w) => {
          const re = new RegExp(escapeRegex(w), 'i');
          return { $or: [{ description: re }, { category_name: re }] };
        });
        patterns = await coll.find({ ...baseFilter, $and: andConditions }).sort({ createdAt: -1 }).limit(10).toArray();
        if (patterns.length > 0) console.log('(búsqueda $and - todas las palabras distintivas)');
      }

      if (patterns.length === 0 && distinctive.length >= 1) {
        const orConditions = distinctive.slice(0, 4).flatMap((w) => {
          const re = new RegExp(escapeRegex(w), 'i');
          return [{ description: re }, { category_name: re }];
        });
        patterns = await coll.find({ ...baseFilter, $or: orConditions }).sort({ createdAt: -1 }).limit(10).toArray();
        if (patterns.length > 0) console.log('(búsqueda $or - alguna palabra distintiva)');
      }

      if (patterns.length === 0) {
        patterns = await coll.find(baseFilter).sort({ createdAt: -1 }).limit(5).toArray();
        console.log('(fallback: últimos del mismo tipo)');
      }

      console.log('\n=== Patrones similares encontrados ===');
      if (patterns.length === 0) {
        console.log('(ninguno)');
      } else {
        patterns.forEach((p, i) => {
          console.log(`${i + 1}. "${p.description}" (${p.amount})`);
          console.log(`   → categoría: ${p.category_name} | comentario: ${p.comment || '-'}`);
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
