#!/usr/bin/env node
/**
 * Busca transacciones creadas por notificaciones que en realidad eran “recepciones”
 * (p. ej. correos con “Recibiste”). En la BD solo está lo normalizado: no hay JSON del correo.
 *
 * Criterios:
 *   - Por defecto: notification_email definido Y descripción contiene “recibiste” (sin importar mayúsculas).
 *   --heuristic: además incluye type=ingreso, transaction_type=transferencia y notification_email
 *     (puede coincidir con ingresos legítimos: revisa el listado en dry-run).
 *
 * Uso:
 *   node scripts/delete-incoming-notification-mistakes.js
 *   node scripts/delete-incoming-notification-mistakes.js --apply
 *   node scripts/delete-incoming-notification-mistakes.js --apply --user-id=UUID_DEL_USUARIO
 *   node scripts/delete-incoming-notification-mistakes.js --apply --heuristic
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco').trim();
let uri = MONGODB_URI;
if (!uri.includes('/reportes-banco') && !uri.includes('reportes-banco?')) {
  uri = uri.includes('?') ? uri.replace(/\/*\?/, '/reportes-banco?') : uri.replace(/\/$/, '') + '/reportes-banco';
}
uri = uri.replace(/(?<!:)\/\//g, '/');

const APPLY = process.argv.includes('--apply');
const HEURISTIC = process.argv.includes('--heuristic');
const userIdArg = process.argv.find((a) => a.startsWith('--user-id='));
const USER_ID = userIdArg ? userIdArg.split('=')[1]?.trim() : null;

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('transactions');
    const tagsCol = db.collection('transactiontags');

    const hasNotif = {
      notification_email: { $exists: true, $nin: [null, ''] },
    };

    const byRecibiste = {
      ...hasNotif,
      description: { $regex: 'recibiste', $options: 'i' },
    };

    const heuristic = {
      ...hasNotif,
      type: 'ingreso',
      transaction_type: 'transferencia',
    };

    const baseFilter = USER_ID ? { user_id: USER_ID } : {};

    const orClauses = [{ ...baseFilter, ...byRecibiste }];
    if (HEURISTIC) {
      orClauses.push({ ...baseFilter, ...heuristic });
    }

    const filter = orClauses.length === 1 ? orClauses[0] : { $or: orClauses.map((c) => ({ ...c })) };

    const toDelete = await col.find(filter).sort({ transaction_date: -1 }).toArray();

    console.log(
      APPLY ? 'Modo: APLICAR borrado' : 'Modo: simulación (sin borrar). Usa --apply para eliminar.',
    );
    if (USER_ID) console.log('Filtro user_id:', USER_ID);
    console.log('Heurística ingreso+transferencia:', HEURISTIC ? 'sí' : 'no');
    console.log(`Candidatos: ${toDelete.length}\n`);

    for (const t of toDelete.slice(0, 50)) {
      console.log(
        `- ${t._id} | ${t.transaction_date?.toISOString?.() || t.transaction_date} | ${t.type} | ${t.amount} | ${(t.description || '').slice(0, 80)}`,
      );
    }
    if (toDelete.length > 50) {
      console.log(`... y ${toDelete.length - 50} más`);
    }

    if (!APPLY || toDelete.length === 0) {
      if (!APPLY && toDelete.length > 0) {
        console.log('\nEjecuta de nuevo con --apply después de revisar la lista.');
      }
      return;
    }

    const ids = toDelete.map((t) => t._id);
    await tagsCol.deleteMany({ transaction_id: { $in: ids } });
    const result = await col.deleteMany({ _id: { $in: ids } });
    console.log(`\nEliminadas: ${result.deletedCount} transacciones (y tags asociados).`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
