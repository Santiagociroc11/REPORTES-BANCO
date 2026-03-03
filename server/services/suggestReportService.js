import { ReportPattern } from '../models/ReportPattern.js';
import { Category } from '../models/Category.js';
import { extractComponents } from './extractComponentsService.js';

const TOP_K = 10;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Búsqueda en historial usando componentes extraídos por IA.
 * Retorna { patterns, fromFallback, components }. Si fromFallback=true, no sugerir.
 */
async function findSimilarPatterns({ transaction, userId }) {
  const baseFilter = { user_id: userId, transaction_type: transaction.transaction_type };
  let searchTerms = [];
  let components = null;

  try {
    const { destinationAccount, merchant, searchTerms: terms } = await extractComponents(
      transaction.description,
      transaction.transaction_type
    );
    if (destinationAccount) {
      searchTerms = [destinationAccount];
      components = { destinationAccount, merchant: '', searchTerms: [...searchTerms] };
    } else {
      searchTerms = [...terms];
      if (merchant && !terms.includes(merchant.toLowerCase())) {
        searchTerms = [merchant.toLowerCase(), ...terms];
      }
      components = { destinationAccount: '', merchant, searchTerms: [...searchTerms] };
    }
  } catch (err) {
    console.error('extractComponents error:', err.message);
    return {
      patterns: await ReportPattern.find(baseFilter).limit(TOP_K).sort({ createdAt: -1 }).lean(),
      fromFallback: true,
      components: null
    };
  }

  if (searchTerms.length >= 2) {
    const andConditions = searchTerms.slice(0, 3).map((term) => {
      const re = new RegExp(escapeRegex(term), 'i');
      return { $or: [{ description: re }, { category_name: re }] };
    });

    const patterns = await ReportPattern.find({ ...baseFilter, $and: andConditions })
      .limit(TOP_K)
      .sort({ createdAt: -1 })
      .lean();

    if (patterns.length > 0) return { patterns, fromFallback: false, components };
  }

  if (searchTerms.length >= 1) {
    const orConditions = searchTerms.slice(0, 3).flatMap((term) => {
      const re = new RegExp(escapeRegex(term), 'i');
      return [{ description: re }, { category_name: re }];
    });

    const patterns = await ReportPattern.find({ ...baseFilter, $or: orConditions })
      .limit(TOP_K)
      .sort({ createdAt: -1 })
      .lean();

    if (patterns.length > 0) return { patterns, fromFallback: false, components };
  }

  const fallback = await ReportPattern.find(baseFilter).limit(TOP_K).sort({ createdAt: -1 }).lean();
  return { patterns: fallback, fromFallback: true, components };
}

/**
 * Sugerencia basada en historial: voto por mayoría.
 * reasoning incluye componentes extraídos por IA cuando están disponibles.
 */
function suggestFromPatterns(patterns, categories, components = null) {
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

  const alternatives = [...catCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cid, n]) => {
      const c = categories.find((x) => String(x._id) === cid);
      return { category_id: cid, category_name: c?.name || 'Sin nombre', count: n };
    });

  let reasoning;
  if (components?.destinationAccount) {
    reasoning = `Identificamos cuenta destino "${components.destinationAccount}". Encontramos ${patterns.length} reporte(s) con la misma cuenta; categoría "${catName}" usada ${maxCount} vez/veces.`;
  } else if (components?.merchant || components?.searchTerms?.length) {
    const parts = [];
    if (components.merchant) parts.push(`comercio "${components.merchant}"`);
    if (components.searchTerms?.length) parts.push(`términos: ${components.searchTerms.join(', ')}`);
    reasoning = `Identificamos: ${parts.join('; ')}. Encontramos ${patterns.length} reporte(s) similar(es); categoría "${catName}" usada ${maxCount} vez/veces.`;
  } else {
    reasoning = `Basado en ${patterns.length} reporte(s) similar(es): categoría "${catName}" usada ${maxCount} vez/veces.`;
  }

  return {
    category_id: categoryId,
    comment: bestComment.trim(),
    reasoning,
    alternatives
  };
}

export async function suggestReport({ transaction, userId }) {
  const categories = await Category.find({ user_id: userId }).lean();

  const exactMatches = await ReportPattern.find({
    user_id: userId,
    transaction_type: transaction.transaction_type,
    description: transaction.description
  }).lean();

  if (exactMatches.length > 0) {
    const catCount = new Map();
    const commentByCat = new Map();
    for (const p of exactMatches) {
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

    const alternatives = [...catCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cid, n]) => {
        const c = categories.find((x) => String(x._id) === cid);
        return { category_id: cid, category_name: c?.name || 'Sin nombre', count: n };
      });

    const hasMultipleCategories = catCount.size > 1;
    const reasoning = hasMultipleCategories
      ? `Coincidencia exacta: esta descripción coincide con ${exactMatches.length} reporte(s) anterior(es). Se usaron ${catCount.size} categoría(s) distintas; "${catName}" la más frecuente (${maxCount}). Elige la que corresponda.`
      : `Coincidencia exacta: esta descripción coincide exactamente con un reporte anterior (${catName}).`;

    return {
      category_id: categoryId,
      comment: bestComment.trim(),
      reasoning,
      alternatives: hasMultipleCategories ? alternatives : [],
      exactMatch: true
    };
  }

  const { patterns, fromFallback, components } = await findSimilarPatterns({ transaction, userId });

  if (fromFallback) {
    let reasoning = 'Sin transacciones similares en el historial. Selecciona manualmente.';
    if (components?.destinationAccount) {
      reasoning = `Identificamos cuenta destino "${components.destinationAccount}". No hay reportes con esa cuenta en tu historial. Selecciona manualmente.`;
    } else if (components?.merchant || components?.searchTerms?.length) {
      const parts = [];
      if (components.merchant) parts.push(`comercio "${components.merchant}"`);
      if (components.searchTerms?.length) parts.push(`términos: ${components.searchTerms.join(', ')}`);
      reasoning = `Identificamos: ${parts.join('; ')}. No hay reportes similares en tu historial. Selecciona manualmente.`;
    }
    return {
      category_id: null,
      comment: '',
      reasoning
    };
  }

  const fromHistory = suggestFromPatterns(patterns, categories, components);
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
