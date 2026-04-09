#!/usr/bin/env node
/**
 * Usa un export CSV de Gmail (como File.csv) y elimina de MongoDB las transacciones
 * que corresponden a notificaciones de INGRESO (snippet con "recibiste" / "Recibiste").
 *
 * Cruza por: email del destinatario (columna To → user_id), monto parseado del snippet
 * y hora cercana a internalDate (ms epoch del mensaje).
 *
 * Uso:
 *   node scripts/delete-from-gmail-ingresos-csv.js
 *   node scripts/delete-from-gmail-ingresos-csv.js path/al/archivo.csv
 *   node scripts/delete-from-gmail-ingresos-csv.js --apply
 *   node scripts/delete-from-gmail-ingresos-csv.js File.csv --apply --window-minutes=3
 *   node scripts/delete-from-gmail-ingresos-csv.js --apply --force-multiple   (si hay >1 coincidencia, borra todas)
 *   node scripts/delete-from-gmail-ingresos-csv.js --apply --match-same-day
 *     (si no hay match por ventana de minutos, prueba mismo monto + mismo día en America/Bogota)
 *
 * Por defecto solo lista simulación; --apply ejecuta borrado (y transactiontags).
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APPLY = process.argv.includes('--apply');
const FORCE_MULTIPLE = process.argv.includes('--force-multiple');
const MATCH_SAME_DAY = process.argv.includes('--match-same-day');
const windowArg = process.argv.find((a) => a.startsWith('--window-minutes='));
const WINDOW_MS = (windowArg ? parseInt(windowArg.split('=')[1], 10) : 15) * 60 * 1000;

/** Día calendario en America/Bogota YYYYMMDD para comparar fechas aunque la hora en BD difiera de Gmail. */
function calendarKeyBogota(d) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

const nonFlags = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const CSV_PATH = path.resolve(
  nonFlags[0] || path.join(__dirname, '..', 'File.csv'),
);

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco').trim();
let uri = MONGODB_URI;
if (!uri.includes('/reportes-banco') && !uri.includes('reportes-banco?')) {
  uri = uri.includes('?') ? uri.replace(/\/*\?/, '/reportes-banco?') : uri.replace(/\/$/, '') + '/reportes-banco';
}
uri = uri.replace(/(?<!:)\/\//g, '/');

/** Parsea línea CSV respetando comillas. */
function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        inQuotes = false;
        continue;
      }
      cur += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

function isIncomingSnippet(snippet) {
  return /recibiste/i.test(String(snippet || ''));
}

/**
 * Normaliza montos como en notificaciones Bancolombia: $3.500,00 / $19000.00 / $1.500.000,00
 */
function parseAmountFromSnippet(snippet) {
  const text = String(snippet);
  const por = text.match(/por\s*\$\s*([\d.,]+)/i);
  const raw = por ? por[1] : null;
  if (!raw) {
    const m = text.match(/\$\s*([\d.,]+)/);
    if (!m) return null;
    return normalizeMoneyToken(m[1]);
  }
  return normalizeMoneyToken(raw);
}

function normalizeMoneyToken(s) {
  const t = String(s).trim();
  if (!t) return null;
  const hasComma = t.includes(',');
  const hasDot = t.includes('.');
  if (hasComma && hasDot) {
    const lastComma = t.lastIndexOf(',');
    const afterComma = t.slice(lastComma + 1);
    if (/^\d{2}$/.test(afterComma)) return Number(t.replace(/\./g, '').replace(',', '.'));
  }
  if (hasComma && !hasDot) {
    const lastComma = t.lastIndexOf(',');
    if (lastComma === t.length - 3 && /^\d{2}$/.test(t.slice(-2))) {
      return Number(t.replace(',', '.'));
    }
  }
  if (hasDot && !hasComma) {
    if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
    return Number(t);
  }
  return Number(t.replace(/,/g, ''));
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('No existe el archivo CSV:', CSV_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  const idxSnippet = header.indexOf('snippet');
  const idxInternal = header.indexOf('internalDate');
  const idxTo = header.indexOf('To');
  if (idxSnippet < 0 || idxInternal < 0 || idxTo < 0) {
    console.error('El CSV debe incluir columnas: snippet, internalDate, To');
    process.exit(1);
  }

  const candidates = [];
  for (let li = 1; li < lines.length; li++) {
    const fields = parseCsvLine(lines[li]);
    const snippet = fields[idxSnippet] || '';
    if (!isIncomingSnippet(snippet)) continue;
    const ms = Number(fields[idxInternal]);
    const to = String(fields[idxTo] || '').trim().toLowerCase();
    const amount = parseAmountFromSnippet(snippet);
    if (!Number.isFinite(ms) || !to || amount == null || !Number.isFinite(amount)) {
      console.warn('Fila omitida (dato inválido): línea', li + 1, snippet.slice(0, 60));
      continue;
    }
    candidates.push({ line: li + 1, snippet: snippet.slice(0, 90), ms, to, amount });
  }

  console.log('Archivo:', CSV_PATH);
  console.log('Filas con ingreso (recibiste) en snippet:', candidates.length);
  console.log(APPLY ? 'Modo: APLICAR borrado' : 'Modo: simulación (sin borrar). Añade --apply para eliminar.');
  console.log('Ventana ±ms para fecha:', WINDOW_MS);
  console.log('Respaldo mismo día (Bogotá):', MATCH_SAME_DAY ? 'sí' : 'no', '\n');

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const usersCol = db.collection('users');
    const txCol = db.collection('transactions');
    const tagsCol = db.collection('transactiontags');

    const emailToUserId = new Map();
    async function resolveUserId(email) {
      const key = email.toLowerCase();
      if (emailToUserId.has(key)) return emailToUserId.get(key);
      const user = await usersCol.findOne({ email: key });
      const id = user ? String(user._id) : null;
      emailToUserId.set(key, id);
      return id;
    }

    const toDeleteIds = new Set();
    let skippedNoUser = 0;
    let skippedNoTx = 0;
    let skippedAmbiguous = 0;

    for (const row of candidates) {
      const userId = await resolveUserId(row.to);
      if (!userId) {
        skippedNoUser++;
        console.log('[sin usuario]', row.to, '|', row.amount, '|', row.snippet);
        continue;
      }
      const center = new Date(row.ms);
      const from = new Date(center.getTime() - WINDOW_MS);
      const toD = new Date(center.getTime() + WINDOW_MS);

      let matches = await txCol
        .find({
          user_id: userId,
          amount: row.amount,
          transaction_date: { $gte: from, $lte: toD },
        })
        .toArray();

      if (matches.length === 0 && MATCH_SAME_DAY) {
        const widenFrom = new Date(center.getTime() - 26 * 3600000);
        const widenTo = new Date(center.getTime() + 26 * 3600000);
        const dayCandidates = await txCol
          .find({
            user_id: userId,
            amount: row.amount,
            transaction_date: { $gte: widenFrom, $lte: widenTo },
          })
          .toArray();
        const keyMail = calendarKeyBogota(center);
        matches = dayCandidates.filter(
          (t) => calendarKeyBogota(new Date(t.transaction_date)) === keyMail,
        );
      }

      if (matches.length === 0) {
        skippedNoTx++;
        console.log('[sin match BD]', row.amount, center.toISOString(), '|', row.snippet);
        continue;
      }
      if (matches.length > 1 && !FORCE_MULTIPLE) {
        skippedAmbiguous++;
        console.log(
          '[varias coincidencias — usa --force-multiple]',
          matches.length,
          row.amount,
          '|',
          row.snippet,
        );
        continue;
      }
      for (const m of matches) {
        toDeleteIds.add(m._id);
        console.log(
          APPLY ? 'Borrar' : 'Candidato',
          m._id,
          m.amount,
          m.transaction_date?.toISOString?.(),
          '|',
          (m.description || '').slice(0, 55),
        );
      }
    }

    console.log('\n--- Resumen ---');
    console.log('IDs únicos a eliminar:', toDeleteIds.size);
    console.log('Sin usuario Mongo para To:', skippedNoUser);
    console.log('Sin transacción coincidente:', skippedNoTx);
    console.log('Ambiguas (varios matches):', skippedAmbiguous);

    if (!APPLY || toDeleteIds.size === 0) {
      if (!APPLY && toDeleteIds.size > 0) {
        console.log('\nEjecuta con --apply para borrar.');
      }
      return;
    }

    const ids = [...toDeleteIds];
    const tagResult = await tagsCol.deleteMany({ transaction_id: { $in: ids } });
    const delResult = await txCol.deleteMany({ _id: { $in: ids } });
    console.log('\nTags eliminados (documentos):', tagResult.deletedCount);
    console.log('Transacciones eliminadas:', delResult.deletedCount);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
