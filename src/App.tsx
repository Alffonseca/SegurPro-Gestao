/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import 'jspdf-autotable';

import { db, auth, handleFirestoreError, OperationType, firebaseConfig } from './firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  totalValue: number;
  createdAt: any;
}

interface FinancialRecord {
  id: string;
  type: 'Receita' | 'Despesa';
  category: string;
  description: string;
  value: number;
  date: any;
  visitId?: string;
  clientId?: string;
  serviceType?: 'Contrato' | 'Serviço Normal';
  createdAt?: any;
}

interface Budget {
  id: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  items: { description: string; quantity: number; price: number }[];
  total: number;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  observations?: string;
  createdAt: any;
}

interface Client {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  document?: string; // CPF or CNPJ
  type: 'Avulso' | 'Contrato';
  contractValue?: number;
  serviceSpecification?: string;
  createdAt: any;
}

interface Receipt {
  id: string;
  clientId?: string;
  visitId?: string;
  clientName: string;
  clientType?: 'Avulso' | 'Contrato';
  serviceSpecification: string;
  value: number;
  referenceMonth?: string;
  paymentMethod: 'Dinheiro' | 'PIX' | 'Cartão';
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
  doc.text(appSettings.companyName || 'AF Sistemas de Segurança e Informática-ME', 190, 20, { align: 'right' });
  
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
  doc.setFont('helvetica', 'bold');
  if (!isContract) {
    doc.text('Subtotal serviços', 20, servicesY + 40);
    doc.text(formattedVal, 190, servicesY + 40, { align: 'right' });
  }
  
  doc.setFillColor(120, 120, 120);
  doc.rect(100, servicesY + 50, 90, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('Total', 105, servicesY + 57);
  doc.text(formattedVal, 185, servicesY + 57, { align: 'right' });
  
  // PIX Info
  if (pixSettings && pixSettings.key) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados para Pagamento (PIX):', 20, servicesY + 70);
    doc.setFont('helvetica', 'normal');
    doc.text(`Chave: ${pixSettings.key} | Banco: ${pixSettings.bank}`, 20, servicesY + 75);
    doc.text(`Favorecido: ${pixSettings.favored} | CPF: ${pixSettings.document}`, 20, servicesY + 80);
  }

  // Observations
  if (receipt.observations) {
    const obsY = servicesY + (pixSettings && pixSettings.key ? 90 : 70);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 20, obsY);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(receipt.observations, 170);
    doc.text(splitObs, 20, obsY + 5);
  }

  // 6. Signature
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

interface PixSettings {
  key: string;
  bank: string;
  favored: string;
  document: string;
}

interface AppSettings {
  logoUrl: string;
  companyName: string;
}

// --- Components ---

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
    key: '',
    bank: '',
    favored: '',
    document: ''
  });
  const [appSettings, setAppSettings] = useState<AppSettings>({
    logoUrl: '',
    companyName: 'AF Sistemas de Segurança e Informática'
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
          setPixSettings(snapshot.data() as PixSettings);
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

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Login realizado com sucesso!');
      } else {
        if (!displayName) {
          toast.error('Informe seu nome.');
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        toast.success('Conta criada com sucesso!');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('A senha deve ter pelo menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('E-mail ou senha incorretos.');
      } else {
        toast.error('Erro na autenticação.');
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
                  <Label htmlFor="auth-email" className="text-[#a0a0a0]">E-mail</Label>
                  <Input 
                    id="auth-email" 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="seu@email.com"
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
        <div className="flex h-20 items-center px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b82f6] text-white">
              <CheckCircle2 size={18} />
            </div>
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
                label="Usuários" 
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
              label="Relatórios Diários" 
              active={false} 
              onClick={() => {}} 
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
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b82f6] text-white">
            <CheckCircle2 size={18} />
          </div>
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
        <header className="hidden md:flex h-20 items-center justify-between px-10 border-b border-[#2d3139] bg-[#1a1d23]">
          <div>
            <p className="text-[11px] text-[#71717a] uppercase tracking-widest mb-1">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <h2 className="text-2xl font-medium text-white capitalize">{activeTab === 'dashboard' ? 'Resumo Operacional' : activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
              <Input className="pl-9 w-64 bg-[#0f1115] border-[#2d3139] text-white focus:ring-[#3b82f6] transition-all" placeholder="Pesquisar..." />
            </div>
            <Button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white h-9 px-4 text-xs font-semibold">
              <Plus size={16} className="mr-1" /> Nova Visita
            </Button>
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
          {activeTab === 'budgets' && <BudgetsManager budgets={budgets} clients={clients} appSettings={appSettings} />}
          {activeTab === 'clients' && <ClientsManager clients={clients} />}
          {activeTab === 'receipts' && <ReceiptsManager receipts={receipts} clients={clients} pixSettings={pixSettings} appSettings={appSettings} />}
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
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
      await updateProfile(userCredential.user, { displayName: newUser.name });
      
      // Add to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: newUser.email,
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Gestão de Usuários</h2>
          <p className="text-[#71717a]">Cadastre e gerencie os acessos ao sistema.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              <Plus size={18} />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Cadastrar Novo Usuário</DialogTitle>
              <DialogDescription className="text-[#71717a]">
                Crie um novo acesso para técnico ou administrador.
              </DialogDescription>
            </DialogHeader>
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
                <Label htmlFor="user-email" className="text-[#a0a0a0]">E-mail</Label>
                <Input 
                  id="user-email" 
                  type="email"
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})} 
                  placeholder="email@exemplo.com"
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
            <DialogFooter>
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
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Usuário</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">E-mail</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Nível</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Data Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
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

function ClientsManager({ clients }: { clients: Client[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClient, setNewClient] = useState<Partial<Client>>({
    type: 'Avulso'
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

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
      await addDoc(collection(db, 'clients'), {
        name: newClient.name || '',
        email: newClient.email || '',
        phone: newClient.phone || '',
        address: newClient.address || '',
        document: newClient.document || '',
        ...newClient,
        type: newClient.type || 'Avulso',
        contractValue: newClient.type === 'Contrato' ? Number(newClient.contractValue || 0) : 0,
        createdAt: Timestamp.now()
      });
      setNewClient({ type: 'Avulso' });
      setIsAddOpen(false);
      toast.success('Cliente cadastrado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;

    try {
      const { id, ...data } = editingClient;
      await updateDoc(doc(db, 'clients', id), {
        ...data,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        document: data.document || '',
        contractValue: data.type === 'Contrato' ? Number(data.contractValue || 0) : 0
      });
      setEditingClient(null);
      setIsEditOpen(false);
      toast.success('Cliente atualizado com sucesso!');
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
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
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
              <div className="space-y-2">
                <Label htmlFor="document" className="text-[#a0a0a0]">CPF / CNPJ</Label>
                <Input id="document" value={newClient.document || ''} onChange={e => setNewClient({...newClient, document: e.target.value})} placeholder="000.000.000-00" className="bg-[#0f1115] border-[#2d3139] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-[#a0a0a0]">Endereço</Label>
                <Input id="address" value={newClient.address || ''} onChange={e => setNewClient({...newClient, address: e.target.value})} placeholder="Rua, Número, Bairro, Cidade" className="bg-[#0f1115] border-[#2d3139] text-white" />
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
                <div className="space-y-2">
                  <Label htmlFor="serviceSpecification" className="text-[#a0a0a0]">Especificação do Serviço</Label>
                  <Input id="serviceSpecification" value={newClient.serviceSpecification || ''} onChange={e => setNewClient({...newClient, serviceSpecification: e.target.value})} placeholder="Ex: Manutenção mensal de 16 câmeras" className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleAddClient} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Cliente</DialogTitle>
          </DialogHeader>
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
              <div className="space-y-2">
                <Label htmlFor="edit-document" className="text-[#a0a0a0]">CPF / CNPJ</Label>
                <Input id="edit-document" value={editingClient.document || ''} onChange={e => setEditingClient({...editingClient, document: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address" className="text-[#a0a0a0]">Endereço</Label>
                <Input id="edit-address" value={editingClient.address || ''} onChange={e => setEditingClient({...editingClient, address: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
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
              {editingClient.type === 'Contrato' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-serviceSpecification" className="text-[#a0a0a0]">Especificação do Serviço</Label>
                  <Input id="edit-serviceSpecification" value={editingClient.serviceSpecification || ''} onChange={e => setEditingClient({...editingClient, serviceSpecification: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button onClick={handleUpdateClient} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-[#25282e]/50">
            <TableRow className="border-[#2d3139] hover:bg-transparent">
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Nome / Tipo</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Contato</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Contrato / Serviço</TableHead>
              <TableHead className="text-right text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                <TableCell>
                  <div className="font-medium text-white text-[13px]">{client.name || 'Cliente Sem Nome'}</div>
                  <Badge variant="outline" className={cn(
                    "mt-1 text-[10px] h-5",
                    client.type === 'Contrato' ? "border-[#10b981] text-[#10b981]" : "border-[#71717a] text-[#71717a]"
                  )}>
                    {client.type || 'Avulso'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-[12px] text-[#e0e0e0]">{client.email || 'N/A'}</div>
                  <div className="text-[11px] text-[#71717a]">{client.phone || 'N/A'}</div>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
  const [newReceipt, setNewReceipt] = useState<Partial<Receipt>>({
    date: new Date(),
    value: 0,
    paymentMethod: 'PIX',
    clientType: 'Avulso',
    referenceMonth: format(new Date(), 'MMMM/yyyy', { locale: ptBR }),
    observations: ''
  });

  const filteredClientsForSelect = useMemo(() => {
    return clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const handleAddReceipt = async () => {
    if (!newReceipt.clientName || !newReceipt.value || !newReceipt.paymentMethod) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const receiptData = {
        ...newReceipt,
        date: Timestamp.fromDate(newReceipt.date instanceof Date ? newReceipt.date : new Date()),
        createdAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'receipts'), receiptData);
      
      // Generate PDF automatically
      const fullReceipt = { id: docRef.id, ...receiptData } as Receipt;
      generateReceiptPDF(fullReceipt, appSettings, pixSettings);
      
      setNewReceipt({ 
        date: new Date(), 
        value: 0, 
        paymentMethod: 'PIX',
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
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Gerar Novo Recibo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-[#a0a0a0]">Selecionar Cliente Existente (Opcional)</Label>
                <Select onValueChange={(clientId) => {
                  const client = clients.find(c => c.id === clientId);
                  if (client) {
                    setNewReceipt({
                      ...newReceipt,
                      clientName: client.name,
                      clientType: client.type || 'Avulso',
                      serviceSpecification: client.type === 'Contrato' ? (client.serviceSpecification || '') : '',
                      value: client.type === 'Contrato' ? (client.contractValue || 0) : 0
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
                <Label htmlFor="receiptObs" className="text-[#a0a0a0]">Observações do Recibo</Label>
                <Input id="receiptObs" value={newReceipt.observations || ''} onChange={e => setNewReceipt({...newReceipt, observations: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
              </div>
            </div>
            <DialogFooter className="flex flex-row justify-between sm:justify-between">
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

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Editar Recibo</DialogTitle>
            </DialogHeader>
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
                  <Label htmlFor="editReceiptObs" className="text-[#a0a0a0]">Observações do Recibo</Label>
                  <Input id="editReceiptObs" value={editingReceipt.observations || ''} onChange={e => setEditingReceipt({...editingReceipt, observations: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              </div>
            )}
            <DialogFooter className="flex flex-row justify-between sm:justify-between">
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
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Data</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Cliente</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Serviço</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Valor</TableHead>
              <TableHead className="text-right text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.map((receipt) => (
              <TableRow key={receipt.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
              </TableRow>
            ))}
            {receipts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[#71717a] text-sm">
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
  const [localPix, setLocalPix] = useState<PixSettings>(pixSettings);
  const [localApp, setLocalApp] = useState<AppSettings>(appSettings);
  const [newDisplayName, setNewDisplayName] = useState(user.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    setLocalPix(pixSettings);
  }, [pixSettings]);

  useEffect(() => {
    setLocalApp(appSettings);
  }, [appSettings]);

  const handleSavePix = async () => {
    try {
      await setDoc(doc(db, 'settings', 'pix'), localPix);
      toast.success('Configurações de PIX salvas!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/pix');
    }
  };

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

        <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="text-[#3b82f6]" size={20} />
              Dados para Pagamento (PIX)
            </CardTitle>
            <CardDescription className="text-[#71717a]">
              Estes dados aparecerão nos recibos gerados pelo sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pixKey" className="text-[#a0a0a0]">Chave PIX</Label>
              <Input 
                id="pixKey" 
                value={localPix.key} 
                onChange={e => setLocalPix({...localPix, key: e.target.value})} 
                placeholder="E-mail, CPF, CNPJ ou Celular"
                className="bg-[#0f1115] border-[#2d3139] text-white" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pixBank" className="text-[#a0a0a0]">Banco</Label>
              <Input 
                id="pixBank" 
                value={localPix.bank} 
                onChange={e => setLocalPix({...localPix, bank: e.target.value})} 
                placeholder="Ex: Nubank, Itaú, etc."
                className="bg-[#0f1115] border-[#2d3139] text-white" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pixFavored" className="text-[#a0a0a0]">Favorecido</Label>
              <Input 
                id="pixFavored" 
                value={localPix.favored} 
                onChange={e => setLocalPix({...localPix, favored: e.target.value})} 
                placeholder="Nome completo do titular"
                className="bg-[#0f1115] border-[#2d3139] text-white" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pixDoc" className="text-[#a0a0a0]">CPF/CNPJ do Favorecido</Label>
              <Input 
                id="pixDoc" 
                value={localPix.document} 
                onChange={e => setLocalPix({...localPix, document: e.target.value})} 
                placeholder="000.000.000-00"
                className="bg-[#0f1115] border-[#2d3139] text-white" 
              />
            </div>
            <Button onClick={handleSavePix} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              Salvar Dados PIX
            </Button>
          </CardContent>
        </Card>
      </div>
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

    return { income, expense, balance: income - expense, todayBalance, pendingVisits, completedVisits, pendingBudgets, totalClients };
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
              {visits.filter(v => v.status === 'Agendada' || v.status === 'Em Andamento').slice(0, 5).map(visit => (
                <div key={visit.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#25282e]/30 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
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
              {visits.filter(v => v.status === 'Agendada' || v.status === 'Em Andamento').length === 0 && (
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
      await addDoc(collection(db, 'visits'), {
        ...newVisit,
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
          description: `Serviço Concluído - ${visit.clientName} (${visit.type})`,
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
    doc.text('RELATÓRIO DE VISITA TÉCNICA', 105, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (createdStr) {
      doc.text(`Data de Lançamento: ${createdStr}`, 20, 50);
      doc.text(`Data Agendada: ${dateStr}${visit.scheduledTime ? ` às ${visit.scheduledTime}` : ''}`, 20, 57);
    } else {
      doc.text(`Data Agendada: ${dateStr}${visit.scheduledTime ? ` às ${visit.scheduledTime}` : ''}`, 20, 50);
    }
    
    let currentLineY = createdStr ? 64 : 57;

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
    
    doc.line(20, currentLineY + 43, 190, currentLineY + 43);
    
    // Service Info
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DO SERVIÇO', 20, currentLineY + 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo de Sistema: ${visit.type}`, 20, currentLineY + 57);
    doc.text(`Status: ${visit.status}`, 20, currentLineY + 64);
    
    doc.text('Descrição do Serviço/Problema:', 20, currentLineY + 74);
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
    doc.line(25, signatureY, 90, signatureY);
    doc.text('Assinatura do Técnico', 57.5, signatureY + 5, { align: 'center' });
    doc.text(visit.technicianName, 57.5, signatureY + 10, { align: 'center' });
    
    // Client Signature
    doc.line(120, signatureY, 185, signatureY);
    doc.text('Assinatura do Cliente', 152.5, signatureY + 5, { align: 'center' });
    doc.text(visit.clientName, 152.5, signatureY + 10, { align: 'center' });
    
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
          <DialogContent className="sm:max-w-[500px] bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Agendar Nova Visita</DialogTitle>
              <DialogDescription className="text-[#71717a]">Preencha os detalhes do cliente e do serviço.</DialogDescription>
            </DialogHeader>
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
                      address: client.address
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
                  <Label htmlFor="val" className="text-[#a0a0a0]">Valor Estimado (R$)</Label>
                  <Input id="val" type="number" value={newVisit.totalValue || ''} onChange={e => setNewVisit({...newVisit, totalValue: Number(e.target.value)})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              </div>
            </div>
            <DialogFooter>
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
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Cliente</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Agendamento</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Serviço</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Status</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Valor</TableHead>
              <TableHead className="text-right text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => (
              <TableRow key={visit.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                <TableCell>
                  <div className="font-medium text-white text-[13px]">{visit.clientName}</div>
                  <div className="text-[11px] text-[#71717a]">{visit.clientPhone}</div>
                </TableCell>
                <TableCell className="text-[12px] text-[#e0e0e0]">
                  <div>{format(visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date), 'dd/MM/yyyy')}</div>
                  {visit.scheduledTime && <div className="text-[10px] text-[#71717a]">{visit.scheduledTime}</div>}
                </TableCell>
                <TableCell>
                  <Badge className="bg-[#2d3139] text-[#e0e0e0] font-normal text-[10px] uppercase tracking-wider">{visit.type}</Badge>
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
                <TableCell className="text-[12px] font-semibold text-white">
                  R$ {visit.totalValue.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => {
                      setViewingVisit({
                        ...visit,
                        date: visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date),
                        expectedDate: visit.expectedDate ? (visit.expectedDate instanceof Timestamp ? visit.expectedDate.toDate() : new Date(visit.expectedDate)) : null,
                        createdAt: visit.createdAt instanceof Timestamp ? visit.createdAt.toDate() : (visit.createdAt ? new Date(visit.createdAt) : null)
                      });
                      setIsViewOpen(true);
                    }}>
                      <Eye size={14} />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => {
                      setEditingVisit({
                        ...visit,
                        date: visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date),
                        expectedDate: visit.expectedDate ? (visit.expectedDate instanceof Timestamp ? visit.expectedDate.toDate() : new Date(visit.expectedDate)) : (visit.date instanceof Timestamp ? visit.date.toDate() : new Date(visit.date))
                      });
                      setIsEditOpen(true);
                    }}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => generateVisitPDF(visit)}>
                      <Share2 size={14} />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                      setVisitToDelete(visit);
                      setIsDeleteConfirmOpen(true);
                    }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
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
                  <p className="text-[11px] text-[#71717a] uppercase">Data da Visita</p>
                  <p className="text-sm font-medium">
                    {format(viewingVisit.date, "PPP", { locale: ptBR })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Hora Programada</p>
                  <p className="text-sm font-medium">{viewingVisit.scheduledTime || 'Não informada'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Data Lançamento</p>
                  <p className="text-[12px] text-[#71717a] italic">
                    {viewingVisit.createdAt ? format(viewingVisit.createdAt, "PPP 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-[#71717a] uppercase">Técnico</p>
                  <p className="text-sm font-medium">{viewingVisit.technicianName}</p>
                </div>
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
        <DialogContent className="sm:max-w-[500px] bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Visita</DialogTitle>
          </DialogHeader>
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
              <div className="space-y-2">
                <Label htmlFor="editTechName" className="text-[#a0a0a0]">Nome do Técnico</Label>
                <Input id="editTechName" value={editingVisit.technicianName || ''} onChange={e => setEditingVisit({...editingVisit, technicianName: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editObservations" className="text-[#a0a0a0]">Observações Internas / Adicionais</Label>
                <Input id="editObservations" value={editingVisit.observations || ''} onChange={e => setEditingVisit({...editingVisit, observations: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
              </div>
            </div>
          )}
          <DialogFooter>
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
    if (!editingRecord || !editingRecord.description || !editingRecord.value) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const { id, ...data } = editingRecord;
      await updateDoc(doc(db, 'financial', id), {
        ...data,
        date: editingRecord.date instanceof Date ? Timestamp.fromDate(editingRecord.date) : editingRecord.date
      });
      setEditingRecord(null);
      setIsEditOpen(false);
      toast.success('Registro financeiro atualizado!');
    } catch (error) {
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
        description: client.type === 'Contrato' ? (client.serviceSpecification || 'Serviço de Contrato') : `Serviço - ${client.name}`,
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
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              <Plus size={18} />
              Novo Lançamento
            </Button>
          } />
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Lançamento Financeiro</DialogTitle>
            </DialogHeader>
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
                <div className="grid grid-cols-2 gap-4">
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
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-[#a0a0a0]">Descrição</Label>
                <Input id="desc" value={newRecord.description || ''} onChange={e => setNewRecord({...newRecord, description: e.target.value})} placeholder="Ex: Pagamento Instalação CFTV" className="bg-[#0f1115] border-[#2d3139] text-white" />
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleAddRecord} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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

      <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-[#25282e]/50">
            <TableRow className="border-[#2d3139] hover:bg-transparent">
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Data</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Descrição</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Origem</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Categoria</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Tipo</TableHead>
              <TableHead className="text-right text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Valor</TableHead>
              <TableHead className="text-right text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {financials.map((record) => (
              <TableRow key={record.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-colors">
                <TableCell className="text-[12px] text-[#e0e0e0]">
                  {format(record.date instanceof Timestamp ? record.date.toDate() : new Date(record.date), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="font-medium text-white text-[13px]">{record.description}</TableCell>
                <TableCell>
                  {record.serviceType && (
                    <Badge className={cn(
                      "font-normal text-[10px] uppercase tracking-wider",
                      record.serviceType === 'Contrato' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {record.serviceType}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className="bg-[#2d3139] text-[#e0e0e0] font-normal text-[10px] uppercase tracking-wider">{record.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn(
                    "text-[10px] font-semibold uppercase px-2 py-0.5 rounded",
                    record.type === 'Receita' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {record.type}
                  </Badge>
                </TableCell>
                <TableCell className={cn(
                  "text-right font-bold text-[13px]",
                  record.type === 'Receita' ? "text-[#10b981]" : "text-[#ef4444]"
                )}>
                  {record.type === 'Receita' ? '+' : '-'} R$ {record.value.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
              </TableRow>
            ))}
            {financials.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-[#71717a] text-sm">
                  Nenhuma transação registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Record Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Lançamento</DialogTitle>
          </DialogHeader>
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
                  <Input id="edit-cat" value={editingRecord.category || ''} onChange={e => setEditingRecord({...editingRecord, category: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
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
          <DialogFooter>
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

function BudgetsManager({ budgets, clients, appSettings }: { budgets: Budget[], clients: Client[], appSettings: AppSettings }) {
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
      await addDoc(collection(db, 'budgets'), {
        ...newBudget,
        total,
        createdAt: Timestamp.now()
      });
      setNewBudget({ items: [{ description: '', quantity: 1, price: 0 }], status: 'Pendente', observations: '' });
      setIsAddOpen(false);
      toast.success('Orçamento criado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
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
    doc.text('ORÇAMENTO DE SERVIÇOS', 105, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dateStr}`, 20, 50);
    doc.text(`Cliente: ${budget.clientName || 'Cliente Sem Nome'}`, 20, 57);
    doc.text(`Email: ${budget.clientEmail || 'N/A'}`, 20, 64);
    
    doc.line(20, 70, 190, 70);
    
    // Items Table
    const tableData = budget.items.map(item => [
      item.description,
      item.quantity.toString(),
      `R$ ${item.price.toFixed(2)}`,
      `R$ ${(item.quantity * item.price).toFixed(2)}`
    ]);

    (doc as any).autoTable({
      startY: 75,
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
    
    if (budget.observations) {
      finalY += 15;
      doc.setFontSize(10);
      doc.text('Observações:', 20, finalY);
      doc.setFont('helvetica', 'normal');
      const splitObs = doc.splitTextToSize(budget.observations, 170);
      doc.text(splitObs, 20, finalY + 7);
      finalY += (splitObs.length * 5) + 10;
    }

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
          <DialogContent className="sm:max-w-[600px] bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Orçamento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-[#a0a0a0]">Selecionar Cliente Existente (Opcional)</Label>
                <Select onValueChange={(clientId) => {
                  const client = clients.find(c => c.id === clientId);
                  if (client) {
                    setNewBudget({
                      ...newBudget,
                      clientName: client.name,
                      clientEmail: client.email
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
                  <Label className="text-[#a0a0a0]">Email</Label>
                  <Input value={newBudget.clientEmail || ''} onChange={e => setNewBudget({...newBudget, clientEmail: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
              </div>
              <Separator className="bg-[#2d3139]" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[#a0a0a0]">Itens do Orçamento</Label>
                  <Button variant="outline" size="sm" onClick={handleAddItem} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Adicionar Item</Button>
                </div>
                <ScrollArea className="h-[200px] pr-4">
                  {(newBudget.items || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                      <div className="col-span-6">
                        <Input placeholder="Descrição" value={item.description} onChange={e => {
                          const items = [...(newBudget.items || [])];
                          items[idx].description = e.target.value;
                          setNewBudget({...newBudget, items});
                        }} className="bg-[#0f1115] border-[#2d3139] text-white" />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" placeholder="Qtd" value={item.quantity} onChange={e => {
                          const items = [...(newBudget.items || [])];
                          items[idx].quantity = Number(e.target.value);
                          setNewBudget({...newBudget, items});
                        }} className="bg-[#0f1115] border-[#2d3139] text-white" />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" placeholder="Preço" value={item.price} onChange={e => {
                          const items = [...(newBudget.items || [])];
                          items[idx].price = Number(e.target.value);
                          setNewBudget({...newBudget, items});
                        }} className="bg-[#0f1115] border-[#2d3139] text-white" />
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="icon" className="text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
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
            <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-[#2d3139] pt-4">
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
                <Badge className={cn(
                  "text-[10px] font-semibold uppercase px-2 py-0.5 rounded",
                  budget.status === 'Aprovado' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {budget.status}
                </Badge>
                <p className="text-[11px] text-[#71717a]">{format(budget.createdAt instanceof Timestamp ? budget.createdAt.toDate() : new Date(budget.createdAt), 'dd/MM/yyyy')}</p>
              </div>
              <CardTitle className="mt-3 text-[16px] font-bold text-white">{budget.clientName}</CardTitle>
              <CardDescription className="text-[#71717a] text-[12px]">{budget.clientEmail}</CardDescription>
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
                    <Button size="sm" className="h-8 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[11px]" onClick={async () => {
                      await updateDoc(doc(db, 'budgets', budget.id), { status: 'Aprovado' });
                      toast.success('Orçamento aprovado!');
                    }}>
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
