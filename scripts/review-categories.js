#!/usr/bin/env node
/**
 * Revisa categorías y subcategorías: jerarquía, uso, duplicados y candidatas a unificar.
 *
 * Uso: node scripts/review-categories.js
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = (process.env.MONGODB_URI || 'mongodb://localhost:27017/reportes-banco').trim();
let uri = MONGODB_URI;
if (!uri.includes('/reportes-banco') && !uri.includes('reportes-banco?')) {
  uri = uri.includes('?') ? uri.replace(/\/*\?/, '/reportes-banco?') : uri.replace(/\/$/, '') + '/reportes-banco';
}
uri = uri.replace(/(?<!:)\/\//g, '/');

function normalize(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFullPath(cat, catMap) {
  const parts = [cat.name];
  let pid = cat.parent_id;
  while (pid && catMap.has(pid)) {
    const p = catMap.get(pid);
    parts.unshift(p.name);
    pid = p.parent_id;
  }
  return parts.join(' > ');
}

function buildTree(categories, parentId = null) {
  return categories
    .filter((c) => (c.parent_id || null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function printTree(cats, catMap, txByCat, rpByCat, indent = '') {
  for (const c of cats) {
    const tx = txByCat.get(c._id) || 0;
    const rp = rpByCat.get(c._id) || 0;
    const total = tx + rp;
    const usage = total > 0 ? ` [tx:${tx} rp:${rp}]` : ' [sin uso]';
    console.log(`${indent}${c.name}${usage}`);
    const children = buildTree(
      [...catMap.values()].filter((x) => x.parent_id === c._id),
      c._id
    );
    if (children.length > 0) {
      printTree(children, catMap, txByCat, rpByCat, indent + '  └─ ');
    }
  }
}

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const categories = await db.collection('categories').find({}).toArray();
    const transactions = db.collection('transactions');
    const reportpatterns = db.collection('reportpatterns');

    const catMap = new Map(categories.map((c) => [c._id, c]));

    const txCount = await transactions.aggregate([
      { $match: { reported: true, category_id: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$category_id', count: { $sum: 1 } } }
    ]).toArray();

    const rpCount = await reportpatterns.aggregate([
      { $group: { _id: '$category_id', count: { $sum: 1 } } }
    ]).toArray();

    const txByCat = new Map(txCount.map((x) => [x._id, x.count]));
    const rpByCat = new Map(rpCount.map((x) => [x._id, x.count]));

    const byUser = new Map();
    for (const c of categories) {
      const uid = c.user_id || 'sin-user';
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid).push(c);
    }

    console.log('=== RESUMEN ===\n');
    console.log(`Total categorías: ${categories.length}`);
    const roots = categories.filter((c) => !c.parent_id);
    const subs = categories.filter((c) => c.parent_id);
    console.log(`  - Raíz (sin padre): ${roots.length}`);
    console.log(`  - Subcategorías: ${subs.length}\n`);

    console.log('=== JERARQUÍA POR USUARIO ===\n');

    for (const [userId, userCats] of byUser) {
      const userCatMap = new Map(userCats.map((c) => [c._id, c]));
      const rootsUser = buildTree(userCats, null);

      console.log(`--- User: ${userId.slice(0, 8)}... (${userCats.length} categorías) ---\n`);

      for (const r of rootsUser) {
        const tx = txByCat.get(r._id) || 0;
        const rp = rpByCat.get(r._id) || 0;
        const total = tx + rp;
        const usage = total > 0 ? ` [tx:${tx} rp:${rp}]` : ' [sin uso]';
        console.log(`${r.name}${usage}`);

        const children = buildTree(userCats, r._id);
        for (const child of children) {
          const ctx = txByCat.get(child._id) || 0;
          const crp = rpByCat.get(child._id) || 0;
          const ctotal = ctx + crp;
          const cusage = ctotal > 0 ? ` [tx:${ctx} rp:${crp}]` : ' [sin uso]';
          console.log(`  └─ ${child.name}${cusage}`);

          const grandChildren = buildTree(userCats, child._id);
          for (const gc of grandChildren) {
            const gtx = txByCat.get(gc._id) || 0;
            const grp = rpByCat.get(gc._id) || 0;
            const gtotal = gtx + grp;
            const gusage = gtotal > 0 ? ` [tx:${gtx} rp:${grp}]` : ' [sin uso]';
            console.log(`      └─ ${gc.name}${gusage}`);
          }
        }
      }
      console.log('');
    }

    console.log('=== DUPLICADOS: mismo nombre (considerando ruta completa) ===\n');

    const byPath = new Map();
    const byNameOnly = new Map();

    for (const c of categories) {
      const path = getFullPath(c, catMap);
      const nameNorm = normalize(c.name);

      if (!byPath.has(path)) byPath.set(path, []);
      byPath.get(path).push(c);

      if (!byNameOnly.has(nameNorm)) byNameOnly.set(nameNorm, []);
      byNameOnly.get(nameNorm).push({ ...c, fullPath: path });
    }

    const pathDupes = [...byPath.entries()].filter(([, arr]) => arr.length > 1);
    const nameDupes = [...byNameOnly.entries()].filter(([, arr]) => arr.length > 1);

    if (pathDupes.length > 0) {
      console.log('Rutas idénticas (duplicados exactos):');
      for (const [path, arr] of pathDupes) {
        for (const c of arr) {
          const tx = txByCat.get(c._id) || 0;
          const rp = rpByCat.get(c._id) || 0;
          console.log(`  "${path}" | tx:${tx} rp:${rp} | ${c._id}`);
        }
        console.log('');
      }
    }

    console.log('Mismo nombre en distintas rutas (revisar si unificar):\n');

    for (const [nameNorm, arr] of nameDupes) {
      const uniquePaths = [...new Set(arr.map((a) => a.fullPath))];
      if (uniquePaths.length <= 1) continue;

      console.log(`"${nameNorm}" (${arr.length} variantes):`);
      for (const item of arr) {
        const tx = txByCat.get(item._id) || 0;
        const rp = rpByCat.get(item._id) || 0;
        const parent = item.parent_id ? catMap.get(item.parent_id) : null;
        const parentStr = parent ? ` (bajo ${parent.name})` : ' (raíz)';
        console.log(`  - ${item.fullPath}${parentStr} | tx:${tx} rp:${rp} | ${item._id}`);
      }
      console.log('');
    }

    console.log('=== SUBCATEGORÍAS SIN USO (padre con uso) ===\n');

    const unusedWithUsedParent = categories.filter((c) => {
      if (txByCat.has(c._id) || rpByCat.has(c._id)) return false;
      if (!c.parent_id) return false;
      const parent = catMap.get(c.parent_id);
      return parent && (txByCat.has(parent._id) || rpByCat.has(parent._id));
    });

    if (unusedWithUsedParent.length === 0) {
      console.log('Ninguna.\n');
    } else {
      for (const c of unusedWithUsedParent) {
        const path = getFullPath(c, catMap);
        console.log(`  ${path} | ${c._id}`);
      }
      console.log('');
    }

    console.log('=== RAÍCES SIN USO NI HIJOS CON USO ===\n');

    const unusedRoots = roots.filter((r) => {
      if (txByCat.has(r._id) || rpByCat.has(r._id)) return false;
      const children = categories.filter((c) => c.parent_id === r._id);
      return !children.some((ch) => txByCat.has(ch._id) || rpByCat.has(ch._id));
    });

    for (const r of unusedRoots) {
      const children = categories.filter((c) => c.parent_id === r._id);
      const childStr = children.length > 0 ? ` (${children.length} hijos)` : '';
      console.log(`  ${r.name}${childStr} | ${r._id}`);
    }
    console.log('');

    console.log('=== SUGERENCIAS ===\n');
    console.log('- Duplicados mismo nombre: evaluar si unificar (ej. ROPA raíz vs ROPA > YEZDE vs ROPA > ISA HIJA)');
    console.log('- Subcategorías sin uso: considerar eliminar o migrar transacciones a la subcategoría correcta');
    console.log('- Raíces sin uso: pueden ser contenedores; si no tienen hijos con uso, considerar eliminar');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
