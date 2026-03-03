import { ReportPattern } from '../models/ReportPattern.js';
import { Category } from '../models/Category.js';

const TOP_K = 10;

const STOP_WORDS = new Set([
  'en', 'con', 'de', 'la', 'el', 'a', 'por', 'al', 'del', 'los', 'las', 'un', 'una', 'su', 'sus',
  'compra', 'pago', 'transferencia', 'programado', 'manual', 'tarjeta', 'tdeb', 't.deb', 'debit', 'credito',
  'desde', 'hacia', 'cuenta', 'bancolombia', 'nequi', 'daviplata', 'pse', 'factura'
]);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrae palabras distintivas (excluye stop words y números de tarjeta comunes).
 */
function getDistinctiveWords(description) {
  const words = description.split(/\s+/).filter((w) => w.length >= 2);
  return words.filter((w) => {
    const lower = w.toLowerCase();
    if (STOP_WORDS.has(lower)) return false;
    if (/^\d{4}$/.test(w)) return false;
    if (/^\d+[,.]?\d*$/.test(w)) return false;
    return true;
  });
}

/**
 * Búsqueda local: prioriza palabras distintivas (comercio, marca) y usa $and para coincidencias más precisas.
 */
async function findSimilarPatterns({ transaction, userId }) {
  const baseFilter = { user_id: userId, transaction_type: transaction.transaction_type };
  const distinctive = getDistinctiveWords(transaction.description);

  if (distinctive.length >= 2) {
    const andConditions = distinctive.slice(0, 5).map((w) => {
      const re = new RegExp(escapeRegex(w), 'i');
      return { $or: [{ description: re }, { category_name: re }] };
    });

    let patterns = await ReportPattern.find({ ...baseFilter, $and: andConditions })
      .limit(TOP_K)
      .sort({ createdAt: -1 })
      .lean();

    if (patterns.length > 0) return patterns;
  }

  if (distinctive.length >= 1) {
    const orConditions = distinctive.slice(0, 4).flatMap((w) => {
      const re = new RegExp(escapeRegex(w), 'i');
      return [{ description: re }, { category_name: re }];
    });

    let patterns = await ReportPattern.find({ ...baseFilter, $or: orConditions })
      .limit(TOP_K)
      .sort({ createdAt: -1 })
      .lean();

    if (patterns.length > 0) return patterns;
  }

  return ReportPattern.find(baseFilter).limit(TOP_K).sort({ createdAt: -1 }).lean();
}

/**
 * Sugerencia basada 100% en historial: voto por mayoría.
 * Sin IA: usa la categoría y comentario más frecuentes en patrones similares.
 */
function suggestFromPatterns(patterns, categories) {
  if (patterns.length === 0) return null;

  const catCount = new Map();
  const commentByCat = new Map();
  for (const p of patterns) {
    const cid = String(p.category_id || '');
    if (!cid) continue;
    catCount.set(cid, (catCount.get(cid) || 0) + 1);
    const key = `${cid}::${(p.comment || '').trim()}`;
    commentByCat.set(key, (commentByCat.get(key) || 0) + 1);
  }

  let bestCat = '';
  let maxCount = 0;
  for (const [cid, n] of catCount) {
    if (n > maxCount) {
      maxCount = n;
      bestCat = cid;
    }
  }

  let bestComment = '';
  let maxComment = 0;
  for (const [key, n] of commentByCat) {
    if (key.startsWith(bestCat + '::') && n > maxComment) {
      maxComment = n;
      bestComment = key.replace(bestCat + '::', '');
    }
  }

  const valid = categories.some((c) => String(c._id) === bestCat);
  const categoryId = valid ? bestCat : (categories[0]?._id ?? null);
  const catName = categories.find((c) => String(c._id) === categoryId)?.name || '';

  return {
    category_id: categoryId,
    comment: bestComment.trim(),
    reasoning: `Basado en ${patterns.length} reporte(s) similar(es): categoría "${catName}" usada ${maxCount} vez/veces.`
  };
}

export async function suggestReport({ transaction, userId }) {
  const patterns = await findSimilarPatterns({ transaction, userId });
  const categories = await Category.find({ user_id: userId }).lean();

  const fromHistory = suggestFromPatterns(patterns, categories);
  if (fromHistory) {
    return fromHistory;
  }

  if (categories.length === 0) {
    return { category_id: null, comment: '', reasoning: 'No hay categorías ni historial.' };
  }

  return {
    category_id: categories[0]._id,
    comment: '',
    reasoning: 'Sin historial de este tipo de transacción. Selecciona manualmente.'
  };
}
