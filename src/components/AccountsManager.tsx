import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Search,
  Printer,
  Clock,
  History,
  Calendar,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Percent,
  User,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Check,
  CheckCircle,
  Filter,
  CreditCard,
  Building2,
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  db,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  Timestamp
} from '../firebase';
import { toast } from 'sonner';

// Type definitions
interface PayableRecord {
  id: string;
  category: string;
  description: string;
  supplierName: string;
  value: number;
  dueDate: string;
  status: 'Pendente' | 'Pago';
  paymentDate?: string;
  paymentMethod?: string;
  pixAccountId?: string;
  notes?: string;
  companyId: string;
  createdAt: any;
}

interface ReceivableRecord {
  id: string;
  category: string;
  description: string;
  clientName: string;
  clientId?: string;
  value: number;
  dueDate: string;
  status: 'Pendente' | 'Pago';
  paymentDate?: string;
  paymentMethod?: string;
  pixAccountId?: string;
  notes?: string;
  isContractPrediction?: boolean;
  referenceMonth?: string;
  companyId: string;
  createdAt: any;
}

// ----------------------------------------------------
// Safe string normalization helper for accent-insensitive comparisons
// ----------------------------------------------------
const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

// ----------------------------------------------------
// DoubleScrollContainer component for top + bottom scrollbars in listings
// ----------------------------------------------------
const DoubleScrollContainer = ({ children }: { children: React.ReactNode }) => {
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const isScrollingTop = React.useRef(false);
  const isScrollingBottom = React.useRef(false);
  const [showTopScroll, setShowTopScroll] = React.useState(false);
  const [scrollWidth, setScrollWidth] = React.useState(0);

  const handleTopScroll = () => {
    if (isScrollingBottom.current) return;
    if (topScrollRef.current && bottomScrollRef.current) {
      isScrollingTop.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      setTimeout(() => { isScrollingTop.current = false; }, 50);
    }
  };

  const handleBottomScroll = (e: any) => {
    if (isScrollingTop.current) return;
    if (topScrollRef.current && e.target) {
      isScrollingBottom.current = true;
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
      setTimeout(() => { isScrollingBottom.current = false; }, 50);
    }
  };

  React.useEffect(() => {
    const bottomWrapper = bottomScrollRef.current;
    if (!bottomWrapper) return;

    const syncWidth = () => {
      if (bottomWrapper) {
        const contentWidth = bottomWrapper.scrollWidth;
        const containerWidth = bottomWrapper.clientWidth;
        
        setScrollWidth(contentWidth);
        const shouldShow = contentWidth > containerWidth + 5;
        setShowTopScroll(shouldShow);
      }
    };

    // Run synchronization initially
    syncWidth();
    const t = setTimeout(syncWidth, 100);

    // Watch resize of bottom container
    const resizeObserver = new ResizeObserver(() => {
      syncWidth();
    });
    resizeObserver.observe(bottomWrapper);

    // Watch resize of any nested first child inside bottomWrapper (the table)
    let observedElement: Element | null = null;
    const updateObservation = () => {
      if (observedElement) {
        resizeObserver.unobserve(observedElement);
      }
      const newTarget = bottomWrapper.firstElementChild;
      if (newTarget) {
        resizeObserver.observe(newTarget);
        observedElement = newTarget;
      }
      syncWidth();
    };

    updateObservation();

    // Setup mutation observer to watch inside the bottom scroll wrapper for row or list loads
    const mutationObserver = new MutationObserver(() => {
      updateObservation();
    });
    mutationObserver.observe(bottomWrapper, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Handle window resize dynamically
    window.addEventListener('resize', syncWidth);

    // Bulletproof periodic synchronization container width fallback
    const syncInterval = setInterval(syncWidth, 1000);

    return () => {
      clearTimeout(t);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', syncWidth);
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <div className="flex flex-col w-full relative group/scroll" style={{ direction: 'ltr' }}>
      {scrollWidth > 0 && (
        <div 
          ref={topScrollRef} 
          onScroll={handleTopScroll}
          className="w-full overflow-x-auto overflow-y-hidden bg-[#0f1115] border-b border-[#2d3139]/30 rounded-t-lg transition-all"
          style={{ 
            height: '14px', 
            display: showTopScroll ? 'block' : 'none',
            direction: 'ltr'
          }}
        >
          <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
        </div>
      )}

      <div 
        className="w-full overflow-y-auto overflow-x-hidden flex-1 scroll-left-container custom-scrollbar pr-0 rounded-b-xl border border-[#2d3139]/60"
        style={{ direction: 'rtl', maxHeight: '550px' }}
      >
        <div 
          ref={bottomScrollRef} 
          onScroll={handleBottomScroll}
          className="w-full overflow-x-auto overflow-y-visible"
          style={{ direction: 'ltr' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// Safe parse date helper to avoid crashes
// ----------------------------------------------------
const safeParseDate = (date: any): Date => {
  if (!date) return new Date();
  if (date instanceof Date) {
    const d = new Date(date);
    if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(12);
    return d;
  }
  if (date && typeof date.toDate === 'function') {
    const d = date.toDate();
    if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(12);
    return d;
  }
  if (date && date.seconds !== undefined) {
    const d = new Date(date.seconds * 1000);
    if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(12);
    return d;
  }
  if (typeof date === 'string') {
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = date.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
    if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = date.split('/').map(Number);
      return new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
    }
    if (date.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const parts = date.split('-').map(Number);
      return new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
    }
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(12);
      return d;
    }
  }
  return new Date();
};

// ----------------------------------------------------
// Helper to calculate payment stats for partial/installment payments
// ----------------------------------------------------
const getRecordPaymentsInfo = (r: any) => {
  const partialSum = (r?.partialPayments || []).reduce((acc: number, pay: any) => acc + Number(pay?.value || 0), 0);
  if (r?.status === 'Pago') {
    return {
      paid: Number(r?.value || 0),
      remaining: 0,
      isFullyPaid: true
    };
  }
  return {
    paid: partialSum,
    remaining: Math.max(0, Number(r?.value || 0) - partialSum),
    isFullyPaid: false
  };
};

// ----------------------------------------------------
// Helper to convert real currency to words (por extenso)
// ----------------------------------------------------
function valorPorExtenso(valor: number): string {
  if (valor === 0) return 'zero reais';

  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenas10_19 = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const escreverGrupo = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    
    let str = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (c > 0) {
      str += centenas[c];
    }

    if (d > 0 || u > 0) {
      if (str !== '') str += ' e ';
      if (d === 1) {
        str += dezenas10_19[u];
      } else {
        if (d > 1) {
          str += dezenas[d];
          if (u > 0) str += ' e ' + unidades[u];
        } else if (u > 0) {
          str += unidades[u];
        }
      }
    }
    return str;
  };

  const parteInteira = Math.floor(valor);
  const centavos = Math.round((valor - parteInteira) * 100);

  let resultado = '';

  if (parteInteira > 0) {
    const milhoes = Math.floor(parteInteira / 1000000) % 1000;
    const milhares = Math.floor(parteInteira / 1000) % 1000;
    const unidadesSimples = parteInteira % 1000;

    const grupos: string[] = [];

    if (milhoes > 0) {
      grupos.push(escreverGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
    }
    if (milhares > 0) {
      if (milhares === 1) {
        grupos.push('mil');
      } else {
        grupos.push(escreverGrupo(milhares) + ' mil');
      }
    }
    if (unidadesSimples > 0) {
      grupos.push(escreverGrupo(unidadesSimples));
    }

    if (grupos.length > 1) {
      const lastGroupVal = unidadesSimples;
      if (lastGroupVal > 0 && (lastGroupVal < 100 || lastGroupVal % 100 === 0)) {
        const lastPart = grupos.pop();
        resultado = grupos.join(', ') + ' e ' + lastPart;
      } else {
        resultado = grupos.join(' ');
      }
    } else {
      resultado = grupos[0];
    }

    resultado += (parteInteira === 1 ? ' real' : ' reais');
  }

  if (centavos > 0) {
    const centavosTexto = escreverGrupo(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
    if (resultado !== '') {
      resultado += ' e ' + centavosTexto;
    } else {
      resultado = centavosTexto;
    }
  }

  // Capitalize first characters of major words for elegant Brazilian standard
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

// ----------------------------------------------------
// Helper to print partial and full payment receipts with discrimination of values
// ----------------------------------------------------
const printRecordReceipt = (r: any, isPayable: boolean, currentPayment: { date: string, value: number, paymentMethod: string }, appSettings?: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const title = 'R  E  C  I  B  O';
  const personLabel = isPayable ? 'Favorecido (Fornecedor):' : 'Pagador (Cliente):';
  const personName = isPayable ? (r.supplierName || 'Fornecedor N/A') : (r.clientName || r.clientNameInput || r.client?.name || 'Cliente N/A');

  const totalValue = Number(r.value || 0);
  const originalDateStr = r.dueDate ? format(safeParseDate(r.dueDate), 'dd/MM/yyyy') : (r.date ? format(safeParseDate(r.date), 'dd/MM/yyyy') : 'N/A');

  // Build the complete list of payments to show, ensuring we capture all historic partialPayments 
  // along with the current payment we just registered.
  const paymentsList = [...(r.partialPayments || [])];
  const currentExists = paymentsList.some(p => p.date === currentPayment.date && Math.abs(Number(p.value) - currentPayment.value) < 0.01 && p.paymentMethod === currentPayment.paymentMethod);
  if (!currentExists) {
    paymentsList.push(currentPayment);
  }

  // Calculate remaining balance dynamically
  const totalPaid = paymentsList.reduce((sum, p) => sum + Number(p.value || 0), 0);
  const remainingValue = Math.max(0, totalValue - totalPaid);

  const latestPaymentDateStr = currentPayment.date ? format(safeParseDate(currentPayment.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');

  // Set margins and positions
  const margin = 20;
  const contentWidth = 170; // 210 - 40
  let y = 25;

  // Title / Accent header
  doc.setFillColor(15, 23, 42); // Primary dark slate
  doc.rect(margin, y, contentWidth, 18, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 105, y + 11, { align: 'center' });
  y += 26;

  // Document Info Table
  const tableHeight = 50;
  doc.setFillColor(248, 250, 252); // Light background grey for details table
  doc.rect(margin, y, contentWidth, tableHeight, 'F');
  doc.setDrawColor(203, 213, 225); // Slightly stronger border
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, tableHeight, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(47, 55, 70); // Darker gray Slate-800 for high readability

  // Column Labels
  doc.text('DESCRICAO:', margin + 6, y + 8);
  doc.text(personLabel.toUpperCase(), margin + 6, y + 16);
  doc.text('CATEGORIA:', margin + 6, y + 24);
  doc.text('MEIO UTILIZADO / DATA:', margin + 6, y + 32);
  
  // Bold contrast for paid value label
  doc.setTextColor(15, 23, 42); 
  doc.text('VALOR PAGO:', margin + 6, y + 40);
  
  doc.setTextColor(47, 55, 70);
  doc.text('DOC ID:', margin + 6, y + 46);

  // Column Values
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  
  doc.text(String(r.description || 'N/A').toUpperCase(), margin + 65, y + 8);
  doc.text(String(personName || 'N/A').toUpperCase(), margin + 65, y + 16);
  doc.text(String(r.category || 'N/A').toUpperCase(), margin + 65, y + 24);
  doc.text(`${currentPayment.paymentMethod.toUpperCase()} em ${latestPaymentDateStr}`, margin + 65, y + 32);
  
  // Highlighted bold value in dark text for maximal contrast
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`R$ ${Number(currentPayment.value).toFixed(2).replace('.', ',')}`, margin + 65, y + 40);
  
  doc.setFont('Courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(String(r.id ? r.id.toUpperCase() : 'N/A'), margin + 65, y + 46);

  y += tableHeight + 10;

  // Discrimination of Values Section - Standard Receipt vs. Recibo com Histórico (Parcelado)
  const isParcelado = paymentsList.length > 1 || r.status === 'Parcial';

  if (isParcelado) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('DISCRIMINACAO DE VALORES', margin, y);
    y += 6;

    // Let's draw horizontal line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    // Item list header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(47, 55, 70); // Darker contrast
    doc.text('DESCRICAO', margin + 4, y);
    doc.text('VALOR', 125, y, { align: 'right' });
    doc.text('DATA', 170, y, { align: 'right' });
    y += 4;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    doc.setFont('Courier', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // High-contrast text

    // Item 1: Valor Total do Servico
    doc.text('Valor Total do Servico', margin + 4, y);
    doc.text(`R$ ${totalValue.toFixed(2).replace('.', ',')}`, 125, y, { align: 'right' });
    doc.text(originalDateStr, 170, y, { align: 'right' });
    y += 8;

    // Draw dashed line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y - 2, margin + contentWidth, y - 2);

    // Items: Historic Payments
    paymentsList.forEach((p, idx) => {
      const payDateStr = p.date ? format(safeParseDate(p.date), 'dd/MM/yyyy') : 'N/A';
      const label = `Valor Pago${paymentsList.length > 1 ? ` #${idx + 1}` : ''}`;
      
      doc.setFont('Courier', 'bold'); // Change from normal to bold for maximum reading comfort
      doc.text(label, margin + 4, y);
      doc.text(`R$ ${Number(p.value).toFixed(2).replace('.', ',')}`, 125, y, { align: 'right' });
      doc.text(payDateStr, 170, y, { align: 'right' });
      y += 8;

      doc.line(margin, y - 2, margin + contentWidth, y - 2);
    });

    // Saldo Restante
    y += 2;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    doc.setFont('Courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Saldo Restante', margin + 4, y);
    doc.text(`R$ ${remainingValue.toFixed(2).replace('.', ',')}`, 125, y, { align: 'right' });
    doc.text(latestPaymentDateStr, 170, y, { align: 'right' });

    y += 15;

    // Observacao/Aviso
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const textNote = '* Este recibo comprova a transacao financeira realizada. O saldo devedor restante e atualizado dinamicamente a cada baixa efetuada.';
    const wrappedLines = doc.splitTextToSize(textNote, contentWidth);
    wrappedLines.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 4;
    });

    y += 10;
  } else {
    // Standard default receipt: "Recibo Padrão" without separate installment breakdown lines & without balance remaining
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('DECLARACAO DE QUITACAO', margin, y);
    y += 6;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + contentWidth, y);
    y += 10;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59); // Slate-800

    const valorExtensoStr = valorPorExtenso(Number(currentPayment.value));
    const valueFormatted = Number(currentPayment.value).toFixed(2).replace('.', ',');
    const valorComExtenso = `R$ ${valueFormatted} (${valorExtensoStr})`;
    
    const pNameUpper = String(personName || 'N/A').toUpperCase();
    const cNameUpper = String(appSettings?.companyName || 'AF SUPORTE TECNICO EM SEG. E INF.').toUpperCase();

    let statementText = '';
    if (isPayable) {
      statementText = `Declaramos para os devidos fins e efeitos de direito que o valor de ${valorComExtenso} foi integralmente pago pela empresa ${cNameUpper} ao favorecido ${pNameUpper} via ${currentPayment.paymentMethod.toUpperCase()}.`;
    } else {
      statementText = `Declaramos para os devidos fins e efeitos de direito que o valor de ${valorComExtenso} foi recebido de ${pNameUpper} por ${cNameUpper} via ${currentPayment.paymentMethod.toUpperCase()}, referente ao pagamento de: "${String(r.description || 'N/A').toUpperCase()}".`;
    }

    statementText += `\n\nPor se tratar da liquidacao integral deste documento, damos por este meio a plena, geral e irrevogavel quitacao do valor recebido, para nada mais haver a pleitear ou reclamar sobre o objeto deste recibo.`;

    const wrappedStatement = doc.splitTextToSize(statementText, contentWidth);
    wrappedStatement.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 5.5;
    });

    y += 15;
  }

  // City, Date and Address string
  const formatReceiptFullDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  };

  const city = appSettings?.city || 'Belém/PA';
  const paymentDateObj = currentPayment.date ? safeParseDate(currentPayment.date) : new Date();
  const dateString = `${city}, ${formatReceiptFullDate(paymentDateObj)}`;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(dateString, 105, y, { align: 'center' });

  const sigY = y + 22;

  if (isPayable) {
    // For Contas a Pagar: The Favored/Supplier signs the receipt proving they received the payment.
    // Ensure we do NOT draw our own company's digital signature image here!
    
    // Draw signature line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(105 - 45, sigY, 105 + 45, sigY);

    // Under signature line text - displays recipient / supplier details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(String(personName).toUpperCase(), 105, sigY + 5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('FAVORECIDO / RECEBEDOR', 105, sigY + 10, { align: 'center' });
  } else {
    // For Contas a Receber: Our company receives money from client, so our company signs.
    if (appSettings?.signatureUrl) {
      try {
        doc.addImage(appSettings.signatureUrl, 'PNG', 105 - 25, sigY - 14, 50, 13);
      } catch (imgErr) {
        console.warn('Could not draw signature image:', imgErr);
      }
    }

    // Draw signature line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(105 - 45, sigY, 105 + 45, sigY);

    // Under signature line text
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(String(appSettings?.companyName || 'SEGURTEC-PRO').toUpperCase(), 105, sigY + 5, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(appSettings?.responsible || 'André').toUpperCase(), 105, sigY + 10, { align: 'center' });
    if (appSettings?.document) {
      doc.text(`CNPJ/CPF: ${appSettings.document}`, 105, sigY + 14, { align: 'center' });
    }
  }

  y = sigY + 22;

  // Footer text
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Comprovante emitido eletronicamente via Sistema Integrado SegurTec-Pro.', 105, y, { align: 'center' });

  // Save the receipt PDF
  const filename = `recibo_${String(personName).replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(filename);
};

// ----------------------------------------------------
// 1. ACCOUNTS PAYABLE (CONTAS A PAGAR REAL)
// ----------------------------------------------------
interface PayableManagerProps {
  companyId: string;
  suppliers: any[];
  pixSettings: any;
  appSettings?: any;
}

export function PayableManager({ companyId, suppliers = [], pixSettings, appSettings }: PayableManagerProps) {
  const [payables, setPayables] = useState<PayableRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Pago'>('Todos');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<PayableRecord | null>(null);
  const [payType, setPayType] = useState<'total' | 'partial'>('total');
  const [payAmount, setPayAmount] = useState<string>('');
  const [generateReceiptOnPay, setGenerateReceiptOnPay] = useState<boolean>(true);

  // Reference Period States for Contas a Pagar
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const currentMonthYearStr = useMemo(() => {
    return `${String(selectedMonth + 1).padStart(2, '0')}/${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const years = [2024, 2025, 2026, 2027];

  // Helper to calculate days to due date for payables list
  const getDueDaysInfoPayable = (dueDateStr: string, status: string) => {
    if (status === 'Pago') {
      return { 
        label: 'PG / LIQUIDADO', 
        color: 'text-green-400 bg-green-500/10 border-green-500/20 border' 
      };
    }
    if (!dueDateStr) {
      return { 
        label: 'A DEFINIR', 
        color: 'text-gray-400 bg-gray-500/10 border-gray-500/20 border' 
      };
    }
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = safeParseDate(dueDateStr);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const days = Math.abs(diffDays);
        return {
          label: `${days} ${days === 1 ? 'dia' : 'dias'} em atraso`,
          color: 'text-red-400 bg-red-500/15 border-red-500/30 border'
        };
      } else if (diffDays === 0) {
        return {
          label: 'Hoje!',
          color: 'text-orange-400 bg-orange-500/15 border-orange-500/30 border font-bold animate-pulse'
        };
      } else {
        return {
          label: `Faltam ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
          color: 'text-blue-400 bg-blue-500/15 border-blue-500/30 border'
        };
      }
    } catch (err) {
      return { label: 'INVÁLIDO', color: 'text-gray-400 border' };
    }
  };

  const defaultCategories = ['Peças', 'Energia', 'Internet/Chip', 'Aluguel', 'Salários', 'Impostos', 'Softwares', 'Outros'];
  const categoriesToUse = appSettings?.payableCategories && appSettings.payableCategories.length > 0
    ? appSettings.payableCategories
    : defaultCategories;

  const destinationsToUse = appSettings?.payableDestinations && appSettings.payableDestinations.length > 0
    ? appSettings.payableDestinations
    : (suppliers || []).map((s: any) => s.name);

  // Form states
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [supplierName, setSupplierName] = useState('');
  const [category, setCategory] = useState('Peças');
  const [notes, setNotes] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Cartão'>('PIX');
  const [pixAccountId, setPixAccountId] = useState('');

  // Firebase subscription
  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, 'payables'),
      where('companyId', '==', companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PayableRecord));
      // Sort by due date (closest first)
      list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      setPayables(list);
    }, (err) => {
      toast.error('Erro ao carregar contas a pagar de tempo real.');
      console.error(err);
    });
    return () => unsubscribe();
  }, [companyId]);

  // Form reset helpers
  const resetForm = () => {
    setDescription('');
    setValue('');
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setSupplierName('');
    setCategory('Peças');
    setNotes('');
  };

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value || !dueDate) {
      toast.error('Por favor, preencha a descrição, valor e vencimento.');
      return;
    }
    try {
      await addDoc(collection(db, 'payables'), {
        companyId,
        description,
        value: Number(value),
        dueDate,
        supplierName: supplierName || 'Avulso',
        category,
        notes,
        status: 'Pendente',
        createdAt: Timestamp.now()
      });
      toast.success('Conta a pagar cadastrada com sucesso!');
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Erro ao cadastrar conta a pagar.');
      console.error(err);
    }
  };

  const handleUpdatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;
    if (!description || !value || !dueDate) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      await updateDoc(doc(db, 'payables', selectedPayable.id), {
        description,
        value: Number(value),
        dueDate,
        supplierName: supplierName || 'Avulso',
        category,
        notes
      });
      toast.success('Lançamento atualizado!');
      setIsEditOpen(false);
    } catch (err) {
      toast.error('Erro ao atualizar.');
      console.error(err);
    }
  };

  const handleDeletePayable = async (id: string) => {
    if (!confirm('Deseja realmente remover esta conta a pagar?')) return;
    try {
      await deleteDoc(doc(db, 'payables', id));
      toast.success('Conta a pagar removida.');
    } catch (err) {
      toast.error('Erro ao remover.');
      console.error(err);
    }
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable) return;
    const info = getRecordPaymentsInfo(selectedPayable);
    const finalAmount = payType === 'total' ? info.remaining : Number(payAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast.error('Por favor, insira um valor válido para a baixa.');
      return;
    }
    const currentPaidSum = info.paid;
    const newPaidSum = currentPaidSum + finalAmount;
    const finalStatus = newPaidSum >= Number(selectedPayable.value) - 0.01 ? 'Pago' : 'Parcial';

    try {
      const newPayment = {
        date: payDate,
        value: finalAmount,
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : '',
        notes: payType === 'partial' ? 'Baixa parcial' : 'Baixa de saldo integral'
      };
      
      const updatedPayments = [...(selectedPayable.partialPayments || []), newPayment];

      // 1. Update status in payables
      await updateDoc(doc(db, 'payables', selectedPayable.id), {
        status: finalStatus,
        paymentDate: payDate,
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : '',
        partialPayments: updatedPayments
      });

      // 2. Add despesa to cash flow (financial)
      await addDoc(collection(db, 'financial'), {
        companyId,
        type: 'Despesa',
        category: selectedPayable.category || 'Contas a Pagar',
        description: payType === 'partial' 
          ? `Baixa Parcial: ${selectedPayable.description} (${selectedPayable.supplierName})`
          : `Baixa Integral: ${selectedPayable.description} (${selectedPayable.supplierName})`,
        value: finalAmount,
        date: payDate,
        origin: 'Contas a Pagar',
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : '',
        createdAt: Timestamp.now()
      });

      toast.success(finalStatus === 'Pago' ? 'Pagamento liquidado e lançado no caixa!' : 'Baixa parcial registrada com sucesso!');
      
      // Print dynamic installment receipt if requested
      if (generateReceiptOnPay) {
        try {
          printRecordReceipt(selectedPayable, true, newPayment, appSettings);
        } catch (printErr) {
          console.error('Error printing receipt:', printErr);
        }
      }
      
      setIsPayOpen(false);
    } catch (err) {
      toast.error('Erro ao pagar.');
      console.error(err);
    }
  };

  // Filtered by Period
  const filteredPayablesByPeriod = useMemo(() => {
    return payables.filter(p => {
      let isSamePeriod = false;
      if (p.dueDate) {
        try {
          const d = safeParseDate(p.dueDate);
          if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
            isSamePeriod = true;
          }
        } catch (_) {}
      } else if (p.createdAt) {
        try {
          const d = safeParseDate(p.createdAt);
          if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
            isSamePeriod = true;
          }
        } catch (_) {}
      }
      return isSamePeriod;
    });
  }, [payables, selectedMonth, selectedYear]);

  // Filtered and Searched list
  const filteredPayables = useMemo(() => {
    return filteredPayablesByPeriod.filter(p => {
      const matchesSearch = 
        (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter || (statusFilter === 'Pendente' && p.status === 'Parcial');
      return matchesSearch && matchesStatus;
    });
  }, [filteredPayablesByPeriod, searchTerm, statusFilter]);

  // Dash details
  const stats = useMemo(() => {
    const totals = filteredPayablesByPeriod.reduce((acc, p) => {
      const info = getRecordPaymentsInfo(p);
      acc.totalMonth += info.remaining;
      acc.totalPaid += info.paid;
      if (info.remaining > 0) {
        acc.totalPendingCount += 1;
      }
      return acc;
    }, { totalMonth: 0, totalPaid: 0, totalPendingCount: 0 });
    
    return totals;
  }, [filteredPayablesByPeriod]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2d3139]/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic text-red-400">Contas a Pagar</h2>
            <Badge className="bg-red-500/10 text-red-400 font-black border border-red-500/20 text-[9px] uppercase px-2 py-0.5 animate-pulse">Ativo</Badge>
          </div>
          <p className="text-[#a0a0a0] text-sm uppercase tracking-[0.2em] font-medium">Controle real de saídas de caixa, despesas fixas e fornecedores.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Month/Year selector for reference period */}
          <div className="flex bg-[#0f1115] border border-[#2d3139] p-1.5 rounded-lg gap-1">
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="bg-transparent border-none text-white h-8 text-[11px] font-bold uppercase w-28 select-menu">
                <span className="flex flex-1 text-left">
                  {format(new Date(2022, selectedMonth, 10, 12, 0, 0), 'MMMM', { locale: ptBR }).toUpperCase()}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>{format(new Date(2022, i, 10, 12, 0, 0), 'MMMM', { locale: ptBR }).toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="bg-transparent border-none text-white h-8 text-[11px] font-bold w-18 select-menu">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-500 hover:bg-red-600 text-white font-bold uppercase tracking-wider text-xs px-4 h-11" onClick={resetForm}>
                <Plus size={16} className="mr-2" />
                Lançar Conta a Pagar
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg italic font-black uppercase text-red-400">Novo Lançamento</DialogTitle>
                <DialogDescription className="text-gray-400 text-xs text-left">Cadastre um compromisso financeiro para pagamento futuro.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePayable} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="desc" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Descrição comercial</Label>
                  <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Conta de Luz de Junho" className="bg-[#0f1115] border-[#2d3139]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="val" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Valor total (R$)</Label>
                    <Input id="val" type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" className="bg-[#0f1115] border-[#2d3139] font-mono text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="due" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Vencimento</Label>
                    <Input id="due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Destino</Label>
                    <Select value={supplierName} onValueChange={setSupplierName}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Avulso">Avulso / Nenhum</SelectItem>
                        {destinationsToUse.map((dest: string, idx: number) => (
                          <SelectItem key={idx} value={dest}>{dest}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {categoriesToUse.map((cat: string, idx: number) => (
                          <SelectItem key={idx} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono">Notas Importantes</Label>
                  <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações opcionais de boleto, chave Pix ou contato." className="bg-[#0f1115] border-[#2d3139] h-16 min-h-16" />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" className="bg-red-500 hover:bg-red-600 font-mono font-bold w-full">LANÇAR CONTA</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a0a0a0] font-bold uppercase tracking-wider">Total em Aberto ({currentMonthYearStr})</span>
              <ArrowUpRight className="text-red-400 h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-white mt-1 font-mono">R$ {stats.totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">{stats.totalPendingCount} compromissos pendentes</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a0a0a0] font-bold uppercase tracking-wider">Total Pago ({currentMonthYearStr})</span>
              <CheckCircle className="text-green-400 h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-white mt-1 font-mono">R$ {stats.totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Baixado direto no fluxo de despesas</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a0a0a0] font-bold uppercase tracking-wider">Proporção Operacional ({currentMonthYearStr})</span>
              <TrendingUp className="text-blue-400 h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-white mt-1 font-mono">
              {filteredPayablesByPeriod.length > 0 ? ((stats.totalPaid / (stats.totalMonth + stats.totalPaid || 1)) * 100).toFixed(0) : 0}%
            </p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Taxa de Liquidação Financeira</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1a1d23] border-[#2d3139] text-white shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-4">
          <div>
            <CardTitle className="text-md uppercase italic font-bold text-white flex items-center gap-2">
              <ArrowUpRight className="text-red-400" size={18} />
              Lista de Obrigações de Caixa
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">Exibição de todos os títulos duplicatas, despesas recorrentes ou suprimentos para o período selecionado de {currentMonthYearStr}.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar contas a pagar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-[#0f1115] border-[#2d3139] text-white text-xs h-9"
              />
            </div>
            <div className="flex bg-[#0f1115] p-1.5 border border-[#2d3139] rounded-lg gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(['Todos', 'Pendente', 'Pago'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded transition ${statusFilter === f ? 'bg-red-500 text-white' : 'text-[#71717a] hover:text-white'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-y-auto custom-scrollbar scroll-left-container">
          {filteredPayables.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
              <Building2 className="text-[#2d3139] h-12 w-12 mb-3" />
              <p className="text-xs font-bold text-white uppercase">Nenhuma conta encontrada</p>
              <p className="text-[11px] text-[#71717a] mt-1">Crie listagens de despesas para acompanhar suas liquidações e caixa em {currentMonthYearStr}.</p>
            </div>
          ) : (
            <DoubleScrollContainer>
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[#0f1115] border-b border-[#2d3139] text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                    <th className="p-4">Destino</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4">Valor</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Dias p/ Vencer</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3139]/40">
                   {filteredPayables.map((p) => {
                     const recInfo = getRecordPaymentsInfo(p);
                     return (
                       <tr key={p.id} className="hover:bg-[#2d3139]/10 transition-colors">
                         <td className="p-4 font-semibold text-white flex items-center gap-2">
                           <Building2 size={12} className="text-gray-400" />
                           {p.supplierName}
                         </td>
                         <td className="p-4 text-gray-300">
                           <div>{p.description}</div>
                           {p.notes && <p className="text-[10px] text-gray-500 font-mono mt-0.5">{p.notes}</p>}
                           
                           {p.partialPayments && (p.status === 'Parcial' || p.partialPayments.length > 1) && (
                             <div className="text-[10px] text-zinc-500 mt-2 space-y-1 bg-[#0f1115]/50 p-2.5 rounded-lg border border-[#2d3139]/30 max-w-[320px]">
                               <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-400 font-mono block">Histórico de Baixas Parciais:</span>
                               {p.partialPayments.map((pay: any, idx: number) => (
                                 <div key={idx} className="flex justify-between items-center font-mono">
                                   <span>{idx + 1}. {pay.date ? format(safeParseDate(pay.date), 'dd/MM/yyyy') : 'N/A'} ({pay.paymentMethod}):</span>
                                   <span className="text-red-400 font-bold ml-2">R$ {Number(pay.value).toFixed(2)}</span>
                                 </div>
                               ))}
                             </div>
                           )}
                         </td>
                         <td className="p-4">
                           <Badge className="bg-red-400/5 text-red-400 border border-red-500/10 text-[9px] uppercase">{p.category}</Badge>
                         </td>
                         <td className="p-4 text-gray-400">
                           {p.dueDate ? format(safeParseDate(p.dueDate), 'dd/MM/yyyy') : 'N/A'}
                         </td>
                         <td className="p-4 font-mono font-bold text-red-400">
                           R$ {Number(p.value).toFixed(2)}
                         </td>
                         <td className="p-4">
                           {p.status === 'Pago' ? (
                             <Badge className="bg-green-500/15 text-green-400 border border-green-500/20 uppercase text-[9px]">PAGO ({p.paymentDate ? format(safeParseDate(p.paymentDate), 'dd/MM') : ''})</Badge>
                           ) : p.status === 'Parcial' ? (
                             <div className="flex flex-col gap-1 items-start">
                               <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase text-[9px]">PAGO PARCIAL</Badge>
                               <span className="text-[10px] text-gray-500 font-mono">Resta R$ {recInfo.remaining.toFixed(2)}</span>
                             </div>
                           ) : (
                             <Badge className="bg-yellow-500/15 text-yellow-500 border border-yellow-500/20 uppercase text-[9px]">PENDENTE</Badge>
                           )}
                         </td>
                         <td className="p-4">
                           {(() => {
                             const state = getDueDaysInfoPayable(p.dueDate, p.status);
                             return (
                               <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${state.color}`}>
                                 {state.label}
                               </span>
                             );
                           })()}
                         </td>
                         <td className="p-4 text-right">
                           <div className="flex justify-end gap-1.5 matches-box">
                             {p.status !== 'Pago' && (
                               <Button
                                 onClick={() => {
                                   setSelectedPayable(p);
                                   setPayDate(format(new Date(), 'yyyy-MM-dd'));
                                   setPayType('total');
                                   setPayAmount(recInfo.remaining.toFixed(2));
                                   if (pixSettings?.accounts?.length > 0) {
                                     setPixAccountId(pixSettings.accounts[0].id);
                                   } else {
                                     setPixAccountId('');
                                   }
                                   setIsPayOpen(true);
                                 }}
                                 className="bg-green-500 hover:bg-green-600 text-white font-bold h-7 px-2.5 text-[10px] uppercase tracking-wider"
                                 title="Dar Baixa"
                               >
                                 <Check size={12} className="mr-1" />
                                 Baixar
                               </Button>
                             )}
                             {(p.status === 'Pago' || p.status === 'Parcial' || (p.partialPayments && p.partialPayments.length > 0)) && (
                               <Button
                                 onClick={() => {
                                   const lastPayment = p.partialPayments?.[p.partialPayments.length - 1] || {
                                     date: p.paymentDate || p.dueDate || p.date || format(new Date(), 'yyyy-MM-dd'),
                                     value: Number(p.value),
                                     paymentMethod: p.paymentMethod || 'Outro',
                                   };
                                   printRecordReceipt(p, true, lastPayment, appSettings);
                                 }}
                                 variant="ghost"
                                 size="icon"
                                 className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/10 border border-green-500/20 mr-1"
                                 title="Reimprimir Comprovante"
                               >
                                 <Printer size={12} />
                               </Button>
                             )}
                          <Button
                            onClick={() => {
                              setSelectedPayable(p);
                              setDescription(p.description || '');
                              setValue(String(p.value));
                              setDueDate(p.dueDate || '');
                              setSupplierName(p.supplierName || 'Avulso');
                              setCategory(p.category || 'Peças');
                              setNotes(p.notes || '');
                              setIsEditOpen(true);
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-white border border-[#2d3139]/40"
                            title="Editar Dados"
                          >
                            <Edit size={12} />
                          </Button>
                          <Button
                            onClick={() => handleDeletePayable(p.id)}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:bg-red-500/10 border border-red-500/25"
                            title="Excluir"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </DoubleScrollContainer>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-md italic font-black uppercase text-red-400">Editar Detalhes</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePayable} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-[#0f1115] border-[#2d3139]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Valor total (R$)</Label>
                <Input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="bg-[#0f1115] border-[#2d3139] font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Vencimento</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#0f1115] border-[#2d3139]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Destino</Label>
                <Select value={supplierName} onValueChange={setSupplierName}>
                  <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    <SelectItem value="Avulso">Avulso</SelectItem>
                    {destinationsToUse.map((dest: string, idx: number) => (
                      <SelectItem key={idx} value={dest}>{dest}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    {categoriesToUse.map((cat: string, idx: number) => (
                      <SelectItem key={idx} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Notas</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-[#0f1115] border-[#2d3139] h-16 min-h-16" />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-red-500 hover:bg-red-600 font-bold w-full uppercase text-xs">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark As Paid Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase text-green-400 italic">Quitar Documento</DialogTitle>
            <DialogDescription className="text-xs text-[#a0a0a0]">Confirme os dados de fechamento financeiro.</DialogDescription>
          </DialogHeader>
          {selectedPayable && (() => {
            const info = getRecordPaymentsInfo(selectedPayable);
            return (
              <form onSubmit={handleMarkAsPaid} className="space-y-4 pt-2">
                <div className="p-3.5 bg-[#0f1115] border border-[#2d3139] rounded-xl space-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Favorecido</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{selectedPayable.supplierName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2d3139]/30 mt-1">
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Valor Total</p>
                      <p className="text-xs font-bold text-gray-300 font-mono">R$ {Number(selectedPayable.value).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Já Pago</p>
                      <p className="text-xs font-bold text-green-400 font-mono">R$ {info.paid.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#2d3139]/40 mt-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Saldo devedor restante</p>
                    <p className="text-lg font-black text-red-400 mt-0.5 font-mono">R$ {info.remaining.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tipo da Baixa</Label>
                  <Select value={payType} onValueChange={(val: any) => {
                    setPayType(val);
                    if (val === 'total') {
                      setPayAmount(info.remaining.toFixed(2));
                    } else {
                      setPayAmount('');
                    }
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                      <SelectValue placeholder={payType === 'total' ? 'Integral' : 'Parcelado'}>
                        {payType === 'total' ? 'Integral' : 'Parcelado'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="total">Integral</SelectItem>
                      <SelectItem value="partial">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payType === 'partial' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label className="text-xs text-amber-400 font-bold uppercase tracking-wider">Valor Pago / Baixado Agorinha (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      max={info.remaining}
                      placeholder="Ex: 150.00" 
                      value={payAmount} 
                      onChange={e => setPayAmount(e.target.value)} 
                      className="bg-[#0f1115] border-amber-500/40 text-amber-400" 
                    />
                    <span className="text-[10px] text-zinc-500 font-mono block">Resta após pagamento: R$ {Math.max(0, info.remaining - (Number(payAmount) || 0)).toFixed(2)}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Data do Pagamento</Label>
                  <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="bg-[#0f1115] border-[#2d3139]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="PIX">PIX (Transferência)</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro Físico</SelectItem>
                      <SelectItem value="Cartão">Cartão de Débito/Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === 'PIX' && pixSettings?.accounts?.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Conta Pix Origem</Label>
                    <Select value={pixAccountId} onValueChange={setPixAccountId}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue placeholder="Selecione a conta..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {pixSettings.accounts.map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.bank} - {acc.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl mt-3 text-white">
                  <input 
                    type="checkbox" 
                    id="generateReceiptOnPay" 
                    checked={generateReceiptOnPay} 
                    onChange={e => setGenerateReceiptOnPay(e.target.checked)} 
                    className="w-4 h-4 accent-green-500 cursor-pointer rounded"
                  />
                  <Label htmlFor="generateReceiptOnPay" className="text-xs font-semibold cursor-pointer select-none text-zinc-300">
                    Gerar recibo com discriminação de saldos?
                  </Label>
                </div>

                <DialogFooter>
                  <Button type="submit" className="bg-green-500 hover:bg-green-600 font-mono font-bold w-full uppercase text-xs">REGISTRAR BAIXA</Button>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------
// 2. ACCOUNTS RECEIVABLE (CONTAS A RECEBER INTEGRADA COM CLIENTES E CONTRATOS)
// ----------------------------------------------------
interface ReceivableManagerProps {
  companyId: string;
  clients: any[];
  pixSettings: any;
  appSettings?: any;
}

export function ReceivableManager({ companyId, clients = [], pixSettings, appSettings }: ReceivableManagerProps) {
  const [receivables, setReceivables] = useState<ReceivableRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Pago'>('Todos');
  const [activeTab, setActiveTab] = useState<'gerais' | 'contratos'>('gerais');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableRecord | null>(null);
  const [payType, setPayType] = useState<'total' | 'partial'>('total');
  const [payAmount, setPayAmount] = useState<string>('');
  const [generateReceiptOnPay, setGenerateReceiptOnPay] = useState<boolean>(true);

  // Form states
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [clientNameInput, setClientNameInput] = useState('');
  const [category, setCategory] = useState('Mensalidade');
  const [notes, setNotes] = useState('');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Cartão'>('PIX');
  const [pixAccountId, setPixAccountId] = useState('');

  // States for Editing details
  const [editStatus, setEditStatus] = useState<'Pendente' | 'Pago' | 'Parcial'>('Pendente');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Dinheiro' | 'PIX' | 'Cartão'>('PIX');
  const [editPixAccountId, setEditPixAccountId] = useState('');

  // Year choices
  const years = [2024, 2025, 2026, 2027];

  // Selected Period format string: MM/yyyy
  const currentMonthYearStr = useMemo(() => {
    return `${String(selectedMonth + 1).padStart(2, '0')}/${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  // Firebase subscription for real receivables
  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, 'receivables'),
      where('companyId', '==', companyId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReceivableRecord));
      // Sort by due date
      list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
      setReceivables(list);
    }, (err) => {
      toast.error('Erro ao subscrever contas a receber.');
      console.error(err);
    });
    return () => unsubscribe();
  }, [companyId]);

  const resetForm = () => {
    setDescription('');
    setValue('');
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setClientNameInput('');
    setCategory('Mensalidade');
    setNotes('');
  };

  const handleCreateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value || !dueDate || !clientNameInput) {
      toast.error('Preencha a descrição, valor, vencimento e cliente.');
      return;
    }
    try {
      await addDoc(collection(db, 'receivables'), {
        companyId,
        description,
        value: Number(value),
        dueDate,
        clientName: clientNameInput,
        category,
        notes,
        status: 'Pendente',
        referenceMonth: currentMonthYearStr,
        createdAt: Timestamp.now()
      });
      toast.success('Compromisso de recebimento lançado com sucesso!');
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Erro ao lançar.');
      console.error(err);
    }
  };

  const handleUpdateReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;
    if (!description || !value || !dueDate || !clientNameInput) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    try {
      const isPaidOrPartial = editStatus === 'Pago' || editStatus === 'Parcial';
      await updateDoc(doc(db, 'receivables', selectedReceivable.id), {
        description,
        value: Number(value),
        dueDate,
        clientName: clientNameInput,
        category,
        notes,
        status: editStatus,
        paymentDate: isPaidOrPartial ? editPaymentDate : '',
        paymentMethod: isPaidOrPartial ? editPaymentMethod : '',
        pixAccountId: (isPaidOrPartial && editPaymentMethod === 'PIX') ? editPixAccountId : ''
      });
      toast.success('Lançamento atualizado!');
      setIsEditOpen(false);
    } catch (err) {
      toast.error('Erro ao editar.');
      console.error(err);
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    if (!confirm('Excluir este recebível permanente?')) return;
    try {
      await deleteDoc(doc(db, 'receivables', id));
      toast.success('Lançamento removido.');
    } catch (err) {
      toast.error('Erro ao remover.');
      console.error(err);
    }
  };

  const handleMarkAsReceived = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;
    const info = getRecordPaymentsInfo(selectedReceivable);
    const finalAmount = payType === 'total' ? info.remaining : Number(payAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast.error('Por favor, insira um valor válido para a baixa.');
      return;
    }
    const currentPaidSum = info.paid;
    const newPaidSum = currentPaidSum + finalAmount;
    const finalStatus = newPaidSum >= Number(selectedReceivable.value) - 0.01 ? 'Pago' : 'Parcial';

    try {
      const newPayment = {
        date: payDate,
        value: finalAmount,
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : '',
        notes: payType === 'partial' ? 'Baixa parcial' : 'Baixa de saldo integral'
      };
      
      const updatedPayments = [...(selectedReceivable.partialPayments || []), newPayment];

      // 1. Update receivables state inside firebase
      await updateDoc(doc(db, 'receivables', selectedReceivable.id), {
        status: finalStatus,
        paymentDate: payDate,
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : '',
        partialPayments: updatedPayments
      });

      // 2. Add receipt/revenue entry inside our cash-book (financials)
      await addDoc(collection(db, 'financial'), {
        companyId,
        type: 'Receita',
        category: selectedReceivable.category || 'Contas a Receber',
        description: payType === 'partial'
          ? `Baixa Parcial: ${selectedReceivable.description} (${selectedReceivable.clientName})`
          : `Recebimento Pago: ${selectedReceivable.description} (${selectedReceivable.clientName})`,
        value: finalAmount,
        date: payDate,
        origin: 'Contas a Receber',
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : '',
        createdAt: Timestamp.now()
      });

      toast.success(finalStatus === 'Pago' ? 'Recebimento liquidado e registrado no fluxo de caixa!' : 'Baixa parcial de receita registrada!');
      
      // Print dynamic installment receipt if requested
      if (generateReceiptOnPay) {
        try {
          printRecordReceipt(selectedReceivable, false, newPayment, appSettings);
        } catch (printErr) {
          console.error('Error printing receipt:', printErr);
        }
      }

      setIsPayOpen(false);
    } catch (err) {
      toast.error('Erro ao processar recebimento.');
      console.error(err);
    }
  };

  // Check if chosen month/year is current or past (relative to May 2026 / current date)
  const isCurrentOrPastMonth = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-based
    
    if (selectedYear < currentYear) return true;
    if (selectedYear > currentYear) return false;
    return selectedMonth <= currentMonth;
  }, [selectedMonth, selectedYear]);

  // contract Prediction calculation
  // "sendo que nas contas a receber o sistema ja inclua os valores dos contratos com seus devidos dias que ja estão cadastrados no menu clientes"
  const contractPredictions = useMemo(() => {
    const activeContracts = clients.filter(c => c.type === 'Contrato');
    return activeContracts.map(client => {
      const isContractVal = Number(client.contractValue || client.monthlyValue || 0);
      const paymentDay = Number(client.paymentDay || 10);
      
      // Calculate preferred dueDate for the chosen month/year state
      const rawDate = new Date(selectedYear, selectedMonth, paymentDay);
      // fallback in case of overflow (e.g. Feb 30th)
      const sanitizedDay = Math.min(paymentDay, 28); 
      const isoDueDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(sanitizedDay).padStart(2, '0')}`;

      // Check if there is ALREADY a contract receivable in receivables for this client during this referenceMonth
      const checkReceivable = receivables.find(r => 
        (r.clientId === client.id || normalizeName(r.clientName) === normalizeName(client.name)) &&
        r.referenceMonth === currentMonthYearStr &&
        (r.isContractPrediction === true || 
         (r.category || '').toLowerCase().includes('contrato') || 
         (r.category || '').toLowerCase().includes('mensalidade'))
      );

      return {
        client,
        value: isContractVal,
        paymentDay: paymentDay,
        dueDate: isoDueDate,
        provisioned: !!checkReceivable,
        receivableRecordId: checkReceivable?.id,
        isPaid: checkReceivable?.status === 'Pago',
        paymentDate: checkReceivable?.paymentDate || checkReceivable?.date
      };
    });
  }, [clients, selectedMonth, selectedYear, receivables, currentMonthYearStr]);

  // Bulk action to provision all non-provisioned contracts for the current month
  const handleBulkProvisionContracts = async () => {
    const unprovisioned = contractPredictions.filter(p => !p.provisioned);
    if (unprovisioned.length === 0) {
      toast.error('Todos os contratos de clientes já foram provisionados para este mês!');
      return;
    }
    let count = 0;
    try {
      const saveStatus = isCurrentOrPastMonth ? 'Pago' : 'Pendente';
      const payDateVal = isCurrentOrPastMonth ? format(new Date(), 'yyyy-MM-dd') : '';

      for (const item of unprovisioned) {
        await addDoc(collection(db, 'receivables'), {
          companyId,
          clientId: item.client.id,
          clientName: item.client.name,
          description: `Mensalidade Contrato - Ref ${currentMonthYearStr}`,
          value: Number(item.value || 0),
          dueDate: item.dueDate,
          category: 'Contrato',
          status: saveStatus,
          isContractPrediction: true,
          referenceMonth: currentMonthYearStr,
          paymentDate: payDateVal,
          paymentMethod: isCurrentOrPastMonth ? 'PIX' : '',
          createdAt: Timestamp.now()
        });

        if (isCurrentOrPastMonth) {
          await addDoc(collection(db, 'financial'), {
            companyId,
            type: 'Receita',
            category: 'Contrato',
            description: `Mensalidade Recebida (Auto): ${item.client.name} - Ref ${currentMonthYearStr}`,
            value: Number(item.value || 0),
            date: payDateVal,
            origin: 'Contas a Receber',
            paymentMethod: 'PIX',
            createdAt: Timestamp.now()
          });
        }
        count++;
      }
      
      if (isCurrentOrPastMonth) {
        toast.success(`${count} Contratos lançados como PAGO (Consolidados e integrados ao caixa deste mês).`);
      } else {
        toast.success(`${count} Contratos lançados como PENDENTE para os meses seguintes.`);
      }
    } catch (err) {
      toast.error('Erro no provisionamento.');
      console.error(err);
    }
  };

  const handleSingleProvisionContract = async (item: any) => {
    try {
      if (isCurrentOrPastMonth) {
        // If current or past, provision as "Pendente" first, then open standard Receive dialog
        const docRef = await addDoc(collection(db, 'receivables'), {
          companyId,
          clientId: item.client?.id || item.clientId || '',
          clientName: item.client?.name || item.clientName,
          description: `Mensalidade Contrato - Ref ${currentMonthYearStr}`,
          value: Number(item.value || 0),
          dueDate: item.dueDate,
          category: 'Contrato',
          status: 'Pendente',
          isContractPrediction: true,
          referenceMonth: currentMonthYearStr,
          createdAt: Timestamp.now()
        });

        const newRec: ReceivableRecord = {
          id: docRef.id,
          companyId,
          clientId: item.client?.id || item.clientId || '',
          clientName: item.client?.name || item.clientName,
          description: `Mensalidade Contrato - Ref ${currentMonthYearStr}`,
          value: Number(item.value || 0),
          dueDate: item.dueDate,
          category: 'Contrato',
          status: 'Pendente',
          isContractPrediction: true,
          referenceMonth: currentMonthYearStr,
          createdAt: new Date()
        };

        setSelectedReceivable(newRec);
        setPayDate(format(new Date(), 'yyyy-MM-dd'));
        setPayType('total');
        setPayAmount(String(item.value));
        if (pixSettings?.accounts?.length > 0) {
          setPixAccountId(pixSettings.accounts[0].id);
        } else {
          setPixAccountId('');
        }
        setIsPayOpen(true);
        toast.success(`Contrato de ${item.client?.name || item.clientName} lançado. Preencha os detalhes da baixa.`);
      } else {
        // Future month: launch as open "Pendente"
        await addDoc(collection(db, 'receivables'), {
          companyId,
          clientId: item.client?.id || item.clientId || '',
          clientName: item.client?.name || item.clientName,
          description: `Mensalidade Contrato - Ref ${currentMonthYearStr}`,
          value: Number(item.value || 0),
          dueDate: item.dueDate,
          category: 'Contrato',
          status: 'Pendente',
          isContractPrediction: true,
          referenceMonth: currentMonthYearStr,
          createdAt: Timestamp.now()
        });
        toast.success(`Mensalidade de ${item.client?.name || item.clientName} lançada como PENDENTE no contas a receber!`);
      }
    } catch (err) {
      toast.error('Erro ao lançar plano.');
      console.error(err);
    }
  };

  const handleDirectReceiveContractOnly = async (item: any) => {
    try {
      // Create a Pendente receivable, then trigger the standard pay dialog where they can select PIX or Cash
      const docRef = await addDoc(collection(db, 'receivables'), {
        companyId,
        clientId: item.client?.id || item.clientId || '',
        clientName: item.client?.name || item.clientName,
        description: `Mensalidade Contrato - Ref ${currentMonthYearStr}`,
        value: Number(item.value || 0),
        dueDate: item.dueDate,
        category: 'Contrato',
        status: 'Pendente',
        isContractPrediction: true,
        referenceMonth: currentMonthYearStr,
        createdAt: Timestamp.now()
      });

      const newRec: ReceivableRecord = {
        id: docRef.id,
        companyId,
        clientId: item.client?.id || item.clientId || '',
        clientName: item.client?.name || item.clientName,
        description: `Mensalidade Contrato - Ref ${currentMonthYearStr}`,
        value: Number(item.value || 0),
        dueDate: item.dueDate,
        category: 'Contrato',
        status: 'Pendente',
        isContractPrediction: true,
        referenceMonth: currentMonthYearStr,
        createdAt: new Date()
      };

      setSelectedReceivable(newRec);
      setPayDate(format(new Date(), 'yyyy-MM-dd'));
      setPayType('total');
      setPayAmount(String(item.value));
      if (pixSettings?.accounts?.length > 0) {
        setPixAccountId(pixSettings.accounts[0].id);
      } else {
        setPixAccountId('');
      }
      setIsPayOpen(true);

      toast.success(`Contrato de ${item.client?.name || item.clientName} lançado em aberto. Selecione a forma de pagamento abaixo para efetuar a baixa!`);
    } catch (err) {
      toast.error('Erro ao receber contrato.');
      console.error(err);
    }
  };

  // Filter real receivables that belong to the selected period
  const filteredReceivablesByPeriod = useMemo(() => {
    return receivables.filter(r => {
      let isSamePeriod = false;
      if (r.referenceMonth === currentMonthYearStr) {
        isSamePeriod = true;
      } else if (r.dueDate) {
        try {
          const d = safeParseDate(r.dueDate);
          if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
            isSamePeriod = true;
          }
        } catch (_) {}
      }
      return isSamePeriod;
    });
  }, [receivables, selectedMonth, selectedYear, currentMonthYearStr]);

  // Combine real period receivables + unprovisioned dynamic predictions
  const combinedReceivables = useMemo(() => {
    const list: any[] = [];
    
    // Add real ones
    filteredReceivablesByPeriod.forEach(r => {
      list.push({ ...r, isVirtual: false });
    });

    // Add unprovisioned predictions as virtual/temporary ones in list so they participate in search & lists
    const unprovisioned = contractPredictions.filter(cp => !cp.provisioned);
    unprovisioned.forEach(cp => {
      list.push({
        id: `virtual-${cp.client.id}`,
        clientId: cp.client.id,
        clientName: cp.client.name,
        description: `Previsão Contrato (Automático)`,
        value: cp.value,
        dueDate: cp.dueDate,
        category: 'Contrato',
        status: 'Pendente',
        isContractPrediction: true,
        referenceMonth: currentMonthYearStr,
        isVirtual: true
      });
    });

    // Sort by dueDate
    list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    return list;
  }, [filteredReceivablesByPeriod, contractPredictions, currentMonthYearStr]);

  // Filter combined lists based on search terms and tab status filters
  const filteredCombinedReceivables = useMemo(() => {
    return combinedReceivables.filter(r => {
      const matchesSearch = 
        (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'Todos') {
        return true;
      } else if (statusFilter === 'Pago') {
        return r.status === 'Pago' && !r.isVirtual;
      } else if (statusFilter === 'Pendente') {
        return r.status === 'Pendente' || r.status === 'Parcial';
      }
      return true;
    });
  }, [combinedReceivables, searchTerm, statusFilter]);

  // General dashboard stats inside receivables page - based on dynamically combined list for accurate totals
  const stats = useMemo(() => {
    const totals = combinedReceivables.reduce((acc, r) => {
      const info = getRecordPaymentsInfo(r);
      acc.totalMonth += info.remaining;
      acc.totalReceived += info.paid;
      if (info.remaining > 0) {
        acc.totalPendingCount += 1;
      }
      return acc;
    }, { totalMonth: 0, totalReceived: 0, totalPendingCount: 0 });
    
    return totals;
  }, [combinedReceivables]);

  // Unprovisioned contracts sum
  const unprovisionedContractsAmount = useMemo(() => {
    return contractPredictions
      .filter(p => !p.provisioned)
      .reduce((acc, p) => acc + Number(p.value), 0);
  }, [contractPredictions]);

  // Get days status display helper
  const getDueDaysInfo = (dueDateStr: string, status: string) => {
    if (status === 'Pago') {
      return { 
        label: 'PG / RECEBIDO', 
        color: 'text-green-400 bg-green-500/15 border-green-500/20' 
      };
    }
    if (!dueDateStr) {
      return { 
        label: 'A DEFINIR', 
        color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' 
      };
    }
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(dueDateStr + 'T00:00:00');
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const days = Math.abs(diffDays);
        return {
          label: `${days} ${days === 1 ? 'dia' : 'dias'} em atraso`,
          color: 'text-red-400 bg-red-500/15 border-red-500/30'
        };
      } else if (diffDays === 0) {
        return {
          label: 'Hoje!',
          color: 'text-orange-400 bg-orange-500/15 border-orange-500/30 font-bold'
        };
      } else {
        return {
          label: `Faltam ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
          color: 'text-blue-400 bg-blue-500/15 border-blue-500/30'
        };
      }
    } catch (err) {
      return { label: 'INVÁLIDO', color: 'text-gray-400' };
    }
  };

  const getClientType = (clientName: string, clientId?: string) => {
    const matchingClient = clients.find(c => 
      (clientId && c.id === clientId) || 
      normalizeName(c.name) === normalizeName(clientName)
    );
    return matchingClient?.type || 'Avulso';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2d3139]/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic text-green-400">Contas a Receber</h2>
            <Badge className="bg-green-500/10 text-green-400 font-black border border-green-500/20 text-[9px] uppercase px-2 py-0.5 animate-pulse">Ativo</Badge>
          </div>
          <p className="text-[#a0a0a0] text-sm uppercase tracking-[0.2em] font-medium">Controle de faturas, parcelamentos, ordens e contratos integrados.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month selective controller */}
          <div className="flex bg-[#0f1115] border border-[#2d3139] p-1.5 rounded-lg gap-1">
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="bg-transparent border-none text-white h-8 text-[11px] font-bold uppercase w-28 select-menu">
                <span className="flex flex-1 text-left">
                  {format(new Date(2022, selectedMonth, 10, 12, 0, 0), 'MMMM', { locale: ptBR }).toUpperCase()}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>{format(new Date(2022, i, 10, 12, 0, 0), 'MMMM', { locale: ptBR }).toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="bg-transparent border-none text-white h-8 text-[11px] font-bold w-18 select-menu">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#10b981] hover:bg-emerald-600 text-white font-bold uppercase tracking-wider text-xs px-4 h-11" onClick={resetForm}>
                <Plus size={16} className="mr-2" />
                Lançar Recebível
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-black uppercase text-green-400 italic">Novo Recebível Manual</DialogTitle>
                <DialogDescription className="text-gray-400 text-xs">Lançar uma previsão ou direito de crédito avulso.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateReceivable} className="space-y-4 pt-2">
                <div className="space-y-1.5 font-mono">
                  <Label htmlFor="rec_desc" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Descrição comercial</Label>
                  <Input id="rec_desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Manutenção Mensal das Câmeras" className="bg-[#0f1115] border-[#2d3139]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="rec_val" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Valor (R$)</Label>
                    <Input id="rec_val" type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} placeholder="0,00" className="bg-[#0f1115] border-[#2d3139] font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rec_due" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Vencimento</Label>
                    <Input id="rec_due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#0f1115] border-[#2d3139]" />
                  </div>
                </div>
                 <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Nome de Cliente</Label>
                    <Select value={clientNameInput} onValueChange={setClientNameInput}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white/90">
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Mensalidade">Mensalidade / Contrato</SelectItem>
                        <SelectItem value="Instalação">Serviço de Instalação</SelectItem>
                        <SelectItem value="Venda Balcão">Comércio / Peças</SelectItem>
                        <SelectItem value="Laudo Técnico">Laudos / Inspeção</SelectItem>
                        <SelectItem value="Outros">Outras Fontes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec_notes" className="text-xs text-gray-400 font-bold uppercase tracking-wider">Notas opcionais</Label>
                  <Textarea id="rec_notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações internas." className="bg-[#0f1115] border-[#2d3139] h-16 min-h-16" />
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-green-500 hover:bg-green-600 font-bold w-full uppercase text-xs">LANÇAR DIRETAMENTE</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a0a0a0] font-bold uppercase tracking-wider">Total em Aberto ({currentMonthYearStr})</span>
              <ArrowDownRight className="text-green-400 h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-white mt-1 font-mono">R$ {stats.totalMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">{stats.totalPendingCount} compromissos pendentes na lista</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d23] border-[#2d3139] text-white font-sans">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a0a0a0] font-bold uppercase tracking-wider">Faturamento Contratos ({currentMonthYearStr})</span>
              <Building2 className="text-blue-400 h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-white mt-1 font-mono">
              R$ {contractPredictions.reduce((acc, p) => acc + p.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-orange-400 font-bold uppercase mt-1">
              R$ {unprovisionedContractsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aguardando fechamento!
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a0a0a0] font-bold uppercase tracking-wider">Consolidados / Recebidos ({currentMonthYearStr})</span>
              <CheckCircle className="text-emerald-500 h-5 w-5" />
            </div>
            <p className="text-3xl font-black text-white mt-1 font-mono">R$ {stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Sincronizados com o Caixa Geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs navigation block */}
      <div className="flex border-b border-[#2d3139] gap-4">
        <button
          onClick={() => setActiveTab('gerais')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition ${activeTab === 'gerais' ? 'text-green-400 border-b-2 border-green-400' : 'text-[#71717a] hover:text-white'}`}
        >
          Lançamentos Gerais ({filteredCombinedReceivables.length})
        </button>
        <button
          onClick={() => setActiveTab('contratos')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${activeTab === 'contratos' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-[#71717a] hover:text-white'}`}
        >
          Previsões de Contrato ({contractPredictions.length})
          {unprovisionedContractsAmount > 0 && <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />}
        </button>
      </div>

      {activeTab === 'gerais' ? (
        <Card className="bg-[#1a1d23] border-[#2d3139] text-white shadow-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-4">
            <div>
              <CardTitle className="text-md uppercase italic font-bold text-white flex items-center gap-2">
                <ArrowDownRight className="text-green-400" size={18} />
                Lista de Recebíveis
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Abaixo estão listados todos os lançamentos gerais (reais e previsões) para o período de {currentMonthYearStr}.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar recebível..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#0f1115] border-[#2d3139] text-white text-xs h-9"
                />
              </div>
              <div className="flex bg-[#0f1115] p-1.5 border border-[#2d3139] rounded-lg gap-1.5 w-full sm:w-auto">
                {(['Todos', 'Pendente', 'Pago'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded transition ${statusFilter === f ? 'bg-green-500 text-white' : 'text-[#71717a] hover:text-white'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto custom-scrollbar scroll-left-container">
            {filteredCombinedReceivables.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
                <User className="text-[#2d3139] h-12 w-12 mb-3" />
                <p className="text-xs font-bold text-white uppercase">Nenhum recebível cadastrado</p>
                <p className="text-[11px] text-[#71717a] mt-1">Nenhum direito a receber para os filtros selecionados.</p>
              </div>
            ) : (
              <DoubleScrollContainer>
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#0f1115] border-b border-[#2d3139] text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                      <th className="p-4">Cliente / Tipo</th>
                      <th className="p-4">Contrato / Serviço</th>
                      <th className="p-4">Valor</th>
                      <th className="p-4">Vencimento</th>
                      <th className="p-4">Status / Tempo</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3139]/40">
                    {filteredCombinedReceivables.map((r) => {
                      const typeLabel = getClientType(r.clientName, r.clientId);
                      const isContractCategory = 
                        (r.category || '').toLowerCase().includes('mensalidade') || 
                        (r.category || '').toLowerCase().includes('contrato');
                      const isRealContract = typeLabel === 'Contrato' && isContractCategory;
                      const dayInfo = getDueDaysInfo(r.dueDate, r.status);
                      const recInfo = getRecordPaymentsInfo(r);
                      return (
                        <tr key={r.id} className="hover:bg-[#2d3139]/10 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <User size={12} className="text-[#a0a0a0]" />
                              <span className="uppercase">{r.clientName}</span>
                            </div>
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border mt-1 inline-block ${
                              isRealContract 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' 
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25'
                            }`}>
                              {isRealContract ? 'CONTRATO MENSAL' : 'SERVIÇO / AVULSO'}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300">
                            <div className="font-medium">{r.description}</div>
                            <div className="flex gap-1.5 items-center mt-1">
                              <Badge className="bg-green-400/5 text-green-400 border border-green-500/10 text-[8px] uppercase px-1.5 py-0.5 font-bold">{r.category}</Badge>
                              {r.referenceMonth && <span className="text-[8px] text-blue-300 font-extrabold bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">Ref: {r.referenceMonth}</span>}
                            </div>
                            {r.notes && <p className="text-[10px] text-gray-500 font-mono mt-1 italic">{r.notes}</p>}

                            {r.partialPayments && (r.status === 'Parcial' || r.partialPayments.length > 1) && (
                              <div className="text-[10px] text-zinc-500 mt-2 space-y-1 bg-[#0f1115]/50 p-2.5 rounded-lg border border-[#2d3139]/30 max-w-[320px]">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500 font-mono block">Histórico de Baixas Parciais:</span>
                                {r.partialPayments.map((pay: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center font-mono">
                                    <span>{idx + 1}. {pay.date ? format(safeParseDate(pay.date), 'dd/MM/yyyy') : 'N/A'} ({pay.paymentMethod}):</span>
                                    <span className="text-emerald-400 font-bold ml-2">R$ {Number(pay.value).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono font-bold text-green-400 text-sm">
                            R$ {Number(r.value).toFixed(2)}
                          </td>
                          <td className="p-4 text-gray-400 font-mono">
                            {r.dueDate ? format(safeParseDate(r.dueDate), 'dd/MM/yyyy') : 'N/A'}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              {r.status === 'Pago' ? (
                                <Badge className="bg-green-500/15 text-green-400 border border-green-500/20 uppercase text-[9px] font-bold">PAGO</Badge>
                              ) : r.status === 'Parcial' ? (
                                <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase text-[9px] font-bold">PARCIAL</Badge>
                              ) : (
                                <Badge className="bg-yellow-500/15 text-yellow-500 border border-yellow-500/20 uppercase text-[9px] font-bold">PENDENTE</Badge>
                              )}
                              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border inline-block ${dayInfo.color}`}>
                                {dayInfo.label}
                              </span>
                              {r.status === 'Parcial' && (
                                <span className="text-[10px] text-gray-400 font-mono block">Resta R$ {recInfo.remaining.toFixed(2)}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5 actions-div">
                              {r.isVirtual ? (
                                <div className="flex gap-1">
                                  <Button
                                    onClick={() => {
                                      handleSingleProvisionContract({
                                        client: { id: r.clientId, name: r.clientName },
                                        value: r.value,
                                        dueDate: r.dueDate
                                      });
                                    }}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold h-7 px-2.5 text-[9px] uppercase tracking-wider"
                                  >
                                    {isCurrentOrPastMonth ? 'Lançar e Baixar' : 'Lançar em Aberto'}
                                  </Button>
                                  {!isCurrentOrPastMonth && (
                                    <Button
                                      onClick={() => {
                                        handleDirectReceiveContractOnly({
                                          client: { id: r.clientId, name: r.clientName },
                                          value: r.value,
                                          dueDate: r.dueDate
                                        });
                                      }}
                                      className="bg-green-500 hover:bg-green-600 text-white font-bold h-7 px-2.5 text-[9px] uppercase tracking-wider"
                                    >
                                      Receber (Baixa Direta)
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {r.status !== 'Pago' && (
                                    <Button
                                      onClick={() => {
                                        setSelectedReceivable(r);
                                        setPayDate(format(new Date(), 'yyyy-MM-dd'));
                                        setPayType('total');
                                        setPayAmount(recInfo.remaining.toFixed(2));
                                        if (pixSettings?.accounts?.length > 0) {
                                          setPixAccountId(pixSettings.accounts[0].id);
                                        } else {
                                          setPixAccountId('');
                                        }
                                        setIsPayOpen(true);
                                      }}
                                      className="bg-green-500 hover:bg-green-600 text-white font-bold h-7 px-2.5 text-[10px] uppercase tracking-wider animate-pulse"
                                    >
                                      <Check size={12} className="mr-1" />
                                      Receber
                                    </Button>
                                  )}
                                  {(r.status === 'Pago' || r.status === 'Parcial' || (r.partialPayments && r.partialPayments.length > 0)) && (
                                    <Button
                                      onClick={() => {
                                        const lastPayment = r.partialPayments?.[r.partialPayments.length - 1] || {
                                          date: r.paymentDate || r.dueDate || r.date || format(new Date(), 'yyyy-MM-dd'),
                                          value: Number(r.value),
                                          paymentMethod: r.paymentMethod || 'Outro',
                                        };
                                        printRecordReceipt(r, false, lastPayment, appSettings);
                                      }}
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/10 border border-green-500/20 mr-1"
                                      title="Reimprimir Recibo"
                                    >
                                      <Printer size={12} />
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => {
                                      setSelectedReceivable(r);
                                      setDescription(r.description || '');
                                      setValue(String(r.value));
                                      setDueDate(r.dueDate || '');
                                      setClientNameInput(r.clientName || '');
                                      setCategory(r.category || 'Mensalidade');
                                      setNotes(r.notes || '');
                                      setEditStatus(r.status || 'Pendente');
                                      setEditPaymentDate(r.paymentDate || r.dueDate || format(new Date(), 'yyyy-MM-dd'));
                                      setEditPaymentMethod(r.paymentMethod || 'PIX');
                                      setEditPixAccountId(r.pixAccountId || '');
                                      setIsEditOpen(true);
                                    }}
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-gray-400 hover:text-white border border-[#2d3139]/40"
                                    title="Editar"
                                  >
                                    <Edit size={12} />
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteReceivable(r.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/10 border border-[#ef4444]/25"
                                    title="Excluir de vez"
                                  >
                                    <Trash2 size={12} />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DoubleScrollContainer>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-4">
            <div>
              <CardTitle className="text-md uppercase italic font-bold text-blue-400 flex items-center gap-2">
                <Building2 size={18} />
                Previsões Geradas por Contratos Ativos
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Lançamentos projetados com base no valor mensal e vencimento de contratos cadastrados para {currentMonthYearStr}.
              </CardDescription>
            </div>
            {unprovisionedContractsAmount > 0 && (
              <Button onClick={handleBulkProvisionContracts} className="bg-blue-500 hover:bg-blue-600 text-white font-mono font-bold uppercase text-[10px] tracking-wider px-3 h-9">
                <Sparkles size={13} className="mr-1" />
                {isCurrentOrPastMonth ? 'Lançar e Dar Baixa em Todos' : 'Provisionar Todos'} ({contractPredictions.filter(p => !p.provisioned).length})
              </Button>
            )}
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto custom-scrollbar scroll-left-container">
            {contractPredictions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
                <AlertCircle className="text-blue-400 h-10 w-10 mb-3" />
                <p className="text-xs font-bold text-white uppercase">Nenhum contrato recorrente registrado</p>
                <p className="text-[11px] text-[#71717a] mt-1">Atribua o tipo "Contrato" com "Valor Mensal" e "Dia de Vencimento" para um ou mais clientes no cadastro de clientes.</p>
              </div>
            ) : (
              <DoubleScrollContainer>
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#0f1115] border-b border-[#2d3139] text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                      <th className="p-4">Cliente de Contrato</th>
                      <th className="p-4">Dia Preferível</th>
                      <th className="p-4">Data da Baixa/Pagamento</th>
                      <th className="p-4">Valor Mensalidade</th>
                      <th className="p-4">Estado no Período</th>
                      <th className="p-4 text-right">Ação Rápida de Entrada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3139]/40">
                    {contractPredictions.map((cp, idx) => (
                      <tr key={idx} className="hover:bg-[#2d3139]/10 transition-colors">
                        <td className="p-4 font-bold text-white uppercase">
                          {cp.client.name}
                        </td>
                        <td className="p-4 font-mono font-bold text-gray-400">
                          Dia {cp.paymentDay}
                        </td>
                        <td className="p-4 font-mono">
                          {cp.isPaid && cp.paymentDate ? (
                            <span className="text-green-400 font-bold flex flex-col">
                              <span>{format(safeParseDate(cp.paymentDate), 'dd/MM/yyyy')}</span>
                              <span className="text-[9px] text-green-500/60 font-sans font-normal uppercase">Quitada</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {format(safeParseDate(cp.dueDate), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-green-400">
                          R$ {Number(cp.value).toFixed(2)}
                        </td>
                        <td className="p-4">
                          {cp.isPaid ? (
                            <Badge className="bg-green-500/15 text-green-400 border border-green-500/20 uppercase text-[9px]">✓ Quitada / Pago</Badge>
                          ) : cp.provisioned ? (
                            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/20 uppercase text-[9px]">Lançada em Aberto</Badge>
                          ) : (
                            <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/20 uppercase text-[9px]">Aguardando Lançamento</Badge>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5 matches-buttons font-mono">
                            {!cp.provisioned ? (
                              <>
                                <Button
                                  onClick={() => handleSingleProvisionContract(cp)}
                                  size="xs"
                                  className="h-7 text-[10px] bg-blue-500 hover:bg-blue-600 font-bold uppercase text-white px-2.5 rounded"
                                >
                                  {isCurrentOrPastMonth ? 'Lançar e Dar Baixa' : 'Lançar em Aberto'}
                                </Button>
                                <Button
                                  onClick={() => handleDirectReceiveContractOnly(cp)}
                                  size="xs"
                                  className="h-7 text-[10px] bg-green-500 hover:bg-green-600 font-bold uppercase text-white px-2.5 rounded"
                                >
                                  Receber (Baixa Direta)
                                </Button>
                              </>
                            ) : (
                              <p className="text-[11px] text-gray-500 pr-2">✓ Integrado</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DoubleScrollContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase text-green-400 italic">Editar Recebível</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateReceivable} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-[#0f1115] border-[#2d3139]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Valor total (R$)</Label>
                <Input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="bg-[#0f1115] border-[#2d3139] font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Vencimento</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-[#0f1115] border-[#2d3139]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Devedor (Cliente)</Label>
              <Select value={clientNameInput} onValueChange={setClientNameInput}>
                <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                  <SelectItem value="Mensalidade">Mensalidade / Contrato</SelectItem>
                  <SelectItem value="Instalação">Instalação CFTV</SelectItem>
                  <SelectItem value="Venda Balcão">Comércio</SelectItem>
                  <SelectItem value="Laudo Técnico">Laudo de Alarmes</SelectItem>
                  <SelectItem value="Outros">Outras Fontes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-[#2d3139]/50 mt-2 space-y-3">
              <span className="text-[10px] font-black uppercase text-green-400 block tracking-wider font-mono">Informações de Recebimento / Baixa</span>
              
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Status do Recebível</Label>
                <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                  <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(editStatus === 'Pago' || editStatus === 'Parcial') && (
                <div className="space-y-3 pt-1 border-t border-[#2d3139]/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Data do Recebimento</Label>
                      <Input type="date" value={editPaymentDate} onChange={e => setEditPaymentDate(e.target.value)} className="bg-[#0f1115] border-[#2d3139]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Forma de Recebimento</Label>
                      <Select value={editPaymentMethod} onValueChange={(val: any) => setEditPaymentMethod(val)}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="Cartão">Cartão</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editPaymentMethod === 'PIX' && pixSettings?.accounts?.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Conta Pix Destino</Label>
                      <Select value={editPixAccountId} onValueChange={setEditPixAccountId}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          {pixSettings.accounts.map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.bank} - {acc.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono text-gray-500">Anotações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-[#0f1115] border-[#2d3139] h-16 min-h-16" />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-[#10b981] hover:bg-emerald-600 font-bold w-full uppercase text-xs">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark As Paid (Dar Baixa) Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase text-green-400 italic">Registrar Recebimento</DialogTitle>
            <DialogDescription className="text-xs text-[#a0a0a0]">Confirme os dados de entrada de caixa.</DialogDescription>
          </DialogHeader>
          {selectedReceivable && (() => {
            const info = getRecordPaymentsInfo(selectedReceivable);
            return (
              <form onSubmit={handleMarkAsReceived} className="space-y-4 pt-2">
                <div className="p-3.5 bg-[#0f1115] border border-[#2d3139] rounded-xl space-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Devedor (Cliente)</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{selectedReceivable.clientName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2d3139]/30 mt-1">
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Valor Original</p>
                      <p className="text-xs font-bold text-gray-300 font-mono">R$ {Number(selectedReceivable.value).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Já Recebido</p>
                      <p className="text-xs font-bold text-green-400 font-mono">R$ {info.paid.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#2d3139]/40 mt-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Saldo de Entrada Pendente</p>
                    <p className="text-lg font-black text-green-400 mt-0.5 font-mono">R$ {info.remaining.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider font-sans">Tipo do Recebimento</Label>
                  <Select value={payType} onValueChange={(val: any) => {
                    setPayType(val);
                    if (val === 'total') {
                      setPayAmount(info.remaining.toFixed(2));
                    } else {
                      setPayAmount('');
                    }
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                      <SelectValue placeholder={payType === 'total' ? 'Integral' : 'Parcelado'}>
                        {payType === 'total' ? 'Integral' : 'Parcelado'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="total">Integral</SelectItem>
                      <SelectItem value="partial">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payType === 'partial' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label className="text-xs text-amber-400 font-bold uppercase tracking-wider">Valor Recebido Agora (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      max={info.remaining}
                      placeholder="Ex: 150.00" 
                      value={payAmount} 
                      onChange={e => setPayAmount(e.target.value)} 
                      className="bg-[#0f1115] border-amber-500/40 text-amber-400 font-mono" 
                    />
                    <span className="text-[10px] text-zinc-500 font-mono block">Resta no final: R$ {Math.max(0, info.remaining - (Number(payAmount) || 0)).toFixed(2)}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Data do Recebimento</Label>
                  <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="bg-[#0f1115] border-[#2d3139]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Forma de Recebimento</Label>
                  <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="PIX">PIX (Chave Bancária)</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro Físico</SelectItem>
                      <SelectItem value="Cartão">Cartão de Débito/Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {paymentMethod === 'PIX' && pixSettings?.accounts?.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Conta Pix Destino</Label>
                    <Select value={pixAccountId} onValueChange={setPixAccountId}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue placeholder="Selecione a conta..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {pixSettings.accounts.map((acc: any) => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.bank} - {acc.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl mt-3 text-white">
                  <input 
                    type="checkbox" 
                    id="generateReceiptOnReceive" 
                    checked={generateReceiptOnPay} 
                    onChange={e => setGenerateReceiptOnPay(e.target.checked)} 
                    className="w-4 h-4 accent-green-500 cursor-pointer rounded"
                  />
                  <Label htmlFor="generateReceiptOnReceive" className="text-xs font-semibold cursor-pointer select-none text-zinc-300">
                    Gerar recibo com discriminação de saldos?
                  </Label>
                </div>

                <DialogFooter>
                  <Button type="submit" className="bg-green-500 hover:bg-green-600 font-mono font-bold w-full uppercase text-xs">CONFIRMAR RECEBIMENTO</Button>
                </DialogFooter>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------
// 3. SALES HISTORY (HISTÓRICO DE VENDAS REAL)
// ----------------------------------------------------
interface SalesHistoryProps {
  sales: any[];
  clients: any[];
  companyId: string;
}

export function SalesHistoryManager({ sales = [], clients = [], companyId }: SalesHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const mappedSales = useMemo(() => {
    return sales.map(s => {
      // Cross-match client name from ID if possible
      let clientName = s.clientName || 'Cliente Balcão - Consumidor';
      if (s.clientId && !s.clientName) {
        const matchingClient = clients.find(c => c.id === s.clientId);
        if (matchingClient) {
          clientName = matchingClient.name || matchingClient.companyName || clientName;
        }
      }
      return {
        ...s,
        clientNameResolved: clientName
      };
    }).sort((a, b) => {
      // Newer sales first
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [sales, clients]);

  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return mappedSales;
    const term = searchTerm.toLowerCase();
    return mappedSales.filter(s => 
      s.documentNumber?.toLowerCase().includes(term) ||
      s.clientNameResolved?.toLowerCase().includes(term) ||
      s.paymentMethod?.toLowerCase().includes(term)
    );
  }, [mappedSales, searchTerm]);

  // Calculate totals
  const totalSalesCount = filteredSales.length;
  const totalSalesAmount = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + (Number(s.totalAmount) || Number(s.total) || 0), 0);
  }, [filteredSales]);

  const printReceipt = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const dateFormatted = sale.createdAt?.seconds 
      ? format(new Date(sale.createdAt.seconds * 1000), 'dd/MM/yyyy HH:mm')
      : format(new Date(sale.createdAt || new Date()), 'dd/MM/yyyy HH:mm');

    const itemsRows = (sale.items || sale.cart || []).map((item: any) => `
      <tr style="border-bottom: 1px dashed #eee;">
        <td style="padding: 6px 0;">${item.name || item.description || 'Item'}</td>
        <td style="padding: 6px 0; text-align: center;">${item.quantity || item.qty || 1}</td>
        <td style="padding: 6px 0; text-align: right; font-family: monospace;">R$ ${(Number(item.price) || 0).toFixed(2)}</td>
        <td style="padding: 6px 0; text-align: right; font-family: monospace;">R$ ${((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Venda ${sale.documentNumber || sale.id || ''}</title>
          <style>
            body { font-family: system-ui, sans-serif; color: #333; padding: 20px; font-size: 13px; max-width: 380px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
            .totals { text-align: right; font-weight: bold; font-size: 15px; padding-top: 10px; border-top: 2px dashed #000; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0; text-transform: uppercase;">COMPROVANTE DE VENDA</h2>
            <p style="margin: 4px 0 0 0;">Pedido: <b>${sale.documentNumber || sale.id?.substring(0,6).toUpperCase()}</b></p>
            <p style="margin: 2px 0 0 0;">Data: ${dateFormatted}</p>
          </div>
          <p><b>Cliente:</b> ${sale.clientNameResolved}</p>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px dashed #000; font-weight: bold;">
                <th style="padding-bottom: 4px;">Item</th>
                <th style="padding-bottom: 4px; text-align: center;">Qtd</th>
                <th style="padding-bottom: 4px; text-align: right;">v.Unit</th>
                <th style="padding-bottom: 4px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="totals">
            <p style="margin: 0;">Desconto: R$ ${(Number(sale.discount) || 0).toFixed(2)}</p>
            <p style="margin: 5px 0 0 0; font-size: 16px;">TOTAL BRUTO: R$ ${(Number(sale.totalAmount) || Number(sale.total) || 0).toFixed(2)}</p>
          </div>
          <p style="margin-top: 15px;"><b>Forma de Pagamento:</b> ${sale.paymentMethod || 'A combinar'}</p>
          <div style="text-align: center; margin-top: 30px; font-style: italic; border-top: 1px dashed #eee; padding-top: 10px;">
            <p style="margin: 0;">Obrigado pela preferência!</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic text-[#3b82f6] flex items-center gap-3">
          <History className="text-[#3b82f6]" />
          Histórico de Vendas (PDV)
        </h2>
        <p className="text-[#a0a0a0] text-sm uppercase tracking-[0.2em] font-medium">Relatórios, auditoria de pedidos concluídos de balcão e notas emitidas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total em Vendas PDV</span>
              <TrendingUp className="text-green-400 h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-white mt-1">
              R$ {totalSalesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Soma de todas as transações de caixa</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cupons Concluídos</span>
              <ShoppingCart className="text-blue-400 h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{totalSalesCount}</p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Comprovantes autorizados no banco</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tíquete Médio de Venda</span>
              <Percent className="text-cyan-400 h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-white mt-1">
              R$ {(totalSalesCount > 0 ? totalSalesAmount / totalSalesCount : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-gray-500 mt-1 uppercase">Eficiência de caixa por tíquete</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1a1d23] border-[#2d3139] text-white shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
          <div>
            <CardTitle className="text-md uppercase italic font-bold text-white flex items-center gap-2">
              <History className="text-[#3b82f6]" size={18} />
              Registro de Transações Ordinárias
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">Histórico autêntico sincronizado com as vendas rápidas do PDV.</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input 
              placeholder="Buscar por cupom, cliente ou forma..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#0f1115] border-[#2d3139] text-white text-xs h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[600px] overflow-y-auto custom-scrollbar scroll-left-container">
          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
              <ShoppingCart className="text-[#2d3139] h-12 w-12 mb-3" />
              <p className="text-xs font-bold text-white uppercase">Nenhuma venda encontrada</p>
              <p className="text-[11px] text-[#71717a] mt-1">Realize vendas rápidas no módulo PDV para povoar este histórico real.</p>
            </div>
          ) : (
            <DoubleScrollContainer>
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[#0f1115] border-b border-[#2d3139] text-gray-400 uppercase tracking-widest text-[10px]">
                    <th className="p-4 font-black">Cupom Nº</th>
                    <th className="p-4 font-black">Cliente</th>
                    <th className="p-4 font-black">Data/Hora</th>
                    <th className="p-4 font-black">Forma de Pag.</th>
                    <th className="p-4 font-black">Subtotal</th>
                    <th className="p-4 font-black text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3139]/40">
                  {filteredSales.map((sale) => {
                    const saleDate = sale.createdAt?.seconds 
                      ? new Date(sale.createdAt.seconds * 1000)
                      : new Date(sale.createdAt || new Date());
                    return (
                      <tr key={sale.id} className="hover:bg-[#2d3139]/10 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#3b82f6] uppercase">
                          {sale.documentNumber || sale.id?.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="p-4 font-semibold text-white flex items-center gap-2">
                          <User size={12} className="text-[#a0a0a0]" />
                          {sale.clientNameResolved}
                        </td>
                        <td className="p-4 text-gray-400">{format(saleDate, 'dd/MM/yyyy HH:mm')}</td>
                        <td className="p-4">
                          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] uppercase px-2 font-mono">
                            {sale.paymentMethod || 'Outros'}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono font-bold text-green-400">
                          R$ {(Number(sale.totalAmount) || Number(sale.total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right">
                          <Button 
                            onClick={() => printReceipt(sale)}
                            size="icon"
                            variant="ghost" 
                            className="h-8 w-8 text-[#a0a0a0] hover:text-white hover:bg-blue-500/15 border border-[#2d3139]/50 rounded-lg"
                            title="Reimprimir Comprovante"
                          >
                            <Printer size={13} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DoubleScrollContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
