#!/usr/bin/env node
/**
 * Actualiza la categoría NEGOCIO / AGENCIA de tipo 'otros' a 'negocio'.
 * Ejecutar una sola vez después de agregar el tipo 'negocio'.
 *
 * Uso: node scripts/fix-negocio-type.js
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco').trim();
let uri = MONGODB_URI;
if (!uri.includes('/reportes-banco') && !uri.includes('reportes-banco?')) {
  uri = uri.includes('?') ? uri.replace(/\/*\?/, '/reportes-banco?') : uri.replace(/\/$/, '') + '/reportes-banco';
}

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const result = await db.collection('categories').updateMany(
      { name: /NEGOCIO/i, type: 'otros' },
      { $set: { type: 'negocio' } }
    );
    console.log(`✓ Actualizadas ${result.modifiedCount} categoría(s) a tipo 'negocio'`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
