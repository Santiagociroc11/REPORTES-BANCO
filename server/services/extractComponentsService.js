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
1. destinationAccount: número de cuenta destino o identificador del destinatario (ej: "123456789", "987654321", NIT) SOLO cuando la transacción es transferencia, pago PSE o pago programado y la descripción incluye explícitamente un número de cuenta destino o identificador del receptor. Si no aplica, usa "".
2. merchant: nombre del comercio o establecimiento (ej: "PETIT BOUTIQUE", "MC DONALD", "D1"). Vacío si destinationAccount está presente.
3. searchTerms: 2-5 términos para buscar en historial. Incluye: nombre del comercio (o parte distintiva), tipo de negocio. EXCLUYE: compra, compras, tarjeta, pago, transferencia, banco, débito, crédito, PSE, pse. En minúsculas. Array vacío [] si destinationAccount está presente.

IMPORTANTE: Si destinationAccount tiene valor, merchant y searchTerms deben ser vacíos. El número de cuenta destino es el ÚNICO identificador que debe usarse para buscar en estos casos.

Responde ÚNICAMENTE con JSON válido, sin markdown:
{"destinationAccount": "string o vacío", "merchant": "string", "searchTerms": ["term1", "term2"]}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
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

  const GENERIC_TERMS = new Set(['compra', 'compras', 'pago', 'tarjeta', 'transferencia', 'banco', 'débito', 'credito', 'pse']);

  try {
    const jsonStr = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    const destAccount = typeof parsed.destinationAccount === 'string' ? parsed.destinationAccount.trim() : '';
    if (destAccount && destAccount.length >= 3) {
      return {
        destinationAccount: destAccount,
        merchant: '',
        searchTerms: [destAccount]
      };
    }
    const terms = Array.isArray(parsed.searchTerms)
      ? parsed.searchTerms
          .filter((t) => typeof t === 'string' && t.trim().length >= 2)
          .filter((t) => !GENERIC_TERMS.has(t.toLowerCase().trim()))
      : [];
    const merchant = typeof parsed.merchant === 'string' ? parsed.merchant.trim() : '';
    const searchTerms = terms.slice(0, 5);
    if (merchant && !searchTerms.includes(merchant.toLowerCase())) {
      searchTerms.unshift(merchant.toLowerCase());
    }
    return {
      destinationAccount: '',
      merchant,
      searchTerms
    };
  } catch (e) {
    throw new Error(`No se pudo parsear componentes: ${content}`);
  }
}
