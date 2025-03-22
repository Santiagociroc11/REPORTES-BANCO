import React, { useState } from 'react';
import { Download, FileSpreadsheet, File as FilePdf } from 'lucide-react';
import { Transaction, CustomCategory } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { getCategoryFullPath } from '../../utils/categories';

interface ReportGeneratorProps {
  transactions: Transaction[];
  startDate: Date;
  endDate: Date;
  categories?: CustomCategory[];
}

export function ReportGenerator({ transactions, startDate, endDate, categories }: ReportGeneratorProps) {
  const [loading, setLoading] = useState(false);

  const generateExcel = () => {
    setLoading(true);
    try {
      const data = transactions.map(t => {
        let fullCategory = 'Sin categoría';
        if (categories && t.category_id) {
          const found = categories.find(c => String(c.id) === String(t.category_id));
          if (found) {
            fullCategory = getCategoryFullPath(found, categories);
          }
        }
        return {
          Fecha: format(new Date(t.transaction_date), 'PPP', { locale: es }),
          Hora: format(new Date(t.transaction_date), 'hh:mm a', { locale: es }),
          Tipo: t.transaction_type,
          Monto: t.amount,
          Descripción: t.description,
          Comentario: t.comment || '',
          Categoría: fullCategory,
          Estado: t.reported ? 'Reportada' : 'Pendiente'
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

      const filename = `transacciones_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error generating Excel:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    setLoading(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text('Reporte de Transacciones', 14, 20);

      doc.setFontSize(12);
      doc.text(`Período: ${format(startDate, 'PPP', { locale: es })} - ${format(endDate, 'PPP', { locale: es })}`, 14, 30);

      const data = transactions.map(t => {
        let fullCategory = 'Sin categoría';
        if (categories && t.category_id) {
          const found = categories.find(c => String(c.id) === String(t.category_id));
          if (found) {
            fullCategory = getCategoryFullPath(found, categories);
          }
        }
        return [
          format(new Date(t.transaction_date), 'PPP', { locale: es }),
          format(new Date(t.transaction_date), 'hh:mm a', { locale: es }),
          t.transaction_type,
          `$${t.amount.toLocaleString('es-CO')}`,
          t.description,
          t.comment || '',
          fullCategory,
          t.reported ? 'Reportada' : 'Pendiente'
        ];
      });

      (doc as any).autoTable({
        startY: 40,
        head: [['Fecha', 'Hora', 'Tipo', 'Monto', 'Descripción', 'Comentario', 'Categoría', 'Estado']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      const filename = `transacciones_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex space-x-4">
      <button
        onClick={generateExcel}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-green-500 text-green-400 rounded-lg hover:bg-green-900/30 transition-colors"
      >
        <FileSpreadsheet className="h-5 w-5 mr-2" />
        Exportar Excel
      </button>
      <button
        onClick={generatePDF}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors"
      >
        <FilePdf className="h-5 w-5 mr-2" />
        Exportar PDF
      </button>
    </div>
  );
}
