import { ReportPattern } from '../models/ReportPattern.js';
import { Category } from '../models/Category.js';

const TOP_K = 8;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Búsqueda local por regex (sin embeddings).
 * Extrae palabras de la transacción y busca patrones que coincidan en description, transaction_type o category_name.
 */
function findSimilarPatterns({ transaction, userId }) {
  const searchText = `${transaction.description} ${transaction.transaction_type} ${String(transaction.amount)}`;
  const words = searchText.split(/\s+/).filter((w) => w.length > 1);

  if (words.length === 0) {
    return ReportPattern.find({ user_id: userId }).limit(TOP_K).sort({ createdAt: -1 }).lean();
  }

  const orConditions = words.flatMap((w) => {
    const re = new RegExp(escapeRegex(w), 'i');
    return [
      { description: re },
      { transaction_type: re },
      { category_name: re }
    ];
  });

  return ReportPattern.find({ user_id: userId, $or: orConditions })
    .limit(TOP_K)
    .sort({ createdAt: -1 })
    .lean();
}

export async function suggestReport({ transaction, userId }) {
  const patterns = await findSimilarPatterns({ transaction, userId });

  const categories = await Category.find({ user_id: userId }).lean();

  const examplesText = patterns
    .map(
      (p) =>
        `- "${p.description}" (${p.transaction_type}, ${p.amount}) → categoría: ${p.category_name}, comentario: ${p.comment || '(ninguno)'}`
    )
    .join('\n');

  const categoriesText = categories
    .map((c) => `- ${c._id}: ${c.name}`)
    .join('\n');

  const prompt = `Eres un asistente que sugiere categorías y comentarios para reportar transacciones bancarias.

Transacción actual:
- Descripción: ${transaction.description}
- Tipo: ${transaction.transaction_type}
- Monto: ${transaction.amount}

Categorías disponibles del usuario (id: nombre):
${categoriesText}

${patterns.length > 0 ? `Ejemplos de reportes similares del usuario:\n${examplesText}` : 'No hay reportes previos similares.'}

Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto adicional:
{"category_id": "id_de_categoria", "comment": "comentario breve opcional", "reasoning": "explicación corta en español"}

Si no hay categorías o no puedes decidir, usa la primera categoría disponible y reasoning explicando la incertidumbre.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Respuesta vacía de OpenRouter');
  }

  let parsed;
  try {
    const jsonStr = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`No se pudo parsear la respuesta del LLM: ${content}`);
  }

  const categoryId = parsed.category_id || (categories[0]?._id ?? null);
  const validCategory = categories.some((c) => String(c._id) === String(categoryId));
  const finalCategoryId = validCategory ? categoryId : (categories[0]?._id ?? null);

  return {
    category_id: finalCategoryId,
    comment: String(parsed.comment || '').trim(),
    reasoning: String(parsed.reasoning || '').trim()
  };
}
