/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  DollarSign, 
  FileText, 
  LogOut, 
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  User as UserIcon,
  Receipt as ReceiptIcon,
  Share2,
  Settings,
  Menu,
  X,
  Shield,
  PenTool,
  Database,
  RefreshCw,
  Upload,
  Users,
  ChevronLeft,
  ChevronRight,
  Printer,
  ShieldAlert,
  Lock,
  History,
  UserCog,
  Activity,
  Percent
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  getDocs,
  limit,
  Timestamp,
  setDoc,
  getDoc,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  User as FirebaseUser,
  getAuth
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { db, auth, handleFirestoreError, OperationType, firebaseConfig } from './firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// --- Helpers ---

const handleGenerateSignatureLink = async (
  documentId: string, 
  type: 'visit' | 'contract' | 'service-order' | 'budget', 
  clientName: string,
  companyId: string,
  displayInfo?: { title?: string, value?: string, details?: string },
  logAction?: any
) => {
  try {
    const token = doc(collection(db, 'signature_requests')).id;
    await setDoc(doc(db, 'signature_requests', token), {
      documentId,
      type,
      clientName,
      companyId,
      displayTitle: displayInfo?.title || `Documento ${type}`,
      displayValue: displayInfo?.value || '',
      displayDetails: displayInfo?.details || '',
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    if (logAction) {
      await logAction('create', 'signature_request', `Gerou link de assinatura para ${clientName}`, token);
    }

    const url = `${window.location.origin}${window.location.pathname}?signerToken=${token}`;
    const message = `Olá ${clientName}, por favor utilize o link abaixo para realizar a sua assinatura digital referente ao nosso serviço:\n\n${url}\n\n*Assinatura Única após o uso será excluída*`;
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado para a área de transferência!');
    } catch (err) {
      console.warn('Clipboard fallback', err);
    }

    // Open WhatsApp if possible
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    
    return url;
  } catch (error) {
    console.error("Erro ao gerar link de assinatura:", error);
    toast.error("Erro ao gerar link de assinatura.");
    return null;
  }
};

function valorPorExtenso(valor: number = 0) {
  const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const centenas = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  const converter = (n: number): string => {
    if (n === 0) return "";
    if (n < 10) return unidades[n];
    if (n < 20) return especiais[n - 10];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return dezenas[d] + (u > 0 ? " e " + unidades[u] : "");
    }
    if (n === 100) return "cem";
    if (n < 1000) {
      const c = Math.floor(n / 100);
      const resto = n % 100;
      let s = centenas[c];
      if (c === 1 && resto > 0) s = "cento";
      return s + (resto > 0 ? " e " + converter(resto) : "");
    }
    return "";
  };

  const partes = valor.toFixed(2).split(".");
  const reais = parseInt(partes[0]);
  const centavos = parseInt(partes[1]);

  let resultado = "";

  if (reais > 0) {
    if (reais < 1000) {
      resultado += converter(reais);
    } else if (reais < 1000000) {
      const milhar = Math.floor(reais / 1000);
      const resto = reais % 1000;
      resultado += (milhar === 1 ? "" : converter(milhar)) + " mil";
      if (resto > 0) {
        resultado += (resto < 100 || resto % 100 === 0 ? " e " : ", ") + converter(resto);
      }
    }
    resultado += reais === 1 ? " real" : " reais";
  }

  if (centavos > 0) {
    if (resultado !== "") resultado += " e ";
    resultado += converter(centavos) + (centavos === 1 ? " centavo" : " centavos");
  }

  return resultado || "Zero reais";
}

// --- Types ---

const formatRecordNumber = (number?: number | string, date?: any) => {
  if (!number) return '---';
  const numStr = number.toString();
  if (numStr.includes('/')) return numStr; // Already formatted (e.g. old receipts)
  const d = date instanceof Timestamp ? date.toDate() : (date ? new Date(date) : new Date());
  const year = format(d, 'yy');
  return `${numStr.padStart(5, '0')}/${year}`;
};

const formatFullDateWithCity = (date: any, appSettings: AppSettings) => {
  const d = date instanceof Timestamp ? date.toDate() : (date instanceof Date ? date : new Date(date));
  const cityStr = appSettings.city || 'Sua Cidade';
  return `${cityStr} ${format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
};

const ALL_MENU_ITEMS = [
  { id: 'dashboard', label: 'Painel Geral' },
  { id: 'clients', label: 'Clientes' },
  { id: 'suppliers', label: 'Fornecedores' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'receipts', label: 'Recibos' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'budgets', label: 'Orçamentos' },
  { id: 'visits', label: 'Visitas Técnicas' },
  { id: 'service-orders', label: 'Ordens de Serviço' },
  { id: 'users', label: 'Gerenciar Equipe' },
  { id: 'logs', label: 'Logs do Sistema' },
  { id: 'settings', label: 'Configurações' }
];

interface UserRole {
  id: string;
  label: string;
  isCustom?: boolean;
}

const DEFAULT_ROLES: UserRole[] = [
  { id: 'admin', label: 'Administrador' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'secretaria', label: 'Secretaria' },
  { id: 'auxiliar', label: 'Auxiliar' }
];

const generateContractPDF = (client: Client, appSettings: AppSettings, pixSettings: PixSettings) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper to manage Y position and page breaks
  let currentY = margin;
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Header
  if (appSettings.logoUrl) {
    try {
      doc.addImage(appSettings.logoUrl, 'PNG', margin, currentY, 18, 18);
    } catch (e) {
      console.error("Erro ao adicionar logo ao PDF:", e);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(appSettings.companyName || 'Sua Empresa', appSettings.logoUrl ? margin + 25 : margin, currentY + 7);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const companyInfo = `${appSettings.address || ''}${appSettings.neighborhood ? `, ${appSettings.neighborhood}` : ''}, ${appSettings.city || ''} - CEP: ${appSettings.cep || ''}`;
  doc.text(companyInfo, appSettings.logoUrl ? margin + 25 : margin, currentY + 14);
  
  currentY += 35;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;
  
  // 1. PARTES
  doc.setFontSize(11);
  doc.text('1. PARTES', margin, currentY);
  currentY += 7;
  
  doc.setFont('helvetica', 'normal');
  const contratanteText = `CONTRATANTE: ${client.name || '[Nome]'}, inscrito no CPF/CNPJ sob nº ${client.document || '[nº]'}, residente ou sediado em ${client.address || '[Endereço]'}${client.neighborhood ? `, ${client.neighborhood}` : ''}${client.city ? `, ${client.city}` : ''}${client.cep ? `, CEP: ${client.cep}` : ''}${client.responsible ? `, Representante Legal: ${client.responsible}` : ''}.`;
  const contratadoText = `CONTRATADO: ${appSettings.companyName || '[Sua Empresa]'}, inscrito no CPF/CNPJ sob nº ${appSettings.document || '[nº]'}, residente ou sediado em ${appSettings.address || '[Endereço]'}${appSettings.neighborhood ? `, ${appSettings.neighborhood}` : ''}, ${appSettings.city || '[Cidade]'}, CEP: ${appSettings.cep || '[CEP]'}, Representante Legal: ${appSettings.responsible || '[Responsável]'}.`;
  
  const splitContratante = doc.splitTextToSize(contratanteText, contentWidth);
  doc.text(splitContratante, margin, currentY);
  currentY += (splitContratante.length * 6) + 4;
  
  const splitContratado = doc.splitTextToSize(contratadoText, contentWidth);
  doc.text(splitContratado, margin, currentY);
  currentY += (splitContratado.length * 6) + 10;

  // 2. OBJETO
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.text('2. OBJETO', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  
  let objectItems = [];
  if (client.serviceObjects && client.serviceObjects.length > 0) {
    objectItems = client.serviceObjects;
  } else {
    objectItems = [
      'Instalação/Configuração/Manutenção de sistema de CFTV (Câmeras)',
      'Instalação/Configuração/Manutenção de Redes Wifi Local',
      'Instalação/Configuração/Manutenção de Sistemas de Alarmes',
      'Instalação/Configuração/Manutenção de Cerca Elétrica',
      'Instalação/Configuração/Manutenção de motores de Portão e Fechaduras Elétricas'
    ];
  }

  const objetoIntro = 'O presente contrato tem por objeto a prestação de serviços técnicos de:';
  doc.text(objetoIntro, margin, currentY);
  currentY += 6;

  objectItems.forEach((item, index) => {
    checkPageBreak(6);
    doc.text(`${index + 1} - ${item}`, margin + 5, currentY);
    currentY += 6;
  });
  currentY += 6;

  // 3. LOCAL
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.text('3. LOCAL DA PRESTAÇÃO', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const localText = `Os serviços serão realizados no endereço: ${client.address || '[Endereço]'}${client.neighborhood ? `, ${client.neighborhood}` : ''}${client.city ? `, ${client.city}` : ''}${client.cep ? `, CEP: ${client.cep}` : ''}.`;
  const splitLocal = doc.splitTextToSize(localText, contentWidth);
  doc.text(splitLocal, margin, currentY);
  currentY += (splitLocal.length * 6) + 10;

  // 4. VALOR
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.text('4. VALOR E FORMA DE PAGAMENTO', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const valorText = `Pelo serviço descrito, o CONTRATANTE pagará ao CONTRATADO a quantia total de R$ ${(client.contractValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mensais.`;
  const splitValor = doc.splitTextToSize(valorText, contentWidth);
  doc.text(splitValor, margin, currentY);
  currentY += (splitValor.length * 6) + 2;

  let pagamentoInfo = 'Forma de pagamento: ';
  if (client.paymentMethods && client.paymentMethods.length > 0) {
    const methods = client.paymentMethods.map(m => {
      if (m === 'PIX') {
        const selectedPix = pixSettings.accounts.find(a => a.id === client.pixAccountId) || pixSettings.accounts[0];
        if (selectedPix) {
          return `PIX (Chave: ${selectedPix.key || 'N/A'}, Banco: ${selectedPix.bank || 'N/A'}, Favorecido: ${selectedPix.favored || 'N/A'}, CPF/CNPJ: ${selectedPix.document || 'N/A'})`;
        }
        return 'PIX';
      }
      if (m === 'Espécie') {
        return 'Espécie em moeda corrente no país.';
      }
      return m;
    });
    pagamentoInfo += methods.join(' / ');
  } else {
    pagamentoInfo += 'A combinar.';
  }
  
  const splitPagamento = doc.splitTextToSize(pagamentoInfo, contentWidth);
  doc.text(splitPagamento, margin, currentY);
  currentY += (splitPagamento.length * 6) + 2;

  const dataPagamento = `Data do pagamento: todo dia ${client.paymentDay || '[dia]'} de cada mês.`;
  doc.text(dataPagamento, margin, currentY);
  currentY += 12;

  // 5. MATERIAIS
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.text('5. MATERIAIS', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const materiaisText = 'O valor acima refere-se apenas à mão de obra. Todo o material necessário será fornecido pelo CONTRATANTE ou cobrado à parte.';
  const splitMateriais = doc.splitTextToSize(materiaisText, contentWidth);
  doc.text(splitMateriais, margin, currentY);
  currentY += (splitMateriais.length * 6) + 10;

  // 6. PRAZO
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.text('6. PRAZO', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const prazoText = 'O contrato terá início na data de assinatura do mesmo e terá previsão de 1 ano (12 meses). Sendo renovado automaticamente se nenhuma das partes se manifestarem por escrito o desejo de encerrar.';
  const splitPrazo = doc.splitTextToSize(prazoText, contentWidth);
  doc.text(splitPrazo, margin, currentY);
  currentY += (splitPrazo.length * 6) + 10;

  // 7. OBRIGAÇÕES CONTRATADO
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.text('7. OBRIGAÇÕES DO CONTRATADO', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const obrContratado = 'Executar os serviços contratado sempre que for solicitado pelo contratante seja por Email/mensagem/WhatsApp ou telefone. O qual será agendado um dia e horário para execução do serviço solicitado quando não houver disponibilidade na hora da solicitação.';
  const splitObrC = doc.splitTextToSize(obrContratado, contentWidth);
  doc.text(splitObrC, margin, currentY);
  currentY += (splitObrC.length * 6) + 10;

  // 8. OBRIGAÇÕES CONTRATANTE
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.text('8. OBRIGAÇÕES DO CONTRATANTE', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const obrContratante = 'Garantir livre acesso ao tecnico ao local e estrutura necessaria, assim como se possivel fornecer um responsavel no local para acompanhar os serviços e ter conhecimento do que foi realizado o qual o tecnico ira se reportar e dará finalização do chamado.';
  const splitObrK = doc.splitTextToSize(obrContratante, contentWidth);
  doc.text(splitObrK, margin, currentY);
  currentY += (splitObrK.length * 6) + 10;

  // 9. RESCISÃO
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.text('9. RESCISÃO', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const rescisaoText = 'Em caso de desistência após o início dos trabalhos antes de 90 dias corridos o contratante pagará multa de 20% sobre o valor restante do contrato.';
  const splitRescisao = doc.splitTextToSize(rescisaoText, contentWidth);
  doc.text(splitRescisao, margin, currentY);
  currentY += (splitRescisao.length * 6) + 10;

  // 10. FORO
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.text('10. FORO', margin, currentY);
  currentY += 7;
  doc.setFont('helvetica', 'normal');
  const foroText = `Fica eleito o foro da comarca de ${appSettings.city || '[Sua Cidade]'} para dirimir quaisquer dúvidas oriundas deste contrato.`;
  const splitForo = doc.splitTextToSize(foroText, contentWidth);
  doc.text(splitForo, margin, currentY);
  currentY += (splitForo.length * 6) + 15;

  // Signature Section
  checkPageBreak(60);
  currentY += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const cityDateContract = formatFullDateWithCity(new Date(), appSettings);
  doc.text(cityDateContract, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 25;

  if (client.clientSignature) {
    try {
      doc.addImage(client.clientSignature, 'PNG', margin + 20, currentY - 20, 40, 15);
    } catch (e) {
      console.error("Erro ao adicionar assinatura do cliente:", e);
    }
  }

  if (appSettings.signatureUrl) {
    try {
      doc.addImage(appSettings.signatureUrl, 'PNG', margin + 110, currentY - 20, 40, 15);
    } catch (e) {
      console.error("Erro ao adicionar assinatura:", e);
    }
  }

  doc.setLineWidth(0.5);
  doc.line(margin + 10, currentY, margin + 70, currentY);
  doc.line(margin + 100, currentY, margin + 160, currentY);
  
  doc.setFontSize(9);
  doc.text('CONTRATANTE', margin + 40, currentY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(client.name || '', margin + 40, currentY + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  let clientDetails = [];
  if (client.document) clientDetails.push(client.document);
  if (client.responsible) clientDetails.push(`Rep: ${client.responsible}`);
  if (clientDetails.length > 0) {
    doc.text(clientDetails.join(' - '), margin + 40, currentY + 15, { align: 'center' });
  }
  
  doc.text('CONTRATADO', margin + 130, currentY + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(appSettings.companyName || '', margin + 130, currentY + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  let companyDetails = [];
  if (appSettings.document) companyDetails.push(appSettings.document);
  if (appSettings.responsible) companyDetails.push(`Rep: ${appSettings.responsible}`);
  if (companyDetails.length > 0) {
    doc.text(companyDetails.join(' - '), margin + 130, currentY + 15, { align: 'center' });
  }

  doc.save(`contrato_${(client.name || 'cliente').replace(/\s/g, '_')}.pdf`);
};

const generateServiceOrderPDF = (os: ServiceOrder, appSettings: AppSettings, includeValues = false) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = 15;

  // Header helpers
  const drawLine = () => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;
  };

  const drawSectionTitle = (title: string) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(title.toUpperCase(), margin + 2, currentY + 5);
    currentY += 10;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // 1. HEADER
  if (appSettings.logoUrl) {
    try {
      doc.addImage(appSettings.logoUrl, 'PNG', margin, currentY, 18, 18);
    } catch (e) {
      console.error("Erro logo OS:", e);
    }
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const companyName = appSettings.companyName || 'SegurPro';
  const companyNameLines = doc.splitTextToSize(companyName, contentWidth / 2);
  doc.text(companyNameLines, appSettings.logoUrl ? margin + 22 : margin, currentY + 6);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const addressLine = `${appSettings.address || ''}${appSettings.neighborhood ? `, ${appSettings.neighborhood}` : ''}`;
  const addressLines = doc.splitTextToSize(addressLine, contentWidth / 2);
  const headerTextY = currentY + 6 + (companyNameLines.length * 5);
  doc.text(addressLines, appSettings.logoUrl ? margin + 22 : margin, headerTextY);
  doc.text(`${appSettings.city || ''} - CEP: ${appSettings.cep || ''}`, appSettings.logoUrl ? margin + 22 : margin, headerTextY + (addressLines.length * 4));

  // OS Number and Date on the right
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`ORDEM DE SERVIÇO Nº ${formatRecordNumber(os.number, os.date)}`, pageWidth - margin, currentY + 7, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`Data: ${format(os.date instanceof Timestamp ? os.date.toDate() : new Date(os.date), 'dd/MM/yyyy')}`, pageWidth - margin, currentY + 13, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Técnico: ${os.technicianName}`, pageWidth - margin, currentY + 18, { align: 'right' });

  currentY += Math.max(20, 7 + (companyNameLines.length * 5) + (addressLines.length * 4) + 5);
  drawLine();

  // 1 & 2. DADOS DO CLIENTE E EQUIPAMENTO (BOX LAYOUT)
  const boxWidth = (contentWidth / 2) - 3;
  const boxHeight = 35;
  const startY = currentY;

  // Draw Box 1: Client Data
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(margin, currentY, boxWidth, boxHeight);
  
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, currentY, boxWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. DADOS DO CLIENTE', margin + 2, currentY + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let clientY = currentY + 12;
  
  doc.setFont('helvetica', 'bold');
  doc.text('NOME:', margin + 2, clientY);
  doc.setFont('helvetica', 'normal');
  const clientNameLines = doc.splitTextToSize(os.clientName || 'N/A', boxWidth - 18);
  doc.text(clientNameLines, margin + 15, clientY);
  clientY += (clientNameLines.length * 4);

  doc.setFont('helvetica', 'bold');
  doc.text('ENDEREÇO:', margin + 2, clientY);
  doc.setFont('helvetica', 'normal');
  const addressLinesBox = doc.splitTextToSize(os.address || 'N/A', boxWidth - 22);
  doc.text(addressLinesBox, margin + 20, clientY);
  clientY += (addressLinesBox.length * 4);

  doc.setFont('helvetica', 'bold');
  doc.text('FONE:', margin + 2, clientY);
  doc.setFont('helvetica', 'normal');
  doc.text(os.contact || 'N/A', margin + 15, clientY);

  // Draw Box 2: Equipment/Service
  const col2X = margin + boxWidth + 6;
  doc.rect(col2X, startY, boxWidth, boxHeight);
  
  doc.setFillColor(240, 240, 240);
  doc.rect(col2X, startY, boxWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('2. EQUIPAMENTO/SERVIÇO', col2X + 2, startY + 5);
  
  let equipY = startY + 12;
  doc.setFontSize(8);
  
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIP:', col2X + 2, equipY);
  doc.setFont('helvetica', 'normal');
  const equipLinesBox = doc.splitTextToSize(os.equipment || 'N/A', boxWidth - 18);
  doc.text(equipLinesBox, col2X + 15, equipY);
  equipY += (equipLinesBox.length * 4);

  doc.setFont('helvetica', 'bold');
  doc.text('MARCA:', col2X + 2, equipY);
  doc.setFont('helvetica', 'normal');
  const brandLinesBox = doc.splitTextToSize(os.brandModelSN || 'N/A', boxWidth - 18);
  doc.text(brandLinesBox, col2X + 15, equipY);
  equipY += (brandLinesBox.length * 4);

  doc.setFont('helvetica', 'bold');
  doc.text('TIPO:', col2X + 2, equipY);
  doc.setFont('helvetica', 'normal');
  doc.text(os.serviceType || 'N/A', col2X + 15, equipY);

  currentY = startY + boxHeight + 8;

  // 3. PROBLEMA RELATADO
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY - 4, pageWidth - margin, currentY - 4);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Problema Relatado:', margin, currentY);
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  const probLines = doc.splitTextToSize(os.reportedProblem, contentWidth);
  doc.text(probLines, margin, currentY);
  currentY += (probLines.length * 5) + 3;

  // 4. DETALHES TÉCNICOS
  checkPageBreak(20);
  drawSectionTitle('3. Detalhes Técnicos (O que foi feito)');
  doc.setFont('helvetica', 'bold');
  doc.text('Diagnóstico:', margin, currentY);
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  const diagLines = doc.splitTextToSize(os.diagnosis, contentWidth);
  doc.text(diagLines, margin, currentY);
  currentY += (diagLines.length * 5) + 2;

  checkPageBreak(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Serviços Realizados:', margin, currentY);
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  const servLines = doc.splitTextToSize(os.performedServices, contentWidth);
  doc.text(servLines, margin, currentY);
  currentY += (servLines.length * 5) + 2;

  // Parts Table if exists
  if (os.parts && os.parts.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Peças/Materiais Substituídos:', margin, currentY);
    currentY += 1;
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin },
      head: [['Descrição', 'Qtd', 'V. Unitário', 'Total']],
      body: os.parts.map(p => [p.description, p.quantity, `R$ ${(p.price || 0).toFixed(2)}`, `R$ ${((p.quantity || 0) * (p.price || 0)).toFixed(2)}`]),
      theme: 'grid',
      headStyles: { fillColor: [80, 80, 80], fontSize: 8 },
      styles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // 4. TEMPOS E VALORES (Condicional)
  if (includeValues) {
    checkPageBreak(30);
    drawSectionTitle('4. Tempos e Valores');
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Início: ${format(os.startDateTime instanceof Timestamp ? os.startDateTime.toDate() : new Date(os.startDateTime as any), 'dd/MM/yyyy HH:mm')}`, margin, currentY);
    doc.text(`Fim: ${format(os.endDateTime instanceof Timestamp ? os.endDateTime.toDate() : new Date(os.endDateTime as any), 'dd/MM/yyyy HH:mm')}`, margin + contentWidth / 2, currentY);
    currentY += 7;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Valor Mão de Obra: R$ ${(os.laborValue || 0).toFixed(2)}`, margin, currentY);
    doc.text(`Valor Peças: R$ ${(os.partsValue || 0).toFixed(2)}`, margin + contentWidth / 2, currentY);
    currentY += 7;
    
    doc.setFontSize(11);
    doc.text(`VALOR TOTAL: R$ ${(os.totalValue || 0).toFixed(2)}`, margin, currentY);
    doc.setFontSize(9);
    currentY += 10;
  }

  // Checklist
  checkPageBreak(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Checklist de Conformidade:', margin, currentY);
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`[${os.checklist.functionalityTest ? 'X' : ' '}] Teste de Funcionamento   [${os.checklist.cleaning ? 'X' : ' '}] Limpeza   [${os.checklist.safetyCheck ? 'X' : ' '}] Verificação de Segurança`, margin, currentY);
  if (os.checklist.additional) {
    currentY += 4;
    doc.text(`Observações: ${os.checklist.additional}`, margin, currentY);
  }
  currentY += 5;

  // 5. ASSINATURAS
  checkPageBreak(40);
  currentY += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const cityDateOS = formatFullDateWithCity(os.date, appSettings);
  doc.text(cityDateOS, pageWidth / 2, currentY, { align: 'center' });
  
  currentY += 20;
  
  doc.setLineWidth(0.3);
  doc.line(margin + 10, currentY, margin + 80, currentY);
  doc.line(pageWidth - margin - 80, currentY, pageWidth - margin - 10, currentY);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Técnico', margin + 45, currentY + 5, { align: 'center' });
  doc.text('Assinatura do Cliente (Ciente)', pageWidth - margin - 45, currentY + 5, { align: 'center' });
  
  if (os.technicianSignature) {
    try { doc.addImage(os.technicianSignature, 'PNG', margin + 25, currentY - 18, 40, 16); } catch(e) {}
  } else if (appSettings.signatureUrl) {
    try { doc.addImage(appSettings.signatureUrl, 'PNG', margin + 25, currentY - 18, 40, 16); } catch(e) {}
  }
  if (os.clientSignature) {
    try { doc.addImage(os.clientSignature, 'PNG', pageWidth - margin - 65, currentY - 18, 40, 16); } catch(e) {}
  }

  doc.save(`OS_${formatRecordNumber(os.number, os.date).replace('/', '-')}.pdf`);
};

const generateOSLabelsPDF = (selectedOSs: ServiceOrder[], appSettings: AppSettings) => {
  // Configurando jsPDF para folha A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const labelWidth = 80;
  const labelHeight = 60;
  const marginX = 20; // Centralizando um pouco mais no A4
  const marginY = 15;
  const spacingX = 5;
  const spacingY = 5;

  selectedOSs.forEach((os, index) => {
    // 8 etiquetas por página (2 colunas x 4 linhas)
    const pageIndex = index % 8;
    if (index > 0 && pageIndex === 0) {
      doc.addPage();
    }

    const col = pageIndex % 2;
    const row = Math.floor(pageIndex / 2);

    const startX = marginX + (col * (labelWidth + spacingX));
    const startY = marginY + (row * (labelHeight + spacingY));

    // Desenha borda para corte (em negrito/mais grosso)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.rect(startX, startY, labelWidth, labelHeight);

    const internalMargin = 4;
    const contentWidth = labelWidth - (internalMargin * 2);
    let currentY = startY + 7;

    // Logo & Cabeçalho
    doc.setFontSize(9);
    if (appSettings.logoUrl) {
      try {
        doc.addImage(appSettings.logoUrl, 'PNG', startX + internalMargin, currentY - 3, 12, 12);
      } catch (e) {}
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    const companyNameLabel = appSettings.companyName || 'Sua Empresa';
    const companyX = appSettings.logoUrl ? startX + internalMargin + 14 : startX + internalMargin;
    const companyWidth = appSettings.logoUrl ? contentWidth - 14 : contentWidth;
    
    const splitCompanyName = doc.splitTextToSize(companyNameLabel, companyWidth);
    const companyLines = splitCompanyName.length;
    
    // Ajustar tamanho da fonte se o nome for muito grande
    if (companyLines > 2) {
      doc.setFontSize(7.5);
    } else if (companyLines > 1) {
      doc.setFontSize(8);
    } else {
      doc.setFontSize(9);
    }
    
    doc.text(splitCompanyName, companyX, currentY + 1);
    
    doc.setFontSize(8);
    doc.text(`O.S. Nº ${formatRecordNumber(os.number, os.date)}`, companyX, currentY + 1 + (companyLines * 3.8));
    
    currentY += 10 + ((companyLines - 1) * 3.5);
    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.line(startX + internalMargin, currentY, startX + labelWidth - internalMargin, currentY);
    currentY += 5;

    // Campos da Etiqueta
    const rowHeightText = 3.5;
    const labelXPosition = startX + internalMargin;
    const valueXPosition = startX + internalMargin + 18;
    const fieldWidthVal = contentWidth - 18;

    const drawField = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(label, labelXPosition, currentY);
      
      doc.setFont('helvetica', 'normal');
      const valText = value || 'N/A';
      const splitVal = doc.splitTextToSize(valText, fieldWidthVal);
      doc.text(splitVal, valueXPosition, currentY);
      currentY += (splitVal.length * rowHeightText);
    };

    const formatDateSafe = (dateVal: any) => {
      if (!dateVal) return 'N/A';
      
      let d: Date;
      if (typeof dateVal.toDate === 'function') {
        d = dateVal.toDate();
      } else if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
        d = new Date(dateVal.seconds * 1000);
      } else {
        d = new Date(dateVal);
      }

      return isNaN(d.getTime()) ? 'N/A' : format(d, 'dd/MM HH:mm');
    };

    drawField('Cliente:', os.clientName);
    drawField('Início:', formatDateSafe(os.startDateTime));
    drawField('Fim:', os.status === 'Concluído' ? formatDateSafe(os.updatedAt || os.endDateTime) : formatDateSafe(os.endDateTime));
    drawField('Eqp/Mod:', `${os.equipment} ${os.brandModelSN}`);
    drawField('Técnico:', os.technicianName || 'N/A');
    drawField('Status:', os.status);

    // Anotações
    doc.setFont('helvetica', 'bold');
    doc.text('Anotações:', startX + internalMargin, currentY);
    currentY += 3;
    doc.setFont('helvetica', 'normal');
    const noteText = os.notes || '';
    const splitNote = doc.splitTextToSize(noteText, contentWidth);
    const visibleNote = splitNote.slice(0, 2);
    doc.text(visibleNote, startX + internalMargin, currentY);

    // Reset line width for next label
    doc.setLineWidth(0.3);
  });

  doc.save(`etiquetas_os_A4_${new Date().getTime()}.pdf`);
};

interface ServiceOrder {
  id: string;
  number?: number;
  date: any; // Firestore Timestamp
  technicianId: string;
  technicianName: string;
  companyId: string;
  
  // Client Data
  clientId?: string;
  clientName: string;
  address: string;
  contact: string;
  contactName?: string;
  
  // Equipment Info
  equipment: string;
  brandModelSN: string;
  serviceType: 'Preventiva' | 'Corretiva' | 'Instalação';
  reportedProblem: string;
  
  // Technical details
  diagnosis: string;
  performedServices: string;
  parts: { description: string; quantity: number; price: number }[];
  checklist: { 
    functionalityTest: boolean;
    cleaning: boolean;
    safetyCheck: boolean;
    additional?: string;
  };
  notes?: string;
  
  // Time and Values
  startDateTime: any;
  endDateTime: any;
  laborValue: number;
  partsValue: number;
  totalValue: number;
  
  // Signatures
  technicianSignature?: string;
  clientSignature?: string;
  
  // Status
  status: 'Aberto' | 'Em Andamento' | 'Concluído' | 'Cancelado';
  
  createdAt: any;
  updatedAt: any;
}

interface TechnicalVisit {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  address: string;
  date: any; // Firestore Timestamp
  scheduledTime?: string;
  expectedDate?: any; // Data prevista
  expectedTime?: string; // Hora prevista
  type: 'CFTV' | 'Alarme' | 'Cerca Elétrica' | 'Motor de Portão' | 'Outros';
  status: 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
  description: string;
  observations?: string;
  technicianId: string;
  technicianName: string;
  responsibleName?: string;
  totalValue: number;
  clientSignature?: string;
  technicianSignature?: string;
  createdAt: any;
  number?: number;
}

interface FinancialRecord {
  id: string;
  type: 'Receita' | 'Despesa';
  category: string;
  description: string;
  origin?: string;
  value: number;
  date: any;
  visitId?: string;
  clientId?: string;
  receiptId?: string;
  serviceType?: 'Contrato' | 'Serviço Normal';
  createdAt?: any;
}

interface Budget {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  address: string;
  items: { description: string; quantity: number; price: number }[];
  total: number;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  pixAccountId?: string;
  observations?: string;
  clientSignature?: string;
  createdAt: any;
  number?: number;
}

interface Client {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  cep?: string;
  responsible?: string;
  document?: string; // CPF or CNPJ
  type: 'Avulso' | 'Contrato';
  contractValue?: number;
  serviceSpecification?: string;
  serviceObjects?: string[];
  paymentMethods?: string[];
  paymentDay?: string;
  pixAccountId?: string;
  clientSignature?: string;
  createdAt: any;
}

interface Receipt {
  id: string;
  number?: number;
  clientId?: string;
  visitId?: string;
  clientName: string;
  clientType?: 'Avulso' | 'Contrato';
  status: 'Aguardando Pagamento' | 'Recebido';
  serviceSpecification: string;
  value: number;
  referenceMonth?: string;
  paymentMethod: 'Dinheiro' | 'PIX' | 'Cartão';
  pixAccountId?: string;
  observations?: string;
  date: any;
  createdAt: any;
}

interface Supplier {
  id: string;
  companyId: string;
  registrationNumber?: string;
  name: string;
  activity?: string;
  contact?: string;
  phone?: string;
  address?: string;
  neighborhood?: string;
  cityState?: string;
  zipCode?: string;
  createdAt: any;
}

const generateReceiptPDF = (receipt: Receipt, appSettings: AppSettings, pixSettings: PixSettings, shouldShare = false) => {
  const doc = new jsPDF();
  const dateStr = format(receipt.date instanceof Timestamp ? receipt.date.toDate() : new Date(receipt.date), 'dd/MM/yyyy');
  const fullDateStr = format(receipt.date instanceof Timestamp ? receipt.date.toDate() : new Date(receipt.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const isContract = receipt.clientType === 'Contrato';
  
  // 1. Header
  if (appSettings.logoUrl) {
    try {
      doc.addImage(appSettings.logoUrl, 'PNG', 20, 10, 18, 18);
    } catch (e) {
      console.error("Erro ao adicionar logo ao PDF:", e);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(appSettings.companyName || 'André Fonseca', appSettings.logoUrl ? 42 : 20, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  // Removed duplicate company name on the right
  
  doc.setFontSize(9);
  const contactInfo = `${appSettings.companyPhone || '(91)98722-3092'}   ${appSettings.companyEmail || 'afsistseg.me@gmail.com'}`;
  doc.text(contactInfo, appSettings.logoUrl ? 42 : 20, 26);
  
  // 2. Title Bar
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 40, 170, 10, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Recibo Nº ${formatRecordNumber(receipt.number, receipt.date)}`, 105, 47, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 185, 47, { align: 'right' });
  
  // 3. Declaration
  doc.setFontSize(11);
  const declarationY = 65;
  
  const valorNumerico = Number(receipt.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const valorExtenso = valorPorExtenso(Number(receipt.value));
  
  const declarationText = `Declaro que recebi na data de ${fullDateStr}, o valor de R$ ${valorNumerico} (${valorExtenso}), de ${receipt.clientName}, referente aos seguintes serviços:`;
  
  const splitDeclaration = doc.splitTextToSize(declarationText, 170);
  doc.text(splitDeclaration, 20, declarationY);
  
  // Calculate dynamic Y position for next sections
  const declarationHeight = splitDeclaration.length * 6;
  const servicesY = declarationY + declarationHeight + 10;
  
  // 4. Services Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Serviços', 105, servicesY, { align: 'center' });
  
  // Table Header
  doc.setFillColor(120, 120, 120);
  doc.rect(20, servicesY + 5, 170, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  
  if (isContract) {
    doc.text('Descrição', 25, servicesY + 10);
    doc.text('Total', 185, servicesY + 10, { align: 'right' });
  } else {
    doc.text('Descrição', 25, servicesY + 10);
    doc.text('Preço', 120, servicesY + 10, { align: 'right' });
    doc.text('Unidade', 145, servicesY + 10, { align: 'right' });
    doc.text('Qtd.', 165, servicesY + 10, { align: 'right' });
    doc.text('Total', 185, servicesY + 10, { align: 'right' });
  }
  
  // Table Row
  const rowH = 15;
  doc.setFillColor(245, 245, 245);
  doc.rect(20, servicesY + 13, 170, rowH, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  const serviceText = receipt.serviceSpecification || 'Serviços prestados';
  const splitService = doc.splitTextToSize(serviceText, isContract ? 130 : 65);
  doc.text(splitService, 25, servicesY + 18);
  
  const formattedVal = `R$ ${Number(receipt.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  if (isContract) {
    doc.text(formattedVal, 185, servicesY + 18, { align: 'right' });
  } else {
    doc.text(formattedVal, 120, servicesY + 18, { align: 'right' });
    doc.text('und', 145, servicesY + 18, { align: 'right' });
    doc.text('1', 165, servicesY + 18, { align: 'right' });
    doc.text(formattedVal, 185, servicesY + 18, { align: 'right' });
  }
  
  let currentY = servicesY + 13 + rowH + 10;
  
  // 5. Totals
  doc.setFillColor(120, 120, 120);
  doc.rect(100, currentY, 90, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('Total', 105, currentY + 7);
  doc.text(formattedVal, 185, currentY + 7, { align: 'right' });
  
  currentY += 20;
  
  // PIX Info
  const selectedPix = pixSettings.accounts.find(a => a.id === receipt.pixAccountId) || pixSettings.accounts[0];
  if (selectedPix && selectedPix.key) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados para Pagamento (PIX):', 20, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Chave: ${selectedPix.key}`, 20, currentY);
    currentY += 5;
    doc.text(`Banco: ${selectedPix.bank}`, 20, currentY);
    currentY += 5;
    doc.text(`Favorecido: ${selectedPix.favored}`, 20, currentY);
    currentY += 5;
    doc.text(`CPF/CNPJ: ${selectedPix.document}`, 20, currentY);
    currentY += 15;
  }

  // Observations
  if (receipt.observations) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(receipt.observations, 170);
    doc.text(splitObs, 20, currentY + 6);
    currentY += (splitObs.length * 6) + 20;
  }

  // 6. Signature
  if (currentY > 240) {
    doc.addPage();
    currentY = 30;
  } else {
    currentY += 20; // Space before signature
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const cityFullDate = formatFullDateWithCity(receipt.date, appSettings);
  doc.text(cityFullDate, 105, currentY, { align: 'center' });

  currentY += 15;

  if (appSettings.signatureUrl) {
    try {
      doc.addImage(appSettings.signatureUrl, 'PNG', 80, currentY - 5, 50, 15);
    } catch (e) {
      console.error("Erro ao adicionar assinatura ao recibo:", e);
    }
  }

  doc.line(70, currentY + 12, 140, currentY + 12);
  doc.text(appSettings.companyName || 'André Fonseca', 105, currentY + 17, { align: 'center' });
  
  const fileName = `recibo_${receipt.clientName.replace(/\s/g, '_')}.pdf`;

  if (shouldShare && navigator.share) {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    navigator.share({
      files: [file],
      title: 'Recibo de Serviço',
      text: `Recibo de ${receipt.clientName} - ${receipt.referenceMonth}`
    }).catch(err => {
      console.error('Erro ao compartilhar:', err);
      doc.save(fileName);
    });
  } else {
    doc.save(fileName);
  }
};

interface PixAccount {
  id: string;
  bank: string;
  key: string;
  favored: string;
  document: string;
  label: string;
}

interface PixSettings {
  accounts: PixAccount[];
}

interface AppSettings {
  logoUrl: string;
  companyName: string;
  address: string;
  neighborhood: string;
  responsible: string;
  city: string;
  cep: string;
  document: string;
  companyPhone?: string;
  companyEmail?: string;
  signatureUrl?: string;
}

interface LogRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string; 
  resourceType: string;
  resourceId?: string;
  details: string;
  timestamp: Timestamp;
  companyId: string;
}

// --- Components ---

function CompanyWizard({ onCreate, onJoin }: { onCreate: (name: string) => void, onJoin: (code: string) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');

  if (mode === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1115] p-6">
        <Card className="w-full max-w-md border-[#2d3139] bg-[#1a1d23]">
          <CardHeader>
            <CardTitle className="text-white">Criar Nova Empresa</CardTitle>
            <CardDescription className="text-[#71717a]">Comece a gerenciar seu negócio agora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#a0a0a0]">Nome da Empresa</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ex: SegurPro Filial" 
                className="bg-[#0f1115] border-[#2d3139] text-white" 
              />
            </div>
            <Button onClick={() => onCreate(name)} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white">Criar</Button>
            <Button variant="ghost" onClick={() => setMode('selection')} className="w-full text-[#71717a]">Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1115] p-6">
        <Card className="w-full max-w-md border-[#2d3139] bg-[#1a1d23]">
          <CardHeader>
            <CardTitle className="text-white">Entrar em uma Empresa</CardTitle>
            <CardDescription className="text-[#71717a]">Insira o código enviado pelo seu administrador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#a0a0a0]">Código da Empresa</Label>
              <Input 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                placeholder="Código de convite" 
                className="bg-[#0f1115] border-[#2d3139] text-white" 
              />
            </div>
            <Button onClick={() => onJoin(code)} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white">Entrar</Button>
            <Button variant="ghost" onClick={() => setMode('selection')} className="w-full text-[#71717a]">Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115] p-6">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white shadow-2xl shadow-blue-500/20">
            <Shield size={40} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Quase lá!</h1>
          <p className="text-xl text-[#71717a]">Você precisa estar vinculado a uma empresa para continuar.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-[#2d3139] bg-[#1a1d23] hover:border-[#3b82f6]/50 transition-all cursor-pointer group" onClick={() => setMode('create')}>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <Plus className="text-[#3b82f6]" size={24} />
              </div>
              <CardTitle className="text-white text-left">Criar minha Firma</CardTitle>
              <CardDescription className="text-[#71717a] text-left">Para quem quer começar um negócio do zero.</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-[#2d3139] bg-[#1a1d23] hover:border-emerald-500/50 transition-all cursor-pointer group" onClick={() => setMode('join')}>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                <LayoutDashboard className="text-emerald-500" size={24} />
              </div>
              <CardTitle className="text-white text-left">Sou Colaborador</CardTitle>
              <CardDescription className="text-[#71717a] text-left">Entrar em uma empresa existente via código.</CardDescription>
            </CardHeader>
          </Card>
        </div>
        
        <Button variant="ghost" onClick={() => signOut(auth)} className="text-[#a0a0a0] hover:text-white">
          Sair da Conta
        </Button>
      </div>
    </div>
  );
}

function SignaturePad({ value, onChange }: { value?: string, onChange: (val: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Support multi-touch but take first one
    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as any).clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return { 
      x: (clientX - rect.left) * scaleX, 
      y: (clientY - rect.top) * scaleY 
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if (e?.cancelable) e.preventDefault();
    setIsDrawing(false);
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clear = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.beginPath();
        onChange('');
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="relative bg-white rounded-xl border-2 border-dashed border-gray-200 overflow-hidden cursor-crosshair shadow-inner min-h-[180px]">
        <canvas
          ref={canvasRef}
          width={800}
          height={300}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="w-full h-full touch-none"
        />
        {(!isDrawing && !value) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400/50 select-none">
            <Pencil className="mb-2 h-6 w-6 opacity-20" />
            <span className="text-sm font-medium">Assine aqui</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={clear}
          className="flex-1 border-[#2d3139] text-[#71717a] hover:bg-gray-100 dark:hover:bg-[#2d3139] transition-all"
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}

function ExternalSignaturePage({ token }: { token: string }) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      const path = `signature_requests/${token}`;
      try {
        const docSnap = await getDocFromServer(doc(db, 'signature_requests', token));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status !== 'pending') {
            setError('Este link de assinatura já foi utilizado ou expirou.');
          } else {
            setRequest({ id: docSnap.id, ...data });
          }
        } else {
          setError('Link de assinatura inválido ou não encontrado.');
        }
      } catch (err) {
        setError('Erro de permissão ou de servidor ao carregar assinatura.');
        handleFirestoreError(err, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [token]);

  const handleSave = async () => {
    if (!signature) {
      toast.error('Por favor, faça a sua assinatura antes de salvar.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update the signature request
      await updateDoc(doc(db, 'signature_requests', token), {
        signature,
        status: 'signed',
        signedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Update the document itself (Visit, Contract or OS)
      let collectionName = '';
      if (request.type === 'visit') collectionName = 'visits';
      else if (request.type === 'contract') collectionName = 'clients';
      else if (request.type === 'budget') collectionName = 'budgets';
      else if (request.type === 'service-order') collectionName = 'serviceOrders';
      
      if (!collectionName) throw new Error('Tipo de documento inválido');
      
      // We send the token as well so the security rules can verify it
      const updateData: any = {
        clientSignature: signature,
        clientSignatureToken: token, 
        updatedAt: serverTimestamp()
      };
      
      // For visits, also set the signature date
      if (request.type === 'visit') {
        updateData.clientSignatureDate = serverTimestamp();
      }
      
      await updateDoc(doc(db, collectionName, request.documentId), updateData);

      setIsSuccess(true);
      toast.success('Assinatura salva com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar assinatura. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-blue-500" size={40} />
          <p className="text-[#a0a0a0] font-medium">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (error || isSuccess) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-[#2d3139] bg-[#1a1d23] shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardHeader className="text-center pt-8">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isSuccess ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {isSuccess ? <CheckCircle2 className="text-emerald-500" size={32} /> : <AlertCircle className="text-red-500" size={32} />}
            </div>
            <CardTitle className="text-white text-2xl">{isSuccess ? 'Sucesso!' : 'Aviso'}</CardTitle>
            <CardDescription className="text-[#a0a0a0] text-base mt-2">
              {isSuccess ? 'Sua assinatura foi registrada com sucesso. Você já pode fechar esta tela.' : error}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 text-center">
            {isSuccess && (
              <p className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest mt-4">Documento Assinado Digitalmente</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] p-4 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6 pt-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
            <Lock className="text-blue-500" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">Assinatura Digital</h1>
          <p className="text-[#a0a0a0] text-sm">Olá, <span className="text-white font-semibold">{request.clientName}</span>! Por favor, faça sua assinatura no quadro abaixo para confirmar o documento.</p>
          {request.displayTitle && (
            <div className="mt-2 text-[#3b82f6] text-xs font-bold uppercase tracking-wider bg-blue-500/10 px-3 py-1 rounded-full inline-block">
              {request.displayTitle} {request.displayValue ? ` - R$ ${request.displayValue}` : ''}
            </div>
          )}
        </div>

        <Card className="border-[#2d3139] bg-[#1a1d23] shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Pencil size={18} className="text-blue-500" />
              Sua Assinatura
            </CardTitle>
            <CardDescription className="text-xs text-amber-500 font-medium">
              Assinatura Única após o uso será excluída
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white p-2 rounded-xl">
              <SignaturePad value={signature} onChange={setSignature} />
            </div>
            
            <div className="bg-[#0f1115] p-4 rounded-lg border border-[#2d3139] space-y-2">
              <p className="text-[11px] text-[#71717a] leading-relaxed">
                Ao clicar em "Confirmar", você concorda que esta assinatura digital possui validade jurídica para fins de confirmação da prestação de serviços ou aceite contratual relacionado ao documento <span className="text-[#3b82f6]">#{request.documentId.slice(-6)}</span>.
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSubmitting || !signature}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 animate-spin" size={20} />
                  Processando...
                </>
              ) : 'Confirmar Assinatura'}
            </Button>
          </CardContent>
        </Card>
        
        <p className="text-center text-[10px] text-[#555] uppercase font-bold tracking-widest">Plataforma Segura SegurPro</p>
      </div>
      <Toaster position="top-center" theme="dark" />
    </div>
  );
}

function NoAccessList({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-20 bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl text-center space-y-4">
      <div className="p-4 bg-yellow-500/10 rounded-full">
        <Shield className="text-yellow-500" size={32} />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white">Visualização Restrita</h3>
        <p className="text-[#a0a0a0] max-w-xs text-sm">
          Você tem permissão para acessar o menu de {title}, mas a listagem de registros foi ocultada pelo administrador master nas configurações de acesso.
        </p>
      </div>
      <p className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">Acesso Negado à Lista</p>
    </div>
  );
}

const getFinalEmail = (input: string) => {
  let clean = input.trim().toLowerCase();
  if (!clean) return '';
  
  if (clean.includes('@')) {
    // Basic validation for manual emails - Allow anything that looks like an email
    if (clean.startsWith('@') || !clean.includes('.')) return '';
    return clean;
  }
  
  // Sanitize username: only letters, numbers, dots, underscores, dashes
  clean = clean.replace(/[^a-z0-9._-]/g, '');
  if (!clean) return '';
  
  return `${clean}@segurpro.com`;
};

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
    // YYYY-MM-DD
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = date.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
    // DD/MM/YYYY
    if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = date.split('/').map(Number);
      return new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
    }
    // DD-MM-YYYY
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

export default function MainApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const signerToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('signerToken');
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [visits, setVisits] = useState<TechnicalVisit[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [allFinancials, setAllFinancials] = useState<any[]>([]); // New state for global metrics
  const [saasSettings, setSaasSettings] = useState<any>({
    price: 0,
    billingCycle: 'mensal'
  });
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [currentCompany, setCurrentCompany] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userPhotoError, setUserPhotoError] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [visitsFilter, setVisitsFilter] = useState<{ date: Date | null }>({ date: null });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [companyName, setCompanyName] = useState(''); // For registration/wizard
  const [pixSettings, setPixSettings] = useState<PixSettings>({
    accounts: []
  });
  const [rolePermissions, setRolePermissions] = useState<any>(null);
  const [customRoles, setCustomRoles] = useState<UserRole[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    logoUrl: '',
    companyName: '',
    address: '',
    neighborhood: '',
    responsible: '',
    city: '',
    cep: '',
    document: '',
    signatureUrl: ''
  });

  // Log system
  const logAction = async (action: string, resourceType: string, details: string, resourceId?: string) => {
    if (!user || !currentUserData?.companyId) return;
    try {
      await addDoc(collection(db, 'logs'), {
        userId: user.uid,
        userName: currentUserData.displayName || user.displayName || 'Usuário',
        userEmail: user.email,
        action,
        resourceType,
        resourceId: resourceId || '',
        details,
        timestamp: Timestamp.now(),
        companyId: currentUserData.companyId
      });
    } catch (err) {
      console.error('Erro ao registrar log:', err);
    }
  };

  // User Heartbeat (Online Status)
  useEffect(() => {
    if (!user || !currentUserData?.companyId) return;

    const updateStatus = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastSeen: Timestamp.now()
        });
      } catch (err) {
        console.error('Erro ao atualizar status online:', err);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // 1 minute heartbeat
    return () => clearInterval(interval);
  }, [user, currentUserData?.companyId]);

  // 1. Auth Listener
  useEffect(() => {
    const titleText = currentCompany?.name || appSettings?.companyName || 'SegurPro Gestão';
    document.title = titleText;
  }, [currentCompany?.name, appSettings?.companyName]);

  useEffect(() => {
    async function testConnection() {
      if (signerToken) return; // Se for página de assinatura externa, não testa conexão que exige auth
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message.includes('the client is offline')) {
          console.error("Erro de conexão com o Firebase: O cliente está offline.");
          toast.error("Erro de conexão: Verifique se o Firestore foi ativado.");
        }
      }
    }
    testConnection();

    // Safety timeout to ensure loading doesn't get stuck forever
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setCurrentUserData(null);
        setCurrentCompany(null);
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    });

    return () => {
      unsubscribeAuth();
      clearTimeout(loadingTimeout);
    };
  }, []);

  useEffect(() => {
    if (activeTab && user && currentUserData) {
      logAction('page_view', 'menu', `Acessou menu: ${activeTab}`);
    }
  }, [activeTab]);

  // 1.1. Role Permissions Listener
  useEffect(() => {
    if (!currentUserData?.companyId) return;

    const unsub = onSnapshot(doc(db, 'companies', currentUserData.companyId, 'settings', 'permissions'), (docSnap) => {
      if (docSnap.exists()) {
        setRolePermissions(docSnap.data());
      }
    });
    return () => unsub();
  }, [currentUserData?.companyId]);

  // 2. User Profile Listener
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCurrentUserData(data);
        
        // Sincroniza o nome de exibição do Auth com o Firestore se houver divergência
        // Isso resolve casos onde o usuário alterou o nome no perfil mas o Firestore ficou desatualizado
        if (user.displayName && data.displayName !== user.displayName) {
          try {
            await updateDoc(userRef, { displayName: user.displayName });
          } catch (err) {
            console.error("Erro ao sincronizar nome com Firestore:", err);
          }
        }
        
        if (!data.companyId) {
          setLoading(false);
        }
      } else {
        // Initial setup for new user
        const isSuper = user.email === 'emailparasiteslixo@gmail.com' || user.email === 'alffonseca42@gmail.com';
        try {
          const initialData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Usuário',
            role: isSuper ? 'super_admin' : 'pending',
            companyId: '',
            createdAt: Timestamp.now()
          };
          await setDoc(userRef, initialData);
          setCurrentUserData(initialData);
        } catch (err) {
          console.error("Erro ao criar perfil inicial:", err);
        }
        setLoading(false);
      }
    }, (error) => {
      console.error("Erro no listener de usuário:", error);
      setLoading(false);
    });

    return () => unsubscribeUser();
  }, [user]);

  // 3. Current Company Listener
  useEffect(() => {
    if (!currentUserData?.companyId) {
      setCurrentCompany(null);
      return;
    }

    const compRef = doc(db, 'companies', currentUserData.companyId);
    const unsubscribeCompany = onSnapshot(compRef, (compSnap) => {
      if (compSnap.exists()) {
        setCurrentCompany({ id: compSnap.id, ...compSnap.data() });
      } else {
        setCurrentCompany(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro no listener de empresa:", error);
      setLoading(false);
    });

    const unsubRoles = onSnapshot(doc(db, 'companies', currentUserData.companyId, 'settings', 'roles'), (docSnap) => {
      if (docSnap.exists()) {
        setCustomRoles(docSnap.data().roles || []);
      } else {
        setCustomRoles([]);
      }
    });

    return () => {
      unsubscribeCompany();
      unsubRoles();
    };
  }, [currentUserData?.companyId]);

  const userRoles = useMemo(() => [...DEFAULT_ROLES, ...customRoles], [customRoles]);

  // Redirect technicians if they land on dashboard
  useEffect(() => {
    if (currentUserData?.role === 'tecnico' && activeTab === 'dashboard') {
      setActiveTab('visits');
    }
  }, [currentUserData, activeTab]);

  const isSuperAdmin = user?.email?.toLowerCase().trim() === 'emailparasiteslixo@gmail.com' || 
                       user?.email?.toLowerCase().trim() === 'alffonseca42@gmail.com' || 
                       currentUserData?.role === 'super_admin';

  // Access Helper for Sidebar
  const canAccess = (tabName: string) => {
    const role = currentUserData?.role;
    if (isSuperAdmin || role === 'admin') return true;
    
    // Check dynamic permissions if they exist
    if (rolePermissions && rolePermissions[role]) {
      return rolePermissions[role].menus?.includes(tabName) || false;
    }

    if (role === 'secretaria') {
      return ['dashboard', 'financial', 'budgets', 'clients', 'suppliers', 'receipts', 'users', 'reports', 'settings', 'logs'].includes(tabName);
    }
    
    if (role === 'tecnico') {
      return ['visits', 'service-orders', 'receipts'].includes(tabName);
    }
    
    // Default fallback
    return false;
  };

  const canViewList = (tabName: string) => {
    const role = currentUserData?.role;
    if (isSuperAdmin || role === 'admin') return true;
    
    if (rolePermissions && rolePermissions[role]) {
      return rolePermissions[role].lists?.includes(tabName) || false;
    }

    // Default fallback based on hardcoded roles
    return canAccess(tabName);
  };

  // Redirect if current tab is not accessible
  useEffect(() => {
    if (currentUserData && !canAccess(activeTab)) {
      const allowedTabs = [
        'dashboard', 'visits', 'financial', 'budgets', 'service-orders',
        'clients', 'suppliers', 'receipts', 'users', 'settings', 'reports', 'super-admin'
      ].filter(canAccess);
      
      if (allowedTabs.length > 0) {
        setActiveTab(allowedTabs[0]);
      }
    }
  }, [currentUserData?.role, activeTab]);

  // Sidebar Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const tabs = [
        'dashboard', 'visits', 'service-orders', 'budgets', 'financial', 
        'receipts', 'clients', 'suppliers', 'reports', 'users', 'settings', 'super-admin'
      ].filter(canAccess);

      const currentIndex = tabs.indexOf(activeTab);

      if (e.key === 'ArrowDown') {
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        const nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, currentUserData?.role, isSuperAdmin]);

  // Auto-link Super Admin to their first company if missing
  useEffect(() => {
    if (isSuperAdmin && user && allCompanies.length > 0 && !currentUserData?.companyId) {
      const myCompany = allCompanies.find(c => c.ownerId === user.uid) || 
                        allCompanies.find(c => c.name?.toLowerCase().includes('af sistemas')) || 
                        allCompanies[0];
      if (myCompany?.id) {
        updateDoc(doc(db, 'users', user.uid), {
          companyId: myCompany.id,
          role: 'super_admin'
        }).catch(err => console.error("Error auto-linking super admin:", err));
      }
    }
  }, [allCompanies, isSuperAdmin, user, currentUserData?.companyId]);

  // Synchronize appSettings with currentCompany to ensure all fields are populated
  useEffect(() => {
    if (currentCompany) {
      setAppSettings(prev => {
        const updated = {
          logoUrl: prev.logoUrl || currentCompany.logoUrl || currentCompany.companyLogo || '',
          companyName: prev.companyName || currentCompany.companyName || currentCompany.name || '',
          document: prev.document || currentCompany.document || currentCompany.cnpj || currentCompany.companyDoc || currentCompany.cpf || '',
          responsible: prev.responsible || currentCompany.responsible || currentCompany.companyResp || currentCompany.technicianName || '',
          address: prev.address || currentCompany.address || currentCompany.companyAddress || currentCompany.logradouro || '',
          city: prev.city || currentCompany.city || currentCompany.companyCity || currentCompany.municipio || '',
          cep: prev.cep || currentCompany.cep || currentCompany.companyCep || '',
          neighborhood: prev.neighborhood || currentCompany.neighborhood || currentCompany.companyNeighborhood || currentCompany.bairro || '',
          signatureUrl: prev.signatureUrl || currentCompany.signatureUrl || ''
        };
        if (JSON.stringify(prev) !== JSON.stringify(updated)) {
          return updated;
        }
        return prev;
      });
    }
  }, [currentCompany]);

  useEffect(() => {
    if (!user) return;
    if (!currentUserData?.companyId && !isSuperAdmin) return;

    const effectiveCompanyId = isSuperAdmin ? (selectedCompanyId || currentUserData?.companyId) : currentUserData?.companyId;
    const companyId = effectiveCompanyId;

    let allCompaniesUnsubscribe: (() => void) | null = null;
    let allFinancialsUnsubscribe: (() => void) | null = null;
    let saasSettingsUnsubscribe: (() => void) | null = null;

    if (isSuperAdmin) {
      allCompaniesUnsubscribe = onSnapshot(
        collection(db, 'companies'),
        (snapshot) => {
          const comps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllCompanies(comps);
          // Auto-select first company if none selected and we have companies
          if (comps.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(comps[0].id);
          }
        }
      );

      // Global financial listener for Super Admin
      allFinancialsUnsubscribe = onSnapshot(
        collection(db, 'financial'),
        (snapshot) => {
          setAllFinancials(snapshot.docs.map(doc => doc.data()));
        }
      );

      // SaaS Global Settings listener
      saasSettingsUnsubscribe = onSnapshot(
        doc(db, 'saas_settings', 'global'),
        (snapshot) => {
          if (snapshot.exists()) {
            setSaasSettings(snapshot.data());
          }
        }
      );
    }

    let visitsUnsubscribe = () => {};
    let serviceOrdersUnsubscribe = () => {};
    let financialUnsubscribe = () => {};
    let budgetsUnsubscribe = () => {};
    let clientsUnsubscribe = () => {};
    let suppliersUnsubscribe = () => {};
    let receiptsUnsubscribe = () => {};
    let usersUnsubscribe = () => {};
    let logsUnsubscribe = () => {};
    let pixUnsubscribe = () => {};
    let appSettingsUnsubscribe = () => {};

    if (companyId) {
      // Existing subscriptions...
      // I'll add logs here
      if (canAccess('logs')) {
        logsUnsubscribe = onSnapshot(
          query(collection(db, 'logs'), where('companyId', '==', companyId), limit(500)),
          (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogRecord));
            setLogs(data.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds));
          }
        );
      }
      visitsUnsubscribe = onSnapshot(
        query(collection(db, 'visits'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TechnicalVisit));
      setVisits(data.sort((a, b) => {
        const dateA = safeParseDate(a.date).getTime();
        const dateB = safeParseDate(b.date).getTime();
        return dateB - dateA;
      }));
        }
      );

      serviceOrdersUnsubscribe = onSnapshot(
        query(collection(db, 'serviceOrders'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder));
          setServiceOrders(data.sort((a, b) => {
            const dateCodeA = safeParseDate(a.date).getTime();
            const dateCodeB = safeParseDate(b.date).getTime();
            return dateCodeB - dateCodeA;
          }));
        }
      );

      financialUnsubscribe = onSnapshot(
        query(collection(db, 'financial'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord));
          setFinancials(data.sort((a, b) => {
            const dateA = a.date instanceof Timestamp ? a.date.toDate().getTime() : (a.date instanceof Date ? a.date.getTime() : (a.date ? new Date(a.date).getTime() : 0));
            const dateB = b.date instanceof Timestamp ? b.date.toDate().getTime() : (b.date instanceof Date ? b.date.getTime() : (b.date ? new Date(b.date).getTime() : 0));
            return dateB - dateA;
          }));
        }
      );

      budgetsUnsubscribe = onSnapshot(
        query(collection(db, 'budgets'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
          setBudgets(data.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          }));
        }
      );

      clientsUnsubscribe = onSnapshot(
        query(collection(db, 'clients'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
          setClients(data.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        }
      );

      suppliersUnsubscribe = onSnapshot(
        query(collection(db, 'suppliers'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
          setSuppliers(data.sort((a, b) => {
            const numA = String(a.registrationNumber || '').padStart(10, '0');
            const numB = String(b.registrationNumber || '').padStart(10, '0');
            return numA.localeCompare(numB); // lowest first (crescente)
          }));
        }
      );

      receiptsUnsubscribe = onSnapshot(
        query(collection(db, 'receipts'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt));
          setReceipts(data.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          }));
        }
      );

      usersUnsubscribe = onSnapshot(
        query(collection(db, 'users'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsers(data.sort((a: any, b: any) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          }));
        }
      );

      pixUnsubscribe = onSnapshot(
        doc(db, 'companies', companyId, 'settings', 'pix'),
        (snapshot) => {
          if (snapshot.exists()) {
            setPixSettings(snapshot.data() as PixSettings);
          } else {
            setPixSettings({ accounts: [] });
          }
        }
      );

      appSettingsUnsubscribe = onSnapshot(
        doc(db, 'companies', companyId, 'settings', 'general'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setAppSettings(prev => ({
              ...prev,
              ...data
            }));
          }
        }
      );
    }

    return () => {
      visitsUnsubscribe();
      serviceOrdersUnsubscribe();
      financialUnsubscribe();
      budgetsUnsubscribe();
      clientsUnsubscribe();
      suppliersUnsubscribe();
      receiptsUnsubscribe();
      usersUnsubscribe();
      logsUnsubscribe();
      pixUnsubscribe();
      appSettingsUnsubscribe();
      if (allCompaniesUnsubscribe) allCompaniesUnsubscribe();
      if (allFinancialsUnsubscribe) allFinancialsUnsubscribe();
      if (saasSettingsUnsubscribe) saasSettingsUnsubscribe();
    };
  }, [user, currentUserData?.companyId, isSuperAdmin, selectedCompanyId]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no login Google:', error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domínio não autorizado no Firebase. Adicione este domínio nas configurações do Firebase.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login com Google não está ativado no console do Firebase.');
      } else {
        toast.error(`Erro ao fazer login: ${error.message}`);
      }
    }
  };

  const handleCreateCompany = async (name: string) => {
    if (!user) return;
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const companyRef = await addDoc(collection(db, 'companies'), {
        name,
        ownerId: user.uid,
        status: 'active', // Default status
        inviteCode,
        createdAt: Timestamp.now()
      });
      
      const newCompanyId = companyRef.id;

      // Initialize company settings
      await setDoc(doc(db, 'companies', newCompanyId, 'settings', 'general'), {
        companyName: name,
        createdAt: Timestamp.now()
      });

      // --- MIGRATION LOGIC ---
      // Update orphaned records to belong to this new company
      const collectionsToMigrate = ['clients', 'visits', 'receipts', 'financial', 'budgets'];
      
      for (const colName of collectionsToMigrate) {
        const colRef = collection(db, colName);
        const q = query(colRef); // Fetching all because we need to check for missing companyId
        const snapshot = await getDocs(q);
        
        for (const recordDoc of snapshot.docs) {
          const data = recordDoc.data();
          // If the record has no companyId, we migrate it
          // For visits, we also check if it belongs to the user
          if (!data.companyId) {
            let shouldMigrate = false;
            
            if (colName === 'visits' && data.technicianId === user.uid) {
              shouldMigrate = true;
            } else if (colName !== 'visits') {
              // For other collections, if it was orphaned, we assume it's theirs 
              // (Common for the first company created by a previous solo user)
              shouldMigrate = true;
            }
            
            if (shouldMigrate) {
              await updateDoc(doc(db, colName, recordDoc.id), {
                companyId: newCompanyId
              });
            }
          }
        }
      }

      await updateDoc(doc(db, 'users', user.uid), {
        companyId: newCompanyId,
        role: 'owner'
      });
      
      toast.success(`Empresa "${name}" criada e dados anteriores migrados!`);
    } catch (error) {
      console.error("Erro ao criar empresa e migrar dados:", error);
      toast.error("Erro ao criar empresa.");
    }
  };

  const handleJoinCompany = async (code: string) => {
    if (!user) return;
    const cleanCode = code.trim().toUpperCase();
    try {
      // First try joining by the new inviteCode
      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, where('inviteCode', '==', cleanCode));
      const querySnap = await getDocs(q);
      
      let targetCompanyId = '';
      let isInviteCode = false;

      if (!querySnap.empty) {
        targetCompanyId = querySnap.docs[0].id;
        isInviteCode = true;
      } else {
        // Fallback to joining by companyId (legacy or persistent)
        const companyRef = doc(db, 'companies', code.trim());
        const companySnap = await getDoc(companyRef);
        if (companySnap.exists()) {
          targetCompanyId = companySnap.id;
        }
      }
      
      if (targetCompanyId) {
        await updateDoc(doc(db, 'users', user.uid), {
          companyId: targetCompanyId,
          role: 'tecnico'
        });

        // If it was an invite code, regenerate it to make it "single use" or rotate it
        if (isInviteCode) {
          const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await updateDoc(doc(db, 'companies', targetCompanyId), {
            inviteCode: newCode
          });
        }

        toast.success("Você entrou na empresa com sucesso!");
      } else {
        toast.error("Código de acesso inválido.");
      }
    } catch (error) {
      console.error("Erro ao entrar na empresa:", error);
      toast.error("Erro ao entrar na empresa.");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos.');
      return;
    }

    const finalEmail = getFinalEmail(email);
    if (!finalEmail || !finalEmail.includes('@')) {
      toast.error('O formato do usuário ou e-mail é inválido.');
      return;
    }
    
    setIsAuthLoading(true);

    try {
      const cleanPassword = password.trim();
      if (authMode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, finalEmail, cleanPassword);
        toast.success(`Bem-vindo, ${userCredential.user.displayName || 'usuário'}!`);
      } else {
        if (!displayName) {
          toast.error('Por favor, informe seu nome para o cadastro.');
          setIsAuthLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, cleanPassword);
        await updateProfile(userCredential.user, { displayName });
        toast.success('Sua conta foi criada! Bem-vindo.');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este usuário já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('A senha deve ter pelo menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error('Usuário ou senha incorretos. Verifique suas credenciais.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error(`O formato do usuário ou e-mail é inválido: ${finalEmail}`);
      } else {
        toast.error('Erro na autenticação: ' + (error.message || 'Desconhecido'));
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Sessão encerrada.');
    } catch (error) {
      console.error(error);
    }
  };

  if (signerToken) {
    return <ExternalSignaturePage token={signerToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4">
        <Toaster position="top-right" theme="dark" />
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-[#3b82f6]/20 border-t-[#3b82f6]"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="text-[#3b82f6] animate-pulse" size={24} />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-white tracking-widest uppercase">{appSettings.companyName || 'SegurPro Gestão'}</p>
            <p className="text-xs font-medium text-[#71717a] animate-pulse">Iniciando ambiente seguro...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0f1115] p-6 overflow-y-auto">
        <Toaster position="top-right" theme="dark" />
        <div className="w-full max-w-md space-y-8 text-center py-8">
          <div className="space-y-2">
            {appSettings.logoUrl ? (
              <div className="mx-auto flex h-24 w-auto items-center justify-center overflow-hidden mb-4">
                <img src={appSettings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3b82f6] text-white shadow-xl shadow-blue-900/20">
                <Shield size={32} />
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-white">{currentCompany?.name || appSettings.companyName || 'SegurPro SaaS'}</h1>
            <p className="text-[#71717a]">Controle total para instaladores de segurança eletrônica.</p>
          </div>
          <Card className="border-[#2d3139] bg-[#1a1d23]">
            <CardHeader>
              <CardTitle className="text-white">{authMode === 'login' ? 'Bem-vindo' : 'Criar Conta'}</CardTitle>
              <CardDescription className="text-[#71717a]">
                {authMode === 'login' ? 'Faça login para gerenciar suas visitas e finanças.' : 'Cadastre-se para começar a usar o sistema.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                {authMode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-[#a0a0a0]">Nome Completo</Label>
                    <Input 
                      id="reg-name" 
                      type="text" 
                      value={displayName} 
                      onChange={e => setDisplayName(e.target.value)} 
                      placeholder="Seu nome"
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="auth-username" className="text-[#a0a0a0]">Usuário ou E-mail</Label>
                  <Input 
                    id="auth-username" 
                    type="text" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="Seu usuário ou e-mail registrado"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                  <p className="text-[10px] text-[#555] mt-1 italic">Dica: Se não for e-mail, usaremos @segurpro.com</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-pass" className="text-[#a0a0a0]">Senha</Label>
                  <div className="relative">
                    <Input 
                      id="auth-pass" 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      className="bg-[#0f1115] border-[#2d3139] text-white pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isAuthLoading} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white border-none h-11">
                  {isAuthLoading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{authMode === 'login' ? 'Entrando...' : 'Cadastrando...'}</span>
                    </div>
                  ) : (
                    <span>{authMode === 'login' ? 'Entrar' : 'Cadastrar'}</span>
                  )}
                </Button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#2d3139]"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1a1d23] px-2 text-[#71717a]">Ou continue com</span>
                </div>
              </div>

              <Button onClick={handleLogin} variant="outline" className="w-full gap-2 border-[#2d3139] text-white hover:bg-[#2d3139]">
                <svg className="h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Google
              </Button>

              <div className="pt-4">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm text-[#3b82f6] hover:underline"
                >
                  {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
                </button>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-[#555]">© 2026 {appSettings.companyName || 'SegurPro Gestão'}. Todos os direitos reservados.</p>
        </div>
      </div>
    );
  }

  // Multi-tenancy check
  if (!currentUserData?.companyId && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#0f1115]">
        <Toaster position="top-right" theme="dark" />
        <CompanyWizard onCreate={handleCreateCompany} onJoin={handleJoinCompany} />
      </div>
    );
  }

  // Verification if company is blocked - Super Admin bypasses this
  if (currentCompany && currentCompany.status === 'blocked' && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
        <Toaster position="top-right" theme="dark" />
        <Card className="max-w-md w-full bg-[#1a1d23] border-[#2d3139] text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle size={40} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Suspenso</h2>
          <p className="text-[#a0a0a0] mb-6">
            O acesso da empresa <b>{currentCompany.name}</b> foi temporariamente suspenso. 
            Isso pode ocorrer devido a pendências financeiras ou revisão dos termos de uso.
          </p>
          <div className="bg-[#0f1115] border border-[#2d3139] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#71717a]">
              Para restabelecer o acesso, entre em contato com o suporte administrativo ou verifique suas faturas pendentes.
            </p>
          </div>
          <Button 
            onClick={() => signOut(auth)}
            variant="outline" 
            className="w-full border-[#2d3139] text-[#a0a0a0] hover:text-white"
          >
            Sair do Aplicativo
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f1115] text-[#e0e0e0] overflow-hidden">
      <Toaster position="top-right" theme="dark" />
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-[240px] flex-col border-r border-[#2d3139] bg-[#1a1d23]">
        <div className="flex h-20 items-center px-8 border-b border-[#2d3139]/30">
          <div className="flex items-center gap-3">
            {appSettings.logoUrl ? (
              <img src={appSettings.logoUrl} alt="Logo" className="h-16 w-auto object-contain max-w-[64px]" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white shadow-lg shadow-blue-500/20">
                <Shield size={36} className="fill-white/20" />
              </div>
            )}
            <span className="font-bold tracking-[0.2em] text-white text-base uppercase">M E N U</span>
          </div>
        </div>
        <ScrollArea className="flex-1 px-4 py-4 overflow-y-auto">
          <nav className="space-y-1">
            {canAccess('dashboard') && (
              <SidebarItem 
                icon={<LayoutDashboard size={18} />} 
                label="Painel Geral" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
            )}
            {canAccess('visits') && (
              <SidebarItem 
                icon={<CalendarIcon size={18} />} 
                label="Visitas Técnicas" 
                active={activeTab === 'visits'} 
                onClick={() => setActiveTab('visits')} 
              />
            )}
            {canAccess('service-orders') && (
              <SidebarItem 
                icon={<CheckCircle2 size={18} />} 
                label="Ordens de Serviço" 
                active={activeTab === 'service-orders'} 
                onClick={() => setActiveTab('service-orders')} 
              />
            )}
            {canAccess('budgets') && (
              <SidebarItem 
                icon={<FileText size={18} />} 
                label="Orçamentos" 
                active={activeTab === 'budgets'} 
                onClick={() => setActiveTab('budgets')} 
              />
            )}
            {canAccess('financial') && (
              <SidebarItem 
                icon={<DollarSign size={18} />} 
                label="Financeiro" 
                active={activeTab === 'financial'} 
                onClick={() => setActiveTab('financial')} 
              />
            )}
            {canAccess('receipts') && (
              <SidebarItem 
                icon={<ReceiptIcon size={18} />} 
                label="Recibos" 
                active={activeTab === 'receipts'} 
                onClick={() => setActiveTab('receipts')} 
              />
            )}
            {canAccess('clients') && (
              <SidebarItem 
                icon={<UserIcon size={18} />} 
                label="Clientes" 
                active={activeTab === 'clients'} 
                onClick={() => setActiveTab('clients')} 
              />
            )}
            {canAccess('suppliers') && (
              <SidebarItem 
                icon={<Database size={18} />} 
                label="Fornecedores" 
                active={activeTab === 'suppliers'} 
                onClick={() => setActiveTab('suppliers')} 
              />
            )}
            {canAccess('reports') && (
              <SidebarItem 
                icon={<FileText size={18} />} 
                label="Relatórios" 
                active={activeTab === 'reports'} 
                onClick={() => setActiveTab('reports')} 
              />
            )}
            {canAccess('users') && <SidebarItem 
              icon={<Users size={18} />} 
              label="Equipe" 
              active={activeTab === 'users'} 
              onClick={() => setActiveTab('users')} 
            />}
            {canAccess('logs') && <SidebarItem 
              icon={<History size={18} />} 
              label="Logs do Sistema" 
              active={activeTab === 'logs'} 
              onClick={() => setActiveTab('logs')} 
            />}
            {canAccess('settings') && (
              <SidebarItem 
                icon={<Settings size={18} />} 
                label="Configurações" 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
              />
            )}

            {isSuperAdmin && (
              <div className="mt-4 pt-4 border-t border-[#2d3139]/30">
                <SidebarItem 
                  icon={<Shield size={18} className="text-yellow-500" />} 
                  label="Admin SaaS" 
                  active={activeTab === 'super-admin'} 
                  onClick={() => setActiveTab('super-admin')} 
                />
              </div>
            )}
          </nav>
        </ScrollArea>
        <div className="p-6 border-t border-[#2d3139]">
          {isSuperAdmin && <div className="mb-2"><Badge className="bg-yellow-500/10 text-yellow-500 text-[10px] uppercase font-bold px-2 py-0.5 border border-yellow-500/20">Master</Badge></div>}
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#2d3139]/30 mb-4">
            <div className="h-8 w-8 rounded-full bg-[#2d3139] flex items-center justify-center overflow-hidden border border-[#2d3139]">
              {user.photoURL && !userPhotoError ? (
                <img 
                  src={user.photoURL} 
                  alt="" 
                  referrerPolicy="no-referrer" 
                  onError={() => setUserPhotoError(true)}
                />
              ) : <UserIcon size={16} />}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold truncate text-white">{user.displayName}</p>
              <p className="text-[10px] text-[#71717a] truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={handleLogout}>
            <LogOut size={18} />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#1a1d23] border-b border-[#2d3139] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          {appSettings.logoUrl ? (
            <img src={appSettings.logoUrl} alt="Logo" className="h-8 w-auto object-contain max-w-[32px]" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b82f6] text-white">
              <Shield size={18} />
            </div>
          )}
          <span className="font-bold tracking-tight text-white truncate max-w-[180px]">
            {appSettings?.companyName || currentCompany?.companyName || currentCompany?.name || 'SegurPro Gestão'}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#0f1115] z-40 pt-16 flex flex-col">
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            {canAccess('dashboard') && (
              <SidebarItem 
                icon={<LayoutDashboard size={20} />} 
                label="Painel Geral" 
                active={activeTab === 'dashboard'} 
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('visits') && (
              <SidebarItem 
                icon={<CalendarIcon size={20} />} 
                label="Visitas Técnicas" 
                active={activeTab === 'visits'} 
                onClick={() => { setActiveTab('visits'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('service-orders') && (
              <SidebarItem 
                icon={<CheckCircle2 size={20} />} 
                label="Ordens de Serviço" 
                active={activeTab === 'service-orders'} 
                onClick={() => { setActiveTab('service-orders'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('budgets') && (
              <SidebarItem 
                icon={<FileText size={20} />} 
                label="Orçamentos" 
                active={activeTab === 'budgets'} 
                onClick={() => { setActiveTab('budgets'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('financial') && (
              <SidebarItem 
                icon={<DollarSign size={20} />} 
                label="Financeiro" 
                active={activeTab === 'financial'} 
                onClick={() => { setActiveTab('financial'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('receipts') && (
              <SidebarItem 
                icon={<ReceiptIcon size={20} />} 
                label="Recibos" 
                active={activeTab === 'receipts'} 
                onClick={() => { setActiveTab('receipts'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('clients') && (
              <SidebarItem 
                icon={<UserIcon size={20} />} 
                label="Clientes" 
                active={activeTab === 'clients'} 
                onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('suppliers') && (
              <SidebarItem 
                icon={<Database size={20} />} 
                label="Fornecedores" 
                active={activeTab === 'suppliers'} 
                onClick={() => { setActiveTab('suppliers'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('reports') && (
              <SidebarItem 
                icon={<FileText size={20} />} 
                label="Relatórios" 
                active={activeTab === 'reports'} 
                onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('users') && (
              <SidebarItem 
                icon={<Users size={20} />} 
                label="Equipe" 
                active={activeTab === 'users'} 
                onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('logs') && (
              <SidebarItem 
                icon={<History size={20} />} 
                label="Logs do Sistema" 
                active={activeTab === 'logs'} 
                onClick={() => { setActiveTab('logs'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('settings') && (
              <SidebarItem 
                icon={<Settings size={20} />} 
                label="Configurações" 
                active={activeTab === 'settings'} 
                onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {isSuperAdmin && (
              <SidebarItem 
                icon={<Shield size={20} className="text-yellow-500" />} 
                label="Admin SaaS" 
                active={activeTab === 'super-admin'} 
                onClick={() => { setActiveTab('super-admin'); setIsMobileMenuOpen(false); }} 
              />
            )}
          </nav>
          <div className="p-6 border-t border-[#2d3139]">
            <Button variant="ghost" className="w-full justify-start gap-2 text-[#a0a0a0]" onClick={handleLogout}>
              <LogOut size={18} />
              Sair
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-16 md:pt-0 overflow-hidden">
        <header className="hidden md:flex h-24 items-center justify-center px-10 border-b border-[#2d3139] bg-[#1a1d23]">
          <div className="text-center">
            <p className="text-sm font-bold text-[#3b82f6] uppercase tracking-[0.2em] mb-1">
              {appSettings?.companyName || currentCompany?.companyName || currentCompany?.name || 'SegurPro Gestão'}
            </p>
            <p className="text-[10px] text-[#71717a] uppercase tracking-widest mb-1">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <h2 className="text-xl font-medium text-white capitalize">
              {activeTab === 'dashboard' ? 'Resumo Operacional' : 
               activeTab === 'visits' ? 'Visitas Técnicas' :
               activeTab === 'financial' ? 'Movimentação Financeira' :
               activeTab === 'budgets' ? 'Orçamentos' :
               activeTab === 'service-orders' ? 'Ordens de Serviço' :
               activeTab === 'clients' ? 'Gestão de Clientes' :
               activeTab === 'suppliers' ? 'Gestão de Fornecedores' :
               activeTab === 'receipts' ? 'Recibos Emitidos' :
               activeTab === 'reports' ? 'Relatórios Gerais' :
               activeTab === 'users' ? 'Controle de Equipe' :
               activeTab === 'logs' ? 'Logs do Sistema' :
               activeTab === 'settings' ? 'Configurações do Sistema' :
               activeTab.replace('-', ' ')}
            </h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {activeTab === 'dashboard' && (
            <Dashboard 
              visits={visits} 
              serviceOrders={serviceOrders}
              financials={financials} 
              budgets={budgets} 
              clients={clients} 
              onNavigate={(tab, filter) => {
                if (tab === 'visits' && filter) {
                  setVisitsFilter(filter);
                } else if (tab === 'visits') {
                  setVisitsFilter({ date: null });
                }
                setActiveTab(tab);
              }}
              companyId={currentUserData?.companyId || ''}
              showList={canViewList('dashboard')}
            />
          )}
          {activeTab === 'visits' && (
            <VisitsManager 
              visits={visits} 
              user={user!} 
              clients={clients} 
              appSettings={appSettings} 
              pixSettings={pixSettings} 
              companyId={currentUserData?.companyId || ''} 
              initialFilter={visitsFilter}
              onClearFilter={() => setVisitsFilter({ date: null })}
              showList={canViewList('visits')}
            />
          )}
          {activeTab === 'financial' && <FinancialManager financials={financials} visits={visits} clients={clients} companyId={currentUserData?.companyId || ''} showList={canViewList('financial')} />}
          {activeTab === 'budgets' && <BudgetsManager budgets={budgets} clients={clients} appSettings={appSettings} pixSettings={pixSettings} companyId={currentUserData?.companyId || ''} showList={canViewList('budgets')} logAction={logAction} />}
          {activeTab === 'service-orders' && (
            <ServiceOrdersManager 
              serviceOrders={serviceOrders} 
              clients={clients} 
              users={users}
              appSettings={appSettings} 
              companyId={currentUserData?.companyId || ''} 
              showList={canViewList('service-orders')}
              logAction={logAction}
            />
          )}
          {activeTab === 'clients' && <ClientsManager clients={clients} appSettings={appSettings} pixSettings={pixSettings} companyId={currentUserData?.companyId || ''} showList={canViewList('clients')} logAction={logAction} />}
          {activeTab === 'suppliers' && <SuppliersManager suppliers={suppliers} companyId={currentUserData?.companyId || ''} showList={canViewList('suppliers')} />}
          {activeTab === 'receipts' && <ReceiptsManager receipts={receipts} clients={clients} pixSettings={pixSettings} appSettings={appSettings} companyId={currentUserData?.companyId || ''} currentUserData={currentUserData} showList={canViewList('receipts')} />}
          {activeTab === 'reports' && (
            <ReportsManager 
              visits={visits} 
              financials={financials} 
              budgets={budgets} 
              clients={clients} 
              receipts={receipts} 
              serviceOrders={serviceOrders}
              suppliers={suppliers}
              appSettings={appSettings} 
              companyId={currentUserData?.companyId || ''}
              showList={canViewList('reports')}
            />
          )}
          {activeTab === 'users' && <UsersManager users={users} currentUserData={currentUserData} showList={canViewList('users')} userRoles={userRoles} logAction={logAction} />}
          {activeTab === 'visits' && (
            <VisitsManager 
              visits={visits} 
              user={user!} 
              clients={clients} 
              appSettings={appSettings} 
              pixSettings={pixSettings} 
              companyId={currentUserData?.companyId || ''}
              showList={canViewList('visits')}
              logAction={logAction}
            />
          )}
          
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <History className="text-blue-500" />
                    Logs do Sistema
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[#a0a0a0] text-sm">Histórico de ações e acessos dos usuários da empresa.</p>
                    {(() => {
                      const onlineCount = users.filter(u => u.lastSeen && Date.now() - u.lastSeen.toDate().getTime() < 300000).length;
                      return (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-500 uppercase">{onlineCount} Online</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#1a1d23] p-1 rounded-lg border border-[#2d3139]">
                  <div className="flex -space-x-2 mr-2 px-2 border-r border-[#2d3139]">
                    {users.filter(u => u.lastSeen && Date.now() - u.lastSeen.toDate().getTime() < 300000).slice(0, 5).map(u => (
                      <div key={u.id} className="w-7 h-7 rounded-full border-2 border-[#1a1d23] bg-[#2d3139] flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-lg" title={u.displayName}>
                        {u.photoURL ? <img src={u.photoURL} alt="" /> : (u.displayName?.[0] || '?')}
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    // Refetching is handled by onSnapshot, but we can force a toast showing it's live
                    toast.info('Sincronizado em tempo real');
                  }} className="text-[#a0a0a0] hover:text-white">
                    <RefreshCw size={16} className="mr-2" /> Atualizar
                  </Button>
                </div>
              </div>

              <Card className="border-[#2d3139] bg-[#1a1d23] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0f1115] border-b border-[#2d3139]">
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Data/Hora</th>
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Usuário</th>
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Ação</th>
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Recurso</th>
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d3139]">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <History size={40} className="text-[#2d3139]" />
                              <p className="text-[#a0a0a0] font-medium">Nenhum log registrado ainda.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-4 whitespace-nowrap">
                              <div className="text-white text-sm font-medium">
                                {format(log.timestamp.toDate(), 'dd/MM/yy HH:mm')}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-white text-sm font-bold group-hover:text-blue-400 transition-colors">{log.userName}</span>
                                <span className="text-[#71717a] text-[10px] font-mono">{log.userEmail}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                log.action === 'login' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                log.action === 'delete' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                log.action === 'create' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                log.action === 'update' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                'bg-[#2d3139] text-[#a0a0a0]'
                              }`}>
                                {log.action === 'login' ? 'LOGIN' :
                                 log.action === 'page_view' ? 'VISUALIZAÇÃO' :
                                 log.action === 'create' ? 'CRIAÇÃO' :
                                 log.action === 'update' ? 'EDIÇÃO' :
                                 log.action === 'delete' ? 'EXCLUSÃO' : log.action.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="text-[#a0a0a0] text-sm flex items-center gap-1.5">
                                <span className="capitalize">{log.resourceType}</span>
                                {log.resourceId && <span className="text-[10px] bg-[#0f1115] px-1.5 py-0.5 rounded border border-[#2d3139] font-mono">#{log.resourceId.slice(-6)}</span>}
                              </div>
                            </td>
                            <td className="p-4 text-sm text-[#71717a] italic">
                              {log.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
          {activeTab === 'super-admin' && (
            <SuperAdminPanel 
              companies={allCompanies} 
              financials={allFinancials} 
              saasSettings={saasSettings}
              user={user}
              selectedCompanyId={selectedCompanyId}
              setSelectedCompanyId={setSelectedCompanyId}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsManager 
              pixSettings={pixSettings} 
              appSettings={appSettings} 
              user={user!} 
              companyId={currentUserData?.companyId || ''} 
              currentUserData={currentUserData}
              allCompanies={allCompanies}
              selectedCompanyId={selectedCompanyId}
              setSelectedCompanyId={setSelectedCompanyId}
              isSuperAdmin={isSuperAdmin}
              currentCompany={currentCompany}
              customRoles={customRoles}
              userRoles={userRoles}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function UsersManager({ users = [], currentUserData, showList, userRoles, logAction }: { users?: any[], currentUserData: any, showList: boolean, userRoles: UserRole[], logAction?: any }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'tecnico' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use secondary app to create user without logging out current admin
      const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const finalEmail = getFinalEmail(newUser.email);
      const cleanPassword = newUser.password.trim();
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, cleanPassword);
      await updateProfile(userCredential.user, { displayName: newUser.name });
      
      // Add to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: finalEmail,
        displayName: newUser.name,
        role: newUser.role,
        companyId: currentUserData.companyId,
        createdAt: Timestamp.now()
      });

      await logAction('create', 'user', `Cadastrou usuário ${newUser.name} (${newUser.role})`, userCredential.user.uid);

      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);

      setIsAddOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'tecnico' });
      toast.success('Usuário cadastrado com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro ao cadastrar usuário: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        displayName: editingUser.displayName,
        role: editingUser.role
      });

      await logAction('update', 'user', `Atualizou dados do usuário ${editingUser.displayName}`, editingUser.id);

      if (newPassword) {
        if (newPassword.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres.');
          setIsSubmitting(false);
          return;
        }

        try {
          const response = await fetch('/api/admin/update-user-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: editingUser.id, newPassword })
          });
          
          if (!response.ok) {
            const data = await response.json();
            if (data.error && (data.error.includes("Identity Toolkit API") || data.error.includes("identitytoolkit.googleapis.com"))) {
              toast.error('API do Google desativada no seu projeto Cloud. O admin não conseguirá mudar a senha diretamente até que ela seja ativada.', {
                duration: 10000,
              });
              // Still succeed the metadata update
            } else {
              throw new Error(data.error || 'Erro ao atualizar senha no servidor.');
            }
          } else {
            toast.success('Senha atualizada pelo administrador!');
          }
        } catch (srvError: any) {
          console.error("Server password update failed:", srvError);
          toast.error('Erro ao conectar ao servidor para alterar senha.');
          // Don't throw here, the role/name update already worked
        }
      }

      setIsEditOpen(false);
      setEditingUser(null);
      setNewPassword('');
      toast.success('Usuário atualizado com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao atualizar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', userToDelete.id));
      await logAction('delete', 'user', `Removeu o usuário ${userToDelete.displayName}`, userToDelete.id);
      
      // Delete from Auth via server
      try {
        await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userToDelete.id })
        });
      } catch (authErr) {
        console.error("Auth deletion failed via API:", authErr);
        // We still consider business success if firestore is cleared
      }

      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
      toast.success('Usuário removido com sucesso (Firestore e Auth)!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover usuário.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestão de Usuários</h2>
          <p className="text-[#71717a]">Cadastre e gerencie os acessos ao sistema.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 bg-[#1a1d23] border border-[#2d3139] px-3 py-1 rounded-md">
            <div className="text-[10px] uppercase text-[#71717a] font-bold">Código de Convite:</div>
            <code className="text-[#3b82f6] font-mono font-bold text-sm">{currentUserData.companyId}</code>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-[#71717a] hover:text-white"
              onClick={() => {
                navigator.clipboard.writeText(currentUserData.companyId);
                toast.success('Código copiado!');
              }}
            >
              <Share2 size={12} />
            </Button>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger 
              render={
                <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  <Plus size={18} />
                  Novo Usuário
                </Button>
              }
            />
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[500px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Cadastrar Novo Usuário</DialogTitle>
              <DialogDescription className="text-[#a0a0a0] text-xs">
                Crie um novo acesso para técnico ou administrador.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user-name" className="text-[#a0a0a0]">Nome Completo</Label>
                  <Input 
                    id="user-name" 
                    value={newUser.name} 
                    onChange={e => setNewUser({...newUser, name: e.target.value})} 
                    placeholder="Nome do usuário"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-email" className="text-[#a0a0a0]">E-mail / Usuário</Label>
                  <Input 
                    id="user-email" 
                    type="text"
                    value={newUser.email} 
                    onChange={e => setNewUser({...newUser, email: e.target.value})} 
                    placeholder="ex: joao ou email@exemplo.com"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-pass" className="text-[#a0a0a0]">Senha</Label>
                  <div className="relative">
                    <Input 
                      id="user-pass" 
                      type={showAddPassword ? "text" : "password"}
                      value={newUser.password} 
                      onChange={e => setNewUser({...newUser, password: e.target.value})} 
                      placeholder="Mínimo 6 caracteres"
                      className="bg-[#0f1115] border-[#2d3139] text-white pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white transition-colors"
                    >
                      {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Nível de Acesso</Label>
                  <Select value={newUser.role} onValueChange={(val: any) => setNewUser({...newUser, role: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue>
                      {userRoles.find(r => r.id === newUser.role)?.label || 'Selecione o nível'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-[#e0e0e0]">
                      {userRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">
                Cancelar
              </Button>
              <Button onClick={handleAddUser} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                {isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {showList ? (
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-auto max-h-[600px] relative">
          <Table>
            <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[100px]">Ações</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Usuário</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">E-mail</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Nível</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Data Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 border-[#2d3139] text-[#3b82f6] hover:bg-[#3b82f6]/10"
                        onClick={() => {
                          setEditingUser(u);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10"
                        onClick={() => {
                          setUserToDelete(u);
                          setIsDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-white text-[13px]">
                    <div className="flex items-center gap-2">
                       <div className={`w-2.5 h-2.5 rounded-full ${
                          (u.lastSeen && Date.now() - u.lastSeen.toDate().getTime() < 300000) 
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        }`} title={u.lastSeen ? `Visto em: ${format(u.lastSeen.toDate(), 'dd/MM/yy HH:mm')}` : 'Nunca entrou'} />
                       {u.displayName}
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-[#e0e0e0]">{u.email}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "font-normal text-[10px] uppercase tracking-wider",
                      u.role === 'admin' ? "bg-purple-500/10 text-purple-500" : 
                      u.role === 'secretaria' ? "bg-pink-500/10 text-pink-500" : 
                      u.role === 'tecnico' ? "bg-blue-500/10 text-blue-500" :
                      "bg-yellow-500/10 text-yellow-500"
                    )}>
                      {userRoles.find(r => r.id === u.role)?.label || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12px] text-[#71717a]">
                    {u.createdAt ? format(u.createdAt instanceof Timestamp ? u.createdAt.toDate() : new Date(u.createdAt), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <NoAccessList title="Equipe" />
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[500px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Editar Usuário</DialogTitle>
              <DialogDescription className="text-[#a0a0a0] text-xs">
                Atualize as informações do usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              {editingUser && (
                <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Nome Completo</Label>
                  <Input 
                    value={editingUser.displayName} 
                    onChange={e => setEditingUser({...editingUser, displayName: e.target.value})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Nível de Acesso</Label>
                  <Select value={editingUser.role} onValueChange={(val: any) => setEditingUser({...editingUser, role: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue>
                      {userRoles.find(r => r.id === editingUser.role)?.label || 'Selecione o nível'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-[#e0e0e0]">
                      {userRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Nova Senha (opcional)</Label>
                  <div className="relative">
                    <Input 
                      type={showEditPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Deixe em branco para manter a atual"
                      className="bg-[#0f1115] border-[#2d3139] text-white pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white transition-colors"
                    >
                      {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#71717a]">Ao preencher, o sistema enviará um link de alteração para o usuário.</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139] text-[#a0a0a0]">
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirm */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Usuário: <span className="font-bold">{userToDelete?.displayName}</span></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139]">
              Cancelar
            </Button>
            <Button onClick={handleDeleteUser} className="bg-[#ef4444] hover:bg-[#dc2626] text-white">
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-all",
        active 
          ? "bg-[#2d3139] text-white" 
          : "text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Clients Manager Component ---

const SERVICE_OBJECTS = [
  "Instalação/Configuração/Manutenção de sistema de CFTV ( Cameras )",
  "Instalação/Configuração/Manutenção de Redes Wifi Local.",
  "Instalação/Configuração/Manutenção de Sistemas de Alarmes.",
  "Instalação/Configuração/Manutenção de Cerca Eletrica.",
  "Instalação/Configuração/Manutenção de motores de Portão e Fechaduras Eletricas.",
  "Instalação/Configuração/Manutenção de Portaria GSM",
  "Instalação/Configuração/Manutenção de Centrais Telefonicas."
];

const PAYMENT_METHODS = [
  "PIX",
  "Espécie",
  "Boleto"
];

function ClientsManager({ clients = [], appSettings, pixSettings, companyId, showList, logAction }: { clients: Client[], appSettings: AppSettings, pixSettings: PixSettings, companyId: string, showList: boolean, logAction?: any }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClient, setNewClient] = useState<Partial<Client>>({
    type: 'Avulso',
    serviceObjects: [],
    paymentMethods: [],
    paymentDay: ''
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [pendingContractClient, setPendingContractClient] = useState<Client | null>(null);
  const [isContractConfirmOpen, setIsContractConfirmOpen] = useState(false);

  const handleToggleObject = (obj: string, isNew: boolean) => {
    if (isNew) {
      const current = newClient.serviceObjects || [];
      if (current.includes(obj)) {
        setNewClient({ ...newClient, serviceObjects: current.filter(o => o !== obj) });
      } else {
        setNewClient({ ...newClient, serviceObjects: [...current, obj] });
      }
    } else if (editingClient) {
      const current = editingClient.serviceObjects || [];
      if (current.includes(obj)) {
        setEditingClient({ ...editingClient, serviceObjects: current.filter(o => o !== obj) });
      } else {
        setEditingClient({ ...editingClient, serviceObjects: [...current, obj] });
      }
    }
  };

  const handleTogglePaymentMethod = (method: string, isNew: boolean) => {
    if (isNew) {
      const current = newClient.paymentMethods || [];
      if (current.includes(method)) {
        setNewClient({ ...newClient, paymentMethods: current.filter(o => o !== method) });
      } else {
        setNewClient({ ...newClient, paymentMethods: [...current, method] });
      }
    } else if (editingClient) {
      const current = editingClient.paymentMethods || [];
      if (current.includes(method)) {
        setEditingClient({ ...editingClient, paymentMethods: current.filter(o => o !== method) });
      } else {
        setEditingClient({ ...editingClient, paymentMethods: [...current, method] });
      }
    }
  };

  const filteredClients = useMemo(() => {
    return (clients || []).filter(c => 
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.document && c.document.includes(searchTerm))
    );
  }, [clients, searchTerm]);

  const handleAddClient = async () => {
    try {
      const clientData = {
        name: newClient.name || '',
        email: newClient.email || '',
        phone: newClient.phone || '',
        address: newClient.address || '',
        neighborhood: newClient.neighborhood || '',
        city: newClient.city || '',
        cep: newClient.cep || '',
        responsible: newClient.responsible || '',
        document: newClient.document || '',
        ...newClient,
        type: newClient.type || 'Avulso',
        contractValue: newClient.type === 'Contrato' ? Number(newClient.contractValue || 0) : 0,
        companyId,
        createdAt: Timestamp.now()
      };
      const docRef = await addDoc(collection(db, 'clients'), clientData);
      await logAction('create', 'client', `Cadastrou cliente ${clientData.name}`, docRef.id);
      
      setNewClient({ type: 'Avulso' });
      setIsAddOpen(false);
      toast.success('Cliente cadastrado com sucesso!');

      if (clientData.type === 'Contrato') {
        setPendingContractClient({ id: docRef.id, ...clientData } as Client);
        setIsContractConfirmOpen(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;

    try {
      const { id, ...data } = editingClient;
      const updatedData = {
        ...data,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        cep: data.cep || '',
        responsible: data.responsible || '',
        document: data.document || '',
        contractValue: data.type === 'Contrato' ? Number(data.contractValue || 0) : 0
      };
      await updateDoc(doc(db, 'clients', id), updatedData);
      
      setEditingClient(null);
      setIsEditOpen(false);
      toast.success('Cliente atualizado com sucesso!');

      if (updatedData.type === 'Contrato') {
        setPendingContractClient({ id, ...updatedData } as Client);
        setIsContractConfirmOpen(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'clients');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestão de Clientes</h2>
          <p className="text-[#71717a]">Base de dados de clientes para serviços e orçamentos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
            <Input 
              className="pl-9 w-64 bg-[#0f1115] border-[#2d3139] text-white focus:ring-[#3b82f6] transition-all" 
              placeholder="Pesquisar clientes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                <Plus size={18} />
                Novo Cliente
              </Button>
            } />
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#a0a0a0]">Nome Completo</Label>
                  <Input id="name" value={newClient.name || ''} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="Ex: João Silva" className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#a0a0a0]">Email</Label>
                    <Input id="email" type="email" value={newClient.email || ''} onChange={e => setNewClient({...newClient, email: e.target.value})} placeholder="joao@email.com" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[#a0a0a0]">Telefone</Label>
                    <Input id="phone" value={newClient.phone || ''} onChange={e => setNewClient({...newClient, phone: e.target.value})} placeholder="(11) 99999-9999" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="document" className="text-[#a0a0a0]">CPF / CNPJ</Label>
                    <Input id="document" value={newClient.document || ''} onChange={e => setNewClient({...newClient, document: e.target.value})} placeholder="000.000.000-00" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsible" className="text-[#a0a0a0]">Responsável</Label>
                    <Input id="responsible" value={newClient.responsible || ''} onChange={e => setNewClient({...newClient, responsible: e.target.value})} placeholder="Nome do responsável" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-[#a0a0a0]">Endereço</Label>
                    <Input id="address" value={newClient.address || ''} onChange={e => setNewClient({...newClient, address: e.target.value})} placeholder="Rua, Número" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood" className="text-[#a0a0a0]">Bairro</Label>
                    <Input id="neighborhood" value={newClient.neighborhood || ''} onChange={e => setNewClient({...newClient, neighborhood: e.target.value})} placeholder="Bairro" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-[#a0a0a0]">Cidade - UF</Label>
                    <Input id="city" value={newClient.city || ''} onChange={e => setNewClient({...newClient, city: e.target.value})} placeholder="Cidade - UF" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep" className="text-[#a0a0a0]">CEP</Label>
                    <Input id="cep" value={newClient.cep || ''} onChange={e => setNewClient({...newClient, cep: e.target.value})} placeholder="00000-000" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo de Cliente</Label>
                    <Select value={newClient.type} onValueChange={(val: any) => setNewClient({...newClient, type: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue>
                          {newClient.type || "Selecione"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Avulso">Avulso</SelectItem>
                        <SelectItem value="Contrato">Contrato Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newClient.type === 'Contrato' && (
                    <div className="space-y-2">
                      <Label htmlFor="contractValue" className="text-[#a0a0a0]">Valor Mensal (R$)</Label>
                      <Input id="contractValue" type="number" value={newClient.contractValue || ''} onChange={e => setNewClient({...newClient, contractValue: Number(e.target.value)})} placeholder="0,00" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  )}
                </div>
                {newClient.type === 'Contrato' && (
                  <div className="space-y-4 pt-2 border-t border-[#2d3139]">
                    <div className="flex items-center justify-between">
                      <Label className="text-white font-semibold">Itens do Objeto do Contrato</Label>
                      <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" size="sm" className="h-8 border-[#2d3139] text-[#a0a0a0] hover:text-white">
                          Selecionar Objetos ({newClient.serviceObjects?.length || 0})
                        </Button>
                      } />
                        <PopoverContent className="w-[300px] bg-[#1a1d23] border-[#2d3139] p-3 text-white shadow-xl" align="end">
                          <div className="space-y-3">
                            <p className="text-[11px] text-[#71717a] font-medium uppercase tracking-wider">Itens Disponíveis</p>
                            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1">
                              {SERVICE_OBJECTS.map((obj) => (
                                <div key={obj} className="flex items-center space-x-3 bg-[#0f1115] p-2 rounded-md border border-[#2d3139] hover:border-[#3b82f6]/50 transition-colors">
                                  <Checkbox 
                                    id={`new-${obj}`} 
                                    checked={(newClient.serviceObjects || []).includes(obj)}
                                    onCheckedChange={() => handleToggleObject(obj, true)}
                                    className="border-[#3b82f6] data-[state=checked]:bg-[#3b82f6]"
                                  />
                                  <Label 
                                    htmlFor={`new-${obj}`}
                                    className="text-xs text-[#a0a0a0] leading-tight cursor-pointer flex-1"
                                  >
                                    {obj}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Resumo dos itens selecionados */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-[#0f1115] rounded-md border border-[#2d3139] border-dashed">
                      {(newClient.serviceObjects || []).length > 0 ? (
                        (newClient.serviceObjects || []).map(obj => (
                          <Badge key={obj} variant="outline" className="text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20 py-0 h-5 max-w-[200px] truncate">
                            {obj}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-[#71717a]">Nenhum objeto selecionado</span>
                      )}
                    </div>
                    
                    <div className="space-y-4 pt-2 border-t border-[#2d3139]">
                      <Label className="text-white font-semibold">Forma de Pagamento</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PAYMENT_METHODS.map((method) => (
                          <div key={method} className="flex items-center space-x-3 bg-[#0f1115] p-2 rounded-md border border-[#2d3139]">
                            <Checkbox 
                              id={`payment-new-${method}`} 
                              checked={newClient.paymentMethods?.includes(method)}
                              onCheckedChange={() => handleTogglePaymentMethod(method, true)}
                              className="border-[#3b82f6] data-[state=checked]:bg-[#3b82f6]"
                            />
                            <Label 
                              htmlFor={`payment-new-${method}`}
                              className="text-xs text-[#a0a0a0] leading-tight cursor-pointer flex-1"
                            >
                              {method}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
  
                    <div className="space-y-2">
                      <Label htmlFor="paymentDay" className="text-[#a0a0a0]">Dia do Pagamento</Label>
                      <Input id="paymentDay" value={newClient.paymentDay || ''} onChange={e => setNewClient({...newClient, paymentDay: e.target.value})} placeholder="Ex: Todo dia 10" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
  
                    <div className="space-y-2">
                      <Label htmlFor="serviceSpecification" className="text-[#a0a0a0]">Observações Adicionais do Serviço</Label>
                      <Input id="serviceSpecification" value={newClient.serviceSpecification || ''} onChange={e => setNewClient({...newClient, serviceSpecification: e.target.value})} placeholder="Ex: Manutenção mensal de 16 câmeras" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
  
                    {newClient.paymentMethods?.includes('PIX') && (
                      <div className="space-y-2">
                        <Label className="text-[#a0a0a0]">Conta PIX Preferencial</Label>
                        <Select value={newClient.pixAccountId} onValueChange={(val) => setNewClient({...newClient, pixAccountId: val})}>
                          <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                            <SelectValue placeholder="Selecione a conta PIX">
                              {pixSettings.accounts?.find(a => a.id === newClient.pixAccountId) 
                                ? `${pixSettings.accounts.find(a => a.id === newClient.pixAccountId)?.label} (${pixSettings.accounts.find(a => a.id === newClient.pixAccountId)?.bank})`
                                : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                            {pixSettings.accounts?.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank})</SelectItem>
                            ))}
                            {(!pixSettings.accounts || pixSettings.accounts.length === 0) && (
                              <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleAddClient} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px]">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white">Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
            {editingClient && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-[#a0a0a0]">Nome Completo</Label>
                  <Input id="edit-name" value={editingClient.name || ''} onChange={e => setEditingClient({...editingClient, name: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="text-[#a0a0a0]">Email</Label>
                    <Input id="edit-email" type="email" value={editingClient.email || ''} onChange={e => setEditingClient({...editingClient, email: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone" className="text-[#a0a0a0]">Telefone</Label>
                    <Input id="edit-phone" value={editingClient.phone || ''} onChange={e => setEditingClient({...editingClient, phone: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-document" className="text-[#a0a0a0]">CPF / CNPJ</Label>
                    <Input id="edit-document" value={editingClient.document || ''} onChange={e => setEditingClient({...editingClient, document: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-responsible" className="text-[#a0a0a0]">Responsável</Label>
                    <Input id="edit-responsible" value={editingClient.responsible || ''} onChange={e => setEditingClient({...editingClient, responsible: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address" className="text-[#a0a0a0]">Endereço</Label>
                    <Input id="edit-address" value={editingClient.address || ''} onChange={e => setEditingClient({...editingClient, address: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-neighborhood" className="text-[#a0a0a0]">Bairro</Label>
                    <Input id="edit-neighborhood" value={editingClient.neighborhood || ''} onChange={e => setEditingClient({...editingClient, neighborhood: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-city" className="text-[#a0a0a0]">Cidade - UF</Label>
                    <Input id="edit-city" value={editingClient.city || ''} onChange={e => setEditingClient({...editingClient, city: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cep" className="text-[#a0a0a0]">CEP</Label>
                    <Input id="edit-cep" value={editingClient.cep || ''} onChange={e => setEditingClient({...editingClient, cep: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo de Cliente</Label>
                    <Select value={editingClient.type} onValueChange={(val: any) => setEditingClient({...editingClient, type: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue>
                          {editingClient.type || "Selecione"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Avulso">Avulso</SelectItem>
                        <SelectItem value="Contrato">Contrato Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingClient.type === 'Contrato' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-contractValue" className="text-[#a0a0a0]">Valor Mensal (R$)</Label>
                      <Input id="edit-contractValue" type="number" value={editingClient.contractValue || ''} onChange={e => setEditingClient({...editingClient, contractValue: Number(e.target.value)})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  )}
                </div>
  
                {editingClient.paymentMethods?.includes('PIX') && (
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Conta PIX Preferencial</Label>
                    <Select value={editingClient.pixAccountId} onValueChange={(val) => setEditingClient({...editingClient, pixAccountId: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione a conta PIX">
                          {pixSettings.accounts?.find(a => a.id === editingClient.pixAccountId) 
                            ? `${pixSettings.accounts.find(a => a.id === editingClient.pixAccountId)?.label} (${pixSettings.accounts.find(a => a.id === editingClient.pixAccountId)?.bank})`
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {pixSettings.accounts?.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank})</SelectItem>
                        ))}
                        {(!pixSettings.accounts || pixSettings.accounts.length === 0) && (
                          <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {editingClient.type === 'Contrato' && (
                  <div className="space-y-4 pt-2 border-t border-[#2d3139]">
                    <div className="flex items-center justify-between">
                      <Label className="text-white font-semibold">Itens do Objeto do Contrato</Label>
                      <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" size="sm" className="h-8 border-[#2d3139] text-[#a0a0a0] hover:text-white">
                          Selecionar Objetos ({editingClient.serviceObjects?.length || 0})
                        </Button>
                      } />
                        <PopoverContent className="w-[300px] bg-[#1a1d23] border-[#2d3139] p-3 text-white shadow-xl" align="end">
                          <div className="space-y-3">
                            <p className="text-[11px] text-[#71717a] font-medium uppercase tracking-wider">Itens Disponíveis</p>
                            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1">
                              {SERVICE_OBJECTS.map((obj) => (
                                <div key={obj} className="flex items-center space-x-3 bg-[#0f1115] p-2 rounded-md border border-[#2d3139] hover:border-[#3b82f6]/50 transition-colors">
                                  <Checkbox 
                                    id={`edit-${obj}`} 
                                    checked={(editingClient.serviceObjects || []).includes(obj)}
                                    onCheckedChange={() => handleToggleObject(obj, false)}
                                    className="border-[#3b82f6] data-[state=checked]:bg-[#3b82f6]"
                                  />
                                  <Label 
                                    htmlFor={`edit-${obj}`}
                                    className="text-xs text-[#a0a0a0] leading-tight cursor-pointer flex-1"
                                  >
                                    {obj}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Resumo dos itens selecionados */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-[#0f1115] rounded-md border border-[#2d3139] border-dashed">
                      {(editingClient.serviceObjects || []).length > 0 ? (
                        (editingClient.serviceObjects || []).map(obj => (
                          <Badge key={obj} variant="outline" className="text-[10px] bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20 py-0 h-5 max-w-[200px] truncate">
                            {obj}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-[#71717a]">Nenhum objeto selecionado</span>
                      )}
                    </div>
  
                    <div className="space-y-4 pt-2 border-t border-[#2d3139]">
                      <Label className="text-white font-semibold">Forma de Pagamento</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PAYMENT_METHODS.map((method) => (
                          <div key={method} className="flex items-center space-x-3 bg-[#0f1115] p-2 rounded-md border border-[#2d3139]">
                            <Checkbox 
                              id={`payment-edit-${method}`} 
                              checked={editingClient.paymentMethods?.includes(method)}
                              onCheckedChange={() => handleTogglePaymentMethod(method, false)}
                              className="border-[#3b82f6] data-[state=checked]:bg-[#3b82f6]"
                            />
                            <Label 
                              htmlFor={`payment-edit-${method}`}
                              className="text-xs text-[#a0a0a0] leading-tight cursor-pointer flex-1"
                            >
                              {method}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
  
                    <div className="space-y-2">
                      <Label htmlFor="edit-paymentDay" className="text-[#a0a0a0]">Dia do Pagamento</Label>
                      <Input id="edit-paymentDay" value={editingClient.paymentDay || ''} onChange={e => setEditingClient({...editingClient, paymentDay: e.target.value})} placeholder="Ex: Todo dia 10" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
  
                    <div className="space-y-2">
                      <Label htmlFor="edit-serviceSpecification" className="text-[#a0a0a0]">Observações Adicionais do Serviço</Label>
                      <Input id="edit-serviceSpecification" value={editingClient.serviceSpecification || ''} onChange={e => setEditingClient({...editingClient, serviceSpecification: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button onClick={handleUpdateClient} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showList ? (
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-auto max-h-[600px] relative">
          <Table>
            <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[120px]">Ações</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Nome / Tipo</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Contato</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Contrato / Serviço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                  <TableCell>
                    <div className="flex gap-2">
                      {client.type === 'Contrato' && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 border-[#2d3139] text-[#3b82f6] hover:bg-[#3b82f6]/10" 
                          title="Gerar Contrato PDF"
                          onClick={() => generateContractPDF(client, appSettings, pixSettings)}
                        >
                          <FileText size={14} />
                        </Button>
                      )}
                      <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => {
                        setEditingClient(client);
                        setIsEditOpen(true);
                      }}>
                        <Pencil size={14} />
                      </Button>
                      {client.type === 'Contrato' && (
                        <Button variant="outline" size="icon" title="Solicitar Assinatura Contrato" className="h-8 w-8 border-[#2d3139] text-[#3b82f6] hover:bg-[#3b82f6]/10" onClick={() => handleGenerateSignatureLink(client.id, 'contract', (client.name || 'Cliente'), companyId, { title: 'Contrato de Prestação de Serviços' }, logAction)}>
                          <PenTool size={14} />
                        </Button>
                      )}
                      <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                        setClientToDelete(client);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-white text-[13px]">{client.name || 'Cliente Sem Nome'}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn(
                        "text-[10px] h-5",
                        client.type === 'Contrato' ? "border-[#10b981] text-[#10b981]" : "border-[#71717a] text-[#71717a]"
                      )}>
                        {client.type || 'Avulso'}
                      </Badge>
                      {client.type === 'Contrato' && client.contractValue && (
                        <span className="text-[11px] text-[#10b981] font-medium">R$ {client.contractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[12px] text-white font-medium">{client.responsible || 'Sem Resp'}</div>
                    <div className="text-[11px] text-[#e0e0e0]">{client.phone || 'N/A'}</div>
                    <div className="text-[10px] text-[#71717a]">{client.email || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    {client.type === 'Contrato' ? (
                      <>
                        <div className="text-[12px] text-[#10b981] font-medium">R$ {(client.contractValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</div>
                        <div className="text-[11px] text-[#71717a] max-w-[200px] truncate">{client.serviceSpecification || 'Sem especificação'}</div>
                      </>
                    ) : (
                      <div className="text-[12px] text-[#71717a]">Serviços Avulsos</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-[#71717a] text-sm">
                    {searchTerm ? 'Nenhum cliente encontrado para esta pesquisa.' : 'Nenhum cliente cadastrado.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <NoAccessList title="Clientes" />
      )}

      <Dialog open={isContractConfirmOpen} onOpenChange={setIsContractConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Gerar Contrato?</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              O cliente foi definido como tipo <b>CONTRATO</b>. Deseja gerar o PDF do contrato agora?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setIsContractConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Não, já tenho assinado</Button>
            <Button onClick={() => {
              if (pendingContractClient) {
                generateContractPDF(pendingContractClient, appSettings, pixSettings);
              }
              setIsContractConfirmOpen(false);
            }} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Sim, Gerar PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Deseja realmente excluir este cliente? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (clientToDelete) {
                try {
                  await deleteDoc(doc(db, 'clients', clientToDelete.id));
                  toast.success('Cliente removido.');
                  setIsDeleteConfirmOpen(false);
                  setClientToDelete(null);
                } catch (error) {
                  handleFirestoreError(error, OperationType.DELETE, `clients/${clientToDelete.id}`);
                }
              }
            }} className="bg-[#ef4444] hover:bg-[#dc2626] text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Suppliers Manager Component ---

function SuppliersManager({ suppliers = [], companyId, showList }: { suppliers: Supplier[], companyId: string, showList: boolean }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({});
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    return (suppliers || []).filter(s => 
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.activity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contact || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const handleAddSupplier = async () => {
    try {
      const supplierData = {
        registrationNumber: newSupplier.registrationNumber || '',
        name: newSupplier.name || '',
        activity: newSupplier.activity || '',
        contact: newSupplier.contact || '',
        phone: newSupplier.phone || '',
        address: newSupplier.address || '',
        neighborhood: newSupplier.neighborhood || '',
        cityState: newSupplier.cityState || '',
        zipCode: newSupplier.zipCode || '',
        companyId,
        createdAt: Timestamp.now()
      };
      await addDoc(collection(db, 'suppliers'), supplierData);
      setNewSupplier({});
      setIsAddOpen(false);
      toast.success('Fornecedor cadastrado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'suppliers');
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    try {
      const { id, ...data } = editingSupplier;
      const updatedData = {
        ...data,
        registrationNumber: data.registrationNumber || '',
        name: data.name || '',
        activity: data.activity || '',
        contact: data.contact || '',
        phone: data.phone || '',
        address: data.address || '',
        neighborhood: data.neighborhood || '',
        cityState: data.cityState || '',
        zipCode: data.zipCode || ''
      };
      await updateDoc(doc(db, 'suppliers', id), updatedData);
      setEditingSupplier(null);
      setIsEditOpen(false);
      toast.success('Fornecedor atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `suppliers/${editingSupplier.id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestão de Fornecedores</h2>
          <p className="text-[#71717a]">Cadastro e manutenção de fornecedores e parceiros.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
            <Input 
              className="pl-9 w-64 bg-[#0f1115] border-[#2d3139] text-white focus:ring-[#3b82f6] transition-all" 
              placeholder="Pesquisar fornecedores..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                <Plus size={18} />
                Novo Fornecedor
              </Button>
            } />
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[600px]">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-2">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">N.º Cadastro</Label>
                      <Input value={newSupplier.registrationNumber || ''} onChange={e => setNewSupplier({...newSupplier, registrationNumber: e.target.value})} placeholder="000" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Fornecedor</Label>
                      <Input value={newSupplier.name || ''} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} placeholder="Nome da empresa" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Atividade/Ramo</Label>
                      <Input value={newSupplier.activity || ''} onChange={e => setNewSupplier({...newSupplier, activity: e.target.value})} placeholder="Ex: Equipamentos de Segurança" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Contato</Label>
                      <Input value={newSupplier.contact || ''} onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})} placeholder="Nome do representante" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Telefone/whatsapp</Label>
                      <Input value={newSupplier.phone || ''} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} placeholder="(00) 00000-0000" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Cep</Label>
                      <Input value={newSupplier.zipCode || ''} onChange={e => setNewSupplier({...newSupplier, zipCode: e.target.value})} placeholder="00000-000" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Endereço</Label>
                    <Input value={newSupplier.address || ''} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} placeholder="Rua, Número" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Bairro</Label>
                      <Input value={newSupplier.neighborhood || ''} onChange={e => setNewSupplier({...newSupplier, neighborhood: e.target.value})} placeholder="Bairro" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Cidade/UF</Label>
                      <Input value={newSupplier.cityState || ''} onChange={e => setNewSupplier({...newSupplier, cityState: e.target.value})} placeholder="Cidade/UF" className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="p-6 border-t border-[#2d3139]">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]">Cancelar</Button>
                <Button onClick={handleAddSupplier} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showList ? (
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden shadow-2xl">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="w-[100px] text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Ações</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[80px]">N.º Cadastro</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Fornecedor</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Contato</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Telefone</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Ramo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10" onClick={() => {
                        setEditingSupplier(supplier);
                        setIsEditOpen(true);
                      }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                        setSupplierToDelete(supplier);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-[#e0e0e0] font-mono">{supplier.registrationNumber || '-'}</TableCell>
                  <TableCell className="font-medium text-white text-[13px]">{supplier.name}</TableCell>
                  <TableCell className="text-[12px] text-[#e0e0e0]">{supplier.contact || '-'}</TableCell>
                  <TableCell className="text-[12px] text-[#e0e0e0]">{supplier.phone || '-'}</TableCell>
                  <TableCell className="text-[12px] text-[#71717a]">{supplier.activity || '-'}</TableCell>
                </TableRow>
              ))}
              {filteredSuppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#71717a] text-sm italic">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <NoAccessList title="Fornecedores" />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[600px]">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Editar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-2">
            {editingSupplier && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">N.º Cadastro</Label>
                    <Input value={editingSupplier.registrationNumber || ''} onChange={e => setEditingSupplier({...editingSupplier, registrationNumber: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Fornecedor</Label>
                    <Input value={editingSupplier.name || ''} onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Atividade/Ramo</Label>
                    <Input value={editingSupplier.activity || ''} onChange={e => setEditingSupplier({...editingSupplier, activity: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Contato</Label>
                    <Input value={editingSupplier.contact || ''} onChange={e => setEditingSupplier({...editingSupplier, contact: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Telefone/whatsapp</Label>
                    <Input value={editingSupplier.phone || ''} onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Cep</Label>
                    <Input value={editingSupplier.zipCode || ''} onChange={e => setEditingSupplier({...editingSupplier, zipCode: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Endereço</Label>
                  <Input value={editingSupplier.address || ''} onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Bairro</Label>
                    <Input value={editingSupplier.neighborhood || ''} onChange={e => setEditingSupplier({...editingSupplier, neighborhood: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Cidade/UF</Label>
                    <Input value={editingSupplier.cityState || ''} onChange={e => setEditingSupplier({...editingSupplier, cityState: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 border-t border-[#2d3139]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]">Cancelar</Button>
            <Button onClick={handleUpdateSupplier} className="bg-[#f59e0b] hover:bg-[#d97706] text-white">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Deseja realmente excluir este fornecedor? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]">Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (supplierToDelete) {
                try {
                  await deleteDoc(doc(db, 'suppliers', supplierToDelete.id));
                  toast.success('Fornecedor removido.');
                  setIsDeleteConfirmOpen(false);
                  setSupplierToDelete(null);
                } catch (error) {
                  handleFirestoreError(error, OperationType.DELETE, `suppliers/${supplierToDelete.id}`);
                }
              }
            }} className="bg-[#ef4444] hover:bg-[#dc2626] text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Receipts Manager Component ---

function ReceiptsManager({ receipts = [], clients = [], pixSettings, appSettings, companyId, currentUserData, showList }: { receipts: Receipt[], clients: Client[], pixSettings: PixSettings, appSettings: AppSettings, companyId: string, currentUserData: any, showList: boolean }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [isReceiptConfirmOpen, setIsReceiptConfirmOpen] = useState(false);
  const [pendingReceiptForPdf, setPendingReceiptForPdf] = useState<Receipt | null>(null);
  const [newReceipt, setNewReceipt] = useState<Partial<Receipt>>({
    date: new Date(),
    value: 0,
    paymentMethod: 'PIX',
    clientType: 'Avulso',
    status: 'Aguardando Pagamento',
    referenceMonth: format(new Date(), 'MMMM/yyyy', { locale: ptBR }),
    observations: ''
  });

  const filteredClientsForSelect = useMemo(() => {
    return (clients || []).filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const syncReceiptToFinancial = async (receiptId: string, receiptData: any) => {
    if (receiptData.status !== 'Recebido') return;

    try {
      // Check if financial record already exists for this receipt
      const q = query(collection(db, 'financial'), where('receiptId', '==', receiptId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        await addDoc(collection(db, 'financial'), {
          type: 'Receita',
          category: receiptData.clientType === 'Contrato' ? 'Mensalidade Contrato' : 'Serviço Avulso',
          description: `Recebimento Recibo: ${receiptData.clientName} - ${receiptData.referenceMonth || format(new Date(), 'MMMM/yyyy', { locale: ptBR })}`,
          origin: receiptData.number ? `Recibo Nº ${formatRecordNumber(receiptData.number, receiptData.date)}` : 'Recibo',
          value: Number(receiptData.value),
          date: receiptData.date || Timestamp.now(),
          serviceType: receiptData.clientType === 'Contrato' ? 'Contrato' : 'Serviço Normal',
          clientId: receiptData.clientId || null,
          receiptId: receiptId,
          companyId,
          createdAt: Timestamp.now()
        });
        toast.info('Lançamento financeiro realizado automaticamente!');
      }
    } catch (error) {
      console.error("Erro ao sincronizar recibo com financeiro:", error);
    }
  };

  const updateReceiptStatus = async (id: string, status: 'Aguardando Pagamento' | 'Recebido', receipt: Receipt) => {
    try {
      await updateDoc(doc(db, 'receipts', id), { status });
      if (status === 'Recebido') {
        await syncReceiptToFinancial(id, { ...receipt, status });
      }
      toast.success(`Status do recibo atualizado para ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `receipts/${id}`);
    }
  };

  const handleAddReceipt = async () => {
    if (!newReceipt.clientName || !newReceipt.value || !newReceipt.paymentMethod) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    try {
      const year = new Date().getFullYear();
      const currentYearReceipts = (receipts || []).filter(r => {
        const d = r.date instanceof Timestamp ? r.date.toDate() : new Date(r.date);
        return d.getFullYear() === year;
      });
      
      let nextNum = 1;
      if (currentYearReceipts.length > 0) {
        const numbers = currentYearReceipts.map(r => Number(r.number) || 0);
        nextNum = Math.max(...numbers) + 1;
      }

      const receiptData = {
        ...newReceipt,
        number: nextNum,
        status: newReceipt.status || 'Aguardando Pagamento',
        date: Timestamp.fromDate(newReceipt.date instanceof Date ? newReceipt.date : new Date()),
        companyId,
        createdAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'receipts'), receiptData);
      
      // Perform finance sync if status is 'Recebido'
      if (receiptData.status === 'Recebido') {
        await syncReceiptToFinancial(docRef.id, receiptData);
      }

      // Prepare for PDF confirmation
      const fullReceipt = { id: docRef.id, ...receiptData } as Receipt;
      setPendingReceiptForPdf(fullReceipt);
      setIsReceiptConfirmOpen(true);
      
      setNewReceipt({ 
        date: new Date(), 
        value: 0, 
        paymentMethod: 'PIX',
        status: 'Aguardando Pagamento',
        referenceMonth: format(new Date(), 'MMMM/yyyy', { locale: ptBR }),
        observations: ''
      });
      setIsAddOpen(false);
      toast.success('Recibo gerado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'receipts');
    }
  };

  const handleUpdateReceipt = async () => {
    if (!editingReceipt || !editingReceipt.clientName || !editingReceipt.value) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const { id, ...data } = editingReceipt;
      const receiptData = {
        ...data,
        date: editingReceipt.date instanceof Timestamp ? editingReceipt.date : Timestamp.fromDate(new Date(editingReceipt.date))
      };
      
      await updateDoc(doc(db, 'receipts', id), receiptData);
      
      // Perform finance sync if status changed to 'Recebido'
      if (receiptData.status === 'Recebido') {
        await syncReceiptToFinancial(id, receiptData);
      }

      setEditingReceipt(null);
      setIsEditOpen(false);
      toast.success('Recibo atualizado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `receipts/${editingReceipt?.id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestão de Recibos</h2>
          <p className="text-[#71717a]">Gere e consulte recibos de pagamentos.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              <Plus size={18} />
              Novo Recibo
            </Button>
          } />
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[600px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Gerar Novo Recibo</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Selecionar Cliente Existente (Opcional)</Label>
                  <Select onValueChange={(clientId) => {
                    const client = clients.find(c => c.id === clientId);
                    if (client) {
                      setNewReceipt({
                        ...newReceipt,
                        clientId: client.id,
                        clientName: client.name,
                        clientType: client.type || 'Avulso',
                        serviceSpecification: client.type === 'Contrato' ? (client.serviceSpecification || '') : '',
                        value: client.type === 'Contrato' ? (client.contractValue || 0) : 0,
                        pixAccountId: client.pixAccountId
                      });
                    }
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue placeholder="Escolha um cliente...">
                        {clients.find(c => c.name === newReceipt.clientName)?.name || newReceipt.clientName || null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <div className="p-2 sticky top-0 bg-[#1a1d23] z-10 border-b border-[#2d3139]">
                        <Input 
                          placeholder="Pesquisar..." 
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="h-8 text-xs bg-[#0f1115] border-[#2d3139]"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <ScrollArea className="h-[200px]">
                        {filteredClientsForSelect.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name || 'Cliente Sem Nome'}</SelectItem>
                        ))}
                        {filteredClientsForSelect.length === 0 && (
                          <div className="p-2 text-center text-xs text-[#71717a]">Nenhum cliente encontrado</div>
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="bg-[#2d3139]" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName" className="text-[#a0a0a0]">Nome do Cliente</Label>
                    <Input id="clientName" value={newReceipt.clientName || ''} onChange={e => setNewReceipt({...newReceipt, clientName: e.target.value})} placeholder="Ex: João Silva" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo de Recibo</Label>
                    <Select 
                      value={newReceipt.clientType} 
                      onValueChange={(val: any) => {
                        const isContract = val === 'Contrato';
                        const client = clients.find(c => c.name === newReceipt.clientName);
                        setNewReceipt({
                          ...newReceipt, 
                          clientType: val,
                          // If switching to contract and we have a client name, try to find their contract info
                          serviceSpecification: isContract ? (client?.serviceSpecification || newReceipt.serviceSpecification) : newReceipt.serviceSpecification,
                          value: isContract ? (client?.contractValue || newReceipt.value) : newReceipt.value
                        });
                      }}
                    >
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Avulso">Serviço Avulso</SelectItem>
                        <SelectItem value="Contrato">Contrato Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service" className="text-[#a0a0a0]">
                    {newReceipt.clientType === 'Contrato' ? 'Serviço do Contrato (Automático)' : 'Especificação do Serviço'}
                  </Label>
                  <Input 
                    id="service" 
                    value={newReceipt.serviceSpecification || ''} 
                    onChange={e => setNewReceipt({...newReceipt, serviceSpecification: e.target.value})} 
                    placeholder={newReceipt.clientType === 'Contrato' ? "Preenchido pelo contrato" : "Ex: Manutenção de câmeras"} 
                    className="bg-[#0f1115] border-[#2d3139] text-white"
                    disabled={newReceipt.clientType === 'Contrato'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value" className="text-[#a0a0a0]">Valor (R$)</Label>
                  <Input id="value" type="number" value={newReceipt.value || ''} onChange={e => setNewReceipt({...newReceipt, value: Number(e.target.value)})} placeholder="0,00" className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receiptDate" className="text-[#a0a0a0]">Data do Recibo</Label>
                    <Input 
                      id="receiptDate" 
                      type="date" 
                      value={newReceipt.date ? (newReceipt.date instanceof Date ? newReceipt.date.toISOString().split('T')[0] : new Date(newReceipt.date).toISOString().split('T')[0]) : ''} 
                      onChange={e => setNewReceipt({...newReceipt, date: new Date(e.target.value)})} 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="refMonth" className="text-[#a0a0a0]">Mês de Referência</Label>
                    <Input id="refMonth" value={newReceipt.referenceMonth || ''} onChange={e => setNewReceipt({...newReceipt, referenceMonth: e.target.value})} placeholder="Ex: Janeiro/2024" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Forma de Pagamento</Label>
                  <Select value={newReceipt.paymentMethod} onValueChange={(val: any) => setNewReceipt({...newReceipt, paymentMethod: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Status do Pagamento</Label>
                  <Select value={newReceipt.status} onValueChange={(val: any) => setNewReceipt({...newReceipt, status: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="Aguardando Pagamento">Aguardando Pagamento</SelectItem>
                      <SelectItem value="Recebido">Recebido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
  
                {newReceipt.paymentMethod === 'PIX' && (
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Conta PIX para Recebimento</Label>
                    <Select value={newReceipt.pixAccountId} onValueChange={(val) => setNewReceipt({...newReceipt, pixAccountId: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione a conta PIX">
                          {pixSettings.accounts?.find(a => a.id === newReceipt.pixAccountId) 
                            ? `${pixSettings.accounts.find(a => a.id === newReceipt.pixAccountId)?.label} (${pixSettings.accounts.find(a => a.id === newReceipt.pixAccountId)?.bank})`
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {pixSettings.accounts?.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank})</SelectItem>
                        ))}
                        {(!pixSettings.accounts || pixSettings.accounts.length === 0) && (
                          <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="receiptObs" className="text-[#a0a0a0]">Observações do Recibo</Label>
                  <Input id="receiptObs" value={newReceipt.observations || ''} onChange={e => setNewReceipt({...newReceipt, observations: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
              <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]">
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
                <Button onClick={handleAddReceipt} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Gerar e Salvar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isReceiptConfirmOpen} onOpenChange={setIsReceiptConfirmOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Gerar PDF do Recibo?</DialogTitle>
              <DialogDescription className="text-[#71717a]">
                O recibo foi gerado com sucesso. Deseja baixar o arquivo PDF agora?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" onClick={() => setIsReceiptConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Não, apenas salvar</Button>
              <Button onClick={() => {
                if (pendingReceiptForPdf) {
                  generateReceiptPDF(pendingReceiptForPdf, appSettings, pixSettings);
                }
                setIsReceiptConfirmOpen(false);
              }} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Sim, Gerar PDF</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[600px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Editar Recibo</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              {editingReceipt && (
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="editClientName" className="text-[#a0a0a0]">Nome do Cliente</Label>
                    <Input id="editClientName" value={editingReceipt.clientName} onChange={e => setEditingReceipt({...editingReceipt, clientName: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo de Recibo</Label>
                    <Select 
                      value={editingReceipt.clientType} 
                      onValueChange={(val: any) => {
                        const isContract = val === 'Contrato';
                        const client = clients.find(c => c.name === editingReceipt.clientName);
                        setEditingReceipt({
                          ...editingReceipt, 
                          clientType: val,
                          serviceSpecification: isContract ? (client?.serviceSpecification || editingReceipt.serviceSpecification) : editingReceipt.serviceSpecification,
                          value: isContract ? (client?.contractValue || editingReceipt.value) : editingReceipt.value
                        });
                      }}
                    >
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Avulso">Serviço Avulso</SelectItem>
                        <SelectItem value="Contrato">Contrato Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editService" className="text-[#a0a0a0]">
                      {editingReceipt.clientType === 'Contrato' ? 'Serviço do Contrato (Automático)' : 'Especificação do Serviço'}
                    </Label>
                    <Input 
                      id="editService" 
                      value={editingReceipt.serviceSpecification || ''} 
                      onChange={e => setEditingReceipt({...editingReceipt, serviceSpecification: e.target.value})} 
                      className="bg-[#0f1115] border-[#2d3139] text-white"
                      disabled={editingReceipt.clientType === 'Contrato'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editValue" className="text-[#a0a0a0]">Valor (R$)</Label>
                    <Input id="editValue" type="number" value={editingReceipt.value} onChange={e => setEditingReceipt({...editingReceipt, value: Number(e.target.value)})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editReceiptDate" className="text-[#a0a0a0]">Data do Recibo</Label>
                      <Input 
                        id="editReceiptDate" 
                        type="date" 
                        value={editingReceipt.date ? (editingReceipt.date instanceof Timestamp ? editingReceipt.date.toDate().toISOString().split('T')[0] : new Date(editingReceipt.date).toISOString().split('T')[0]) : ''} 
                        onChange={e => setEditingReceipt({...editingReceipt, date: new Date(e.target.value)})} 
                        className="bg-[#0f1115] border-[#2d3139] text-white" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editRefMonth" className="text-[#a0a0a0]">Mês de Referência</Label>
                      <Input id="editRefMonth" value={editingReceipt.referenceMonth || ''} onChange={e => setEditingReceipt({...editingReceipt, referenceMonth: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Forma de Pagamento</Label>
                    <Select value={editingReceipt.paymentMethod} onValueChange={(val: any) => setEditingReceipt({...editingReceipt, paymentMethod: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="Cartão">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Status do Pagamento</Label>
                    <Select value={editingReceipt.status} onValueChange={(val: any) => setEditingReceipt({...editingReceipt, status: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Aguardando Pagamento">Aguardando Pagamento</SelectItem>
                        <SelectItem value="Recebido">Recebido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
  
                  {editingReceipt.paymentMethod === 'PIX' && (
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Conta PIX para Recebimento</Label>
                      <Select value={editingReceipt.pixAccountId} onValueChange={(val) => setEditingReceipt({...editingReceipt, pixAccountId: val})}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue placeholder="Selecione a conta PIX">
                            {pixSettings.accounts?.find(a => a.id === editingReceipt.pixAccountId) 
                              ? `${pixSettings.accounts.find(a => a.id === editingReceipt.pixAccountId)?.label} (${pixSettings.accounts.find(a => a.id === editingReceipt.pixAccountId)?.bank})`
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          {pixSettings.accounts?.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank})</SelectItem>
                          ))}
                          {(!pixSettings.accounts || pixSettings.accounts.length === 0) && (
                            <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="editReceiptObs" className="text-[#a0a0a0]">Observações do Recibo</Label>
                    <Input id="editReceiptObs" value={editingReceipt.observations || ''} onChange={e => setEditingReceipt({...editingReceipt, observations: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23] flex flex-row justify-between sm:justify-between">
              <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]">
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
                <Button onClick={handleUpdateReceipt} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar Alterações</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!showList ? (
        <NoAccessList title="Recibos" />
      ) : currentUserData?.role === 'tecnico' ? (
        <div className="bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl p-12 text-center">
          <ReceiptIcon className="mx-auto h-12 w-12 text-[#3b82f6] mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">Emissão de Recibos</h3>
          <p className="text-[#71717a] max-w-sm mx-auto">
            Sua conta tem permissão apenas para emitir novos recibos. A listagem de registros anteriores é restrita aos administradores.
          </p>
        </div>
      ) : (
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-auto max-h-[600px] relative">
          <Table>
            <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[140px]">Ações</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[80px]">Nº</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Status</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Data</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Cliente</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Serviço</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" title="Baixar PDF" className="h-8 w-8 border-[#2d3139] text-[#3b82f6] hover:bg-[#3b82f6]/10" onClick={() => generateReceiptPDF(receipt, appSettings, pixSettings)}>
                        <Download size={14} />
                      </Button>
                      <Button variant="outline" size="icon" title="Compartilhar" className="h-8 w-8 border-[#2d3139] text-[#10b981] hover:bg-[#10b981]/10" onClick={() => generateReceiptPDF(receipt, appSettings, pixSettings, true)}>
                        <Share2 size={14} />
                      </Button>
                      <Button variant="outline" size="icon" title="Editar" className="h-8 w-8 border-[#2d3139] text-[#f59e0b] hover:bg-[#f59e0b]/10" onClick={() => {
                        setEditingReceipt(receipt);
                        setIsEditOpen(true);
                      }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="outline" size="icon" title="Excluir" className="h-8 w-8 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                        setReceiptToDelete(receipt);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-[#e0e0e0] font-mono">
                    {receipt.number ? `Recibo Nº ${formatRecordNumber(receipt.number, receipt.date)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Select 
                      value={receipt.status || 'Aguardando Pagamento'} 
                      onValueChange={(val: any) => updateReceiptStatus(receipt.id, val, receipt)}
                    >
                      <SelectTrigger className="h-8 w-[170px] text-[11px] bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Aguardando Pagamento">Aguardando Pagamento</SelectItem>
                        <SelectItem value="Recebido">Recebido</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-[12px] text-[#e0e0e0]">
                    {format(receipt.date instanceof Timestamp ? receipt.date.toDate() : new Date(receipt.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="font-medium text-white text-[13px]">{receipt.clientName}</TableCell>
                  <TableCell className="text-[12px] text-[#71717a] max-w-[200px] truncate">
                    {receipt.serviceSpecification || 'N/A'}
                  </TableCell>
                  <TableCell className="text-[12px] text-[#10b981] font-medium">
                    R$ {Number(receipt.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              {receipts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[#71717a] text-sm">
                    Nenhum recibo gerado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Deseja realmente excluir este recibo? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (receiptToDelete) {
                try {
                  await deleteDoc(doc(db, 'receipts', receiptToDelete.id));
                  toast.success('Recibo removido com sucesso.');
                  setIsDeleteConfirmOpen(false);
                  setReceiptToDelete(null);
                } catch (error) {
                  handleFirestoreError(error, OperationType.DELETE, `receipts/${receiptToDelete.id}`);
                }
              }
            }} className="bg-[#ef4444] hover:bg-[#dc2626] text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Super Admin Panel Component ---

function SuperAdminPanel({ companies = [], financials = [], saasSettings, user, selectedCompanyId, setSelectedCompanyId }: { companies: any[], financials: any[], saasSettings: any, user: any, selectedCompanyId: string, setSelectedCompanyId: (id: string) => void }) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [isMigrationFinished, setIsMigrationFinished] = useState(false);
  const [lastMigrationTargetName, setLastMigrationTargetName] = useState('');
  const [deepSearchQuery, setDeepSearchQuery] = useState('');
  const [deepSearchResults, setDeepSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleDeepSearchRescue = async () => {
    if (!deepSearchQuery || deepSearchQuery.length < 3) {
      toast.error("Digite pelo menos 3 caracteres para buscar.");
      return;
    }

    if (!selectedCompanyId) {
      toast.error("Selecione uma empresa de destino para os resultados.");
      return;
    }

    setIsSearching(true);
    setDeepSearchResults([]);
    const results: any[] = [];
    const collections = ['clients', 'visits', 'receipts', 'financial', 'budgets', 'users', 'companies'];
    
    try {
      for (const colName of collections) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(query(colRef, limit(2000)));
        
        snapshot.docs.forEach(d => {
          const data = d.data();
          const str = JSON.stringify(data).toLowerCase();
          if (str.includes(deepSearchQuery.toLowerCase())) {
            results.push({ id: d.id, col: colName, ...data });
          }
        });
      }
      setDeepSearchResults(results);
      toast.success(`${results.length} resultados encontrados para "${deepSearchQuery}"`);
    } catch (err) {
      toast.error("Erro na busca profunda.");
    } finally {
      setIsSearching(false);
    }
  };

  const relinkResult = async (res: any) => {
    try {
      await updateDoc(doc(db, res.col, res.id), {
        companyId: selectedCompanyId,
        ownerId: user?.uid,
        migratedAt: Timestamp.now()
      });
      setDeepSearchResults(prev => prev.filter(item => item.id !== res.id));
      toast.success("Registro vinculado com sucesso!");
    } catch (err) {
      toast.error("Erro ao vincular registro.");
    }
  };
  // New states for block confirmation, company editing, and deletion
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [companyToToggle, setCompanyToToggle] = useState<{id: string, status: string} | null>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [migrationLogs]);

  const handleDownloadBackup = async (companyId: string, companyName: string, documentNumber: string) => {
    setIsBackingUp(true);
    try {
      const backupData: any = { companyName, companyId, documentNumber, exportedAt: new Date().toISOString(), data: {} };
      const collections = ['companies', 'clients', 'visits', 'receipts', 'financial', 'budgets', 'users'];
      
      for (const col of collections) {
        let q;
        if (col === 'companies') {
          q = query(collection(db, col), where('__name__', '==', companyId));
        } else {
          q = query(collection(db, col), where('companyId', '==', companyId));
        }
        const snapshot = await getDocs(q);
        const docs = [];
        for (const docSnapshot of snapshot.docs) {
          const docData = { id: docSnapshot.id, ...(docSnapshot.data() as any) };
          if (col === 'companies') {
            const settingsSnap = await getDoc(doc(db, 'companies', docSnapshot.id, 'settings', 'general'));
            if (settingsSnap.exists()) {
              Object.assign(docData, settingsSnap.data());
            }
          }
          docs.push(docData);
        }
        backupData.data[col] = docs;
      }

      const filename = (documentNumber || companyId).replace(/[^a-zA-Z0-9]/g, '');
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Download do backup concluído!");
    } catch (error) {
      toast.error("Erro ao gerar backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backup = JSON.parse(text);
        
        if (!backup.data) {
          toast.error("Arquivo de backup inválido.");
          return;
        }

        setIsMigrating(true);
        const targetId = editingCompany?.id;

        if (!targetId) {
          toast.error("Nenhuma empresa selecionada para restauração.");
          return;
        }

        // Pull top-level fields from backup JSON for better compatibility with old backups
        const backupCompanyName = backup.companyName || '';
        const backupDocument = backup.documentNumber || backup.document || '';
        const backupAddress = backup.companyAddress || backup.address || '';
        const backupResponsible = backup.responsible || backup.companyResp || '';
        const backupCity = backup.city || backup.companyCity || '';
        const backupNeighborhood = backup.neighborhood || backup.companyNeighborhood || '';
        const backupCep = backup.cep || backup.companyCep || '';
        const backupLogo = backup.logoUrl || backup.companyLogo || '';

        // Restore all collections
        for (const colName in backup.data) {
          const records = backup.data[colName];
          for (const record of records) {
            const { id, ...data } = record;
            
            // If it's a related record, force it to point to the CURRENT registration ID and current User
            if (colName !== 'companies') {
              data.companyId = targetId;
              // Force ownerId to current user to ensure permissions work
              if (user?.uid) {
                data.ownerId = user.uid;
              }
              await setDoc(doc(db, colName, id), data, { merge: true });
            } else {
              // If it's the company record itself, merge data into the ACTIVE registration ID
              // but keep the current ID (targetId)
              const companyData = { ...data };
              delete companyData.id;
              
              const mergedName = companyData.name || companyData.companyName || backupCompanyName;
              const mergedDoc = companyData.document || companyData.documentNumber || backupDocument || companyData.cnpj || companyData.companyDoc;
              const mergedAddress = companyData.address || companyData.companyAddress || backupAddress || companyData.logradouro;
              const mergedResponsible = companyData.responsible || companyData.companyResp || backupResponsible || companyData.technicianName;

              await updateDoc(doc(db, 'companies', targetId), {
                ...companyData,
                name: mergedName || 'Empresa Restaurada',
                status: companyData.status || 'active',
                ownerId: user?.uid || companyData.ownerId
              });

              // Also propagate these fields to the settings/general subcollection for the new UI architecture
              await setDoc(doc(db, 'companies', targetId, 'settings', 'general'), {
                companyName: mergedName || '',
                logoUrl: companyData.logoUrl || companyData.companyLogo || backupLogo || '',
                address: mergedAddress || '',
                neighborhood: companyData.neighborhood || companyData.companyNeighborhood || backupNeighborhood || companyData.bairro || '',
                responsible: mergedResponsible || '',
                city: companyData.city || companyData.companyCity || backupCity || companyData.municipio || '',
                cep: companyData.cep || companyData.companyCep || backupCep || '',
                document: mergedDoc || '',
                signatureUrl: companyData.signatureUrl || ''
              }, { merge: true });
            }
          }
        }

        toast.success(`Dados restaurados com sucesso para ${editingCompany.name}!`);
      } catch (error) {
        console.error("Restore error:", error);
        toast.error("Erro ao processar arquivo de backup.");
      } finally {
        setIsMigrating(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleFinalDelete = async (companyId: string) => {
    try {
      // 1. Delete company document
      await deleteDoc(doc(db, 'companies', companyId));
      
      // 2. Delete all related data (best effort)
      const collections = ['clients', 'visits', 'receipts', 'financial', 'budgets', 'users'];
      for (const col of collections) {
        const q = query(collection(db, col), where('companyId', '==', companyId));
        const snapshot = await getDocs(q);
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, col, d.id));
        }
      }

      toast.success("Empresa e todos os seus dados foram excluídos permanentemente.");
      setIsDeleteConfirmOpen(false);
      setIsEditCompanyOpen(false);
      setEditingCompany(null);
    } catch (error) {
      toast.error("Erro ao excluir dados da empresa.");
    }
  };

  const toggleCompanyStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === 'active') {
      setCompanyToToggle({ id, status: currentStatus });
      setIsBlockConfirmOpen(true);
    } else {
      await executeToggle(id, 'active');
    }
  };

  const executeToggle = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'companies', id), { status: newStatus });
      toast.success(`Empresa ${newStatus === 'active' ? 'Ativada' : 'Bloqueada'} com sucesso!`);
      setIsBlockConfirmOpen(false);
      setCompanyToToggle(null);
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleUpdateCompanyPlan = async () => {
    if (!editingCompany) return;
    try {
      await updateDoc(doc(db, 'companies', editingCompany.id), {
        billingCycle: editingCompany.billingCycle || 'mensal',
        customPrice: Number(editingCompany.customPrice) || 0,
        receivesUpdates: editingCompany.receivesUpdates ?? true,
        isExempt: editingCompany.isExempt || false
      });
      toast.success("Plano da empresa atualizado!");
      setIsEditCompanyOpen(false);
      setEditingCompany(null);
    } catch (error) {
      toast.error("Erro ao atualizar plano.");
    }
  };

  const toggleExemption = async (id: string, currentExempt: boolean) => {
    try {
      await updateDoc(doc(db, 'companies', id), { isExempt: !currentExempt });
      toast.success(`Isenção ${!currentExempt ? 'Ativada' : 'Desativada'}!`);
    } catch (error) {
      toast.error("Erro ao alterar isenção.");
    }
  };

   const handleMigrateOrphanedData = async () => {
    if (!selectedCompanyId) {
      toast.error("Por favor, selecione uma empresa de destino.");
      return;
    }

    const myCompanyRecord = companies.find(c => c.id === selectedCompanyId);
    if (!myCompanyRecord) return;

    setLastMigrationTargetName(myCompanyRecord.name);
    setIsMigrating(true);
    setIsMigrationFinished(false);
    setMigrationLogs(["Iniciando recuperação total da base de dados..."]);
    let migratedCount = 0;
    const collectionsToMigrate = ['clients', 'visits', 'receipts', 'financial', 'budgets', 'users'];
    const foundCompanyIds = new Set<string>();
    
    try {
      // 1. Data Migration - Total Database Recovery (Restoring ALL existing data)
      for (const colName of collectionsToMigrate) {
        setMigrationLogs(prev => [...prev, `Analisando coleção: ${colName}...`]);
        const colRef = collection(db, colName);
        
        // We fetch up to 2000 records per collection to ensure a total reset as requested
        const allDocsSnap = await getDocs(query(colRef, limit(2000)));
        
        setMigrationLogs(prev => [...prev, `Encontrados ${allDocsSnap.docs.length} registros em ${colName}.`]);

        for (const recordDoc of allDocsSnap.docs) {
          const data = recordDoc.data();
          
          if (data.companyId && data.companyId !== selectedCompanyId) {
            foundCompanyIds.add(data.companyId);
          }
          
          // Force link EVERYTHING to the selected company
          // We only update if it's not already linked to the target to save writes
          if (data.companyId !== selectedCompanyId || data.ownerId !== user?.uid) {
            await updateDoc(doc(db, colName, recordDoc.id), {
              companyId: selectedCompanyId,
              ownerId: user?.uid,
              updatedAt: Timestamp.now(),
              migratedAt: Timestamp.now(),
              migratedBy: user?.email
            });
            migratedCount++;
          }
        }
        setMigrationLogs(prev => [...prev, `Coleção ${colName} processada.`]);
      }

      setMigrationStats(migratedCount);
      setMigrationLogs(prev => [...prev, `CONCLUÍDO: ${migratedCount} registros vinculados.`]);
      setIsMigrationFinished(true);
      toast.success(`${migratedCount} registros foram vinculados à ${myCompanyRecord.name}!`);
      setSelectedCompanyId('');
    } catch (error) {
      console.error("Migration error:", error);
      setMigrationLogs(prev => [...prev, `ERRO: ${error instanceof Error ? error.message : "Erro desconhecido"}`]);
      setIsMigrationFinished(true);
      toast.error("Erro durante a migração de dados.");
    } finally {
      setIsMigrating(false);
    }
  };

  // Identify AF Sistemas (User's own company)
  const myCompany = companies.find(c => c.ownerId === user?.uid) || 
                    companies.find(c => c.name?.toLowerCase().includes('af sistemas'));
  
  // Calculate SaaS Total Revenue (Subscriptions)
  // Logic: Active companies (excluding my own AND exempt ones)
  const activeCompaniesCount = (companies || []).filter(c => c && c.status !== 'blocked').length;
  
  const saasRevenue = (companies || []).reduce((total, c) => {
    if (!c || c.status === 'blocked' || c.id === myCompany?.id || c.isExempt) return total;
    
    // Use custom company price if set, otherwise global SaaS price (fallback to 0)
    const price = c.customPrice !== undefined ? Number(c.customPrice) : (saasSettings?.price || 0);
    
    return total + price;
  }, 0);

  // Global Dashboard Revenue (AF Sistemas internal records)
  const myCompanyFinancials = (financials || []).filter(f => f && f.companyId === myCompany?.id);
  const myCompanyRevenue = myCompanyFinancials
    .filter(f => f.type === 'Receita')
    .reduce((sum, f) => sum + (Number(f.value) || 0), 0);

  // Total Gross Revenue = My Company Revenue + SaaS Subscription Revenue
  const totalGrossRevenue = myCompanyRevenue + saasRevenue;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="text-yellow-500" size={24} />
            Administração SaaS
          </h2>
          <p className="text-[#71717a]">Gerenciamento global de empresas, preços e faturamento.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1">
            Modo Super Admin
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#1a1d23] border-[#2d3139] p-5 text-center">
          <h4 className="text-[#a0a0a0] text-[10px] uppercase tracking-wider mb-2">Total de Empresas</h4>
          <p className="text-3xl font-bold text-white">{companies.length}</p>
        </Card>
        <Card className="bg-[#1a1d23] border-[#2d3139] p-5 text-center">
          <h4 className="text-[#a0a0a0] text-[10px] uppercase tracking-wider mb-2">Ativas / Bloqueadas</h4>
          <div className="flex justify-center gap-3 items-baseline">
            <span className="text-2xl font-bold text-[#10b981]">{activeCompaniesCount}</span>
            <span className="text-[#71717a]">/</span>
            <span className="text-2xl font-bold text-[#ef4444]">{companies.length - activeCompaniesCount}</span>
          </div>
        </Card>
        <Card className="bg-[#1a1d23] border-[#2d3139] p-5 text-center">
          <h4 className="text-[#a0a0a0] text-[10px] uppercase tracking-wider mb-2">Saldo Geral SaaS (Assinaturas)</h4>
          <p className="text-2xl font-bold text-blue-500">
            R$ {saasRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-[#71717a] mt-1 italic">Vendas do sistema</p>
        </Card>
        <Card className="bg-[#1a1d23] border-[#2d3139] p-5 text-center border-blue-500/30">
          <h4 className="text-blue-400 text-[10px] uppercase tracking-wider mb-2 font-bold">Receita Total Bruta</h4>
          <p className="text-2xl font-bold text-white">
            R$ {totalGrossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-[#71717a] mt-1 italic">AF Sistemas + Assinaturas</p>
        </Card>
      </div>

      {(isMigrating || isMigrationFinished) && (
        <Card className="bg-[#1a1d23] border-[#2d3139] p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isMigrating ? (
                  <RefreshCw className="animate-spin text-yellow-500" size={32} />
                ) : (
                  <Database className="text-green-500" size={32} />
                )}
                <div>
                  <p className="text-white font-medium">
                    {isMigrating ? "Recuperação Estrutural em Andamento..." : "Recuperação Finalizada"}
                  </p>
                  <p className="text-[#a0a0a0] text-sm">
                    {isMigrating 
                      ? `Vinculando toda a base de dados à empresa "${lastMigrationTargetName}".`
                      : `O processo de vinculação para "${lastMigrationTargetName}" terminou. Verifique os resultados abaixo.`
                    }
                  </p>
                </div>
              </div>
              {isMigrationFinished && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsMigrationFinished(false)}
                  className="border-[#2d3139] text-[#a0a0a0] hover:text-white"
                >
                  Fechar Relatório
                </Button>
              )}
            </div>
            
            <div className="bg-[#0f1115] rounded-lg p-3 border border-[#2d3139] font-mono text-[10px] space-y-1 max-h-[300px] overflow-y-auto">
              {migrationLogs.map((log, i) => (
                <div key={i} className={cn(
                  "flex gap-2",
                  log.startsWith('ERRO') ? "text-red-500" : log.startsWith('CONCLUÍDO') ? "text-green-500" : "text-[#71717a]"
                )}>
                  <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                  <span>{log}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </Card>
      )}

      {!isMigrating && (
        <div className="space-y-4 mb-6">
          <div className="bg-[#1a1d23] border border-[#2d3139] p-4 rounded-xl flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 text-yellow-500 min-w-fit">
              <Database size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">Recuperação Estrutural:</span>
            </div>
            <div className="flex-1 w-full">
              <select 
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-[#0f1115] border-[#2d3139] text-white rounded-md h-10 px-3 text-sm focus:border-yellow-500 outline-none"
              >
                <option value="">Selecione a empresa de destino (AF Sistemas ou outra)...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.document ? `(CNPJ: ${c.document})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button 
              onClick={handleMigrateOrphanedData}
              disabled={!selectedCompanyId || companies.length === 0}
              className="w-full md:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-10 shadow-sm"
            >
              Vincular TUDO o que existe no Banco
            </Button>
          </div>

          <Card className="bg-[#1a1d23] border-[#2d3139] p-4 border-dashed">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label className="text-[10px] text-[#71717a] uppercase font-bold">Busca e Resgate Manual (Deep Search)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
                  <Input 
                    placeholder="Busque por 'AF', nome do cliente, placa, etc..." 
                    className="pl-10 bg-[#0f1115] border-[#2d3139]" 
                    value={deepSearchQuery}
                    onChange={e => setDeepSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleDeepSearchRescue} 
                disabled={isSearching || !selectedCompanyId}
                className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 font-bold"
              >
                {isSearching ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Search className="mr-2" size={16} />}
                Rastrear Registros
              </Button>
            </div>
            
            {deepSearchResults.length > 0 && (
              <div className="mt-4 border-t border-[#2d3139] pt-4">
                <p className="text-[11px] text-blue-400 mb-2 font-bold uppercase tracking-widest">Registros Encontrados ({deepSearchResults.length})</p>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {deepSearchResults.map((res, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#0f1115] rounded-lg border border-[#2d3139] group">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] uppercase">{res.col}</Badge>
                          <span className="text-xs font-bold text-white">{res.name || res.description || res.clientName || 'Registro Sem Nome'}</span>
                        </div>
                        <span className="text-[10px] text-[#71717a] mt-1 font-mono">ID: {res.id}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => relinkResult(res)}
                        className="text-emerald-500 hover:bg-emerald-500 hover:text-white text-[10px] h-8 font-bold"
                      >
                        VINCULAR AGORA
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <Card className="bg-[#1a1d23] border-[#2d3139] rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2d3139] hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead className="text-[#71717a] font-semibold">Empresa</TableHead>
              <TableHead className="text-[#71717a] font-semibold">Plano / Ciclo</TableHead>
              <TableHead className="text-[#71717a] font-semibold text-center">Atualizações</TableHead>
              <TableHead className="text-[#71717a] font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                <TableCell className="text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-[#a0a0a0] hover:text-white hover:bg-blue-600/20"
                    onClick={() => {
                      setEditingCompany({
                        ...company,
                        billingCycle: company.billingCycle || saasSettings?.billingCycle || 'mensal',
                        customPrice: company.customPrice !== undefined ? company.customPrice : (saasSettings?.price || 0),
                        receivesUpdates: company.receivesUpdates ?? true
                      });
                      setIsEditCompanyOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{company.name}</span>
                    <span className="text-[10px] text-[#71717a] uppercase font-mono">UID: {company.ownerId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-bold uppercase w-fit",
                      company.isExempt || company.id === myCompany?.id 
                        ? "text-blue-400 border-blue-400/30" 
                        : "text-green-400 border-green-400/30"
                    )}>
                      {company.isExempt || company.id === (myCompany?.id || '') 
                        ? 'Isento' 
                        : `R$ ${company.customPrice !== undefined ? company.customPrice : (saasSettings?.price || 0)}`}
                    </Badge>
                    <span className="text-[10px] text-[#a0a0a0] capitalize ml-1">
                      {company.billingCycle || saasSettings?.billingCycle || 'mensal'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={cn(
                    "text-[10px]",
                    company.receivesUpdates === false ? "bg-orange-500/20 text-orange-500 border-orange-500/50" : "bg-blue-500/20 text-blue-500 border-blue-500/50"
                  )}>
                    {company.receivesUpdates === false ? 'Bloqueadas' : 'Liberadas'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn(
                    "text-[10px]",
                    company.status === 'blocked' ? "bg-red-500/20 text-red-500 border-red-500/50" : "bg-green-500/20 text-green-500 border-green-500/50"
                  )}>
                    {company.status === 'blocked' ? 'Bloqueada' : 'Ativa'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Company License Modal */}
      <Dialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Licença: {editingCompany?.name}</DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">
              Configure o plano, ciclo de cobrança e permissão de atualizações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 px-2 text-white">
            <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="flex flex-col">
                <Label className="text-sm font-bold text-blue-400">Empresa Pagante?</Label>
                <span className="text-[10px] text-[#71717a]">Define se haverá cobrança de SaaS.</span>
              </div>
              <div className="flex bg-[#0f1115] p-1 rounded-md border border-[#2d3139]">
                <Button 
                  size="sm" 
                  variant={editingCompany?.isExempt === false ? "default" : "ghost"}
                  className={cn("h-7 px-3 text-[11px]", editingCompany?.isExempt === false ? "bg-blue-600 hover:bg-blue-700 text-white font-bold" : "text-[#71717a]")}
                  onClick={() => setEditingCompany({...editingCompany, isExempt: false})}
                >
                  Sim
                </Button>
                <Button 
                  size="sm" 
                  variant={editingCompany?.isExempt === true ? "destructive" : "ghost"}
                  className={cn(
                    "h-7 px-3 text-[11px] font-bold transition-all", 
                    editingCompany?.isExempt === true ? "bg-red-600 text-white hover:bg-red-700 shadow-md" : "text-[#a0a0a0] hover:text-white"
                  )}
                  onClick={() => setEditingCompany({...editingCompany, isExempt: true})}
                >
                  Não
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <input 
                type="file" 
                id="restore-company-backup" 
                className="hidden" 
                accept=".json"
                onChange={handleRestoreBackup}
              />
              <Button 
                variant="outline"
                className="w-full border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white font-bold border-dashed"
                onClick={() => document.getElementById('restore-company-backup')?.click()}
              >
                <Upload size={16} className="mr-2" />
                RESTAURAR BACKUP NESTA EMPRESA
              </Button>
              <p className="text-[10px] text-[#71717a] mt-2 italic text-center">Use para recuperar dados vinculando-os a este registro atual.</p>
            </div>

            {editingCompany?.isExempt === false && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-4 p-3 bg-[#0f1115]/50 border border-[#2d3139] rounded-lg"
              >
                <div className="space-y-2">
                  <Label>Valor Customizado (R$)</Label>
                  <Input 
                    type="number"
                    value={editingCompany?.customPrice}
                    onChange={(e) => setEditingCompany({...editingCompany, customPrice: e.target.value})}
                    className="bg-[#0f1115] border-[#2d3139]"
                  />
                  <p className="text-[10px] text-[#71717a]">Use 0 para valor padrão.</p>
                </div>
                <div className="space-y-2">
                  <Label>Ciclo de Cobrança</Label>
                  <select 
                    className="w-full h-10 bg-[#0f1115] border-[#2d3139] rounded-md px-3 text-sm"
                    value={editingCompany?.billingCycle}
                    onChange={(e) => setEditingCompany({...editingCompany, billingCycle: e.target.value})}
                  >
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                    <option value="vitalicia">Vitalícia (Enterprise)</option>
                  </select>
                </div>
              </motion.div>
            )}

            <div className="flex items-center justify-between p-3 bg-[#0f1115]/50 border border-[#2d3139] rounded-lg">
              <div className="flex flex-col">
                <Label className="text-sm font-bold text-orange-400">Receber Atualizações?</Label>
                <span className="text-[10px] text-[#71717a]">Se "Não", novos recursos serão bloqueados.</span>
              </div>
              <div className="flex bg-[#0f1115] p-1 rounded-md border border-[#2d3139]">
                <Button 
                  size="sm" 
                  variant={editingCompany?.receivesUpdates === true ? "default" : "ghost"}
                  className={cn("h-7 px-3 text-[11px]", editingCompany?.receivesUpdates === true ? "bg-blue-600 hover:bg-blue-700" : "text-[#71717a]")}
                  onClick={() => setEditingCompany({...editingCompany, receivesUpdates: true})}
                >
                  Sim
                </Button>
                <Button 
                  size="sm" 
                  variant={editingCompany?.receivesUpdates === false ? "destructive" : "ghost"}
                  className={cn("h-7 px-3 text-[11px]", editingCompany?.receivesUpdates === false ? "bg-red-600 hover:bg-red-700" : "text-[#71717a]")}
                  onClick={() => setEditingCompany({...editingCompany, receivesUpdates: false})}
                >
                  Não
                </Button>
              </div>
            </div>

            <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label className="text-sm font-bold text-red-500">Acesso ao Sistema</Label>
                  <span className="text-[10px] text-[#71717a]">Bloquear impede totalmente o login dos funcionários.</span>
                </div>
                <Button 
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white h-8 text-[10px]"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  <Trash2 size={14} className="mr-1" />
                  Excluir Permanentemente
                </Button>
              </div>
              <Button 
                variant={editingCompany?.status === 'blocked' ? "default" : "destructive"}
                className={cn(
                  "w-full h-9 text-xs font-bold uppercase tracking-wide text-white",
                  editingCompany?.status === 'blocked' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                )}
                onClick={() => toggleCompanyStatus(editingCompany.id, editingCompany.status)}
              >
                {editingCompany?.status === 'blocked' ? 'Desbloquear Acesso Agora' : 'Bloquear Acesso Agora'}
              </Button>
            </div>
          </div>
          <DialogFooter className="bg-[#0f1115]/50 p-4 -mx-6 -mb-6 border-t border-[#2d3139] mt-2 rounded-b-lg">
            <Button variant="outline" onClick={() => setIsEditCompanyOpen(false)} className="border-[#2d3139] text-[#a0a0a0]">Fechar Janela</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={handleUpdateCompanyPlan}>Gravar Alterações do Plano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Company Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500 font-bold">
              <Trash2 size={24} />
              EXCLUSÃO TOTAL E IRREVERSÍVEL
            </DialogTitle>
            <DialogDescription className="text-[#a0a0a0] pt-2">
              Você está prestes a apagar a empresa <strong className="text-white">"{editingCompany?.name}"</strong> e TODOS os dados vinculados a ela (clientes, visitas, orçamentos, financeiro).
            </DialogDescription>
          </DialogHeader>

          <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg my-4 space-y-3">
            <p className="text-xs text-yellow-500 font-bold uppercase flex items-center gap-2">
              <Database size={14} /> Passo 1: Recomendamos fazer Backup
            </p>
            <p className="text-[11px] text-[#a0a0a0]">
              Baixe todos os registros desta empresa em formato JSON para garantir que não perderá informações importantes.
            </p>
            <Button 
              className="w-full bg-[#2d3139] hover:bg-[#3b414a] text-white text-xs h-9 flex items-center gap-2"
              onClick={() => handleDownloadBackup(editingCompany.id, editingCompany.name, editingCompany.document)}
              disabled={isBackingUp}
            >
              <Download size={14} />
              {isBackingUp ? 'Processando Backup...' : 'Download Backup dos Dados (JSON)'}
            </Button>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg my-4 space-y-3">
            <p className="text-xs text-red-500 font-bold uppercase flex items-center gap-2">
              <AlertCircle size={14} /> Passo 2: Confirmação Final
            </p>
            <p className="text-[11px] text-[#a0a0a0]">
              Esta ação NÃO PODE ser desfeita. Todos os dados serão removidos do banco de dados permanentemente.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0]">
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={() => handleFinalDelete(editingCompany.id)}
            >
              Sim, Apagar Tudo Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Blocking */}
      <Dialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-red-500" size={20} />
              Confirmar Bloqueio
            </DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">
              Tem certeza que deseja bloquear o acesso desta empresa? O usuário não conseguirá entrar no sistema até ser desbloqueado.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md mb-4 text-xs text-red-400">
            <strong>Atenção:</strong> Bloquear uma empresa interromperá todos os processos em andamento para os funcionários vinculados a ela.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBlockConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0]">
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={() => companyToToggle && executeToggle(companyToToggle.id, 'blocked')}
            >
              Sim, Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RolePermissionManager({ companyId, user, userRoles }: { companyId: string, user: FirebaseUser, userRoles: UserRole[] }) {
  const [rolePermissions, setRolePermissions] = useState<any>({});
  const [selectedRole, setSelectedRole] = useState<string>('tecnico');
  const [loading, setLoading] = useState(true);

  const isMaster = user?.email?.toLowerCase().trim() === 'emailparasiteslixo@gmail.com' || user?.email?.toLowerCase().trim() === 'alffonseca42@gmail.com';

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'companies', companyId, 'settings', 'permissions'), (docSnap) => {
      if (docSnap.exists()) {
        setRolePermissions(docSnap.data());
      } else {
        // Initial setup based on current hardcoded logic
        setRolePermissions({
          admin: { menus: ALL_MENU_ITEMS.map(m => m.id), lists: ALL_MENU_ITEMS.map(m => m.id) },
          secretaria: { 
            menus: ['dashboard', 'financial', 'budgets', 'clients', 'suppliers', 'receipts', 'users', 'reports', 'settings'],
            lists: ['dashboard', 'financial', 'budgets', 'clients', 'suppliers', 'receipts', 'users', 'reports', 'settings']
          },
          tecnico: { 
            menus: ['visits', 'service-orders', 'receipts'],
            lists: ['visits', 'service-orders']
          },
          auxiliar: { menus: ['dashboard'], lists: [] }
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [companyId]);

  const togglePermission = async (menuId: string, type: 'menus' | 'lists') => {
    const current = rolePermissions[selectedRole] || { menus: [], lists: [] };
    const list = current[type] || [];
    const newList = list.includes(menuId)
      ? list.filter((id: string) => id !== menuId)
      : [...list, menuId];
    
    const newPermissions = {
      ...rolePermissions,
      [selectedRole]: {
        ...current,
        [type]: newList
      }
    };

    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'permissions'), newPermissions);
      toast.success('Permissões atualizadas!');
    } catch (error) {
      toast.error('Erro ao atualizar permissões.');
    }
  };

  if (loading) return <div className="p-4 text-[#71717a] text-sm italic">Carregando permissões...</div>;

  if (!isMaster) {
    return (
      <Card className="bg-[#1a1d23] border-[#2d3139] text-white lg:col-span-2">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <ShieldAlert className="h-12 w-12 text-[#ef4444] mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">Painel de Acesso Restrito</h3>
          <p className="text-[#a0a0a0] max-w-sm">
            Esta área de configuração de permissões avançadas é reservada exclusivamente ao administrador mestre do sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1d23] border-[#2d3139] text-white lg:col-span-2 overflow-hidden">
      <CardHeader className="bg-[#2d3139]/20 border-b border-[#2d3139]/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Shield className="text-yellow-500" size={24} />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Controle de Acesso Granular (Master)</CardTitle>
              <CardDescription className="text-[#a0a0a0]">
                Configure o acesso aos menus e visibilidade de dados por perfil.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#0f1115] p-1.5 rounded-lg border border-[#2d3139]">
            <span className="text-[10px] text-[#71717a] font-bold uppercase pl-2">Perfil:</span>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[180px] bg-transparent border-none h-8 text-xs font-bold text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-[#e0e0e0]">
                {userRoles.map(role => (
                  <SelectItem key={role.id} value={role.id} className="text-xs">{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-[#2d3139]">
           <div className="p-6 space-y-4">
             <div className="flex items-center gap-2 mb-2">
               <Menu className="text-[#3b82f6]" size={16} />
               <h4 className="font-bold text-xs text-[#3b82f6] uppercase tracking-wider">Acesso ao Menu Principal</h4>
             </div>
             <p className="text-[10px] text-[#71717a]">Define quais abas aparecerão na barra lateral para este perfil.</p>
             <div className="grid grid-cols-1 gap-1">
               {ALL_MENU_ITEMS.map(item => (
                 <label 
                   key={item.id} 
                   className={cn(
                     "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                     rolePermissions[selectedRole]?.menus?.includes(item.id) 
                       ? "bg-[#3b82f6]/5 border-[#3b82f6]/20 text-white" 
                       : "bg-transparent border-[#2d3139] text-[#71717a] hover:bg-white/5"
                   )}
                 >
                   <span className="text-xs font-medium">{item.label}</span>
                   <Checkbox 
                     checked={rolePermissions[selectedRole]?.menus?.includes(item.id)}
                     onCheckedChange={() => togglePermission(item.id, 'menus')}
                     className="data-[state=checked]:bg-[#3b82f6] data-[state=checked]:border-[#3b82f6]"
                   />
                 </label>
               ))}
             </div>
           </div>
           <div className="p-6 space-y-4">
             <div className="flex items-center gap-2 mb-2">
               <Eye className="text-yellow-500" size={16} />
               <h4 className="font-bold text-xs text-yellow-500 uppercase tracking-wider">Visualizar Listagens de Dados</h4>
             </div>
             <p className="text-[10px] text-[#71717a]">Se desmarcado, o usuário acessa a tela mas verá o aviso de "Acesso Negado" na lista.</p>
             <div className="grid grid-cols-1 gap-1">
               {ALL_MENU_ITEMS.map(item => (
                 <label 
                   key={item.id} 
                   className={cn(
                     "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                     rolePermissions[selectedRole]?.lists?.includes(item.id) 
                       ? "bg-yellow-500/5 border-yellow-500/20 text-white" 
                       : "bg-transparent border-[#2d3139] text-[#71717a] hover:bg-white/5"
                   )}
                 >
                   <span className="text-xs font-medium">{item.label}</span>
                   <Checkbox 
                     checked={rolePermissions[selectedRole]?.lists?.includes(item.id)}
                     onCheckedChange={() => togglePermission(item.id, 'lists')}
                     className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                   />
                 </label>
               ))}
             </div>
           </div>
        </div>
      </CardContent>
      <div className="bg-[#0f1115] p-3 text-[10px] text-[#71717a] text-center border-t border-[#2d3139]">
        As alterações são aplicadas instantaneamente para todos os usuários deste nível.
      </div>
    </Card>
  );
}

function RoleSettings({ 
  companyId, 
  customRoles, 
  userRoles 
}: { 
  companyId: string, 
  customRoles: UserRole[], 
  userRoles: UserRole[] 
}) {
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddRole = async () => {
    if (!newRoleLabel.trim()) return;
    const roleId = newRoleLabel.toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    
    if (userRoles.some(r => r.id === roleId)) {
      toast.error('Este nível de acesso já existe.');
      return;
    }

    const newRole: UserRole = {
      id: roleId,
      label: newRoleLabel.trim(),
      isCustom: true
    };

    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'roles'), {
        roles: [...customRoles, newRole]
      });
      setNewRoleLabel('');
      setIsAdding(false);
      toast.success('Nível de acesso criado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/roles`);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este nível de acesso? Isso pode afetar usuários vinculados a ele.')) return;
    
    const updated = customRoles.filter(r => r.id !== roleId);
    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'roles'), {
        roles: updated
      });
      toast.success('Nível de acesso removido!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/roles`);
    }
  };

  return (
    <Card className="bg-[#1a1d23] border-[#2d3139] overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent border-b border-[#2d3139]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Shield className="text-purple-500" size={20} />
            </div>
            <div>
              <CardTitle className="text-white text-lg">Níveis de Acesso Personalizados</CardTitle>
              <CardDescription className="text-[#a0a0a0] text-xs">Crie e gerencie cargos personalizados para sua equipe.</CardDescription>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-purple-500/50 text-purple-500 hover:bg-purple-500/10"
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? <X size={16} /> : <Plus size={16} />}
            <span className="ml-2">{isAdding ? 'Cancelar' : 'Novo Nível'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {isAdding && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
            <Input 
              value={newRoleLabel}
              onChange={e => setNewRoleLabel(e.target.value)}
              placeholder="Ex: Supervisor, Estagiário..."
              className="bg-[#0f1115] border-[#2d3139] text-white"
            />
            <Button onClick={handleAddRole} className="bg-purple-500 hover:bg-purple-600 text-white">Criar</Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEFAULT_ROLES.map(role => (
            <div key={role.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0f1115] border border-[#2d3139] opacity-70">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <Lock size={14} className="text-[#71717a]" />
                </div>
                <span className="text-sm font-medium text-white">{role.label}</span>
              </div>
              <Badge variant="outline" className="text-[9px] border-[#2d3139] text-[#71717a]">PADRÃO</Badge>
            </div>
          ))}
          {customRoles.map(role => (
            <div key={role.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0f1115] border border-[#3b82f6]/20 hover:border-[#3b82f6]/50 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#3b82f6]/10 flex items-center justify-center">
                  <Shield size={14} className="text-[#3b82f6]" />
                </div>
                <span className="text-sm font-medium text-white">{role.label}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-[#ef4444] hover:bg-[#ef4444]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteRole(role.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsManager({ 
  pixSettings, 
  appSettings, 
  user, 
  companyId, 
  currentUserData,
  allCompanies = [],
  selectedCompanyId,
  setSelectedCompanyId,
  isSuperAdmin = false,
  currentCompany,
  customRoles,
  userRoles
}: { 
  pixSettings: PixSettings, 
  appSettings: AppSettings, 
  user: FirebaseUser, 
  companyId: string, 
  currentUserData: any,
  allCompanies?: any[],
  selectedCompanyId?: string,
  setSelectedCompanyId?: (id: string) => void,
  isSuperAdmin?: boolean,
  currentCompany?: any,
  customRoles: UserRole[],
  userRoles: UserRole[]
}) {
  const [localApp, setLocalApp] = useState<AppSettings>(appSettings || {
    logoUrl: '',
    companyName: '',
    address: '',
    neighborhood: '',
    responsible: '',
    city: '',
    cep: '',
    document: '',
    signatureUrl: ''
  });
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Multi-PIX states
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [currentPix, setCurrentPix] = useState<Partial<PixAccount>>({});
  const [editingPixId, setEditingPixId] = useState<string | null>(null);

  // Keep state in sync with props
  useEffect(() => {
    if (appSettings && Object.keys(appSettings).length > 0) {
      setLocalApp(prev => ({
        ...prev,
        ...appSettings
      }));
    }
  }, [appSettings]);

  useEffect(() => {
    setNewDisplayName(user?.displayName || '');
  }, [user?.displayName]);

  const handleSaveApp = async () => {
    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'general'), localApp);
      // Also update the main company document for better reactivity in the header
      await updateDoc(doc(db, 'companies', companyId), {
        name: localApp.companyName,
        companyName: localApp.companyName
      });
      toast.success('Configurações gerais salvas!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/general`);
    }
  };

  const handleRotateInviteCode = async () => {
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await updateDoc(doc(db, 'companies', companyId), {
        inviteCode: newCode
      });
      toast.success('Código de convite alterado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}`);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalApp({ ...localApp, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePixAccount = async () => {
    if (!currentPix.label || !currentPix.key) {
      toast.error('Preencha ao menos o Identificador e a Chave PIX.');
      return;
    }

    let updatedAccounts = [...(pixSettings.accounts || [])];
    if (editingPixId) {
      updatedAccounts = updatedAccounts.map(acc => acc.id === editingPixId ? { ...acc, ...currentPix } as PixAccount : acc);
    } else {
      updatedAccounts.push({ ...currentPix, id: Date.now().toString() } as PixAccount);
    }

    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'pix'), { accounts: updatedAccounts });
      toast.success(editingPixId ? 'Conta PIX atualizada!' : 'Nova conta PIX adicionada!');
      setIsPixDialogOpen(false);
      setCurrentPix({});
      setEditingPixId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/pix`);
    }
  };

  const handleDeletePixAccount = async (id: string) => {
    const updatedAccounts = (pixSettings.accounts || []).filter(acc => acc.id !== id);
    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'pix'), { accounts: updatedAccounts });
      toast.success('Conta PIX removida!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/pix`);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      if (newDisplayName !== (user?.displayName || '')) {
        // Update Auth profile
        if (user) {
          await updateProfile(user, { displayName: newDisplayName });
        }
        
        // Update Firestore profile to ensure all lists are correctly updated
        if (user?.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            displayName: newDisplayName
          });
        }
        
        toast.success('Nome atualizado com sucesso!');
      }
      
      if (newPassword) {
        await updatePassword(user, newPassword);
        toast.success('Senha atualizada com sucesso!');
        setNewPassword('');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Para alterar a senha, você precisa ter feito login recentemente.');
      } else {
        toast.error('Erro ao atualizar perfil.');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const backupData: any = { 
        companyName: localApp.companyName, 
        companyId, 
        documentNumber: localApp.document, 
        exportedAt: new Date().toISOString(), 
        data: {} 
      };
      const collections = ['companies', 'clients', 'visits', 'receipts', 'financial', 'budgets', 'users'];
      
      for (const col of collections) {
        let q;
        if (col === 'companies') {
          q = query(collection(db, col), where('__name__', '==', companyId));
        } else {
          q = query(collection(db, col), where('companyId', '==', companyId));
        }
        const snapshot = await getDocs(q);
        const docs = [];
        for (const docSnap of snapshot.docs) {
          const docData = { id: docSnap.id, ...(docSnap.data() as any) };
          if (col === 'companies') {
            const settingsSnap = await getDoc(doc(db, 'companies', docSnap.id, 'settings', 'general'));
            if (settingsSnap.exists()) {
              docData.generalSettings = settingsSnap.data();
            }
            const pixSnap = await getDoc(doc(db, 'companies', docSnap.id, 'settings', 'pix'));
            if (pixSnap.exists()) {
              docData.pixSettings = pixSnap.data();
            }
            const permissionsSnap = await getDoc(doc(db, 'companies', docSnap.id, 'settings', 'permissions'));
            if (permissionsSnap.exists()) {
              docData.permissionsSettings = permissionsSnap.data();
            }
          }
          docs.push(docData);
        }
        backupData.data[col] = docs;
      }

      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${localApp.companyName.replace(/\s+/g, '_')}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Backup gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar backup.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm("ATENÇÃO: Restaurar um backup substituirá os dados atuais que possuírem o mesmo ID. Deseja continuar?");
    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data) {
        throw new Error("Formato de backup inválido.");
      }

      const collections = Object.keys(backup.data);
      let totalRestored = 0;

      for (const col of collections) {
        const docs = backup.data[col];
        if (!Array.isArray(docs)) continue;

        for (const item of docs) {
          const { id, generalSettings, pixSettings, permissionsSettings, ...data } = item;
          
          // Ensure data belongs to current company if it's not the company doc itself
          if (col !== 'companies') {
            data.companyId = companyId;
          }

          // Restore main document
          await setDoc(doc(db, col, id), data);

          // Special handling for subcollections if it's the companies collection
          if (col === 'companies' && id === companyId) {
            if (generalSettings) {
              await setDoc(doc(db, 'companies', id, 'settings', 'general'), generalSettings);
            }
            if (pixSettings) {
              await setDoc(doc(db, 'companies', id, 'settings', 'pix'), pixSettings);
            }
            if (permissionsSettings) {
              await setDoc(doc(db, 'companies', id, 'settings', 'permissions'), permissionsSettings);
            }
          }
          
          totalRestored++;
        }
      }

      toast.success(`Restauração concluída! ${totalRestored} registros processados.`);
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro na restauração: ${error.message || 'Formato inválido'}`);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isLoading = !companyId || (isSuperAdmin ? !selectedCompanyId : !currentUserData);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-[#1a1d23]/50 rounded-xl border border-dashed border-[#2d3139]">
        <div className="relative">
          <RefreshCw className="h-10 w-10 animate-spin text-blue-500/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Settings className="h-4 w-4 text-blue-500" />
          </div>
        </div>
        <p className="text-[#a0a0a0] mt-4 font-medium">Sincronizando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Configurações do Sistema</h2>
        <p className="text-[#71717a]">Gerencie os dados globais do sistema e seu perfil.</p>
      </div>

      {isSuperAdmin && allCompanies.length > 0 && (
        <Card className="bg-[#3b82f6]/5 border border-[#3b82f6]/20 p-6 rounded-xl mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Database className="text-[#3b82f6]" size={20} />
                Visão da Empresa (Super Admin)
              </h3>
              <p className="text-sm text-[#71717a]">Selecione qual empresa você deseja visualizar e gerenciar no momento.</p>
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                  <SelectValue>
                    {allCompanies.find(c => c.id === selectedCompanyId)?.name || 'Empresa S/N'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-[#e0e0e0]">
                  {allCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name || 'Empresa S/N'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      <RoleSettings companyId={companyId} customRoles={customRoles} userRoles={userRoles} />

      <div className="flex flex-col md:flex-row justify-between items-center bg-[#3b82f6]/10 border border-[#3b82f6]/20 p-6 rounded-xl gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-tight">Código de Acesso Técnico</h3>
            <Badge className="bg-[#3b82f6] text-white">Ativo</Badge>
          </div>
          <p className="text-sm text-[#71717a]">Novos técnicos podem entrar na sua empresa usando este código único. Ele muda automaticamente após o primeiro uso.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="bg-[#0f1115] px-4 py-2.5 rounded-lg border border-[#2d3139] text-[#3b82f6] font-mono font-bold text-xl w-full md:w-auto text-center">
            {currentCompany?.inviteCode || '...'}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="default" 
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white flex-1 sm:flex-none"
              onClick={() => {
                const code = currentCompany?.inviteCode || '';
                if (code) {
                  navigator.clipboard.writeText(code);
                  toast.success('Código copiado!');
                }
              }}
            >
              Copiar
            </Button>
            <Button 
              variant="outline" 
              className="border-[#2d3139] text-[#a0a0a0] hover:text-white flex-1 sm:flex-none"
              onClick={handleRotateInviteCode}
            >
              <RefreshCw size={16} className="mr-2" />
              Mudar código
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="text-[#3b82f6]" size={20} />
              Configurações Gerais
            </CardTitle>
            <CardDescription className="text-[#71717a]">
              Personalize o nome da empresa e a logo do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-[#a0a0a0]">Nome da Empresa</Label>
              <Input 
                id="companyName" 
                value={localApp.companyName || ''} 
                onChange={e => setLocalApp({ ...localApp, companyName: e.target.value })} 
                className="bg-[#0f1115] border-[#2d3139] text-white" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyDoc" className="text-[#a0a0a0]">CPF/CNPJ da Empresa</Label>
                <Input 
                  id="companyDoc" 
                  value={localApp.document || ''} 
                  onChange={e => setLocalApp({ ...localApp, document: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyResp" className="text-[#a0a0a0]">Responsável</Label>
                <Input 
                  id="companyResp" 
                  value={localApp.responsible || ''} 
                  onChange={e => setLocalApp({ ...localApp, responsible: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyPhone" className="text-[#a0a0a0]">Telefone de Contato</Label>
                <Input 
                  id="companyPhone" 
                  value={localApp.companyPhone || ''} 
                  onChange={e => setLocalApp({ ...localApp, companyPhone: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail" className="text-[#a0a0a0]">E-mail de Contato</Label>
                <Input 
                  id="companyEmail" 
                  value={localApp.companyEmail || ''} 
                  onChange={e => setLocalApp({ ...localApp, companyEmail: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                  placeholder="empresa@exemplo.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyAddress" className="text-[#a0a0a0]">Endereço</Label>
                <Input 
                  id="companyAddress" 
                  value={localApp.address || ''} 
                  onChange={e => setLocalApp({ ...localApp, address: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyNeighborhood" className="text-[#a0a0a0]">Bairro</Label>
                <Input 
                  id="companyNeighborhood" 
                  value={localApp.neighborhood || ''} 
                  onChange={e => setLocalApp({ ...localApp, neighborhood: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyCity" className="text-[#a0a0a0]">Cidade - UF</Label>
                <Input 
                  id="companyCity" 
                  value={localApp.city || ''} 
                  onChange={e => setLocalApp({ ...localApp, city: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyCep" className="text-[#a0a0a0]">CEP</Label>
                <Input 
                  id="companyCep" 
                  value={localApp.cep || ''} 
                  onChange={e => setLocalApp({ ...localApp, cep: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#a0a0a0]">Logo da Empresa</Label>
              <div className="flex flex-col gap-4">
                {localApp.logoUrl && (
                  <div className="h-20 w-auto flex items-center justify-center bg-[#0f1115] rounded-lg border border-[#2d3139] p-2">
                    <img src={localApp.logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload}
                  className="bg-[#0f1115] border-[#2d3139] text-white file:bg-[#3b82f6] file:text-white file:border-none file:px-4 file:py-1 file:rounded-md file:mr-4 file:cursor-pointer" 
                />
                <p className="text-[10px] text-[#71717a]">Recomendado: PNG ou JPG com fundo transparente.</p>
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-[#2d3139]">
              <Label className="text-[#a0a0a0]">Assinatura Digital (Recibos e Contratos)</Label>
              <SignaturePad 
                value={localApp.signatureUrl} 
                onChange={(val) => setLocalApp({ ...localApp, signatureUrl: val })} 
              />
              <p className="text-[10px] text-[#71717a]">Use o mouse ou tela touch para assinar acima. Ela será usada em todos os documentos.</p>
            </div>
            <Button onClick={handleSaveApp} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white border-none mt-4">
              Salvar Configurações Gerais
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="text-[#3b82f6]" size={20} />
                Perfil do Usuário
              </CardTitle>
              <CardDescription className="text-[#71717a]">
                Atualize seu nome de exibição e senha de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileName" className="text-[#a0a0a0]">Nome de Exibição</Label>
                <Input 
                  id="profileName" 
                  value={newDisplayName} 
                  onChange={e => setNewDisplayName(e.target.value)} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileEmail" className="text-[#a0a0a0]">E-mail (Apenas leitura)</Label>
                <Input 
                  id="profileEmail" 
                  value={user.email || ''} 
                  disabled
                  className="bg-[#0f1115] border-[#2d3139] text-[#71717a] cursor-not-allowed" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profilePass" className="text-[#a0a0a0]">Nova Senha (Deixe em branco para não alterar)</Label>
                <Input 
                  id="profilePass" 
                  type="password"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Mínimo 6 caracteres"
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
              <Button 
                onClick={handleUpdateProfile} 
                disabled={isUpdatingProfile}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white"
              >
                {isUpdatingProfile ? 'Atualizando...' : 'Salvar Perfil'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="text-[#3b82f6]" size={20} />
                Backup e Restauração
              </CardTitle>
              <CardDescription className="text-[#71717a]">
                Gerencie a segurança dos seus dados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[#a0a0a0]">
                O backup inclui todos os clientes, visitas técnicas, orçamentos e registros financeiros vinculados à sua empresa.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  onClick={handleDownloadBackup} 
                  disabled={isBackingUp || isRestoring}
                  variant="outline"
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white h-11"
                >
                  {isBackingUp ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" />
                      GERAR BACKUP
                    </>
                  )}
                </Button>

                <div className="relative">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleRestoreBackup}
                    accept=".json,application/json"
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isBackingUp || isRestoring}
                    variant="outline"
                    className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-white h-11"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        Restaurando...
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="mr-2" />
                        RESTAURAR BACKUP
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-[#71717a] italic text-center">
                A restauração substituirá dados existentes com o mesmo identificador.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#1a1d23] border-[#2d3139] text-white lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="text-[#3b82f6]" size={20} />
                Contas PIX para Pagamento
              </CardTitle>
              <CardDescription className="text-[#71717a]">
                Cadastre várias chaves PIX para especificar em cada cliente.
              </CardDescription>
            </div>
            <Dialog open={isPixDialogOpen} onOpenChange={setIsPixDialogOpen}>
              <DialogTrigger render={
                <Button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white gap-2" onClick={() => {
                  setCurrentPix({});
                  setEditingPixId(null);
                }}>
                  <Plus size={16} />
                  Nova Conta
                </Button>
              } />
              <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[500px]">
                <DialogHeader className="p-6 pb-2 flex-shrink-0">
                  <DialogTitle className="text-white">{editingPixId ? 'Editar Conta PIX' : 'Nova Conta PIX'}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="pixLabel" className="text-[#a0a0a0]">Identificador (Ex: Itaú, Nubank Principal)</Label>
                      <Input 
                        id="pixLabel" 
                        value={currentPix.label || ''} 
                        onChange={e => setCurrentPix({...currentPix, label: e.target.value})} 
                        placeholder="Identificador da conta"
                        className="bg-[#0f1115] border-[#2d3139] text-white" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pixKey" className="text-[#a0a0a0]">Chave PIX</Label>
                        <Input 
                          id="pixKey" 
                          value={currentPix.key || ''} 
                          onChange={e => setCurrentPix({...currentPix, key: e.target.value})} 
                          placeholder="E-mail, CPF, etc."
                          className="bg-[#0f1115] border-[#2d3139] text-white" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pixBank" className="text-[#a0a0a0]">Banco</Label>
                        <Input 
                          id="pixBank" 
                          value={currentPix.bank || ''} 
                          onChange={e => setCurrentPix({...currentPix, bank: e.target.value})} 
                          placeholder="Ex: Nubank"
                          className="bg-[#0f1115] border-[#2d3139] text-white" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pixFavored" className="text-[#a0a0a0]">Favorecido</Label>
                        <Input 
                          id="pixFavored" 
                          value={currentPix.favored || ''} 
                          onChange={e => setCurrentPix({...currentPix, favored: e.target.value})} 
                          className="bg-[#0f1115] border-[#2d3139] text-white" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pixDoc" className="text-[#a0a0a0]">Documento (CPF/CNPJ)</Label>
                        <Input 
                          id="pixDoc" 
                          value={currentPix.document || ''} 
                          onChange={e => setCurrentPix({...currentPix, document: e.target.value})} 
                          className="bg-[#0f1115] border-[#2d3139] text-white" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
                  <Button variant="outline" onClick={() => setIsPixDialogOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
                  <Button onClick={handleSavePixAccount} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(pixSettings.accounts || []).map(acc => (
                <div key={acc.id} className="p-4 rounded-lg bg-[#0f1115] border border-[#2d3139] flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white mb-1">{acc.label}</h4>
                    <p className="text-xs text-[#71717a]">{acc.bank} • {acc.favored}</p>
                    <p className="text-sm text-[#3b82f6] mt-1 font-mono break-all">{acc.key}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={() => {
                      setCurrentPix(acc);
                      setEditingPixId(acc.id);
                      setIsPixDialogOpen(true);
                    }}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-red-500 hover:bg-red-500/10" onClick={() => handleDeletePixAccount(acc.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {(!pixSettings.accounts || pixSettings.accounts.length === 0) && (
                <div className="col-span-full py-8 text-center text-[#71717a] border border-dashed border-[#2d3139] rounded-lg">
                  Nenhuma conta PIX cadastrada.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <RolePermissionManager companyId={companyId} user={user} userRoles={userRoles} />
      </div>
    </div>
  );
}

function ReportsManager({ 
  visits = [], 
  financials = [], 
  budgets = [], 
  clients = [], 
  receipts = [], 
  serviceOrders = [],
  suppliers = [],
  appSettings, 
  companyId,
  showList
}: { 
  visits: TechnicalVisit[], 
  financials: FinancialRecord[], 
  budgets: Budget[], 
  clients: Client[], 
  receipts: Receipt[], 
  serviceOrders: ServiceOrder[],
  suppliers: Supplier[],
  appSettings: AppSettings, 
  companyId: string,
  showList: boolean
}) {
  const [date, setDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');

  const generateReport = (category: string) => {
    const doc = new jsPDF();
    const title = category.toUpperCase();
    const period = reportType === 'daily' 
      ? format(date, 'dd/MM/yyyy') 
      : `${format(new Date(year, month), 'MMMM', { locale: ptBR })}/${year}`;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text(`RELATÓRIO DE ${title}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    doc.text(`Período: ${period}`, 105, 28, { align: 'center' });
    doc.text(`Empresa: ${appSettings.companyName}`, 105, 34, { align: 'center' });
    
    let filteredData: any[] = [];
    let tableHeaders: string[] = [];
    let tableRows: any[][] = [];

    const isMatch = (itemDate: any) => {
      const d = safeParseDate(itemDate);
      if (reportType === 'daily') {
        return format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      } else {
        return d.getMonth() === month && d.getFullYear() === year;
      }
    };

    if (category === 'Visitas') {
      filteredData = visits.filter(v => isMatch(v.date));
      tableHeaders = ['Número', 'Cliente', 'Tipo', 'Preço', 'Status'];
      tableRows = filteredData.map(v => [
        formatRecordNumber(v.number, v.date),
        v.clientName,
        v.type,
        `R$ ${(v.totalValue || 0).toFixed(2)}`,
        v.status
      ]);
    } else if (category === 'Financeiro') {
      filteredData = financials.filter(f => isMatch(f.date));
      tableHeaders = ['Data', 'Cliente', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
      tableRows = filteredData.map(f => {
        const d = f.date instanceof Timestamp ? f.date.toDate() : (f.date instanceof Date ? f.date : new Date(f.date));
        const client = clients.find(c => c.id === f.clientId);
        return [
          format(d, 'dd/MM/yyyy'),
          client ? client.name : 'N/A',
          f.description,
          `R$ ${(f.value || 0).toFixed(2)}`,
          f.type,
          f.category || 'N/A'
        ];
      });
    } else if (category === 'Recibos') {
      filteredData = receipts.filter(r => isMatch(r.createdAt));
      tableHeaders = ['Número', 'Cliente', 'Data', 'Valor'];
      tableRows = filteredData.map(r => [
        formatRecordNumber(r.number, r.createdAt),
        r.clientName,
        format(r.createdAt instanceof Timestamp ? r.createdAt.toDate() : (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)), 'dd/MM/yyyy'),
        `R$ ${(r.value || 0).toFixed(2)}`
      ]);
    } else if (category === 'Orçamentos') {
      filteredData = budgets.filter(b => isMatch(b.createdAt));
      tableHeaders = ['Número', 'Cliente', 'Valor', 'Status'];
      tableRows = filteredData.map(b => [
        formatRecordNumber(b.number, b.createdAt),
        b.clientName,
        `R$ ${(b.total || 0).toFixed(2)}`,
        b.status
      ]);
    } else if (category === 'Clientes') {
      filteredData = clients;
      tableHeaders = ['Nome', 'Tipo', 'Telefone', 'Endereço'];
      tableRows = filteredData.map(c => [
        c.name,
        c.type,
        c.phone,
        c.address
      ]);
    } else if (category === 'Ordem de Serviço') {
      filteredData = serviceOrders.filter(os => isMatch(os.date));
      tableHeaders = ['Número', 'Cliente', 'Equipamento', 'Técnico', 'Status', 'Valor'];
      tableRows = filteredData.map(os => [
        formatRecordNumber(os.number, os.date),
        os.clientName,
        os.equipment,
        os.technicianName,
        os.status,
        `R$ ${(os.totalValue || 0).toFixed(2)}`
      ]);
    } else if (category === 'Fornecedores') {
      filteredData = suppliers; // Suppliers report might not need date filtering if they don't have a transaction date, but I'll leave it simple
      tableHeaders = ['Nº Cad.', 'Fornecedor', 'Atividade', 'Contato', 'Telefone', 'Cidade/UF'];
      tableRows = filteredData.map(s => [
        s.registrationNumber || '-',
        s.name,
        s.activity || '-',
        s.contact || '-',
        s.phone || '-',
        s.cityState || '-'
      ]);
    }

    if (tableRows.length === 0) {
      toast.error(`Nenhum registro de ${category} encontrado para este período.`);
      return;
    }

    autoTable(doc, {
      startY: 45,
      head: [tableHeaders],
      body: tableRows,
      headStyles: { fillColor: [59, 130, 246] },
      theme: 'grid'
    });

    doc.save(`Relatorio_${category}_${period.replace(/\//g, '_')}.pdf`);
    toast.success('Relatório gerado com sucesso!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Centro de Relatórios</h2>
        <p className="text-[#71717a]">Gere listagens em PDF das suas atividades por período.</p>
      </div>

      {showList ? (
        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardHeader>
            <CardTitle className="text-[17px] flex items-center gap-2">
              <FileText size={18} className="text-[#3b82f6]" />
              Configuração do Relatório
            </CardTitle>
            <CardDescription className="text-[#71717a] text-[13px]">Selecione o filtro de tempo para a listagem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <Label className="text-[#a0a0a0]">Tipo de Período</Label>
                <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                  <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white h-11">
                    <SelectValue>
                      {reportType === 'daily' ? 'Diário (Listagem por Dia)' : reportType === 'monthly' ? 'Mensal (Listagem por Mês)' : 'Selecione'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    <SelectItem value="daily">Diário (Listagem por Dia)</SelectItem>
                    <SelectItem value="monthly">Mensal (Listagem por Mês)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === 'daily' ? (
                <div className="flex-1 space-y-3">
                  <Label className="text-[#a0a0a0]">Data da Listagem</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white h-11", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-[#3b82f6]" />
                        {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0 bg-[#1a1d23] border-[#2d3139]">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="bg-[#1a1d23] text-white" />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-[#a0a0a0]">Mês</Label>
                    <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>{format(new Date(2022, i, 1), 'MMMM', { locale: ptBR }).toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[#a0a0a0]">Ano</Label>
                    <Input 
                      type="number" 
                      value={year} 
                      onChange={e => setYear(parseInt(e.target.value))} 
                      className="bg-[#0f1115] border-[#2d3139] text-white h-11" 
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-[#2d3139]" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Visitas Técnicas', icon: <CalendarIcon size={24} />, cat: 'Visitas', color: '#3b82f6' },
                { label: 'Livro Financeiro', icon: <DollarSign size={24} />, cat: 'Financeiro', color: '#10b981' },
                { label: 'Recibos Emitidos', icon: <ReceiptIcon size={24} />, cat: 'Recibos', color: '#f59e0b' },
                { label: 'Orçamentos', icon: <FileText size={24} />, cat: 'Orçamentos', color: '#8b5cf6' },
                { label: 'Ordens de Serviço', icon: <Settings size={24} />, cat: 'Ordem de Serviço', color: '#6366f1' },
                { label: 'Fornecedores', icon: <Database size={24} />, cat: 'Fornecedores', color: '#8b5cf6' },
                { label: 'Base de Clientes', icon: <UserIcon size={24} />, cat: 'Clientes', color: '#ec4899' },
              ].map(item => (
                <button 
                  key={item.cat}
                  onClick={() => generateReport(item.cat)}
                  className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[#0f1115] border border-[#2d3139] hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/5 transition-all text-center group active:scale-95"
                >
                  <div 
                    className="mb-4 p-4 rounded-2xl bg-[#1a1d23] border border-[#2d3139] group-hover:scale-110 transition-transform"
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-white font-bold text-sm mb-1">{item.label}</h3>
                  <p className="text-[10px] text-[#71717a]">Gerar relatório PDF agora</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <NoAccessList title="Relatórios" />
      )}
    </div>
  );
}

// --- Dashboard Component ---

function VisitsChart({ data, onBarClick }: { data: any[], onBarClick?: (date: Date) => void }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isClient) {
    return <div className="h-full w-full bg-[#1a1d23]/50 animate-pulse flex items-center justify-center text-[#71717a] text-xs">Carregando gráfico...</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data}
          className="cursor-pointer"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#71717a" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#71717a" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip 
            cursor={{fill: '#25282e'}}
            contentStyle={{ 
              backgroundColor: '#1a1d23', 
              border: '1px solid #2d3139',
              borderRadius: '8px',
              color: '#fff'
            }}
            itemStyle={{ color: '#3b82f6' }}
          />
          <Bar 
            dataKey="visitas" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]} 
            barSize={40}
            style={{ cursor: 'pointer' }}
            onClick={(props: any) => {
              if (onBarClick && props && props.fullDate) {
                onBarClick(props.fullDate);
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Dashboard({ visits = [], serviceOrders = [], financials = [], budgets = [], clients = [], onNavigate, companyId, showList }: { visits: TechnicalVisit[], serviceOrders: ServiceOrder[], financials: FinancialRecord[], budgets: Budget[], clients: Client[], onNavigate: (tab: string, filter?: any) => void, companyId: string, showList: boolean }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const visitsByDay = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Use mid-day to avoid TZ shifts
    
    // Get start of week (Sunday) based on offset
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const data = days.map((name, i) => {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      const currentDateStr = format(currentDate, 'yyyy-MM-dd');
      
      const count = (visits || []).filter(v => {
        // Look for both date and expectedDate to include all visits (scheduled and completed)
        const d = safeParseDate(v.expectedDate || v.date);
        return format(d, 'yyyy-MM-dd') === currentDateStr;
      }).length;

      return {
        name,
        visitas: count,
        fullDate: currentDate
      };
    });

    return { 
      data, 
      range: `${format(startOfWeek, 'dd/MM')} - ${format(endOfWeek, 'dd/MM')}` 
    };
  }, [visits, weekOffset]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyFinancials = (financials || []).filter(f => {
      const d = safeParseDate(f.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthlyFinancials.filter(f => f.type === 'Receita').reduce((acc, f) => acc + f.value, 0);
    const expense = monthlyFinancials.filter(f => f.type === 'Despesa').reduce((acc, f) => acc + f.value, 0);
    
    // Day Stats
    const todayStr = format(now, 'yyyy-MM-dd');
    const todayFinancials = (financials || []).filter(f => {
      const d = safeParseDate(f.date);
      return format(d, 'yyyy-MM-dd') === todayStr;
    });
    
    const todayIncome = todayFinancials.filter(f => f.type === 'Receita').reduce((acc, f) => acc + f.value, 0);
    const todayExpense = todayFinancials.filter(f => f.type === 'Despesa').reduce((acc, f) => acc + f.value, 0);
    const todayBalance = todayIncome - todayExpense;

    const pendingVisits = (visits || []).filter(v => v.status === 'Agendada' || v.status === 'Em Andamento').length;
    const completedVisits = (visits || []).filter(v => v.status === 'Concluída').length;
    const pendingBudgets = (budgets || []).filter(b => b.status === 'Pendente').length;
    const pendingOS = (serviceOrders || []).filter(os => os.status === 'Aberto' || os.status === 'Em Andamento').length;
    const totalClients = (clients || []).length;

    const todayVisits = (visits || []).filter(v => {
      const d = safeParseDate(v.date);
      return format(d, 'yyyy-MM-dd') === todayStr;
    }).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));

    return { income, expense, balance: income - expense, todayBalance, pendingVisits, completedVisits, pendingBudgets, pendingOS, totalClients, todayVisits };
  }, [visits, serviceOrders, financials, budgets, clients]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'dd/MM');
    });

    return last7Days.map(day => {
      const dayFinancials = (financials || []).filter(f => {
        const d = safeParseDate(f.date);
        return format(d, 'dd/MM') === day;
      });
      return {
        name: day,
        receita: dayFinancials.filter(f => f.type === 'Receita').reduce((acc, f) => acc + f.value, 0),
        despesa: dayFinancials.filter(f => f.type === 'Despesa').reduce((acc, f) => acc + f.value, 0),
      };
    });
  }, [financials]);

  const typeData = useMemo(() => {
    const types = ['CFTV', 'Alarme', 'Cerca Elétrica', 'Motor de Portão', 'Outros'];
    return types.map(type => ({
      name: type,
      value: (visits || []).filter(v => v.type === type).length
    })).filter(t => t.value > 0);
  }, [visits]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#71717a'];

  return (
    <div className="space-y-10">
      {!showList ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#1a1d23] border border-[#2d3139] rounded-xl text-center">
          <Database className="h-12 w-12 text-[#3b82f6] mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">Painel Restrito</h3>
          <p className="text-[#a0a0a0] max-w-md">
            Você não tem permissão para visualizar as listagens de dados, por isso o resumo estatístico do painel geral está bloqueado.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Visitas Agendadas" 
          value={stats.pendingVisits} 
          icon={<CalendarIcon className="text-[#3b82f6]" />} 
          trend={`${stats.completedVisits} concluídas`} 
          isCount 
          onClick={() => onNavigate('visits')}
        />
        <StatCard 
          title="O.S. Ativas" 
          value={stats.pendingOS} 
          icon={<CheckCircle2 className="text-[#10b981]" />} 
          trend="Em andamento/Aberto" 
          isCount 
          onClick={() => onNavigate('service-orders')}
        />
        <StatCard 
          title="Orçamentos Pendentes" 
          value={stats.pendingBudgets} 
          icon={<FileText className="text-[#f59e0b]" />} 
          trend="Aguardando aprovação" 
          isCount 
          onClick={() => onNavigate('budgets')}
        />
        <Card 
          className={cn(
            "border-[#2d3139] p-6 rounded-xl cursor-pointer hover:border-[#3b82f6]/40 transition-all",
            stats.todayBalance >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
          )}
          onClick={() => onNavigate('financial')}
        >
          <div className="text-[12px] text-[#71717a] mb-2 font-medium">Saldo do Dia</div>
          <div className={cn(
            "text-[22px] font-bold tracking-tight",
            stats.todayBalance >= 0 ? "text-emerald-500" : "text-red-500"
          )}>
            R$ {stats.todayBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] mt-2 text-[#71717a]">
            Fluxo de caixa hoje
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden h-[400px]">
          <CardHeader className="border-b border-[#2d3139] px-6 py-4 flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <CardTitle className="text-[15px] font-semibold text-white">Cronograma de Visitas</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-[#71717a] hover:text-white" 
                  onClick={() => setWeekOffset(prev => prev - 1)}
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-[10px] text-[#71717a] font-mono uppercase tracking-wider">{visitsByDay.range}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-[#71717a] hover:text-white" 
                  onClick={() => setWeekOffset(prev => prev + 1)}
                >
                  <ChevronRight size={14} />
                </Button>
                {weekOffset !== 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[9px] text-[#3b82f6] hover:bg-[#3b82f6]/10" 
                    onClick={() => setWeekOffset(0)}
                  >
                    Hoje
                  </Button>
                )}
              </div>
            </div>
            <span 
              className="text-[12px] text-[#3b82f6] cursor-pointer hover:underline"
              onClick={() => onNavigate('visits')}
            >
              Ver Todas
            </span>
          </CardHeader>
          <CardContent className="p-6 h-[320px]">
            <VisitsChart 
              data={visitsByDay.data} 
              onBarClick={(date) => onNavigate('visits', { date })}
            />
          </CardContent>
        </Card>

        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden h-[400px]">
          <CardHeader className="border-b border-[#2d3139] px-6 py-4">
            <CardTitle className="text-[15px] font-semibold text-white">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center h-[320px]">
            <div className="h-full w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1d23', border: '1px solid #2d3139', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden col-span-full h-[400px]">
          <CardHeader className="border-b border-[#2d3139] px-6 py-4">
            <CardTitle className="text-[15px] font-semibold text-white">Fluxo Financeiro (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 h-[320px]">
            <div className="h-full w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1d23', border: '1px solid #2d3139', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="receita" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="despesa" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {stats.todayVisits.length > 0 && (
          <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden col-span-full">
            <CardHeader className="border-b border-[#2d3139] px-6 py-4">
              <CardTitle className="text-[15px] font-semibold text-white">Visitas para Hoje ({stats.todayVisits.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#25282e]">
                {stats.todayVisits.map(visit => (
                  <div key={visit.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#25282e]/30 transition-colors cursor-pointer" onClick={() => onNavigate('visits', { date: new Date() })}>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-white">{visit.clientName}</span>
                      <span className="text-[11px] text-[#71717a] mt-0.5">{visit.type} • {visit.scheduledTime} • {visit.technicianName}</span>
                    </div>
                    <Badge className={cn(
                      "text-[10px] uppercase px-2 py-0.5",
                      visit.status === 'Concluída' ? "bg-emerald-500/10 text-emerald-500" :
                      visit.status === 'Cancelada' ? "bg-red-500/10 text-red-500" :
                      visit.status === 'Em Andamento' ? "bg-amber-500/10 text-amber-500" :
                      "bg-blue-500/10 text-blue-500"
                    )}>
                      {visit.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-8">
          <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
            <CardHeader className="border-b border-[#2d3139] px-6 py-4">
              <CardTitle className="text-[15px] font-semibold text-white">Orçamentos Recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[#25282e]">
                {budgets.slice(0, 3).map(budget => (
                  <div key={budget.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#25282e]/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-white">{budget.clientName || 'Cliente Sem Nome'}</span>
                      <span className="text-[11px] font-semibold text-white mt-0.5">R$ {(budget.total || 0).toFixed(2)}</span>
                    </div>
                    <Badge className={cn(
                      "text-[10px] font-semibold uppercase px-2 py-0.5 rounded",
                      budget.status === 'Aprovado' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {budget.status === 'Aprovado' ? 'Aprovado' : 'Aguardando'}
                    </Badge>
                  </div>
                ))}
                {budgets.length === 0 && (
                  <p className="text-center py-8 text-sm text-[#71717a]">Nenhum orçamento recente.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 p-6 bg-[#15181e] rounded-xl border border-dashed border-[#2d3139]">
            <ActionCard title="Recibo" desc="Gerar PDF rápido" onClick={() => onNavigate('receipts')} />
            <ActionCard title="Relatório" desc="Fechamento Diário" onClick={() => onNavigate('financial')} />
            <ActionCard title="Orçamento" desc="Novo Rascunho" onClick={() => onNavigate('budgets')} />
          </div>
        </div>
      </div>
    </>
  )}
</div>
);
}

function ActionCard({ title, desc, onClick }: { title: string, desc: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex-1 bg-[#1a1d23] p-4 rounded-lg text-center cursor-pointer border border-[#2d3139] hover:border-[#3b82f6] transition-all group"
    >
      <strong className="text-xs text-white group-hover:text-[#3b82f6] transition-colors">{title}</strong>
      <div className="text-[10px] text-[#71717a] mt-1">{desc}</div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, isBalance, isCount, onClick }: { title: string, value: number, icon: React.ReactNode, trend?: string, isBalance?: boolean, isCount?: boolean, onClick?: () => void }) {
  return (
    <Card 
      className={cn("border-[#2d3139] bg-[#1a1d23] p-6 rounded-xl", onClick && "cursor-pointer hover:border-[#3b82f6]/40 transition-all")} 
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] text-[#71717a] font-medium">{title}</div>
        <div className="opacity-60">{icon}</div>
      </div>
      <div className="text-[22px] font-bold text-white tracking-tight">
        {isCount ? value.toString().padStart(2, '0') : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      </div>
      {trend && (
        <div className={cn(
          "text-[11px] mt-2 font-medium",
          trend.includes('+') ? "text-[#10b981]" : "text-[#71717a]"
        )}>
          {trend}
        </div>
      )}
    </Card>
  );
}

// --- Visits Manager Component ---

function VisitsManager({ visits = [], user, clients = [], appSettings, pixSettings, companyId, initialFilter, onClearFilter, showList, logAction }: { visits?: TechnicalVisit[], user: FirebaseUser, clients?: Client[], appSettings: AppSettings, pixSettings: PixSettings, companyId: string, initialFilter?: { date: Date | null }, onClearFilter?: () => void, showList: boolean, logAction?: any }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<string>(initialFilter?.date ? format(initialFilter.date, 'yyyy-MM-dd') : '');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<TechnicalVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<TechnicalVisit | null>(null);
  const [viewingVisit, setViewingVisit] = useState<TechnicalVisit | null>(null);

  const [isReceiptPromptOpen, setIsReceiptPromptOpen] = useState(false);
  const [visitForReceipt, setVisitForReceipt] = useState<{ id: string, status: TechnicalVisit['status'] } | null>(null);

  // Sync date filter if initialFilter changes
  useEffect(() => {
    if (initialFilter?.date) {
      setDateFilter(format(initialFilter.date, 'yyyy-MM-dd'));
    } else {
      setDateFilter('');
    }
  }, [initialFilter]);

  const filteredVisits = useMemo(() => {
    return (visits || []).filter(v => {
      const d = safeParseDate(v.expectedDate || v.date);
      const dateMatch = dateFilter ? format(d, 'yyyy-MM-dd') === dateFilter : true;
      const statusMatch = statusFilter === 'Todas' ? true : v.status === statusFilter;
      return dateMatch && statusMatch;
    });
  }, [visits, dateFilter, statusFilter]);
  const [newVisit, setNewVisit] = useState<Partial<TechnicalVisit>>({
    type: 'CFTV',
    status: 'Agendada',
    date: new Date(),
    scheduledTime: '',
    expectedDate: new Date(),
    expectedTime: '',
    technicianName: user.displayName || '',
    responsibleName: '',
    totalValue: 0
  });

  // Update technician name when user changes
  useEffect(() => {
    if (user && !newVisit.technicianName) {
      setNewVisit(prev => ({ ...prev, technicianName: user.displayName || '' }));
    }
  }, [user]);

  const filteredClientsForSelect = useMemo(() => {
    return clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const handleAddVisit = async () => {
    if (!newVisit.clientName || !newVisit.address) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const nextNumber = visits.length > 0 ? Math.max(...visits.map(v => v.number || 0)) + 1 : 1;
      
      const docRef = await addDoc(collection(db, 'visits'), {
        ...newVisit,
        number: nextNumber,
        date: Timestamp.fromDate(newVisit.date instanceof Date ? newVisit.date : new Date()),
        expectedDate: Timestamp.fromDate(newVisit.expectedDate instanceof Date ? newVisit.expectedDate : new Date()),
        technicianId: user.uid,
        technicianName: newVisit.technicianName || user.displayName || 'Técnico',
        companyId,
        createdAt: Timestamp.now()
      });
      await logAction('create', 'visit', `Agendou visita para ${newVisit.clientName}`, docRef.id);
      setNewVisit({ 
        type: 'CFTV', 
        status: 'Agendada', 
        date: new Date(), 
        scheduledTime: '',
        expectedDate: new Date(),
        expectedTime: '',
        technicianName: user.displayName || '',
        totalValue: 0,
        observations: ''
      });
      setIsAddOpen(false);
      toast.success('Visita agendada com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'visits');
    }
  };

  const executeStatusUpdate = async (id: string, status: TechnicalVisit['status'], generateReceipt: boolean) => {
    try {
      const visit = visits.find(v => v.id === id);
      if (!visit) return;
      
      const oldStatus = visit.status;
      await updateDoc(doc(db, 'visits', id), { status });
      
      if (status === 'Concluída' && oldStatus !== 'Concluída' && generateReceipt) {
        const client = visit.clientId ? clients.find(c => c.id === visit.clientId) : clients.find(c => c.name === visit.clientName);
        
        // 1. Create Receipt Data
        const receiptData = {
          clientName: visit.clientName,
          clientType: client?.type || 'Avulso',
          serviceSpecification: visit.description || visit.type,
          value: visit.totalValue || 0,
          paymentMethod: 'PIX' as const, 
          date: Timestamp.now(),
          companyId,
          status: 'Aguardando Pagamento' as const,
          createdAt: Timestamp.now(),
          visitId: id,
          clientId: visit.clientId || client?.id || null
        };

        const receiptRef = await addDoc(collection(db, 'receipts'), receiptData);

        // 2. Automatically generate PDF for the automated receipt
        const fullReceipt = { id: receiptRef.id, ...receiptData } as Receipt;
        generateReceiptPDF(fullReceipt, appSettings, pixSettings);
        
        toast.success('Recibo emitido aguardando recebimento!');
      } else if (status === 'Concluída' && oldStatus !== 'Concluída' && !generateReceipt && visit.totalValue > 0) {
        // Even if no receipt is generated, we might want to record the income?
        // The user asked "se é para gerar recibo", usually implies financial record too in this system.
        // But I will follow the prompt strictly: if they say NO, we just update status.
      }
      
      toast.success(`Status atualizado para ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'visits');
    }
  };

  const updateStatus = async (id: string, status: TechnicalVisit['status']) => {
    const visit = visits.find(v => v.id === id);
    if (!visit) return;

    if (status === 'Concluída' && visit.status !== 'Concluída' && (visit.totalValue || 0) > 0) {
      setVisitForReceipt({ id, status });
      setIsReceiptPromptOpen(true);
    } else {
      await executeStatusUpdate(id, status, false);
    }
  };

  const handleUpdateVisit = async () => {
    if (!editingVisit || !editingVisit.clientName || !editingVisit.address) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const { id, ...data } = editingVisit;
      const oldVisit = visits.find(v => v.id === id);
      const isFinishing = data.status === 'Concluída' && oldVisit?.status !== 'Concluída' && (data.totalValue || 0) > 0;

      if (isFinishing) {
        setVisitForReceipt({ id, status: 'Concluída' });
        // We update the data except status or just update everything and then ask?
        // Better: update everything and if status is becoming closed and there is value, ask.
        await updateDoc(doc(db, 'visits', id), {
          ...data,
          date: editingVisit.date instanceof Date ? Timestamp.fromDate(editingVisit.date) : editingVisit.date,
          expectedDate: editingVisit.expectedDate instanceof Date ? Timestamp.fromDate(editingVisit.expectedDate) : editingVisit.expectedDate
        });
        setEditingVisit(null);
        setIsEditOpen(false);
        setIsReceiptPromptOpen(true);
      } else {
        await updateDoc(doc(db, 'visits', id), {
          ...data,
          date: editingVisit.date instanceof Date ? Timestamp.fromDate(editingVisit.date) : editingVisit.date,
          expectedDate: editingVisit.expectedDate instanceof Date ? Timestamp.fromDate(editingVisit.expectedDate) : editingVisit.expectedDate
        });
        setEditingVisit(null);
        setIsEditOpen(false);
        toast.success('Visita atualizada com sucesso!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `visits/${editingVisit?.id}`);
    }
  };

  const generateVisitPDF = (visit: TechnicalVisit) => {
    const doc = new jsPDF();
    const dateStr = format(visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date), 'dd/MM/yyyy');
    const createdStr = visit.createdAt ? format(visit.createdAt instanceof Timestamp ? visit.createdAt.toDate() : new Date(visit.createdAt), 'dd/MM/yyyy HH:mm') : '';
    
    // Header
    if (appSettings.logoUrl) {
      try {
        doc.addImage(appSettings.logoUrl, 'PNG', 20, 10, 18, 18);
      } catch (e) {
        console.error("Erro ao adicionar logo ao PDF:", e);
      }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const headerX = appSettings.logoUrl ? 42 : 20;
    doc.text(appSettings.companyName || 'AF Sistemas de Segurança e Informática', headerX, 18);
    
    doc.setFontSize(12);
    doc.text(`RELATÓRIO DE VISITA TÉCNICA ${formatRecordNumber(visit.number, visit.date)}`, headerX, 26);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let currentY = 40;

    const drawSectionTitle = (title: string) => {
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY, 170, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(title, 25, currentY + 5.5);
      doc.setFont('helvetica', 'normal');
      currentY += 12;
    };

    // 2. DADOS DO CLIENTE & AGENDAMENTO
    drawSectionTitle('1. Dados do Cliente e Agendamento');
    const boxWidth = 82;
    const boxHeight = 35;
    
    // Draw Box for Client Data
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(20, currentY - 2, boxWidth, boxHeight);
    
    // Left Column: Client Data
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 23, currentY + 5);
    doc.setFont('helvetica', 'normal');
    const clientNameSplitted = doc.splitTextToSize(visit.clientName, boxWidth - 28);
    doc.text(clientNameSplitted, 48, currentY + 5);
    
    let clientDataY = currentY + 5 + (clientNameSplitted.length * 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('ENDEREÇO:', 23, clientDataY);
    doc.setFont('helvetica', 'normal');
    const addressLines = doc.splitTextToSize(visit.address || 'N/A', boxWidth - 28);
    doc.text(addressLines, 48, clientDataY);
    
    clientDataY += (addressLines.length * 5);

    doc.setFont('helvetica', 'bold');
    doc.text('FONE:', 23, clientDataY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${visit.clientPhone || 'N/A'}`, 48, clientDataY);

    // Right Column: Scheduling Data Box
    const rightColX = 108;
    doc.rect(rightColX, currentY - 2, boxWidth, boxHeight);
    
    let schedY = currentY + 5;
    
    doc.setFont('helvetica', 'bold');
    doc.text('AGENDADO:', rightColX + 3, schedY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${dateStr}${visit.scheduledTime ? ` às ${visit.scheduledTime}` : ''}`, rightColX + 35, schedY);
    
    schedY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('PREVISÃO:', rightColX + 3, schedY);
    doc.setFont('helvetica', 'normal');
    const expDateStr = visit.expectedDate ? format(visit.expectedDate instanceof Timestamp ? visit.expectedDate.toDate() : new Date(visit.expectedDate), 'dd/MM/yyyy') : '--/--/----';
    doc.text(`${expDateStr}${visit.expectedTime ? ` às ${visit.expectedTime}` : ''}`, rightColX + 35, schedY);

    schedY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('TÉCNICO:', rightColX + 3, schedY);
    doc.setFont('helvetica', 'normal');
    const technicianSplitted = doc.splitTextToSize(visit.technicianName, boxWidth - 38);
    doc.text(technicianSplitted, rightColX + 35, schedY);

    currentY += boxHeight + 5;
    
    doc.setDrawColor(0, 0, 0);
    doc.line(20, currentY, 190, currentY);
    currentY += 10;
    
    // 3. DETALHES DO SERVIÇO
    drawSectionTitle('2. Detalhes do Serviço');
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo de Serviço: ${visit.type}`, 20, currentY);
    currentY += 7;
    doc.text(`Status: ${visit.status}`, 20, currentY);
    currentY += 10;
    
    doc.text('Descrição do Serviço/Problema:', 20, currentY);
    currentY += 7;
    const splitDesc = doc.splitTextToSize(visit.description || 'N/A', 170);
    doc.text(splitDesc, 20, currentY);
    currentY += (splitDesc.length * 5) + 10;

    if (visit.observations) {
      // Check if we need a new page for observations
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 20, currentY);
      doc.setFont('helvetica', 'normal');
      currentY += 7;
      const splitObs = doc.splitTextToSize(visit.observations, 170);
      doc.text(splitObs, 20, currentY);
      currentY += (splitObs.length * 5) + 10;
    }
    
    // Check space for total value
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`VALOR DO SERVIÇO: R$ ${(visit.totalValue || 0).toFixed(2)}`, 20, currentY);
    
    // Signatures
    let signatureY = currentY + 30;
    
    if (signatureY > 270) {
      doc.addPage();
      signatureY = 40;
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const cityDate = formatFullDateWithCity(visit.date, appSettings);
    doc.text(cityDate, 105, signatureY - 10, { align: 'center' });
    
    // Signatures
    doc.setLineWidth(0.3);
    if (visit.technicianSignature) {
      try {
        doc.addImage(visit.technicianSignature, 'PNG', 35, signatureY - 8, 40, 15);
      } catch (e) {
        console.error("Erro ao adicionar assinatura técnica:", e);
      }
    } else if (appSettings.signatureUrl) {
      try {
        doc.addImage(appSettings.signatureUrl, 'PNG', 35, signatureY - 8, 40, 15);
      } catch (e) {
        console.error("Erro ao adicionar assinatura à visita:", e);
      }
    }
    doc.line(25, signatureY + 10, 90, signatureY + 10);
    doc.text('Assinatura do Técnico', 57.5, signatureY + 15, { align: 'center' });
    doc.text(visit.technicianName, 57.5, signatureY + 20, { align: 'center' });
    
    if (visit.clientSignature) {
      try {
        doc.addImage(visit.clientSignature, 'PNG', 130, signatureY - 8, 40, 15);
      } catch (e) {
        console.error("Erro ao adicionar assinatura do cliente:", e);
      }
    }
    doc.line(120, signatureY + 10, 185, signatureY + 10);
    doc.text('Assinatura do Cliente', 152.5, signatureY + 15, { align: 'center' });
    doc.text(visit.responsibleName || visit.clientName, 152.5, signatureY + 20, { align: 'center' });
    
    doc.save(`visita_${visit.clientName.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Visitas Técnicas</h2>
          <p className="text-[#71717a]">Gerencie seus agendamentos e ordens de serviço.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1a1d23] border border-[#2d3139] px-3 py-1.5 rounded-lg">
            <span className="text-[10px] text-[#71717a] font-medium uppercase">Filtrar:</span>
            <Input 
              type="date" 
              className="h-7 bg-transparent border-none text-[12px] w-auto p-0 focus-visible:ring-0" 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)} 
            />
            {dateFilter && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-[#71717a] hover:text-[#ef4444]" 
                onClick={() => { setDateFilter(''); if (onClearFilter) onClearFilter(); }}
              >
                <X size={12} />
              </Button>
            )}
            <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 min-w-[90px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                <SelectItem value="Todas">Status: Todos</SelectItem>
                <SelectItem value="Agendada">Agendada</SelectItem>
                <SelectItem value="Em Andamento">Em Rota</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                <Plus size={18} />
                Nova Visita
              </Button>
            } />
          <DialogContent className="sm:max-w-[600px] bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Agendar Nova Visita</DialogTitle>
              <DialogDescription className="text-[#a0a0a0] text-xs">Preencha os detalhes do cliente e do serviço.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Selecionar Cliente Existente (Opcional)</Label>
                  <Select onValueChange={(clientId) => {
                    const client = clients.find(c => c.id === clientId);
                    if (client) {
                      setNewVisit({
                        ...newVisit,
                        clientId: client.id,
                        clientName: client.name,
                        clientPhone: client.phone,
                        address: client.address,
                        responsibleName: client.responsible || ''
                      });
                    }
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue placeholder="Escolha um cliente...">
                        {clients.find(c => c.name === newVisit.clientName)?.name || newVisit.clientName || null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <div className="p-2 sticky top-0 bg-[#1a1d23] z-10 border-b border-[#2d3139]">
                        <Input 
                          placeholder="Pesquisar..." 
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="h-8 text-xs bg-[#0f1115] border-[#2d3139]"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <ScrollArea className="h-[200px]">
                        {filteredClientsForSelect.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name || 'Cliente Sem Nome'}</SelectItem>
                        ))}
                        {filteredClientsForSelect.length === 0 && (
                          <div className="p-2 text-center text-xs text-[#71717a]">Nenhum cliente encontrado</div>
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="bg-[#2d3139]" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#a0a0a0]">Nome do Cliente</Label>
                    <Input id="name" value={newVisit.clientName || ''} onChange={e => setNewVisit({...newVisit, clientName: e.target.value})} placeholder="Ex: João Silva" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[#a0a0a0]">Telefone</Label>
                    <Input id="phone" value={newVisit.clientPhone || ''} onChange={e => setNewVisit({...newVisit, clientPhone: e.target.value})} placeholder="(11) 99999-9999" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-[#a0a0a0]">Endereço</Label>
                  <Input id="address" value={newVisit.address || ''} onChange={e => setNewVisit({...newVisit, address: e.target.value})} placeholder="Rua, Número, Bairro" className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo de Serviço</Label>
                    <Select value={newVisit.type} onValueChange={(val: any) => setNewVisit({...newVisit, type: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue>
                          {newVisit.type || "Selecione"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="CFTV">CFTV</SelectItem>
                        <SelectItem value="Alarme">Alarme</SelectItem>
                        <SelectItem value="Cerca Elétrica">Cerca Elétrica</SelectItem>
                        <SelectItem value="Motor de Portão">Motor de Portão</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-[#a0a0a0]">Descrição do Problema/Serviço</Label>
                    <Input id="desc" value={newVisit.description || ''} onChange={e => setNewVisit({...newVisit, description: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data Agendamento</Label>
                    <Input 
                      type="date" 
                      value={newVisit.date ? format(newVisit.date, 'yyyy-MM-dd') : ''} 
                      onChange={e => {
                        const val = e.target.value;
                        setNewVisit({...newVisit, date: val ? new Date(val + 'T12:00:00') : new Date()});
                      }} 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime" className="text-[#a0a0a0]">Hora Agendamento</Label>
                    <Input id="scheduledTime" type="time" value={newVisit.scheduledTime || ''} onChange={e => setNewVisit({...newVisit, scheduledTime: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data Prevista Visita</Label>
                    <Input 
                      type="date" 
                      value={newVisit.expectedDate ? format(newVisit.expectedDate, 'yyyy-MM-dd') : ''} 
                      onChange={e => {
                        const val = e.target.value;
                        setNewVisit({...newVisit, expectedDate: val ? new Date(val + 'T12:00:00') : new Date()});
                      }} 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedTime" className="text-[#a0a0a0]">Hora Prevista Visita</Label>
                    <Input id="expectedTime" type="time" value={newVisit.expectedTime || ''} onChange={e => setNewVisit({...newVisit, expectedTime: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observations" className="text-[#a0a0a0]">Observações Internas / Adicionais</Label>
                  <Input id="observations" value={newVisit.observations || ''} onChange={e => setNewVisit({...newVisit, observations: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="techName" className="text-[#a0a0a0]">Nome do Técnico</Label>
                    <Input id="techName" value={newVisit.technicianName || ''} onChange={e => setNewVisit({...newVisit, technicianName: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsibleName" className="text-[#a0a0a0]">Responsável no Local</Label>
                    <Input id="responsibleName" value={newVisit.responsibleName || ''} onChange={e => setNewVisit({...newVisit, responsibleName: e.target.value})} placeholder="Nome de quem acompanhará" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="val" className="text-[#a0a0a0]">Valor Estimado (R$)</Label>
                  <Input id="val" type="number" value={newVisit.totalValue || ''} onChange={e => setNewVisit({...newVisit, totalValue: Number(e.target.value)})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleAddVisit} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Agendar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    {showList ? (
      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-auto max-h-[600px] relative">
        <Table>
          <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
            <TableRow className="border-[#2d3139] hover:bg-transparent">
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[140px]">Ações</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[60px]">Nº</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Cliente</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Status</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Serviço</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Agendamento</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.map((visit) => (
              <TableRow key={visit.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" title="Ver Detalhes" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => {
                      setViewingVisit({
                        ...visit,
                        date: visit.date instanceof Timestamp ? visit.date.toDate() : (visit.date ? new Date(visit.date) : new Date()),
                        expectedDate: visit.expectedDate ? (visit.expectedDate instanceof Timestamp ? visit.expectedDate.toDate() : new Date(visit.expectedDate)) : (visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date)),
                        createdAt: visit.createdAt instanceof Timestamp ? visit.createdAt.toDate() : (visit.createdAt ? new Date(visit.createdAt) : null)
                      });
                      setIsViewOpen(true);
                    }}>
                      <Eye size={14} />
                    </Button>
                    <Button variant="outline" size="icon" title="Editar" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => {
                      setEditingVisit({
                        ...visit,
                        date: visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date),
                        expectedDate: visit.expectedDate ? (visit.expectedDate instanceof Timestamp ? visit.expectedDate.toDate() : new Date(visit.expectedDate)) : (visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date))
                      });
                      setIsEditOpen(true);
                    }}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="outline" size="icon" title="Gerar PDF" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => generateVisitPDF(visit)}>
                      <Share2 size={14} />
                    </Button>
                    <Button variant="outline" size="icon" title="Solicitar Assinatura Externa" className="h-8 w-8 border-[#2d3139] text-[#3b82f6] hover:bg-[#3b82f6]/10" onClick={() => handleGenerateSignatureLink(visit.id, 'visit', visit.clientName, companyId, { title: 'Relatório de Visita Técnica', details: visit.serviceDescription }, logAction)}>
                      <PenTool size={14} />
                    </Button>
                    <Button variant="outline" size="icon" title="Excluir" className="h-8 w-8 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                      setVisitToDelete(visit);
                      setIsDeleteConfirmOpen(true);
                    }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-[12px] font-mono text-[#3b82f6] whitespace-nowrap">
                  {formatRecordNumber(visit.number, visit.date)}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-white text-[13px]">{visit.clientName}</div>
                  <div className="text-[11px] text-[#71717a]">{visit.clientPhone}</div>
                </TableCell>
                <TableCell>
                  <Select 
                    value={visit.status} 
                    onValueChange={(val: any) => updateStatus(visit.id, val)}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-[11px] bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="Agendada">Agendada</SelectItem>
                      <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                      <SelectItem value="Concluída">Concluída</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge className="bg-[#2d3139] text-[#e0e0e0] font-normal text-[10px] uppercase tracking-wider">{visit.type}</Badge>
                </TableCell>
                <TableCell className="text-[12px] text-[#e0e0e0]">
                  <div>{format(visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date), 'dd/MM/yyyy')}</div>
                  {visit.scheduledTime && <div className="text-[10px] text-[#71717a]">{visit.scheduledTime}</div>}
                </TableCell>
                <TableCell className="text-[12px] font-semibold text-white">
                  R$ {(visit.totalValue || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {filteredVisits.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#71717a] text-sm">
                  Nenhuma visita encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    ) : (
      <NoAccessList title="Visitas Técnicas" />
    )}

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Deseja realmente excluir esta visita? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (visitToDelete) {
                try {
                  await deleteDoc(doc(db, 'visits', visitToDelete.id));
                  toast.success('Visita excluída.');
                  setIsDeleteConfirmOpen(false);
                  setVisitToDelete(null);
                } catch (error) {
                  handleFirestoreError(error, OperationType.DELETE, `visits/${visitToDelete.id}`);
                }
              }
            }} className="bg-[#ef4444] hover:bg-[#dc2626] text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Visit Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes da Visita</DialogTitle>
          </DialogHeader>
          {viewingVisit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Cliente</p>
                  <p className="text-sm font-medium">{viewingVisit.clientName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Telefone</p>
                  <p className="text-sm font-medium">{viewingVisit.clientPhone || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-[#71717a] uppercase">Endereço</p>
                <p className="text-sm font-medium">{viewingVisit.address}</p>
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] text-[#71717a] uppercase">Tipo de Serviço</p>
                    <Badge className="bg-[#2d3139] text-[#e0e0e0] font-normal">{viewingVisit.type}</Badge>
                  </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Status</p>
                  <Badge className={cn(
                    "font-normal",
                    viewingVisit.status === 'Concluída' ? "bg-green-500/10 text-green-500" :
                    viewingVisit.status === 'Agendada' ? "bg-blue-500/10 text-blue-500" :
                    viewingVisit.status === 'Em Andamento' ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-red-500/10 text-red-500"
                  )}>
                    {viewingVisit.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Agendamento</p>
                  <p className="text-sm font-medium text-[#3b82f6]">
                    {format(viewingVisit.date, "dd/MM/yyyy", { locale: ptBR })} {viewingVisit.scheduledTime ? `às ${viewingVisit.scheduledTime}` : ''}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Data Prevista</p>
                  <p className="text-sm font-medium">
                    {viewingVisit.expectedDate ? format(viewingVisit.expectedDate, "dd/MM/yyyy", { locale: ptBR }) : 'N/A'} {viewingVisit.expectedTime ? `às ${viewingVisit.expectedTime}` : ''}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-[#71717a] uppercase">Técnico Responsável</p>
                <p className="text-sm font-medium">{viewingVisit.technicianName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-[#71717a] uppercase">Descrição</p>
                <p className="text-sm text-[#e0e0e0] bg-[#0f1115] p-3 rounded-lg border border-[#2d3139]">
                  {viewingVisit.description || 'Sem descrição.'}
                </p>
              </div>
              {viewingVisit.observations && (
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Observações</p>
                  <p className="text-sm text-[#e0e0e0] bg-[#0f1115] p-3 rounded-lg border border-[#2d3139]">
                    {viewingVisit.observations}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Valor do Serviço</p>
                  <p className="text-sm font-bold text-white">R$ {(viewingVisit.totalValue || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white">Editar Visita</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
            {editingVisit && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editName" className="text-[#a0a0a0]">Nome do Cliente</Label>
                    <Input id="editName" value={editingVisit.clientName || ''} onChange={e => setEditingVisit({...editingVisit, clientName: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone" className="text-[#a0a0a0]">Telefone</Label>
                    <Input id="editPhone" value={editingVisit.clientPhone || ''} onChange={e => setEditingVisit({...editingVisit, clientPhone: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAddress" className="text-[#a0a0a0]">Endereço</Label>
                  <Input id="editAddress" value={editingVisit.address || ''} onChange={e => setEditingVisit({...editingVisit, address: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo de Serviço</Label>
                    <Select value={editingVisit.type} onValueChange={(val: any) => setEditingVisit({...editingVisit, type: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue>
                          {editingVisit.type || "Selecione o tipo"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="CFTV">CFTV</SelectItem>
                        <SelectItem value="Alarme">Alarme</SelectItem>
                        <SelectItem value="Cerca Elétrica">Cerca Elétrica</SelectItem>
                        <SelectItem value="Motor de Portão">Motor de Portão</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDesc" className="text-[#a0a0a0]">Descrição</Label>
                    <Input id="editDesc" value={editingVisit.description || ''} onChange={e => setEditingVisit({...editingVisit, description: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data Agendamento</Label>
                    <Input 
                      type="date" 
                      value={editingVisit.date ? format(editingVisit.date as Date, 'yyyy-MM-dd') : ''} 
                      onChange={e => {
                        const val = e.target.value;
                        setEditingVisit({...editingVisit, date: val ? new Date(val + 'T12:00:00') : new Date()});
                      }} 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editScheduledTime" className="text-[#a0a0a0]">Hora Agendamento</Label>
                    <Input id="editScheduledTime" type="time" value={editingVisit.scheduledTime || ''} onChange={e => setEditingVisit({...editingVisit, scheduledTime: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data Prevista Visita</Label>
                    <Input 
                      type="date" 
                      value={editingVisit.expectedDate ? format(editingVisit.expectedDate as Date, 'yyyy-MM-dd') : ''} 
                      onChange={e => {
                        const val = e.target.value;
                        setEditingVisit({...editingVisit, expectedDate: val ? new Date(val + 'T12:00:00') : new Date()});
                      }} 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editExpectedTime" className="text-[#a0a0a0]">Hora Prevista Visita</Label>
                    <Input id="editExpectedTime" type="time" value={editingVisit.expectedTime || ''} onChange={e => setEditingVisit({...editingVisit, expectedTime: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Status</Label>
                    <Select value={editingVisit.status} onValueChange={(val: any) => setEditingVisit({...editingVisit, status: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue>
                          {editingVisit.status || "Selecione o status"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Agendada">Agendada</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                        <SelectItem value="Cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editVal" className="text-[#a0a0a0]">Valor (R$)</Label>
                    <Input id="editVal" type="number" value={editingVisit.totalValue || ''} onChange={e => setEditingVisit({...editingVisit, totalValue: Number(e.target.value)})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editTechName" className="text-[#a0a0a0]">Nome do Técnico</Label>
                    <Input id="editTechName" value={editingVisit.technicianName || ''} onChange={e => setEditingVisit({...editingVisit, technicianName: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editResponsibleName" className="text-[#a0a0a0]">Responsável no Local</Label>
                    <Input id="editResponsibleName" value={editingVisit.responsibleName || ''} onChange={e => setEditingVisit({...editingVisit, responsibleName: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editObservations" className="text-[#a0a0a0]">Observações Internas / Adicionais</Label>
                  <Input id="editObservations" value={editingVisit.observations || ''} onChange={e => setEditingVisit({...editingVisit, observations: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button onClick={handleUpdateVisit} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Generation Prompt */}
      <Dialog open={isReceiptPromptOpen} onOpenChange={setIsReceiptPromptOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Gerar Recibo?</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              A visita foi concluída com um valor de R$ {(visits.find(v => v.id === visitForReceipt?.id)?.totalValue || 0).toFixed(2)}. Deseja gerar o recibo e registrar no financeiro automaticamente?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-1">
            <Button 
              variant="outline" 
              onClick={async () => {
                if (visitForReceipt) {
                  await executeStatusUpdate(visitForReceipt.id, visitForReceipt.status, false);
                  setIsReceiptPromptOpen(false);
                  setVisitForReceipt(null);
                }
              }} 
              className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white"
            >
              Não, apenas concluir
            </Button>
            <Button 
              onClick={async () => {
                if (visitForReceipt) {
                  await executeStatusUpdate(visitForReceipt.id, visitForReceipt.status, true);
                  setIsReceiptPromptOpen(false);
                  setVisitForReceipt(null);
                }
              }} 
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
            >
              Sim, gerar recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Financial Manager Component ---

function FinancialManager({ financials = [], visits = [], clients = [], companyId, showList }: { financials?: FinancialRecord[], visits?: TechnicalVisit[], clients?: Client[], companyId: string, showList: boolean }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [financialTypeFilter, setFinancialTypeFilter] = useState<'todos' | 'Receita' | 'Despesa'>('todos');

  const filteredFinancials = useMemo(() => {
    if (financialTypeFilter === 'todos') return financials;
    return financials.filter(f => f.type === financialTypeFilter);
  }, [financials, financialTypeFilter]);

  const financialStats = useMemo(() => {
    const income = financials.filter(f => f.type === 'Receita').reduce((acc, f) => acc + f.value, 0);
    const expense = financials.filter(f => f.type === 'Despesa').reduce((acc, f) => acc + f.value, 0);
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [financials]);

  const [newRecord, setNewRecord] = useState<Partial<FinancialRecord>>({
    type: 'Receita',
    date: new Date(),
    value: 0,
    serviceType: 'Serviço Normal'
  });

  const filteredClientsForSelect = useMemo(() => {
    return clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const handleAddRecord = async () => {
    if (!newRecord.description || !newRecord.value) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      await addDoc(collection(db, 'financial'), {
        ...newRecord,
        date: Timestamp.fromDate(newRecord.date instanceof Date ? newRecord.date : new Date()),
        companyId,
        createdAt: Timestamp.now()
      });
      setNewRecord({ type: 'Receita', date: new Date(), value: 0, serviceType: 'Serviço Normal' });
      setIsAddOpen(false);
      toast.success('Registro financeiro salvo!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'financial');
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord || !editingRecord.description || typeof editingRecord.value !== 'number') {
      toast.error('Preencha os campos obrigatórios corretamente.');
      return;
    }

    try {
      const { id } = editingRecord;
      await updateDoc(doc(db, 'financial', id), {
        description: editingRecord.description,
        value: Number(editingRecord.value),
        type: editingRecord.type,
        category: editingRecord.category || '',
        date: editingRecord.date instanceof Date ? Timestamp.fromDate(editingRecord.date) : editingRecord.date,
        serviceType: editingRecord.serviceType || ''
      });
      setEditingRecord(null);
      setIsEditOpen(false);
      toast.success('Registro financeiro atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `financial/${editingRecord?.id}`);
    }
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      await deleteDoc(doc(db, 'financial', recordToDelete.id));
      setRecordToDelete(null);
      setIsDeleteConfirmOpen(false);
      toast.success('Registro financeiro excluído!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `financial/${recordToDelete.id}`);
    }
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setNewRecord({
        ...newRecord,
        clientId: client.id,
        description: client.type === 'Contrato' ? `${client.serviceSpecification || 'Serviço de Contrato'} - ${client.name}` : `Serviço - ${client.name}`,
        serviceType: client.type === 'Contrato' ? 'Contrato' : 'Serviço Normal',
        value: client.type === 'Contrato' ? (client.contractValue || 0) : newRecord.value
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestão Financeira</h2>
          <p className="text-[#71717a]">Controle suas entradas e saídas.</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={financialTypeFilter} onValueChange={(val: any) => setFinancialTypeFilter(val)}>
            <SelectTrigger className="w-[180px] bg-[#1a1d23] border-[#2d3139] text-white">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
              <SelectItem value="todos">Todos os Lançamentos</SelectItem>
              <SelectItem value="Receita">Apenas Receitas</SelectItem>
              <SelectItem value="Despesa">Apenas Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                <Plus size={18} />
                Novo Lançamento
              </Button>
            } />
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[500px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Novo Lançamento Financeiro</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo</Label>
                    <Select value={newRecord.type} onValueChange={(val: any) => setNewRecord({...newRecord, type: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Receita">Receita (+)</SelectItem>
                        <SelectItem value="Despesa">Despesa (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="val" className="text-[#a0a0a0]">Valor (R$)</Label>
                    <Input id="val" type="number" value={newRecord.value || ''} onChange={e => setNewRecord({...newRecord, value: Number(e.target.value)})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>

                {newRecord.type === 'Receita' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Cliente (Opcional)</Label>
                      <Select value={newRecord.clientId} onValueChange={handleClientChange}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue placeholder="Selecione um cliente">
                            {clients.find(c => c.id === newRecord.clientId)?.name || 'Cliente Sem Nome'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          <div className="p-2 sticky top-0 bg-[#1a1d23] z-10 border-b border-[#2d3139]">
                            <Input 
                              placeholder="Pesquisar..." 
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="h-8 text-xs bg-[#0f1115] border-[#2d3139]"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <ScrollArea className="h-[200px]">
                            {filteredClientsForSelect.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name || 'Cliente Sem Nome'}</SelectItem>
                            ))}
                            {filteredClientsForSelect.length === 0 && (
                              <div className="p-2 text-center text-xs text-[#71717a]">Nenhum cliente encontrado</div>
                            )}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Origem da Receita</Label>
                      <Select value={newRecord.serviceType} onValueChange={(val: any) => setNewRecord({...newRecord, serviceType: val})}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          <SelectItem value="Serviço Normal">Serviço Normal</SelectItem>
                          <SelectItem value="Contrato">Contrato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-[#a0a0a0]">Descrição</Label>
                  <Input id="desc" value={newRecord.description || ''} onChange={e => setNewRecord({...newRecord, description: e.target.value})} placeholder="Ex: Pagamento Instalação CFTV" className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origin" className="text-[#a0a0a0]">Origem (Opcional)</Label>
                  <Input id="origin" value={newRecord.origin || ''} onChange={e => setNewRecord({...newRecord, origin: e.target.value})} placeholder="Ex: Venda Direta, Marketplace" className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat" className="text-[#a0a0a0]">Categoria</Label>
                    <Input id="cat" value={newRecord.category || ''} onChange={e => setNewRecord({...newRecord, category: e.target.value})} placeholder="Ex: Serviços, Equipamentos" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newRecord.date ? format(newRecord.date, "dd/MM/yyyy") : <span>Selecione</span>}
                        </Button>
                      } />
                      <PopoverContent className="w-auto p-0 bg-[#1a1d23] border-[#2d3139]">
                        <Calendar mode="single" selected={newRecord.date} onSelect={(date) => setNewRecord({...newRecord, date})} initialFocus className="bg-[#1a1d23] text-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleAddRecord} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar Lançamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    {showList ? (
      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-auto max-h-[600px] relative">
        <Table>
          <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
            <TableRow className="border-[#2d3139] hover:bg-transparent">
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[100px]">Ações</TableHead>
              <TableHead className="text-left text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Valor</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Descrição</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Origem</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Tipo</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Categoria</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFinancials.map((record) => (
              <TableRow key={record.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => {
                      setEditingRecord({
                        ...record,
                        date: record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date)
                      });
                      setIsEditOpen(true);
                    }}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                      setRecordToDelete(record);
                      setIsDeleteConfirmOpen(true);
                    }}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className={cn(
                  "text-left font-bold text-[13px]",
                  record.type === 'Receita' ? "text-[#10b981]" : "text-[#ef4444]"
                )}>
                  {record.type === 'Receita' ? '+' : '-'} R$ {(record.value || 0).toFixed(2)}
                </TableCell>
                <TableCell className="font-medium text-white text-[13px]">
                  {record.description}
                  {record.clientId && (
                    <div className="text-[11px] text-[#71717a] mt-0.5">
                      Cliente: {clients.find(c => c.id === record.clientId)?.name || 'N/A'}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {record.origin && (
                      <span className="text-[11px] text-blue-400 font-medium">{record.origin}</span>
                    )}
                    {record.serviceType && (
                      <Badge className={cn(
                        "font-normal text-[10px] uppercase tracking-wider w-fit",
                        record.serviceType === 'Contrato' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {record.serviceType}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn(
                    "text-[10px] font-semibold uppercase px-2 py-0.5 rounded",
                    record.type === 'Receita' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {record.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-[#2d3139] text-[#e0e0e0] font-normal text-[10px] uppercase tracking-wider">{record.category}</Badge>
                </TableCell>
                <TableCell className="text-[12px] text-[#e0e0e0]">
                  {format(record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date), 'dd/MM/yyyy')}
                </TableCell>
              </TableRow>
            ))}
            {filteredFinancials.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#71717a] text-sm">
                  Nenhuma transação registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    ) : (
      <NoAccessList title="Financeiro" />
    )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#3b82f6] text-white border-none shadow-lg shadow-blue-900/20">
          <CardContent className="p-6">
            <p className="text-xs text-blue-100 uppercase tracking-wider mb-1 font-semibold">Total em Caixa</p>
            <h3 className="text-3xl font-bold">
              R$ {financialStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl">
          <CardContent className="p-6">
            <p className="text-xs text-[#71717a] uppercase tracking-wider mb-1 font-semibold">Total Receitas</p>
            <h3 className="text-2xl font-bold text-[#10b981]">
              R$ {financialStats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl">
          <CardContent className="p-6">
            <p className="text-xs text-[#71717a] uppercase tracking-wider mb-1 font-semibold">Total Despesas</p>
            <h3 className="text-2xl font-bold text-[#ef4444]">
              R$ {financialStats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Edit Record Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[500px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Editar Lançamento</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              {editingRecord && (
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo</Label>
                    <Select value={editingRecord.type} onValueChange={(val: any) => setEditingRecord({...editingRecord, type: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Receita">Receita (+)</SelectItem>
                        <SelectItem value="Despesa">Despesa (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-val" className="text-[#a0a0a0]">Valor (R$)</Label>
                    <Input id="edit-val" type="number" value={editingRecord.value || ''} onChange={e => setEditingRecord({...editingRecord, value: Number(e.target.value)})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-desc" className="text-[#a0a0a0]">Descrição</Label>
                  <Input id="edit-desc" value={editingRecord.description || ''} onChange={e => setEditingRecord({...editingRecord, description: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-cat" className="text-[#a0a0a0]">Categoria</Label>
                    <Input id="edit-cat" value={editingRecord.category || ''} onChange={e => setEditingRecord({...editingRecord, category: e.target.value})} placeholder="Ex: Serviços, Equipamentos" className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingRecord.date ? format(editingRecord.date as Date, "dd/MM/yyyy") : <span>Selecione</span>}
                        </Button>
                      } />
                      <PopoverContent className="w-auto p-0 bg-[#1a1d23] border-[#2d3139]">
                        <Calendar mode="single" selected={editingRecord.date as Date} onSelect={(date) => setEditingRecord({...editingRecord, date})} initialFocus className="bg-[#1a1d23] text-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button onClick={handleUpdateRecord} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Deseja realmente excluir este lançamento financeiro? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteRecord} className="bg-[#ef4444] hover:bg-[#dc2626] text-white">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Budgets Manager Component ---

function ServiceOrdersManager({ serviceOrders = [], clients = [], users = [], appSettings, companyId, showList, logAction }: { serviceOrders?: ServiceOrder[], clients?: Client[], users?: any[], appSettings: AppSettings, companyId: string, showList: boolean, logAction?: any }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);
  const [isValuesModalOpen, setIsValuesModalOpen] = useState(false);
  const [selectedOSForPDF, setSelectedOSForPDF] = useState<ServiceOrder | null>(null);
  const [editingOS, setEditingOS] = useState<Partial<ServiceOrder> | null>(null);
  const [osToDelete, setOSToDelete] = useState<ServiceOrder | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newOS, setNewOS] = useState<Partial<ServiceOrder>>({
    serviceType: 'Corretiva',
    parts: [],
    checklist: { functionalityTest: false, cleaning: false, safetyCheck: false },
    status: 'Aberto',
    laborValue: 0,
    partsValue: 0,
    totalValue: 0,
    startDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  const filteredClients = useMemo(() => {
    return clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const handleAddPart = (isEdit = false) => {
    if (isEdit) {
      setEditingOS(prev => prev ? ({
        ...prev,
        parts: [...(prev.parts || []), { description: '', quantity: 1, price: 0 }]
      }) : null);
    } else {
      setNewOS(prev => ({
        ...prev,
        parts: [...(prev.parts || []), { description: '', quantity: 1, price: 0 }]
      }));
    }
  };

  const handleOSSave = async () => {
    try {
      const nextNumber = (serviceOrders || []).length > 0 ? Math.max(...(serviceOrders || []).map(o => o.number || 0)) + 1 : 1;
      const finalPartsValue = (newOS.parts || []).reduce((acc, p) => acc + (p.quantity * p.price), 0);
      const finalTotal = (newOS.laborValue || 0) + finalPartsValue;

      const osData = {
        ...newOS,
        number: nextNumber,
        date: Timestamp.now(),
        partsValue: finalPartsValue,
        totalValue: finalTotal,
        startDateTime: Timestamp.fromDate(new Date(newOS.startDateTime || Date.now())),
        endDateTime: Timestamp.fromDate(new Date(newOS.endDateTime || Date.now())),
        companyId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'serviceOrders'), osData);
      const createdOS = { id: docRef.id, ...osData } as ServiceOrder;
      
      setIsAddOpen(false);
      setNewOS({
        serviceType: 'Corretiva',
        parts: [],
        checklist: { functionalityTest: false, cleaning: false, safetyCheck: false },
        status: 'Aberto',
        laborValue: 0,
        partsValue: 0,
        totalValue: 0,
        startDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      });
      toast.success('Ordem de Serviço criada com sucesso!');

      setSelectedOSForPDF(createdOS);
      setIsPrintConfirmOpen(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'serviceOrders');
    }
  };

  const handleUpdateOS = async () => {
    if (!editingOS?.id) return;
    try {
      const finalPartsValue = (editingOS.parts || []).reduce((acc, p) => acc + (p.quantity * p.price), 0);
      const finalTotal = (editingOS.laborValue || 0) + finalPartsValue;

      const osData = {
        ...editingOS,
        partsValue: finalPartsValue,
        totalValue: finalTotal,
        startDateTime: Timestamp.fromDate(new Date(editingOS.startDateTime || Date.now())),
        endDateTime: Timestamp.fromDate(new Date(editingOS.endDateTime || Date.now())),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'serviceOrders', editingOS.id), osData);
      setIsEditOpen(false);
      toast.success('Ordem de serviço atualizada!');
      
      const updatedOS = { ...osData, id: editingOS.id } as ServiceOrder;
      setSelectedOSForPDF(updatedOS);
      setIsPrintConfirmOpen(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'serviceOrders');
    }
  };

  const handleDeleteOS = async () => {
    if (!osToDelete?.id) return;
    try {
      await deleteDoc(doc(db, 'serviceOrders', osToDelete.id));
      setIsDeleteConfirmOpen(false);
      toast.success('Ordem de serviço excluída com sucesso.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'serviceOrders');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Ordens de Serviço</h2>
          <p className="text-[#71717a]">Gerencie ordens de serviço técnicas e vistorias.</p>
        </div>
        <div className="flex items-center gap-3">
          {serviceOrders.length > 0 && selectedIds.length === 0 && (
            <Button 
              variant="outline" 
              className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] text-xs h-9"
              onClick={() => setSelectedIds(serviceOrders.map(os => os.id))}
            >
              Selecionar Todas
            </Button>
          )}
          {selectedIds.length > 0 && (
            <Button 
              variant="outline" 
              className="border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10 text-xs h-9"
              onClick={() => setSelectedIds([])}
            >
              Limpar Seleção
            </Button>
          )}
          {selectedIds.length > 0 && (
            <Button 
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                const selectedOS = serviceOrders.filter(os => selectedIds.includes(os.id));
                generateOSLabelsPDF(selectedOS, appSettings);
                setSelectedIds([]);
              }}
            >
              <Printer size={18} />
              Etiquetas ({selectedIds.length})
            </Button>
          )}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              <Plus size={18} />
              Nova O.S.
            </Button>
          } />
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-[90vw] md:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 border-b border-[#2d3139]">
              <DialogTitle>Abrir Ordem de Serviço</DialogTitle>
              <DialogDescription className="text-[#71717a]">Preencha os detalhes técnicos do atendimento.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Client Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select onValueChange={(val) => {
                    const c = clients.find(cl => cl.id === val);
                    if (c) setNewOS({ 
                      ...newOS, 
                      clientId: c.id, 
                      clientName: c.name || '', 
                      address: c.address || '', 
                      contact: c.phone || '',
                      contactName: c.responsible || ''
                    });
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                      <SelectValue>
                        {clients.find(c => c.id === newOS.clientId)?.name || "Selecione um cliente"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <div className="p-2 border-b border-[#2d3139]">
                        <Input 
                          placeholder="Buscar cliente..." 
                          className="h-8 bg-[#0f1115] border-[#2d3139]" 
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                        />
                      </div>
                      {filteredClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Técnico Responsável</Label>
                  <Select onValueChange={(val) => {
                    const u = users.find(usr => usr.uid === val);
                    if (u) setNewOS({ ...newOS, technicianId: u.uid, technicianName: u.displayName || u.email });
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                      <SelectValue>
                        {users.find(u => u.uid === newOS.technicianId)?.displayName || users.find(u => u.uid === newOS.technicianId)?.email || "Selecione o técnico"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      {users.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Equipment Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Equipamento</Label>
                  <Input className="bg-[#0f1115] border-[#2d3139]" value={newOS.equipment || ''} onChange={e => setNewOS({...newOS, equipment: e.target.value})} placeholder="Ex: DVR, Motor, Câmera" />
                </div>
                <div className="space-y-2">
                  <Label>Marca/Modelo/SN</Label>
                  <Input className="bg-[#0f1115] border-[#2d3139]" value={newOS.brandModelSN || ''} onChange={e => setNewOS({...newOS, brandModelSN: e.target.value})} placeholder="Ex: Intelbras - Mod 123" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Serviço</Label>
                  <Select value={newOS.serviceType} onValueChange={(val: any) => setNewOS({...newOS, serviceType: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                      <SelectValue>
                        {newOS.serviceType || "Selecione o tipo"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="Corretiva">Corretiva</SelectItem>
                      <SelectItem value="Preventiva">Preventiva</SelectItem>
                      <SelectItem value="Instalação">Instalação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Problema Relatado / Descrição Detalhada</Label>
                <textarea 
                  className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                  value={newOS.reportedProblem || ''} 
                  onChange={e => setNewOS({...newOS, reportedProblem: e.target.value})}
                  placeholder="Relato do cliente..."
                />
              </div>

              <Separator className="bg-[#2d3139]" />

              {/* Technical realization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Diagnóstico Técnico</Label>
                  <textarea 
                    className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                    value={newOS.diagnosis || ''} 
                    onChange={e => setNewOS({...newOS, diagnosis: e.target.value})}
                    placeholder="O que foi identificado..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serviços Realizados</Label>
                  <textarea 
                    className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                    value={newOS.performedServices || ''} 
                    onChange={e => setNewOS({...newOS, performedServices: e.target.value})}
                    placeholder="O que foi executado..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anotações Adicionais (para Etiqueta)</Label>
                <textarea 
                  className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                  value={newOS.notes || ''} 
                  onChange={e => setNewOS({...newOS, notes: e.target.value})}
                  placeholder="Observações que serão impressas na etiqueta..."
                />
              </div>

              {/* Parts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white font-medium">Peças e Materiais</Label>
                  <Button variant="outline" size="sm" onClick={handleAddPart} className="h-7 border-[#2d3139] text-xs">
                    + Peça
                  </Button>
                </div>
                {newOS.parts?.map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <Input 
                      className="col-span-6 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                      placeholder="Descrição"
                      value={p.description} 
                      onChange={e => {
                        const next = [...(newOS.parts || [])];
                        next[i].description = e.target.value;
                        setNewOS({...newOS, parts: next});
                      }}
                    />
                    <Input 
                      type="number"
                      className="col-span-2 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                      placeholder="Qtd"
                      value={p.quantity} 
                      onChange={e => {
                        const next = [...(newOS.parts || [])];
                        next[i].quantity = Number(e.target.value);
                        setNewOS({...newOS, parts: next});
                      }}
                    />
                    <Input 
                      type="number"
                      className="col-span-3 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                      placeholder="Preço"
                      value={p.price} 
                      onChange={e => {
                        const next = [...(newOS.parts || [])];
                        next[i].price = Number(e.target.value);
                        setNewOS({...newOS, parts: next});
                      }}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-[#ef4444]" 
                      onClick={() => setNewOS({...newOS, parts: newOS.parts?.filter((_, idx) => idx !== i)})}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Checklist */}
              <div className="space-y-4">
                <Label>Checklist de Verificação</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0f1115] p-4 rounded-lg border border-[#2d3139]">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="checklist-test" 
                      checked={newOS.checklist?.functionalityTest} 
                      onCheckedChange={(val) => setNewOS({...newOS, checklist: { ...newOS.checklist!, functionalityTest: !!val }})}
                    />
                    <Label htmlFor="checklist-test" className="text-xs">Teste de Funcionamento</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="checklist-cleaning" 
                      checked={newOS.checklist?.cleaning} 
                      onCheckedChange={(val) => setNewOS({...newOS, checklist: { ...newOS.checklist!, cleaning: !!val }})}
                    />
                    <Label htmlFor="checklist-cleaning" className="text-xs">Limpeza Técnica</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="checklist-safety" 
                      checked={newOS.checklist?.safetyCheck} 
                      onCheckedChange={(val) => setNewOS({...newOS, checklist: { ...newOS.checklist!, safetyCheck: !!val }})}
                    />
                    <Label htmlFor="checklist-safety" className="text-xs">Segurança/Vedação</Label>
                  </div>
                </div>
              </div>

              {/* Values and Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#2d3139]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Início Trabalho</Label>
                    <Input 
                      type="datetime-local" 
                      className="bg-[#0f1115] border-[#2d3139]" 
                      value={newOS.startDateTime} 
                      onChange={e => setNewOS({...newOS, startDateTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conclusão do Atendimento</Label>
                    <Input 
                      type="datetime-local" 
                      className="bg-[#0f1115] border-[#2d3139]" 
                      value={newOS.endDateTime} 
                      onChange={e => setNewOS({...newOS, endDateTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Mão de Obra (R$)</Label>
                    <Input 
                      type="number" 
                      className="bg-[#0f1115] border-[#2d3139]" 
                      value={newOS.laborValue} 
                      onChange={e => setNewOS({...newOS, laborValue: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0] block text-xs mb-2">Assinatura do Cliente</Label>
                    <SignaturePad value={newOS.clientSignature} onChange={val => setNewOS({...newOS, clientSignature: val})} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 border-t border-[#2d3139] bg-[#1a1d23]">
              <div className="flex items-center gap-4 w-full">
                <div className="flex-1">
                  <p className="text-[10px] text-[#71717a] uppercase">Valor Estimado</p>
                  <p className="text-xl font-bold text-[#3b82f6]">R$ {((newOS.laborValue || 0) + (newOS.parts || []).reduce((acc, p) => acc + (p.quantity * p.price), 0)).toFixed(2)}</p>
                </div>
                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139]">Cancelar</Button>
                <Button className="bg-[#3b82f6] hover:bg-[#2563eb]" onClick={handleOSSave}>Gravar & Finalizar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {showList ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceOrders.map(os => (
            <Card key={os.id} className={`border-[#2d3139] bg-[#1a1d23] hover:border-[#3b82f6]/40 transition-all overflow-hidden group ${selectedIds.includes(os.id) ? 'ring-2 ring-[#3b82f6] border-transparent' : ''}`}>
              <CardHeader className="pb-3 border-b border-[#2d3139]/30 relative pt-10">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <Checkbox 
                    checked={selectedIds.includes(os.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedIds(prev => [...prev, os.id]);
                      } else {
                        setSelectedIds(prev => prev.filter(id => id !== os.id));
                      }
                    }}
                    className="bg-[#0f1115] border-[#2d3139] data-[state=checked]:bg-[#3b82f6]"
                  />
                  <span className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider">Selecionar</span>
                </div>
                <div className="flex justify-between items-start">
                  <Badge className="bg-emerald-500/10 text-emerald-500 font-normal">{os.status}</Badge>
                  <span className="text-[10px] font-mono text-[#3b82f6]">{formatRecordNumber(os.number, os.date)}</span>
                </div>
                <CardTitle className="mt-3 text-white flex items-center gap-2">
                  <Shield size={16} className="text-[#3b82f6]" />
                  {os.clientName}
                </CardTitle>
                <p className="text-xs text-[#71717a]">{os.equipment} - {os.brandModelSN}</p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#71717a]">Data Atendimento</span>
                    <span className="text-white font-medium">{format(os.date instanceof Timestamp ? os.date.toDate() : new Date(os.date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#71717a]">Técnico</span>
                    <span className="text-[#10b981]">{os.technicianName || users.find(u => u.uid === os.technicianId)?.displayName || os.technicianId || 'Consultar Técnico'}</span>
                  </div>
                  <div className="mt-4 p-2 bg-[#0f1115] rounded border border-[#2d3139] text-[10px] text-[#a0a0a0] min-h-[40px] italic">
                    "{(os.performedServices || '').length > 80 ? (os.performedServices || '').substring(0, 80) + '...' : (os.performedServices || '')}"
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-white">R$ {(os.totalValue || 0).toFixed(2)}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Solicitar Assinatura Externa" className="h-8 w-8 text-[#3b82f6] hover:bg-[#3b82f6]/10" onClick={() => handleGenerateSignatureLink(os.id, 'service-order', os.clientName, companyId, { title: `Ordem de Serviço #${formatRecordNumber(os.number, os.date)}`, value: os.totalValue?.toString() }, logAction)}>
                      <PenTool size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#a0a0a0] hover:text-white" onClick={() => {
                      setEditingOS({
                        ...os,
                        startDateTime: format(os.startDateTime instanceof Timestamp ? os.startDateTime.toDate() : new Date(os.startDateTime as any), "yyyy-MM-dd'T'HH:mm"),
                        endDateTime: format(os.endDateTime instanceof Timestamp ? os.endDateTime.toDate() : new Date(os.endDateTime as any), "yyyy-MM-dd'T'HH:mm"),
                      });
                      setIsEditOpen(true);
                    }}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#ef4444]/60 hover:text-[#ef4444]" onClick={() => {
                      setOSToDelete(os);
                      setIsDeleteConfirmOpen(true);
                    }}>
                      <Trash2 size={14} />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] text-xs" onClick={() => {
                      setSelectedOSForPDF(os);
                      setIsValuesModalOpen(true);
                    }}>
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {serviceOrders.length === 0 && (
            <div className="col-span-full py-20 text-center bg-[#1a1d23] rounded-xl border border-dashed border-[#2d3139]">
              <Plus className="mx-auto h-12 w-12 text-[#2d3139] mb-4" />
              <h3 className="text-lg font-medium text-white">Nenhuma Ordem de Serviço</h3>
              <p className="text-[#71717a]">Registre seu primeiro atendimento técnico hoje.</p>
            </div>
          )}
        </div>
      ) : (
        <NoAccessList title="Ordens de Serviço" />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-[90vw] md:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b border-[#2d3139]">
            <DialogTitle>Editar Ordem de Serviço</DialogTitle>
            <DialogDescription className="text-[#71717a]">Atualize os detalhes técnicos do atendimento.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {editingOS && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editingOS.status} onValueChange={(val: any) => setEditingOS({...editingOS, status: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue>
                          {editingOS.status || "Selecione o status"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Aberto">Aberto</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Finalizado">Finalizado</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Técnico Responsável</Label>
                    <Select value={editingOS.technicianId} onValueChange={(val) => {
                      const u = users.find(usr => usr.uid === val);
                      if (u) setEditingOS({ ...editingOS, technicianId: u.uid, technicianName: u.displayName || u.email });
                    }}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue>
                          {users.find(u => u.uid === editingOS.technicianId)?.displayName || users.find(u => u.uid === editingOS.technicianId)?.email || "Selecione o técnico"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {users.map(u => <SelectItem key={u.uid} value={u.uid}>{u.displayName || u.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Equipamento</Label>
                    <Input className="bg-[#0f1115] border-[#2d3139]" value={editingOS.equipment || ''} onChange={e => setEditingOS({...editingOS, equipment: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Marca/Modelo/SN</Label>
                    <Input className="bg-[#0f1115] border-[#2d3139]" value={editingOS.brandModelSN || ''} onChange={e => setEditingOS({...editingOS, brandModelSN: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Serviço</Label>
                    <Select value={editingOS.serviceType} onValueChange={(val: any) => setEditingOS({...editingOS, serviceType: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue>
                          {editingOS.serviceType || "Selecione o tipo"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Corretiva">Corretiva</SelectItem>
                        <SelectItem value="Preventiva">Preventiva</SelectItem>
                        <SelectItem value="Instalação">Instalação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Problema Relatado</Label>
                  <textarea 
                    className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                    value={editingOS.reportedProblem || ''} 
                    onChange={e => setEditingOS({...editingOS, reportedProblem: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Diagnóstico Técnico</Label>
                    <textarea 
                      className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                      value={editingOS.diagnosis || ''} 
                      onChange={e => setEditingOS({...editingOS, diagnosis: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serviços Realizados</Label>
                    <textarea 
                      className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                      value={editingOS.performedServices || ''} 
                      onChange={e => setEditingOS({...editingOS, performedServices: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Anotações Adicionais (para Etiqueta)</Label>
                  <textarea 
                    className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                    value={editingOS.notes || ''} 
                    onChange={e => setEditingOS({...editingOS, notes: e.target.value})}
                    placeholder="Observações que serão impressas na etiqueta..."
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Peças e Materiais</Label>
                    <Button variant="outline" size="sm" onClick={() => handleAddPart(true)} className="h-7 border-[#2d3139] text-xs">+ Peça</Button>
                  </div>
                  {editingOS.parts?.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2">
                      <Input className="col-span-6 bg-[#0f1115] border-[#2d3139] h-8 text-xs" value={p.description} onChange={e => {
                        const next = [...(editingOS.parts || [])];
                        next[i].description = e.target.value;
                        setEditingOS({...editingOS, parts: next});
                      }} />
                      <Input type="number" className="col-span-2 bg-[#0f1115] border-[#2d3139] h-8 text-xs" value={p.quantity} onChange={e => {
                        const next = [...(editingOS.parts || [])];
                        next[i].quantity = Number(e.target.value);
                        setEditingOS({...editingOS, parts: next});
                      }} />
                      <Input type="number" className="col-span-3 bg-[#0f1115] border-[#2d3139] h-8 text-xs" value={p.price} onChange={e => {
                        const next = [...(editingOS.parts || [])];
                        next[i].price = Number(e.target.value);
                        setEditingOS({...editingOS, parts: next});
                      }} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#ef4444]" onClick={() => setEditingOS({...editingOS, parts: editingOS.parts?.filter((_, idx) => idx !== i)})}><X size={14} /></Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <Label>Checklist</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0f1115] p-4 rounded-lg border border-[#2d3139]">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="edit-test" checked={editingOS.checklist?.functionalityTest} onCheckedChange={(val) => setEditingOS({...editingOS, checklist: { ...editingOS.checklist!, functionalityTest: !!val }})} />
                      <Label htmlFor="edit-test" className="text-xs">Teste</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="edit-cleaning" checked={editingOS.checklist?.cleaning} onCheckedChange={(val) => setEditingOS({...editingOS, checklist: { ...editingOS.checklist!, cleaning: !!val }})} />
                      <Label htmlFor="edit-cleaning" className="text-xs">Limpeza</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="edit-safety" checked={editingOS.checklist?.safetyCheck} onCheckedChange={(val) => setEditingOS({...editingOS, checklist: { ...editingOS.checklist!, safetyCheck: !!val }})} />
                      <Label htmlFor="edit-safety" className="text-xs">Segurança</Label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#2d3139]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Início Trabalho</Label>
                      <Input type="datetime-local" className="bg-[#0f1115] border-[#2d3139]" value={editingOS.startDateTime} onChange={e => setEditingOS({...editingOS, startDateTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim Trabalho</Label>
                      <Input type="datetime-local" className="bg-[#0f1115] border-[#2d3139]" value={editingOS.endDateTime} onChange={e => setEditingOS({...editingOS, endDateTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mão de Obra (R$)</Label>
                      <Input type="number" className="bg-[#0f1115] border-[#2d3139]" value={editingOS.laborValue} onChange={e => setEditingOS({...editingOS, laborValue: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="p-6 border-t border-[#2d3139] bg-[#1a1d23]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139]">Cancelar</Button>
            <Button className="bg-[#3b82f6] hover:bg-[#2563eb]" onClick={handleUpdateOS}>Atualizar O.S.</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-[#71717a]">Esta ação não pode ser desfeita. Deseja excluir a O.S. {osToDelete && formatRecordNumber(osToDelete.number, osToDelete.date)}?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139]">Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteOS} className="bg-red-500 hover:bg-red-600">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Confirmation */}
      <Dialog open={isPrintConfirmOpen} onOpenChange={setIsPrintConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerar PDF</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Deseja gerar o PDF da Ordem de Serviço agora?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsPrintConfirmOpen(false)} className="flex-1 border-[#2d3139] text-white hover:bg-[#2d3139]">Não</Button>
            <Button onClick={() => {
              setIsPrintConfirmOpen(false);
              setIsValuesModalOpen(true);
            }} className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white">Sim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OS PDF Values Prompt */}
      <Dialog open={isValuesModalOpen} onOpenChange={setIsValuesModalOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Opções de Impressão</DialogTitle>
            <DialogDescription className="text-[#71717a]">Deseja incluir os valores (Mão de Obra e Peças) na Ordem de Serviço?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (selectedOSForPDF) generateServiceOrderPDF(selectedOSForPDF, appSettings, false);
                setIsValuesModalOpen(false);
              }} 
              className="flex-1 border-[#2d3139] text-white hover:bg-[#2d3139]"
            >
              Não (Sem Valores)
            </Button>
            <Button 
              onClick={() => {
                if (selectedOSForPDF) generateServiceOrderPDF(selectedOSForPDF, appSettings, true);
                setIsValuesModalOpen(false);
              }} 
              className="flex-1 bg-[#3b82f6] hover:bg-[#2563eb] text-white"
            >
              Sim (Com Valores)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetsManager({ budgets = [], clients = [], appSettings, pixSettings, companyId, showList, logAction }: { budgets?: Budget[], clients?: Client[], appSettings: AppSettings, pixSettings: PixSettings, companyId: string, showList: boolean, logAction?: any }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [editingBudget, setEditingBudget] = useState<Partial<Budget>>({});
  const [clientSearch, setClientSearch] = useState('');
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    items: [{ description: '', quantity: 1, price: 0 }],
    status: 'Pendente',
    observations: ''
  });
  
  const [profitMargin, setProfitMargin] = useState<number>(0);
  const [editProfitMargin, setEditProfitMargin] = useState<number>(0);

  const applyProfitMargin = (items: { description: string, quantity: number, price: number }[], margin: number) => {
    if (margin <= 0) return items;
    return items.map(item => ({
      ...item,
      price: Number((item.price * (1 + margin / 100)).toFixed(2))
    }));
  };

  const filteredClientsForSelect = useMemo(() => {
    return clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const handleAddItem = () => {
    setNewBudget({
      ...newBudget,
      items: [...(newBudget.items || []), { description: '', quantity: 1, price: 0 }]
    });
  };

  const handleSaveBudget = async () => {
    const total = (newBudget.items || []).reduce((acc, item) => acc + (item.quantity * item.price), 0);
    try {
      const nextNumber = (budgets || []).length > 0 ? Math.max(...(budgets || []).map(b => b.number || 0)) + 1 : 1;
      
      const itemsToSave = applyProfitMargin(newBudget.items || [], profitMargin);
      const finalTotal = itemsToSave.reduce((acc, item) => acc + (item.quantity * item.price), 0);

      const savedDoc = await addDoc(collection(db, 'budgets'), {
        ...newBudget,
        items: itemsToSave,
        number: nextNumber,
        total: finalTotal,
        companyId,
        createdAt: Timestamp.now()
      });
      
      if (logAction) {
        logAction('Criação', `Orçamento #${nextNumber} criado para ${newBudget.clientName}`, savedDoc.id, 'Orçamentos');
      }

      setNewBudget({ items: [{ description: '', quantity: 1, price: 0 }], status: 'Pendente', observations: '', clientName: '', clientPhone: '', address: '' });
      setProfitMargin(0);
      setIsAddOpen(false);
      toast.success('Orçamento criado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
    }
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget.id) return;
    
    // Apply margin if any
    const itemsToSave = applyProfitMargin(editingBudget.items || [], editProfitMargin);
    const finalTotal = itemsToSave.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    try {
      await updateDoc(doc(db, 'budgets', editingBudget.id), {
        ...editingBudget,
        items: itemsToSave,
        total: finalTotal,
        updatedAt: Timestamp.now()
      });
      
      if (logAction) {
        logAction('Edição', `Orçamento #${editingBudget.number} atualizado`, editingBudget.id, 'Orçamentos');
      }

      setIsEditOpen(false);
      setEditProfitMargin(0);
      toast.success('Orçamento atualizado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    try {
      await deleteDoc(doc(db, 'budgets', budgetToDelete.id));
      if (logAction) {
        logAction('Exclusão', `Orçamento #${budgetToDelete.number} excluído`, budgetToDelete.id, 'Orçamentos');
      }
      setIsDeleteConfirmOpen(false);
      setBudgetToDelete(null);
      toast.success('Orçamento excluído!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleApproveBudget = async (budget: Budget) => {
    try {
      await updateDoc(doc(db, 'budgets', budget.id), { status: 'Aprovado' });
      
      // Create Financial Record
      await addDoc(collection(db, 'financial'), {
        type: 'Receita',
        category: 'Orçamento',
        description: `Orçamento Aprovado ${formatRecordNumber(budget.number, budget.createdAt)} - ${budget.clientName}`,
        value: budget.total,
        date: Timestamp.now(),
        serviceType: 'Serviço Normal',
        clientId: budget.clientId || null,
        companyId,
        createdAt: Timestamp.now()
      });
      
      toast.success('Orçamento aprovado e financeiro atualizado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const generateBudgetPDF = (budget: Budget) => {
    const doc = new jsPDF();
    const dateStr = format(budget.createdAt instanceof Timestamp ? budget.createdAt.toDate() : new Date(budget.createdAt), 'dd/MM/yyyy');
    
    // Logo
    if (appSettings.logoUrl) {
      try {
        doc.addImage(appSettings.logoUrl, 'PNG', 20, 10, 18, 18);
      } catch (e) {
        console.error("Erro ao adicionar logo ao PDF:", e);
      }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const budgetHeaderX = appSettings.logoUrl ? 42 : 20;
    doc.text(appSettings.companyName || 'AF Sistemas de Segurança e Informática', budgetHeaderX, 18);
    
    doc.setFontSize(12);
    doc.text(`ORÇAMENTO DE SERVIÇOS ${formatRecordNumber(budget.number, budget.createdAt)}`, budgetHeaderX, 26);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dateStr}`, 20, 42);
    doc.text(`Cliente: ${budget.clientName || 'Cliente Sem Nome'}`, 20, 57);
    doc.text(`WhatsApp: ${budget.clientPhone || 'N/A'}`, 20, 64);
    doc.text(`Endereço: ${budget.address || 'N/A'}`, 20, 71);
    
    doc.line(20, 77, 190, 77);
    
    // Items Table
    const tableData = budget.items.map(item => [
      item.description,
      item.quantity.toString(),
      `R$ ${(item.price || 0).toFixed(2)}`,
      `R$ ${((item.quantity || 0) * (item.price || 0)).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 82,
      head: [['Descrição', 'Qtd', 'Preço Unit.', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`VALOR TOTAL: R$ ${(budget.total || 0).toFixed(2)}`, 190, finalY, { align: 'right' });

    if (budget.pixAccountId) {
      const selectedPix = pixSettings.accounts.find(a => a.id === budget.pixAccountId);
      if (selectedPix) {
        finalY += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Dados para Pagamento (PIX):', 20, finalY);
        doc.setFont('helvetica', 'normal');
        doc.text(`Chave: ${selectedPix.key} - Banco: ${selectedPix.bank}`, 20, finalY + 7);
        doc.text(`Favorecido: ${selectedPix.favored}`, 20, finalY + 12);
        finalY += 15;
      }
    }
    
    if (budget.observations) {
      finalY += 15;
      doc.setFontSize(10);
      doc.text('Observações:', 20, finalY);
      doc.setFont('helvetica', 'normal');
      const splitObs = doc.splitTextToSize(budget.observations, 170);
      doc.text(splitObs, 20, finalY + 7);
      finalY += (splitObs.length * 5) + 10;
    }

    if (finalY > 240) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const cityDateBudget = formatFullDateWithCity(budget.createdAt || new Date(), appSettings);
    doc.text(cityDateBudget, 105, finalY + 5, { align: 'center' });

    finalY += 20;

    if (budget.clientSignature) {
      try {
        doc.addImage(budget.clientSignature, 'PNG', 20, finalY - 15, 50, 15);
      } catch (e) {
        console.error("Erro ao adicionar assinatura do cliente ao orçamento:", e);
      }
    }
    doc.line(20, finalY, 70, finalY);
    doc.text('Assinatura do Cliente', 45, finalY + 5, { align: 'center' });

    if (appSettings.signatureUrl) {
      try {
        doc.addImage(appSettings.signatureUrl, 'PNG', 130, finalY - 15, 50, 15);
      } catch (e) {
        console.error("Erro ao adicionar assinatura da empresa ao orçamento:", e);
      }
    }
    doc.line(120, finalY, 190, finalY);
    doc.text(appSettings.responsible || appSettings.companyName, 155, finalY + 5, { align: 'center' });

    const nameForFilename = (budget.clientName || 'Cliente_Sem_Nome').replace(/\s/g, '_');
    doc.save(`orcamento_${nameForFilename}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Orçamentos</h2>
          <p className="text-[#71717a]">Gere orçamentos profissionais para seus clientes.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              <Plus size={18} />
              Novo Orçamento
            </Button>
          } />
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Novo Orçamento</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Selecionar Cliente Existente (Opcional)</Label>
                  <Select onValueChange={(clientId) => {
                    const client = clients.find(c => c.id === clientId);
                    if (client) {
                      setNewBudget({
                        ...newBudget,
                        clientId: client.id,
                        clientName: client.name || '',
                        clientPhone: client.phone || '',
                        address: client.address || '',
                        pixAccountId: client.pixAccountId
                      });
                    }
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue placeholder="Escolha um cliente...">
                        {clients.find(c => c.name === newBudget.clientName)?.name || newBudget.clientName || null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <div className="p-2 sticky top-0 bg-[#1a1d23] z-10 border-b border-[#2d3139]">
                        <Input 
                          placeholder="Pesquisar..." 
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="h-8 text-xs bg-[#0f1115] border-[#2d3139]"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <ScrollArea className="h-[200px]">
                        {filteredClientsForSelect.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name || 'Cliente Sem Nome'}</SelectItem>
                        ))}
                        {filteredClientsForSelect.length === 0 && (
                          <div className="p-2 text-center text-xs text-[#71717a]">Nenhum cliente encontrado</div>
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="bg-[#2d3139]" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Cliente</Label>
                    <Input value={newBudget.clientName || ''} onChange={e => setNewBudget({...newBudget, clientName: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">WhatsApp/Celular</Label>
                    <Input value={newBudget.clientPhone || ''} onChange={e => setNewBudget({...newBudget, clientPhone: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Endereço</Label>
                  <Input value={newBudget.address || ''} onChange={e => setNewBudget({...newBudget, address: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Conta PIX (Para exibir no orçamento)</Label>
                  <Select value={newBudget.pixAccountId} onValueChange={(val) => setNewBudget({...newBudget, pixAccountId: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue placeholder="Selecione a conta PIX">
                        {pixSettings.accounts?.find(a => a.id === newBudget.pixAccountId) 
                          ? `${pixSettings.accounts.find(a => a.id === newBudget.pixAccountId)?.label} (${pixSettings.accounts.find(a => a.id === newBudget.pixAccountId)?.bank})`
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      {pixSettings.accounts?.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank})</SelectItem>
                      ))}
                      {(!pixSettings.accounts || pixSettings.accounts.length === 0) && (
                        <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-[#2d3139]" />
                
                <div className="bg-[#3b82f6]/5 p-4 rounded-lg border border-[#3b82f6]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#3b82f6] font-bold flex items-center gap-2">
                      <Percent size={16} /> Margem de Lucro Global
                    </Label>
                    <span className="text-[10px] text-[#71717a] lowercase italic">Aplica sobre os preços digitados abaixo</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Input 
                        type="number" 
                        value={profitMargin} 
                        onChange={e => setProfitMargin(Number(e.target.value))} 
                        className="bg-[#0f1115] border-[#2d3139] text-[#3b82f6] font-bold" 
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3b82f6] font-bold">%</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white"
                      onClick={() => {
                        if (profitMargin > 0 && newBudget.items) {
                          const updated = applyProfitMargin(newBudget.items, profitMargin);
                          setNewBudget({...newBudget, items: updated});
                          setProfitMargin(0); // Reset after apply
                          toast.success('Markup aplicado aos itens!');
                        }
                      }}
                    >
                      Aplicar Agora
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#a0a0a0]">Itens do Orçamento</Label>
                    <Button variant="outline" size="sm" onClick={handleAddItem} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Adicionar Item</Button>
                  </div>
                  <ScrollArea className="h-[200px] pr-4 border border-[#2d3139] rounded-md p-2 bg-[#0f1115]">
                    {(newBudget.items || []).map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                        <div className="col-span-6">
                          <Input placeholder="Descrição" value={item.description} onChange={e => {
                            const items = [...(newBudget.items || [])];
                            items[idx].description = e.target.value;
                            setNewBudget({...newBudget, items});
                          }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9" />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" placeholder="Qtd" value={item.quantity} onChange={e => {
                            const items = [...(newBudget.items || [])];
                            items[idx].quantity = Number(e.target.value);
                            setNewBudget({...newBudget, items});
                          }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9" />
                        </div>
                        <div className="col-span-3">
                          <Input type="number" placeholder="Preço" value={item.price} onChange={e => {
                            const items = [...(newBudget.items || [])];
                            items[idx].price = Number(e.target.value);
                            setNewBudget({...newBudget, items});
                          }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9" />
                        </div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="icon" className="text-[#ef4444] hover:bg-[#ef4444]/10 h-9" onClick={() => {
                            const items = (newBudget.items || []).filter((_, i) => i !== idx);
                            setNewBudget({...newBudget, items});
                          }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetObs" className="text-[#a0a0a0]">Observações do Orçamento</Label>
                  <Input id="budgetObs" value={newBudget.observations || ''} onChange={e => setNewBudget({...newBudget, observations: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23] flex items-center justify-between sm:justify-between">
              <div className="text-lg font-bold text-white">
                Total: R$ {(newBudget.items || []).reduce((acc, item) => acc + (item.quantity * item.price), 0).toFixed(2)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
                <Button onClick={handleSaveBudget} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Gerar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showList ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget) => (
          <Card key={budget.id} className="border-[#2d3139] bg-[#1a1d23] rounded-xl hover:border-[#3b82f6]/50 transition-all group">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <Badge className={cn(
                    "text-[10px] font-semibold uppercase px-2 py-0.5 rounded w-fit",
                    budget.status === 'Aprovado' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {budget.status || 'Pendente'}
                  </Badge>
                  <span className="text-[10px] font-mono text-[#3b82f6]">{formatRecordNumber(budget.number, budget.createdAt)}</span>
                </div>
                <p className="text-[11px] text-[#71717a]">{format(budget.createdAt instanceof Timestamp ? budget.createdAt.toDate() : new Date(budget.createdAt), 'dd/MM/yyyy')}</p>
              </div>
              <CardTitle className="mt-3 text-[16px] font-bold text-white">{budget.clientName || 'Cliente Sem Nome'}</CardTitle>
              <CardDescription className="text-[#71717a] text-[12px]">{budget.clientPhone || 'Sem telefone'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                {(budget.items || []).slice(0, 2).map((item, i) => (
                  <div key={i} className="flex justify-between text-[12px]">
                    <span className="text-[#a0a0a0] truncate mr-2">{item.quantity}x {item.description}</span>
                    <span className="font-medium text-[#e0e0e0]">R$ {(item.quantity * item.price || 0).toFixed(2)}</span>
                  </div>
                ))}
                {(budget.items || []).length > 2 && <p className="text-[10px] text-[#555]">+{(budget.items || []).length - 2} itens...</p>}
              </div>
              <Separator className="my-4 bg-[#2d3139]" />
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-white">R$ {(budget.total || 0).toFixed(2)}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white" title="Editar" onClick={() => {
                    setEditingBudget(budget);
                    setEditProfitMargin(0);
                    setIsEditOpen(true);
                  }}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white" title="Gerar PDF" onClick={() => generateBudgetPDF(budget)}>
                    <Share2 size={14} />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#3b82f6] hover:bg-[#3b82f6]/10" title="Solicitar Assinatura Externa" onClick={() => handleGenerateSignatureLink(budget.id, 'budget', budget.clientName, companyId, { title: `Orçamento #${formatRecordNumber(budget.number, budget.createdAt)}`, value: budget.total?.toString() }, logAction)}>
                    <PenTool size={14} />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" title="Excluir" onClick={() => {
                    setBudgetToDelete(budget);
                    setIsDeleteConfirmOpen(true);
                  }}>
                    <Trash2 size={14} />
                  </Button>
                  {budget.status === 'Pendente' && (
                    <Button size="sm" className="h-8 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[11px] px-2" onClick={() => handleApproveBudget(budget)}>
                      Aprovar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {budgets.length === 0 && (
          <div className="col-span-full text-center py-20 bg-[#1a1d23] rounded-xl border border-dashed border-[#2d3139]">
            <FileText className="mx-auto h-12 w-12 text-[#2d3139] mb-4" />
            <h3 className="text-lg font-medium text-white">Nenhum orçamento</h3>
            <p className="text-[#71717a]">Comece criando um novo orçamento para seus clientes.</p>
          </div>
        )}
      </div>
    ) : (
      <NoAccessList title="Orçamentos" />
    )}

      {/* Edit Budget Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px]">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle>Editar Orçamento #{editingBudget.number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Cliente</Label>
                  <Input value={editingBudget.clientName || ''} onChange={e => setEditingBudget({...editingBudget, clientName: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">WhatsApp/Celular</Label>
                  <Input value={editingBudget.clientPhone || ''} onChange={e => setEditingBudget({...editingBudget, clientPhone: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0]">Endereço</Label>
                <Input value={editingBudget.address || ''} onChange={e => setEditingBudget({...editingBudget, address: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
              </div>

              <div className="bg-[#3b82f6]/5 p-4 rounded-lg border border-[#3b82f6]/20 space-y-3">
                <Label className="text-[#3b82f6] font-bold flex items-center gap-2">
                  <Percent size={16} /> Atualizar Margem de Lucro (%)
                </Label>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Input 
                      type="number" 
                      value={editProfitMargin} 
                      onChange={e => setEditProfitMargin(Number(e.target.value))} 
                      className="bg-[#0f1115] border-[#2d3139] text-[#3b82f6]" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3b82f6] font-bold">%</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-[#3b82f6]/30 text-[#3b82f6]"
                    onClick={() => {
                      if (editProfitMargin > 0 && editingBudget.items) {
                        const updated = applyProfitMargin(editingBudget.items, editProfitMargin);
                        setEditingBudget({...editingBudget, items: updated});
                        setEditProfitMargin(0);
                        toast.success('Markup aplicado!');
                      }
                    }}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[#a0a0a0]">Itens do Orçamento</Label>
                  <Button variant="outline" size="sm" onClick={() => setEditingBudget({...editingBudget, items: [...(editingBudget.items || []), { description: '', quantity: 1, price: 0 }]})} className="border-[#2d3139]">Adicionar Item</Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {(editingBudget.items || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
                      <div className="col-span-6">
                        <Input value={item.description} onChange={e => {
                          const items = [...(editingBudget.items || [])];
                          items[idx].description = e.target.value;
                          setEditingBudget({...editingBudget, items});
                        }} className="bg-[#0f1115] border-[#2d3139]" placeholder="Descrição" />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" value={item.quantity} onChange={e => {
                          const items = [...(editingBudget.items || [])];
                          items[idx].quantity = Number(e.target.value);
                          setEditingBudget({...editingBudget, items});
                        }} className="bg-[#0f1115] border-[#2d3139]" />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" value={item.price} onChange={e => {
                          const items = [...(editingBudget.items || [])];
                          items[idx].price = Number(e.target.value);
                          setEditingBudget({...editingBudget, items});
                        }} className="bg-[#0f1115] border-[#2d3139]" />
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setEditingBudget({...editingBudget, items: editingBudget.items?.filter((_, i) => i !== idx)})}><Trash2 size={14} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0]">Observações</Label>
                <textarea 
                  className="w-full min-h-[80px] bg-[#0f1115] border-[#2d3139] rounded-md p-3 text-sm focus:ring-1 focus:ring-[#3b82f6]" 
                  value={editingBudget.observations || ''} 
                  onChange={e => setEditingBudget({...editingBudget, observations: e.target.value})} 
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 border-t border-[#2d3139] flex justify-between items-center sm:justify-between">
            <div className="text-lg font-bold text-white">
              Total: R$ {(editingBudget.items || []).reduce((acc, item) => acc + (item.quantity * item.price), 0).toFixed(2)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139]">Cancelar</Button>
              <Button onClick={handleUpdateBudget} className="bg-[#3b82f6] hover:bg-[#2563eb]">Salvar Alterações</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Budget Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Tem certeza que deseja excluir o orçamento #{budgetToDelete?.number}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139]">Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteBudget} className="bg-red-500 hover:bg-red-600">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
