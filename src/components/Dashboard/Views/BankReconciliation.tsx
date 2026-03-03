import React, { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { FileSpreadsheet, CheckCircle2, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { Transaction } from '../../../types';
import * as mongoApi from '../../../lib/mongoApi';
import { getStoredUser } from '../../../lib/auth';

interface BankEntry {
  fecha: string;
  descripcion: string;
  referencia: string;
  valor: number;
  rawLine: string;
}

interface BankReconciliationProps {
  transactions: Transaction[];
  onRefresh?: () => void;
}

const DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

function parseBankStatement(text: string): BankEntry[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  const entries: BankEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(/\t+/);

    if (parts.length < 2) continue;

    const fechaStr = parts[0].trim();
    if (!DATE_PATTERN.test(fechaStr)) continue; // saltar encabezado u otras filas

    const descripcion = parts[1]?.trim() || '';
    const referencia = parts[2]?.trim() || '';
    const valorStr = (parts[3] ?? parts[parts.length - 1] ?? '').trim().replace(/\s/g, '');

    if (!valorStr) continue;

    let valor = 0;
    const numMatch = valorStr.replace(/[$,]/g, '').match(/-?[\d.]+/);
    if (numMatch) {
      valor = Math.abs(parseFloat(numMatch[0].replace(/,/g, '')));
    }

    let fechaNorm = fechaStr;
    try {
      const d = parse(fechaStr, 'dd/MM/yyyy', new Date());
      fechaNorm = format(d, 'yyyy-MM-dd');
    } catch {
      // mantener formato original si falla
    }

    entries.push({ fecha: fechaNorm, descripcion, referencia, valor, rawLine: line });
  }

  return entries;
}

export function BankReconciliation({ transactions, onRefresh }: BankReconciliationProps) {
  const [bankText, setBankText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);

  const unmatchedEntries = useMemo(
    () => reconciliation.filter((r) => !r.matched).map((r) => r.entry),
    [reconciliation]
  );

  const handleQuickAdd = async (entry: BankEntry) => {
    const user = getStoredUser();
    if (!user) {
      toast.error('Sesión expirada');
      return;
    }
    setAddingId(entry.rawLine);
    try {
      await mongoApi.createTransaction({
        amount: entry.valor,
        description: entry.descripcion || 'Sin descripción',
        transaction_date: `${entry.fecha}T12:00:00.000Z`,
        category_id: null,
        reported: false,
        transaction_type: 'gasto manual',
        type: 'gasto',
        user_id: user.id,
        comment: entry.referencia || null,
        banco: 'Bancolombia'
      });
      toast.success('Agregada como pendiente. Clasifícala en Transacciones.');
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar');
    } finally {
      setAddingId(null);
    }
  };

  const handleAddAll = async () => {
    if (unmatchedEntries.length === 0) return;
    const user = getStoredUser();
    if (!user) {
      toast.error('Sesión expirada');
      return;
    }
    setAddingAll(true);
    let added = 0;
    try {
      for (const entry of unmatchedEntries) {
        await mongoApi.createTransaction({
          amount: entry.valor,
          description: entry.descripcion || 'Sin descripción',
          transaction_date: `${entry.fecha}T12:00:00.000Z`,
          category_id: null,
          reported: false,
          transaction_type: 'gasto manual',
          type: 'gasto',
          user_id: user.id,
          comment: entry.referencia || null,
          banco: 'Bancolombia'
        });
        added++;
      }
      toast.success(`${added} agregadas como pendientes. Clasifícalas en Transacciones.`);
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar');
      if (added > 0) onRefresh?.();
    } finally {
      setAddingAll(false);
    }
  };

  const bankEntries = useMemo(() => parseBankStatement(bankText), [bankText]);

  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'gasto').map((t) => ({
      ...t,
      dateKey: format(new Date(t.transaction_date), 'yyyy-MM-dd'),
      amount: Math.round(Number(t.amount)),
    })),
    [transactions]
  );

  const reconciliation = useMemo(() => {
    const usedTxIds = new Set<string>();
    return bankEntries.map((entry) => {
      const dateKey = entry.fecha.length === 10 ? entry.fecha : entry.fecha;
      const amount = Math.round(entry.valor);

      const candidates = expenseTransactions.filter(
        (t) =>
          t.dateKey === dateKey &&
          t.amount === amount &&
          !usedTxIds.has(t.id)
      );

      const matched = candidates[0] || null;
      if (matched) usedTxIds.add(matched.id);

      return {
        entry,
        matched,
      };
    });
  }, [bankEntries, expenseTransactions]);

  const filtered = useMemo(() => {
    if (filterStatus === 'matched') return reconciliation.filter((r) => r.matched);
    if (filterStatus === 'unmatched') return reconciliation.filter((r) => !r.matched);
    return reconciliation;
  }, [reconciliation, filterStatus]);

  const stats = useMemo(() => {
    const matched = reconciliation.filter((r) => r.matched).length;
    const unmatched = reconciliation.filter((r) => !r.matched).length;
    const totalBank = reconciliation.reduce((s, r) => s + r.entry.valor, 0);
    const totalMatched = reconciliation.filter((r) => r.matched).reduce((s, r) => s + r.entry.valor, 0);
    const totalUnmatched = reconciliation.filter((r) => !r.matched).reduce((s, r) => s + r.entry.valor, 0);
    return { matched, unmatched, totalBank, totalMatched, totalUnmatched };
  }, [reconciliation]);

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-xl p-4 md:p-6 border border-gray-700">
        <h2 className="text-lg md:text-xl font-semibold text-white flex items-center mb-4">
          <FileSpreadsheet className="h-5 w-5 md:h-6 md:w-6 mr-2" />
          Conciliación Bancaria
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Pega el extracto del banco (formato: Fecha, Descripción, Referencia, Valor separados por tabulador).
          Se comparará con tus transacciones registradas.
        </p>
        <textarea
          value={bankText}
          onChange={(e) => setBankText(e.target.value)}
          placeholder={`Fecha\tDescripción\tReferencia\tValor
03/03/2026\tCOMPRA EN RAPPI COLOMBIA*DL\t\t-$950
03/03/2026\tTRANSFERENCIAS A NEQUI\t\t-$200,000
...`}
          rows={8}
          className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white placeholder-gray-500 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {bankEntries.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-400">Total extracto</p>
              <p className="text-lg font-bold text-white">
                ${stats.totalBank.toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500">{bankEntries.length} movimientos</p>
            </div>
            <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50">
              <p className="text-xs text-green-400">En sistema</p>
              <p className="text-lg font-bold text-green-300">
                ${stats.totalMatched.toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-green-500">{stats.matched} coincidencias</p>
            </div>
            <div className="bg-amber-900/20 rounded-lg p-4 border border-amber-700/50">
              <p className="text-xs text-amber-400">Sin coincidir</p>
              <p className="text-lg font-bold text-amber-300">
                ${stats.totalUnmatched.toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-amber-500">{stats.unmatched} pendientes</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col gap-2">
              {stats.unmatched > 0 && (
                <button
                  onClick={handleAddAll}
                  disabled={addingAll}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {addingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Agregar todos ({stats.unmatched})
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded text-xs font-medium ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterStatus('matched')}
                  className={`px-3 py-1.5 rounded text-xs font-medium ${filterStatus === 'matched' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  En sistema
                </button>
                <button
                  onClick={() => setFilterStatus('unmatched')}
                  className={`px-3 py-1.5 rounded text-xs font-medium ${filterStatus === 'unmatched' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  Faltan
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Descripción (Banco)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">En sistema</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase w-24">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filtered.map((r, i) => (
                    <tr
                      key={i}
                      className={`${r.matched ? 'bg-green-900/10' : 'bg-amber-900/5'} hover:bg-gray-700/50`}
                    >
                      <td className="px-4 py-2">
                        {r.matched ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-300">{r.entry.fecha}</td>
                      <td className="px-4 py-2 text-white max-w-xs truncate" title={r.entry.descripcion}>
                        {r.entry.descripcion || '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-white">
                        ${r.entry.valor.toLocaleString('es-CO', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-2 text-gray-400">
                        {r.matched ? (
                          <span className="text-green-400 truncate max-w-xs block" title={r.matched.description}>
                            {r.matched.description}
                          </span>
                        ) : (
                          <span className="text-amber-400">No encontrado</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {!r.matched && (
                          <button
                            onClick={() => handleQuickAdd(r.entry)}
                            disabled={addingId === r.entry.rawLine}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
                            title="Agregar como pendiente (clasificar después)"
                          >
                            {addingId === r.entry.rawLine ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Agregar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
