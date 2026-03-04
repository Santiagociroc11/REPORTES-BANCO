#!/usr/bin/env node
/**
 * Migración de categorías según la estructura propuesta por Gemini.
 * Reduce de 26 raíces a 10 bloques lógicos.
 *
 * Uso:
 *   node scripts/migrate-categories-gemini.js           # dry-run
 *   node scripts/migrate-categories-gemini.js --apply   # ejecutar migración
 *
 * Opcional: MIGRATE_USER_ID=xxx para un usuario específico
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';

const DRY_RUN = !process.argv.includes('--apply');
const MIGRATE_USER_ID = process.env.MIGRATE_USER_ID;

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

function pathKey(parts) {
  return parts.map(normalize).join(' > ');
}

// Nueva estructura: raíz -> subcategorías
const NEW_STRUCTURE = [
  {
    root: 'CASA',
    rootType: 'obligatorio',
    subs: [
      { name: 'Servicios Públicos' },
      { name: 'Arriendo / Cuotas Vivienda' },
      { name: 'Mercado' },
      { name: 'Personal Doméstico (Silvia)' },
      { name: 'Accesorios y Mantenimiento' },
      { name: 'Gastos Compra Propiedad' }
    ]
  },
  {
    root: 'ALIMENTACIÓN',
    rootType: 'alimentos',
    subs: [
      { name: 'Domicilios' },
      { name: 'Restaurantes / Salidas' }
    ]
  },
  {
    root: 'NEGOCIO / AGENCIA',
    rootType: 'otros',
    subs: [
      { name: 'Facebook & Google Ads' },
      { name: 'SaaS y Herramientas' },
      { name: 'Freelancers y Equipo' },
      { name: 'Cursos y Formación Pro' }
    ]
  },
  {
    root: 'YEZDE (PAREJA)',
    rootType: 'familia',
    subs: [
      { name: 'Salud' },
      { name: 'Vanidad' },
      { name: 'Ropa' },
      { name: 'Ayuda Familiar Yezde' },
      { name: 'Regalos / Detalles' }
    ]
  },
  {
    root: 'ISA (HIJA)',
    rootType: 'familia',
    subs: [
      { name: 'Pañales y Aseo' },
      { name: 'Ropa e Implementos' },
      { name: 'Salud / Póliza Isa' }
    ]
  },
  {
    root: 'SANTI (PERSONALES)',
    rootType: 'discrecional',
    subs: [
      { name: 'Salud / EPS' },
      { name: 'Vanidad / Barbería' },
      { name: 'Ropa Santiago' },
      { name: 'Gastos Hormiga / Varios' }
    ]
  },
  {
    root: 'TRANSPORTE / CARRO',
    rootType: 'obligatorio',
    subs: [
      { name: 'Gasolina' },
      { name: 'Seguros / Pólizas' },
      { name: 'Impuestos / Multas / Trámites' }
    ]
  },
  {
    root: 'FINANZAS Y DEUDAS',
    rootType: 'obligatorio',
    subs: [
      { name: 'Bancos (Cuotas Manejo / Comisiones)' },
      { name: 'Préstamos / Cuotas' },
      { name: 'Intereses Tarjetas de Crédito' },
      { name: 'Impuestos Nacionales / DIAN' }
    ]
  },
  {
    root: 'ESTILO DE VIDA',
    rootType: 'discrecional',
    subs: [
      { name: 'Suscripciones' },
      { name: 'Entretenimiento / Juegos' },
      { name: 'Regalos Generales' },
      { name: 'Viajes y Turismo' }
    ]
  },
  {
    root: 'AHORRO E INVERSIÓN',
    rootType: 'ahorro',
    subs: [
      { name: 'Ahorro en Dólares' },
      { name: 'Inversiones en Activos' }
    ]
  }
];

// Mapeo: ruta antigua (normalizada) -> [raíz nueva, sub nueva]
const OLD_TO_NEW = {
  'casa > servicios': ['CASA', 'Servicios Públicos'],
  'casa > arreindo': ['CASA', 'Arriendo / Cuotas Vivienda'],
  'casa > pago cuotas casa': ['CASA', 'Arriendo / Cuotas Vivienda'],
  'casa > mercado': ['CASA', 'Mercado'],
  'casa > silvia': ['CASA', 'Personal Doméstico (Silvia)'],
  'casa > accesorios': ['CASA', 'Accesorios y Mantenimiento'],
  'casa > gastos compra casa': ['CASA', 'Gastos Compra Propiedad'],

  'comida > domicilios': ['ALIMENTACIÓN', 'Domicilios'],
  'yezde > domicilios': ['ALIMENTACIÓN', 'Domicilios'],
  'comida > restaurantes': ['ALIMENTACIÓN', 'Restaurantes / Salidas'],

  'inversiones > facebook ads': ['NEGOCIO / AGENCIA', 'Facebook & Google Ads'],
  'inversiones > herramientas de trabajo': ['NEGOCIO / AGENCIA', 'SaaS y Herramientas'],
  'inversiones > disenador': ['NEGOCIO / AGENCIA', 'Freelancers y Equipo'],
  'inversiones > educacion': ['NEGOCIO / AGENCIA', 'Cursos y Formación Pro'],

  'yezde > salud': ['YEZDE (PAREJA)', 'Salud'],
  'yezde > vanidad': ['YEZDE (PAREJA)', 'Vanidad'],
  'yezde > ropa': ['YEZDE (PAREJA)', 'Ropa'],
  'yezde > ayuda familiar': ['YEZDE (PAREJA)', 'Ayuda Familiar Yezde'],
  'yezde > regalos': ['YEZDE (PAREJA)', 'Regalos / Detalles'],
  'yezde > cursos': ['NEGOCIO / AGENCIA', 'Cursos y Formación Pro'],

  'isa hija > panales': ['ISA (HIJA)', 'Pañales y Aseo'],
  'isa hija > ropa': ['ISA (HIJA)', 'Ropa e Implementos'],
  'salud > poliza isa': ['ISA (HIJA)', 'Salud / Póliza Isa'],
  'ropa > isa': ['ISA (HIJA)', 'Ropa e Implementos'],

  'salud > eps': ['SANTI (PERSONALES)', 'Salud / EPS'],
  'salud > herramientas de deporte': ['SANTI (PERSONALES)', 'Salud / EPS'],
  'ropa > santiago': ['SANTI (PERSONALES)', 'Ropa Santiago'],
  'vanidad': ['SANTI (PERSONALES)', 'Vanidad / Barbería'],
  'otros': ['SANTI (PERSONALES)', 'Gastos Hormiga / Varios'],
  'ayuda familiar': ['SANTI (PERSONALES)', 'Gastos Hormiga / Varios'],

  'carro > gasolina': ['TRANSPORTE / CARRO', 'Gasolina'],
  'carro > polizas': ['TRANSPORTE / CARRO', 'Seguros / Pólizas'],
  'carro > impuestos': ['TRANSPORTE / CARRO', 'Impuestos / Multas / Trámites'],

  'cobros bancos (cuotas de manejo, etc)': ['FINANZAS Y DEUDAS', 'Bancos (Cuotas Manejo / Comisiones)'],
  'prestamos': ['FINANZAS Y DEUDAS', 'Préstamos / Cuotas'],
  'pagos niko': ['FINANZAS Y DEUDAS', 'Préstamos / Cuotas'],
  'tarjetas de credito': ['FINANZAS Y DEUDAS', 'Intereses Tarjetas de Crédito'],
  'impuestos': ['FINANZAS Y DEUDAS', 'Impuestos Nacionales / DIAN'],

  'suscripciones': ['ESTILO DE VIDA', 'Suscripciones'],
  'entretenimiento': ['ESTILO DE VIDA', 'Entretenimiento / Juegos'],
  'entretenimiento > juegos': ['ESTILO DE VIDA', 'Entretenimiento / Juegos'],
  'regalos': ['ESTILO DE VIDA', 'Regalos Generales'],
  'viajes': ['ESTILO DE VIDA', 'Viajes y Turismo'],

  'ahorro en dolares': ['AHORRO E INVERSIÓN', 'Ahorro en Dólares'],
  'inversiones': ['AHORRO E INVERSIÓN', 'Inversiones en Activos'],

  'devoluciones magis': ['SANTI (PERSONALES)', 'Gastos Hormiga / Varios'],
  'mascotas': ['SANTI (PERSONALES)', 'Gastos Hormiga / Varios'],
  'multas': ['TRANSPORTE / CARRO', 'Impuestos / Multas / Trámites'],
  'ropa': ['SANTI (PERSONALES)', 'Ropa Santiago'],

  'casa': ['CASA', 'Accesorios y Mantenimiento'],
  'comida': ['ALIMENTACIÓN', 'Domicilios'],
  'salud': ['SANTI (PERSONALES)', 'Salud / EPS'],
  'isa hija': ['ISA (HIJA)', 'Salud / Póliza Isa'],
  'yezde': ['YEZDE (PAREJA)', 'Ayuda Familiar Yezde'],
  'carro': ['TRANSPORTE / CARRO', 'Gasolina']
};

function getFullPath(cat, catMap) {
  const parts = [cat.name];
  let pid = cat.parent_id;
  while (pid && catMap.has(pid)) {
    const p = catMap.get(pid);
    parts.unshift(p.name);
    pid = p.parent_id;
  }
  return parts;
}

async function main() {
  console.log('📋 Migración de categorías (estructura Gemini)\n');
  if (DRY_RUN) {
    console.log('   [MODO DRY-RUN - usa --apply para ejecutar]\n');
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const categories = await db.collection('categories').find({}).toArray();
    const catMap = new Map(categories.map((c) => [c._id, c]));

    let userId = MIGRATE_USER_ID;
    if (!userId) {
      const usersWithTx = await db.collection('transactions').distinct('user_id');
      const usersWithCat = [...new Set(categories.map((c) => c.user_id))];
      userId = usersWithTx[0] || usersWithCat[0];
      if (!userId) {
        console.error('No se encontró user_id. Usa MIGRATE_USER_ID=xxx');
        process.exit(1);
      }
    }
    console.log(`Usuario: ${userId}\n`);

    const userCats = categories.filter((c) => String(c.user_id) === String(userId));
    console.log(`Categorías actuales del usuario: ${userCats.length}\n`);

    const pathToOldId = new Map();
    for (const c of userCats) {
      const path = getFullPath(c, catMap);
      const key = pathKey(path);
      pathToOldId.set(key, c._id);
    }

    const newIdByPath = new Map();
    const created = [];

    for (const block of NEW_STRUCTURE) {
      const rootId = randomUUID();
      created.push({
        _id: rootId,
        name: block.root,
        parent_id: null,
        user_id: userId,
        type: block.rootType
      });
      newIdByPath.set(pathKey([block.root]), rootId);

      for (const sub of block.subs) {
        const subId = randomUUID();
        created.push({
          _id: subId,
          name: sub.name,
          parent_id: rootId,
          user_id: userId,
          type: null
        });
        newIdByPath.set(pathKey([block.root, sub.name]), subId);
      }
    }

    const oldToNewId = new Map();
    for (const [oldKey, [rootName, subName]] of Object.entries(OLD_TO_NEW)) {
      const newKey = pathKey(subName ? [rootName, subName] : [rootName]);
      const newId = newIdByPath.get(newKey);
      if (!newId) {
        console.warn(`  ⚠ No existe nueva categoría para: ${newKey}`);
        continue;
      }
      const oldId = pathToOldId.get(oldKey);
      if (oldId) {
        oldToNewId.set(oldId, newId);
      } else {
        const similar = [...pathToOldId.keys()].filter((k) => k.includes(oldKey.split(' > ')[0]));
        if (similar.length > 0) {
          for (const k of similar) {
            if (!oldToNewId.has(pathToOldId.get(k))) {
              oldToNewId.set(pathToOldId.get(k), newId);
              break;
            }
          }
        }
      }
    }

    const fallbackId = newIdByPath.get(pathKey(['SANTI (PERSONALES)', 'Gastos Hormiga / Varios']));
    for (const c of userCats) {
      if (oldToNewId.has(c._id)) continue;
      const path = getFullPath(c, catMap);
      const key = pathKey(path);
      const mapped = OLD_TO_NEW[key] || OLD_TO_NEW[path.length === 1 ? normalize(c.name) : key];
      if (mapped) {
        const [rootName, subName] = mapped;
        const newKey = pathKey(subName ? [rootName, subName] : [rootName]);
        const newId = newIdByPath.get(newKey);
        if (newId) oldToNewId.set(c._id, newId);
        else if (fallbackId) oldToNewId.set(c._id, fallbackId);
      } else if (fallbackId) {
        oldToNewId.set(c._id, fallbackId);
      }
    }

    const txCount = await db.collection('transactions').countDocuments({
      user_id: userId,
      category_id: { $in: [...oldToNewId.keys()] }
    });
    const rpCount = await db.collection('reportpatterns').countDocuments({
      user_id: userId,
      category_id: { $in: [...oldToNewId.keys()] }
    });

    console.log('=== MAPEO ===\n');
    for (const [oldId, newId] of oldToNewId) {
      const oldCat = catMap.get(oldId);
      const oldPath = oldCat ? getFullPath(oldCat, catMap).join(' > ') : oldId;
      const newCat = created.find((x) => x._id === newId);
      const newPath = newCat ? (newCat.parent_id ? `${created.find((r) => r._id === newCat.parent_id)?.name} > ${newCat.name}` : newCat.name) : newId;
      console.log(`  ${oldPath}`);
      console.log(`    → ${newPath}\n`);
    }

    console.log(`Transacciones a actualizar: ${txCount}`);
    console.log(`Report patterns a actualizar: ${rpCount}`);
    console.log(`Categorías nuevas a crear: ${created.length}`);
    console.log(`Categorías viejas a eliminar: ${userCats.length}\n`);

    if (!DRY_RUN) {
      await db.collection('categories').insertMany(created);

      for (const [oldId, newId] of oldToNewId) {
        await db.collection('transactions').updateMany(
          { user_id: userId, category_id: oldId },
          { $set: { category_id: newId } }
        );
        await db.collection('reportpatterns').updateMany(
          { user_id: userId, category_id: oldId },
          { $set: { category_id: newId } }
        );
      }

      await db.collection('categories').deleteMany({
        user_id: userId,
        _id: { $in: userCats.map((c) => c._id) }
      });

      console.log('✓ Migración completada');
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
