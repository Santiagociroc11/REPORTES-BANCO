#!/usr/bin/env node
/**
 * Pobla reportpatterns desde transacciones ya reportadas.
 * Las transacciones con reported: true y category_id se copian como patrones.
 *
 * Uso: node scripts/seed-report-patterns.js
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco').trim();
let uri = MONGODB_URI;
if (!uri.includes('/reportes-banco') && !uri.includes('reportes-banco?')) {
  uri = uri.includes('?') ? uri.replace(/\/*\?/, '/reportes-banco?') : uri.replace(/\/$/, '') + '/reportes-banco';
}
uri = uri.replace(/(?<!:)\/\//g, '/');

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const transactions = db.collection('transactions');
    const categories = db.collection('categories');
    const reportpatterns = db.collection('reportpatterns');

    const reported = await transactions
      .find({ reported: true, category_id: { $exists: true, $ne: null, $ne: '' } })
      .toArray();

    console.log(`Transacciones reportadas encontradas: ${reported.length}`);

    const catMap = new Map();
    const cats = await categories.find({}).toArray();
    for (const c of cats) catMap.set(String(c._id), c.name);

    const ops = reported.map((tx) => {
      const categoryName = catMap.get(String(tx.category_id)) || 'Sin categoría';
      return {
        updateOne: {
          filter: { transaction_id: tx._id },
          update: {
            $set: {
              user_id: tx.user_id,
              transaction_id: tx._id,
              description: tx.description,
              amount: tx.amount,
              transaction_type: tx.transaction_type,
              category_id: tx.category_id || '',
              category_name: categoryName,
              comment: tx.comment || '',
              updatedAt: new Date()
            },
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      };
    });

    const result = await reportpatterns.bulkWrite(ops, { ordered: false });
    console.log(`Insertados: ${result.upsertedCount || 0}`);
    console.log(`Actualizados: ${result.modifiedCount || 0}`);
    console.log(`Total en reportpatterns: ${await reportpatterns.countDocuments()}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
