/**
 * Usa IA (OpenRouter) para descomponer la descripción de una transacción
 * en componentes semánticos (comercio, tipo, términos de búsqueda).
 */

export async function extractComponents(description, transactionType) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY no configurada');
  }

  const prompt = `Analiza esta descripción de transacción bancaria y extrae los componentes clave para buscar transacciones similares en un historial.

Descripción: "${description}"
Tipo de transacción: ${transactionType}

Extrae:
1. merchant: nombre del comercio o establecimiento (ej: "PETIT BOUTIQUE", "MC DONALD", "D1")
2. searchTerms: 2-5 términos para buscar en historial. Incluye: nombre del comercio (o parte distintiva), tipo de negocio (restaurante, supermercado, boutique, farmacia, etc), o producto si es relevante. EXCLUYE: compra, compras, tarjeta, pago, transferencia, banco, débito, crédito. En minúsculas.

Responde ÚNICAMENTE con JSON válido, sin markdown:
{"merchant": "string", "searchTerms": ["term1", "term2", "term3"]}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
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

  const GENERIC_TERMS = new Set(['compra', 'compras', 'pago', 'tarjeta', 'transferencia', 'banco', 'débito', 'credito']);

  try {
    const jsonStr = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    const terms = Array.isArray(parsed.searchTerms)
      ? parsed.searchTerms
          .filter((t) => typeof t === 'string' && t.trim().length >= 2)
          .filter((t) => !GENERIC_TERMS.has(t.toLowerCase().trim()))
      : [];
    return {
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant.trim() : '',
      searchTerms: terms.slice(0, 5)
    };
  } catch (e) {
    throw new Error(`No se pudo parsear componentes: ${content}`);
  }
}
