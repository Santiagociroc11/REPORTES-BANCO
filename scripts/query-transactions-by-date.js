#!/usr/bin/env node
/**
 * Busca transacciones por createdAt.
 * Uso: node scripts/query-transactions-by-date.js [minutos]
 * Ejemplo: node scripts/query-transactions-by-date.js 30
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco').trim();
let uri = MONGODB_URI;
if (!uri.includes('/reportes-banco') && !uri.includes('reportes-banco?')) {
  uri = uri.includes('?') ? uri.replace(/\/*\?/, '/reportes-banco?') : uri.replace(/\/$/, '') + '/reportes-banco';
}
uri = uri.replace(/(?<!:)\/\//g, '/');

const MINUTOS = parseInt(process.argv[2] || '60', 10);

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('transactions');

    const now = new Date();
    const from = new Date(now.getTime() - MINUTOS * 60 * 1000);

    console.log('=== Búsqueda por createdAt ===\n');
    console.log(`Ahora:        ${now.toISOString()}`);
    console.log(`Desde (hace ${MINUTOS} min): ${from.toISOString()}\n`);

    // Query 1: createdAt en el rango
    const query = {
      createdAt: { $gte: from, $lte: now }
    };
    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('');

    const results = await col.find(query).sort({ createdAt: -1 }).toArray();

    console.log(`Transacciones encontradas: ${results.length}\n`);

    // Filtro para pegar en MongoDB Compass (Filter bar)
    const compassFilter = {
      createdAt: {
        $gte: from.toISOString(),
        $lte: now.toISOString()
      }
    };
    console.log('--- Filtro para Compass (copiar y pegar) ---\n');
    console.log(JSON.stringify(compassFilter, null, 2));
    console.log('\n');

    if (results.length > 0) {
      console.log('--- Resultados ---\n');
      for (const t of results) {
        console.log(`_id: ${t._id}`);
        console.log(`  amount: ${t.amount}`);
        console.log(`  description: ${t.description?.substring(0, 50)}...`);
        console.log(`  transaction_date: ${t.transaction_date}`);
        console.log(`  createdAt: ${t.createdAt}`);
        console.log('');
      }
    }

    // También probar: últimas 5 transacciones (cualquier fecha)
    console.log('--- Últimas 5 transacciones (todas) ---\n');
    const ultimas = await col.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    for (const t of ultimas) {
      console.log(`  ${t.createdAt?.toISOString?.() || t.createdAt} | ${t.amount} | ${t.description?.substring(0, 40)}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
