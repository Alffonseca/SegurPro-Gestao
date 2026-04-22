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
  User as UserIcon,
  Receipt as ReceiptIcon,
  Share2,
  Settings,
  Menu,
  X
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
  Timestamp,
  setDoc,
  getDoc,
  getDocFromServer
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
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
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

function valorPorExtenso(valor: number) {
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

const formatRecordNumber = (number?: number, date?: any) => {
  if (!number) return '---';
  const d = date instanceof Timestamp ? date.toDate() : (date ? new Date(date) : new Date());
  const year = format(d, 'yyyy');
  return `${number.toString().padStart(4, '0')}/${year}`;
};
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
      doc.addImage(appSettings.logoUrl, 'PNG', margin, currentY, 25, 25);
    } catch (e) {
      console.error("Erro ao adicionar logo ao PDF:", e);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(appSettings.companyName || 'Sua Empresa', appSettings.logoUrl ? margin + 30 : margin, currentY + 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const companyInfo = `${appSettings.address || ''}${appSettings.neighborhood ? `, ${appSettings.neighborhood}` : ''}, ${appSettings.city || ''} - CEP: ${appSettings.cep || ''}`;
  doc.text(companyInfo, appSettings.logoUrl ? margin + 30 : margin, currentY + 17);
  
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
  doc.text(`${appSettings.city || 'Cidade-UF'}, ${dateStr}.`, margin, currentY);
  currentY += 35;

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

const generateReceiptPDF = (receipt: Receipt, appSettings: AppSettings, pixSettings: PixSettings, shouldShare = false) => {
  const doc = new jsPDF();
  const dateStr = format(receipt.date instanceof Timestamp ? receipt.date.toDate() : new Date(receipt.date), 'dd/MM/yyyy');
  const fullDateStr = format(receipt.date instanceof Timestamp ? receipt.date.toDate() : new Date(receipt.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const isContract = receipt.clientType === 'Contrato';
  
  // 1. Header
  if (appSettings.logoUrl) {
    try {
      doc.addImage(appSettings.logoUrl, 'PNG', 20, 10, 25, 25);
    } catch (e) {
      console.error("Erro ao adicionar logo ao PDF:", e);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(appSettings.companyName || 'André Fonseca', appSettings.logoUrl ? 50 : 20, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  // Removed duplicate company name on the right
  
  doc.setFontSize(9);
  doc.text('(91)98722-3092   (91)98995-8066   afsistseg.me@gmail.com', appSettings.logoUrl ? 50 : 20, 30);
  
  // 2. Title Bar
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 40, 170, 10, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recibo', 105, 47, { align: 'center' });
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
  doc.setFillColor(245, 245, 245);
  doc.rect(20, servicesY + 13, 170, 15, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  const serviceText = receipt.serviceSpecification || 'Serviços prestados';
  const splitService = doc.splitTextToSize(serviceText, isContract ? 130 : 90);
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
  
  // 5. Totals
  doc.setFillColor(120, 120, 120);
  doc.rect(100, servicesY + 50, 90, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('Total', 105, servicesY + 57);
  doc.text(formattedVal, 185, servicesY + 57, { align: 'right' });
  
  // PIX Info
  const selectedPix = pixSettings.accounts.find(a => a.id === receipt.pixAccountId) || pixSettings.accounts[0];
  if (selectedPix && selectedPix.key) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados para Pagamento (PIX):', 20, servicesY + 70);
    doc.setFont('helvetica', 'normal');
    doc.text(`Chave: ${selectedPix.key}`, 20, servicesY + 75);
    doc.text(`Banco: ${selectedPix.bank}`, 20, servicesY + 80);
    doc.text(`Favorecido: ${selectedPix.favored}`, 20, servicesY + 85);
    doc.text(`CPF/CNPJ: ${selectedPix.document}`, 20, servicesY + 90);
  }

  // Observations
  if (receipt.observations) {
    const obsY = servicesY + (selectedPix && selectedPix.key ? 100 : 70);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 20, obsY);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(receipt.observations, 170);
    doc.text(splitObs, 20, obsY + 5);
  }

  // 6. Signature
  if (appSettings.signatureUrl) {
    try {
      doc.addImage(appSettings.signatureUrl, 'PNG', 80, 250, 50, 20);
    } catch (e) {
      console.error("Erro ao adicionar assinatura ao recibo:", e);
    }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 105, 260, { align: 'center' });
  doc.line(70, 270, 140, 270);
  doc.text(appSettings.companyName || 'André Fonseca', 105, 275, { align: 'center' });
  
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
  signatureUrl?: string;
}

// --- Components ---

function SignaturePad({ value, onChange }: { value?: string, onChange: (val: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

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

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      onChange(canvasRef.current.toDataURL());
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineWidth = 2;
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
        ctx.beginPath(); // Reset current path
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
    <div className="space-y-2">
      <div className="relative bg-white rounded-lg border border-[#2d3139] overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="w-full h-[150px] touch-none"
        />
        {(!isDrawing && !value) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300">
            Assine aqui
          </div>
        )}
      </div>
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={clear}
        className="w-full border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]"
      >
        Limpar Assinatura
      </Button>
    </div>
  );
}

const getFinalEmail = (input: string) => {
  const clean = input.trim();
  if (!clean) return '';
  return clean.includes('@') ? clean : `${clean.toLowerCase()}@segurpro.local`;
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [visits, setVisits] = useState<TechnicalVisit[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userPhotoError, setUserPhotoError] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pixSettings, setPixSettings] = useState<PixSettings>({
    accounts: []
  });
  const [appSettings, setAppSettings] = useState<AppSettings>({
    logoUrl: '',
    companyName: 'AF Sistemas de Segurança e Informática',
    address: '',
    neighborhood: '',
    responsible: '',
    city: '',
    cep: '',
    document: '',
    signatureUrl: ''
  });

  // Auth Listener
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message.includes('the client is offline')) {
          console.error("Erro de conexão com o Firebase: O cliente está offline ou a configuração está incorreta.");
          toast.error("Erro de conexão: Verifique se o Firestore foi ativado no Console do Firebase.");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const initialData = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || displayName,
            role: 'admin', // Default to admin for the first user
            createdAt: Timestamp.now()
          };
          await setDoc(userRef, initialData);
          setCurrentUserData(initialData);
        } else {
          setCurrentUserData(userSnap.data());
        }
      } else {
        setCurrentUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const visitsUnsubscribe = onSnapshot(
      query(collection(db, 'visits'), orderBy('date', 'desc')),
      (snapshot) => {
        setVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TechnicalVisit)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'visits')
    );

    const financialUnsubscribe = onSnapshot(
      query(collection(db, 'financial'), orderBy('date', 'desc')),
      (snapshot) => {
        setFinancials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'financial')
    );

    const budgetsUnsubscribe = onSnapshot(
      query(collection(db, 'budgets'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'budgets')
    );

    const clientsUnsubscribe = onSnapshot(
      query(collection(db, 'clients'), orderBy('name', 'asc')),
      (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'clients')
    );

    const receiptsUnsubscribe = onSnapshot(
      query(collection(db, 'receipts'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Receipt)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'receipts')
    );

    const usersUnsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    const pixUnsubscribe = onSnapshot(
      doc(db, 'settings', 'pix'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.accounts) {
            setPixSettings(data as PixSettings);
          } else if (data.key) {
            // Migration for old single account format
            const migratedAccount: PixAccount = {
              id: 'default',
              label: 'Principal',
              key: data.key,
              bank: data.bank,
              favored: data.favored,
              document: data.document
            };
            setPixSettings({ accounts: [migratedAccount] });
          } else {
            setPixSettings({ accounts: [] });
          }
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'settings/pix')
    );

    const appSettingsUnsubscribe = onSnapshot(
      doc(db, 'settings', 'general'),
      (snapshot) => {
        if (snapshot.exists()) {
          setAppSettings(snapshot.data() as AppSettings);
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'settings/general')
    );

    return () => {
      visitsUnsubscribe();
      financialUnsubscribe();
      budgetsUnsubscribe();
      clientsUnsubscribe();
      receiptsUnsubscribe();
      usersUnsubscribe();
      pixUnsubscribe();
      appSettingsUnsubscribe();
    };
  }, [user]);

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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos.');
      return;
    }

    const finalEmail = getFinalEmail(email);

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, finalEmail, password);
        toast.success('Entrando no sistema...');
      } else {
        if (!displayName) {
          toast.error('Por favor, informe seu nome para o cadastro.');
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
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
        toast.error('O formato do usuário ou e-mail é inválido.');
      } else {
        toast.error('Erro na autenticação: ' + (error.message || 'Desconhecido'));
      }
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1115]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3b82f6] border-t-transparent"></div>
          <p className="text-sm font-medium text-[#71717a]">Carregando SegurPro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0f1115] p-6 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 text-center py-8">
          <div className="space-y-2">
            {appSettings.logoUrl ? (
              <div className="mx-auto flex h-24 w-auto items-center justify-center overflow-hidden mb-4">
                <img src={appSettings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3b82f6] text-white shadow-xl shadow-blue-900/20">
                <CheckCircle2 size={32} />
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-white">{appSettings.companyName || 'SegurPro Gestão'}</h1>
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
                  <Label htmlFor="auth-username" className="text-[#a0a0a0]">Usuário</Label>
                  <Input 
                    id="auth-username" 
                    type="text" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="Seu usuário"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-pass" className="text-[#a0a0a0]">Senha</Label>
                  <Input 
                    id="auth-pass" 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <Button type="submit" className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white border-none">
                  {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
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
          <p className="text-xs text-[#555]">© 2026 SegurPro Gestão. Todos os direitos reservados.</p>
        </div>
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
              <img src={appSettings.logoUrl} alt="Logo" className="h-10 w-auto object-contain max-w-[40px]" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b82f6] text-white">
                <CheckCircle2 size={18} />
              </div>
            )}
            <span className="font-bold tracking-wider text-white text-lg uppercase">SegurPro</span>
          </div>
        </div>
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-1">
            <SidebarItem 
              icon={<LayoutDashboard size={18} />} 
              label="Painel Geral" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={<CalendarIcon size={18} />} 
              label="Visitas Técnicas" 
              active={activeTab === 'visits'} 
              onClick={() => setActiveTab('visits')} 
            />
            <SidebarItem 
              icon={<DollarSign size={18} />} 
              label="Financeiro" 
              active={activeTab === 'financial'} 
              onClick={() => setActiveTab('financial')} 
            />
            <SidebarItem 
              icon={<FileText size={18} />} 
              label="Orçamentos" 
              active={activeTab === 'budgets'} 
              onClick={() => setActiveTab('budgets')} 
            />
            
            <div className="pt-6 pb-2 px-4">
              <span className="text-[11px] uppercase tracking-widest text-[#555] font-semibold">Gestão</span>
            </div>
            <SidebarItem 
              icon={<UserIcon size={18} />} 
              label="Clientes" 
              active={activeTab === 'clients'} 
              onClick={() => setActiveTab('clients')} 
            />
            <SidebarItem 
              icon={<ReceiptIcon size={18} />} 
              label="Recibos" 
              active={activeTab === 'receipts'} 
              onClick={() => setActiveTab('receipts')} 
            />
            {currentUserData?.role === 'admin' && (
              <SidebarItem 
                icon={<UserIcon size={18} />} 
                label="Gerenciar Equipe" 
                active={activeTab === 'users'} 
                onClick={() => setActiveTab('users')} 
              />
            )}
            <SidebarItem 
              icon={<Settings size={18} />} 
              label="Configurações" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
            <SidebarItem 
              icon={<FileText size={18} />} 
              label="Relatórios" 
              active={activeTab === 'reports'} 
              onClick={() => setActiveTab('reports')} 
            />
          </nav>
        </ScrollArea>
        <div className="p-6 border-t border-[#2d3139]">
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
              <CheckCircle2 size={18} />
            </div>
          )}
          <span className="font-bold tracking-tight text-white">SegurPro</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#0f1115] z-40 pt-16 flex flex-col">
          <nav className="flex-1 p-6 space-y-2">
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label="Painel Geral" 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
            />
            <SidebarItem 
              icon={<CalendarIcon size={20} />} 
              label="Visitas Técnicas" 
              active={activeTab === 'visits'} 
              onClick={() => { setActiveTab('visits'); setIsMobileMenuOpen(false); }} 
            />
            <SidebarItem 
              icon={<DollarSign size={20} />} 
              label="Financeiro" 
              active={activeTab === 'financial'} 
              onClick={() => { setActiveTab('financial'); setIsMobileMenuOpen(false); }} 
            />
            <SidebarItem 
              icon={<FileText size={20} />} 
              label="Orçamentos" 
              active={activeTab === 'budgets'} 
              onClick={() => { setActiveTab('budgets'); setIsMobileMenuOpen(false); }} 
            />
            <SidebarItem 
              icon={<FileText size={20} />} 
              label="Relatórios" 
              active={activeTab === 'reports'} 
              onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }} 
            />
            <SidebarItem 
              icon={<UserIcon size={20} />} 
              label="Clientes" 
              active={activeTab === 'clients'} 
              onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }} 
            />
            <SidebarItem 
              icon={<ReceiptIcon size={20} />} 
              label="Recibos" 
              active={activeTab === 'receipts'} 
              onClick={() => { setActiveTab('receipts'); setIsMobileMenuOpen(false); }} 
            />
            {currentUserData?.role === 'admin' && (
              <SidebarItem 
                icon={<UserIcon size={20} />} 
                label="Usuários" 
                active={activeTab === 'users'} 
                onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} 
              />
            )}
            <SidebarItem 
              icon={<Settings size={20} />} 
              label="Configurações" 
              active={activeTab === 'settings'} 
              onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} 
            />
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
        <header className="hidden md:flex h-20 items-center justify-center px-10 border-b border-[#2d3139] bg-[#1a1d23]">
          <div className="text-center">
            <p className="text-[11px] text-[#71717a] uppercase tracking-widest mb-1">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <h2 className="text-2xl font-medium text-white capitalize">{activeTab === 'dashboard' ? 'Resumo Operacional' : activeTab.replace('-', ' ')}</h2>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {activeTab === 'dashboard' && (
            <Dashboard 
              visits={visits} 
              financials={financials} 
              budgets={budgets} 
              clients={clients} 
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === 'visits' && <VisitsManager visits={visits} user={user} clients={clients} appSettings={appSettings} pixSettings={pixSettings} />}
          {activeTab === 'financial' && <FinancialManager financials={financials} visits={visits} clients={clients} />}
          {activeTab === 'budgets' && <BudgetsManager budgets={budgets} clients={clients} appSettings={appSettings} pixSettings={pixSettings} />}
          {activeTab === 'clients' && <ClientsManager clients={clients} appSettings={appSettings} pixSettings={pixSettings} />}
          {activeTab === 'receipts' && <ReceiptsManager receipts={receipts} clients={clients} pixSettings={pixSettings} appSettings={appSettings} />}
          {activeTab === 'reports' && (
            <ReportsManager 
              visits={visits} 
              financials={financials} 
              budgets={budgets} 
              clients={clients} 
              receipts={receipts} 
              appSettings={appSettings} 
            />
          )}
          {activeTab === 'users' && <UsersManager users={users} />}
          {activeTab === 'settings' && <SettingsManager pixSettings={pixSettings} appSettings={appSettings} user={user} />}
        </div>
      </main>
    </div>
  );
}

function UsersManager({ users }: { users: any[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'tecnico' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, newUser.password);
      await updateProfile(userCredential.user, { displayName: newUser.name });
      
      // Add to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: finalEmail,
        displayName: newUser.name,
        role: newUser.role,
        createdAt: Timestamp.now()
      });

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
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
      toast.success('Usuário removido com sucesso!');
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
                  <Input 
                    id="user-pass" 
                    type="password"
                    value={newUser.password} 
                    onChange={e => setNewUser({...newUser, password: e.target.value})} 
                    placeholder="Mínimo 6 caracteres"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Nível de Acesso</Label>
                  <Select value={newUser.role} onValueChange={(val: any) => setNewUser({...newUser, role: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
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

      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-[#25282e]/50">
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
                <TableCell className="font-medium text-white text-[13px]">{u.displayName}</TableCell>
                <TableCell className="text-[12px] text-[#e0e0e0]">{u.email}</TableCell>
                <TableCell>
                  <Badge className={cn(
                    "font-normal text-[10px] uppercase tracking-wider",
                    u.role === 'admin' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {u.role === 'admin' ? 'Administrador' : 'Técnico'}
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="tecnico">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Nova Senha (opcional)</Label>
                  <Input 
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a atual"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
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

function ClientsManager({ clients, appSettings, pixSettings }: { clients: Client[], appSettings: AppSettings, pixSettings: PixSettings }) {
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
    return clients.filter(c => 
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
        createdAt: Timestamp.now()
      };
      const docRef = await addDoc(collection(db, 'clients'), clientData);
      
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
                        <SelectValue placeholder="Selecione" />
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
                        <SelectValue placeholder="Selecione" />
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

      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-[#25282e]/50">
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

// --- Receipts Manager Component ---

function ReceiptsManager({ receipts, clients, pixSettings, appSettings }: { receipts: Receipt[], clients: Client[], pixSettings: PixSettings, appSettings: AppSettings }) {
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
    return clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
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
          origin: receiptData.number ? `Recibo Nº ${receiptData.number}` : 'Recibo',
          value: Number(receiptData.value),
          date: receiptData.date || Timestamp.now(),
          serviceType: receiptData.clientType === 'Contrato' ? 'Contrato' : 'Serviço Normal',
          clientId: receiptData.clientId || null,
          receiptId: receiptId,
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
      const nextNumber = receipts.length > 0 ? Math.max(...receipts.map(r => r.number || 0)) + 1 : 1;

      const receiptData = {
        ...newReceipt,
        number: nextNumber,
        status: newReceipt.status || 'Aguardando Pagamento',
        date: Timestamp.fromDate(newReceipt.date instanceof Date ? newReceipt.date : new Date()),
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

      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-[#25282e]/50">
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
                  {receipt.number ? `#${receipt.number}` : '-'}
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

// --- Settings Manager Component ---

function SettingsManager({ pixSettings, appSettings, user }: { pixSettings: PixSettings, appSettings: AppSettings, user: FirebaseUser }) {
  const [localApp, setLocalApp] = useState<AppSettings>(appSettings);
  const [newDisplayName, setNewDisplayName] = useState(user.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Multi-PIX states
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [currentPix, setCurrentPix] = useState<Partial<PixAccount>>({});
  const [editingPixId, setEditingPixId] = useState<string | null>(null);

  useEffect(() => {
    setLocalApp(appSettings);
  }, [appSettings]);

  const handleSaveApp = async () => {
    try {
      await setDoc(doc(db, 'settings', 'general'), localApp);
      toast.success('Configurações gerais salvas!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/general');
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
      await setDoc(doc(db, 'settings', 'pix'), { accounts: updatedAccounts });
      toast.success(editingPixId ? 'Conta PIX atualizada!' : 'Nova conta PIX adicionada!');
      setIsPixDialogOpen(false);
      setCurrentPix({});
      setEditingPixId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/pix');
    }
  };

  const handleDeletePixAccount = async (id: string) => {
    const updatedAccounts = (pixSettings.accounts || []).filter(acc => acc.id !== id);
    try {
      await setDoc(doc(db, 'settings', 'pix'), { accounts: updatedAccounts });
      toast.success('Conta PIX removida!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/pix');
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      if (newDisplayName !== user.displayName) {
        await updateProfile(user, { displayName: newDisplayName });
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Configurações do Sistema</h2>
        <p className="text-[#71717a]">Gerencie os dados globais do sistema e seu perfil.</p>
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
                value={localApp.companyName} 
                onChange={e => setLocalApp({ ...localApp, companyName: e.target.value })} 
                className="bg-[#0f1115] border-[#2d3139] text-white" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyDoc" className="text-[#a0a0a0]">CPF/CNPJ da Empresa</Label>
                <Input 
                  id="companyDoc" 
                  value={localApp.document} 
                  onChange={e => setLocalApp({ ...localApp, document: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyResp" className="text-[#a0a0a0]">Responsável</Label>
                <Input 
                  id="companyResp" 
                  value={localApp.responsible} 
                  onChange={e => setLocalApp({ ...localApp, responsible: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyAddress" className="text-[#a0a0a0]">Endereço</Label>
                <Input 
                  id="companyAddress" 
                  value={localApp.address} 
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
                  value={localApp.city} 
                  onChange={e => setLocalApp({ ...localApp, city: e.target.value })} 
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyCep" className="text-[#a0a0a0]">CEP</Label>
                <Input 
                  id="companyCep" 
                  value={localApp.cep} 
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
      </div>
    </div>
  );
}

function ReportsManager({ visits, financials, budgets, clients, receipts, appSettings }: { visits: TechnicalVisit[], financials: FinancialRecord[], budgets: Budget[], clients: Client[], receipts: Receipt[], appSettings: AppSettings }) {
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
      const d = itemDate instanceof Timestamp ? itemDate.toDate() : (itemDate instanceof Date ? itemDate : new Date(itemDate));
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
        `R$ ${v.totalValue.toFixed(2)}`,
        v.status
      ]);
    } else if (category === 'Financeiro') {
      filteredData = financials.filter(f => isMatch(f.date));
      tableHeaders = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
      tableRows = filteredData.map(f => {
        const d = f.date instanceof Timestamp ? f.date.toDate() : (f.date instanceof Date ? f.date : new Date(f.date));
        return [
          format(d, 'dd/MM/yyyy'),
          f.description,
          `R$ ${f.value.toFixed(2)}`,
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
        `R$ ${r.value.toFixed(2)}`
      ]);
    } else if (category === 'Orçamentos') {
      filteredData = budgets.filter(b => isMatch(b.createdAt));
      tableHeaders = ['Número', 'Cliente', 'Valor', 'Status'];
      tableRows = filteredData.map(b => [
        formatRecordNumber(b.number, b.createdAt),
        b.clientName,
        `R$ ${b.total.toFixed(2)}`,
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
                  <SelectValue />
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
    </div>
  );
}

// --- Dashboard Component ---

function Dashboard({ visits, financials, budgets, clients, onNavigate }: { visits: TechnicalVisit[], financials: FinancialRecord[], budgets: Budget[], clients: Client[], onNavigate: (tab: string) => void }) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyFinancials = financials.filter(f => {
      const d = f.date instanceof Timestamp ? f.date.toDate() : new Date(f.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthlyFinancials.filter(f => f.type === 'Receita').reduce((acc, f) => acc + f.value, 0);
    const expense = monthlyFinancials.filter(f => f.type === 'Despesa').reduce((acc, f) => acc + f.value, 0);
    
    // Day Stats
    const todayStr = format(now, 'yyyy-MM-dd');
    const todayFinancials = financials.filter(f => {
      const d = f.date instanceof Timestamp ? f.date.toDate() : new Date(f.date);
      return format(d, 'yyyy-MM-dd') === todayStr;
    });
    
    const todayIncome = todayFinancials.filter(f => f.type === 'Receita').reduce((acc, f) => acc + f.value, 0);
    const todayExpense = todayFinancials.filter(f => f.type === 'Despesa').reduce((acc, f) => acc + f.value, 0);
    const todayBalance = todayIncome - todayExpense;

    const pendingVisits = visits.filter(v => v.status === 'Agendada' || v.status === 'Em Andamento').length;
    const completedVisits = visits.filter(v => v.status === 'Concluída').length;
    const pendingBudgets = budgets.filter(b => b.status === 'Pendente').length;
    const totalClients = clients.length;

    const todayVisits = visits.filter(v => {
      const d = v.date instanceof Timestamp ? v.date.toDate() : new Date(v.date);
      return format(d, 'yyyy-MM-dd') === todayStr && (v.status === 'Agendada' || v.status === 'Em Andamento');
    });

    return { income, expense, balance: income - expense, todayBalance, pendingVisits, completedVisits, pendingBudgets, totalClients, todayVisits };
  }, [visits, financials, budgets, clients]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, 'dd/MM');
    });

    return last7Days.map(day => {
      const dayFinancials = financials.filter(f => {
        const d = f.date instanceof Timestamp ? f.date.toDate() : new Date(f.date);
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
      value: visits.filter(v => v.type === type).length
    })).filter(t => t.value > 0);
  }, [visits]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#71717a'];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Visitas Agendadas" value={stats.pendingVisits} icon={<CalendarIcon className="text-[#3b82f6]" />} trend={`${stats.completedVisits} concluídas`} isCount />
        <StatCard title="Orçamentos Pendentes" value={stats.pendingBudgets} icon={<FileText className="text-[#f59e0b]" />} trend="Aguardando aprovação" isCount />
        <Card className={cn(
          "border-[#2d3139] p-6 rounded-xl",
          stats.todayBalance >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
        )}>
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
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
          <CardHeader className="border-b border-[#2d3139] px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-[15px] font-semibold text-white">Cronograma de Visitas (Hoje)</CardTitle>
            <span 
              className="text-[12px] text-[#3b82f6] cursor-pointer hover:underline"
              onClick={() => onNavigate('visits')}
            >
              Ver Mapa
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#25282e]">
              {stats.todayVisits.slice(0, 5).map(visit => (
                <div key={visit.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#25282e]/30 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#3b82f6]">{formatRecordNumber(visit.number, visit.date)}</span>
                      <span className="text-[13px] font-medium text-white">{visit.clientName}</span>
                      {visit.scheduledTime && (
                        <span className="text-[10px] text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded">
                          {visit.scheduledTime}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#71717a] mt-0.5">{visit.type} • {visit.description || 'Manutenção Geral'}</span>
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-semibold uppercase px-2 py-0.5 rounded",
                    visit.status === 'Em Andamento' ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {visit.status === 'Em Andamento' ? 'Em Rota' : visit.status}
                  </Badge>
                </div>
              ))}
              {stats.todayVisits.length === 0 && (
                <p className="text-center py-12 text-sm text-[#71717a]">Nenhuma visita para hoje.</p>
              )}
            </div>
          </CardContent>
        </Card>

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
                      <span className="text-[13px] font-medium text-white">{budget.clientName}</span>
                      <span className="text-[11px] font-semibold text-white mt-0.5">R$ {budget.total.toFixed(2)}</span>
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

function StatCard({ title, value, icon, trend, isBalance, isCount }: { title: string, value: number, icon: React.ReactNode, trend?: string, isBalance?: boolean, isCount?: boolean }) {
  return (
    <Card className="border-[#2d3139] bg-[#1a1d23] p-6 rounded-xl">
      <div className="text-[12px] text-[#71717a] mb-2 font-medium">{title}</div>
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

function VisitsManager({ visits, user, clients, appSettings, pixSettings }: { visits: TechnicalVisit[], user: FirebaseUser, clients: Client[], appSettings: AppSettings, pixSettings: PixSettings }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<TechnicalVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<TechnicalVisit | null>(null);
  const [viewingVisit, setViewingVisit] = useState<TechnicalVisit | null>(null);
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
      
      await addDoc(collection(db, 'visits'), {
        ...newVisit,
        number: nextNumber,
        date: Timestamp.fromDate(newVisit.date instanceof Date ? newVisit.date : new Date()),
        expectedDate: Timestamp.fromDate(newVisit.expectedDate instanceof Date ? newVisit.expectedDate : new Date()),
        technicianId: user.uid,
        technicianName: newVisit.technicianName || user.displayName || 'Técnico',
        createdAt: Timestamp.now()
      });
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

  const updateStatus = async (id: string, status: TechnicalVisit['status']) => {
    try {
      const visit = visits.find(v => v.id === id);
      if (!visit) return;
      
      const oldStatus = visit.status;
      await updateDoc(doc(db, 'visits', id), { status });
      
      if (status === 'Concluída' && oldStatus !== 'Concluída') {
        const client = visit.clientId ? clients.find(c => c.id === visit.clientId) : clients.find(c => c.name === visit.clientName);
        
        // 1. Create Receipt Data
        const receiptData = {
          clientName: visit.clientName,
          clientType: client?.type || 'Avulso',
          serviceSpecification: visit.description || visit.type,
          value: visit.totalValue || 0,
          paymentMethod: 'PIX' as const, 
          date: Timestamp.now(),
          createdAt: Timestamp.now(),
          visitId: id,
          clientId: visit.clientId || client?.id || null
        };

        const receiptRef = await addDoc(collection(db, 'receipts'), receiptData);

        // 2. Automatically generate PDF for the automated receipt
        const fullReceipt = { id: receiptRef.id, ...receiptData } as Receipt;
        generateReceiptPDF(fullReceipt, appSettings, pixSettings);

        // 3. Create Financial Record
        await addDoc(collection(db, 'financial'), {
          type: 'Receita',
          category: 'Visita Técnica',
          description: `Serviço Concluído ${formatRecordNumber(visit.number, visit.date)} - ${visit.clientName} (${visit.type})`,
          value: visit.totalValue || 0,
          date: Timestamp.now(),
          serviceType: 'Serviço Normal',
          visitId: id,
          clientId: visit.clientId || client?.id || null,
          createdAt: Timestamp.now()
        });
        
        toast.success('Recibo emitido e financeiro atualizado!');
      }
      
      toast.success(`Status atualizado para ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'visits');
    }
  };

  const handleUpdateVisit = async () => {
    if (!editingVisit || !editingVisit.clientName || !editingVisit.address) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const { id, ...data } = editingVisit;
      await updateDoc(doc(db, 'visits', id), {
        ...data,
        date: editingVisit.date instanceof Date ? Timestamp.fromDate(editingVisit.date) : editingVisit.date,
        expectedDate: editingVisit.expectedDate instanceof Date ? Timestamp.fromDate(editingVisit.expectedDate) : editingVisit.expectedDate
      });
      setEditingVisit(null);
      setIsEditOpen(false);
      toast.success('Visita atualizada com sucesso!');
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
        doc.addImage(appSettings.logoUrl, 'PNG', 20, 10, 30, 30);
      } catch (e) {
        console.error("Erro ao adicionar logo ao PDF:", e);
      }
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(appSettings.companyName || 'AF Sistemas de Segurança e Informática', 105, 25, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`RELATÓRIO DE VISITA TÉCNICA ${formatRecordNumber(visit.number, visit.date)}`, 105, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data Agendada: ${dateStr}${visit.scheduledTime ? ` às ${visit.scheduledTime}` : ''}`, 20, 50);
    
    let currentLineY = 57;

    if (visit.expectedDate) {
      const expDateStr = format(visit.expectedDate instanceof Timestamp ? visit.expectedDate.toDate() : new Date(visit.expectedDate), 'dd/MM/yyyy');
      doc.text(`Data Prevista: ${expDateStr}${visit.expectedTime ? ` às ${visit.expectedTime}` : ''}`, 20, currentLineY);
      currentLineY += 7;
    }
    
    doc.text(`Técnico Responsável: ${visit.technicianName}`, 20, currentLineY);
    
    doc.line(20, currentLineY + 6, 190, currentLineY + 6);
    
    // Client Info
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, currentLineY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${visit.clientName}`, 20, currentLineY + 23);
    doc.text(`Endereço: ${visit.address}`, 20, currentLineY + 30);
    doc.text(`Telefone: ${visit.clientPhone || 'N/A'}`, 20, currentLineY + 37);
    doc.text(`Responsável no Local: ${visit.responsibleName || 'N/A'}`, 20, currentLineY + 44);
    
    doc.line(20, currentLineY + 50, 190, currentLineY + 50);
    
    // Service Info
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO SERVIÇO', 20, currentLineY + 57);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo de Sistema: ${visit.type}`, 20, currentLineY + 64);
    doc.text(`Status: ${visit.status}`, 20, currentLineY + 71);
    
    doc.text('Descrição do Serviço/Problema:', 20, currentLineY + 81);
    const splitDesc = doc.splitTextToSize(visit.description || 'N/A', 170);
    doc.text(splitDesc, 20, currentLineY + 81);
    
    let currentY = currentLineY + 81 + (splitDesc.length * 5) + 10;

    if (visit.observations) {
      doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 20, currentY);
      doc.setFont('helvetica', 'normal');
      const splitObs = doc.splitTextToSize(visit.observations, 170);
      doc.text(splitObs, 20, currentY + 7);
      currentY += (splitObs.length * 5) + 15;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text(`VALOR DO SERVIÇO: R$ ${visit.totalValue.toFixed(2)}`, 20, currentY);
    
    // Signatures
    const signatureY = 260;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Technician Signature
    if (appSettings.signatureUrl) {
      try {
        doc.addImage(appSettings.signatureUrl, 'PNG', 35, signatureY - 20, 40, 15);
      } catch (e) {
        console.error("Erro ao adicionar assinatura à visita:", e);
      }
    }
    doc.line(25, signatureY, 90, signatureY);
    doc.text('Assinatura do Técnico', 57.5, signatureY + 5, { align: 'center' });
    doc.text(visit.technicianName, 57.5, signatureY + 10, { align: 'center' });
    
    // Client Signature
    doc.line(120, signatureY, 185, signatureY);
    doc.text('Assinatura do Cliente', 152.5, signatureY + 5, { align: 'center' });
    doc.text(visit.responsibleName || visit.clientName, 152.5, signatureY + 10, { align: 'center' });
    
    doc.save(`visita_${visit.clientName.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Visitas Técnicas</h2>
          <p className="text-[#71717a]">Gerencie seus agendamentos e ordens de serviço.</p>
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
                        <SelectValue placeholder="Selecione" />
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
                    <Label className="text-[#a0a0a0]">Data e Hora Agendamento</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white", !newVisit.date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newVisit.date ? format(newVisit.date, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                        </Button>
                      } />
                      <PopoverContent className="w-auto p-0 bg-[#1a1d23] border-[#2d3139]">
                        <Calendar mode="single" selected={newVisit.date} onSelect={(date) => setNewVisit({...newVisit, date})} initialFocus className="bg-[#1a1d23] text-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime" className="text-[#a0a0a0]">Hora Agendamento</Label>
                    <Input id="scheduledTime" type="time" value={newVisit.scheduledTime || ''} onChange={e => setNewVisit({...newVisit, scheduledTime: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data Prevista Visita</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white", !newVisit.expectedDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newVisit.expectedDate ? format(newVisit.expectedDate, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                        </Button>
                      } />
                      <PopoverContent className="w-auto p-0 bg-[#1a1d23] border-[#2d3139]">
                        <Calendar mode="single" selected={newVisit.expectedDate} onSelect={(date) => setNewVisit({...newVisit, expectedDate: date})} initialFocus className="bg-[#1a1d23] text-white" />
                      </PopoverContent>
                    </Popover>
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

      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-[#25282e]/50">
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
            {visits.map((visit) => (
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
                  R$ {visit.totalValue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {visits.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#71717a] text-sm">
                  Nenhuma visita encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

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
                  <p className="text-[11px] text-[#71717a] uppercase">Tipo</p>
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
                  <p className="text-sm font-bold text-white">R$ {viewingVisit.totalValue.toFixed(2)}</p>
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
                        <SelectValue />
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
                    <Label className="text-[#a0a0a0]">Data e Hora Agendamento</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingVisit.date ? format(editingVisit.date as Date, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                        </Button>
                      } />
                      <PopoverContent className="w-auto p-0 bg-[#1a1d23] border-[#2d3139]">
                        <Calendar mode="single" selected={editingVisit.date as Date} onSelect={(date) => setEditingVisit({...editingVisit, date})} initialFocus className="bg-[#1a1d23] text-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editScheduledTime" className="text-[#a0a0a0]">Hora Agendamento</Label>
                    <Input id="editScheduledTime" type="time" value={editingVisit.scheduledTime || ''} onChange={e => setEditingVisit({...editingVisit, scheduledTime: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data Prevista Visita</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingVisit.expectedDate ? format(editingVisit.expectedDate as Date, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                        </Button>
                      } />
                      <PopoverContent className="w-auto p-0 bg-[#1a1d23] border-[#2d3139]">
                        <Calendar mode="single" selected={editingVisit.expectedDate as Date} onSelect={(date) => setEditingVisit({...editingVisit, expectedDate: date})} initialFocus className="bg-[#1a1d23] text-white" />
                      </PopoverContent>
                    </Popover>
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
                        <SelectValue />
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
    </div>
  );
}

// --- Financial Manager Component ---

function FinancialManager({ financials, visits, clients }: { financials: FinancialRecord[], visits: TechnicalVisit[], clients: Client[] }) {
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

      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-[#25282e]/50">
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
                  {record.type === 'Receita' ? '+' : '-'} R$ {record.value.toFixed(2)}
                </TableCell>
                <TableCell className="font-medium text-white text-[13px]">{record.description}</TableCell>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#3b82f6] text-white border-none shadow-lg shadow-blue-900/20">
          <CardContent className="p-6">
            <p className="text-xs text-blue-100 uppercase tracking-wider mb-1 font-semibold">Total em Caixa</p>
            <h3 className="text-3xl font-bold">
              R$ {financials.reduce((acc, f) => f.type === 'Receita' ? acc + f.value : acc - f.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl">
          <CardContent className="p-6">
            <p className="text-xs text-[#71717a] uppercase tracking-wider mb-1 font-semibold">Total Receitas</p>
            <h3 className="text-2xl font-bold text-[#10b981]">
              R$ {financials.filter(f => f.type === 'Receita').reduce((acc, f) => acc + f.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl">
          <CardContent className="p-6">
            <p className="text-xs text-[#71717a] uppercase tracking-wider mb-1 font-semibold">Total Despesas</p>
            <h3 className="text-2xl font-bold text-[#ef4444]">
              R$ {financials.filter(f => f.type === 'Despesa').reduce((acc, f) => acc + f.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

function BudgetsManager({ budgets, clients, appSettings, pixSettings }: { budgets: Budget[], clients: Client[], appSettings: AppSettings, pixSettings: PixSettings }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    items: [{ description: '', quantity: 1, price: 0 }],
    status: 'Pendente',
    observations: ''
  });

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
      const nextNumber = budgets.length > 0 ? Math.max(...budgets.map(b => b.number || 0)) + 1 : 1;
      
      await addDoc(collection(db, 'budgets'), {
        ...newBudget,
        number: nextNumber,
        total,
        createdAt: Timestamp.now()
      });
      setNewBudget({ items: [{ description: '', quantity: 1, price: 0 }], status: 'Pendente', observations: '', clientName: '', clientPhone: '', address: '' });
      setIsAddOpen(false);
      toast.success('Orçamento criado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
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
        doc.addImage(appSettings.logoUrl, 'PNG', 20, 10, 30, 30);
      } catch (e) {
        console.error("Erro ao adicionar logo ao PDF:", e);
      }
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(appSettings.companyName || 'AF Sistemas de Segurança e Informática', 105, 25, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`ORÇAMENTO DE SERVIÇOS ${formatRecordNumber(budget.number, budget.createdAt)}`, 105, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dateStr}`, 20, 50);
    doc.text(`Cliente: ${budget.clientName || 'Cliente Sem Nome'}`, 20, 57);
    doc.text(`WhatsApp: ${budget.clientPhone || 'N/A'}`, 20, 64);
    doc.text(`Endereço: ${budget.address || 'N/A'}`, 20, 71);
    
    doc.line(20, 77, 190, 77);
    
    // Items Table
    const tableData = budget.items.map(item => [
      item.description,
      item.quantity.toString(),
      `R$ ${item.price.toFixed(2)}`,
      `R$ ${(item.quantity * item.price).toFixed(2)}`
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
    doc.text(`VALOR TOTAL: R$ ${budget.total.toFixed(2)}`, 190, finalY, { align: 'right' });

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

    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    if (appSettings.signatureUrl) {
      try {
        doc.addImage(appSettings.signatureUrl, 'PNG', 80, finalY + 10, 50, 20);
      } catch (e) {
        console.error("Erro ao adicionar assinatura ao orçamento:", e);
      }
    }
    doc.line(70, finalY + 30, 140, finalY + 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(appSettings.responsible || appSettings.companyName, 105, finalY + 35, { align: 'center' });

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
                    {budget.status}
                  </Badge>
                  <span className="text-[10px] font-mono text-[#3b82f6]">{formatRecordNumber(budget.number, budget.createdAt)}</span>
                </div>
                <p className="text-[11px] text-[#71717a]">{format(budget.createdAt instanceof Timestamp ? budget.createdAt.toDate() : new Date(budget.createdAt), 'dd/MM/yyyy')}</p>
              </div>
              <CardTitle className="mt-3 text-[16px] font-bold text-white">{budget.clientName}</CardTitle>
              <CardDescription className="text-[#71717a] text-[12px]">{budget.clientPhone || 'Sem telefone'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                {budget.items.slice(0, 2).map((item, i) => (
                  <div key={i} className="flex justify-between text-[12px]">
                    <span className="text-[#a0a0a0] truncate mr-2">{item.quantity}x {item.description}</span>
                    <span className="font-medium text-[#e0e0e0]">R$ {(item.quantity * item.price).toFixed(2)}</span>
                  </div>
                ))}
                {budget.items.length > 2 && <p className="text-[10px] text-[#555]">+{budget.items.length - 2} itens...</p>}
              </div>
              <Separator className="my-4 bg-[#2d3139]" />
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-white">R$ {budget.total.toFixed(2)}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white text-[11px]" onClick={() => generateBudgetPDF(budget)}>
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 border-[#2d3139] text-[#10b981] hover:bg-[#10b981]/10 text-[11px]" onClick={() => {
                    generateBudgetPDF(budget);
                  }}>
                    <Share2 size={14} />
                  </Button>
                  {budget.status === 'Pendente' && (
                    <Button size="sm" className="h-8 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[11px]" onClick={() => handleApproveBudget(budget)}>
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
    </div>
  );
}
