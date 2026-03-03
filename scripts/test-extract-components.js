#!/usr/bin/env node
/**
 * Prueba la extracción de componentes por IA.
 * Uso: node scripts/test-extract-components.js "Compra en PETIT BOUTIQUE SANTA con tarjeta TDeb 1155"
 */

import 'dotenv/config';
import { extractComponents } from '../server/services/extractComponentsService.js';

const description = process.argv[2] || 'Compra en PETIT BOUTIQUE SANTA con tarjeta TDeb 1155';
const transactionType = 'compra con tarjeta';

async function main() {
  console.log('=== Entrada ===');
  console.log('Descripción:', description);
  console.log('Tipo:', transactionType);
  console.log('');

  try {
    const { merchant, searchTerms } = await extractComponents(description, transactionType);
    console.log('=== Componentes extraídos por IA ===');
    console.log('Comercio:', merchant);
    console.log('Términos de búsqueda:', searchTerms);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
