#!/usr/bin/env node
/**
 * Elimina transacciones creadas desde una hora específica (Colombia UTC-5).
 * Uso: node scripts/delete-transactions-since.js 16 14
 *      (16 = hora, 14 = minutos en formato 24h Colombia)
 * Ejemplo: 4:14 PM = 16:14
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco').trim();
let uri = MONGODB_URI;
if (!uri.includes('/reportes-banco') && !uri.includes('reportes-banco?')) {
  uri = uri.includes('?') ? uri.replace(/\/*\?/, '/reportes-banco?') : uri.replace(/\/$/, '') + '/reportes-banco';
}
uri = uri.replace(/(?<!:)\/\//g, '/');

// 4:14 PM Colombia = 16:14
const HORA_COL = parseInt(process.argv[2] || '16', 10);
const MIN_COL = parseInt(process.argv[3] || '14', 10);

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('transactions');
    const tagsCol = db.collection('transactiontags');

    // Hora Colombia (UTC-5) -> UTC = hora + 5
    const hoy = new Date();
    const desde = new Date(Date.UTC(
      hoy.getUTCFullYear(),
      hoy.getUTCMonth(),
      hoy.getUTCDate(),
      HORA_COL + 5,
      MIN_COL,
      0,
      0
    ));

    console.log(`Eliminando transacciones creadas desde ${HORA_COL}:${String(MIN_COL).padStart(2, '0')} Colombia (${desde.toISOString()} UTC)\n`);

    const toDelete = await col.find({ createdAt: { $gte: desde } }).toArray();
    console.log(`Transacciones a eliminar: ${toDelete.length}`);

    if (toDelete.length === 0) {
      console.log('No hay transacciones que eliminar.');
      return;
    }

    const ids = toDelete.map((t) => t._id);

    await tagsCol.deleteMany({ transaction_id: { $in: ids } });
    const result = await col.deleteMany({ _id: { $in: ids } });

    console.log(`Eliminadas: ${result.deletedCount} transacciones`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
