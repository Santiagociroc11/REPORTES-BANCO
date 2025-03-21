import React, { useState } from 'react';
import { Download, FileSpreadsheet, File as FilePdf } from 'lucide-react';
import { Transaction } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ReportGeneratorProps {
  transactions: Transaction[];
  startDate: Date;
  endDate: Date;
}

export function ReportGenerator({ transactions, startDate, endDate }: ReportGeneratorProps) {
  const [loading, setLoading] = useState(false);

  const generateExcel = () => {
    setLoading(true);
    try {
      const data = transactions.map(t => ({
        Fecha: format(new Date(t.transaction_date), 'PPP', { locale: es }),
        Hora: format(new Date(t.transaction_date), 'HH:mm', { locale: es }),
        Tipo: t.transaction_type,
        Monto: t.amount,
        Descripción: t.description,
        Categoría: t.category || 'Sin categoría',
        Estado: t.reported ? 'Reportada' : 'Pendiente'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
      
      // Generate filename with date range
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
      
      // Add title
      doc.setFontSize(16);
      doc.text('Reporte de Transacciones', 14, 20);
      
      // Add date range
      doc.setFontSize(12);
      doc.text(`Período: ${format(startDate, 'PPP', { locale: es })} - ${format(endDate, 'PPP', { locale: es })}`, 14, 30);

      // Prepare data for table
      const data = transactions.map(t => [
        format(new Date(t.transaction_date), 'PPP', { locale: es }),
        t.transaction_type,
        `$${t.amount.toLocaleString('es-CO')}`,
        t.description,
        t.category || 'Sin categoría',
        t.reported ? 'Reportada' : 'Pendiente'
      ]);

      // Add table
      (doc as any).autoTable({
        startY: 40,
        head: [['Fecha', 'Tipo', 'Monto', 'Descripción', 'Categoría', 'Estado']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Generate filename with date range
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