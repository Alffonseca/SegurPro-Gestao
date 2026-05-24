/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Plus, 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  DollarSign, 
  CreditCard,
  FileText, 
  LogOut, 
  Search,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  User,
  Minus,
  Zap,
  Pencil,
  Eye,
  EyeOff,
  User as UserIcon,
  Receipt as ReceiptIcon,
  Share2,
  ExternalLink,
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
  LayoutGrid,
  List,
  UserCog,
  Activity,
  Percent,
  Loader2,
  Ticket,
  Filter,
  Copy,
  Key,
  Navigation,
  Phone,
  Briefcase,
  Package,
  Box,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  QrCode,
  Handshake,
  Power
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
  serverTimestamp,
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  FirebaseUser,
  getAuth,
  initializeApp,
  deleteApp
} from './firebase';
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
import QRCode from 'qrcode';
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

const SUPER_ADMIN_EMAILS = ['emailparasiteslixo@gmail.com', 'alffonseca42@gmail.com'];
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem 
} from '@/components/ui/command';

// --- Helpers ---
const reconstructTimestamps = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(reconstructTimestamps);
  }
  
  if (typeof obj === 'object') {
    // Check if it's a raw timestamp object from JSON
    if (typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number' && Object.keys(obj).length <= 3) {
      return new Timestamp(obj.seconds, obj.nanoseconds);
    }
    
    // Otherwise, recursively check children
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = reconstructTimestamps(obj[key]);
    }
    return newObj;
  }
  
  return obj;
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


// --- Native Folder Persistence Wrapper for PDFs using IndexedDB ---
const idbFolderStore = {
  dbName: 'segurpro_folders_db',
  storeName: 'folder_handles',
  
  getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB não suportado no ambiente atual.'));
        return;
      }
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async get(key: string): Promise<any> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async set(key: string, val: any): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(val, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error(e);
    }
  }
};

// Global synchronous cache to keep handles ready BEFORE user click events (vital to bypass browser gesture timeout)
if (typeof window !== 'undefined') {
  (window as any).segurproCachedHandles = {};
  
  const categoriesToPreload = ['os', 'visita', 'orcamento', 'cupom', 'contrato', 'recibo', 'relatorio', 'geral'];
  setTimeout(() => {
    categoriesToPreload.forEach(async (key) => {
      try {
        const handle = await idbFolderStore.get(`dir_handle_${key}`);
        if (handle) {
          (window as any).segurproCachedHandles[key] = handle;
        }
      } catch (err) {
        console.warn(`Erro no pre-carregamento do diretório (${key}):`, err);
      }
    });
  }, 1000);
}

const getPDFCategory = (fileName: string): { key: string, label: string } => {
  const name = fileName.toLowerCase();
  
  if (name.startsWith('os_') || name.includes('etiquetas_os') || name.includes('os-') || name.includes('os#')) {
    return { key: 'os', label: 'Ordens de Serviço (O.S.)' };
  }
  if (name.startsWith('visita_') || name.includes('visita')) {
    return { key: 'visita', label: 'Visitas Técnicas' };
  }
  if (name.startsWith('orcamento_') || name.includes('orcamento')) {
    return { key: 'orcamento', label: 'Orçamentos' };
  }
  if (name.startsWith('cupom_') || name.includes('cupom')) {
    return { key: 'cupom', label: 'Cupons de Venda' };
  }
  if (name.startsWith('contrato_') || name.includes('contrato')) {
    return { key: 'contrato', label: 'Contratos' };
  }
  if (name.startsWith('recibo_') || name.includes('recibo') || name.includes('comprovante')) {
    return { key: 'recibo', label: 'Recibos' };
  }
  if (name.startsWith('relatorio_') || name.includes('relatorio')) {
    return { key: 'relatorio', label: 'Relatórios' };
  }
  
  return { key: 'geral', label: 'Outros Documentos (Geral)' };
};

// Override original jsPDF save function
const originalSave = jsPDF.prototype.save;
(jsPDF.prototype as any).save = async function(this: any, filename: string, options?: any) {
  const docInstance = this;
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const category = getPDFCategory(filename || 'documento.pdf');
      const storeKey = `dir_handle_${category.key}`;
      
      // Get directory handle completely synchronously to keep mouse-click activation alive!
      const cachedHandles = (window as any).segurproCachedHandles || {};
      const dirHandle = cachedHandles[category.key] || null;
      
      const pdfBlob = docInstance.output('blob');
      const pickerOptions: any = {
        suggestedName: filename || 'documento.pdf',
        types: [{
          description: `Documento PDF (${category.label})`,
          accept: {
            'application/pdf': ['.pdf'],
          },
        }],
      };
      
      if (dirHandle) {
        pickerOptions.startIn = dirHandle;
      }
      
      if (isIframe) {
        toast.info("Dica: No visualizador do AI Studio, use o botão 'Abrir em nova aba' se precisar salvar em diretórios específicos do seu computador!", { duration: 6000 });
      }

      // Triggers browser native File Picker directly under the original click context!
      let fileHandle;
      try {
        fileHandle = await (window as any).showSaveFilePicker(pickerOptions);
      } catch (pickerErr: any) {
        // If it failed because of startIn / dirHandle permission issues, immediately retry without startIn
        if (dirHandle && pickerErr.name !== 'AbortError') {
          console.warn('Falha ao abrir com diretório sugerido, tentando sem diretório:', pickerErr);
          delete pickerOptions.startIn;
          fileHandle = await (window as any).showSaveFilePicker(pickerOptions);
        } else {
          throw pickerErr;
        }
      }

      const writable = await fileHandle.createWritable();
      await writable.write(pdfBlob);
      await writable.close();
      
      toast.success('PDF salvo com sucesso!');

      // Prompt to configure standard directory post-save if not memorized yet (uses a dedicated subsequent gesture loop)
      if (!dirHandle && 'showDirectoryPicker' in window) {
        setTimeout(() => {
          const wantsToMemorize = window.confirm(
            `PDF de "${category.label}" salvo com sucesso!\n\n` +
            `Deseja selecionar e MEMORIZAR uma pasta padrão específica no seu computador para novos PDFs dessa mesma categoria do SegurPro?\n` +
            `Exemplo: Uma pasta chamada "PDFs de OS" ou "Visitas Tecnicas", assim o sistema iniciará sempre na pasta certa!`
          );
          
          if (wantsToMemorize) {
            (async () => {
              try {
                const selectedDir = await (window as any).showDirectoryPicker({
                  mode: 'readwrite'
                });
                if (selectedDir) {
                  await idbFolderStore.set(storeKey, selectedDir);
                  cachedHandles[category.key] = selectedDir;
                  toast.success(`Pasta padrão para "${category.label}" salva com sucesso!`);
                }
              } catch (e) {
                console.warn('Seleção de diretório cancelada ou indisponível:', e);
              }
            })();
          }
        }, 1200);
      }
      
      return docInstance;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info('Exportação do PDF cancelada.');
        return docInstance;
      }
      console.warn('File System Picker falhou/rejeitado:', err);
      toast.error(`Aviso: ${err.message || 'Falha ao salvar via seletor de arquivos'}. Usando download padrão.`);
    }
  } else {
    // If showSaveFilePicker is not available (such as insecure origin or older browser)
    if (typeof window !== 'undefined') {
      const isHTTP = window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isIframe) {
        toast.info("Para organizar os PDFs em pastas específicas do seu PC (O.S., Visitas, etc.), use o botão 'Abrir em nova aba' no canto superior direito!", { duration: 8000 });
      } else if (isHTTP) {
        toast.warning("Para organizar os PDFs em pastas específicas do seu computador, utilize uma URL segura (HTTPS) ou acesse via 'localhost'.", { duration: 8000 });
      }
    }
  }
  
  // fallback
  return originalSave.call(docInstance, filename, options);
};

const generateSignatureCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

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
    const accessCode = generateSignatureCode();
    
    await setDoc(doc(db, 'signature_requests', token), {
      documentId,
      type,
      clientName,
      companyId,
      accessCode,
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
    const portalUrl = `${window.location.origin}${window.location.pathname}?assinatura=portal`;
    
    const message = `Olá ${clientName},\n\nPara assinar o documento digitalmente, você tem duas opções:\n\n1. Link Direto: ${url}\n2. Portal de Assinatura: ${portalUrl}\n   Código de Acesso: *${accessCode}*\n\n*Assinatura única após o uso será invalidada.*`;
    
    // Copy to clipboard (direct link default)
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Link copiado! Código: ${accessCode}`, {
        description: "O código de acesso também foi gerado para uso no portal.",
        duration: 5000,
      });
    } catch (err) {
      console.warn('Clipboard fallback', err);
    }

    // Open WhatsApp if possible
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    
    return { url, accessCode };
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
  if (numStr.includes('/')) return numStr; // Already formatted
  const d = safeParseDate(date);
  const year = format(d, 'yy');
  return `${numStr.padStart(5, '0')}/${year}`;
};

const getBudgetCalculations = (budget: any, appSettings: AppSettings) => {
  const itemsTotal = (budget.items || []).reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);
  const serviceValue = budget.serviceValue || 0;
  const baseTotal = itemsTotal + serviceValue;
  let finalTotal = baseTotal;
  
  // If an installment plan is selected, we MUST apply the interest/fee to the total
  if (budget.selectedInstallmentPlanId) {
    const plan = appSettings.installmentPlans?.find(p => p.id === budget.selectedInstallmentPlanId);
    if (plan) {
      const interest = (plan.interestRate || 0) / 100;
      // Formula: Total = Base * (1 + rate/100)
      finalTotal = baseTotal * (1 + interest);
    }
  } else if (budget.interestPercent && budget.interestPercent > 0) {
    // Direct percentage override
    finalTotal = baseTotal * (1 + (budget.interestPercent / 100));
  }
  
  const installments = budget.installments || 1;
  const installmentValue = finalTotal / installments;
  
  return { itemsTotal, serviceValue, baseTotal, finalTotal, installmentValue };
};

const getNextFormattedNumber = (items: any[], prefix: string) => {
  const currentYear = format(new Date(), 'yy');
  const itemsThisYear = items.filter(item => {
    const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : (item.date?.toDate ? item.date.toDate() : new Date());
    return itemDate && format(itemDate, 'yy') === currentYear;
  });
  
  let nextNum = 1;
  if (itemsThisYear.length > 0) {
    const numbers = itemsThisYear.map(item => {
      const num = item.number;
      if (typeof num === 'number') return num;
      if (typeof num === 'string' && num.includes('-')) {
        const parts = num.split('-');
        const lastPart = parts[parts.length - 1]; // e.g. 00001/26
        const numeric = lastPart.split('/')[0];
        return parseInt(numeric, 10) || 0;
      }
      return 0;
    });
    nextNum = Math.max(...numbers) + 1;
  }
  
  return `${prefix}${nextNum.toString().padStart(5, '0')}/${currentYear}`;
};

const formatFullDateWithCity = (date: any, appSettings: AppSettings) => {
  const d = date instanceof Timestamp ? date.toDate() : (date instanceof Date ? date : new Date(date));
  const cityStr = appSettings.city || '';
  return `${cityStr}${cityStr ? ', ' : ''}${format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
};

function TableDoubleScroll({ children }: { children: React.ReactNode }) {
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
    <div className="flex flex-col w-full relative group/scroll">
      <div 
        ref={topScrollRef} 
        onScroll={handleTopScroll}
        className="w-full overflow-x-auto overflow-y-hidden bg-[#0f1115] border-b border-[#2d3139]/30 rounded-t-lg transition-all custom-scrollbar"
        style={{ 
          height: '14px', 
          display: showTopScroll ? 'block' : 'none' 
        }}
      >
        <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
      </div>

      <div 
        ref={bottomScrollRef} 
        onScroll={handleBottomScroll}
        className="w-full overflow-x-auto custom-scrollbar"
      >
        {children}
      </div>
    </div>
  );
}

const ALL_MENU_ITEMS = [
  { id: 'dashboard', label: 'Painel Geral' },
  { id: 'clients', label: 'Clientes' },
  { id: 'suppliers', label: 'Fornecedores' },
  { id: 'pdv', label: 'PDV / Caixa' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'receipts', label: 'Recibos' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'budgets', label: 'Orçamentos' },
  { id: 'visits', label: 'Visitas Técnicas' },
  { id: 'service-orders', label: 'Ordens de Serviço' },
  { id: 'inventory', label: 'Estoque de Peças' },
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
  { id: 'owner', label: 'Proprietário' },
  { id: 'admin', label: 'Administrador' }
];

const SUGGESTED_INITIAL_ROLES: UserRole[] = [
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

const generateServiceOrderPDF = async (os: ServiceOrder, appSettings: AppSettings, pixSettings: PixSettings, includeValues = false) => {
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
  const companyName = appSettings.companyName || '';
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

    // PIX Info in OS PDF
    if (os.pixAccountId) {
      const selectedPix = pixSettings.accounts?.find(a => a.id === os.pixAccountId) || pixSettings.accounts?.[0];
      if (selectedPix) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Dados para Pagamento (PIX):', margin, currentY);
        currentY += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(`Chave: ${selectedPix.key} - Banco: ${selectedPix.bank}`, margin, currentY);
        currentY += 4;
        doc.text(`Favorecido: ${selectedPix.favored} - CPF/CNPJ: ${selectedPix.document || ''}`, margin, currentY);
        
        // QR Code PIX
        try {
          const qrSize = 35;
          const qrContent = selectedPix.qrKey || selectedPix.key;
          const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 150 });
          doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - qrSize - 5, currentY - 15, qrSize, qrSize);
        } catch (e) {
          console.error("Error generating PIX QR Code for Service Order", e);
        }

        currentY += 8;
      }
    }
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
  
  const techName = os.technicianName || '';
  const isAndre = techName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('andre');
  
  if (isAndre) {
    doc.text(appSettings.responsible || techName, margin + 45, currentY + 9, { align: 'center' });
  } else {
    doc.text(techName, margin + 45, currentY + 9, { align: 'center' });
  }

  doc.text('Assinatura do Cliente (Ciente)', pageWidth - margin - 45, currentY + 5, { align: 'center' });
  
  if (os.technicianSignature) {
    try { doc.addImage(os.technicianSignature, 'PNG', margin + 25, currentY - 18, 40, 16); } catch(e) {}
  } else if (isAndre && appSettings.signatureUrl) {
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
  number?: number | string;
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
  pixAccountId?: string;
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
  status: 'Aberto' | 'Em Andamento' | 'Aguardando Peças' | 'Concluído' | 'Cancelado';
  
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
  type: 'CFTV' | 'Alarme' | 'Cerca Elétrica' | 'Motor de Portão' | 'Redes' | 'Outros';
  status: 'Agendada' | 'Em Andamento' | 'Concluída' | 'Cancelada';
  description: string;
  serviceAddress?: string; // Endereço específico do serviço
  observations?: string;
  technicianId: string;
  technicianName: string;
  responsibleName?: string;
  totalValue: number;
  parts?: { description: string; quantity: number; price: number }[];
  clientSignature?: string;
  technicianSignature?: string;
  createdAt: any;
  updatedAt?: any;
  number?: number | string;
  statusDates?: { [key: string]: any };
  statusChangedAt?: any;
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
  pixAccountId?: string;
  paymentMethod?: 'Dinheiro' | 'PIX' | 'Cartão';
  serviceType?: 'Contrato' | 'Serviço Normal';
  createdAt?: any;
}

interface Budget {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  address: string;
  items: { description: string; quantity: number; price: number; imageUrl?: string }[];
  serviceValue?: number;
  total: number;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Em Negociação';
  pixAccountId?: string;
  paymentMethod?: 'Dinheiro' | 'Cartão' | 'PIX' | 'Cartão com Juros';
  installments?: number;
  selectedCardBrand?: 'VISA' | 'MASTERCARD' | 'AMERICA' | 'ELO';
  interestType?: 'none' | 'with_interest';
  selectedInstallmentPlanId?: string;
  installmentValue?: number;
  cashAcceptancePercent?: number;
  cashAcceptanceValue?: number;
  cashDeliveryPercent?: number;
  cashDeliveryValue?: number;
  observations?: string;
  clientSignature?: string;
  createdAt: any;
  number?: number | string;
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
  number?: number | string;
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

const generateReceiptPDF = async (receipt: Receipt, appSettings: AppSettings, pixSettings: PixSettings, shouldShare = false) => {
  const doc = new jsPDF();
  const dateStr = format(safeParseDate(receipt.date), 'dd/MM/yyyy');
  const fullDateStr = format(safeParseDate(receipt.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
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
  const contactInfo = `${appSettings.companyPhone || ''}   ${appSettings.companyEmail || ''}`;
  doc.text(contactInfo.trim(), appSettings.logoUrl ? 42 : 20, 26);
  
  // 2. Title Bar
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 40, 170, 10, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Recibo Nº ${formatRecordNumber(receipt.number, receipt.date)}`, 105, 47, { align: 'center' });
  
  // 3. Declaration
  doc.setFontSize(11);
  const declarationY = 65;
  
  const valorNumerico = Number(receipt.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const valorExtenso = valorPorExtenso(Number(receipt.value));
  
  const declarationText = `Declaro que recebi na data de ${fullDateStr}, o valor de R$ ${valorNumerico} (${valorExtenso}), de ${receipt.clientName}, via ${receipt.paymentMethod || 'PIX'}, referente aos seguintes serviços:`;
  
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
  let serviceText = receipt.serviceSpecification || 'Serviços prestados';
  if (receipt.clientType === 'Contrato') {
    // If it's a contract, we force the Service Contractual - Month format
    if (receipt.referenceMonth) {
      serviceText = `Serviço Contratual - ${receipt.referenceMonth}`;
    } else if (receipt.serviceSpecification) {
      // If no reference month specifically, use the specification which might already contain it
      serviceText = receipt.serviceSpecification;
    } else {
      serviceText = 'Serviço Contratual';
    }
  } else if (receipt.referenceMonth && receipt.clientType !== 'Avulso') {
    serviceText += `\nReferente a: ${receipt.referenceMonth}`;
  }
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
  
  // PIX Info (Only if payment method is PIX)
  if (receipt.paymentMethod === 'PIX') {
    const selectedPix = pixSettings.accounts?.find(a => a.id === receipt.pixAccountId || a.label === receipt.pixAccountId) || (pixSettings.accounts?.[0]);
    if (selectedPix && selectedPix.key) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Dados para Pagamento (PIX):', 20, currentY);
      currentY += 6;
      
      const qrSize = 35;
      // QR Code PIX - MOVED TO LEFT
      try {
        const qrContent = selectedPix.qrKey || selectedPix.key;
        const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 150 });
        doc.addImage(qrDataUrl, 'PNG', 20, currentY, qrSize, qrSize);
      } catch (e) {
        console.error("Error generating PIX QR Code for Receipt", e);
      }

      // Text Data - MOVED TO THE RIGHT OF THE QR CODE
      doc.setFont('helvetica', 'normal');
      const textX = 20 + qrSize + 5;
      let textY = currentY + 5;
      
      doc.text(`Chave: ${selectedPix.key}`, textX, textY);
      textY += 5;
      doc.text(`Banco: ${selectedPix.bank}`, textX, textY);
      textY += 5;
      doc.text(`Favorecido: ${selectedPix.favored}`, textX, textY);
      textY += 5;
      doc.text(`CPF/CNPJ: ${selectedPix.document}`, textX, textY);
      
      currentY += Math.max(qrSize, 20) + 10;
    }
  } else if (receipt.paymentMethod) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Forma de Pagamento: ${receipt.paymentMethod}`, 20, currentY);
    currentY += 15;
  }

  // Observations
  let obsText = receipt.observations || '';
  if (receipt.status === 'Aguardando Pagamento') {
    const statusNote = 'Recibo Valido Mediante Comprovante do PIX';
    if (obsText) {
      if (!obsText.includes(statusNote)) {
        obsText += `\n${statusNote}`;
      }
    } else {
      obsText = statusNote;
    }
  }

  if (obsText) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(obsText, 170);
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

  const isAndre = appSettings.responsible && 
                  appSettings.responsible.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('andre');

  if (isAndre && appSettings.signatureUrl) {
    try {
      doc.addImage(appSettings.signatureUrl, 'PNG', 80, currentY - 5, 50, 15);
    } catch (e) {
      console.error("Erro ao adicionar assinatura ao recibo:", e);
    }
  }

  doc.line(70, currentY + 12, 140, currentY + 12);
  doc.text(appSettings.responsible || appSettings.companyName || '', 105, currentY + 17, { align: 'center' });
  doc.text('Emitente', 105, currentY + 22, { align: 'center' });
  
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
  qrKey?: string;
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
  installmentPlans?: { id: string, brand: 'VISA' | 'MASTERCARD' | 'AMERICA' | 'ELO', type: 'DÉBITO' | 'CRÉDITO', installments: number, interestRate: number }[];
  serviceTypes?: string[];
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

function CompanyWizard({ onCreate, onJoin, initialCode }: { onCreate: (name: string) => void, onJoin: (code: string) => void, initialCode?: string }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode || '');
  const [regCode, setRegCode] = useState(initialCode || '');
  const [isValidated, setIsValidated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [mode, setMode] = useState<'selection' | 'create' | 'join' | 'validate_registration'>('selection');

  useEffect(() => {
    if (initialCode) {
      handleAutoDetectCode(initialCode);
    }
  }, [initialCode]);

  const handleAutoDetectCode = async (searchCode: string) => {
    const cleanCode = searchCode.trim().toUpperCase();
    setIsValidating(true);
    try {
      // 1. Try if it's a Registration Code (New Company)
      const regQ = query(
        collection(db, 'registration_codes'), 
        where('code', '==', cleanCode),
        where('status', '==', 'active')
      );
      const regSnap = await getDocs(regQ);
      if (!regSnap.empty) {
        setRegCode(cleanCode);
        setIsValidated(true);
        setMode('create');
        (window as any)._validatedRegCodeId = regSnap.docs[0].id;
        toast.success("Código de liberação mestre detectado!");
        return;
      }

      // 2. Try if it's a Company Invite Code (Collaborator)
      const compQ = query(collection(db, 'companies'), where('inviteCode', '==', cleanCode));
      const compSnap = await getDocs(compQ);
      if (!compSnap.empty) {
        setCode(cleanCode);
        setMode('join');
        toast.success("Código de convite de equipe detectado!");
        return;
      }

      toast.error("O código fornecido via link é inválido ou expirou.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  const validateRegistrationCode = async () => {
    if (!regCode.trim()) {
      toast.error("Por favor, digite o código de liberação.");
      return;
    }
    
    setIsValidating(true);
    try {
      const q = query(
        collection(db, 'registration_codes'), 
        where('code', '==', regCode.trim().toUpperCase()),
        where('status', '==', 'active')
      );
      
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        const codeDoc = querySnap.docs[0];
        // We don't mark as used here yet, only after the company is actually created
        // But we store the ID to mark it later
        setIsValidated(true);
        setMode('create');
        (window as any)._validatedRegCodeId = codeDoc.id;
        toast.success("Código validado! Agora você pode cadastrar sua empresa.");
      } else {
        toast.error("Código inválido ou já utilizado.");
      }
    } catch (error) {
      console.error("Erro ao validar código:", error);
      toast.error("Erro ao validar código de segurança.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleFinalCreate = (companyName: string) => {
    onCreate(companyName);
    // Note: The actual marking of the code as 'used' should happen in the parent's handleCreateCompany
  };

  if (mode === 'validate_registration') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1115] p-6">
        <Card className="w-full max-w-md border-[#2d3139] bg-[#1a1d23]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="text-blue-500" size={20} />
              Liberação de Cadastro
            </CardTitle>
            <CardDescription className="text-[#71717a]">
              Para sua segurança, insira o código de liberação enviado por nossa equipe para cadastrar uma nova empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#a0a0a0]">Código de Liberação</Label>
              <Input 
                value={regCode} 
                onChange={e => setRegCode(e.target.value.toUpperCase())} 
                placeholder="DIGITE SEU CÓDIGO AQUI" 
                className="bg-[#0f1115] border-[#2d3139] text-white text-center font-bold tracking-[0.3em] h-12" 
              />
            </div>
            <Button 
              onClick={validateRegistrationCode} 
              disabled={isValidating}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white h-11"
            >
              {isValidating ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
              Validar e Continuar
            </Button>
            <Button variant="ghost" onClick={() => setMode('selection')} className="w-full text-[#71717a]">Voltar</Button>
          </CardContent>
          <div className="p-4 border-t border-[#2d3139]/30 text-center">
             <p className="text-[10px] text-[#555] italic">Este procedimento garante que apenas parceiros autorizados cadastrem novas empresas no ecossistema.</p>
          </div>
        </Card>
      </div>
    );
  }

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
    <div className="min-h-screen flex items-center justify-center bg-[#0f1115] p-6 relative">
      {isValidating && (
        <div className="absolute inset-0 bg-[#0f1115]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-10 w-10 text-[#3b82f6] animate-spin" />
          <p className="text-white font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Validando Código de Acesso...</p>
        </div>
      )}
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white shadow-2xl shadow-blue-500/20">
            <Shield size={40} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Quase lá!</h1>
          <p className="text-xl text-[#71717a]">Você precisa estar vinculado a uma empresa para continuar.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-[#2d3139] bg-[#1a1d23] hover:border-[#3b82f6]/50 transition-all cursor-pointer group" onClick={() => setMode('validate_registration')}>
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

function SignaturePortalPage({ onVerify }: { onVerify: (token: string) => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam && codeParam.length === 6) {
      setCode(codeParam);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      toast.error('Por favor, insira o código de acesso.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Use single where clause to avoid composite index requirement
      const q = query(
        collection(db, 'signature_requests'), 
        where('accessCode', '==', code.trim().replace(/\s/g, '')),
        limit(10) // Small limit for safety
      );
      const querySnap = await getDocs(q);
      
      // Filter by status in memory to avoid complex query issues
      const pendingDoc = querySnap.docs.find(doc => doc.data().status === 'pending');
      
      if (pendingDoc) {
        onVerify(pendingDoc.id);
      } else if (querySnap.empty) {
        setError('Código inválido ou não encontrado.');
      } else {
        setError('Este código já foi utilizado ou está expirado.');
      }
    } catch (err: any) {
      console.error('Erro na validação do código:', err);
      // provide more context if it is a permission issue
      const msg = err.code === 'permission-denied' 
        ? 'Erro de permissão no servidor. Contate o administrador.' 
        : (err.message || 'Tente novamente.');
      setError(`Erro ao validar código: ${msg}`);
      toast.error('Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-20 w-20 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mb-2">
            <Key size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Assinatura Digital</h1>
          <p className="text-[#a0a0a0] text-sm">Insira o código de 6 dígitos que você recebeu para acessar o documento e assinar.</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-4">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Digite o código (ex: 123456)"
              className="h-16 text-center text-2xl font-mono tracking-[0.5em] bg-[#1a1d23] border-[#2d3139] text-white focus:border-blue-500 focus:ring-blue-500/20 transition-all rounded-xl"
              maxLength={10}
            />
            {error && (
              <p className="text-red-500 text-xs text-center font-bold uppercase tracking-wider animate-pulse">{error}</p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            {loading ? <RefreshCw className="animate-spin mr-2" /> : 'Verificar e Assinar'}
          </Button>
        </form>

        <p className="text-center text-[#71717a] text-xs pt-8 border-t border-[#2d3139]/50">
          Powered by <span className="text-white font-bold tracking-widest text-[10px]">SEGURPRO GESTÃO</span>
        </p>
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
  const [selectedType, setSelectedType] = useState<string>('');

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
            setSelectedType(data.type || 'service-order');
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

    if (!selectedType) {
      toast.error('Por favor, selecione para o que é esta assinatura.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update the signature request
      await updateDoc(doc(db, 'signature_requests', token), {
        signature,
        status: 'signed',
        type: selectedType, // Update with client confirmation
        signedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Update the document itself (Visit, Contract or OS)
      let collectionName = '';
      if (selectedType === 'visit') collectionName = 'visits';
      else if (selectedType === 'contract') collectionName = 'clients';
      else if (selectedType === 'budget') collectionName = 'budgets';
      else if (selectedType === 'service-order') collectionName = 'serviceOrders';
      
      if (!collectionName) throw new Error('Tipo de documento inválido');
      
      // We send the token as well so the security rules can verify it
      const updateData: any = {
        clientSignature: signature,
        clientSignatureToken: token, 
        updatedAt: serverTimestamp()
      };
      
      // If it's a budget, acceptance usually means approval
      if (selectedType === 'budget') {
        updateData.status = 'Aprovado';
      }
      
      // For visits, also set the signature date
      if (selectedType === 'visit') {
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
    <div className="min-h-screen bg-[#0f1115] p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
            <Lock className="text-blue-500" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Assinatura Digital</h1>
          <p className="text-[#a0a0a0] text-sm italic underline underline-offset-4 decoration-blue-500/50">Olá, {request.clientName}!</p>
        </div>

        <Card className="border-[#2d3139] bg-[#1a1d23] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
          <CardHeader className="pb-4">
             <CardTitle className="text-lg text-white flex items-center gap-2">
               <Pencil size={18} className="text-blue-500" />
               Confirmação e Assinatura
             </CardTitle>
             <CardDescription className="text-xs text-[#71717a]">
                Selecione o tipo de documento e faça sua assinatura.
             </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-[#0f1115] p-4 rounded-xl border border-[#2d3139] space-y-4">
              <div className="space-y-3">
                <Label className="text-[#71717a] text-[10px] font-black uppercase tracking-widest block px-1">Este documento refere-se a:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'visit', label: 'Visita Técnica' },
                    { id: 'service-order', label: 'Ordem de Serviço' },
                    { id: 'budget', label: 'Orçamento' },
                    { id: 'contract', label: 'Contrato' }
                  ].map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      onClick={() => setSelectedType(t.id)}
                      className={cn(
                        "h-10 text-[10px] font-bold uppercase tracking-wider border-[#2d3139] transition-all",
                        selectedType === t.id 
                          ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" 
                          : "bg-[#1a1d23] text-[#71717a] hover:text-white"
                      )}
                    >
                      {t.id === selectedType && <Check size={12} className="mr-1" />}
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#2d3139]/50">
                <Label className="text-[#71717a] text-[10px] font-black uppercase tracking-widest block px-1">Dados:</Label>
                <p className="text-white font-bold">{request.displayTitle}</p>
                {request.displayValue && <p className="text-xl font-mono text-blue-500">{request.displayValue}</p>}
                {request.displayDetails && <p className="text-[#71717a] text-xs italic mt-1">{request.displayDetails}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[#71717a] text-[10px] font-black uppercase tracking-widest block px-1">Desenhe sua assinatura abaixo:</Label>
              <div className="bg-white p-1 rounded-xl overflow-hidden ring-4 ring-white/5">
                <SignaturePad value={signature} onChange={setSignature} />
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isSubmitting || !signature}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 animate-spin" size={20} />
                  Processando...
                </>
              ) : 'Finalizar Assinatura'}
            </Button>
          </CardContent>
        </Card>
        
        <div className="text-center">
           <p className="text-[10px] text-[#71717a] uppercase font-bold tracking-[0.2em]">Criptografia de Ponta a Ponta</p>
           <p className="text-[10px] text-[#333] mt-1 italic">UUID: {token}</p>
        </div>
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
    if (clean.startsWith('@') || clean.endsWith('@')) return '';
    return clean;
  }
  
  // Sanitize username: only letters, numbers, dots, underscores, dashes
  clean = clean.replace(/[^a-z0-9._-]/g, '');
  if (!clean) return '';
  
  return `${clean}@segurpro.com`;
};

const initialAppSettings: AppSettings = {
  logoUrl: '',
  companyName: '',
  address: '',
  neighborhood: '',
  responsible: '',
  city: '',
  cep: '',
  document: '',
  signatureUrl: '',
  serviceTypes: ['CFTV', 'Alarme', 'Cerca Elétrica', 'Motor de Portão', 'Redes', 'Outros'],
  installmentPlans: []
};

export default function MainApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const signerTokenUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('signerToken');
  }, []);

  const signaturePortal = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('assinatura') === 'portal';
  }, []);

  const inviteCodeUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('code');
  }, []);

  const [activeSignerToken, setActiveSignerToken] = useState<string | null>(signerTokenUrl);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [visits, setVisits] = useState<TechnicalVisit[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [allGlobalUsers, setAllGlobalUsers] = useState<any[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logSearchUser, setLogSearchUser] = useState<string>('all');
  const [logSearchDate, setLogSearchDate] = useState<string>('');
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>(inviteCodeUrl ? 'register' : 'login');
  
  // Update authMode if URL code changes and user is not logged in
  useEffect(() => {
    if (inviteCodeUrl && !user) {
      setAuthMode('register');
    }
  }, [inviteCodeUrl, user]);
  useEffect(() => {
    if (user && inviteCodeUrl) {
      // Clear URL parameters when successfully authenticated to prevent them from sticking
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, inviteCodeUrl]);

  const [showPassword, setShowPassword] = useState(false);
  const [visitsFilter, setVisitsFilter] = useState<{ date: Date | null }>({ date: null });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState(''); // For registration/wizard
  const [pixSettings, setPixSettings] = useState<PixSettings>({
    accounts: []
  });
  const [rolePermissions, setRolePermissions] = useState<any>(null);
  const [customRoles, setCustomRoles] = useState<UserRole[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(initialAppSettings);

  const [generatedSignatureInfo, setGeneratedSignatureInfo] = useState<{
    isOpen: boolean;
    token: string;
    accessCode: string;
    url: string;
    portalUrl: string;
    clientName: string;
  }>({ isOpen: false, token: '', accessCode: '', url: '', portalUrl: '', clientName: '' });

  const [viewPeriod, setViewPeriod] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'MM'));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));

  const [interpretedEditAction, setInterpretedEditAction] = useState<{type: string, data: any} | null>(null);
  const onExternalEditHandled = useMemo(() => () => setInterpretedEditAction(null), []);

  const onEditClick = (type: 'visit' | 'contract' | 'service-order' | 'budget' | 'receipt', data: any) => {
    setInterpretedEditAction({ type, data });
  };

  const onSignatureClick = async (type: 'visit' | 'contract' | 'service-order' | 'budget', data: any) => {
    if (!data) return;

    let documentId = data.id;
    let clientName = '';
    let displayInfo: any = {};

    if (type === 'visit') {
      clientName = data.clientName;
      displayInfo = { title: 'Relatório de Visita Técnica', details: data.serviceDescription };
    } else if (type === 'contract') {
      clientName = (data.name || 'Cliente');
      displayInfo = { title: 'Contrato de Prestação de Serviços' };
    } else if (type === 'service-order') {
      clientName = data.clientName;
      displayInfo = { title: `OS #${data.number || data.id.slice(-6)}`, value: data.totalValue?.toString() };
    } else if (type === 'budget') {
      clientName = data.clientName;
      const { finalTotal } = getBudgetCalculations(data, appSettings);
      displayInfo = { title: `Orçamento #${data.number || data.id.slice(-6)}`, value: finalTotal.toFixed(2) };
    }

    try {
      const token = doc(collection(db, 'signature_requests')).id;
      const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await setDoc(doc(db, 'signature_requests', token), {
        documentId,
        type,
        clientName,
        companyId: currentUserData?.companyId,
        accessCode,
        displayTitle: displayInfo?.title || `Documento ${type}`,
        displayValue: displayInfo?.value || '',
        displayDetails: displayInfo?.details || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (logAction) {
        await logAction('create', 'signature_request', `Gerou link de assinatura para ${clientName}`, token);
      }

      const portalUrl = `${window.location.origin}${window.location.pathname}?assinatura=portal`;
      const directUrl = `${portalUrl}&code=${accessCode}`;
      
      setGeneratedSignatureInfo({
        isOpen: true,
        token,
        accessCode,
        url: directUrl,
        portalUrl,
        clientName
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar código de assinatura.');
    }
  };

  // --- POS (PDV) Persistent State ---
  const [posCart, setPosCart] = useState<{item: any, quantity: number, price: number}[]>([]);
  const [posDiscount, setPosDiscount] = useState(0);
  const [posSelectedClient, setPosSelectedClient] = useState<string>('Avulso');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Dinheiro' | 'Cartão' | 'PIX'>('Dinheiro');
  const [posLinkedOS, setPosLinkedOS] = useState('');
  const [posCardDetails, setPosCardDetails] = useState({ brand: '', type: 'crédito', installments: 1, interestPercent: 0, useInterest: false });
  const [posSelectedPixAccountId, setPosSelectedPixAccountId] = useState<string>('');
  const [sales, setSales] = useState<any[]>([]);

  const isSuperAdmin = user?.email ? SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase().trim()) || currentUserData?.role === 'super_admin' : false;

  const effectiveCompanyId = useMemo(() => {
    return isSuperAdmin && selectedCompanyId ? selectedCompanyId : currentUserData?.companyId;
  }, [isSuperAdmin, selectedCompanyId, currentUserData?.companyId]);

  // Log system
  const logAction = async (action: string, resourceType: string, details: string, resourceId?: string, resourceName?: string) => {
    if (!user || !effectiveCompanyId) return;
    
    // Anonymity for Super Admins viewing other companies
    const isViewingOtherCompany = isSuperAdmin && effectiveCompanyId !== currentUserData?.companyId;
    if (isViewingOtherCompany) return;

    try {
      await addDoc(collection(db, 'logs'), {
        userId: user.uid,
        userName: currentUserData?.displayName || user.displayName || 'Usuário',
        userEmail: user.email,
        action,
        resourceType,
        resourceId: resourceId || '',
        resourceName: resourceName || '',
        details,
        timestamp: Timestamp.now(),
        companyId: effectiveCompanyId
      });
    } catch (err) {
      console.error('Erro ao registrar log:', err);
    }
  };

  // User Heartbeat (Online Status)
  useEffect(() => {
    if (!user || !currentUserData?.companyId) return;
    
    // Anonymity: Don't update heartbeat if Super Admin is in another company view
    if (isSuperAdmin && effectiveCompanyId !== currentUserData?.companyId) return;

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
  }, [user, currentUserData?.companyId, isSuperAdmin, effectiveCompanyId]);

  // 1. Auth Listener
  useEffect(() => {
    const titleText = currentCompany?.name || appSettings?.companyName || 'SegurPro Gestão';
    document.title = titleText;
  }, [currentCompany?.name, appSettings?.companyName]);

  useEffect(() => {
    async function testConnection() {
      if (signerTokenUrl || signaturePortal) return; // Se for página de assinatura externa, não testa conexão que exige auth
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
    }, (error) => {
      console.error("Erro no listener de permissões:", error);
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
        const normalizedEmail = user.email?.toLowerCase().trim();
        const isSuper = normalizedEmail ? SUPER_ADMIN_EMAILS.includes(normalizedEmail) : false;
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
    if (!effectiveCompanyId) {
      setCurrentCompany(null);
      return;
    }

    const compRef = doc(db, 'companies', effectiveCompanyId);
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

    const unsubRoles = onSnapshot(doc(db, 'companies', effectiveCompanyId, 'settings', 'roles'), (docSnap) => {
      if (docSnap.exists()) {
        setCustomRoles(docSnap.data().roles || []);
      } else {
        setCustomRoles([]);
      }
    }, (error) => {
      console.error("Erro no listener de papéis customizados:", error);
    });

    return () => {
      unsubscribeCompany();
      unsubRoles();
    };
  }, [currentUserData?.companyId, selectedCompanyId, isSuperAdmin]);

  const userRoles = useMemo(() => {
    // If customRoles is empty, we show the suggested ones as virtual custom roles for existing companies
    const effectiveCustom = customRoles.length > 0 ? customRoles : SUGGESTED_INITIAL_ROLES;
    return [...DEFAULT_ROLES, ...effectiveCustom];
  }, [customRoles]);

  // Access Helper for Sidebar
  const canAccess = (tabName: string) => {
    const role = currentUserData?.role;
    
    // Hard restriction for super-admin tab
    if (tabName === 'super-admin') return isSuperAdmin;

    // Owners and Super Admins bypass SaaS menu restrictions for visibility
    // but we still respect company-level enabledMenus for regular staff
    if (isSuperAdmin || role === 'owner') return true;

    // SaaS specific menu restriction
    if (currentCompany?.enabledMenus) {
      // Normalize tabName for backward compatibility with old IDs
      let normalizedTabName = tabName;
      if (tabName === 'dashboard') normalizedTabName = 'resumo';
      if (tabName === 'service-orders') normalizedTabName = 'os';

      if (!currentCompany.enabledMenus.includes(tabName) && !currentCompany.enabledMenus.includes(normalizedTabName)) {
        // Common tabs that should ALWAYS be accessible if they were not explicitly disabled
        const essentialTabs = ['settings', 'dashboard'];
        if (!essentialTabs.includes(tabName)) {
          return false;
        }
      }
    } else if (!currentCompany?.enabledMenus) {
      // Default menus for companies without specific settings
      const defaultMenus = [
        'dashboard', 'visits', 'receipts', 'clients', 'financial', 
        'inventory', 'service-orders', 'budgets', 'settings', 'pdv',
        'suppliers', 'reports', 'users', 'logs'
      ];
      if (!defaultMenus.includes(tabName)) return false;
    }
    
    if (role === 'admin') {
      // Admin should see everything allowed for the company except logs maybe?
      return true;
    }
    
    // Check dynamic permissions if they exist
    if (rolePermissions && rolePermissions[role]) {
      return rolePermissions[role].menus?.includes(tabName) || false;
    }

    if (role === 'secretaria') {
      return ['dashboard', 'financial', 'budgets', 'clients', 'suppliers', 'receipts', 'users', 'reports', 'settings', 'logs', 'inventory'].includes(tabName);
    }
    
    if (role === 'tecnico') {
      return ['dashboard', 'visits', 'service-orders', 'receipts', 'inventory'].includes(tabName);
    }

    if (role === 'auxiliar') {
      return ['dashboard', 'visits'].includes(tabName);
    }
    
    // Default fallback
    return false;
  };

  const canManage = (tabName: string) => {
    const role = currentUserData?.role;
    if (isSuperAdmin || role === 'admin' || role === 'owner') return true;
    
    if (rolePermissions && rolePermissions[role]) {
      return rolePermissions[role].manage?.includes(tabName) || false;
    }
    
    return false;
  };

  const canViewList = (tabName: string) => {
    const role = currentUserData?.role;
    if (isSuperAdmin || role === 'admin' || role === 'owner') return true;
    
    // Fail-safe for dashboard summary: if you can access it, you can view the summary
    if (tabName === 'dashboard') return canAccess('dashboard');

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
        'clients', 'suppliers', 'receipts', 'users', 'settings', 'reports', 'super-admin', 'inventory'
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

      if (e.altKey && e.key === 'ArrowDown') {
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      } else if (e.altKey && e.key === 'ArrowUp') {
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
          ...prev, // Keep all existing fields (installmentPlans, serviceTypes, etc.)
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

      // Global users listener for Super Admin (to support user management across companies)
      const allUsersUnsubscribe = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllGlobalUsers(data);
        }
      );
      
      // Add allUsersUnsubscribe to cleanup
      const originalAllCompaniesUnsubscribe = allCompaniesUnsubscribe;
      allCompaniesUnsubscribe = () => {
        originalAllCompaniesUnsubscribe?.();
        allUsersUnsubscribe();
      };
    }

    let visitsUnsubscribe = () => {};
    let serviceOrdersUnsubscribe = () => {};
    let financialUnsubscribe = () => {};
    let budgetsUnsubscribe = () => {};
    let inventoryUnsubscribe = () => {};
    let inventoryTransactionsUnsubscribe = () => {};
    let clientsUnsubscribe = () => {};
    let suppliersUnsubscribe = () => {};
    let receiptsUnsubscribe = () => {};
    let usersUnsubscribe = () => {};
    let logsUnsubscribe = () => {};
    let pixUnsubscribe = () => {};
    let appSettingsUnsubscribe = () => {};
    let salesUnsubscribe = () => {};

    if (companyId) {
      // Reset settings when switching company to prevent bleeding data
      setAppSettings(initialAppSettings);
      setPixSettings({ accounts: [] });
      setInventory([]);
      setClients([]);
      setSuppliers([]);
      setReceipts([]);
      setUsers([]);
      setSales([]);
      setServiceOrders([]);
      setBudgets([]);
      setFinancials([]);
      setInventoryTransactions([]);
      setLogs([]);

      // ... existing subscriptions
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

      inventoryUnsubscribe = onSnapshot(
        query(collection(db, 'inventory'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setInventory(data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')));
        }
      );

      inventoryTransactionsUnsubscribe = onSnapshot(
        query(collection(db, 'inventoryTransactions'), where('companyId', '==', companyId)),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setInventoryTransactions(data.sort((a: any, b: any) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
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
            // Do NOT merge with prev to avoid cross-company data leakage
            // Use initialAppSettings to ensure defaults are present if snapshot is partial
            setAppSettings({
              ...initialAppSettings,
              ...data
            });
          } else {
            setAppSettings(initialAppSettings);
          }
        }
      );

      salesUnsubscribe = onSnapshot(
        query(collection(db, 'companies', companyId, 'sales')),
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSales(data.sort((a: any, b: any) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          }));
        }
      );
    }

    return () => {
      visitsUnsubscribe();
      serviceOrdersUnsubscribe();
      financialUnsubscribe();
      budgetsUnsubscribe();
      inventoryUnsubscribe();
      inventoryTransactionsUnsubscribe();
      clientsUnsubscribe();
      suppliersUnsubscribe();
      receiptsUnsubscribe();
      usersUnsubscribe();
      logsUnsubscribe();
      pixUnsubscribe();
      appSettingsUnsubscribe();
      salesUnsubscribe();
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

  const updateInventoryStock = async (parts: { description: string, quantity: number }[], type: 'exit' | 'entry', referenceId: string, referenceType: 'os' | 'visit') => {
    const companyId = currentUserData?.companyId;
    if (!companyId || !parts || parts.length === 0) return;
    
    for (const part of parts) {
      if (!part.description) continue;
      
      // Try to find matching item by name/description
      const item = inventory.find(i => 
        (i.name && i.name.toLowerCase() === part.description.toLowerCase()) || 
        (i.code && i.code === part.description)
      );
      
      if (item) {
        const itemRef = doc(db, 'inventory', item.id);
        const currentQty = Number(item.quantity) || 0;
        const partQty = Number(part.quantity) || 0;
        const newQuantity = type === 'exit' ? (currentQty - partQty) : (currentQty + partQty);
        
        await updateDoc(itemRef, { 
          quantity: newQuantity,
          updatedAt: Timestamp.now()
        });
        
        // Record transaction
        await addDoc(collection(db, 'inventoryTransactions'), {
          itemId: item.id,
          itemName: item.name,
          companyId,
          type,
          quantity: part.quantity,
          referenceId,
          referenceType,
          timestamp: Timestamp.now(),
          performedBy: user?.uid,
          performedByName: currentUserData?.displayName || user?.displayName || user?.email
        });
      }
    }
  };

  const handleCreateCompany = async (name: string) => {
    if (!user) return;
    
    // Check for the validated registration code
    const regCodeId = (window as any)._validatedRegCodeId;
    if (!regCodeId) {
      toast.error("Ocorreu um erro na autenticação do código de liberação.");
      return;
    }

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

      // Mark the registration code as used
      await updateDoc(doc(db, 'registration_codes', regCodeId), {
        status: 'used',
        usedAt: Timestamp.now(),
        usedBy: user.uid
      });
      
      delete (window as any)._validatedRegCodeId;

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

        // If it was an invite code, try to regenerate it to make it "single use" or rotate it
        // This is a "best effort" - if it fails (403), we still allow the join to succeed
        if (isInviteCode) {
          try {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            await updateDoc(doc(db, 'companies', targetCompanyId), {
              inviteCode: newCode
            });
          } catch (rotateError) {
            console.warn("Could not rotate invite code (expected if joining user is not admin):", rotateError);
          }
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

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error('Informe seu Usuário ou E-mail no campo "Usuário ou E-mail" para iniciar a recuperação.');
      return;
    }
    const finalEmail = getFinalEmail(email);
    if (!finalEmail || !finalEmail.includes('@')) {
      toast.error('Por favor, informe seu usuário ou e-mail válido no campo "Usuário ou E-mail" primeiro.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, finalEmail);
      toast.success(`E-mail de redefinição de senha enviado para: ${finalEmail}. Verifique sua caixa de entrada e pasta de lixo eletrônico/spam!`);
    } catch (error: any) {
      console.error("Password reset error:", error);
      const errMsg = (error.message || '').toLowerCase();
      const errCode = (error.code || '').toLowerCase();
      if (errCode.includes('user-not-found') || errCode.includes('invalid-credential') || errMsg.includes('user-not-found') || errMsg.includes('invalid-credential')) {
        toast.error(`Usuário não encontrado: não há cadastro ativo para o e-mail: "${finalEmail}".`);
      } else {
        toast.error(`Erro ao enviar e-mail de recuperação: ${error.message || 'Desconhecido'}`);
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
    if (!finalEmail || !finalEmail.includes('@')) {
      toast.error('O formato do usuário ou e-mail é inválido.');
      return;
    }
    
    setIsAuthLoading(true);
    setLastAuthError(null);

    try {
      const cleanPassword = password.trim();
      if (authMode === 'login') {
        // Enforce a safety timeout on the signInWithEmailAndPassword promise
        const signInPromise = signInWithEmailAndPassword(auth, finalEmail, cleanPassword);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 8000)
        );

        const userCredential = await Promise.race([signInPromise, timeoutPromise]);
        toast.success(`Bem-vindo, ${userCredential.user.displayName || 'usuário'}!`);
      } else {
        if (!displayName) {
          toast.error('Por favor, informe seu nome para o cadastro.');
          setIsAuthLoading(false);
          return;
        }
        const signUpPromise = createUserWithEmailAndPassword(auth, finalEmail, cleanPassword);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 8000)
        );

        const userCredential = await Promise.race([signUpPromise, timeoutPromise]);
        await updateProfile(userCredential.user, { displayName });
        toast.success('Sua conta foi criada! Bem-vindo.');
      }
    } catch (error: any) {
      console.error("Auth error occurred:", error);
      const errCode = (error.code || '').toLowerCase();
      const errMsg = (error.message || '').toLowerCase();
      
      const isTimeout = error.message === 'TIMEOUT' || errMsg.includes('timeout');
      const isOpNotAllowed = errCode === 'auth/operation-not-allowed' || errMsg.includes('operation-not-allowed');
      const isEmailInUse = errCode === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use');
      const isWeakPass = errCode === 'auth/weak-password' || errMsg.includes('weak-password');
      const isInvalidCreds = 
        errCode === 'auth/invalid-credential' || 
        errCode === 'auth/user-not-found' || 
        errCode === 'auth/wrong-password' ||
        errMsg.includes('invalid-credential') || 
        errMsg.includes('user-not-found') || 
        errMsg.includes('wrong-password') ||
        errMsg.includes('auth/invalid-credential');
      const isInvalidEmail = errCode === 'auth/invalid-email' || errMsg.includes('invalid-email');

      if (isTimeout) {
        setLastAuthError('TIMEOUT');
        toast.error('Tempo limite de conexão esgotado. Verifique se o método "E-mail/Senha" está ativado na Autenticação do Console Firebase, ou tente novamente com sua internet.');
      } else if (isOpNotAllowed) {
        setLastAuthError('OP_NOT_ALLOWED');
        toast.error('O provedor de e-mail e senha está desativado no Firebase. Ative o método "E-mail/Senha" no seu console Firebase (Seção de Autenticação para que logins de equipe funcionem).');
      } else if (isEmailInUse) {
        setLastAuthError('EMAIL_IN_USE');
        toast.error('Este usuário/e-mail já está em uso.');
      } else if (isWeakPass) {
        setLastAuthError('WEAK_PASSWORD');
        toast.error('A senha deve ter pelo menos 6 caracteres.');
      } else if (isInvalidCreds) {
        setLastAuthError('INVALID_CREDENTIALS');
        toast.error(`Usuário ou senha incorretos para o acesso de: "${finalEmail}". Se você cadastrou este usuário na aba Equipe, certifique-se de que a senha está correta e utilize o formato correto do usuário.`);
      } else if (isInvalidEmail) {
        setLastAuthError('INVALID_EMAIL');
        toast.error(`O formato do usuário ou e-mail é inválido: ${finalEmail}`);
      } else {
        setLastAuthError('UNKNOWN');
        toast.error(`Erro na autenticação (${finalEmail}): ` + (error.message || 'Desconhecido'));
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear URL parameters upon logout to ensure a clean login screen
      window.location.href = window.location.origin + window.location.pathname;
      toast.success('Sessão encerrada.');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4">
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

  // If user is not logged in, show the standard login page.
  // The inviteCodeUrl will stay in the URL and be processed by the CompanyWizard after login.
  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0f1115] p-6 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 text-center py-8">
          <div className="space-y-4">
            {inviteCodeUrl && (
              <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/30 p-4 rounded-xl flex items-center gap-4 mb-4 text-left animate-in slide-in-from-top duration-700">
                <div className="p-2 bg-[#3b82f6] rounded-lg text-white">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm uppercase tracking-tighter italic">Voucher de Adesão Detectado!</h3>
                  <p className="text-[#a0a0a0] text-[10px]">Crie sua conta agora para ativar seu acesso exclusivo com o código <span className="text-white font-mono">{inviteCodeUrl}</span></p>
                </div>
              </div>
            )}
            
            {appSettings.logoUrl ? (
              <div className="mx-auto flex h-24 w-auto items-center justify-center overflow-hidden mb-4">
                <img src={appSettings.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3b82f6] text-white shadow-xl shadow-blue-900/20">
                <Shield size={32} />
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {inviteCodeUrl ? 'Ativação de Cadastro' : (currentCompany?.name || appSettings.companyName || 'SegurPro SaaS')}
            </h1>
            <p className="text-[#71717a]">
              {inviteCodeUrl 
                ? 'Use o formulário abaixo para criar sua conta e ativar seu código de liberação.' 
                : 'Controle total para instaladores de segurança eletrônica.'}
            </p>
          </div>

          <Card className={`border-[#2d3139] bg-[#1a1d23] ${inviteCodeUrl ? 'ring-2 ring-blue-500/30 shadow-2xl shadow-blue-500/10' : ''}`}>
            <CardHeader>
              <CardTitle className="text-white">
                {inviteCodeUrl 
                  ? (authMode === 'login' ? 'Vincular Convite' : 'Criar Conta de Admin') 
                  : (authMode === 'login' ? 'Bem-vindo' : 'Criar Conta')}
              </CardTitle>
              <CardDescription className="text-[#71717a]">
                {inviteCodeUrl ? (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg mb-2 text-left">
                     <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                       <Shield size={14} /> Convite Mestre Detectado
                     </p>
                     <p className="text-white text-xs mt-1">
                       Identificamos o código <span className="font-mono font-bold text-blue-300">{inviteCodeUrl}</span>. 
                       {authMode === 'register' ? ' Cadastre-se para ativar sua nova empresa.' : ' Entre para vincular este acesso à sua conta.'}
                     </p>
                  </div>
                ) : (authMode === 'login' ? 'Faça login para gerenciar suas visitas e finanças.' : 'Cadastre-se para começar a usar o sistema.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastAuthError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-[#1a1d23] border border-[#2d3139] rounded-xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
                    {/* Header of Modal */}
                    <div className="p-5 border-b border-[#2d3139] bg-[#1f232b] flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400">
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm md:text-base">
                          {lastAuthError === 'INVALID_CREDENTIALS' 
                            ? 'Credencial Inválida ou Não Encontrada' 
                            : lastAuthError === 'TIMEOUT' 
                              ? 'Tempo de Conexão Esgotado' 
                              : 'Problema na Autenticação'}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Identificamos o seguinte detalhe:</p>
                      </div>
                    </div>
                    
                    {/* Content of Modal */}
                    <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto text-xs md:text-sm text-gray-300">
                      {lastAuthError === 'INVALID_CREDENTIALS' ? (
                        <div className="space-y-3 leading-relaxed">
                          <p className="text-[#e2e8f0]">
                            O Firebase retornou <span className="text-red-400 font-mono text-[11px] bg-[#0f1115] px-1.5 py-0.5 rounded border border-[#2d3139]">auth/invalid-credential</span>. Se o login está falhando, considere as soluções mais comuns:
                          </p>
                          <div className="bg-[#0f1115] rounded-lgs p-3.5 border border-[#2d3139]/55 space-y-3 rounded-lg text-xs">
                            <div className="space-y-1">
                              <p className="font-bold text-white text-[11.5px] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Fez o primeiro acesso via Google?
                              </p>
                              <p className="text-[#b0b0b0] text-[11px] pl-3">
                                Se você se cadastrou clicando no botão do Google, você <span className="text-blue-400 font-bold">não tem uma senha tradicional</span> cadastrada. Entre utilizando o botão <strong className="text-white">Google</strong> abaixo.
                              </p>
                            </div>
                            
                            <hr className="border-[#2d3139]/40" />

                            <div className="space-y-1">
                              <p className="font-bold text-white text-[11.5px] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Quer usar Senha Tradicional?
                              </p>
                              <p className="text-[#b0b0b0] text-[11px] pl-3">
                                Se você usava o Google mas agora quer entrar com e-mail/senha tradicional, clique no botão <button type="button" onClick={() => { setLastAuthError(null); handlePasswordReset(); }} className="text-blue-400 font-semibold underline hover:text-blue-300 focus:outline-none">Esqueceu a senha?</button>. Você receberá um e-mail para registrar sua senha.
                              </p>
                            </div>

                            <hr className="border-[#2d3139]/40" />

                            <div className="space-y-1">
                              <p className="font-bold text-white text-[11.5px] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Usuários Criados Pelo Administrador
                              </p>
                              <p className="text-[#b0b0b0] text-[11px] pl-3">
                                Se você é membro de equipe, o seu usuário é o seu e-mail cadastrado em letras minúsculas. Certifique-se de que não possui espaços ou letras maiúsculas.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : lastAuthError === 'TIMEOUT' ? (
                        <p className="leading-relaxed text-xs text-gray-300">
                          O servidor Firebase demorou mais que 8 segundos para responder. Verifique se o método de "E-mail/Senha" está devidamente ativado na aba "Autenticação" do seu console Firebase ou tente novamente com outra conexão de internet.
                        </p>
                      ) : lastAuthError === 'OP_NOT_ALLOWED' ? (
                        <p className="leading-relaxed text-xs text-gray-300">
                          O provedor de e-mail e senha está desativado no Firebase. Ative o método "E-mail/Senha" no seu console Firebase (Seção de Autenticação para que logins de equipe funcionem).
                        </p>
                      ) : lastAuthError === 'EMAIL_IN_USE' ? (
                        <p className="leading-relaxed text-xs text-gray-300">
                          Este usuário ou e-mail já está em uso em uma conta no sistema. Por favor utilize uma credencial diferente ou faça o login com o Google.
                        </p>
                      ) : lastAuthError === 'WEAK_PASSWORD' ? (
                        <p className="leading-relaxed text-xs text-gray-300">
                          A senha inserida é considerada fraca pela segurança do Firebase. A senha deve ter pelo menos 6 caracteres.
                        </p>
                      ) : lastAuthError === 'INVALID_EMAIL' ? (
                        <p className="leading-relaxed text-xs text-gray-300">
                          O formato do usuário ou e-mail é considerado inválido pelo Firebase. Verifique se digitou corretamente.
                        </p>
                      ) : (
                        <p className="leading-relaxed text-xs text-gray-300">
                          Usuário ou senha incorretos. Se você foi cadastrado pelo administrador de equipe, verifique letras maiúsculas/minúsculas e certifique-se de que a senha inserida está correta.
                        </p>
                      )}
                    </div>

                    {/* Footer of Modal */}
                    <div className="p-4 bg-[#14161c] border-t border-[#2d3139] flex flex-col md:flex-row gap-2 justify-end">
                      <Button 
                        type="button" 
                        onClick={() => {
                          setLastAuthError(null);
                          handleLogin();
                        }}
                        variant="outline"
                        className="w-full md:w-auto gap-2 border-[#2d3139] text-white hover:bg-[#2d3139] h-10 px-4 text-xs font-semibold"
                      >
                        <svg className="h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                          <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Entrar com Google
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => setLastAuthError(null)}
                        className="w-full md:w-auto bg-[#3b82f6] hover:bg-[#2563eb] text-white border-none h-10 px-6 text-xs font-semibold"
                      >
                        Ok
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth-pass" className="text-[#a0a0a0]">Senha</Label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        className="text-[11px] text-[#3b82f6] hover:text-blue-300 hover:underline transition-colors focus:outline-none"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
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

              <div className="pt-2 border-t border-[#2d3139]/50 mt-4">
                <a 
                  href="?assinatura=portal"
                  className="flex items-center justify-center gap-2 text-xs text-[#71717a] hover:text-white transition-colors py-2"
                >
                  <Key size={12} />
                  Área de Assinatura do Cliente
                </a>
              </div>

              {((import.meta as any).env.VITE_LOCAL_DB === 'true') && (
                <div className="pt-2 border-t border-[#2d3139]/50 mt-1">
                  <Button 
                    onClick={async () => {
                      const confirmClose = window.confirm("Deseja realmente encerrar o servidor local do SegurPro e fechar o programa?");
                      if (!confirmClose) return;
                      try {
                        toast.info("Encerrando o servidor local...");
                        await fetch('/api/system/shutdown', { method: 'POST' });
                      } catch (e) {
                        console.error("Não foi possível enviar comando de finalização ao servidor.", e);
                      }
                      window.close();
                      setTimeout(() => {
                        document.body.innerHTML = `
                          <div style="min-height: 100vh; background-color: #0f1115; color: #e0e0e0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
                            <div style="background-color: #1a1d23; border: 1px solid #2d3139; padding: 32px; border-radius: 12px; max-w: 400px; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
                              <div style="width: 48px; height: 48px; background-color: rgba(239, 68, 68, 0.1); border-radius: 9999px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; border: 1px solid rgba(239, 68, 68, 0.2);">
                                <span style="color: #ef4444; font-size: 24px; font-weight: bold; line-height: 1;">✕</span>
                              </div>
                              <h2 style="color: #ffffff; margin-top: 0; font-size: 18px; font-weight: bold; text-transform: uppercase; tracking-wider; margin-bottom: 8px;">Servidor Encerrado</h2>
                              <p style="color: #a0a0a0; font-size: 13px; margin-bottom: 24px; line-height: 1.5;">O servidor local do SegurPro foi finalizado com sucesso.</p>
                              <p style="color: #71717a; font-size: 11px; font-style: italic;">Você já pode fechar esta janela do seu navegador.</p>
                            </div>
                          </div>
                        `;
                      }, 300);
                    }}
                    variant="outline"
                    className="w-full gap-2 border-red-500/20 text-red-400 hover:bg-neutral-950 hover:text-red-500 transition-all h-9 text-[10px] font-black uppercase tracking-wider mt-1 border-dashed"
                  >
                    <Power size={11} />
                    Encerrar Servidor & Fechar Programa
                  </Button>
                </div>
              )}
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
        <CompanyWizard 
          onCreate={handleCreateCompany} 
          onJoin={handleJoinCompany} 
          initialCode={inviteCodeUrl || undefined}
        />
      </div>
    );
  }

  // Verification if company is blocked - Super Admin bypasses this
  if (currentCompany && currentCompany.status === 'blocked' && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
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
      <aside className="hidden flex-col border-r border-[#2d3139] bg-[#1a1d23]">
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
            {canAccess('inventory') && (
              <SidebarItem 
                icon={<Package size={18} />} 
                label="Estoque" 
                active={activeTab === 'inventory'} 
                onClick={() => setActiveTab('inventory')} 
              />
            )}
            {canAccess('pdv') && (
              <SidebarItem 
                icon={<ShoppingCart size={18} />} 
                label="PDV (Vendas)" 
                active={activeTab === 'pdv'} 
                onClick={() => setActiveTab('pdv')} 
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
          <Button variant="ghost" className="w-full justify-between gap-2 text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={handleLogout}>
            <div className="flex items-center gap-2">
              <LogOut size={18} />
              Logout
            </div>
            <span className="text-[10px] opacity-60">Ver. 1.5</span>
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
            {canAccess('inventory') && (
              <SidebarItem 
                icon={<Package size={20} />} 
                label="Estoque" 
                active={activeTab === 'inventory'} 
                onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} 
              />
            )}
            {canAccess('pdv') && (
              <SidebarItem 
                icon={<ShoppingCart size={20} />} 
                label="PDV (Vendas)" 
                active={activeTab === 'pdv'} 
                onClick={() => { setActiveTab('pdv'); setIsMobileMenuOpen(false); }} 
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
            <Button variant="ghost" className="w-full justify-between gap-2 text-[#a0a0a0]" onClick={handleLogout}>
              <div className="flex items-center gap-2">
                <LogOut size={18} />
                Logout
              </div>
              <span className="text-[10px] opacity-60">Ver. 1.5</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-16 md:pt-0 overflow-hidden">
        <header className="hidden md:flex h-20 items-center justify-between px-8 border-b border-[#2d3139] bg-[#1a1d23]">
          {/* Left: Logo & Company Name */}
          <div className="flex items-center gap-5">
            {appSettings.logoUrl ? (
              <img src={appSettings.logoUrl} alt="Logo" className="h-15 w-auto object-contain max-w-[100px]" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white shadow-lg shadow-blue-500/20">
                <Shield size={28} className="fill-white/20" />
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="font-bold tracking-wider text-white text-xs uppercase leading-snug">
                {appSettings?.companyName || currentCompany?.companyName || currentCompany?.name || 'SegurPro Gestão'}
              </span>
              <span className="text-[9px] text-[#71717a] uppercase tracking-widest leading-none">
                {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Center: Active Tab Title */}
          <div className="text-center">
            <h2 className="text-lg font-medium text-white capitalize tracking-wide leading-none">
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
               activeTab === 'inventory' ? 'Controle de Estoque' :
               activeTab === 'pdv' ? 'Vendas' :
               activeTab.replace('-', ' ')}
            </h2>
          </div>

          {/* Right: User profile with badge and logout button */}
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <Badge className="bg-yellow-500/10 text-yellow-500 text-[10px] uppercase font-bold px-2 py-0.5 border border-yellow-500/20">
                Master
              </Badge>
            )}
            
            {user && (
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#2d3139]/30 border border-[#2d3139]/50">
                <div className="h-7 w-7 rounded-full bg-[#2d3139] flex items-center justify-center overflow-hidden border border-[#2d3139]">
                  {user.photoURL && !userPhotoError ? (
                    <img 
                      src={user.photoURL} 
                      alt="" 
                      referrerPolicy="no-referrer" 
                      onError={() => setUserPhotoError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : <UserIcon size={14} />}
                </div>
                <div className="text-left leading-none">
                  <p className="text-xs font-semibold text-white truncate max-w-[120px]">{user.displayName || 'Usuário Sem Nome'}</p>
                  <p className="text-[9px] text-[#71717a] truncate max-w-[120px]">{user.email}</p>
                </div>
              </div>
            )}

            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9 text-[#a0a0a0] hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-[#2d3139]/50" 
              onClick={handleLogout}
              title="Fazer Logout"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </header>

        {/* Horizontal Scrollable Menu bar with premium scrollbar */}
        <div className="w-full bg-[#16191f] border-b border-[#2d3139] shadow-md select-none sticky top-0 z-30">
          <div className="overflow-x-auto flex items-center gap-2 px-4 py-2 hover:scrollbar-thumb-blue-500/85 transition-all horizontal-menu-scrollbar" style={{ scrollbarWidth: 'auto' }}>
            <div className="flex items-center gap-1.5 min-w-max pb-1">
              {[
                { id: 'dashboard', label: 'Painel Geral', icon: <LayoutDashboard size={14} />, show: canAccess('dashboard') },
                { id: 'visits', label: 'Visitas Técnicas', icon: <CalendarIcon size={14} />, show: canAccess('visits') },
                { id: 'service-orders', label: 'OS', icon: <CheckCircle2 size={14} />, show: canAccess('service-orders') },
                { id: 'inventory', label: 'Estoque', icon: <Package size={14} />, show: canAccess('inventory') },
                { id: 'pdv', label: 'PDV (Vendas)', icon: <ShoppingCart size={14} />, show: canAccess('pdv') },
                { id: 'budgets', label: 'Orçamentos', icon: <FileText size={14} />, show: canAccess('budgets') },
                { id: 'financial', label: 'Financeiro', icon: <DollarSign size={14} />, show: canAccess('financial') },
                { id: 'receipts', label: 'Recibos', icon: <ReceiptIcon size={14} />, show: canAccess('receipts') },
                { id: 'clients', label: 'Clientes', icon: <UserIcon size={14} />, show: canAccess('clients') },
                { id: 'suppliers', label: 'Fornecedores', icon: <Database size={14} />, show: canAccess('suppliers') },
                { id: 'reports', label: 'Relatórios', icon: <FileText size={14} />, show: canAccess('reports') },
                { id: 'users', label: 'Equipe', icon: <Users size={14} />, show: canAccess('users') },
                { id: 'logs', label: 'Logs', icon: <History size={14} />, show: canAccess('logs') },
                { id: 'settings', label: 'Configurações', icon: <Settings size={14} />, show: canAccess('settings') },
                { id: 'super-admin', label: 'Admin SaaS', icon: <Shield size={14} className="text-yellow-500" />, show: isSuperAdmin }
              ].filter(t => t.show).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200",
                    activeTab === tab.id 
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-semibold" 
                      : "text-[#71717a] hover:text-[#e0e0e0] hover:bg-[#1a1d23] border border-transparent"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={cn("flex-1 overflow-y-auto bento-scrollbar", activeTab === 'pdv' ? "p-0 h-full overflow-hidden" : "p-6 md:p-10")}>
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
              receipts={receipts}
              user={user!} 
              clients={clients} 
              inventory={inventory}
              updateStock={updateInventoryStock}
              appSettings={appSettings} 
              pixSettings={pixSettings} 
              companyId={effectiveCompanyId || ''} 
              initialFilter={visitsFilter}
              onClearFilter={() => setVisitsFilter({ date: null })}
              showList={canViewList('visits')}
              logAction={logAction}
              onEditClick={onEditClick}
              onSignatureClick={onSignatureClick}
              externalEditAction={interpretedEditAction?.type === 'visit' ? interpretedEditAction.data : null}
              onExternalEditHandled={() => setInterpretedEditAction(null)}
            />
          )}
          {activeTab === 'financial' && (
            <FinancialManager 
              financials={financials} 
              visits={visits} 
              clients={clients} 
              pixSettings={pixSettings} 
              companyId={effectiveCompanyId || ''} 
              showList={canViewList('financial')}
              logAction={logAction}
              viewPeriod={viewPeriod}
              setViewPeriod={setViewPeriod}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
            />
          )}
          {activeTab === 'budgets' && (
            <BudgetsManager 
              budgets={budgets} 
              clients={clients} 
              inventory={inventory}
              appSettings={appSettings} 
              pixSettings={pixSettings} 
              companyId={effectiveCompanyId || ''} 
              showList={canViewList('budgets')} 
              logAction={logAction}
              onEditClick={onEditClick}
              onSignatureClick={onSignatureClick}
              externalEditAction={interpretedEditAction?.type === 'budget' ? interpretedEditAction.data : null}
              onExternalEditHandled={() => setInterpretedEditAction(null)}
            />
          )}
          {activeTab === 'service-orders' && (
            <ServiceOrdersManager 
              serviceOrders={serviceOrders} 
              clients={clients} 
              users={users}
              inventory={inventory}
              updateStock={updateInventoryStock}
              appSettings={appSettings} 
              pixSettings={pixSettings}
              companyId={effectiveCompanyId || ''} 
              showList={canViewList('service-orders')}
              logAction={logAction}
              onEditClick={onEditClick}
              onSignatureClick={onSignatureClick}
              externalEditAction={interpretedEditAction?.type === 'service-order' ? interpretedEditAction.data : null}
              onExternalEditHandled={() => setInterpretedEditAction(null)}
              user={user}
            />
          )}
          {activeTab === 'clients' && (
            <ClientsManager 
              clients={clients} 
              appSettings={appSettings} 
              pixSettings={pixSettings} 
              companyId={effectiveCompanyId || ''} 
              showList={canViewList('clients')} 
              logAction={logAction} 
              onEditClick={onEditClick}
              onSignatureClick={onSignatureClick}
              externalEditAction={interpretedEditAction?.type === 'contract' ? interpretedEditAction.data : null}
              onExternalEditHandled={() => setInterpretedEditAction(null)}
            />
          )}
          {activeTab === 'suppliers' && <SuppliersManager suppliers={suppliers} companyId={effectiveCompanyId || ''} showList={canViewList('suppliers')} />}
          {activeTab === 'receipts' && (
            <ReceiptsManager 
              receipts={receipts} 
              clients={clients} 
              pixSettings={pixSettings} 
              appSettings={appSettings} 
              companyId={effectiveCompanyId || ''} 
              currentUserData={currentUserData} 
              showList={canViewList('receipts')} 
              onEditClick={onEditClick}
              externalEditAction={interpretedEditAction?.type === 'receipt' ? interpretedEditAction.data : null}
              onExternalEditHandled={() => setInterpretedEditAction(null)}
            />
          )}
          {activeTab === 'reports' && (
            <ReportsManager 
              visits={visits} 
              financials={financials} 
              budgets={budgets} 
              clients={clients} 
              receipts={receipts} 
              serviceOrders={serviceOrders}
              suppliers={suppliers}
              sales={sales}
              appSettings={appSettings} 
              companyId={effectiveCompanyId || ''}
              showList={canViewList('reports')}
            />
          )}
          {activeTab === 'users' && <UsersManager users={users} currentUserData={currentUserData} currentCompany={currentCompany} showList={canViewList('users')} userRoles={userRoles} logAction={logAction} />}
          
          {activeTab === 'inventory' && (
            <InventoryManager 
              inventory={inventory} 
              transactions={inventoryTransactions}
              serviceOrders={serviceOrders}
              visits={visits}
              companyId={effectiveCompanyId || ''} 
              logAction={logAction}
              showList={canViewList('inventory')}
            />
          )}

          {activeTab === 'pdv' && (
            <PDVManager 
              inventory={inventory}
              clients={clients}
              updateStock={updateInventoryStock}
              companyId={effectiveCompanyId || ''}
              logAction={logAction}
              pixSettings={pixSettings}
              appSettings={appSettings}
              user={user}
              cart={posCart}
              setCart={setPosCart}
              discount={posDiscount}
              setDiscount={setPosDiscount}
              selectedClient={posSelectedClient}
              setSelectedClient={setPosSelectedClient}
              paymentMethod={posPaymentMethod}
              setPaymentMethod={setPosPaymentMethod}
              linkedOS={posLinkedOS}
              setLinkedOS={setPosLinkedOS}
              cardDetails={posCardDetails}
              setCardDetails={setPosCardDetails}
              selectedPixAccountId={posSelectedPixAccountId}
              setSelectedPixAccountId={setPosSelectedPixAccountId}
              sales={sales}
              currentUserData={currentUserData}
              isSuperAdmin={isSuperAdmin}
              canManageSales={canManage('pdv')}
            />
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic text-[#3b82f6]">Logs do Sistema</h2>
                <div className="flex items-center justify-between">
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
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#1a1d23] border border-[#2d3139] px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] text-[#71717a] font-medium uppercase min-w-fit">Filtros:</span>
                    <Select value={logSearchUser} onValueChange={setLogSearchUser}>
                      <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[120px]">
                        <SelectValue placeholder="Usuário">
                          {users.find(u => (u.uid || u.displayName) === logSearchUser)?.displayName || (logSearchUser === 'all' ? 'Todos Usuários' : logSearchUser)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="all">Todos Usuários</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id || u.uid} value={u.uid || u.displayName}>{u.displayName || u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />
                    <Input 
                      type="date" 
                      className="h-7 bg-transparent border-none text-[12px] w-[110px] p-0 focus-visible:ring-0" 
                      value={logSearchDate}
                      onChange={e => setLogSearchDate(e.target.value)}
                    />
                    { (logSearchUser !== 'all' || logSearchDate !== '') && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 text-[#71717a] hover:text-[#ef4444]" 
                        onClick={() => { setLogSearchUser('all'); setLogSearchDate(''); }}
                      >
                        <X size={12} />
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    toast.info('Sincronizado em tempo real');
                  }} className="text-[#a0a0a0] hover:text-white bg-[#1a1d23] border-[#2d3139] border">
                    <RefreshCw size={16} className="mr-2" /> Atualizar
                  </Button>
                </div>

                <Card 
                  className="border-[#2d3139] bg-[#1a1d23] overflow-hidden shadow-xl focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  tabIndex={0}
                onKeyDown={(e) => {
                  const filteredLogs = logs.filter(log => {
                    const userMatch = logSearchUser === 'all' || log.userId === logSearchUser || log.userName === logSearchUser;
                    const logDate = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp.seconds * 1000);
                    const dateMatch = logSearchDate === '' || format(logDate, 'yyyy-MM-dd') === logSearchDate;
                    return userMatch && dateMatch;
                  });
                  if (!filteredLogs.length) return;
                  const currentIndex = filteredLogs.findIndex(l => l.id === selectedLogId);
                  
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    const nextIndex = Math.min(currentIndex + 1, filteredLogs.length - 1);
                    setSelectedLogId(filteredLogs[nextIndex].id);
                    document.getElementById(`log-${filteredLogs[nextIndex].id}`)?.scrollIntoView({ block: 'nearest' });
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    const nextIndex = Math.max(currentIndex - 1, 0);
                    setSelectedLogId(filteredLogs[nextIndex].id);
                    document.getElementById(`log-${filteredLogs[nextIndex].id}`)?.scrollIntoView({ block: 'nearest' });
                  }
                }}
              >
                <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                  <TableDoubleScroll>
                    <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="bg-[#0f1115] border-b border-[#2d3139] sticky top-0 z-20">
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Data/Hora</th>
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Usuário</th>
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Ação</th>
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Recurso</th>
                        <th className="p-4 text-xs font-bold text-[#71717a] uppercase tracking-wider">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d3139]">
                      {logs.filter(log => {
                        const userMatch = logSearchUser === 'all' || log.userId === logSearchUser || log.userName === logSearchUser;
                        const logDate = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp.seconds * 1000);
                        const dateMatch = logSearchDate === '' || format(logDate, 'yyyy-MM-dd') === logSearchDate;
                        return userMatch && dateMatch;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <History size={40} className="text-[#2d3139]" />
                              <p className="text-[#a0a0a0] font-medium">Nenhum log encontrado para os filtros selecionados.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        logs.filter(log => {
                          const userMatch = logSearchUser === 'all' || log.userId === logSearchUser || log.userName === logSearchUser;
                          const logDate = log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp.seconds * 1000);
                          const dateMatch = logSearchDate === '' || format(logDate, 'yyyy-MM-dd') === logSearchDate;
                          return userMatch && dateMatch;
                        }).map((log) => {
                          const translateDetails = (details: string) => {
                            if (!details) return '';
                            let d = details;
                            d = d.replace(/Agendou visita para/g, 'Agendou visita para');
                            d = d.replace(/Created/g, 'Criou');
                            d = d.replace(/Updated/g, 'Editou');
                            d = d.replace(/Deleted/g, 'Excluiu');
                            d = d.replace(/viewed/g, 'visualizou');
                            d = d.replace(/logged in/g, 'entrou no sistema');
                            d = d.replace(/Status updated to/g, 'Status atualizado para');
                            d = d.replace(/Financial record created/g, 'Registro financeiro criado');
                            d = d.replace(/visit/g, 'visita');
                            d = d.replace(/budget/g, 'orçamento');
                            d = d.replace(/financial/g, 'financeiro');
                            d = d.replace(/client/g, 'cliente');
                            d = d.replace(/receipt/g, 'recibo');
                            d = d.replace(/service order/g, 'ordem de serviço');
                            d = d.replace(/signature request/g, 'pedido de assinatura');
                            d = d.replace(/Acessou menu/g, 'Acessou o menu');
                            return d;
                          };

                          return (
                            <tr 
                              key={log.id}
                              id={`log-${log.id}`}
                              onClick={() => setSelectedLogId(log.id)}
                              className={cn(
                                "transition-colors group cursor-pointer border-b border-[#2d3139]",
                                selectedLogId === log.id ? "bg-blue-500/10" : "hover:bg-white/[0.02]"
                              )}
                            >
                              <td className="p-4 whitespace-nowrap">
                                <div className="text-white text-sm font-medium">
                                  {format(log.timestamp instanceof Timestamp ? log.timestamp.toDate() : new Date(log.timestamp.seconds * 1000), 'dd/MM/yy HH:mm')}
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
                                  'bg-blue-500/10 text-blue-500 border border-blue-500/20'
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
                                  <span className="capitalize">{
                                    log.resourceType === 'visit' ? 'Visita' : 
                                    log.resourceType === 'financial' ? 'Financeiro' :
                                    log.resourceType === 'budget' ? 'Orçamento' :
                                    log.resourceType === 'client' ? 'Cliente' :
                                    log.resourceType === 'receipt' ? 'Recibo' :
                                    log.resourceType === 'service_order' ? 'O.S.' : 
                                    log.resourceType === 'signature_request' ? 'Assinatura' :
                                    log.resourceType === 'user' ? 'Usuário' :
                                    log.resourceType === 'menu' ? 'Menu' : log.resourceType
                                  }</span>
                                  {log.resourceName ? (
                                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">{log.resourceName}</span>
                                  ) : log.resourceId ? (
                                    <span className="text-[10px] bg-[#0f1115] px-1.5 py-0.5 rounded border border-[#2d3139] font-mono">#{log.resourceId.slice(-6)}</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="p-4 text-sm text-[#71717a] italic">
                                {translateDetails(log.details)}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                  </TableDoubleScroll>
                </div>
              </Card>
            </div>
          )}
          {activeTab === 'super-admin' && (
            <SuperAdminPanel 
              companies={allCompanies} 
              allFinancials={allFinancials} 
              allUsers={allGlobalUsers}
              saasSettings={saasSettings}
              user={user}
              selectedCompanyId={selectedCompanyId}
              setSelectedCompanyId={setSelectedCompanyId}
              viewPeriod={viewPeriod}
              setViewPeriod={setViewPeriod}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              currentUserData={currentUserData}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsManager 
              key={effectiveCompanyId}
              pixSettings={pixSettings} 
              appSettings={appSettings} 
              user={user!} 
              companyId={effectiveCompanyId || ''} 
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

        {/* Signature Dialog Removed */}
      </main>
    </div>
  );
}

function UsersManager({ users = [], currentUserData, currentCompany, showList, userRoles, logAction }: { users?: any[], currentUserData: any, currentCompany: any, showList: boolean, userRoles: UserRole[], logAction?: any }) {
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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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
      console.error("Erro ao cadastrar usuário da equipe:", error);
      const errCode = (error.code || '').toLowerCase();
      const errMsg = (error.message || '').toLowerCase();
      
      const isOpNotAllowed = errCode === 'auth/operation-not-allowed' || errMsg.includes('operation-not-allowed');
      const isWeakPass = errCode === 'auth/weak-password' || errMsg.includes('weak-password');
      const isEmailInUse = errCode === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use');
      const isInvalidCreds = errCode === 'auth/invalid-credential' || errMsg.includes('invalid-credential');

      if (isOpNotAllowed) {
        toast.error('Erro: O método "E-mail/Senha" está desativado no console Firebase. Ative-o na aba Autenticação -> Sign-in Method para criar contas de funcionários.');
      } else if (isWeakPass) {
        toast.error('A senha do funcionário deve conter pelo menos 6 caracteres.');
      } else if (isEmailInUse) {
        toast.error('Este e-mail já está cadastrado em outra conta.');
      } else if (isInvalidCreds) {
        toast.error('Erro de credencial no Firebase. Certifique-se de que o provedor de "E-mail/Senha" está devidamente ativado no console do Firebase.');
      } else {
        toast.error(`Erro ao cadastrar funcionário: ${error.message || 'Desconhecido'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const finalEmail = getFinalEmail(editingUser.email || '');
    if (!finalEmail || !finalEmail.includes('@')) {
      toast.error('O formato do usuário ou e-mail é inválido.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const originalUser = users.find(u => u.id === editingUser.id);
      const emailChanged = originalUser ? (originalUser.email?.trim().toLowerCase() !== finalEmail.trim().toLowerCase()) : false;

      // 1. Update metadata in Firestore first (Name, Email, Role)
      await updateDoc(doc(db, 'users', editingUser.id), {
        displayName: editingUser.displayName,
        email: finalEmail,
        role: editingUser.role
      });

      await logAction('update', 'user', `Atualizou dados do usuário ${editingUser.displayName} no Firestore (${finalEmail})`, editingUser.id);

      // 2. Try to sync with Firebase Auth if password or email changed
      let authSyncErrorType: 'API_DISABLED' | 'OTHER' | null = null;
      let authErrMsg = '';

      if (newPassword || emailChanged) {
        try {
          const response = await fetch('/api/admin/update-user-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              uid: editingUser.id, 
              newPassword: newPassword || undefined,
              newEmail: emailChanged ? finalEmail : undefined
            })
          });
          
          if (!response.ok) {
            const data = await response.json();
            const errText = data.error || 'Erro desconhecido';
            if (
              errText.includes("Identity Toolkit API") || 
              errText.includes("identitytoolkit.googleapis.com") ||
              errText.includes("SERVICE_DISABLED")
            ) {
              authSyncErrorType = 'API_DISABLED';
            } else {
              authSyncErrorType = 'OTHER';
              authErrMsg = errText;
            }
          }
        } catch (srvError: any) {
          console.error("Server user sync failed:", srvError);
          authSyncErrorType = 'OTHER';
          authErrMsg = srvError.message || 'Erro de conexão';
        }
      }

      setIsEditOpen(false);
      setEditingUser(null);
      setNewPassword('');

      if (authSyncErrorType === 'API_DISABLED') {
        toast.warning(
          <div className="space-y-2 text-left p-1 text-xs">
            <p className="font-bold text-amber-400">Salvo com Observação (API do Google Desativada)</p>
            <p className="text-gray-300 leading-relaxed">
              O nome e o nível de acesso foram atualizados! Porém, a alteração de <strong>e-mail/senha</strong> no servidor de login falhou porque a <strong>Identity Toolkit API</strong> está desativada no seu Cloud.
            </p>
            <div className="bg-black/60 rounded border border-white/10 p-2 font-mono text-[10px] select-all break-all text-blue-300">
              https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=154805406116
            </div>
            <p className="text-[10px] text-gray-400">
              Copie o link acima, abra-o no seu navegador para ativar a API e tente alterar o e-mail/senha novamente.
            </p>
          </div>,
          { duration: 20000 }
        );
      } else if (authSyncErrorType === 'OTHER') {
        toast.warning(`Dados atualizados no painel, mas houve um problema ao sincronizar a nova credencial no servidor de login: ${authErrMsg}`);
      } else {
        toast.success('Usuário atualizado com sucesso!');
      }
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message || 'Desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
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
      }

      setIsDeleteConfirmOpen(false);
      setUserToDelete(null);
      toast.success('Usuário removido com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Equipe e Acessos</h2>
        <p className="text-[#a0a0a0] text-sm">Gerencie os membros da sua equipe e permissões de acesso.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 bg-[#1a1d23] border border-[#2d3139] px-3 py-1.5 rounded-xl shadow-inner shadow-black/20">
            <div className="text-[10px] uppercase text-[#71717a] font-black tracking-widest">Código de Equipe:</div>
            <code className="text-[#3b82f6] font-mono font-bold text-sm">{currentCompany?.inviteCode || '---'}</code>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-[#71717a] hover:text-white"
                onClick={() => {
                  const inviteCode = currentCompany?.inviteCode;
                  if (inviteCode) {
                    const url = `${window.location.origin}${window.location.pathname}?code=${inviteCode}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link de convite copiado!');
                  } else {
                    toast.error('Gere um código nas configurações primeiro.');
                  }
                }}
                title="Copiar Link de Convite"
              >
                <Share2 size={12} />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#71717a] hover:text-white" title="Ver QR Code">
                    <QrCode size={12} />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white w-fit">
                  <DialogHeader>
                    <DialogTitle className="text-white text-center">Convite de Equipe</DialogTitle>
                    <DialogDescription className="text-center text-[#71717a] text-xs">Aponte a câmera para se juntar à empresa</DialogDescription>
                  </DialogHeader>
                  <div className="p-6 bg-white rounded-xl shadow-2xl flex items-center justify-center mx-auto">
                    <QRCodeCanvas 
                      value={`${window.location.origin}${window.location.pathname}?code=${currentCompany?.inviteCode}`}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="text-center font-mono font-bold text-lg tracking-widest mt-2">{currentCompany?.inviteCode}</div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#3b82f1] hover:bg-[#2563eb] text-white h-11 px-6 font-bold shadow-lg shadow-blue-500/10">
              <Plus size={18} />
              NOVO USUÁRIO
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[500px] shadow-2xl">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Cadastrar Novo Usuário</DialogTitle>
              <DialogDescription className="text-[#a0a0a0] text-xs">
                Crie um novo acesso para técnico ou administrador.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
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

      {showList ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
            {users.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl">
                 Nenhum usuário encontrado.
              </div>
            ) : (
              users.map((u) => (
                <Card key={u.id} className="bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#a0a0a0] hover:text-[#3b82f6] bg-[#0f1115]/80 backdrop-blur-sm" onClick={() => {
                          setEditingUser(u);
                          setIsEditOpen(true);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/20 bg-[#0f1115]/80 backdrop-blur-sm" onClick={() => {
                          setUserToDelete(u);
                          setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                       <div className={`w-2.5 h-2.5 rounded-full ${
                          (u.lastSeen && Date.now() - u.lastSeen.toDate().getTime() < 300000) 
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        }`} />
                       <h3 className="font-bold text-white text-sm truncate pr-14">{u.displayName}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        "font-semibold text-[9px] uppercase tracking-wider h-4",
                        u.role === 'owner' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                        u.role === 'admin' ? "bg-purple-500/10 text-purple-500" : 
                        u.role === 'secretaria' ? "bg-pink-500/10 text-pink-500" : 
                        u.role === 'tecnico' ? "bg-blue-500/10 text-blue-500" :
                        "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {userRoles.find(r => r.id === u.role)?.label || u.role}
                      </Badge>
                      <span className="text-[10px] text-[#71717a]">{u.email}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#2d3139]/50 mt-1">
                    <div className="flex items-center justify-between text-[11px] text-[#a0a0a0]">
                      <span>Cadastrado em:</span>
                      <span className="font-medium text-white">{u.createdAt ? format(u.createdAt instanceof Timestamp ? u.createdAt.toDate() : new Date(u.createdAt), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-y-auto max-h-[600px] relative">
            <TableDoubleScroll>
            <Table>
            <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[60px]">Ações</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[100px]">Status</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                       <div className={`w-2.5 h-2.5 rounded-full ${
                          (u.lastSeen && Date.now() - u.lastSeen.toDate().getTime() < 300000) 
                            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                            : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                       }`} title={u.lastSeen ? `Visto em: ${format(u.lastSeen.toDate(), 'dd/MM/yy HH:mm')}` : 'Nunca entrou'} />
                       <span className="text-[10px] font-bold uppercase tracking-tighter text-[#71717a]">
                        {(u.lastSeen && Date.now() - u.lastSeen.toDate().getTime() < 300000) ? 'Ativo' : 'Inativo'}
                       </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-white text-[13px]">
                     {u.displayName}
                  </TableCell>
                  <TableCell className="text-[12px] text-[#e0e0e0]">{u.email}</TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "font-semibold text-[10px] uppercase tracking-wider",
                      u.role === 'owner' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
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
          </TableDoubleScroll>
        </Card>
      )) : (
        <NoAccessList title="Equipe" />
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[500px] shadow-2xl">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Editar Usuário</DialogTitle>
              <DialogDescription className="text-[#a0a0a0] text-xs">
                Atualize as informações do usuário.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
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
                  <Label className="text-[#a0a0a0]">E-mail / Usuário</Label>
                  <Input 
                    value={editingUser.email || ''} 
                    onChange={e => setEditingUser({...editingUser, email: e.target.value})} 
                    placeholder="ex: joao ou email@exemplo.com"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Nível de Acesso</Label>
                  <Select value={editingUser.role || ''} onValueChange={(val: any) => setEditingUser({...editingUser, role: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue />
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

function ClientsManager({ clients = [], appSettings, pixSettings, companyId, showList, logAction, onEditClick, onSignatureClick, externalEditAction, onExternalEditHandled }: { clients: Client[], appSettings: AppSettings, pixSettings: PixSettings, companyId: string, showList: boolean, logAction?: any, onEditClick: (type: 'contract', data: any) => void, onSignatureClick: (type: 'contract', data: any) => void, externalEditAction: any, onExternalEditHandled: () => void }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClient, setNewClient] = useState<Partial<Client>>({
    type: 'Avulso',
    serviceObjects: [],
    paymentMethods: [],
    paymentDay: '',
    pixAccountId: ''
  });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    if (externalEditAction && onExternalEditHandled) {
      const data = { ...externalEditAction };
      if (data.createdAt instanceof Timestamp) data.createdAt = data.createdAt.toDate();
      if (data.updatedAt instanceof Timestamp) data.updatedAt = data.updatedAt.toDate();
      if (data.contractStartDate instanceof Timestamp) data.contractStartDate = data.contractStartDate.toDate();
      
      setEditingClient(data);
      setIsEditOpen(true);
      onExternalEditHandled();
    }
  }, [externalEditAction, onExternalEditHandled]);

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
    if (!newClient.name) {
      toast.error('Nome do cliente é obrigatório.');
      return;
    }
    
    setIsSubmitting(true);
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
      await logAction('create', 'client', `Cadastrou cliente ${clientData.name}`, docRef.id, clientData.name);
      
      setNewClient({ type: 'Avulso' });
      setIsAddOpen(false);
      toast.success('Cliente cadastrado com sucesso!');

      if (clientData.type === 'Contrato') {
        setPendingContractClient({ id: docRef.id, ...clientData } as Client);
        setIsContractConfirmOpen(true);
      }
    } catch (error) {
      toast.error('Erro ao cadastrar cliente.');
      handleFirestoreError(error, OperationType.CREATE, 'clients');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    setIsSubmitting(true);

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
      if (logAction) {
        await logAction('update', 'client', `Atualizou dados do cliente ${updatedData.name}`, id, updatedData.name);
      }
      
      setEditingClient(null);
      setIsEditOpen(false);
      toast.success('Cliente atualizado com sucesso!');

      if (updatedData.type === 'Contrato') {
        setPendingContractClient({ id, ...updatedData } as Client);
        setIsContractConfirmOpen(true);
      }
    } catch (error) {
      toast.error('Erro ao atualizar cliente.');
      handleFirestoreError(error, OperationType.UPDATE, 'clients');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Gestão de Clientes</h2>
        <p className="text-[#a0a0a0] text-sm">Visualize e gerencie sua base de clientes e contatos.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
          <Input 
            className="pl-10 h-11 bg-[#1a1d23] border-[#2d3139] text-white focus:ring-[#3b82f6] transition-all rounded-xl shadow-inner shadow-black/20" 
            placeholder="Pesquisar clientes por nome, email ou doc..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-1 md:flex-none">
          <div className="flex bg-[#1a1d23] p-1 rounded-lg border border-[#2d3139]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                "h-9 px-3 rounded-md transition-all",
                viewMode === 'table' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
              )}
            >
              <List size={16} className="mr-2" />
              <span className="text-xs font-bold uppercase">Lista</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                "h-9 px-3 rounded-md transition-all",
                viewMode === 'grid' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
              )}
            >
              <LayoutGrid size={16} className="mr-2" />
              <span className="text-xs font-bold uppercase">Colunas</span>
            </Button>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white h-11 px-8 font-bold shadow-lg shadow-blue-500/10 whitespace-nowrap">
                <Plus size={18} />
                NOVO CLIENTE
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px] shadow-2xl">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
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
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 border-[#2d3139] text-[#a0a0a0] hover:text-white">
                            Selecionar Objetos ({newClient.serviceObjects?.length || 0})
                          </Button>
                        </PopoverTrigger>
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
                            <SelectValue placeholder="Selecione a conta PIX" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                            {pixSettings.accounts?.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank} - {acc.document})</SelectItem>
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
              <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleAddClient} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px] shadow-2xl">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white">Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
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
                    <Select value={editingClient.type || ''} onValueChange={(val: any) => setEditingClient({...editingClient, type: val})}>
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
                      <Input 
                        id="edit-contractValue" 
                        type="number" 
                        value={editingClient.contractValue || ''} 
                        onChange={e => setEditingClient({...editingClient, contractValue: e.target.value === '' ? 0 : Number(e.target.value)})} 
                        onFocus={(e) => e.target.select()}
                        className="bg-[#0f1115] border-[#2d3139] text-white" 
                      />
                    </div>
                  )}
                </div>
  
                {editingClient.paymentMethods?.includes('PIX') && (
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Conta PIX Preferencial</Label>
                    <Select value={editingClient.pixAccountId || ''} onValueChange={(val) => setEditingClient({...editingClient, pixAccountId: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione a conta PIX">
                          {pixSettings.accounts?.find(acc => acc.id === editingClient.pixAccountId)?.label || editingClient.pixAccountId}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {pixSettings.accounts?.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank} - {acc.document})</SelectItem>
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
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 border-[#2d3139] text-[#a0a0a0] hover:text-white">
                            Selecionar Objetos ({editingClient.serviceObjects?.length || 0})
                          </Button>
                        </PopoverTrigger>
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
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button onClick={handleUpdateClient} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      {showList ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
            {filteredClients.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl font-bold">
                 Nenhum cliente encontrado.
              </div>
            ) : (
              filteredClients.map((client) => (
                <Card key={client.id} className="bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group shadow-lg">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#a0a0a0] hover:text-white bg-[#0f1115]/80 backdrop-blur-sm" onClick={() => onEditClick('contract', client)}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/10 bg-[#0f1115]/80 backdrop-blur-sm" onClick={() => {
                        setClientToDelete(client);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm truncate pr-16" title={client.name}>{client.name || 'Sem Nome'}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase border-[#2d3139] px-1 h-4",
                        client.type === 'Contrato' ? "text-[#3b82f6] border-[#3b82f6]/30 bg-[#3b82f6]/5" : "text-[#a0a0a0]"
                      )}>
                        {client.type || 'Avulso'}
                      </Badge>
                      <span className="text-[10px] text-[#71717a]">{client.document || 'Sem Documento'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[#2d3139]/50 mt-1">
                    <div className="flex items-center gap-2 text-[11px] text-[#a0a0a0]">
                      <Phone size={10} className="text-[#3b82f6]" />
                      <span className="truncate">{client.phone || 'Sem Telefone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#a0a0a0]">
                      <User size={10} className="text-[#3b82f6]" />
                      <span className="truncate">{client.email || 'Sem Email'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-[#a0a0a0]">
                      <PenTool size={10} className="text-[#3b82f6] mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1 italic">{client.address || 'Sem endereço'}</span>
                    </div>
                  </div>
                  <div className="mt-auto pt-2">
                    {client.type === 'Contrato' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-8 border-[#2d3139] text-[#3b82f6] hover:bg-[#3b82f6]/10 text-xs font-bold"
                        onClick={() => generateContractPDF(client, appSettings, pixSettings)}
                      >
                        <FileText size={12} className="mr-2" /> Gerar Contrato
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-y-auto max-h-[600px] relative">
          <TableDoubleScroll>
          <Table>
            <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[110px]">Ações</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Nome / Tipo</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Contato</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Contrato / Serviço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-all h-[70px]">
                  <TableCell className="w-[140px] p-2">
                    <div className="flex items-center gap-1.5 flex-nowrap transition-all">
                      <Button variant="outline" size="icon" title="Editar" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={() => {
                        onEditClick('contract', client);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                        setClientToDelete(client);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                      {client.type === 'Contrato' && (
                        <>
                          <div className="w-[1px] h-4 bg-[#2d3139] mx-0.5" />
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-7 w-7 border-[#2d3139] text-[#3b82f6] hover:bg-[#3b82f6]/10" 
                            title="Gerar Contrato PDF"
                            onClick={() => generateContractPDF(client, appSettings, pixSettings)}
                          >
                            <FileText size={12} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-[13px] truncate max-w-[200px]">{client.name || 'Sem Nome'}</span>
                        <Badge variant="outline" className={cn(
                          "text-[9px] uppercase border-[#2d3139] text-[#a0a0a0] px-1 h-3.5"
                        )}>
                          {client.type || 'Avulso'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-[#71717a] mt-0.5">{client.document || 'Sem Documento'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-[11px] text-[#a0a0a0]">
                      <div className="truncate max-w-[150px]">{client.email}</div>
                      <div className="flex items-center gap-1"><Phone size={10} /> {client.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-[11px]">
                      {client.type === 'Contrato' ? (
                        <>
                          <div className="text-white font-bold">R$ {Number(client.monthlyValue || 0).toFixed(2)}</div>
                          <div className="text-[10px] text-[#71717a]">Vencimento: <span className="text-blue-400">Dia {client.paymentDay}</span></div>
                        </>
                      ) : (
                        <span className="italic text-[#71717a] opacity-50">Serviços Avulsos</span>
                      )}
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
          </TableDoubleScroll>
        </Card>
      )) : (
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
                  if (logAction) {
                    await logAction('delete', 'client', `Excluiu o cliente ${clientToDelete.name}`, clientToDelete.id, clientToDelete.name);
                  }
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const filteredSuppliers = useMemo(() => {
    return (suppliers || []).filter(s => 
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.activity || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contact || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const handleAddSupplier = async () => {
    setIsSubmitting(true);
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
      toast.error('Erro ao cadastrar fornecedor.');
      handleFirestoreError(error, OperationType.CREATE, 'suppliers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    setIsSubmitting(true);
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
      toast.error('Erro ao atualizar fornecedor.');
      handleFirestoreError(error, OperationType.UPDATE, `suppliers/${editingSupplier.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Gestão de Fornecedores</h2>
        <p className="text-[#a0a0a0] text-sm">Cadastro e manutenção de parceiros comerciais.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
          <Input 
            className="pl-10 h-11 bg-[#1a1d23] border-[#2d3139] text-white focus:ring-[#3b82f6] transition-all rounded-xl shadow-inner shadow-black/20" 
            placeholder="Pesquisar fornecedores..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-[#1a1d23] p-1 rounded-lg border border-[#2d3139]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('table')}
            className={cn(
              "h-9 px-3 rounded-md transition-all",
              viewMode === 'table' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
            )}
          >
            <List size={16} className="mr-2" />
            <span className="text-xs font-bold uppercase">Lista</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn(
              "h-9 px-3 rounded-md transition-all",
              viewMode === 'grid' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
            )}
          >
            <LayoutGrid size={16} className="mr-2" />
            <span className="text-xs font-bold uppercase">Colunas</span>
          </Button>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white h-11 px-8 font-bold shadow-lg shadow-blue-500/10">
              <Plus size={18} />
              NOVO FORNECEDOR
            </Button>
          </DialogTrigger>
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[600px] shadow-2xl">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
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
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]">Cancelar</Button>
                <Button onClick={handleAddSupplier} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Cadastrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      {showList ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl">
                 Nenhum fornecedor encontrado.
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#a0a0a0] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 bg-[#0f1115]/80 backdrop-blur-sm" onClick={() => {
                        setEditingSupplier(supplier);
                        setIsEditOpen(true);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/20 bg-[#0f1115]/80 backdrop-blur-sm" onClick={() => {
                        setSupplierToDelete(supplier);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-white text-sm truncate pr-14" title={supplier.name}>{supplier.name || 'Sem Nome'}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] uppercase border-[#2d3139] text-[#a0a0a0] h-4">
                        {supplier.activity || 'Geral'}
                      </Badge>
                      <span className="text-[10px] text-[#71717a]">REF: {supplier.registrationNumber || '-'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[#2d3139]/50 mt-1">
                    <div className="flex items-center gap-2 text-[11px] text-[#a0a0a0]">
                      <Phone size={10} className="text-[#3b82f6]" />
                      <span>{supplier.phone || 'Sem Telefone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#a0a0a0]">
                      <User size={10} className="text-[#3b82f6]" />
                      <span className="truncate">{supplier.contact || 'Sem Contato'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[11px] text-[#a0a0a0]">
                      <PenTool size={10} className="text-[#3b82f6] mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1 italic">{supplier.address || 'Sem endereço'}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-y-auto max-h-[600px] shadow-2xl">
            <TableDoubleScroll>
            <Table>
            <TableHeader>
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="w-[40px] text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Ações</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Fornecedor</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Contato</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Ramo / Dados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-all h-[70px]">
                  <TableCell className="w-[100px] p-2">
                    <div className="flex items-center gap-1 flex-nowrap">
                      <Button variant="outline" size="icon" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10" onClick={() => {
                        setEditingSupplier(supplier);
                        setIsEditOpen(true);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                        setSupplierToDelete(supplier);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-[13px]">{supplier.name}</span>
                      <span className="text-[10px] text-[#71717a]">REF: {supplier.registrationNumber || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-[11px] text-[#a0a0a0]">
                      <div className="font-medium text-white/90 truncate max-w-[150px]">{supplier.contact || 'Sem contato'}</div>
                      <div className="flex items-center gap-1"><Phone size={10} /> {supplier.phone || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <Badge variant="outline" className="text-[9px] uppercase border-[#2d3139] text-[#a0a0a0] w-fit px-1 h-3.5">
                        {supplier.activity || 'Geral'}
                      </Badge>
                      <span className="text-[9px] text-[#71717a] mt-1 italic">Industrial / Comercial</span>
                    </div>
                  </TableCell>
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
          </TableDoubleScroll>
        </Card>
      )) : (
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
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]">Cancelar</Button>
            <Button onClick={handleUpdateSupplier} disabled={isSubmitting} className="bg-[#f59e0b] hover:bg-[#d97706] text-white">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
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
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]">Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (supplierToDelete) {
                setIsSubmitting(true);
                try {
                  await deleteDoc(doc(db, 'suppliers', supplierToDelete.id));
                  toast.success('Fornecedor removido.');
                  setIsDeleteConfirmOpen(false);
                  setSupplierToDelete(null);
                } catch (error) {
                  toast.error('Erro ao excluir fornecedor.');
                  handleFirestoreError(error, OperationType.DELETE, `suppliers/${supplierToDelete.id}`);
                } finally {
                  setIsSubmitting(false);
                }
              }
            }} disabled={isSubmitting} className="bg-[#ef4444] hover:bg-[#dc2626] text-white">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Receipts Manager Component ---

function ReceiptsManager({ receipts = [], clients = [], pixSettings, appSettings, companyId, currentUserData, showList, onEditClick, externalEditAction, onExternalEditHandled }: { receipts: Receipt[], clients: Client[], pixSettings: PixSettings, appSettings: AppSettings, companyId: string, currentUserData: any, showList: boolean, onEditClick: (type: 'receipt', data: any) => void, externalEditAction: any, onExternalEditHandled: () => void }) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [isReceiptConfirmOpen, setIsReceiptConfirmOpen] = useState(false);
  const [pendingReceiptForPdf, setPendingReceiptForPdf] = useState<Receipt | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // External edit action handler
  useEffect(() => {
    if (externalEditAction) {
      setEditingReceipt({ ...externalEditAction });
      setIsEditOpen(true);
      onExternalEditHandled();
    }
  }, [externalEditAction, onExternalEditHandled]);
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Aguardando Pagamento' | 'Recebido'>('Todos');
  const [dateFilterType, setDateFilterType] = useState<'diario' | 'mensal' | 'anual'>('diario');
  const [dayFilter, setDayFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [pixFilter, setPixFilter] = useState('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string | 'all'>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [newReceipt, setNewReceipt] = useState<Partial<Receipt>>({
    date: new Date(),
    value: 0,
    paymentMethod: 'PIX',
    clientType: 'Avulso',
    status: 'Aguardando Pagamento',
    referenceMonth: (() => {
      const m = format(new Date(), 'MMMM/yyyy', { locale: ptBR });
      return m.charAt(0).toUpperCase() + m.slice(1);
    })(),
    observations: '',
    clientId: '',
    pixAccountId: ''
  });

  const clientsWithReceipts = useMemo(() => {
    const clientsWithDataIds = Array.from(new Set(receipts.map(r => r.clientId).filter(Boolean)));
    return clients.filter(c => clientsWithDataIds.includes(c.id));
  }, [clients, receipts]);

  const availableDates = useMemo(() => {
    let filtered = receipts;
    if (selectedClientFilter !== 'all') {
      filtered = filtered.filter(r => r.clientId === selectedClientFilter);
    }
    const dates = filtered.map(r => {
      const d = safeParseDate(r.date);
      return format(d, 'yyyy-MM-dd');
    });
    return Array.from(new Set(dates)).sort().reverse();
  }, [receipts, selectedClientFilter]);

  const filteredClientsForSelect = useMemo(() => {
    return (clients || []).filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const syncReceiptToFinancial = async (receiptId: string, receiptData: any) => {
    try {
      // Check if financial record already exists for this receipt
      const q = query(collection(db, 'financial'), where('receiptId', '==', receiptId));
      const snapshot = await getDocs(q);
      
      if (receiptData.status === 'Recebido') {
        if (snapshot.empty) {
        await addDoc(collection(db, 'financial'), {
          type: 'Receita',
          category: receiptData.clientType === 'Contrato' ? 'Mensalidade Contrato' : 'Serviço Avulso',
          description: (() => {
            const m = receiptData.referenceMonth || format(new Date(), 'MMMM/yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase());
            const capM = m.charAt(0).toUpperCase() + m.slice(1);
            return `${formatRecordNumber(receiptData.number, receiptData.date)} - ${receiptData.clientName} - ${capM}`;
          })(),
          origin: receiptData.number ? formatRecordNumber(receiptData.number, receiptData.date) : 'Recibo',
          value: Number(receiptData.value),
          date: Timestamp.now(), // Usar data atual do recebimento
          paymentMethod: receiptData.paymentMethod || 'PIX',
          pixAccountId: receiptData.paymentMethod === 'Dinheiro' ? null : (receiptData.pixAccountId || null),
          serviceType: receiptData.clientType === 'Contrato' ? 'Contrato' : 'Serviço Normal',
          clientId: receiptData.clientId || null,
          receiptId: receiptId,
          companyId,
          createdAt: Timestamp.now()
        });
        toast.info('Lançamento financeiro realizado automaticamente!');
      }
    } else {
      // Remove from financial if no longer 'Recebido'
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'financial', docSnap.id));
        toast.info('Lançamento financeiro removido (mudança de status).');
      }
    }
  } catch (error) {
      console.error("Erro ao sincronizar recibo com financeiro:", error);
    }
  };

  const updateReceiptStatus = async (id: string, status: 'Aguardando Pagamento' | 'Recebido', receipt: Receipt) => {
    try {
      await updateDoc(doc(db, 'receipts', id), { status });
      await syncReceiptToFinancial(id, { ...receipt, status });
      toast.success(`Status do recibo atualizado para ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `receipts/${id}`);
    }
  };

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const filteredReceipts = useMemo(() => {
    let filtered = receipts;
    if (selectedClientFilter !== 'all') {
      filtered = filtered.filter(r => r.clientId === selectedClientFilter);
    }
    if (statusFilter !== 'Todos') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (dateFilterType === 'diario' && dayFilter) {
      filtered = filtered.filter(r => {
        const d = safeParseDate(r.date);
        return format(d, 'yyyy-MM-dd') === dayFilter;
      });
    } else if (dateFilterType === 'mensal' && monthFilter) {
      filtered = filtered.filter(r => {
        const d = safeParseDate(r.date);
        return format(d, 'yyyy-MM') === monthFilter;
      });
    } else if (dateFilterType === 'anual' && yearFilter) {
      filtered = filtered.filter(r => {
        const d = safeParseDate(r.date);
        return format(d, 'yyyy') === yearFilter;
      });
    }
    if (pixFilter !== 'all') {
      filtered = filtered.filter(r => r.pixAccountId === pixFilter);
    }
    return filtered;
  }, [receipts, statusFilter, dateFilterType, dayFilter, monthFilter, yearFilter, pixFilter, selectedClientFilter]);

  const handleAddReceipt = async () => {
    if (!newReceipt.clientName || !newReceipt.value || !newReceipt.paymentMethod) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    if (!companyId) {
      toast.error('Erro de identificação do sistema. Selecione uma empresa ou recarregue a página.');
      return;
    }
    setIsSubmitting(true);
    try {
      const formattedNumber = getNextFormattedNumber(receipts, 'RC-');
      
      const receiptData = {
        ...newReceipt,
        serviceSpecification: newReceipt.clientType === 'Contrato' 
          ? `Serviço Contratual - ${newReceipt.referenceMonth || ''}` 
          : newReceipt.serviceSpecification,
        pixAccountId: newReceipt.pixAccountId || null,
        number: formattedNumber,
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
        referenceMonth: (() => {
          const m = format(new Date(), 'MMMM/yyyy', { locale: ptBR });
          return m.charAt(0).toUpperCase() + m.slice(1);
        })(),
        observations: ''
      });
      setIsAddOpen(false);
      toast.success('Recibo gerado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'receipts');
      toast.error('Erro ao gerar recibo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReceipt = async () => {
    if (!editingReceipt || !editingReceipt.clientName || !editingReceipt.value) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { id, ...data } = editingReceipt;
      const receiptData = {
        ...data,
        serviceSpecification: data.clientType === 'Contrato' 
          ? `Serviço Contratual - ${data.referenceMonth || ''}` 
          : data.serviceSpecification,
        pixAccountId: editingReceipt.pixAccountId || null,
        date: Timestamp.fromDate(safeParseDate(editingReceipt.date))
      };
      
      await updateDoc(doc(db, 'receipts', id), receiptData);
      
      // Always call sync to handle both adding and removing based on status
      await syncReceiptToFinancial(id, receiptData);

      setEditingReceipt(null);
      setIsEditOpen(false);
      toast.success('Recibo atualizado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `receipts/${editingReceipt?.id}`);
      toast.error('Erro ao atualizar recibo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Gestão de Recibos</h2>
        <p className="text-[#a0a0a0] text-sm">Gere e consulte recibos de pagamentos profissionais.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-[#1a1d23] border border-[#2d3139] px-4 py-2 rounded-xl shadow-inner shadow-black/20 w-full">
            <span className="text-[10px] text-[#71717a] font-black uppercase tracking-widest min-w-fit">Filtros:</span>
            
            <Popover open={isClientFilterOpen} onOpenChange={setIsClientFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-8 border-none bg-transparent text-[11px] p-0 focus:ring-0 gap-1 w-[150px] justify-between font-bold uppercase tracking-wider text-white"
                >
                  <span className="truncate">
                    {selectedClientFilter === 'all' 
                      ? "Todos Clientes" 
                      : clients.find((client) => client.id === selectedClientFilter)?.name || "Cliente"}
                  </span>
                  <Search className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0 bg-[#1a1d23] border-[#2d3139]">
                <Command className="bg-[#1a1d23] text-white">
                  <CommandInput 
                    placeholder="Buscar cliente..." 
                    value={clientSearch}
                    onValueChange={setClientSearch}
                    className="text-white"
                  />
                  <CommandEmpty>Nenhum cliente.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setSelectedClientFilter('all');
                        setIsClientFilterOpen(false);
                      }}
                      className="text-white hover:bg-[#3b82f6] cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedClientFilter === 'all' ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todos Clientes
                    </CommandItem>
                    {(clientsWithReceipts || []).map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setSelectedClientFilter(client.id);
                          setIsClientFilterOpen(false);
                        }}
                        className="text-white hover:bg-[#3b82f6] cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedClientFilter === client.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="w-[1px] h-4 bg-[#2d3139] hidden md:block" />

            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[110px] text-white">
                <SelectValue>
                  {statusFilter === 'Todos' ? "Status: Todos" : statusFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                <SelectItem value="Todos">Status: Todos</SelectItem>
                <SelectItem value="Aguardando Pagamento">Aguardando Pagamento</SelectItem>
                <SelectItem value="Recebido">Recebido</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-[1px] h-4 bg-[#2d3139] hidden md:block" />

            <div className="flex items-center gap-1.5 bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]">
              <Button 
                variant={dateFilterType === 'diario' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('diario')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'diario' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Diário
              </Button>
              <Button 
                variant={dateFilterType === 'mensal' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('mensal')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'mensal' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Mensal
              </Button>
              <Button 
                variant={dateFilterType === 'anual' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('anual')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'anual' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Anual
              </Button>
            </div>

            {dateFilterType === 'diario' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139] hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Dia:</span>
                <Input 
                  type="date" 
                  className="h-7 bg-transparent border-none text-[12px] w-[115px] p-0 pr-1 focus-visible:ring-0 text-white min-w-[115px] cursor-pointer" 
                  value={dayFilter} 
                  onChange={e => setDayFilter(e.target.value)} 
                />
              </div>
            )}

            {dateFilterType === 'mensal' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139] hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Mês:</span>
                <Input 
                  type="month" 
                  className="h-7 bg-transparent border-none text-[12px] w-[115px] p-0 pr-1 focus-visible:ring-0 text-white min-w-[115px] cursor-pointer" 
                  value={monthFilter} 
                  onChange={e => setMonthFilter(e.target.value)} 
                />
              </div>
            )}

            {dateFilterType === 'anual' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139]">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Ano:</span>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-7 bg-transparent border-none text-[12px] w-[60px] p-0 focus:ring-0 text-white min-w-[60px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="w-[1px] h-4 bg-[#2d3139] hidden md:block" />

            <Select value={pixFilter} onValueChange={setPixFilter}>
              <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[100px] text-white">
                <SelectValue>
                  {pixFilter === 'all' 
                    ? "PIX: Todos" 
                    : pixSettings.accounts?.find(a => a.id === pixFilter)?.label || "Conta PIX"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                <SelectItem value="all">Todas Contas PIX</SelectItem>
                {pixSettings.accounts?.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank} - {acc.document})</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(dayFilter !== '' || monthFilter !== '' || yearFilter !== '' || statusFilter !== 'Todos' || selectedClientFilter !== 'all' || pixFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-[#71717a] hover:text-[#ef4444] ml-1" 
                onClick={() => { 
                  setDayFilter(''); 
                  setMonthFilter(''); 
                  setYearFilter('');
                  setStatusFilter('Todos');
                  setSelectedClientFilter('all');
                  setPixFilter('all');
                }}
              >
                <X size={12} />
              </Button>
            )}
            
            <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />

            <div className="flex bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "h-6 px-2 rounded-md transition-all",
                  viewMode === 'table' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
                )}
                title="Lista"
              >
                <List size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-6 px-2 rounded-md transition-all",
                  viewMode === 'grid' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
                )}
                title="Colunas"
              >
                <LayoutGrid size={14} />
              </Button>
            </div>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                <Plus size={18} />
                Novo Recibo
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[90vh] overflow-hidden flex flex-col p-0 sm:max-w-[600px]">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Gerar Novo Recibo</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Selecionar Cliente Existente (Opcional)</Label>
                  <Select value={newReceipt.clientId || ''} onValueChange={(clientId) => {
                    const client = clients.find(c => c.id === clientId);
                    if (client) {
                      setNewReceipt({
                        ...newReceipt,
                        clientId: client.id,
                        clientName: client.name,
                        clientType: client.type || 'Avulso',
                        serviceSpecification: client.type === 'Contrato' ? `Serviço Contratual - ${newReceipt.referenceMonth || ''}` : '',
                        value: client.type === 'Contrato' ? (client.contractValue || 0) : 0,
                        pixAccountId: client.pixAccountId
                      });
                    }
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white tracking-widest uppercase text-[10px] font-black h-10">
                      <SelectValue placeholder="Escolha um cliente...">
                        {newReceipt.clientId ? (clients.find(c => c.id === newReceipt.clientId)?.name || "Cliente não encontrado") : "Escolha um cliente..."}
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
                          serviceSpecification: isContract ? `Serviço Contratual - ${newReceipt.referenceMonth || ''}` : newReceipt.serviceSpecification,
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
                  <Input 
                    id="value" 
                    type="number" 
                    value={newReceipt.value || ''} 
                    onChange={e => setNewReceipt({...newReceipt, value: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    onFocus={(e) => e.target.select()}
                    placeholder="0,00" 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
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
                    <Input id="refMonth" value={newReceipt.referenceMonth || ''} onChange={e => {
                      const month = e.target.value;
                      setNewReceipt({
                        ...newReceipt, 
                        referenceMonth: month,
                        serviceSpecification: newReceipt.clientType === 'Contrato' ? `Serviço Contratual - ${month}` : newReceipt.serviceSpecification
                      });
                    }} placeholder="Ex: Janeiro/2024" className="bg-[#0f1115] border-[#2d3139] text-white" />
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
                  <Select value={newReceipt.status} onValueChange={(val: any) => {
                    let obs = newReceipt.observations || '';
                    const statusNote = 'Recibo Valido Mediante Comprovante do PIX';
                    if (val === 'Aguardando Pagamento' && !obs.includes(statusNote)) {
                      obs = obs ? `${obs}\n${statusNote}` : statusNote;
                    }
                    setNewReceipt({...newReceipt, status: val, observations: obs});
                  }}>
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
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white tracking-widest uppercase text-[10px] font-black h-10">
                        <SelectValue placeholder="Selecione a conta PIX">
                          {newReceipt.pixAccountId ? (pixSettings.accounts?.find(a => a.id === newReceipt.pixAccountId)?.label || "Conta não encontrada") : "Selecione a conta PIX"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {pixSettings.accounts?.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank} - {acc.document})</SelectItem>
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
              <Button variant="ghost" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]">
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
                <Button onClick={handleAddReceipt} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Gerar e Salvar
                </Button>
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
              <Button onClick={async () => {
                if (pendingReceiptForPdf) {
                  await generateReceiptPDF(pendingReceiptForPdf, appSettings, pixSettings);
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
                      value={editingReceipt.clientType || ''} 
                      onValueChange={(val: any) => {
                        const isContract = val === 'Contrato';
                        const client = clients.find(c => c.name === editingReceipt.clientName);
                        setEditingReceipt({
                          ...editingReceipt, 
                          clientType: val,
                          serviceSpecification: isContract ? `Serviço Contratual - ${editingReceipt.referenceMonth || ''}` : editingReceipt.serviceSpecification,
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
                        value={editingReceipt.date ? safeParseDate(editingReceipt.date).toISOString().split('T')[0] : ''} 
                        onChange={e => setEditingReceipt({...editingReceipt, date: new Date(e.target.value)})} 
                        className="bg-[#0f1115] border-[#2d3139] text-white" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editRefMonth" className="text-[#a0a0a0]">Mês de Referência</Label>
                      <Input id="editRefMonth" value={editingReceipt.referenceMonth || ''} onChange={e => {
                        const month = e.target.value;
                        setEditingReceipt({
                          ...editingReceipt, 
                          referenceMonth: month,
                          serviceSpecification: editingReceipt.clientType === 'Contrato' ? `Serviço Contratual - ${month}` : editingReceipt.serviceSpecification
                        });
                      }} className="bg-[#0f1115] border-[#2d3139] text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Forma de Pagamento</Label>
                    <Select value={editingReceipt.paymentMethod || ''} onValueChange={(val: any) => setEditingReceipt({...editingReceipt, paymentMethod: val})}>
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
                    <Select value={editingReceipt.status || ''} onValueChange={(val: any) => {
                      let obs = editingReceipt.observations || '';
                      const statusNote = 'Recibo Valido Mediante Comprovante do PIX';
                      if (val === 'Aguardando Pagamento' && !obs.includes(statusNote)) {
                        obs = obs ? `${obs}\n${statusNote}` : statusNote;
                      }
                      setEditingReceipt({...editingReceipt, status: val, observations: obs});
                    }}>
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
                      <Select value={editingReceipt.pixAccountId || ''} onValueChange={(val) => setEditingReceipt({...editingReceipt, pixAccountId: val})}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue placeholder="Selecione a conta PIX">
                             {pixSettings.accounts?.find(acc => acc.id === editingReceipt.pixAccountId)?.label || editingReceipt.pixAccountId}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          {pixSettings.accounts?.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank} - {acc.document})</SelectItem>
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
              <Button variant="ghost" onClick={() => setIsEditOpen(false)} disabled={isSubmitting} className="text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]">
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
                <Button onClick={handleUpdateReceipt} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar Alterações
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
            {filteredReceipts.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl">
                 Nenhum recibo encontrado.
              </div>
            ) : (
              filteredReceipts.map((receipt) => (
                <Card 
                  key={receipt.id} 
                  className={cn(
                    "bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group cursor-pointer",
                    selectedRowId === receipt.id && "border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                  )}
                  onClick={() => setSelectedRowId(receipt.id)}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button variant="ghost" size="icon" title="Editar" className="h-7 w-7 text-[#a0a0a0] hover:text-white bg-[#0f1115]/80 backdrop-blur-sm" onClick={(e) => {
                        e.stopPropagation();
                        onEditClick('receipt', receipt);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" title="PDF" className="h-7 w-7 text-[#a0a0a0] hover:text-[#3b82f6] bg-[#0f1115]/80 backdrop-blur-sm" onClick={async (e) => {
                        e.stopPropagation();
                        await generateReceiptPDF(receipt, appSettings, pixSettings);
                      }}>
                        <Share2 size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/20 bg-[#0f1115]/80 backdrop-blur-sm" onClick={(e) => {
                        e.stopPropagation();
                        setReceiptToDelete(receipt);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#3b82f6] font-bold">#{receipt.number ? formatRecordNumber(receipt.number, receipt.date) : '-'}</span>
                      <span className="text-[9px] text-[#71717a]">{format(safeParseDate(receipt.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <h3 className="font-bold text-white text-sm truncate pr-14" title={receipt.clientName}>{receipt.clientName}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        "text-[9px] uppercase tracking-tighter h-4 px-1.5",
                        receipt.clientType === 'Contrato' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      )}>
                        {receipt.clientType || 'Avulso'}
                      </Badge>
                      <span className="text-[10px] text-[#71717a] font-medium">{receipt.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#2d3139]/50 mt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest text-[8px]">Serviço</span>
                      <span className="text-[11px] text-[#e0e0e0] line-clamp-1 italic">{receipt.serviceSpecification}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                       <span className="text-sm font-black text-white">R$ {Number(receipt.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                       <Badge className={cn(
                         "text-[9px] uppercase font-black px-2 h-5 shadow-sm",
                         receipt.status === 'Recebido' 
                           ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/5" 
                           : "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-amber-500/5"
                       )}>
                         {receipt.status || 'Pendente'}
                       </Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card 
            className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-auto max-h-[600px] relative focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            tabIndex={0}
            onKeyDown={(e) => {
              if (!filteredReceipts.length) return;
              const currentIndex = filteredReceipts.findIndex(r => r.id === selectedRowId);
              if (e.key === 'ArrowDown') {
                const nextIndex = Math.min(currentIndex + 1, filteredReceipts.length - 1);
                setSelectedRowId(filteredReceipts[nextIndex].id);
                e.preventDefault();
                document.getElementById(`receipt-${filteredReceipts[nextIndex].id}`)?.scrollIntoView({ block: 'nearest' });
              } else if (e.key === 'ArrowUp') {
                const nextIndex = Math.max(currentIndex - 1, 0);
                setSelectedRowId(filteredReceipts[nextIndex].id);
                e.preventDefault();
                document.getElementById(`receipt-${filteredReceipts[nextIndex].id}`)?.scrollIntoView({ block: 'nearest' });
              }
            }}
          >
          <div className="p-4 border-b border-[#2d3139] flex justify-between items-center bg-[#1a1d23] sticky top-0 z-20">
            <span className="text-sm text-[#71717a] font-medium uppercase tracking-wider">Filtro de Status</span>
            <div className="flex gap-2">
              {(['Todos', 'Aguardando Pagamento', 'Recebido'] as const).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className={statusFilter === s ? "bg-[#3b82f6] text-white" : "border-[#2d3139] text-[#71717a] hover:bg-[#2d3139]"}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <TableDoubleScroll>
          <Table>
            <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[140px]">AÇÕES</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[150px]">STATUS / VALOR</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">INFORMAÇÃO DO CLIENTE</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">CONTA / PAGAMENTO</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[100px]">Nº / DATA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow 
                  key={receipt.id}
                  id={`receipt-${receipt.id}`}
                  onClick={() => setSelectedRowId(receipt.id)}
                  className={cn(
                    "border-[#2d3139] transition-all h-[70px] cursor-pointer",
                    selectedRowId === receipt.id ? "bg-blue-500/10" : "hover:bg-[#25282e]/30"
                  )}
                >
                  <TableCell className="w-[140px] p-2">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <Button variant="outline" size="icon" title="Ver Detalhes" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={(e) => {
                        e.stopPropagation();
                        setViewingReceipt(receipt);
                        setIsViewOpen(true);
                      }}>
                        <Eye size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Gerar PDF" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={async (e) => {
                        e.stopPropagation();
                        await generateReceiptPDF(receipt, appSettings, pixSettings);
                      }}>
                        <Share2 size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Editar" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={(e) => {
                        e.stopPropagation();
                        onEditClick('receipt', receipt);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Excluir" className="h-7 w-7 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={(e) => {
                        e.stopPropagation();
                        setReceiptToDelete(receipt);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="w-[150px] p-2">
                    <div className="flex flex-col gap-1 items-start">
                      <Select 
                        value={receipt.status} 
                        onValueChange={(newStatus: any) => updateReceiptStatus(receipt.id, newStatus, receipt)}
                      >
                        <SelectTrigger className={cn(
                          "h-6 text-[9px] uppercase border-[#2d3139] px-2 w-fit font-bold",
                          receipt.status === 'Recebido' ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-[#a0a0a0] bg-[#0f1115]"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          <SelectItem value="Aguardando Pagamento">Aguardando Pagamento</SelectItem>
                          <SelectItem value="Recebido">Recebido</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="font-bold text-emerald-500 text-[12px] font-mono mt-0.5 whitespace-nowrap">
                        R$ {Number(receipt.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-[12px] truncate max-w-[200px]">{receipt.clientName}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#71717a] italic">Serviço: {receipt.serviceSpecification || 'N/A'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-[10px] text-[#a0a0a0]">
                      <span className="text-[#e0e0e0] font-medium truncate max-w-[150px]">{pixSettings.accounts?.find(a => a.id === receipt.pixAccountId)?.label || pixSettings.accounts?.[0]?.label || 'C. Corrente'}</span>
                      <span className="uppercase text-[9px] mt-0.5">{receipt.paymentMethod}</span>
                    </div>
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-mono text-[#3b82f6] font-bold">#{receipt.number ? formatRecordNumber(receipt.number, receipt.date) : '-'}</span>
                      <span className="text-[10px] text-[#71717a] mt-0.5">{format(safeParseDate(receipt.date), 'dd/MM/yy')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredReceipts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-[#71717a] text-sm">
                    Nenhum recibo gerado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TableDoubleScroll>
        </Card>
      ))}

      {/* View Receipt Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-[90vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-8">
              <span>Recibo #{viewingReceipt?.number ? formatRecordNumber(viewingReceipt.number, viewingReceipt.date) : '-'}</span>
              <Badge variant="outline" className="text-[#a0a0a0] border-[#2d3139]">
                {viewingReceipt?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-[#71717a]">
              Detalhes do recibo gerado em {viewingReceipt?.date ? format(safeParseDate(viewingReceipt.date), 'dd/MM/yyyy') : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-6 bg-[#0f1115] p-4 rounded-lg border border-[#2d3139]">
              <div>
                <Label className="text-[#71717a] text-[10px] uppercase font-black">Cliente</Label>
                <div className="text-white font-bold">{viewingReceipt?.clientName}</div>
                <div className="text-[11px] text-[#71717a]">{viewingReceipt?.clientType}</div>
              </div>
              <div className="text-right">
                <Label className="text-[#71717a] text-[10px] uppercase font-black">Valor Total</Label>
                <div className="text-2xl font-black text-emerald-500">R$ {Number(viewingReceipt?.value || 0).toFixed(2)}</div>
              </div>
            </div>

            <div>
              <Label className="text-[#71717a] text-[10px] uppercase font-black">Serviço/Produto</Label>
              <div className="text-white mt-1 italic">
                {viewingReceipt?.serviceSpecification || 'Não especificado'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-[#71717a] text-[10px] uppercase font-black">Forma de Pagamento</Label>
                <div className="text-white font-medium mt-1 uppercase text-xs">{viewingReceipt?.paymentMethod}</div>
              </div>
              <div className="text-right">
                <Label className="text-[#71717a] text-[10px] uppercase font-black">Mês de Referência</Label>
                <div className="text-white font-medium mt-1">{viewingReceipt?.referenceMonth || 'Não informado'}</div>
              </div>
            </div>

            {viewingReceipt?.observations && (
              <div>
                <Label className="text-[#71717a] text-[10px] uppercase font-black">Observações</Label>
                <div className="bg-[#0f1115] p-3 rounded border border-[#2d3139] text-xs text-[#a0a0a0] mt-1 italic">
                  "{viewingReceipt.observations}"
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-8 border-t border-[#2d3139] pt-6 flex gap-2">
            <Button variant="outline" onClick={() => setIsViewOpen(false)} className="border-[#2d3139]">Fechar</Button>
            <Button className="bg-[#3b82f6] hover:bg-[#2563eb]" onClick={async () => {
              if (viewingReceipt) await generateReceiptPDF(viewingReceipt, appSettings, pixSettings);
            }}>
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function SuperAdminPanel({ 
  companies = [], 
  allFinancials = [], 
  allUsers = [],
  saasSettings, 
  user, 
  selectedCompanyId, 
  setSelectedCompanyId,
  viewPeriod,
  setViewPeriod,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  currentUserData
}: { 
  companies: any[], 
  allFinancials: any[], 
  allUsers: any[],
  saasSettings: any, 
  user: any, 
  selectedCompanyId: string, 
  setSelectedCompanyId: (id: string) => void,
  viewPeriod: 'month' | 'year',
  setViewPeriod: (v: 'month' | 'year') => void,
  selectedMonth: string,
  setSelectedMonth: (v: string) => void,
  selectedYear: string,
  setSelectedYear: (v: string) => void,
  currentUserData: any
}) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [isMigrationFinished, setIsMigrationFinished] = useState(false);
  const [lastMigrationTargetName, setLastMigrationTargetName] = useState('');
  const [deepSearchQuery, setDeepSearchQuery] = useState('');
  const [selectedUserToClear, setSelectedUserToClear] = useState('');
  const [selectedCompanyIdForClear, setSelectedCompanyIdForClear] = useState('');
  const [isClearingUserHistory, setIsClearingUserHistory] = useState(false);

  const companyUsersForClear = allUsers.filter(u => u.companyId === selectedCompanyIdForClear);
  const companyUsers = allUsers.filter(u => u.companyId === selectedCompanyId);

  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [userToClearObj, setUserToClearObj] = useState<any>(null);

  const handleClearUserHistory = async () => {
    if (!selectedCompanyIdForClear || !selectedUserToClear) {
      toast.error("Por favor, selecione uma empresa e um usuário.");
      return;
    }

    const userToClear = companyUsersForClear.find(u => u.id === selectedUserToClear);
    if (!userToClear) return;
    setUserToClearObj(userToClear);
    setIsClearHistoryConfirmOpen(true);
  };

  const confirmClearUserHistory = async () => {
    if (!userToClearObj) return;
    const userEmail = userToClearObj.email;

    setIsClearingUserHistory(true);
    setIsClearHistoryConfirmOpen(false);
    try {
      let totalDeleted = 0;
      const collections = ['visits', 'receipts', 'financial', 'budgets', 'serviceOrders'];
      
      for (const col of collections) {
        const q = query(
          collection(db, col), 
          where('companyId', '==', selectedCompanyIdForClear),
          where('createdByEmail', '==', userEmail)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(doc(db, col, d.id));
          totalDeleted++;
        }
      }

      // PDV Sales subcollection
      const salesRef = collection(db, 'companies', selectedCompanyIdForClear, 'sales');
      const salesSnap = await getDocs(salesRef);
      for (const d of salesSnap.docs) {
        const data = d.data();
        if (data.vendorEmail === userEmail || (data.vendorName && data.vendorName.includes(userEmail))) {
           await deleteDoc(doc(db, 'companies', selectedCompanyIdForClear, 'sales', d.id));
           totalDeleted++;
        }
      }

      toast.success(`Limpeza concluída! ${totalDeleted} registros removidos.`);
      setSelectedUserToClear('');
    } catch (error) {
      console.error("Clear history error:", error);
      toast.error("Erro ao limpar histórico do usuário.");
    } finally {
      setIsClearingUserHistory(false);
    }
  };
  const [deepSearchResults, setDeepSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [sourceIdForRates, setSourceIdForRates] = useState('');
  const [targetIdForRates, setTargetIdForRates] = useState('');
  const [isImportingRates, setIsImportingRates] = useState(false);

  const handleImportCardRates = async () => {
    if (!sourceIdForRates || !targetIdForRates) {
      toast.error("Selecione ambas as empresas (origem e destino).");
      return;
    }
    if (sourceIdForRates === targetIdForRates) {
      toast.error("A empresa de origem e destino não podem ser as mesmas.");
      return;
    }

    setIsImportingRates(true);
    try {
      // Get rates from source
      const sourceSnap = await getDoc(doc(db, 'companies', sourceIdForRates, 'settings', 'general'));
      if (!sourceSnap.exists()) {
        toast.error("Dados de origem não encontrados.");
        return;
      }
      
      const sourceData = sourceSnap.data();
      const installmentPlans = sourceData.installmentPlans;

      if (!installmentPlans || !Array.isArray(installmentPlans) || installmentPlans.length === 0) {
        toast.error("Nenhum plano de parcelamento encontrado na empresa de origem.");
        return;
      }

      // Copy to target
      if (targetIdForRates === 'ALL') {
        const otherCompanies = companies.filter(c => c.id !== sourceIdForRates);
        const batch = [];
        for (const target of otherCompanies) {
          batch.push(setDoc(doc(db, 'companies', target.id, 'settings', 'general'), { installmentPlans }, { merge: true }));
        }
        await Promise.all(batch);
        toast.success(`Importados juros para ${otherCompanies.length} empresas com sucesso!`);
      } else {
        await setDoc(doc(db, 'companies', targetIdForRates, 'settings', 'general'), { installmentPlans }, { merge: true });
        toast.success(`Importados ${installmentPlans.length} planos de parcelamento com sucesso!`);
      }
    } catch (error) {
      console.error("Error importing rates:", error);
      toast.error("Erro ao importar taxas de juros.");
    } finally {
      setIsImportingRates(false);
    }
  };

  const [regCodes, setRegCodes] = useState<any[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'registration_codes'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      const codes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegCodes(codes);
    });
  }, []);

  const handleGenerateRegCode = async () => {
    setIsGeneratingCode(true);
    try {
      // Generate a friendly 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      await addDoc(collection(db, 'registration_codes'), {
        code,
        status: 'active',
        createdAt: Timestamp.now(),
        createdBy: user?.email
      });
      toast.success(`Código ${code} gerado com sucesso!`);
    } catch (error) {
      console.error("Erro ao gerar código:", error);
      toast.error("Erro ao gerar código de registro.");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleDeleteRegCode = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este código?")) return;
    try {
      await deleteDoc(doc(db, 'registration_codes', id));
      toast.success("Código removido.");
    } catch (error) {
      toast.error("Erro ao remover código.");
    }
  };

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
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  const handleSaveCompanyLicense = async () => {
    if (!editingCompany?.id) return;
    setIsSavingCompany(true);
    try {
      await updateDoc(doc(db, 'companies', editingCompany.id), {
        isExempt: editingCompany.isExempt ?? false,
        customPrice: Number(editingCompany.customPrice) || 0,
        billingCycle: editingCompany.billingCycle || 'mensal',
        receivesUpdates: editingCompany.receivesUpdates ?? true,
        enabledMenus: editingCompany.enabledMenus || ['resumo', 'visits', 'receipts', 'clients', 'financial', 'inventory', 'os', 'budgets', 'settings', 'pdv'],
        ownerName: editingCompany.ownerName || '',
        ownerEmail: editingCompany.ownerEmail || '',
        updatedAt: Timestamp.now()
      });
      toast.success("Licença e menus atualizados!");
      setIsEditCompanyOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar alterações da empresa.");
    } finally {
      setIsSavingCompany(false);
    }
  };

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [companyToToggle, setCompanyToToggle] = useState<{id: string, status: string} | null>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);

  const editingCompanyOwner = useMemo(() => {
    if (!editingCompany?.ownerId) return null;
    return allUsers.find(u => u.uid === editingCompany.ownerId || u.id === editingCompany.ownerId);
  }, [editingCompany, allUsers]);

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
      const collections = [
        'companies', 'clients', 'visits', 'receipts', 'financial', 'budgets', 'users',
        'suppliers', 'serviceOrders', 'inventory', 'inventoryTransactions', 'logs'
      ];
      
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
              docData.generalSettings = settingsSnap.data();
            }
            const pixSnap = await getDoc(doc(db, 'companies', docSnapshot.id, 'settings', 'pix'));
            if (pixSnap.exists()) {
              docData.pixSettings = pixSnap.data();
            }
            const permissionsSnap = await getDoc(doc(db, 'companies', docSnapshot.id, 'settings', 'permissions'));
            if (permissionsSnap.exists()) {
              docData.permissionsSettings = permissionsSnap.data();
            }
            const salesSnap = await getDocs(collection(db, 'companies', docSnapshot.id, 'sales'));
            if (!salesSnap.empty) {
              docData.sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
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
        const backup = reconstructTimestamps(JSON.parse(text));
        
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
            const { id, generalSettings, pixSettings, permissionsSettings, sales, ...data } = record;
            
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
              await setDoc(doc(db, 'companies', targetId, 'settings', 'general'), generalSettings || {
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

              if (pixSettings) {
                await setDoc(doc(db, 'companies', targetId, 'settings', 'pix'), pixSettings, { merge: true });
              }
              if (permissionsSettings) {
                await setDoc(doc(db, 'companies', targetId, 'settings', 'permissions'), permissionsSettings, { merge: true });
              }
              if (Array.isArray(sales)) {
                for (const sale of sales) {
                  const { id: saleId, ...saleData } = sale;
                  await setDoc(doc(db, 'companies', targetId, 'sales', saleId), saleData);
                }
              }
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

      // 2. Delete company subcollections (best effort as Firestore doesn't support recursive delete)
      const subSettings = ['general', 'permissions', 'pix', 'roles'];
      for (const s of subSettings) {
        await deleteDoc(doc(db, 'companies', companyId, 'settings', s)).catch(() => {});
      }
      
      // 3. Delete all related data in top-level collections
      const collections = [
        'clients', 'visits', 'receipts', 'financial', 'budgets', 'users', 
        'suppliers', 'serviceOrders', 'inventory', 'inventoryTransactions', 'logs'
      ];
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
      console.error(error);
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
        isExempt: editingCompany.isExempt || false,
        enabledMenus: editingCompany.enabledMenus || [
          'dashboard', 'visits', 'receipts', 'clients', 'financial', 
          'inventory', 'service-orders', 'budgets', 'settings', 'pdv',
          'suppliers', 'reports', 'users', 'logs'
        ]
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
  // Identification of Master Company (AF Sistemas)
  // Logic: Use current company for financial realization
  const myCompany = companies.find(c => c.id === currentUserData?.companyId);

  // SaaS Subscription Revenue (Calculated/Projected)
  const saasProjectedRevenue = (companies || []).reduce((total, c) => {
    if (!c || c.status === 'blocked' || c.id === currentUserData?.companyId || c.isExempt) return total;
    
    // Use custom company price if set, otherwise global SaaS price (fallback to 0)
    const price = c.customPrice !== undefined ? Number(c.customPrice) : (saasSettings?.price || 0);
    
    // For SaaS subscriptions, we assume it's MRR. If year view, it's MRR * 12
    return total + (viewPeriod === 'year' ? price * 12 : price);
  }, 0);

  // Realized Revenue from SaaS (Actually recorded in Finance)
  // We identify these from the master company's records
  const myCompanyFinancials = (allFinancials || []).filter(f => f && f.companyId === currentUserData?.companyId);
  const realizedRevenue = myCompanyFinancials
    .filter(f => {
      if (f.type !== 'Receita') return false;
      const d = safeParseDate(f.date);
      if (viewPeriod === 'year') {
        return format(d, 'yyyy') === selectedYear;
      }
      return format(d, 'MM') === selectedMonth && format(d, 'yyyy') === selectedYear;
    })
    .reduce((sum, f) => sum + (Number(f.value) || 0), 0);

  // Active companies count (excluding blocked)
  const activeCompaniesCount = (companies || []).filter(c => c && c.status !== 'blocked').length;

  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const availableYears = allFinancials.map(f => {
      const d = safeParseDate(f.date);
      return d.getFullYear();
    });
    const uniqueYears = Array.from(new Set([...availableYears, currentYear])).sort((a, b) => b - a);
    return uniqueYears.map(y => ({ value: y.toString(), label: y.toString() }));
  }, [allFinancials]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {companies.length > 0 && (
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
                  <SelectValue placeholder="Selecione a Empresa">
                    {companies.find(c => c.id === selectedCompanyId)?.name || companies.find(c => c.id === selectedCompanyId)?.tradeName || companies.find(c => c.id === selectedCompanyId)?.companyName || selectedCompanyId}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                  {companies.map(c => {
                    const companyName = c.name || c.tradeName || c.companyName || c.id;
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {companyName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic text-[#3b82f6]">SaaS Control Center</h2>
        <p className="text-[#71717a] text-sm uppercase tracking-[0.2em] font-medium">Painel Master de Administração de Instâncias</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-8 bg-[#1a1d23] p-3 rounded-xl border border-[#2d3139] shadow-xl">
        <div className="flex items-center gap-2 bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]">
          <Button 
            variant={viewPeriod === 'month' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setViewPeriod('month')}
            className={cn("h-8 text-[11px] uppercase font-bold px-4", viewPeriod === 'month' ? "bg-blue-600 hover:bg-blue-700" : "text-[#71717a]")}
          >
            Mensal
          </Button>
          <Button 
            variant={viewPeriod === 'year' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setViewPeriod('year')}
            className={cn("h-8 text-[11px] uppercase font-bold px-4", viewPeriod === 'year' ? "bg-blue-600 hover:bg-blue-700" : "text-[#71717a]")}
          >
            Anual
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {viewPeriod === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-[140px] bg-[#0f1115] border-[#2d3139] text-white text-xs">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 w-[100px] bg-[#0f1115] border-[#2d3139] text-white text-xs">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
              {years.map(y => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-[#1a1d23] border-[#2d3139] p-6 text-center shadow-xl hover:border-blue-500/20 transition-all group">
          <h4 className="text-[#71717a] text-[10px] uppercase tracking-[0.2em] mb-3 font-black group-hover:text-blue-400">Total Parceiros</h4>
          <p className="text-3xl font-black text-white tracking-tighter">{companies.length}</p>
        </Card>
        <Card className="bg-[#1a1d23] border-[#2d3139] p-6 text-center shadow-xl hover:border-emerald-500/20 transition-all group">
          <h4 className="text-[#71717a] text-[10px] uppercase tracking-[0.2em] mb-3 font-black group-hover:text-emerald-400">Status Atividade</h4>
          <div className="flex justify-center gap-4 items-baseline">
            <span className="text-2xl font-black text-[#10b981]">{activeCompaniesCount}</span>
            <span className="text-[#2d3139] text-xl font-thin">/</span>
            <span className="text-2xl font-black text-[#ef4444]">{companies.length - activeCompaniesCount}</span>
          </div>
        </Card>
        <Card className="bg-[#1a1d23] border-[#2d3139] p-6 text-center shadow-xl hover:border-blue-500/20 transition-all group">
          <h4 className="text-[#71717a] text-[10px] uppercase tracking-[0.2em] mb-3 font-black group-hover:text-blue-400">MRR Projetado</h4>
          <p className="text-2xl font-black text-[#3b82f6] tracking-tighter">
            R$ {saasProjectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
        <Card className="bg-[#1a1d23] border-blue-500/20 border-2 p-6 text-center shadow-2xl shadow-blue-500/5 transition-all group">
          <h4 className="text-[#3b82f6] text-[10px] uppercase tracking-[0.2em] mb-3 font-black">Faturamento Realizado</h4>
          <p className="text-2xl font-black text-white tracking-tighter">
            R$ {realizedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="lg:col-span-2 bg-[#1a1d23] border-[#2d3139] p-4 flex flex-col min-h-[500px]">
          <div className="flex items-center gap-3 text-yellow-500 mb-4 min-w-fit">
            <Database size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Recuperação Estrutural (Vincular tudo):</span>
          </div>
          <div className="flex flex-col gap-4">
            <select 
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-[#0f1115] border-[#2d3139] text-white rounded-md h-10 px-3 text-sm focus:border-yellow-500 outline-none"
            >
              <option value="">Selecione a empresa de destino...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.document ? `(CNPJ: ${c.document})` : ''}
                </option>
              ))}
            </select>
            <Button 
              onClick={handleMigrateOrphanedData}
              disabled={!selectedCompanyId || companies.length === 0 || isMigrating}
              className="h-10 bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-sm"
            >
              Vincular TUDO o que existe no Banco
            </Button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-[#2d3139]">
            <Label className="text-[10px] text-[#71717a] uppercase font-bold mb-2 block tracking-widest">Busca e Resgate Manual (Deep Search)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
                <Input 
                  placeholder="Busque por 'AF', nome do cliente, placa, etc..." 
                  className="pl-10 bg-[#0f1115] border-[#2d3139] h-10" 
                  value={deepSearchQuery}
                  onChange={e => setDeepSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleDeepSearchRescue} 
                disabled={isSearching || !selectedCompanyId}
                className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 font-bold"
              >
                {isSearching ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Search className="mr-2" size={16} />}
                Rastrear
              </Button>
            </div>
            
            {deepSearchResults.length > 0 && (
              <div className="mt-4 bg-[#0f1115]/50 rounded-lg p-2 border border-[#2d3139]">
                <p className="text-[10px] text-blue-400 mb-2 font-bold uppercase tracking-widest px-2">Resultados ({deepSearchResults.length})</p>
                <div className="max-h-[200px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                  {deepSearchResults.map((res, i) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors group">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] uppercase h-4 px-1">{res.col}</Badge>
                          <span className="text-[11px] font-bold text-white truncate max-w-[150px]">{res.name || res.description || res.clientName || 'Registro'}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => relinkResult(res)}
                        className="text-emerald-500 hover:bg-emerald-500 hover:text-white text-[9px] h-6 px-2 font-bold"
                      >
                        VINCULAR
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 mt-8 pt-8 border-t border-[#2d3139]">
            <div className="flex items-center gap-3 text-red-500 mb-2">
              <Trash2 size={20} />
              <span className="text-sm font-bold uppercase tracking-wider">Limpar Histórico de Usuário:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={selectedCompanyIdForClear} onValueChange={(val) => { setSelectedCompanyIdForClear(val); setSelectedUserToClear(''); }}>
                <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white h-10">
                  <SelectValue placeholder="Selecione a Empresa" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name || c.tradeName || c.companyName || c.trade_name || c.trade_Name || c.company_name || c.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedUserToClear} onValueChange={setSelectedUserToClear}>
                <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white h-10">
                  <SelectValue placeholder="Selecione o Usuário" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                  {companyUsersForClear.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.displayName || u.email} ({u.role})
                    </SelectItem>
                  ))}
                  {companyUsersForClear.length === 0 && <SelectItem value="none" disabled>Nenhum usuário nesta empresa</SelectItem>}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleClearUserHistory}
                disabled={!selectedUserToClear || isClearingUserHistory}
                variant="destructive"
                className="h-10 font-bold uppercase text-[10px] tracking-widest"
              >
                {isClearingUserHistory ? <RefreshCw className="animate-spin mr-2" size={14} /> : <Trash2 className="mr-2" size={14} />}
                Apagar Histórico
              </Button>
            </div>
          </div>
        </Card>

        <Dialog open={isClearHistoryConfirmOpen} onOpenChange={setIsClearHistoryConfirmOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle className="text-red-500 flex items-center gap-2 font-black italic">
                <AlertTriangle size={20} />
                Atenção: Ação Irreversível
              </DialogTitle>
              <DialogDescription className="text-[#a0a0a0]">
                Exclusão <span className="text-white font-bold italic">PERMANENTE</span> do histórico de <span className="text-emerald-500 font-bold">{userToClearObj?.displayName || userToClearObj?.email}</span> nesta empresa.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsClearHistoryConfirmOpen(false)} className="border-[#2d3139] flex-1">Cancelar</Button>
              <Button onClick={confirmClearUserHistory} className="bg-red-600 hover:bg-red-700 font-black uppercase text-xs tracking-tighter flex-1">Confirmar Exclusão</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="lg:col-span-2 bg-[#1a1d23] border-[#2d3139] overflow-hidden flex flex-col min-h-[450px] shadow-2xl">
          <CardHeader className="bg-blue-500/5 border-b border-[#2d3139] px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Ticket className="text-blue-500" size={18} />
                </div>
                <CardTitle className="text-sm font-black text-white uppercase tracking-[0.2em] leading-none">Código Master</CardTitle>
              </div>
              <Button 
                size="sm" 
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 h-9 shadow-lg shadow-blue-500/20"
                onClick={handleGenerateRegCode}
                disabled={isGeneratingCode}
              >
                {isGeneratingCode ? <RefreshCw className="animate-spin h-3 w-3 mr-2" /> : <Plus className="h-3 w-3 mr-2" />}
                REGERAR
              </Button>
            </div>
            <CardDescription className="text-[10px] mt-2 uppercase tracking-wider font-medium text-[#71717a]">Código único de convite para novos parceiros SaaS</CardDescription>
          </CardHeader>
          <CardContent className="p-10 flex flex-col items-center justify-center bg-[#0f1115]/30 flex-1">
            {regCodes.filter(c => c.status !== 'used').length > 0 ? (
              <div className="flex flex-col items-center gap-6 w-full max-w-md">
                <div className="w-full bg-[#1a1d23] border-2 border-dashed border-[#2d3139] p-8 rounded-2xl flex flex-col items-center gap-6 group hover:border-blue-500/50 transition-colors">
                  <div className="text-[10px] text-[#71717a] font-black uppercase tracking-[0.3em]">Convite Ativo Detectado</div>
                  
                  {/* QR Code Display */}
                  <div className="p-4 bg-white rounded-xl shadow-2xl">
                    <QRCodeCanvas 
                      value={`${window.location.origin}${window.location.pathname}?code=${regCodes.filter(c => c.status !== 'used').sort((a,b) => (b.createdAt as any).seconds - (a.createdAt as any).seconds)[0]?.code}`}
                      size={160}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <code className="text-4xl font-black text-white tracking-[0.2em] select-all">
                      {regCodes.filter(c => c.status !== 'used').sort((a,b) => (b.createdAt as any).seconds - (a.createdAt as any).seconds)[0]?.code}
                    </code>
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-2">Clique no código para selecionar</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <Button 
                    className="bg-[#1a1d23] border border-[#2d3139] text-white hover:bg-white/5 h-12 font-bold uppercase tracking-wider gap-2 shadow-xl"
                    onClick={() => {
                      const activeCode = regCodes.filter(c => c.status !== 'used').sort((a,b) => (b.createdAt as any).seconds - (a.createdAt as any).seconds)[0]?.code;
                      if (activeCode) {
                        navigator.clipboard.writeText(activeCode);
                        toast.success("Código copiado!");
                      }
                    }}
                  >
                    <Copy size={16} />
                    Código
                  </Button>
                  <Button 
                    className="bg-blue-600 border border-blue-500 text-white hover:bg-blue-700 h-12 font-black uppercase tracking-tighter italic gap-2 shadow-xl shadow-blue-500/20 w-full"
                    onClick={() => {
                      const activeCode = regCodes.filter(c => c.status !== 'used').sort((a,b) => (b.createdAt as any).seconds - (a.createdAt as any).seconds)[0]?.code;
                      if (activeCode) {
                        const url = `${window.location.origin}${window.location.pathname}?code=${activeCode}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link Mestre Copiado! Envie para o novo cliente.");
                      }
                    }}
                  >
                    <ExternalLink size={16} />
                    COPIAR LINK PARA VENDA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center py-10">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                  <Ticket size={32} className="text-[#3b82f6]/30" />
                </div>
                <p className="text-[#71717a] text-sm">Nenhum código ativo de convite.</p>
                <Button onClick={handleGenerateRegCode} disabled={isGeneratingCode} className="bg-blue-500 font-bold uppercase tracking-widest px-6 h-11 rounded-xl">
                  Gerar Convite Master
                </Button>
              </div>
            )}
          </CardContent>
          <div className="p-3 bg-[#0f1115] border-t border-[#2d3139] text-[9px] text-[#555] italic text-center">
            Este código permite que novos parceiros se retirem da fase de demonstração e criem sua própria empresa SaaS.
          </div>
        </Card>
      </div>

      <Card className="bg-[#1a1d23] border-[#2d3139] text-white shadow-xl hover:border-blue-500/20 transition-all mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="text-[#3b82f6]" size={20} />
            Importar Juros de Cartões
          </CardTitle>
          <CardDescription className="text-[#71717a]">
            Replica as bandeiras e juros de uma empresa para outra (Configurações Gerais &rarr; Planos de Parcelamento).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#71717a] text-[10px] uppercase font-black tracking-widest">Empresa de Origem (Copiar de:)</Label>
              <Select value={sourceIdForRates} onValueChange={setSourceIdForRates}>
                <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white h-11">
                  <SelectValue placeholder="Selecione a empresa modelo...">
                    {sourceIdForRates ? (companies.find(c => c.id === sourceIdForRates)?.name || companies.find(c => c.id === sourceIdForRates)?.companyName || 'Empresa Selecionada') : 'Selecione a empresa modelo...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name || c.companyName || c.tradeName || c.trade_name || 'Empresa'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#71717a] text-[10px] uppercase font-black tracking-widest">Empresa de Destino (Para:)</Label>
              <Select value={targetIdForRates} onValueChange={setTargetIdForRates}>
                <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white h-11">
                  <SelectValue placeholder="Selecione a empresa destino...">
                    {targetIdForRates === 'ALL' ? '--- TODAS AS EMPRESAS ---' : (targetIdForRates ? (companies.find(c => c.id === targetIdForRates)?.name || companies.find(c => c.id === targetIdForRates)?.companyName || 'Empresa Selecionada') : 'Selecione a empresa destino...')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                  <SelectItem value="ALL" className="text-blue-400 font-bold italic">--- TODAS AS EMPRESAS ---</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name || c.companyName || c.tradeName || c.trade_name || 'Empresa'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleImportCardRates} 
            disabled={isImportingRates}
            className="w-full bg-[#3b82f1] hover:bg-[#2563eb] text-white font-bold h-11 shadow-lg shadow-blue-500/10"
          >
            {isImportingRates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            TRANSFERIR DADOS DE JUROS E BANDEIRAS
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-[#1a1d23] border-[#2d3139] rounded-xl overflow-y-auto max-h-[800px]">
        <TableDoubleScroll>
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
                    <span className="font-medium text-white">{company.name || company.companyName || company.tradeName || company.trade_name || 'Empresa sem Nome'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#71717a] font-mono">{company.document || 'Sem Documento'}</span>
                      {allUsers.find(u => u.uid === company.ownerId || u.id === company.ownerId) && (
                        <span className="text-[9px] text-blue-400/70 font-medium truncate max-w-[150px]">
                          • {allUsers.find(u => u.uid === company.ownerId || u.id === company.ownerId)?.displayName || allUsers.find(u => u.uid === company.ownerId || u.id === company.ownerId)?.email}
                        </span>
                      )}
                    </div>
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
        </TableDoubleScroll>
      </Card>

      {/* Edit Company License Modal */}
      <Dialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[450px] max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle>Gerenciar Licença: {editingCompany?.name || editingCompany?.companyName || editingCompany?.id}</DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">
              Configure o plano, ciclo de cobrança e permissão de atualizações.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
            <div className="space-y-4 py-4 text-white">
                {/* Proprietor Info */}
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0] text-[10px] uppercase font-bold">Nome do Proprietário</Label>
                      <Input 
                        value={editingCompany?.ownerName || (editingCompanyOwner?.displayName || editingCompanyOwner?.name || '')} 
                        onChange={e => setEditingCompany({...editingCompany, ownerName: e.target.value})} 
                        placeholder="Nome Completo"
                        className="bg-[#0f1115] border-[#2d3139] text-white h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0] text-[10px] uppercase font-bold">E-mail do Proprietário</Label>
                      <Input 
                        value={editingCompany?.ownerEmail || (editingCompanyOwner?.email || '')} 
                        onChange={e => setEditingCompany({...editingCompany, ownerEmail: e.target.value})} 
                        placeholder="email@exemplo.com"
                        className="bg-[#0f1115] border-[#2d3139] text-white h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {editingCompanyOwner && (
                  <div className="p-4 bg-[#0f1115] border border-blue-500/20 rounded-xl space-y-2 shadow-inner group transition-all hover:border-blue-500/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-400">
                        <UserIcon size={14} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Proprietário da Instância</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] bg-blue-500/10 text-blue-400 border-blue-400/20 uppercase font-black tracking-widest">Master Admin</Badge>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-black text-white tracking-tight">{editingCompanyOwner.displayName || editingCompanyOwner.name || 'Nome não informado'}</span>
                      <div className="flex items-center gap-2 text-[#71717a]">
                        <span className="text-[11px] font-medium font-mono">{editingCompanyOwner.email}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <div className="flex flex-col">
                      <Label className="text-sm font-bold text-blue-400">Menus Habilitados</Label>
                      <span className="text-[10px] text-[#71717a]">Selecione quais abas esta empresa pode ver.</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-[#0f1115]/50 border border-[#2d3139] rounded-lg">
                    {[
                      {id: 'dashboard', label: 'Dashboard'},
                      {id: 'visits', label: 'Visitas Técnicas'},
                      {id: 'receipts', label: 'Recibos'},
                      {id: 'clients', label: 'Clientes'},
                      {id: 'financial', label: 'Financeiro'},
                      {id: 'inventory', label: 'Estoque'},
                      {id: 'service-orders', label: 'Ordens de Serviço'},
                      {id: 'budgets', label: 'Orçamentos'},
                      {id: 'pdv', label: 'PDV (Vendas)'},
                      {id: 'suppliers', label: 'Fornecedores'},
                      {id: 'reports', label: 'Relatórios'},
                      {id: 'users', label: 'Equipe'},
                      {id: 'logs', label: 'Logs'},
                      {id: 'settings', label: 'Configurações'}
                    ].map(menu => (
                      <div key={menu.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`menu-${menu.id}`} 
                          checked={editingCompany?.enabledMenus ? editingCompany.enabledMenus.includes(menu.id) : true}
                          onCheckedChange={(checked) => {
                            const current = editingCompany?.enabledMenus || [
                              'dashboard', 'visits', 'receipts', 'clients', 'financial', 
                              'inventory', 'service-orders', 'budgets', 'settings', 'pdv',
                              'suppliers', 'reports', 'users', 'logs'
                            ];
                            let updated;
                            if (checked) {
                              updated = [...current, menu.id];
                            } else {
                              updated = current.filter((m: string) => m !== menu.id);
                            }
                            setEditingCompany({...editingCompany, enabledMenus: updated});
                          }}
                        />
                        <Label htmlFor={`menu-${menu.id}`} className="text-xs cursor-pointer">{menu.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

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
          </div>
          <DialogFooter className="bg-[#0f1115]/50 p-6 border-t border-[#2d3139] flex-shrink-0">
            <Button variant="outline" onClick={() => setIsEditCompanyOpen(false)} className="border-[#2d3139] text-[#a0a0a0]">Fechar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={handleUpdateCompanyPlan}>Gravar Alterações</Button>
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

function RolePermissionManager({ companyId, user, userRoles, currentUserData }: { companyId: string, user: FirebaseUser, userRoles: UserRole[], currentUserData: any }) {
  const [rolePermissions, setRolePermissions] = useState<any>({});
  const [selectedRole, setSelectedRole] = useState<string>('tecnico');
  const [loading, setLoading] = useState(true);

  const isMaster = user?.email ? SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase().trim()) : false;
  const isAdminOrOwner = currentUserData?.role === 'admin' || currentUserData?.role === 'owner';
  const hasAccess = isMaster || isAdminOrOwner;

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
            menus: ['dashboard', 'visits', 'service-orders', 'receipts'],
            lists: ['dashboard', 'visits', 'service-orders']
          },
          auxiliar: { menus: ['dashboard'], lists: [] }
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro onSnapshot do configurador de permissões:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [companyId]);

  const togglePermission = async (menuId: string, type: 'menus' | 'lists' | 'manage') => {
    if (selectedRole === 'owner' && !isMaster) {
      toast.error('As permissões do Proprietário são protegidas e só podem ser alteradas pelo Master do Sistema.');
      return;
    }
    const current = rolePermissions[selectedRole] || { menus: [], lists: [], manage: [] };
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

  if (!hasAccess) {
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
              <CardTitle className="text-white text-lg">Controle de Acesso Granular</CardTitle>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-[#2d3139]">
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
                     disabled={selectedRole === 'owner' && !isMaster}
                     className="data-[state=checked]:bg-[#3b82f6] data-[state=checked]:border-[#3b82f6]"
                   />
                 </label>
               ))}
             </div>
           </div>
           <div className="p-6 space-y-4 border-l border-[#2d3139]">
             <div className="flex items-center gap-2 mb-2">
               <Eye className="text-yellow-500" size={16} />
               <h4 className="font-bold text-xs text-yellow-500 uppercase tracking-wider">Visualizar Listagens de Dados</h4>
             </div>
             <p className="text-[10px] text-[#71717a]">Se desmarcado, o usuário acessa a tela mas verá o aviso de "Acesso Negado".</p>
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
                     disabled={selectedRole === 'owner' && !isMaster}
                     className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                   />
                 </label>
               ))}
             </div>
           </div>
           <div className="p-6 space-y-4 border-l border-[#2d3139]">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="text-emerald-500" size={16} />
                <h4 className="font-bold text-xs text-emerald-500 uppercase tracking-wider">Gerenciar (Alterar / Excluir)</h4>
              </div>
              <p className="text-[10px] text-[#71717a]">Permite criar, editar ou remover itens nestes módulos.</p>
              <div className="grid grid-cols-1 gap-1">
                {ALL_MENU_ITEMS.map(item => (
                  <label 
                    key={item.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                      rolePermissions[selectedRole]?.manage?.includes(item.id) 
                        ? "bg-emerald-500/5 border-emerald-500/20 text-white" 
                        : "bg-transparent border-[#2d3139] text-[#71717a] hover:bg-white/5"
                    )}
                  >
                    <span className="text-xs font-medium">{item.label}</span>
                    <Checkbox 
                      checked={rolePermissions[selectedRole]?.manage?.includes(item.id)}
                      onCheckedChange={() => togglePermission(item.id, 'manage')}
                      disabled={selectedRole === 'owner' && !isMaster}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
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

    const currentBaseRoles = customRoles.length > 0 ? customRoles : SUGGESTED_INITIAL_ROLES;

    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'roles'), {
        roles: [...currentBaseRoles, newRole]
      });
      setNewRoleLabel('');
      setIsAdding(false);
      toast.success('Nível de acesso criado!');
    } catch (error) {
      toast.error('Erro ao criar nível de acesso.');
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/roles`);
    }
  };

  const handleDeleteRole = (role: UserRole) => {
    // Standard roles cannot be deleted
    if (['owner', 'admin'].includes(role.id)) {
      toast.error('Níveis de acesso padrão não podem ser deletados.');
      return;
    }
    setRoleToDelete(role);
    setIsDeleteRoleConfirmOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    const currentBaseRoles = customRoles.length > 0 ? customRoles : SUGGESTED_INITIAL_ROLES;
    const updated = currentBaseRoles.filter(r => r.id !== roleToDelete.id);
    
    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'roles'), {
        roles: updated
      });
      toast.success('Nível de acesso removido!');
      setIsDeleteRoleConfirmOpen(false);
      setRoleToDelete(null);
    } catch (error) {
      toast.error('Erro ao remover nível de acesso.');
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/roles`);
    }
  };

  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [editRoleLabel, setEditRoleLabel] = useState('');

  const handleUpdateRole = async () => {
    if (!editingRole || !editRoleLabel.trim()) return;
    
    const currentBaseRoles = customRoles.length > 0 ? customRoles : SUGGESTED_INITIAL_ROLES;
    const updated = currentBaseRoles.map(r => 
      r.id === editingRole.id ? { ...r, label: editRoleLabel.trim() } : r
    );

    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'roles'), {
        roles: updated
      });
      toast.success('Nível de acesso atualizado!');
      setEditingRole(null);
    } catch (error) {
      toast.error('Erro ao atualizar nível de acesso.');
    }
  };

  const [roleToDelete, setRoleToDelete] = useState<UserRole | null>(null);
  const [isDeleteRoleConfirmOpen, setIsDeleteRoleConfirmOpen] = useState(false);

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
          {userRoles.map(role => {
            const isSystemRole = role.id === 'owner' || role.id === 'admin';
            return (
              <div key={role.id} className={cn(
                "flex items-center justify-between p-3 rounded-xl bg-[#0f1115] border transition-all group",
                isSystemRole ? "border-[#2d3139] opacity-70" : "border-[#3b82f6]/20 hover:border-[#3b82f6]/50"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isSystemRole ? "bg-white/5" : "bg-[#3b82f6]/10"
                  )}>
                    {isSystemRole ? <Lock size={14} className="text-[#71717a]" /> : <Shield size={14} className="text-[#3b82f6]" />}
                  </div>
                  <span className={cn(
                    "text-sm font-medium text-white",
                    !isSystemRole && "uppercase italic font-black tracking-tight"
                  )}>{role.label}</span>
                </div>
                {isSystemRole ? (
                  <Badge variant="outline" className="text-[9px] border-[#2d3139] text-[#71717a]">SISTEMA</Badge>
                ) : (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-blue-400 hover:bg-blue-400/10"
                      onClick={() => {
                        setEditingRole(role);
                        setEditRoleLabel(role.label);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-[#ef4444] hover:bg-[#ef4444]/10"
                      onClick={() => handleDeleteRole(role)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle>Editar Nível de Acesso</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-[#a0a0a0]">Nome do Nível</Label>
            <Input 
              value={editRoleLabel}
              onChange={e => setEditRoleLabel(e.target.value)}
              className="bg-[#0f1115] border-[#2d3139] text-white mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)} className="border-[#2d3139]">Cancelar</Button>
            <Button onClick={handleUpdateRole} className="bg-purple-500 hover:bg-purple-600">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteRoleConfirmOpen} onOpenChange={setIsDeleteRoleConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle>Excluir Nível de Acesso</DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">
              AVISO: Verifique se existe algum usuário com o nível <span className="text-red-500 font-bold">"{roleToDelete?.label}"</span> antes de excluir. Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteRoleConfirmOpen(false)} className="border-[#2d3139]">Cancelar</Button>
            <Button onClick={confirmDeleteRole} className="bg-red-500 hover:bg-red-600">Excluir Permanente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  userRoles: UserRole[],
  key?: any
}) {
  const [localApp, setLocalApp] = useState<AppSettings>(appSettings || initialAppSettings);

  useEffect(() => {
    if (appSettings && Object.keys(appSettings).length > 0) {
      // When appSettings arrives from Firestore, update the form state
      // We check for length > 0 to avoid resetting to empty if snapshot is just initial
      setLocalApp(appSettings);
    }
  }, [appSettings]);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newServiceType, setNewServiceType] = useState('');

  const handleAddServiceType = () => {
    if (!newServiceType.trim()) return;
    if (localApp.serviceTypes?.includes(newServiceType.trim())) {
      toast.error('Este tipo de serviço já existe.');
      return;
    }
    const updatedTypes = [...(localApp.serviceTypes || []), newServiceType.trim()];
    setLocalApp({ ...localApp, serviceTypes: updatedTypes });
    setNewServiceType('');
  };

  const handleRemoveServiceType = (typeToRemove: string) => {
    const updatedTypes = (localApp.serviceTypes || []).filter(t => t !== typeToRemove);
    setLocalApp({ ...localApp, serviceTypes: updatedTypes });
  };

  const [editingServiceType, setEditingServiceType] = useState<string | null>(null);
  const [editServiceTypeLabel, setEditServiceTypeLabel] = useState('');

  const handleUpdateServiceType = () => {
    if (!editingServiceType || !editServiceTypeLabel.trim()) return;
    const updatedTypes = (localApp.serviceTypes || []).map(t => 
      t === editingServiceType ? editServiceTypeLabel.trim() : t
    );
    setLocalApp({ ...localApp, serviceTypes: updatedTypes });
    setEditingServiceType(null);
  };

  // Multi-PIX states
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [currentPix, setCurrentPix] = useState<Partial<PixAccount>>({});
  const [editingPixId, setEditingPixId] = useState<string | null>(null);

  // Installment plans states
  const [isInstallmentDialogOpen, setIsInstallmentDialogOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<{id?: string, brand: 'VISA' | 'MASTERCARD' | 'AMERICA' | 'ELO', type: 'DÉBITO' | 'CRÉDITO', installments: number, interestRate: number}>({ brand: 'VISA', type: 'CRÉDITO', installments: 1, interestRate: 0 });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planBrandFilter, setPlanBrandFilter] = useState<'ALL' | 'VISA' | 'MASTERCARD' | 'AMERICA' | 'ELO' | 'NONE'>('NONE');
  const [planTypeFilter, setPlanTypeFilter] = useState<'ALL' | 'DÉBITO' | 'CRÉDITO'>('ALL');
  const [planInstallmentFilter, setPlanInstallmentFilter] = useState<string>('');
  const [lastUsedBrand, setLastUsedBrand] = useState<'VISA' | 'MASTERCARD' | 'AMERICA' | 'ELO'>('VISA');
  const [lastUsedType, setLastUsedType] = useState<'DÉBITO' | 'CRÉDITO'>('CRÉDITO');

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
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'general'), localApp, { merge: true });
      // Also update the main company document for better reactivity in the header
      await updateDoc(doc(db, 'companies', companyId), {
        name: localApp.companyName,
        companyName: localApp.companyName
      });
      toast.success('Configurações gerais salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações.');
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/general`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRotateInviteCode = async () => {
    setIsSubmitting(true);
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await updateDoc(doc(db, 'companies', companyId), {
        inviteCode: newCode
      });
      toast.success('Código de convite alterado com sucesso!');
    } catch (error) {
      toast.error('Erro ao alterar código de convite.');
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}`);
    } finally {
      setIsSubmitting(false);
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
      setIsSubmitting(true);
      await setDoc(doc(db, 'companies', companyId, 'settings', 'pix'), { accounts: updatedAccounts });
      toast.success(editingPixId ? 'Conta PIX atualizada!' : 'Nova conta PIX adicionada!');
      setIsPixDialogOpen(false);
      setCurrentPix({});
      setEditingPixId(null);
    } catch (error) {
      toast.error('Erro ao salvar conta PIX.');
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/pix`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePixAccount = async (id: string) => {
    const updatedAccounts = (pixSettings.accounts || []).filter(acc => acc.id !== id);
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'companies', companyId, 'settings', 'pix'), { accounts: updatedAccounts });
      toast.success('Conta PIX removida!');
    } catch (error) {
      toast.error('Erro ao remover conta PIX.');
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/settings/pix`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInstallmentPlan = async () => {
    if (currentPlan.installments <= 0) {
      toast.error('Número de parcelas deve ser maior que zero.');
      return;
    }
    let updatedPlans = [...(localApp.installmentPlans || [])];
    if (editingPlanId) {
      updatedPlans = updatedPlans.map(p => p.id === editingPlanId ? { ...p, ...currentPlan } as any : p);
    } else {
      updatedPlans.push({ ...currentPlan, id: Date.now().toString() } as any);
    }
    
    try {
      setIsSubmitting(true);
      await setDoc(doc(db, 'companies', companyId, 'settings', 'general'), { installmentPlans: updatedPlans }, { merge: true });
      setLocalApp({ ...localApp, installmentPlans: updatedPlans });
      setLastUsedBrand(currentPlan.brand);
      setLastUsedType(currentPlan.type);
      toast.success(editingPlanId ? 'Plano atualizado!' : 'Novo plano adicionado!');
      setIsInstallmentDialogOpen(false);
      setCurrentPlan({ brand: currentPlan.brand, type: currentPlan.type, installments: 1, interestRate: 0 });
      setEditingPlanId(null);
    } catch (error) {
      toast.error('Erro ao salvar plano de parcelamento.');
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInstallmentPlan = async (id: string) => {
    const updatedPlans = (localApp.installmentPlans || []).filter(p => p.id !== id);
    try {
      setIsSubmitting(true);
      await setDoc(doc(db, 'companies', companyId, 'settings', 'general'), { installmentPlans: updatedPlans }, { merge: true });
      setLocalApp({ ...localApp, installmentPlans: updatedPlans });
      toast.success('Plano removido!');
    } catch (error) {
      toast.error('Erro ao remover plano de parcelamento.');
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateInstallmentPlansPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    // Filtered data for PDF
    const filtered = (localApp.installmentPlans || [])
      .filter(p => {
        const matchBrand = planBrandFilter === 'ALL' ? true : (planBrandFilter === 'NONE' ? false : p.brand === planBrandFilter);
        const matchType = planTypeFilter === 'ALL' ? true : p.type === planTypeFilter;
        const matchInstallment = planInstallmentFilter === '' ? true : p.installments === Number(planInstallmentFilter);
        return matchBrand && matchType && matchInstallment;
      })
      .sort((a, b) => {
        if (a.brand !== b.brand) return (a.brand || '').localeCompare(b.brand || '');
        if (a.type !== b.type) return (a.type || '').localeCompare(b.type || '');
        return a.installments - b.installments;
      });

    if (filtered.length === 0) {
      toast.error('Nenhum dado filtrado para gerar o PDF.');
      return;
    }

    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('TABELA DE TAXAS E JUROS', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const filterInfo = `Filtros: ${planBrandFilter === 'ALL' ? 'Todas' : (planBrandFilter === 'NONE' ? 'Nenhuma' : planBrandFilter)} | Tipo: ${planTypeFilter}${planInstallmentFilter ? ` | Parcela: ${planInstallmentFilter}` : ''}`;
    doc.text(filterInfo, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Empresa: ${localApp.companyName || 'Sua Empresa'}`, pageWidth / 2, 34, { align: 'center' });
    
    autoTable(doc, {
      startY: 40,
      head: [['BANDEIRA', 'TIPO', 'PARCELAS', 'TAXA DE JUROS (%)']],
      body: filtered.map(p => [p.brand, p.type, `${p.installments}x`, `${p.interestRate.toFixed(2)}%`]),
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { halign: 'center', fontSize: 9 },
      columnStyles: { 0: { halign: 'left' } }
    });

    const fileName = `taxas_juros_${format(new Date(), 'dd_MM_yyyy')}.pdf`;
    doc.save(fileName);
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

  const [selectedBackupCollections, setSelectedBackupCollections] = useState<string[]>([
    'companies', 'clients', 'visits', 'receipts', 'financial', 'budgets', 'users',
    'suppliers', 'serviceOrders', 'inventory', 'inventoryTransactions', 'logs'
  ]);

  const BACKUP_COLLECTIONS_LABELS: { [key: string]: string } = {
    companies: "Dados/Conf. da Empresa",
    users: "Equipe e Usuários",
    clients: "Clientes",
    visits: "Visitas Técnicas",
    serviceOrders: "Ordens de Serviço (O.S.)",
    budgets: "Orçamentos",
    receipts: "Recibos e Comprovantes",
    financial: "Financeiro e Lançamentos",
    inventory: "Produtos no Estoque",
    inventoryTransactions: "Movimentações de Estoque",
    suppliers: "Fornecedores",
    logs: "Registros de Logs/Auditoria"
  };

  const toggleBackupCollection = (colKey: string) => {
    setSelectedBackupCollections(prev => 
      prev.includes(colKey) 
        ? prev.filter(k => k !== colKey) 
        : [...prev, colKey]
    );
  };

  const handleSelectAllBackupCollections = () => {
    setSelectedBackupCollections(Object.keys(BACKUP_COLLECTIONS_LABELS));
  };

  const handleSelectNoneBackupCollections = () => {
    setSelectedBackupCollections([]);
  };

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = async () => {
    if (selectedBackupCollections.length === 0) {
      toast.warning("Selecione pelo menos um módulo/dados para exportar!");
      return;
    }
    setIsBackingUp(true);
    try {
      const backupData: any = { 
        companyName: localApp.companyName, 
        companyId, 
        documentNumber: localApp.document, 
        exportedAt: new Date().toISOString(), 
        data: {} 
      };
      const collections = [
        'companies', 'clients', 'visits', 'receipts', 'financial', 'budgets', 'users',
        'suppliers', 'serviceOrders', 'inventory', 'inventoryTransactions', 'logs'
      ].filter(col => selectedBackupCollections.includes(col));
      
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
            const salesSnap = await getDocs(collection(db, 'companies', docSnap.id, 'sales'));
            if (!salesSnap.empty) {
              docData.sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
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

    if (selectedBackupCollections.length === 0) {
      toast.warning("Selecione pelo menos um módulo/dados na lista abaixo para restaurar!");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const confirmRestore = window.confirm("ATENÇÃO: Restaurar um backup substituirá os dados atuais que possuírem o mesmo ID APENAS para os módulos marcados. Deseja continuar?");
    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backup = reconstructTimestamps(JSON.parse(text));

      if (!backup.data) {
        throw new Error("Formato de backup inválido.");
      }

      const collections = Object.keys(backup.data).filter(col => selectedBackupCollections.includes(col));
      let totalRestored = 0;

      if (collections.length === 0) {
        throw new Error("O arquivo de backup selecionado não contém nenhum dado para os módulos marcados na tela.");
      }

      for (const col of collections) {
        const docs = backup.data[col];
        if (!Array.isArray(docs)) continue;

        for (const item of docs) {
          const { id: itemId, generalSettings, pixSettings, permissionsSettings, sales, ...data } = item;
          
          const targetId = (col === 'companies') ? companyId : itemId;

          // Ensure data belongs to current company if it's not the company doc itself
          if (col !== 'companies') {
            data.companyId = companyId;
          }

          // Restore main document
          await setDoc(doc(db, col, targetId), data);

          // Special handling for subcollections if it's the companies collection
          if (col === 'companies') {
            if (generalSettings) {
              await setDoc(doc(db, 'companies', targetId, 'settings', 'general'), generalSettings);
            }
            if (pixSettings) {
              await setDoc(doc(db, 'companies', targetId, 'settings', 'pix'), pixSettings);
            }
            if (permissionsSettings) {
              await setDoc(doc(db, 'companies', targetId, 'settings', 'permissions'), permissionsSettings);
            }
            if (Array.isArray(sales)) {
              for (const sale of sales) {
                const { id: saleId, ...saleData } = sale;
                await setDoc(doc(db, 'companies', targetId, 'sales', saleId), saleData);
              }
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic text-[#3b82f6]">Configurações</h2>
        <p className="text-[#a0a0a0] text-sm uppercase tracking-[0.2em] font-medium">Controle de acesso, dados da empresa e backup.</p>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] justify-between items-start bg-[#1a1d23] border border-[#2d3139] p-8 rounded-2xl gap-8 mb-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-[#3b82f6]/10 transition-colors"></div>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
                  <Share2 className="text-[#3b82f6]" size={20} />
                  Acesso de Equipe
                </h3>
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 font-black text-[10px] uppercase">Ativo</Badge>
              </div>
              <p className="text-sm text-[#71717a] max-w-lg leading-relaxed">
                Compartilhe o código ou o QR code abaixo para que novos <span className="text-[#3b82f6] font-bold">colaboradores</span> entrem diretamente na sua empresa.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#0f1115] px-6 py-4 rounded-xl border border-[#2d3139] text-[#3b82f6] font-mono font-black text-4xl tracking-widest shadow-inner select-all">
                  {currentCompany?.inviteCode || '...'}
                </div>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="border-[#2d3139] hover:bg-white/5 text-white h-10 font-black text-[10px] uppercase tracking-widest gap-2"
                    onClick={() => {
                      const code = currentCompany?.inviteCode || '';
                      if (code) {
                        navigator.clipboard.writeText(code);
                        toast.success('Código copiado!');
                      }
                    }}
                  >
                    <Copy size={14} /> Copiar Código
                  </Button>
                  <Button 
                    variant="default" 
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white h-10 font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg shadow-blue-500/20"
                    onClick={() => {
                      const code = currentCompany?.inviteCode || '';
                      if (code) {
                        const url = `${window.location.origin}${window.location.pathname}?code=${code}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Link de convite copiado!');
                      }
                    }}
                  >
                    <ExternalLink size={14} /> Copiar Link
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#555] font-bold uppercase tracking-wider">
                <Shield size={10} /> Segurança SegurPro Ativa
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-2xl shadow-black/40">
              <QRCodeCanvas 
                value={`${window.location.origin}${window.location.pathname}?code=${currentCompany?.inviteCode || ''}`}
                size={140}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-[10px] text-[#71717a] font-black uppercase tracking-[0.2em]">Escanear para Entrar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
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
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-[#2d3139]">
                  <Label className="text-[#a0a0a0]">Assinatura Digital</Label>
                  <SignaturePad 
                    value={localApp.signatureUrl} 
                    onChange={(val) => setLocalApp({ ...localApp, signatureUrl: val })} 
                  />
                  <p className="text-[9px] text-[#71717a] italic">Usada em recibos e laudos técnicos.</p>
                </div>
                <Button onClick={handleSaveApp} disabled={isSubmitting} className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold uppercase tracking-widest text-xs h-10">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar Dados Empresa
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="text-[#3b82f6]" size={20} />
                  Backup e Segurança
                </CardTitle>
                <CardDescription className="text-[#71717a]">
                  Exporte ou importe seus dados com filtros personalizados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Custom Checklist for modules/data categories */}
                <div className="border border-[#2d3139]/80 rounded-xl p-4 bg-[#0f1115]/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-2 border-b border-[#2d3139]/40">
                    <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-wider">
                      Módulos Selecionados (Exportar / Importar)
                    </span>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={handleSelectAllBackupCollections} 
                        className="text-[9px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
                      >
                        Marcar Todos
                      </button>
                      <span className="text-neutral-700 text-[9px]">|</span>
                      <button 
                        type="button"
                        onClick={handleSelectNoneBackupCollections} 
                        className="text-[9px] font-black text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {Object.entries(BACKUP_COLLECTIONS_LABELS).map(([key, label]) => {
                      const isSelected = selectedBackupCollections.includes(key);
                      return (
                        <label 
                          key={key} 
                          className={`flex items-center gap-3 p-1.5 rounded-lg border transition-all cursor-pointer select-none ${
                            isSelected 
                              ? 'bg-[#1a1d23]/80 border-[#3b82f6]/30 text-white font-semibold' 
                              : 'bg-transparent border-transparent text-[#71717a] hover:text-[#e2e8f0]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBackupCollection(key)}
                            className="rounded border-[#2d3139] bg-[#0f1115] text-[#3b82f6] focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 transition-all checked:bg-[#3b82f6]"
                          />
                          <span className="text-[10px] uppercase tracking-tight font-mono">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    onClick={handleDownloadBackup} 
                    disabled={isBackingUp || isRestoring}
                    variant="outline"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white h-11 text-[9px] font-black tracking-tighter"
                  >
                    {isBackingUp ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} className="mr-2" />}
                    EXPORTAR FILTRADO
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
                      className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-white h-11 text-[9px] font-black tracking-tighter"
                    >
                      {isRestoring ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} className="mr-2" />}
                      IMPORTAR FILTRADO
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="text-[#3b82f6]" size={20} />
                  Tipos de Serviço
                </CardTitle>
                <CardDescription className="text-[#71717a]">
                  Personalize os tipos de serviços exibidos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                   <Input 
                     placeholder="Ex: Instalação Solar" 
                     className="bg-[#0f1115] border-[#2d3139] text-white h-10"
                     value={newServiceType}
                     onChange={e => setNewServiceType(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleAddServiceType()}
                   />
                   <Button onClick={handleAddServiceType} className="bg-[#3b82f6] hover:bg-[#2563eb] h-10">
                     <Plus size={16} />
                   </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                   {(localApp.serviceTypes || ['CFTV', 'Alarme', 'Cerca Elétrica', 'Motor de Portão', 'Redes', 'Outros']).map(type => (
                     <Badge key={type} className="bg-[#0f1115] border border-[#2d3139] text-[#a0a0a0] py-1.5 px-3 flex gap-2 items-center group hover:border-[#3b82f6]/50">
                        {type}
                        <div className="flex gap-1">
                          <button onClick={() => {
                            setEditingServiceType(type);
                            setEditServiceTypeLabel(type);
                          }} className="text-[#555] hover:text-blue-500 transition-colors">
                            <Pencil size={10} />
                          </button>
                          <button onClick={() => handleRemoveServiceType(type)} className="text-[#555] hover:text-red-500 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                     </Badge>
                   ))}
                </div>
              </CardContent>

              <Dialog open={!!editingServiceType} onOpenChange={() => setEditingServiceType(null)}>
                <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Editar Tipo de Serviço</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Input 
                      value={editServiceTypeLabel}
                      onChange={e => setEditServiceTypeLabel(e.target.value)}
                      className="bg-[#0f1115] border-[#2d3139] text-white"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingServiceType(null)} className="border-[#2d3139]">Cancelar</Button>
                    <Button onClick={handleUpdateServiceType} className="bg-[#3b82f6] hover:bg-[#2563eb]">Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>

            <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="text-[#3b82f6]" size={20} />
                    Planos de Parcelamento (Com Juros)
                  </CardTitle>
                  <CardDescription className="text-[#71717a]">
                    Cadastre taxas de juros para parcelamento no cartão.
                  </CardDescription>
                </div>
                <Button size="sm" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white h-8" onClick={() => {
                  setCurrentPlan({ brand: lastUsedBrand, installments: 1, interestRate: 0 });
                  setEditingPlanId(null);
                  setIsInstallmentDialogOpen(true);
                }}>
                  <Plus size={14} />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col sm:flex-row gap-2">
                  <Select value={planBrandFilter} onValueChange={(val: any) => setPlanBrandFilter(val)}>
                    <SelectTrigger className="w-fit min-w-[110px] bg-[#0f1115] border-[#2d3139] text-white h-10 px-3">
                      <SelectValue placeholder="Bandeira">
                        {planBrandFilter === 'ALL' ? 'Todas' : (planBrandFilter === 'NONE' ? 'Nenhuma' : planBrandFilter)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="NONE">Nenhum</SelectItem>
                      <SelectItem value="ALL">Todas</SelectItem>
                      <SelectItem value="VISA">VISA</SelectItem>
                      <SelectItem value="MASTERCARD">MASTERCARD</SelectItem>
                      <SelectItem value="AMERICA">AMEX</SelectItem>
                      <SelectItem value="ELO">ELO</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={planTypeFilter} onValueChange={(val: any) => setPlanTypeFilter(val)}>
                    <SelectTrigger className="flex-1 bg-[#0f1115] border-[#2d3139] text-white h-10">
                      <SelectValue placeholder="Tipo">
                        {planTypeFilter === 'ALL' ? 'Todos os Tipos' : planTypeFilter}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="ALL">Todos os Tipos</SelectItem>
                      <SelectItem value="DÉBITO">DÉBITO</SelectItem>
                      <SelectItem value="CRÉDITO">CRÉDITO</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input 
                    type="number" 
                    placeholder="Parcelas" 
                    value={planInstallmentFilter}
                    onChange={e => setPlanInstallmentFilter(e.target.value)}
                    className="w-full sm:w-24 bg-[#0f1115] border-[#2d3139] text-white h-10"
                  />

                  <Button 
                    variant="outline" 
                    onClick={generateInstallmentPlansPDF}
                    className="bg-[#0f1115] border-[#2d3139] hover:bg-[#1a1d23] hover:text-[#3b82f6] text-white h-10 flex gap-2 items-center"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>

                    <div className="space-y-3">
                      {(localApp.installmentPlans || []).filter(p => {
                        const matchBrand = planBrandFilter === 'ALL' ? true : (planBrandFilter === 'NONE' ? false : p.brand === planBrandFilter);
                        const matchType = planTypeFilter === 'ALL' ? true : p.type === planTypeFilter;
                        const matchInstallment = planInstallmentFilter === '' ? true : p.installments === Number(planInstallmentFilter);
                        return matchBrand && matchType && matchInstallment;
                      }).length === 0 ? (
                        <div className="p-4 text-center text-[#71717a] text-[10px] uppercase font-bold bg-[#0f1115] rounded-xl border border-dashed border-[#2d3139]">
                          {planBrandFilter === 'NONE' ? 'Selecione uma bandeira para ver os planos' : 'Nenhum plano encontrado com os filtros selecionados'}
                        </div>
                      ) : (
                        (localApp.installmentPlans || [])
                          .filter(p => {
                            const matchBrand = planBrandFilter === 'ALL' ? true : (planBrandFilter === 'NONE' ? false : p.brand === planBrandFilter);
                            const matchType = planTypeFilter === 'ALL' ? true : p.type === planTypeFilter;
                            const matchInstallment = planInstallmentFilter === '' ? true : p.installments === Number(planInstallmentFilter);
                            return matchBrand && matchType && matchInstallment;
                          })
                          .sort((a, b) => {
                            if (a.brand !== b.brand) return (a.brand || '').localeCompare(b.brand || '');
                            if (a.type !== b.type) return (a.type || '').localeCompare(b.type || '');
                            return a.installments - b.installments;
                          })
                          .map(plan => (
                          <div key={plan.id} className="flex items-center justify-between p-4 bg-[#0f1115] border border-[#2d3139] rounded-xl group transition-all hover:border-[#3b82f6]/50">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] font-bold text-[10px]">
                                {plan.brand ? plan.brand[0] : 'P'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-white font-bold text-sm tracking-tight uppercase">
                                  {plan.brand === 'AMERICA' ? 'AMEX' : (plan.brand === 'all' ? 'TODAS AS BANDEIRAS' : plan.brand)} - {plan.type === 'all' ? 'TODOS OS TIPOS' : (plan.type === 'CRÉDITO' ? 'CRÉDITO' : (plan.type === 'DÉBITO' ? 'DÉBITO' : plan.type))} - {plan.installments}x
                                </span>
                                <span className="text-[#a0a0a0] text-[10px] font-medium uppercase tracking-widest">Taxa: {plan.interestRate}%</span>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400" onClick={() => {
                                setCurrentPlan(plan);
                                setEditingPlanId(plan.id);
                                setIsInstallmentDialogOpen(true);
                              }}><Settings size={12} /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => handleDeleteInstallmentPlan(plan.id)}><Trash2 size={12} /></Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

              </CardContent>
            </Card>

            <Card className="bg-[#1a1d23] border-[#2d3139] text-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="text-[#3b82f6]" size={20} />
                    Contas PIX
                  </CardTitle>
                  <CardDescription className="text-[#71717a]">
                    Chaves PIX para recebimentos.
                  </CardDescription>
                </div>
                <Button size="sm" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white h-8" onClick={() => {
                  setCurrentPix({});
                  setEditingPixId(null);
                  setIsPixDialogOpen(true);
                }}>
                  <Plus size={14} />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(pixSettings?.accounts || []).length === 0 ? (
                    <div className="p-4 text-center text-[#71717a] text-[10px] uppercase font-bold bg-[#0f1115] rounded-xl border border-dashed border-[#2d3139]">Nenhuma conta cadastrada</div>
                  ) : (
                    pixSettings.accounts.map(acc => (
                      <div key={acc.id} className="flex flex-col p-4 bg-[#0f1115] border border-[#2d3139] rounded-xl group space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="text-white font-bold text-xs uppercase tracking-wider">{acc.label}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400" onClick={() => {
                              setCurrentPix(acc);
                              setEditingPixId(acc.id);
                              setIsPixDialogOpen(true);
                            }}><Settings size={12} /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => handleDeletePixAccount(acc.id)}><Trash2 size={12} /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-[11px]">
                          <div className="flex flex-col border-b border-[#2d3139]/30 pb-1">
                            <span className="text-[#71717a] font-bold uppercase text-[9px]">Instituição / Banco:</span>
                            <span className="text-[#e0e0e0] font-bold">{acc.bank}</span>
                          </div>
                          <div className="flex flex-col border-b border-[#2d3139]/30 pb-1">
                            <span className="text-[#71717a] font-bold uppercase text-[9px]">Favorecido:</span>
                            <span className="text-[#e0e0e0] font-bold">{acc.favored}</span>
                          </div>
                          <div className="flex flex-col border-b border-[#2d3139]/30 pb-1">
                            <span className="text-[#71717a] font-bold uppercase text-[9px]">CPF / CNPJ:</span>
                            <span className="text-[#e0e0e0] font-bold">{acc.document || '---'}</span>
                          </div>
                          <div className="flex flex-col pt-1">
                            <span className="text-[#71717a] font-bold uppercase text-[9px]">Chave PIX:</span>
                            <span className="text-[#3b82f6] font-bold text-[12px] break-all">{acc.key}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={isPixDialogOpen} onOpenChange={setIsPixDialogOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle>{editingPixId ? 'Editar Chave PIX' : 'Nova Chave PIX'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Identificador (Ex: Principal)</Label>
                <Input 
                  value={currentPix.label || ''} 
                  onChange={e => setCurrentPix({...currentPix, label: e.target.value})} 
                  placeholder="Ex: Itaú Empresa"
                  className="bg-[#0f1115] border-[#2d3139] text-white" 
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Chave PIX (Exibir no Sistema)</Label>
                  <Input 
                    value={currentPix.key || ''} 
                    onChange={e => setCurrentPix({...currentPix, key: e.target.value})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chave para QRCode (Apenas Gerar Código)</Label>
                  <Input 
                    value={currentPix.qrKey || ''} 
                    onChange={e => setCurrentPix({...currentPix, qrKey: e.target.value})} 
                    placeholder="Cole aqui o BR Code ou a chave específica para o QR Code"
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  <Input 
                    value={currentPix.bank || ''} 
                    onChange={e => setCurrentPix({...currentPix, bank: e.target.value})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input 
                    value={currentPix.document || ''} 
                    onChange={e => setCurrentPix({...currentPix, document: e.target.value})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Favorecido</Label>
                  <Input 
                    value={currentPix.favored || ''} 
                    onChange={e => setCurrentPix({...currentPix, favored: e.target.value})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPixDialogOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleSavePixAccount} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isInstallmentDialogOpen} onOpenChange={setIsInstallmentDialogOpen}>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
            <DialogHeader>
              <DialogTitle>{editingPlanId ? 'Editar Plano' : 'Novo Plano de Parcelamento'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bandeira do Cartão</Label>
                  <Select value={currentPlan.brand} onValueChange={(val: any) => setCurrentPlan({...currentPlan, brand: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue placeholder="Bandeira" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="VISA">VISA</SelectItem>
                      <SelectItem value="MASTERCARD">MASTERCARD</SelectItem>
                      <SelectItem value="AMERICA">AMEX</SelectItem>
                      <SelectItem value="ELO">ELO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={currentPlan.type} onValueChange={(val: any) => setCurrentPlan({...currentPlan, type: val, installments: val === 'DÉBITO' ? 1 : currentPlan.installments})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="DÉBITO">DÉBITO</SelectItem>
                      <SelectItem value="CRÉDITO">CRÉDITO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade de Parcelas</Label>
                  <Input 
                    type="number"
                    disabled={currentPlan.type === 'DÉBITO'}
                    value={currentPlan.installments || ''} 
                    onChange={e => setCurrentPlan({...currentPlan, installments: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de Juros (%)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={currentPlan.interestRate || ''} 
                    onChange={e => setCurrentPlan({...currentPlan, interestRate: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInstallmentDialogOpen(false)} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleSaveInstallmentPlan} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">Salvar Plano</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <RoleSettings companyId={companyId} customRoles={customRoles} userRoles={userRoles} />
        <RolePermissionManager companyId={companyId} user={user} userRoles={userRoles} currentUserData={currentUserData} />
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
  sales = [],
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
  sales: any[],
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
    } else if (category === 'Vendas PDV') {
      filteredData = sales.filter(s => isMatch(s.createdAt));
      tableHeaders = ['Nº Venda', 'Cliente', 'Vendedor', 'Pagamento', 'Valor'];
      tableRows = filteredData.map(s => [
        s.number || 'PDV-00000/00',
        s.clientName || 'CONSUMIDOR',
        s.vendorName || 'SISTEMA',
        s.paymentMethod,
        `R$ ${(s.total || 0).toFixed(2)}`
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
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Gestão de Relatórios</h2>
        <p className="text-[#a0a0a0] text-sm">Gere listagens em PDF das suas atividades por período.</p>
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
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white h-11", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-[#3b82f6]" />
                        {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione</span>}
                      </Button>
                    </PopoverTrigger>
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
                { label: 'Vendas PDV', icon: <ShoppingCart size={24} />, cat: 'Vendas PDV', color: '#10b981' },
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
        if (v.status === 'Concluída') return false;
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
    const pendingOS = (serviceOrders || []).filter(os => os.status === 'Aberto' || os.status === 'Em Andamento' || os.status === 'Aguardando Peças').length;
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
    const types = ['CFTV', 'Alarme', 'Cerca Elétrica', 'Motor de Portão', 'Redes', 'Outros'];
    return types.map(type => ({
      name: type,
      value: (visits || []).filter(v => v.type === type).length
    })).filter(t => t.value > 0);
  }, [visits]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#71717a'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Painel de Controle</h2>
        <p className="text-[#a0a0a0] text-sm">Visão geral das atividades e performance da sua empresa.</p>
      </div>

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
            <CardTitle className="text-[15px] font-semibold text-white">Distribuição por Tipo de Serviço</CardTitle>
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

function VisitsManager({ 
  visits = [], 
  receipts = [], 
  user, 
  clients = [], 
  inventory = [],
  updateStock,
  appSettings, 
  pixSettings, 
  companyId, 
  initialFilter, 
  onClearFilter, 
  showList, 
  logAction, 
  onEditClick, 
  onSignatureClick, 
  externalEditAction, 
  onExternalEditHandled 
}: { 
  visits?: TechnicalVisit[], 
  receipts?: Receipt[], 
  user: FirebaseUser, 
  clients?: Client[], 
  inventory?: any[],
  updateStock?: (parts: any[], type: 'exit' | 'entry', id: string, refType: 'os' | 'visit') => Promise<void>,
  appSettings: AppSettings, 
  pixSettings: PixSettings, 
  companyId: string, 
  initialFilter?: { date: Date | null }, 
  onClearFilter?: () => void, 
  showList: boolean, 
  logAction?: any, 
  onEditClick: (type: 'visit', data: any) => void, 
  onSignatureClick: (type: 'visit', data: any) => void, 
  externalEditAction: any, 
  onExternalEditHandled: () => void 
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'diario' | 'mensal' | 'anual'>('diario');
  const [dayFilter, setDayFilter] = useState<string>(initialFilter?.date ? format(initialFilter.date, 'yyyy-MM-dd') : '');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<TechnicalVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<TechnicalVisit | null>(null);
  const [viewingVisit, setViewingVisit] = useState<TechnicalVisit | null>(null);
  const [clientFilter, setClientFilter] = useState('all');
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);

  const [isReceiptPromptOpen, setIsReceiptPromptOpen] = useState(false);
  const [visitForReceipt, setVisitForReceipt] = useState<{ id: string, status: TechnicalVisit['status'] } | null>(null);

  useEffect(() => {
    if (externalEditAction) {
      // Ensure timestamps are converted to Dates to prevent crashes in the form
      const data = { ...externalEditAction };
      if (data.date instanceof Timestamp) data.date = data.date.toDate();
      if (data.expectedDate instanceof Timestamp) data.expectedDate = data.expectedDate.toDate();
      if (data.createdAt instanceof Timestamp) data.createdAt = data.createdAt.toDate();
      
      setEditingVisit(data);
      setIsEditOpen(true);
      onExternalEditHandled();
    }
  }, [externalEditAction, onExternalEditHandled]);

  // Sync date filter if initialFilter changes
  useEffect(() => {
    if (initialFilter?.date) {
      setDayFilter(format(initialFilter.date, 'yyyy-MM-dd'));
      setMonthFilter('');
      setYearFilter('');
      setDateFilterType('diario');
    } else {
      setDayFilter('');
      setMonthFilter('');
      setYearFilter('');
    }
  }, [initialFilter]);

  const clientsWithVisits = useMemo(() => {
    const visitedClientNames = Array.from(new Set(visits.map(v => v.clientName).filter(Boolean)));
    return clients.filter(c => visitedClientNames.includes(c.name));
  }, [clients, visits]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const filteredVisits = useMemo(() => {
    const uniqueIds = new Set();
    const uniqueVisits = (visits || []).filter(v => {
      if (uniqueIds.has(v.id)) return false;
      uniqueIds.add(v.id);
      return true;
    });
    
    return uniqueVisits.filter(v => {
      const d = safeParseDate(v.expectedDate || v.date);
      const dayMatch = (dateFilterType === 'diario' && dayFilter) ? format(d, 'yyyy-MM-dd') === dayFilter : true;
      const monthMatch = (dateFilterType === 'mensal' && monthFilter) ? format(d, 'yyyy-MM') === monthFilter : true;
      const yearMatch = (dateFilterType === 'anual' && yearFilter) ? format(d, 'yyyy') === yearFilter : true;
      const statusMatch = statusFilter === 'Todas' ? true : v.status === statusFilter;
      const clientMatch = clientFilter === 'all' || v.clientName === clientFilter;
      return dayMatch && monthMatch && yearMatch && statusMatch && clientMatch;
    });
  }, [visits, dateFilterType, dayFilter, monthFilter, yearFilter, statusFilter, clientFilter]);
  const [newVisit, setNewVisit] = useState<Partial<TechnicalVisit>>({
    type: 'CFTV',
    status: 'Agendada',
    date: new Date(),
    scheduledTime: '',
    expectedDate: new Date(),
    expectedTime: '',
    technicianName: user.displayName || '',
    technicianId: user.uid || '',
    responsibleName: '',
    serviceAddress: '',
    totalValue: 0,
    parts: [],
    clientId: ''
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

    setIsSubmitting(true);
    try {
      const formattedNumber = getNextFormattedNumber(visits, 'VT-');
      
      const partsValue = (newVisit.parts || []).reduce((acc, p) => acc + (p.quantity * p.price), 0);
      const finalTotal = (newVisit.totalValue || 0) + partsValue;

      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, 'visits'), {
        ...newVisit,
        number: formattedNumber,
        totalValue: finalTotal, // Sum of labor + parts
        partsValue,
        date: Timestamp.fromDate(newVisit.date instanceof Date ? newVisit.date : new Date()),
        expectedDate: Timestamp.fromDate(newVisit.expectedDate instanceof Date ? newVisit.expectedDate : new Date()),
        technicianId: user.uid,
        technicianName: newVisit.technicianName || user.displayName || 'Técnico',
        companyId,
        createdAt: now,
        statusDates: {
          [newVisit.status || 'Agendada']: now
        },
        statusChangedAt: now
      });

      // Deduct from inventory
      if (updateStock && newVisit.parts && newVisit.parts.length > 0) {
        await updateStock(newVisit.parts as any[], 'exit', docRef.id, 'visit');
      }

      await logAction('create', 'visit', `Agendou visita para ${newVisit.clientName}`, docRef.id, newVisit.clientName);
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
      toast.error('Erro ao agendar visita.');
      handleFirestoreError(error, OperationType.CREATE, 'visits');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeStatusUpdate = async (id: string, status: TechnicalVisit['status'], generateReceipt: boolean) => {
    setIsSubmitting(true);
    try {
      const visit = visits.find(v => v.id === id);
      if (!visit) return;
      
      const oldStatus = visit.status;
      const now = Timestamp.now();
      const currentStatusDates = visit.statusDates || {};
      const updatedStatusDates = {
        ...currentStatusDates,
        [status]: now
      };

      await updateDoc(doc(db, 'visits', id), { 
        status,
        statusDates: updatedStatusDates,
        statusChangedAt: now
      });
      if (logAction) {
        await logAction('update', 'visit', `${visit.clientName}: de ${oldStatus} para ${status}`, id, visit.clientName);
      }
      
      if (status === 'Concluída' && oldStatus !== 'Concluída' && generateReceipt) {
        const client = visit.clientId ? clients.find(c => c.id === visit.clientId) : clients.find(c => c.name === visit.clientName);
        
        // 0. Calculate Receipt Number
        const formattedNumber = getNextFormattedNumber(receipts || [], 'RC-');

        // 1. Create Receipt Data
        const currentMonth = (() => {
          const m = format(new Date(), 'MMMM/yyyy', { locale: ptBR });
          return m.charAt(0).toUpperCase() + m.slice(1);
        })();

        const receiptData = {
          number: formattedNumber,
          clientName: visit.clientName,
          clientType: client?.type || 'Avulso',
          referenceMonth: currentMonth,
          serviceSpecification: (client?.type === 'Contrato') 
            ? `Serviço Contratual - ${currentMonth}` 
            : (visit.description || visit.type),
          value: visit.totalValue || 0,
          paymentMethod: 'PIX' as const, 
          date: Timestamp.now(),
          companyId,
          status: 'Aguardando Pagamento' as const,
          pixAccountId: client?.pixAccountId || null,
          createdAt: Timestamp.now(),
          visitId: id,
          clientId: visit.clientId || client?.id || null
        };

        const receiptRef = await addDoc(collection(db, 'receipts'), receiptData);

        // 3. Automatically generate PDF for the automated receipt
        const fullReceipt = { id: receiptRef.id, ...receiptData } as Receipt;
        await generateReceiptPDF(fullReceipt, appSettings, pixSettings);
        
        toast.success('Recibo emitido (Aguardando Pagamento).');
      }
      
      toast.success(`Status atualizado para ${status}`);
    } catch (error) {
      toast.error('Erro ao atualizar status da visita.');
      handleFirestoreError(error, OperationType.UPDATE, 'visits');
    } finally {
      setIsSubmitting(false);
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
    if (!editingVisit || !editingVisit.id || !editingVisit.clientName || !editingVisit.address) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { id, ...data } = editingVisit;
      const oldVisit = visits.find(v => v.id === id);
      
      const partsValue = (data.parts || []).reduce((acc, p) => acc + (p.quantity * p.price), 0);
      const finalTotal = (data.totalValue || 0) + partsValue;

      const isFinishing = data.status === 'Concluída' && oldVisit?.status !== 'Concluída' && finalTotal > 0;

      const currentStatusDates = oldVisit?.statusDates || {};
      const updatedStatusDates = { ...currentStatusDates };
      if (oldVisit && oldVisit.status !== data.status) {
        updatedStatusDates[data.status] = Timestamp.now();
      } else if (!updatedStatusDates[data.status || 'Agendada']) {
        updatedStatusDates[data.status || 'Agendada'] = Timestamp.now();
      }

      if (isFinishing) {
        setVisitForReceipt({ id, status: 'Concluída' });
        await updateDoc(doc(db, 'visits', id), {
          ...data,
          totalValue: finalTotal,
          partsValue,
          date: editingVisit.date instanceof Date ? Timestamp.fromDate(editingVisit.date) : editingVisit.date,
          expectedDate: editingVisit.expectedDate instanceof Date ? Timestamp.fromDate(editingVisit.expectedDate) : editingVisit.expectedDate,
          updatedAt: Timestamp.now(),
          statusDates: updatedStatusDates
        });
        if (logAction) {
          await logAction('update', 'visit', `Atualizou visita técnica #${editingVisit.number} (${editingVisit.clientName})`, id);
        }
        setEditingVisit(null);
        setIsEditOpen(false);
        setIsReceiptPromptOpen(true);
      } else {
        await updateDoc(doc(db, 'visits', id), {
          ...data,
          date: editingVisit.date instanceof Date ? Timestamp.fromDate(editingVisit.date) : editingVisit.date,
          expectedDate: editingVisit.expectedDate instanceof Date ? Timestamp.fromDate(editingVisit.expectedDate) : editingVisit.expectedDate,
          updatedAt: Timestamp.now(),
          statusDates: updatedStatusDates
        });
        if (logAction) {
          await logAction('update', 'visit', `Atualizou visita técnica #${editingVisit.number} (${editingVisit.clientName})`, id);
        }
        setEditingVisit(null);
        setIsEditOpen(false);
        toast.success('Visita atualizada com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao atualizar visita.');
      handleFirestoreError(error, OperationType.UPDATE, `visits/${editingVisit?.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateVisitPDF = (visit: TechnicalVisit) => {
    const doc = new jsPDF();
    
    // Resolve which date to print based on current status and status-change history
    const currentStatus = visit.status || 'Agendada';
    let resolvedDate = visit.date;
    if (visit.statusDates && visit.statusDates[currentStatus]) {
      resolvedDate = visit.statusDates[currentStatus];
    } else {
      if (currentStatus === 'Concluída' || currentStatus === 'Em Andamento' || currentStatus === 'Cancelada') {
        resolvedDate = visit.updatedAt || new Date();
      }
    }
    
    const displayDateObj = safeParseDate(resolvedDate);
    const dateStr = format(displayDateObj, 'dd/MM/yyyy');
    
    // Determine the status label and scheduled/transition details
    let schedLabel = 'AGENDADO:';
    let schedVal = `${format(safeParseDate(visit.date), 'dd/MM/yyyy')}${visit.scheduledTime ? ` às ${visit.scheduledTime}` : ''}`;
    
    if (currentStatus === 'Em Andamento') {
      schedLabel = 'ANDAMENTO:';
      const timeStr = format(displayDateObj, 'HH:mm');
      schedVal = `${dateStr} às ${timeStr}`;
    } else if (currentStatus === 'Concluída') {
      schedLabel = 'CONCLUSÃO:';
      const timeStr = format(displayDateObj, 'HH:mm');
      schedVal = `${dateStr} às ${timeStr}`;
    } else if (currentStatus === 'Cancelada') {
      schedLabel = 'CANCELADO:';
      const timeStr = format(displayDateObj, 'HH:mm');
      schedVal = `${dateStr} às ${timeStr}`;
    }

    const createdStr = visit.createdAt ? format(safeParseDate(visit.createdAt), 'dd/MM/yyyy HH:mm') : '';
    
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
    doc.text(appSettings.companyName || '', headerX, 18);
    
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
    const boxWidth = 83;
    const boxHeight = visit.serviceAddress ? 42 : 35;
    
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

    if (visit.serviceAddress) {
      doc.setFont('helvetica', 'bold');
      doc.text('SERVIÇO:', 23, clientDataY);
      doc.setFont('helvetica', 'normal');
      const serviceAddressLines = doc.splitTextToSize(visit.serviceAddress, boxWidth - 28);
      doc.text(serviceAddressLines, 48, clientDataY);
      clientDataY += (serviceAddressLines.length * 5);
    }

    doc.setFont('helvetica', 'bold');
    doc.text('FONE:', 23, clientDataY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${visit.clientPhone || 'N/A'}`, 48, clientDataY);

    // Right Column: Scheduling Data Box
    const rightColX = 108;
    doc.rect(rightColX, currentY - 2, boxWidth, boxHeight);
    
    let schedY = currentY + 5;
    
    doc.setFont('helvetica', 'bold');
    doc.text(schedLabel, rightColX + 3, schedY);
    doc.setFont('helvetica', 'normal');
    doc.text(schedVal, rightColX + 35, schedY);
    
    schedY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('PREVISÃO:', rightColX + 3, schedY);
    doc.setFont('helvetica', 'normal');
    const expDateStr = visit.expectedDate ? format(safeParseDate(visit.expectedDate), 'dd/MM/yyyy') : '--/--/----';
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

    // --- NOVO: SEÇÃO DE PEÇAS E MATERIAIS NO PDF DA VISITA ---
    if (visit.parts && visit.parts.length > 0) {
      if (currentY > 230) { doc.addPage(); currentY = 20; }
      drawSectionTitle('3. Peças e Materiais Utilizados');
      
      // Table Header for Parts
      doc.setFillColor(245, 245, 245);
      doc.rect(20, currentY, 170, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Descrição', 23, currentY + 5);
      doc.text('Qtd', 130, currentY + 5);
      doc.text('V. Unit', 150, currentY + 5);
      doc.text('Total', 175, currentY + 5);
      doc.setFont('helvetica', 'normal');
      currentY += 10;

      visit.parts.forEach(p => {
        if (currentY > 275) { doc.addPage(); currentY = 20; }
        const desc = p.description.length > 45 ? p.description.substring(0, 42) + '...' : p.description;
        doc.text(desc, 23, currentY);
        doc.text(p.quantity.toString(), 133, currentY);
        doc.text(p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 148, currentY);
        doc.text((p.quantity * p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 173, currentY);
        currentY += 6;
      });
      currentY += 5;
    }

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
    const cityDate = formatFullDateWithCity(resolvedDate, appSettings);
    doc.text(cityDate, 105, signatureY - 10, { align: 'center' });
    
    // Signatures
    const techName = visit.technicianName || '';
    const isAndre = techName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('andre');

    doc.setLineWidth(0.3);
    if (visit.technicianSignature) {
      try {
        doc.addImage(visit.technicianSignature, 'PNG', 35, signatureY - 8, 40, 15);
      } catch (e) {
        console.error("Erro ao adicionar assinatura técnica:", e);
      }
    } else if (isAndre && appSettings.signatureUrl) {
      try {
        doc.addImage(appSettings.signatureUrl, 'PNG', 35, signatureY - 8, 40, 15);
      } catch (e) {
        console.error("Erro ao adicionar assinatura à visita:", e);
      }
    }
    doc.line(25, signatureY + 10, 90, signatureY + 10);
    doc.text('Assinatura do Técnico', 57.5, signatureY + 15, { align: 'center' });
    doc.text(isAndre ? (appSettings.responsible || techName) : techName, 57.5, signatureY + 20, { align: 'center' });
    
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Visitas Técnicas</h2>
        <p className="text-[#a0a0a0] text-sm">Gerencie seus agendamentos, check-ins e check-outs.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-[#1a1d23] border border-[#2d3139] px-4 py-2 rounded-xl shadow-inner shadow-black/20 w-full">
            <span className="text-[10px] text-[#71717a] font-black uppercase tracking-widest min-w-fit">Filtros:</span>
            
            <Popover open={isClientFilterOpen} onOpenChange={setIsClientFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-8 border-none bg-transparent text-[11px] p-0 focus:ring-0 gap-1 w-[150px] justify-between font-bold uppercase tracking-wider text-white"
                >
                  <span className="truncate">
                    {clientFilter === 'all' ? "Todos Clientes" : clientFilter}
                  </span>
                  <Search className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0 bg-[#1a1d23] border-[#2d3139]">
                <Command className="bg-[#1a1d23] text-white">
                  <CommandInput 
                    placeholder="Buscar cliente..." 
                    value={clientSearch}
                    onValueChange={setClientSearch}
                    className="text-white"
                  />
                  <CommandEmpty>Nenhum cliente.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setClientFilter('all');
                        setIsClientFilterOpen(false);
                      }}
                      className="text-white hover:bg-[#3b82f6] cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-4 w-4", clientFilter === 'all' ? "opacity-100" : "opacity-0")} />
                      Todos Clientes
                    </CommandItem>
                    {clientsWithVisits.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setClientFilter(client.name);
                          setIsClientFilterOpen(false);
                        }}
                        className="text-white hover:bg-[#3b82f6] cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4", clientFilter === client.name ? "opacity-100" : "opacity-0")} />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="w-[1px] h-4 bg-[#2d3139] hidden md:block" />

            <div className="flex items-center gap-1.5 bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]">
              <Button 
                variant={dateFilterType === 'diario' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('diario')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'diario' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Diário
              </Button>
              <Button 
                variant={dateFilterType === 'mensal' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('mensal')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'mensal' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Mensal
              </Button>
              <Button 
                variant={dateFilterType === 'anual' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('anual')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'anual' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Anual
              </Button>
            </div>

            {dateFilterType === 'diario' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139] hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Dia:</span>
                <Input 
                  type="date" 
                  className="h-7 bg-transparent border-none text-[12px] w-[115px] p-0 pr-1 focus-visible:ring-0 text-white min-w-[115px] cursor-pointer" 
                  value={dayFilter} 
                  onChange={e => setDayFilter(e.target.value)} 
                />
              </div>
            )}

            {dateFilterType === 'mensal' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139] hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Mês:</span>
                <Input 
                  type="month" 
                  className="h-7 bg-transparent border-none text-[12px] w-[115px] p-0 pr-1 focus-visible:ring-0 text-white min-w-[115px] cursor-pointer" 
                  value={monthFilter} 
                  onChange={e => setMonthFilter(e.target.value)} 
                />
              </div>
            )}

            {dateFilterType === 'anual' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139]">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Ano:</span>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-7 bg-transparent border-none text-[12px] w-[60px] p-0 focus:ring-0 text-white min-w-[60px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="w-[1px] h-4 bg-[#2d3139] hidden md:block" />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[100px] text-white">
                <SelectValue>
                  {statusFilter === 'Todas' ? "Status: Todos" : statusFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                <SelectItem value="Todas">Status: Todos</SelectItem>
                <SelectItem value="Agendada">Agendada</SelectItem>
                <SelectItem value="Em Andamento">Em Rota</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            {(dayFilter !== '' || monthFilter !== '' || yearFilter !== '' || statusFilter !== 'Todas' || clientFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-[#71717a] hover:text-[#ef4444] ml-1" 
                onClick={() => { 
                  setDayFilter(''); 
                  setMonthFilter(''); 
                  setYearFilter('');
                  setStatusFilter('Todas');
                  setClientFilter('all');
                  if (onClearFilter) onClearFilter(); 
                }}
              >
                <X size={12} />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1a1d23] border border-[#2d3139] p-1 rounded-lg">
              <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 px-2 text-[10px] font-bold uppercase"
                onClick={() => setViewMode('table')}
              >
                <List size={14} className="mr-1" /> Lista
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 px-2 text-[10px] font-bold uppercase"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={14} className="mr-1" /> Colunas
              </Button>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  <Plus size={18} />
                  Nova Visita
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Agendar Nova Visita</DialogTitle>
              <DialogDescription className="text-[#a0a0a0] text-xs">Preencha os detalhes do cliente e do serviço.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Selecionar Cliente Existente (Opcional)</Label>
                  <Select value={newVisit.clientId || ''} onValueChange={(clientId) => {
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
                      <SelectValue placeholder="Escolha um cliente..." />
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
                  <Label htmlFor="address" className="text-[#a0a0a0]">Endereço Cliente</Label>
                  <Input id="address" value={newVisit.address || ''} onChange={e => setNewVisit({...newVisit, address: e.target.value})} placeholder="Rua, Número, Bairro" className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceAddress" className="text-[#a0a0a0]">Endereço do Serviço (Opcional - Prioridade para GPS)</Label>
                  <Input id="serviceAddress" value={newVisit.serviceAddress || ''} onChange={e => setNewVisit({...newVisit, serviceAddress: e.target.value})} placeholder="Onde o serviço será realizado" className="bg-[#0f1115] border-[#b8ab26]/30 text-white" />
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
                        <SelectItem value="Redes">Redes</SelectItem>
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
                <div className="space-y-4 pt-4 border-t border-[#2d3139]/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#a0a0a0] font-bold flex items-center gap-2">
                       <Package size={16} className="text-[#3b82f6]" /> Materiais / Peças (Opcional)
                    </Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setNewVisit({...newVisit, parts: [...(newVisit.parts || []), { description: '', quantity: 1, price: 0 }]})} 
                      className="h-7 border-[#2d3139] text-xs hover:bg-[#3b82f6] hover:text-white"
                    >
                      + Adicionar Item
                    </Button>
                  </div>
                  
                  {newVisit.parts && newVisit.parts.length > 0 && (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                      {newVisit.parts.map((p, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-6 flex items-center gap-2">
                            <InventorySelector 
                              inventory={inventory} 
                              onSelect={(selected) => {
                                const next = [...(newVisit.parts || [])];
                                next[i].description = selected.name;
                                if (selected.price) next[i].price = selected.price;
                                setNewVisit({...newVisit, parts: next});
                              }} 
                            />
                            <Input 
                              className="bg-[#0f1115] border-[#2d3139] h-8 text-xs flex-1" 
                              placeholder="Descrição"
                              value={p.description} 
                              onChange={e => {
                                const next = [...(newVisit.parts || [])];
                                next[i].description = e.target.value;
                                setNewVisit({...newVisit, parts: next});
                              }}
                            />
                          </div>
                          <Input 
                            type="number"
                            className="col-span-2 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                            placeholder="Qtd"
                            value={p.quantity || ''} 
                            onChange={e => {
                              const next = [...(newVisit.parts || [])];
                              next[i].quantity = e.target.value === '' ? 0 : Number(e.target.value);
                              setNewVisit({...newVisit, parts: next});
                            }}
                          />
                          <Input 
                            type="number"
                            className="col-span-3 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                            placeholder="Preço"
                            value={p.price || ''} 
                            onChange={e => {
                              const next = [...(newVisit.parts || [])];
                              next[i].price = e.target.value === '' ? 0 : Number(e.target.value);
                              setNewVisit({...newVisit, parts: next});
                            }}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="col-span-1 h-8 w-8 text-[#ef4444] hover:bg-[#ef4444]/10" 
                            onClick={() => setNewVisit({...newVisit, parts: newVisit.parts?.filter((_, idx) => idx !== i)})}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="val" className="text-[#a0a0a0]">Valor Adicional / Mão de Obra (R$)</Label>
                  <Input 
                    id="val" 
                    type="number" 
                    value={newVisit.totalValue || ''} 
                    onChange={e => setNewVisit({...newVisit, totalValue: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    onFocus={(e) => e.target.select()}
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleAddVisit} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Agendar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

    {showList ? (
      viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
          {filteredVisits.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl">
               Nenhuma visita encontrada.
            </div>
          ) : (
            filteredVisits.map((visit) => (
              <Card 
                key={visit.id} 
                className="bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group"
              >
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                   <Button variant="ghost" size="icon" className="h-7 w-7 text-[#a0a0a0] hover:text-white bg-[#0f1115]/80 backdrop-blur-sm" onClick={() => {
                        setViewingVisit({
                          ...visit,
                          date: safeParseDate(visit.date),
                          expectedDate: safeParseDate(visit.expectedDate || visit.date),
                          createdAt: visit.createdAt ? safeParseDate(visit.createdAt) : null
                        });
                        setIsViewOpen(true);
                   }}>
                     <Eye size={12} />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-7 w-7 text-[#a0a0a0] hover:text-white bg-[#0f1115]/80 backdrop-blur-sm" onClick={() => {
                        setEditingVisit({
                          ...visit,
                          date: safeParseDate(visit.date),
                          expectedDate: safeParseDate(visit.expectedDate || visit.date),
                          createdAt: visit.createdAt ? safeParseDate(visit.createdAt) : null
                        });
                        setIsEditOpen(true);
                   }}>
                     <Pencil size={12} />
                   </Button>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Badge className={cn(
                      "text-[9px] uppercase px-1.5 h-4 font-black tracking-widest",
                      visit.status === 'Concluída' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {visit.status}
                    </Badge>
                    <span className="text-[10px] text-[#71717a] font-mono whitespace-nowrap">#{formatRecordNumber(visit.number, visit.date)}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white truncate">{visit.clientName}</span>
                    <span className="text-[10px] text-[#a0a0a0] line-clamp-1 italic">{visit.description || visit.type}</span>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">Agendamento</span>
                      <span className="text-[11px] text-[#3b82f6] font-bold">
                        {format(safeParseDate(visit.date), 'dd/MM/yyyy')} {visit.scheduledTime}
                      </span>
                    </div>
                    {visit.totalValue > 0 && (
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-widest">Valor</span>
                        <span className="text-xs font-black text-white">R$ {visit.totalValue.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-y-auto max-h-[600px] relative">
          <TableDoubleScroll>
          <Table>
          <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
            <TableRow className="border-[#2d3139] hover:bg-transparent">
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[100px]">AÇÕES</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[120px]">STATUS</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">CLIENTE / Nº</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">ENDEREÇO DO SERVIÇO / SERVIÇO</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">VISITA PARA</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider text-right">VALOR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVisits.map((visit) => (
                <TableRow key={visit.id} className="border-[#2d3139] hover:bg-[#25282e]/30 transition-all h-[80px]">
                  <TableCell className="w-[170px] p-2">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <Button variant="outline" size="icon" title="Ver Detalhes" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={() => {
                        setViewingVisit({
                          ...visit,
                          date: safeParseDate(visit.date),
                          expectedDate: safeParseDate(visit.expectedDate || visit.date),
                          createdAt: visit.createdAt ? safeParseDate(visit.createdAt) : null
                        });
                        setIsViewOpen(true);
                      }}>
                        <Eye size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Abrir Navegação (Maps)" className="h-7 w-7 border-[#2d3139] text-green-500 hover:bg-green-500/10" onClick={() => {
                        const targetAddress = visit.serviceAddress || visit.address || '';
                        const address = `${targetAddress} ${visit.cep || ''}`.trim();
                        if (!address) {
                          toast.error('Endereço não informado.');
                          return;
                        }
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
                      }}>
                        <Navigation size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Editar" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={(e) => {
                        e.stopPropagation();
                        onEditClick('visit', visit);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Gerar PDF" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={() => generateVisitPDF(visit)}>
                        <Share2 size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Excluir" className="h-7 w-7 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                        setVisitToDelete(visit);
                        setIsDeleteConfirmOpen(true);
                       }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="w-[130px] p-2">
                    <Select 
                      value={visit.status || ''} 
                      onValueChange={(val: any) => updateStatus(visit.id, val)}
                    >
                      <SelectTrigger className="h-6 w-[120px] text-[9px] bg-[#0f1115] border-[#2d3139] text-white p-1">
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
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-[12px] truncate max-w-[150px]">{visit.clientName}</span>
                      <span className="text-[10px] font-mono text-[#3b82f6] whitespace-nowrap">#{formatRecordNumber(visit.number, visit.date)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#e0e0e0] truncate max-w-[200px] font-medium">{visit.serviceAddress || visit.address}</span>
                      <span className="text-[10px] text-[#71717a] italic truncate max-w-[200px]">{visit.description || visit.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-[9px] text-[#71717a]">
                      <span className="font-bold text-[#3b82f6]">{format(safeParseDate(visit.date), 'dd/MM/yyyy')} {visit.scheduledTime}</span>
                      {visit.technicianName && <span className="text-[8px] italic">Téc: {visit.technicianName.split(' ')[0]}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-[13px] font-bold text-white">
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
        </TableDoubleScroll>
      </Card>
    ) ) : (
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
                  if (logAction) {
                    await logAction('delete', 'visit', `Excluiu visita #${visitToDelete.number} (${visitToDelete.clientName})`, visitToDelete.id);
                  }
                  toast.success('Visita excluída.');
                  setIsDeleteConfirmOpen(false);
                  setVisitToDelete(null);
                } catch (error) {
                  toast.error('Erro ao excluir visita.');
                  handleFirestoreError(error, OperationType.DELETE, `visits/${visitToDelete.id}`);
                } finally {
                  setIsSubmitting(false);
                }
              }
            }} disabled={isSubmitting} className="bg-[#ef4444] hover:bg-[#dc2626] text-white">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </Button>
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
                <p className="text-[11px] text-[#71717a] uppercase">Endereço Principal</p>
                <p className="text-sm font-medium">{viewingVisit.address}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-[#71717a] uppercase">Endereço do Serviço</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{viewingVisit.serviceAddress || viewingVisit.address}</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 gap-2 bg-green-600/10 border-green-600/20 text-green-500 hover:bg-green-600 hover:text-white"
                    onClick={() => {
                      const targetAddress = viewingVisit.serviceAddress || viewingVisit.address || '';
                      const address = `${targetAddress} ${viewingVisit.cep || ''}`.trim();
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
                    }}
                  >
                    <Navigation size={14} /> Navegar
                  </Button>
                </div>
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
        <DialogContent className="sm:max-w-[500px] bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white">Editar Visita</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
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
                  <Label htmlFor="editAddress" className="text-[#a0a0a0]">Endereço Cliente</Label>
                  <Input id="editAddress" value={editingVisit.address || ''} onChange={e => setEditingVisit({...editingVisit, address: e.target.value})} className="bg-[#0f1115] border-[#2d3139] text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editServiceAddress" className="text-[#a0a0a0]">Endereço do Serviço (Opcional - Prioridade para GPS)</Label>
                  <Input id="editServiceAddress" value={editingVisit.serviceAddress || ''} onChange={e => setEditingVisit({...editingVisit, serviceAddress: e.target.value})} placeholder="Onde o serviço será realizado" className="bg-[#0f1115] border-[#b8ab26]/30 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo de Serviço</Label>
                    <Select value={editingVisit.type || ''} onValueChange={(val: any) => setEditingVisit({...editingVisit, type: val})}>
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
                        <SelectItem value="Redes">Redes</SelectItem>
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
                <div className="space-y-4 pt-4 border-t border-[#2d3139]/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#a0a0a0] font-bold flex items-center gap-2">
                       <Package size={16} className="text-[#3b82f6]" /> Materiais / Peças (Opcional)
                    </Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEditingVisit({...editingVisit, parts: [...(editingVisit.parts || []), { description: '', quantity: 1, price: 0 }]})} 
                      className="h-7 border-[#2d3139] text-xs hover:bg-[#3b82f6] hover:text-white"
                    >
                      + Adicionar Item
                    </Button>
                  </div>
                  
                  {editingVisit.parts && editingVisit.parts.length > 0 && (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                      {editingVisit.parts.map((p, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-6 flex items-center gap-2">
                            <InventorySelector 
                              inventory={inventory} 
                              onSelect={(selected) => {
                                const next = [...(editingVisit.parts || [])];
                                next[i].description = selected.name;
                                if (selected.price) next[i].price = selected.price;
                                setEditingVisit({...editingVisit, parts: next});
                              }} 
                            />
                            <Input 
                              className="bg-[#0f1115] border-[#2d3139] h-8 text-xs flex-1" 
                              placeholder="Descrição"
                              value={p.description} 
                              onChange={e => {
                                const next = [...(editingVisit.parts || [])];
                                next[i].description = e.target.value;
                                setEditingVisit({...editingVisit, parts: next});
                              }}
                            />
                          </div>
                          <Input 
                            type="number"
                            className="col-span-2 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                            placeholder="Qtd"
                            value={p.quantity || ''} 
                            onChange={e => {
                              const next = [...(editingVisit.parts || [])];
                              next[i].quantity = e.target.value === '' ? 0 : Number(e.target.value);
                              setEditingVisit({...editingVisit, parts: next});
                            }}
                          />
                          <Input 
                            type="number"
                            className="col-span-3 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                            placeholder="Preço"
                            value={p.price || ''} 
                            onChange={e => {
                              const next = [...(editingVisit.parts || [])];
                              next[i].price = e.target.value === '' ? 0 : Number(e.target.value);
                              setEditingVisit({...editingVisit, parts: next});
                            }}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="col-span-1 h-8 w-8 text-[#ef4444] hover:bg-[#ef4444]/10" 
                            onClick={() => setEditingVisit({...editingVisit, parts: editingVisit.parts?.filter((_, idx) => idx !== i)})}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Status</Label>
                    <Select value={editingVisit.status || ''} onValueChange={(val: any) => setEditingVisit({...editingVisit, status: val})}>
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
                    <Label htmlFor="editVal" className="text-[#a0a0a0]">Valor Adicional / Mão de Obra (R$)</Label>
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
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button onClick={handleUpdateVisit} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Alterações'}
            </Button>
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              onClick={async () => {
                if (visitForReceipt) {
                  await executeStatusUpdate(visitForReceipt.id, visitForReceipt.status, true);
                  setIsReceiptPromptOpen(false);
                  setVisitForReceipt(null);
                }
              }} 
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Sim, gerar recibo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Financial Manager Component ---

function FinancialManager({ 
  financials = [], 
  visits = [], 
  clients = [], 
  pixSettings, 
  companyId, 
  showList,
  logAction,
  viewPeriod,
  setViewPeriod,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}: { 
  financials?: FinancialRecord[], 
  visits?: TechnicalVisit[], 
  clients?: Client[], 
  pixSettings: PixSettings, 
  companyId: string, 
  showList: boolean,
  logAction?: any,
  viewPeriod: 'month' | 'year',
  setViewPeriod: (v: 'month' | 'year') => void,
  selectedMonth: string,
  setSelectedMonth: (v: string) => void,
  selectedYear: string,
  setSelectedYear: (v: string) => void
}) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string | 'all'>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [financialTypeFilter, setFinancialTypeFilter] = useState<'todos' | 'Receita' | 'Despesa'>('todos');
  const [dateFilter, setDateFilter] = useState('all');
  const [pixFilter, setPixFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const availableYears = financials.map(f => {
      const d = safeParseDate(f.date);
      return d.getFullYear();
    });
    const uniqueYears = Array.from(new Set([...availableYears, currentYear])).sort((a, b) => b - a);
    return uniqueYears.map(y => ({ value: y.toString(), label: y.toString() }));
  }, [financials]);

  const clientsWithFinancials = useMemo(() => {
    const clientsWithDataIds = Array.from(new Set(financials.map(f => f.clientId).filter(Boolean)));
    return clients.filter(c => clientsWithDataIds.includes(c.id));
  }, [clients, financials]);

  const availableDates = useMemo(() => {
    let filtered = financials;
    if (selectedClientFilter !== 'all') {
      filtered = filtered.filter(f => f.clientId === selectedClientFilter);
    }
    const dates = filtered.map(f => {
      const d = safeParseDate(f.date);
      return format(d, 'yyyy-MM-dd');
    });
    return Array.from(new Set(dates)).sort().reverse();
  }, [financials, selectedClientFilter]);

  useEffect(() => {
    if (dateFilter !== 'all' && !availableDates.includes(dateFilter)) {
      setDateFilter('all');
    }
  }, [selectedClientFilter, availableDates, dateFilter]);

  const filteredFinancials = useMemo(() => {
    let filtered = financials;
    if (selectedClientFilter !== 'all') {
      filtered = filtered.filter(f => f.clientId === selectedClientFilter);
    }
    if (financialTypeFilter !== 'todos') {
      filtered = filtered.filter(f => f.type === financialTypeFilter);
    }
    
    // Filtro por Mês/Ano (sempre ativo para os totais e lista básica)
    filtered = filtered.filter(f => {
      const d = safeParseDate(f.date);
      if (viewPeriod === 'year') {
        return format(d, 'yyyy') === selectedYear;
      }
      return format(d, 'MM') === selectedMonth && format(d, 'yyyy') === selectedYear;
    });

    if (dateFilter && dateFilter !== 'all') {
      filtered = filtered.filter(f => {
        const d = safeParseDate(f.date);
        return format(d, 'yyyy-MM-dd') === dateFilter;
      });
    }
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(f => f.paymentMethod === paymentMethodFilter);
    }
    if (pixFilter !== 'all' && paymentMethodFilter === 'PIX') {
      filtered = filtered.filter(f => f.pixAccountId === pixFilter);
    }
    return filtered;
  }, [financials, financialTypeFilter, dateFilter, pixFilter, paymentMethodFilter, selectedClientFilter, selectedMonth, selectedYear, viewPeriod]);

  const financialStats = useMemo(() => {
    const filteredByPeriod = financials.filter(f => {
      const d = safeParseDate(f.date);
      if (viewPeriod === 'year') {
        return format(d, 'yyyy') === selectedYear;
      }
      return format(d, 'MM') === selectedMonth && format(d, 'yyyy') === selectedYear;
    });

    const income = filteredByPeriod.filter(f => f.type === 'Receita').reduce((acc, f) => acc + (Number(f.value) || 0), 0);
    const expense = filteredByPeriod.filter(f => f.type === 'Despesa').reduce((acc, f) => acc + (Number(f.value) || 0), 0);
    return {
      income,
      expense,
      balance: income - expense
    };
  }, [financials, selectedMonth, selectedYear, viewPeriod]);

  const [newRecord, setNewRecord] = useState<Partial<FinancialRecord>>({
    type: 'Receita',
    date: new Date(),
    value: 0,
    serviceType: 'Serviço Normal',
    category: '',
    paymentMethod: 'PIX',
    pixAccountId: '',
    clientId: '',
    description: ''
  });

  const filteredClientsForSelect = useMemo(() => {
    return clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const handleAddRecord = async () => {
    if (!newRecord.description || !newRecord.value) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    if (!companyId) {
      toast.error('Erro de identificação do sistema. Selecione uma empresa ou recarregue a página.');
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'financial'), {
        ...newRecord,
        pixAccountId: newRecord.pixAccountId || null,
        date: Timestamp.fromDate(newRecord.date instanceof Date ? newRecord.date : new Date()),
        companyId,
        createdAt: Timestamp.now()
      });
      if (logAction) {
        await logAction('create', 'financial', `Lançamento financeiro: ${newRecord.description} (R$ ${newRecord.value})`, docRef.id);
      }
      setNewRecord({ type: 'Receita', date: new Date(), value: 0, serviceType: 'Serviço Normal' });
      setIsAddOpen(false);
      toast.success('Registro financeiro salvo!');
    } catch (error) {
      toast.error('Erro ao salvar registro financeiro.');
      handleFirestoreError(error, OperationType.CREATE, 'financial');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord || !editingRecord.description || typeof editingRecord.value !== 'number') {
      toast.error('Preencha os campos obrigatórios corretamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { id } = editingRecord;
      await updateDoc(doc(db, 'financial', id), {
        description: editingRecord.description,
        value: Number(editingRecord.value),
        type: editingRecord.type,
        category: editingRecord.category || '',
        date: editingRecord.date instanceof Date ? Timestamp.fromDate(editingRecord.date) : editingRecord.date,
        serviceType: editingRecord.serviceType || '',
        paymentMethod: editingRecord.paymentMethod || null,
        pixAccountId: editingRecord.pixAccountId || null
      });
      if (logAction) {
        await logAction('update', 'financial', `Editou financeiro: ${editingRecord.description}`, id);
      }
      setEditingRecord(null);
      setIsEditOpen(false);
      toast.success('Registro financeiro atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar registro financeiro.');
      handleFirestoreError(error, OperationType.UPDATE, `financial/${editingRecord?.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'financial', recordToDelete.id));
      if (logAction) {
        await logAction('delete', 'financial', `Removeu financeiro: ${recordToDelete.description}`, recordToDelete.id);
      }
      setRecordToDelete(null);
      setIsDeleteConfirmOpen(false);
      toast.success('Registro financeiro excluído!');
    } catch (error) {
      toast.error('Erro ao excluir registro financeiro.');
      handleFirestoreError(error, OperationType.DELETE, `financial/${recordToDelete.id}`);
    } finally {
      setIsSubmitting(false);
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
        value: client.type === 'Contrato' ? (client.contractValue || 0) : newRecord.value,
        paymentMethod: client.type === 'Contrato' ? 'PIX' : newRecord.paymentMethod,
        pixAccountId: client.pixAccountId || newRecord.pixAccountId
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Gestão Financeira</h2>
        <p className="text-[#a0a0a0] text-sm">Controle fluxo de caixa, entradas e saídas.</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-8 bg-[#1a1d23] p-3 rounded-xl border border-[#2d3139] shadow-xl">
        <div className="flex items-center gap-2 bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]">
          <Button 
            variant={viewPeriod === 'month' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setViewPeriod('month')}
            className={cn("h-8 text-[11px] uppercase font-bold px-4", viewPeriod === 'month' ? "bg-blue-600 hover:bg-blue-700" : "text-[#71717a]")}
          >
            Mensal
          </Button>
          <Button 
            variant={viewPeriod === 'year' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setViewPeriod('year')}
            className={cn("h-8 text-[11px] uppercase font-bold px-4", viewPeriod === 'year' ? "bg-blue-600 hover:bg-blue-700" : "text-[#71717a]")}
          >
            Anual
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {viewPeriod === 'month' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-[140px] bg-[#0f1115] border-[#2d3139] text-white text-xs">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-9 w-[100px] bg-[#0f1115] border-[#2d3139] text-white text-xs">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
              {years.map(y => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#3b82f6] text-white border-none shadow-lg shadow-blue-900/20">
          <CardContent className="p-4 md:p-6 text-left">
            <p className="text-[10px] md:text-xs text-blue-100 uppercase tracking-widest mb-1.5 font-bold">Caixa</p>
            <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black font-mono">
              R$ {financialStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl">
          <CardContent className="p-4 md:p-6 text-left">
            <p className="text-[10px] md:text-xs text-[#71717a] uppercase tracking-widest mb-1.5 font-bold">Receitas</p>
            <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-[#10b981] font-mono">
              R$ {financialStats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl">
          <CardContent className="p-4 md:p-6 text-left">
            <p className="text-[10px] md:text-xs text-[#71717a] uppercase tracking-widest mb-1.5 font-bold">Despesas</p>
            <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-[#ef4444] font-mono">
              R$ {financialStats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 bg-[#1a1d23] border border-[#2d3139] px-4 py-2 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 pr-3 border-r border-[#2d3139]">
            <Filter size={14} className="text-blue-500" />
            <span className="text-[10px] text-[#71717a] font-black uppercase tracking-[0.2em] whitespace-nowrap">Filtros</span>
          </div>
            
            <Popover open={isClientFilterOpen} onOpenChange={setIsClientFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[150px] justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedClientFilter === 'all' 
                      ? "Todos Clientes" 
                      : clients.find((client) => client.id === selectedClientFilter)?.name || "Cliente"}
                  </span>
                  <Search className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0 bg-[#1a1d23] border-[#2d3139]">
                <Command className="bg-[#1a1d23] text-white">
                  <CommandInput 
                    placeholder="Buscar cliente..." 
                    value={clientSearch}
                    onValueChange={setClientSearch}
                    className="text-white"
                  />
                  <CommandEmpty>Nenhum cliente.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setSelectedClientFilter('all');
                        setIsClientFilterOpen(false);
                      }}
                      className="text-white hover:bg-[#3b82f6] cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedClientFilter === 'all' ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todos Clientes
                    </CommandItem>
                    {(clientsWithFinancials || []).map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setSelectedClientFilter(client.id);
                          setIsClientFilterOpen(false);
                        }}
                        className="text-white hover:bg-[#3b82f6] cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedClientFilter === client.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />

            <Select value={financialTypeFilter} onValueChange={(val: any) => setFinancialTypeFilter(val)}>
              <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[100px]">
                <SelectValue>
                  {financialTypeFilter === 'todos' ? "Tipos: Todos" : financialTypeFilter === 'Receita' ? "Receitas" : "Despesas"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="Receita">Receitas</SelectItem>
                <SelectItem value="Despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[100px]">
                <SelectValue>
                  {(!dateFilter || dateFilter === 'all') 
                    ? "Datas: Todas" 
                    : format(new Date(dateFilter + 'T12:00:00'), 'dd/MM')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                <SelectItem value="all">Todas as Datas</SelectItem>
                {availableDates.map(date => (
                  <SelectItem key={date} value={date}>{format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy')}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />

            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[120px]">
                <SelectValue>
                  {paymentMethodFilter === 'all' ? "Pagamento: Todos" : paymentMethodFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                <SelectItem value="all">Formas: Todas</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Cartão">Cartão</SelectItem>
              </SelectContent>
            </Select>

            {paymentMethodFilter === 'PIX' && (
              <>
                <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />
                <Select value={pixFilter} onValueChange={setPixFilter}>
                  <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[120px]">
                    <SelectValue>
                      {pixFilter === 'all' 
                        ? "Conta PIX: Todas" 
                        : pixSettings.accounts?.find(a => a.id === pixFilter)
                          ? `${pixSettings.accounts.find(a => a.id === pixFilter)?.label} (${pixSettings.accounts.find(a => a.id === pixFilter)?.document})`
                          : "Conta PIX"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    <SelectItem value="all">Todas as Contas</SelectItem>
                    {pixSettings.accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank} - {acc.document})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {(dateFilter !== 'all' || financialTypeFilter !== 'todos' || selectedClientFilter !== 'all' || pixFilter !== 'all' || paymentMethodFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-[#71717a] hover:text-[#ef4444] ml-1" 
                onClick={() => { 
                  setDateFilter('all'); 
                  setFinancialTypeFilter('todos');
                  setSelectedClientFilter('all');
                  setPixFilter('all');
                  setPaymentMethodFilter('all');
                }}
              >
                <X size={12} />
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center bg-[#1a1d23] border border-[#2d3139] p-1 rounded-lg">
                <Button 
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-2 text-[10px] font-bold uppercase"
                  onClick={() => setViewMode('table')}
                >
                  <List size={14} className="mr-1" /> Lista
                </Button>
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="h-7 px-2 text-[10px] font-bold uppercase"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid size={14} className="mr-1" /> Colunas
                </Button>
              </div>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white h-10 px-6 font-bold shadow-lg shadow-blue-500/10">
                    <Plus size={18} />
                    LANÇAMENTO
                  </Button>
                </DialogTrigger>
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
                    <Input 
                      id="val" 
                      type="number" 
                      value={newRecord.value || ''} 
                      onChange={e => setNewRecord({...newRecord, value: e.target.value === '' ? 0 : Number(e.target.value)})} 
                      onFocus={(e) => e.target.select()}
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Forma de Pagto</Label>
                    <Select value={newRecord.paymentMethod} onValueChange={(val: any) => setNewRecord({...newRecord, paymentMethod: val})}>
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
                  {newRecord.paymentMethod === 'PIX' && (
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Conta PIX</Label>
                      <Select value={newRecord.pixAccountId} onValueChange={(val) => setNewRecord({...newRecord, pixAccountId: val})}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue placeholder="Conta" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          {pixSettings.accounts?.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank} - {acc.document})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newRecord.date ? format(newRecord.date, "dd/MM/yyyy") : <span>Selecione</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#1a1d23] border-[#2d3139]">
                        <Calendar mode="single" selected={newRecord.date} onSelect={(date) => setNewRecord({...newRecord, date})} initialFocus className="bg-[#1a1d23] text-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
              <Button onClick={handleAddRecord} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Lançamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </div>

    {showList ? (
      viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
          {filteredFinancials.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl">
               Nenhuma transação registrada.
            </div>
          ) : (
            filteredFinancials.map((record) => (
              <Card 
                key={record.id} 
                className={cn(
                  "bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group cursor-pointer",
                  selectedRowId === record.id && "border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                )}
                onClick={() => setSelectedRowId(record.id)}
              >
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[#a0a0a0] hover:text-white bg-[#0f1115]/80 backdrop-blur-sm" onClick={(e) => {
                       e.stopPropagation();
                       setEditingRecord({
                         ...record,
                         date: safeParseDate(record.date)
                       });
                       setIsEditOpen(true);
                    }}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/20 bg-[#0f1115]/80 backdrop-blur-sm" onClick={(e) => {
                       e.stopPropagation();
                       setRecordToDelete(record);
                       setIsDeleteConfirmOpen(true);
                    }}>
                      <Trash2 size={12} />
                    </Button>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Badge className={cn(
                      "text-[9px] uppercase px-1.5 h-4 font-black tracking-widest",
                      record.type === 'Receita' ? "bg-emerald-500/10 text-emerald-500 border-none px-2" : "bg-red-500/10 text-red-500 border-none px-2"
                    )}>
                      {record.type}
                    </Badge>
                    <span className="text-[10px] text-[#71717a]">{format(safeParseDate(record.date), 'dd/MM/yyyy')}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <div className={cn("text-lg font-black italic", record.type === 'Receita' ? "text-[#10b981]" : "text-[#ef4444]")}>
                       {record.type === 'Receita' ? '+' : '-'} R$ {(record.value || 0).toFixed(2)}
                    </div>
                    <span className="text-[11px] text-white font-bold line-clamp-1 truncate" title={record.description}>
                      {record.description?.replace(/^(Recebido de:|Pagamento de:|Recebido Recibo:|Venda PDV nº:|Entrada de:|Saída de:|Pagamento referente a:|Recebido de\s*[:\-]|Relativo ao recebimento de:|Pagam\. ref\.:|Referente a\s*[:\-]|Recebemos de:|Pagamos a:)/i, '').trim() || record.description}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2d3139]/50 mt-auto flex items-center justify-between">
                   <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-widest truncate">
                         {record.paymentMethod === 'Dinheiro' ? 'DINHEIRO' : (record.paymentMethod === 'PIX' ? 'PIX' : (record.paymentMethod === 'Cartão' ? 'CARTÃO' : 'TRANSAC'))}
                      </span>
                      <span className="text-[10px] text-[#a0a0a0] truncate font-medium">
                         {record.paymentMethod === 'Dinheiro' 
                            ? 'Espécie' 
                            : (record.paymentMethod === 'PIX'
                              ? (pixSettings.accounts?.find(a => a.id === record.pixAccountId)?.label || pixSettings.accounts?.find(a => a.label === record.account)?.label || record.account || 'Conta PIX')
                              : (record.account || 'Conta'))}
                      </span>
                   </div>
                   {record.origin && (
                      <Badge variant="outline" className="text-[8px] uppercase tracking-tighter border-[#2d3139] text-[#71717a] h-4 bg-[#0f1115]/50">
                        {record.origin
                          .replace(/Recibo Nº\s*/i, 'Rc-')
                          .replace(/Ordem de Serviço Nº\s*/i, 'Os-')
                          .replace(/Orçamento Nº\s*/i, 'Oç-')
                          .replace(/Recib #/i, 'Rc-')
                          .replace(/Recibo:\s*/i, 'Rc-')
                          .replace(/OS:\s*/i, 'Os-')
                          .replace(/Orc:\s*/i, 'Oç-')}
                      </Badge>
                   )}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card 
          className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-y-auto max-h-[600px] relative focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!filteredFinancials.length) return;
            const currentIndex = filteredFinancials.findIndex(r => r.id === selectedRowId);
            if (e.key === 'ArrowDown') {
              const nextIndex = Math.min(currentIndex + 1, filteredFinancials.length - 1);
              setSelectedRowId(filteredFinancials[nextIndex].id);
              e.preventDefault();
              document.getElementById(`fin-${filteredFinancials[nextIndex].id}`)?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
              const nextIndex = Math.max(currentIndex - 1, 0);
              setSelectedRowId(filteredFinancials[nextIndex].id);
              e.preventDefault();
              document.getElementById(`fin-${filteredFinancials[nextIndex].id}`)?.scrollIntoView({ block: 'nearest' });
            }
          }}
        >
        <TableDoubleScroll>
        <Table>
          <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
            <TableRow className="border-[#2d3139] hover:bg-transparent">
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[80px]">AÇÕES</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[100px]">TIPO</TableHead>
              <TableHead className="text-left text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">VALOR / TRANSAÇÃO</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">DESCRIÇÃO / ORIGEM</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">FORMA DE PAG. / CONTA</TableHead>
              <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider text-right">DATA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFinancials.map((record) => (
              <TableRow 
                key={record.id}
                id={`fin-${record.id}`}
                onClick={() => setSelectedRowId(record.id)}
                className={cn(
                  "border-[#2d3139] transition-all h-[70px] cursor-pointer",
                  selectedRowId === record.id ? "bg-blue-500/10" : "hover:bg-[#25282e]/30"
                )}
              >
                <TableCell className="w-[100px] p-2">
                  <div className="flex items-center gap-1 flex-nowrap">
                    <Button variant="outline" size="icon" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]" onClick={() => {
                      setEditingRecord({
                        ...record,
                        date: safeParseDate(record.date)
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
                <TableCell>
                  <Badge className={cn(
                    "text-[10px] uppercase font-bold",
                    record.type === 'Receita' ? "bg-emerald-500/10 text-emerald-500 border-none" : "bg-red-500/10 text-red-500 border-none"
                  )}>
                    {record.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col font-bold">
                    <span className={cn("text-[13px]", record.type === 'Receita' ? "text-[#10b981]" : "text-[#ef4444]")}>
                      {record.type === 'Receita' ? '+' : '-'} R$ {(record.value || 0).toFixed(2)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-white text-[12px] truncate max-w-[180px]">
                      {record.description?.replace(/^(Recebido de:|Pagamento de:|Recebido Recibo:|Venda PDV nº:|Entrada de:|Saída de:|Pagamento referente a:|Recebido de\s*[:\-]|Relativo ao recebimento de:|Pagam\. ref\.:|Referente a\s*[:\-]|Recebemos de:|Pagamos a:)/i, '').trim() || record.description}
                    </span>
                    {record.origin && (
                      <span className="text-[10px] text-blue-400 font-medium">
                        {record.origin
                          .replace(/Recibo Nº\s*/i, 'Rc-')
                          .replace(/Ordem de Serviço Nº\s*/i, 'Os-')
                          .replace(/Orçamento Nº\s*/i, 'Oç-')
                          .replace(/Recib #/i, 'Rc-')
                          .replace(/Recibo:\s*/i, 'Rc-')
                          .replace(/OS:\s*/i, 'Os-')
                          .replace(/Orc:\s*/i, 'Oç-')
                          .replace(/Orç:\s*/i, 'Oç-')}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-[#e0e0e0] font-medium">
                      {record.paymentMethod === 'Dinheiro' 
                        ? '( EM ESPÉCIE )' 
                        : (record.paymentMethod === 'PIX'
                          ? (pixSettings.accounts?.find(a => a.id === record.pixAccountId)?.label || pixSettings.accounts?.find(a => a.label === record.account)?.label || record.account || 'CONTA PIX')
                          : (record.account || 'CONTA CORRENTE'))}
                    </span>
                    <Badge variant="outline" className={cn(
                      "font-normal text-[9px] uppercase w-fit border-none px-0",
                      record.paymentMethod === 'PIX' ? "bg-blue-500/10 text-blue-500" : "bg-[#2d3139]/30 text-[#a0a0a0]"
                    )}>
                      {record.paymentMethod === 'Dinheiro' ? 'DINHEIRO' : (record.paymentMethod === 'PIX' ? 'PIX' : (record.paymentMethod === 'Cartão' ? 'CARTÃO' : (record.type === 'Receita' ? 'VALOR RECEBIDO' : 'PAGAMENTO')))}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right text-[11px] text-[#71717a]">
                  {format(safeParseDate(record.date), 'dd/MM/yy')}
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
        </TableDoubleScroll>
      </Card>
    ) ) : (
      <NoAccessList title="Financeiro" />
    )}

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
                    <Select value={editingRecord.type || ''} onValueChange={(val: any) => setEditingRecord({...editingRecord, type: val})}>
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
                    <Input 
                      id="edit-val" 
                      type="number" 
                      value={editingRecord.value || ''} 
                      onChange={e => setEditingRecord({...editingRecord, value: e.target.value === '' ? 0 : Number(e.target.value)})} 
                      onFocus={(e) => e.target.select()}
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Forma de Pagto</Label>
                    <Select value={editingRecord.paymentMethod || ''} onValueChange={(val: any) => setEditingRecord({...editingRecord, paymentMethod: val})}>
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
                  {editingRecord.paymentMethod === 'PIX' && (
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Conta PIX</Label>
                      <Select value={editingRecord.pixAccountId || ''} onValueChange={(val) => setEditingRecord({...editingRecord, pixAccountId: val})}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue placeholder="Conta">
                             {pixSettings.accounts?.find(acc => acc.id === editingRecord.pixAccountId)?.label || editingRecord.pixAccountId}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          {pixSettings.accounts?.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.label} ({acc.bank} - {acc.document})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#0f1115] border-[#2d3139] text-white">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editingRecord.date ? format(editingRecord.date as Date, "dd/MM/yyyy") : <span>Selecione</span>}
                        </Button>
                      </PopoverTrigger>
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

// --- Service Orders Manager Component ---

function ServiceOrdersManager({ 
  serviceOrders = [], 
  clients = [], 
  users = [], 
  inventory = [],
  updateStock,
  appSettings, 
  pixSettings,
  companyId, 
  showList, 
  logAction, 
  onEditClick, 
  onSignatureClick, 
  externalEditAction, 
  onExternalEditHandled,
  user 
}: { 
  serviceOrders?: ServiceOrder[], 
  clients?: Client[], 
  users?: any[], 
  inventory?: any[],
  updateStock?: (parts: any[], type: 'exit' | 'entry', id: string, refType: 'os' | 'visit') => Promise<void>,
  appSettings: AppSettings, 
  pixSettings: PixSettings,
  companyId: string, 
  showList: boolean, 
  logAction?: any, 
  onEditClick: (type: 'service-order', data: any) => void, 
  onSignatureClick: (type: 'service-order', data: any) => void, 
  externalEditAction: any, 
  onExternalEditHandled: () => void,
  user?: any
}) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isValuesModalOpen, setIsValuesModalOpen] = useState(false);
  const [selectedOSForPDF, setSelectedOSForPDF] = useState<ServiceOrder | null>(null);
  const [editingOS, setEditingOS] = useState<Partial<ServiceOrder> | null>(null);
  const [osToDelete, setOSToDelete] = useState<ServiceOrder | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [dateFilterType, setDateFilterType] = useState<'diario' | 'mensal' | 'anual'>('diario');
  const [dayFilter, setDayFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);

  useEffect(() => {
    if (externalEditAction) {
      setEditingOS({
        ...externalEditAction,
        startDateTime: format(externalEditAction.startDateTime instanceof Timestamp ? externalEditAction.startDateTime.toDate() : new Date(externalEditAction.startDateTime as any), "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(externalEditAction.endDateTime instanceof Timestamp ? externalEditAction.endDateTime.toDate() : new Date(externalEditAction.endDateTime as any), "yyyy-MM-dd'T'HH:mm"),
      });
      setIsEditOpen(true);
      onExternalEditHandled();
    }
  }, [externalEditAction, onExternalEditHandled]);

  const clientsWithOrders = useMemo(() => {
    const clientsNames = Array.from(new Set(serviceOrders.map(os => os.clientName).filter(Boolean)));
    return clients.filter(c => clientsNames.includes(c.name));
  }, [clients, serviceOrders]);
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
    clientId: '',
    technicianId: user.uid || '',
    pixAccountId: ''
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
    setIsSubmitting(true);
    try {
      const formattedNumber = getNextFormattedNumber(serviceOrders || [], 'OS-');
      const finalPartsValue = (newOS.parts || []).reduce((acc, p) => acc + (p.quantity * p.price), 0);
      const finalTotal = (newOS.laborValue || 0) + finalPartsValue;

      const osData = {
        ...newOS,
        number: formattedNumber,
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
      
      // Deduct from inventory
      if (updateStock && osData.parts && osData.parts.length > 0) {
        await updateStock(osData.parts, 'exit', docRef.id, 'os');
      }

      if (logAction) {
        await logAction('create', 'service_order', `Criou O.S. #${formattedNumber} para ${osData.clientName}`, docRef.id, osData.clientName);
      }

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
      toast.error('Erro ao salvar Ordem de Serviço.');
      handleFirestoreError(err, OperationType.CREATE, 'serviceOrders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOS = async () => {
    if (!editingOS?.id) return;
    setIsSubmitting(true);
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
      if (logAction) {
        await logAction('update', 'service_order', `Atualizou O.S. #${editingOS.number} (${editingOS.clientName})`, editingOS.id, editingOS.clientName);
      }
      setIsEditOpen(false);
      toast.success('Ordem de serviço atualizada!');
      
      const updatedOS = { ...osData, id: editingOS.id } as ServiceOrder;
      setSelectedOSForPDF(updatedOS);
      setIsPrintConfirmOpen(true);
    } catch (err) {
      toast.error('Erro ao atualizar Ordem de Serviço.');
      handleFirestoreError(err, OperationType.UPDATE, 'serviceOrders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOS = async () => {
    if (!osToDelete?.id) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'serviceOrders', osToDelete.id));
      if (logAction) {
        await logAction('delete', 'service_order', `Removeu O.S. #${osToDelete.number} (${osToDelete.clientName})`, osToDelete.id, osToDelete.clientName);
      }
      setIsDeleteConfirmOpen(false);
      toast.success('Ordem de serviço excluída com sucesso.');
    } catch (err) {
      toast.error('Erro ao excluir Ordem de Serviço.');
      handleFirestoreError(err, OperationType.DELETE, 'serviceOrders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const filteredServiceOrders = useMemo(() => {
    let filtered = serviceOrders;
    
    if (filterClient && filterClient !== 'all') {
      filtered = filtered.filter(os => (os.clientName || '').toLowerCase() === filterClient.toLowerCase());
    }
    
    if (dateFilterType === 'diario' && dayFilter) {
      filtered = filtered.filter(os => {
        if (!os.startDateTime) return false;
        const d = os.startDateTime instanceof Timestamp ? os.startDateTime.toDate() : new Date(os.startDateTime);
        return format(d, 'yyyy-MM-dd') === dayFilter;
      });
    } else if (dateFilterType === 'mensal' && monthFilter) {
      filtered = filtered.filter(os => {
        if (!os.startDateTime) return false;
        const d = os.startDateTime instanceof Timestamp ? os.startDateTime.toDate() : new Date(os.startDateTime);
        return format(d, 'yyyy-MM') === monthFilter;
      });
    } else if (dateFilterType === 'anual' && yearFilter) {
      filtered = filtered.filter(os => {
        if (!os.startDateTime) return false;
        const d = os.startDateTime instanceof Timestamp ? os.startDateTime.toDate() : new Date(os.startDateTime);
        return format(d, 'yyyy') === yearFilter;
      });
    }
    
    return filtered;
  }, [serviceOrders, filterClient, dateFilterType, dayFilter, monthFilter, yearFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Ordens de Serviço</h2>
        <p className="text-[#a0a0a0] text-sm">Gerencie ordens de serviço técnicas e visitas técnicas em campo.</p>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-[#1a1d23] border border-[#2d3139] px-4 py-2 rounded-xl shadow-inner shadow-black/20 w-full">
          <Filter className="text-blue-500" size={14} />
          <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-widest min-w-fit">Filtros:</span>
            
            <Popover open={isClientFilterOpen} onOpenChange={setIsClientFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[150px] justify-between font-normal text-white"
                >
                  <span className="truncate">
                    {filterClient === 'all' ? "Todos Clientes" : filterClient}
                  </span>
                  <Search className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0 bg-[#1a1d23] border-[#2d3139]">
                <Command className="bg-[#1a1d23] text-white">
                  <CommandInput 
                    placeholder="Buscar cliente..." 
                    value={clientSearch}
                    onValueChange={setClientSearch}
                    className="text-white"
                  />
                  <CommandEmpty>Nenhum cliente encontrados.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setFilterClient('all');
                        setIsClientFilterOpen(false);
                      }}
                      className="text-white hover:bg-[#3b82f6] cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-4 w-4", filterClient === 'all' ? "opacity-100" : "opacity-0")} />
                      Todos Clientes
                    </CommandItem>
                    {clientsWithOrders.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setFilterClient(client.name);
                          setIsClientFilterOpen(false);
                        }}
                        className="text-white hover:bg-[#3b82f6] cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4", filterClient === client.name ? "opacity-100" : "opacity-0")} />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="w-[1px] h-4 bg-[#2d3139] hidden md:block" />

            <div className="flex items-center gap-1.5 bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]">
              <Button 
                variant={dateFilterType === 'diario' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('diario')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'diario' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Diário
              </Button>
              <Button 
                variant={dateFilterType === 'mensal' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('mensal')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'mensal' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Mensal
              </Button>
              <Button 
                variant={dateFilterType === 'anual' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('anual')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'anual' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Anual
              </Button>
            </div>

            {dateFilterType === 'diario' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139] hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Dia:</span>
                <Input 
                  type="date" 
                  className="h-7 bg-transparent border-none text-[12px] w-[115px] p-0 pr-1 focus-visible:ring-0 text-white min-w-[115px] cursor-pointer" 
                  value={dayFilter} 
                  onChange={e => setDayFilter(e.target.value)} 
                />
              </div>
            )}

            {dateFilterType === 'mensal' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139] hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Mês:</span>
                <Input 
                  type="month" 
                  className="h-7 bg-transparent border-none text-[12px] w-[115px] p-0 pr-1 focus-visible:ring-0 text-white min-w-[115px] cursor-pointer" 
                  value={monthFilter} 
                  onChange={e => setMonthFilter(e.target.value)} 
                />
              </div>
            )}

            {dateFilterType === 'anual' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139]">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Ano:</span>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-7 bg-transparent border-none text-[12px] w-[60px] p-0 focus:ring-0 text-white min-w-[60px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(dayFilter !== '' || monthFilter !== '' || yearFilter !== '' || filterClient !== 'all') && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-[#71717a] hover:text-[#ef4444] ml-1" 
                onClick={() => { 
                  setDayFilter(''); 
                  setMonthFilter(''); 
                  setYearFilter('');
                  setFilterClient('all');
                }}
              >
                <X size={12} />
              </Button>
            )}
            
            <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />

            <div className="flex bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "h-6 px-2 rounded-md transition-all",
                  viewMode === 'table' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
                )}
                title="Lista"
              >
                <List size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-6 px-2 rounded-md transition-all",
                  viewMode === 'grid' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
                )}
                title="Colunas"
              >
                <LayoutGrid size={14} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {serviceOrders.length > 0 && selectedIds.length === 0 && (
            <Button 
              variant="outline" 
              className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] text-xs h-9 uppercase font-black"
              onClick={() => setSelectedIds(serviceOrders.map(os => os.id))}
            >
              Selecionar Todas
            </Button>
          )}
          {selectedIds.length > 0 && (
            <Button 
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-black uppercase"
              onClick={() => {
                const selectedOS = serviceOrders.filter(os => selectedIds.includes(os.id));
                generateOSLabelsPDF(selectedOS, appSettings);
                setSelectedIds([]);
              }}
            >
              <Printer size={14} />
              Etiquetas ({selectedIds.length})
            </Button>
          )}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white h-9 px-4 font-black uppercase shadow-lg text-xs">
                <Plus size={14} />
                + Nova Ordem
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-[90vw] md:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-6 pb-2 border-b border-[#2d3139] flex-shrink-0">
              <DialogTitle>Abrir Ordem de Serviço</DialogTitle>
              <DialogDescription className="text-[#71717a]">Preencha os detalhes técnicos da visita técnica.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Client Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={newOS.clientId || ''} onValueChange={(val) => {
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
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white tracking-widest uppercase text-[10px] font-black h-10">
                      <SelectValue placeholder="Selecione um cliente">
                        {newOS.clientId ? clients.find(c => c.id === newOS.clientId)?.name : "Selecione um cliente"}
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
                      {filteredClients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name || c.razaoSocial || 'Cliente Sem Nome'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Técnico Responsável</Label>
                  <Select value={newOS.technicianId || ''} onValueChange={(val) => {
                    const u = users.find(usr => usr.uid === val);
                    if (u) setNewOS({ ...newOS, technicianId: u.uid, technicianName: u.displayName || u.email });
                  }}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white tracking-widest uppercase text-[10px] font-black h-10">
                      <SelectValue placeholder="Selecione o técnico">
                        {newOS.technicianId ? users.find(u => u.uid === newOS.technicianId)?.displayName || users.find(u => u.uid === newOS.technicianId)?.email : "Selecione o técnico"}
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
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6 flex items-center gap-2">
                      <InventorySelector 
                        inventory={inventory} 
                        onSelect={(selected) => {
                          const next = [...(newOS.parts || [])];
                          next[i].description = selected.name;
                          if (selected.price) next[i].price = selected.price;
                          setNewOS({...newOS, parts: next});
                        }} 
                      />
                      <Input 
                        className="bg-[#0f1115] border-[#2d3139] h-8 text-xs flex-1" 
                        placeholder="Descrição"
                        value={p.description} 
                        onChange={e => {
                          const next = [...(newOS.parts || [])];
                          next[i].description = e.target.value;
                          setNewOS({...newOS, parts: next});
                        }}
                      />
                    </div>
                    <Input 
                      type="number"
                      className="col-span-2 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                      placeholder="Qtd"
                      value={p.quantity || ''} 
                      onChange={e => {
                        const next = [...(newOS.parts || [])];
                        next[i].quantity = e.target.value === '' ? 0 : Number(e.target.value);
                        setNewOS({...newOS, parts: next});
                      }}
                    />
                    <Input 
                      type="number"
                      className="col-span-3 bg-[#0f1115] border-[#2d3139] h-8 text-xs" 
                      placeholder="Preço"
                      value={p.price || ''} 
                      onChange={e => {
                        const next = [...(newOS.parts || [])];
                        next[i].price = e.target.value === '' ? 0 : Number(e.target.value);
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
                    <Label>Conclusão da Visita Técnica</Label>
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
                      value={newOS.laborValue || ''} 
                      onChange={e => setNewOS({...newOS, laborValue: e.target.value === '' ? 0 : Number(e.target.value)})}
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
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="border-[#2d3139]">Cancelar</Button>
                <Button className="bg-[#3b82f6] hover:bg-[#2563eb]" disabled={isSubmitting} onClick={handleOSSave}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Gravar & Finalizar'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {showList ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
            {filteredServiceOrders.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl">
                 Nenhuma ordem de serviço encontrada.
              </div>
            ) : (
              filteredServiceOrders.map((os) => (
                <Card 
                  key={os.id} 
                  className={cn(
                    "bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group cursor-pointer",
                    selectedRowId === os.id && "border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                  )}
                  onClick={() => setSelectedRowId(os.id)}
                >
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button variant="ghost" size="icon" title="Editar" className="h-7 w-7 text-[#a0a0a0] hover:text-white bg-[#0f1115]/80 backdrop-blur-sm" onClick={(e) => {
                        e.stopPropagation();
                        onEditClick('service-order', os);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" title="PDF" className="h-7 w-7 text-[#a0a0a0] hover:text-[#3b82f6] bg-[#0f1115]/80 backdrop-blur-sm" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOSForPDF(os);
                        setIsValuesModalOpen(true);
                      }}>
                        <Share2 size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/20 bg-[#0f1115]/80 backdrop-blur-sm" onClick={(e) => {
                        e.stopPropagation();
                        setOSToDelete(os);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#3b82f6] font-bold">#{formatRecordNumber(os.number, os.date)}</span>
                      <span className="text-[9px] text-[#71717a]">{format(os.date instanceof Timestamp ? os.date.toDate() : new Date(os.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <h3 className="font-bold text-white text-sm truncate pr-14" title={os.clientName}>{os.clientName}</h3>
                    <div className="flex items-center justify-between mt-1">
                       <Badge className={cn(
                         "text-[9px] uppercase font-black px-1.5 h-4 shadow-sm",
                         os.status === 'Finalizado' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                         os.status === 'Em Andamento' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : 
                         os.status === 'Aguardando Peças' ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                       )}>
                         {os.status || 'Aberto'}
                       </Badge>
                       <span className="text-[10px] text-white font-black italic">R$ {Number(os.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[#2d3139]/50 mt-1">
                    <div className="flex flex-nowrap items-center gap-2 text-[11px] text-[#a0a0a0]">
                      <Package size={10} className="text-[#3b82f6] shrink-0" />
                      <span className="truncate">{os.equipment || 'Geral'}</span>
                    </div>
                    <div className="flex flex-nowrap items-center gap-2 text-[11px] text-[#a0a0a0]">
                      <PenTool size={10} className="text-[#3b82f6] shrink-0" />
                      <span className="truncate">{os.brandModelSN || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="h-4 w-4 rounded-full border border-[#2d3139] bg-[#0f1115] flex items-center justify-center text-[7px] text-[#3b82f6] font-black uppercase">
                          {os.technicianName?.substring(0, 2) || 'T'}
                        </div>
                        <span className="text-[9px] text-[#71717a] truncate">{os.technicianName}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-5 px-1 text-[8px] bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white uppercase font-black tracking-tighter" onClick={(e) => {
                        e.stopPropagation();
                        generateOSLabelsPDF([os], appSettings);
                      }}>
                        Etiqueta
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-y-auto max-h-[600px] relative focus:outline-none focus:ring-1 focus:ring-blue-500/50" tabIndex={0}>
          <TableDoubleScroll>
          <Table>
            <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[120px]">AÇÕES</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[120px]">STATUS</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">OS / DATA</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">CLIENTE</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">EQUIPAMENTO / MARCA / MODELO / SN</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">TÉCNICO / VALOR</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider text-right w-[100px]">ETIQUETA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServiceOrders.map(os => (
                <TableRow 
                  key={os.id}
                  id={`os-${os.id}`}
                  onClick={() => setSelectedRowId(os.id)}
                  className={cn(
                    "border-[#2d3139] transition-all h-[90px] cursor-pointer",
                    selectedRowId === os.id ? "bg-blue-500/10" : "hover:bg-[#25282e]/30"
                  )}
                >
                  <TableCell className="w-[150px] p-2">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <Button variant="outline" size="icon" title="Editar" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={(e) => {
                        e.stopPropagation();
                        onEditClick('service-order', os);
                      }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 px-1 border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] text-[9px] font-bold" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOSForPDF(os);
                        setIsValuesModalOpen(true);
                      }}>
                        PDF
                      </Button>
                      <Button variant="outline" size="icon" title="Excluir" className="h-7 w-7 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={(e) => {
                        e.stopPropagation();
                        setOSToDelete(os);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px] p-2">
                      <Select 
                        value={os.status} 
                        onValueChange={async (newStatus: any) => {
                          try {
                            await updateDoc(doc(db, 'serviceOrders', os.id), { status: newStatus });
                            toast.success(`Status da O.S. atualizado para ${newStatus}`);
                            if (logAction) logAction('update', 'service_order', `Status atualizado para ${newStatus}`, os.id, os.clientName);
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, `serviceOrders/${os.id}`);
                          }
                        }}
                      >
                        <SelectTrigger className={cn(
                          "h-6 text-[9px] uppercase border-[#2d3139] px-2 w-fit",
                          os.status === 'Finalizado' ? "text-emerald-500 bg-emerald-500/10" : 
                          os.status === 'Em Andamento' ? "text-blue-500 bg-blue-500/10" : 
                          os.status === 'Aguardando Peças' ? "text-orange-500 bg-orange-500/10" : "text-[#a0a0a0] bg-[#0f1115]"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          <SelectItem value="Aberto">Aberto</SelectItem>
                          <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                          <SelectItem value="Aguardando Peças">Aguardando Peças</SelectItem>
                          <SelectItem value="Finalizado">Finalizado</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[12px] font-mono text-[#3b82f6] font-bold">#{formatRecordNumber(os.number, os.date)}</span>
                      <span className="text-[10px] text-[#71717a] font-medium">{format(os.date instanceof Timestamp ? os.date.toDate() : new Date(os.date), 'dd/MM/yy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-white text-[12px] truncate max-w-[150px]">{os.clientName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-white font-medium truncate max-w-[200px]">{os.equipment}</span>
                      <span className="text-[10px] text-[#71717a] italic truncate max-w-[200px]">{os.brandModelSN}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-[#10b981] font-bold text-[10px] truncate max-w-[120px]">@{os.technicianName || 'Técnico'}</span>
                      <span className="font-bold text-[#3b82f6] text-[13px]">R$ {(os.totalValue || 0).toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                        id={`select-${os.id}`}
                        checked={selectedIds.includes(os.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(prev => [...prev, os.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== os.id));
                          }
                        }}
                        className="bg-[#0f1115] border-[#2d3139] h-5 w-5 data-[state=checked]:bg-[#3b82f6]"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {serviceOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-[#71717a] text-sm">
                    Nenhuma Ordem de Serviço encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TableDoubleScroll>
        </Card>
      )) : (
        <NoAccessList title="Ordens de Serviço" />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-[90vw] md:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-2 border-b border-[#2d3139] flex-shrink-0">
            <DialogTitle>Editar Ordem de Serviço</DialogTitle>
            <DialogDescription className="text-[#71717a]">Atualize os detalhes técnicos da visita técnica.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {editingOS && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editingOS.status || ''} onValueChange={(val: any) => setEditingOS({...editingOS, status: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue>
                          {editingOS.status || "Selecione o status"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="Aberto">Aberto</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Aguardando Peças">Aguardando Peças</SelectItem>
                        <SelectItem value="Finalizado">Finalizado</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Técnico Responsável</Label>
                    <Select value={editingOS.technicianId || ''} onValueChange={(val) => {
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
                    <Select value={editingOS.serviceType || ''} onValueChange={(val: any) => setEditingOS({...editingOS, serviceType: val})}>
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
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6 flex items-center gap-2">
                        <InventorySelector 
                          inventory={inventory} 
                          onSelect={(selected) => {
                            const next = [...(editingOS.parts || [])];
                            next[i].description = selected.name;
                            if (selected.price) next[i].price = selected.price;
                            setEditingOS({...editingOS, parts: next});
                          }} 
                        />
                        <Input className="bg-[#0f1115] border-[#2d3139] h-8 text-xs flex-1" value={p.description} onChange={e => {
                          const next = [...(editingOS.parts || [])];
                          next[i].description = e.target.value;
                          setEditingOS({...editingOS, parts: next});
                        }} />
                      </div>
                      <Input type="number" className="col-span-2 bg-[#0f1115] border-[#2d3139] h-8 text-xs" value={p.quantity || ''} onChange={e => {
                        const next = [...(editingOS.parts || [])];
                        next[i].quantity = e.target.value === '' ? 0 : Number(e.target.value);
                        setEditingOS({...editingOS, parts: next});
                      }} />
                      <Input type="number" className="col-span-3 bg-[#0f1115] border-[#2d3139] h-8 text-xs" value={p.price || ''} onChange={e => {
                        const next = [...(editingOS.parts || [])];
                        next[i].price = e.target.value === '' ? 0 : Number(e.target.value);
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
                      <Input type="number" className="bg-[#0f1115] border-[#2d3139]" value={editingOS.laborValue || ''} onChange={e => setEditingOS({...editingOS, laborValue: e.target.value === '' ? 0 : Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="p-6 border-t border-[#2d3139] bg-[#1a1d23]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting} className="border-[#2d3139]">Cancelar</Button>
            <Button className="bg-[#3b82f6] hover:bg-[#2563eb]" disabled={isSubmitting} onClick={handleUpdateOS}>
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Atualizar O.S.'}
            </Button>
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
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isSubmitting} className="border-[#2d3139]">Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteOS} disabled={isSubmitting} className="bg-red-500 hover:bg-red-600">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </Button>
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
              onClick={async () => {
                if (selectedOSForPDF) await generateServiceOrderPDF(selectedOSForPDF, appSettings, pixSettings, false);
                setIsValuesModalOpen(false);
              }} 
              className="flex-1 border-[#2d3139] text-white hover:bg-[#2d3139]"
            >
              Não (Sem Valores)
            </Button>
            <Button 
              onClick={async () => {
                if (selectedOSForPDF) await generateServiceOrderPDF(selectedOSForPDF, appSettings, pixSettings, true);
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

// --- Inventory Selector Component (Reusable) ---

function InventorySelector({ 
  inventory = [], 
  onSelect 
}: { 
  inventory: any[], 
  onSelect: (item: any) => void 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = inventory.filter(p => 
    (p.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
     p.code?.toLowerCase()?.includes(searchTerm.toLowerCase()))
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-400 hover:bg-blue-400/10 shrink-0">
          <Box size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-[#1a1d23] border-[#2d3139] shadow-2xl z-[100]">
        <div className="p-3 border-b border-[#2d3139]">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-blue-500" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Selecionar do Estoque</span>
          </div>
          <Input 
            placeholder="Buscar peça..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-8 text-xs bg-[#0f1115] border-[#2d3139]"
            onKeyDown={e => e.stopPropagation()}
          />
        </div>
        <ScrollArea className="h-[250px]">
          {filtered.length > 0 ? (
            <div className="p-1">
              {filtered.map(item => (
                  <button
                  key={item.id}
                  className="w-full text-left p-2 hover:bg-[#2d3139] rounded transition-colors group flex items-center gap-3"
                  onClick={() => onSelect(item)}
                >
                  <div className="w-8 h-8 rounded bg-[#0f1115] border border-[#2d3139] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Package className="text-[#71717a]" size={14} />
                    )}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="text-[9px] text-[#71717a] uppercase font-mono">{item.code} {item.location ? `• ${item.location}` : ''}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={cn("text-[10px] font-black", (item.quantity <= (item.minQuantity || 0)) ? 'text-amber-500' : 'text-emerald-500')}>
                        {item.quantity} {item.unit || 'un'}
                      </span>
                      {item.price && <span className="text-[9px] text-blue-400 font-bold">R$ {item.price.toFixed(2)}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-[10px] text-[#71717a] italic">Nenhuma peça encontrada.</div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// --- Budgets Manager Component ---

function BudgetsManager({ 
  budgets = [], 
  clients = [], 
  inventory = [],
  appSettings, 
  pixSettings, 
  companyId, 
  showList, 
  logAction, 
  onEditClick, 
  onSignatureClick, 
  externalEditAction, 
  onExternalEditHandled 
}: { 
  budgets?: Budget[], 
  clients?: Client[], 
  inventory?: any[],
  appSettings: AppSettings, 
  pixSettings: PixSettings, 
  companyId: string, 
  showList: boolean, 
  logAction?: any, 
  onEditClick: (type: 'budget', data: any) => void, 
  onSignatureClick: (type: 'budget', data: any) => void, 
  externalEditAction: any, 
  onExternalEditHandled: () => void 
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [editingBudget, setEditingBudget] = useState<Partial<Budget>>({});
  const [clientSearch, setClientSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [dateFilterType, setDateFilterType] = useState<'diario' | 'mensal' | 'anual'>('diario');
  const [dayFilter, setDayFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    if (externalEditAction) {
      const data = { ...externalEditAction };
      if (data.date instanceof Timestamp) data.date = data.date.toDate();
      if (data.createdAt instanceof Timestamp) data.createdAt = data.createdAt.toDate();
      if (data.validUntil instanceof Timestamp) data.validUntil = data.validUntil.toDate();
      
      // Derive interestType if missing
      if (!data.interestType) {
        if (data.paymentMethod === 'Cartão com Juros') data.interestType = 'with_interest';
        else if (data.paymentMethod === 'Cartão') data.interestType = 'none';
      }

      setEditingBudget(data);
      setIsEditOpen(true);
      onExternalEditHandled();
    }
  }, [externalEditAction, onExternalEditHandled]);
  
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    items: [{ description: '', quantity: 1, price: 0, imageUrl: '' }],
    serviceValue: 0,
    status: 'Pendente',
    observations: '',
    paymentMethod: 'Dinheiro',
    clientId: '',
    selectedCardBrand: 'VISA',
    selectedInstallmentPlanId: '',
    pixAccountId: ''
  });
  
  const [prevItems, setPrevItems] = useState<any[] | null>(null);
  const [prevEditItems, setPrevEditItems] = useState<any[] | null>(null);

  const resetPricesToStock = (isEdit: boolean) => {
    const budget = isEdit ? editingBudget : newBudget;
    const items = [...(budget.items || [])];
    let changedCount = 0;

    const updatedItems = items.map(item => {
      const stockItem = inventory.find(i => i.name === item.description);
      if (stockItem && stockItem.price !== undefined) {
        changedCount++;
        return { ...item, price: stockItem.price };
      }
      return item;
    });

    if (changedCount > 0) {
      if (isEdit) {
        const calc = getBudgetCalculations({...editingBudget, items: updatedItems}, appSettings);
        setEditingBudget({ 
          ...editingBudget, 
          items: updatedItems,
          cashAcceptanceValue: (calc.baseTotal * (editingBudget.cashAcceptancePercent || 0)) / 100,
          cashDeliveryValue: (calc.baseTotal * (editingBudget.cashDeliveryPercent || 0)) / 100
        });
      } else {
        const calc = getBudgetCalculations({...newBudget, items: updatedItems}, appSettings);
        setNewBudget({ 
          ...newBudget, 
          items: updatedItems,
          cashAcceptanceValue: (calc.baseTotal * (newBudget.cashAcceptancePercent || 0)) / 100,
          cashDeliveryValue: (calc.baseTotal * (newBudget.cashDeliveryPercent || 0)) / 100
        });
      }
      toast.success(`${changedCount} item(s) sincronizado(s) com o estoque!`);
    } else {
      toast.info('Os preços já estão sincronizados ou itens não encontrados no estoque.');
    }
  };

  const applyProfitMargin = (items: { description: string, quantity: number, price: number, imageUrl?: string }[], margin: number, isReset: boolean = false) => {
    if (margin <= 0) return items;
    return items.map(item => {
      // If we are resetting first, we find the original price from stock (if possible) 
      // or we assume the current price is the base price ONLY if this is the first time applying.
      // Better approach: the UI should pass the base items.
      return {
        ...item,
        price: Number((item.price * (1 + margin / 100)).toFixed(2))
      };
    });
  };

  const filteredClientsForSelect = useMemo(() => {
    return clients.filter(c => (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const clientsWithBudgets = useMemo(() => {
    const clientsNames = Array.from(new Set(budgets.map(b => b.clientName).filter(Boolean)));
    return clients.filter(c => clientsNames.includes(c.name));
  }, [clients, budgets]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const filteredBudgets = useMemo(() => {
    return budgets.filter(budget => {
      const clientMatch = clientFilter === 'all' ? true : budget.clientName === clientFilter;
      const d = budget.createdAt instanceof Timestamp ? budget.createdAt.toDate() : new Date(budget.createdAt);
      const dayMatch = (dateFilterType === 'diario' && dayFilter) ? format(d, 'yyyy-MM-dd') === dayFilter : true;
      const monthMatch = (dateFilterType === 'mensal' && monthFilter) ? format(d, 'yyyy-MM') === monthFilter : true;
      const yearMatch = (dateFilterType === 'anual' && yearFilter) ? format(d, 'yyyy') === yearFilter : true;
      const statusMatch = statusFilter === 'Todas' ? true : budget.status === statusFilter;
      return clientMatch && dayMatch && monthMatch && yearMatch && statusMatch;
    });
  }, [budgets, clientFilter, dateFilterType, dayFilter, monthFilter, yearFilter, statusFilter]);

  const handleAddItem = () => {
    const newItem = { description: '', quantity: 1, price: 0, imageUrl: '' };
    setNewBudget({
      ...newBudget,
      items: [...(newBudget.items || []), newItem]
    });
    // If we have prevItems, we need to add the new item to it as well so it's not lost on undo
    if (prevItems) {
      setPrevItems([...prevItems, { ...newItem }]);
    }
  };

  const handleSaveBudget = async () => {
    if (!newBudget.clientName) {
      toast.error('Selecione ou informe o nome do cliente.');
      return;
    }

    if (!companyId) {
      toast.error('Erro de identificação do sistema. Selecione uma empresa ou recarregue a página.');
      return;
    }

    if (!newBudget.items || newBudget.items.length === 0 || !newBudget.items[0].description) {
      toast.error('Adicione pelo menos um item ao orçamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedNumber = getNextFormattedNumber(budgets || [], 'OÇ-');
      
      const itemsToSave = newBudget.items || [];
      const { finalTotal, installmentValue } = getBudgetCalculations({ ...newBudget, items: itemsToSave }, appSettings);

      const savedDoc = await addDoc(collection(db, 'budgets'), {
        ...newBudget,
        pixAccountId: newBudget.pixAccountId || null,
        items: itemsToSave,
        number: formattedNumber,
        total: finalTotal,
        installmentValue: installmentValue || 0,
        companyId,
        createdAt: Timestamp.now()
      });
      
      if (logAction) {
        logAction('create', 'budget', `Orçamento #${formattedNumber} criado para ${newBudget.clientName}`, savedDoc.id, newBudget.clientName);
      }

      setNewBudget({ items: [{ description: '', quantity: 1, price: 0, imageUrl: '' }], serviceValue: 0, status: 'Pendente', observations: '', clientName: '', clientPhone: '', address: '' });
      setPrevItems(null);
      setIsAddOpen(false);
      toast.success('Orçamento criado!');
    } catch (error) {
      toast.error('Erro ao salvar orçamento. Verifique sua conexão ou permissões.');
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget.id) return;
    setIsSubmitting(true);
    
    const itemsToSave = editingBudget.items || [];
    const { finalTotal, installmentValue } = getBudgetCalculations({ ...editingBudget, items: itemsToSave }, appSettings);

    try {
      const { id, ...dataToUpdate } = editingBudget;
      
      // Sanitize data: remove interestType which is UI-only, and handle nulls
      const cleanData: any = {
        ...dataToUpdate,
        pixAccountId: dataToUpdate.pixAccountId || null,
        items: itemsToSave,
        total: finalTotal,
        installmentValue: installmentValue || 0,
        updatedAt: Timestamp.now()
      };
      
      // Remove any helper fields that shouldn't go to Firestore if they exist
      if ('interestType' in cleanData) delete cleanData.interestType;

      // Remove undefined values to avoid Firestore errors
      Object.keys(cleanData).forEach(key => cleanData[key] === undefined && delete cleanData[key]);

      await updateDoc(doc(db, 'budgets', id!), cleanData);
      
      if (logAction) {
        logAction('update', 'budget', `Orçamento #${editingBudget.number} atualizado`, editingBudget.id, editingBudget.clientName);
      }

      setIsEditOpen(false);
      setPrevEditItems(null);
      toast.success('Orçamento atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar orçamento.');
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'budgets', budgetToDelete.id));
      if (logAction) {
        logAction('delete', 'budget', `Orçamento #${budgetToDelete.number} excluído`, budgetToDelete.id, budgetToDelete.clientName);
      }
      setIsDeleteConfirmOpen(false);
      setBudgetToDelete(null);
      toast.success('Orçamento excluído!');
    } catch (error) {
      toast.error('Erro ao excluir orçamento.');
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: any) => {
    try {
      const budget = budgets.find(b => b.id === id);
      if (!budget) return;

      // Recalculate everything before updating to ensure sync
      const { finalTotal, installmentValue } = getBudgetCalculations(budget, appSettings);

      await updateDoc(doc(db, 'budgets', id), { 
        status,
        total: finalTotal,
        installmentValue: installmentValue || 0
      });
      
      toast.success('Status atualizado!');
      if (logAction) logAction('update', 'budget', `Status alterado para ${status}`, id, budget.clientName);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const calculateInstallmentValue = (total: number, planId: string) => {
    const plan = appSettings.installmentPlans?.find(p => p.id === planId);
    if (!plan) return total;
    const interest = plan.interestRate / 100;
    return (total * (1 + interest)) / plan.installments;
  };

  const generateBudgetPDF = async (budget: Budget) => {
    const doc = new jsPDF();
    const dateStr = format(budget.createdAt instanceof Timestamp ? budget.createdAt.toDate() : new Date(budget.createdAt), 'dd/MM/yyyy');
    
    // Helper to load image
    const loadImage = (url: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            try {
              resolve(canvas.toDataURL('image/png'));
            } catch (e) {
              console.error("CORS Error loading image:", url);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    // Pre-load all item images
    const itemImages: (string | null)[] = await Promise.all(
      budget.items.map(item => item.imageUrl ? loadImage(item.imageUrl) : Promise.resolve(null))
    );

    // Logo
    if (appSettings.logoUrl) {
      try {
        const logoData = await loadImage(appSettings.logoUrl);
        if (logoData) {
          doc.addImage(logoData, 'PNG', 20, 10, 18, 18);
        }
      } catch (e) {
        console.error("Erro ao adicionar logo ao PDF:", e);
      }
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const budgetHeaderX = appSettings.logoUrl ? 42 : 20;
    doc.text(appSettings.companyName || '', budgetHeaderX, 18);
    
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
    const hasImages = budget.items.some(item => item.imageUrl);
    const tableHead = hasImages 
      ? [['', 'Descrição', 'Qtd', 'Preço Unit.', 'Total']]
      : [['Descrição', 'Qtd', 'Preço Unit.', 'Total']];

    const tableData = budget.items.map((item, idx) => {
      const row = [
        item.description,
        item.quantity.toString(),
        `R$ ${(item.price || 0).toFixed(2)}`,
        `R$ ${((item.quantity || 0) * (item.price || 0)).toFixed(2)}`
      ];
      if (hasImages) {
        row.unshift(''); // Placeholder for image
      }
      return row;
    });

    autoTable(doc, {
      startY: 82,
      head: tableHead,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9, valign: 'middle' },
      columnStyles: hasImages ? { 0: { cellWidth: 15 } } : {},
      didDrawCell: (data) => {
        if (hasImages && data.section === 'body' && data.column.index === 0) {
          const imgData = itemImages[data.row.index];
          if (imgData) {
            doc.addImage(imgData, 'PNG', data.cell.x + 2, data.cell.y + 2, 11, 11);
          }
        }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    const { itemsTotal, serviceValue, baseTotal, finalTotal } = getBudgetCalculations(budget, appSettings);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`VALOR MATERIAL: R$ ${itemsTotal.toFixed(2)}`, 190, finalY, { align: 'right' });
    finalY += 7;
    doc.text(`VALOR MÃO DE OBRA: R$ ${serviceValue.toFixed(2)}`, 190, finalY, { align: 'right' });
    finalY += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`VALOR TOTAL: R$ ${finalTotal.toFixed(2)}`, 190, finalY, { align: 'right' });

    if (budget.paymentMethod) {
      finalY += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      const isCardPayment = budget.paymentMethod === 'Cartão' || budget.paymentMethod === 'Cartão com Juros';
      const shouldShowBrand = isCardPayment && budget.selectedCardBrand;
      
      doc.text(`Forma de Pagamento: ${budget.paymentMethod}${shouldShowBrand ? ` (${budget.selectedCardBrand})` : ''}`, 20, finalY);
      
      if (isCardPayment) {
        doc.setFont('helvetica', 'normal');
        if (budget.paymentMethod === 'Cartão com Juros' && budget.selectedInstallmentPlanId) {
          const plan = appSettings.installmentPlans?.find(p => p.id === budget.selectedInstallmentPlanId);
          if (plan) {
            const value = calculateInstallmentValue(baseTotal, plan.id);
            const totalFinanced = value * plan.installments;
            doc.text(`Pagamento em ${plan.installments}x de R$ ${value.toFixed(2)} (${plan.interestRate}% juros - Com Juros)`, 20, finalY + 7);
            doc.text(`Total Financiado: R$ ${totalFinanced.toFixed(2)}`, 20, finalY + 14);
            finalY += 19;
          }
        } else {
          const installments = budget.installments || 1;
          const valuePerInstallment = baseTotal / installments;
          doc.text(`Pagamento em ${installments}x de R$ ${valuePerInstallment.toFixed(2)} (Sem Juros)`, 20, finalY + 7);
          finalY += 12;
        }
      } else if (budget.paymentMethod === 'PIX') {
        const selectedPix = pixSettings.accounts?.find(a => a.id === budget.pixAccountId || a.label === budget.pixAccountId) || pixSettings.accounts?.[0];
        if (selectedPix) {
          finalY += 10;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text('Dados para Pagamento (PIX):', 20, finalY);
          doc.setFont('helvetica', 'normal');
          doc.text(`Chave: ${selectedPix.key} - Banco: ${selectedPix.bank}`, 20, finalY + 7);
          doc.text(`Favorecido: ${selectedPix.favored} - CPF/CNPJ: ${selectedPix.document || ''}`, 20, finalY + 12);
          
          // QR Code PIX
          try {
            const qrSize = 35;
            const qrContent = selectedPix.qrKey || selectedPix.key;
            const qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 150 });
            doc.addImage(qrDataUrl, 'PNG', 150, finalY, qrSize, qrSize);
          } catch (e) {
            console.error("Error generating PIX QR Code for Budget", e);
          }

          finalY += 15;
        }
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Gestão de Orçamentos</h2>
        <p className="text-[#a0a0a0] text-sm">Gere propostas e orçamentos profissionais para seus clientes.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-[#1a1d23] border border-[#2d3139] px-4 py-2 rounded-xl shadow-inner shadow-black/20 w-full">
            <span className="text-[10px] text-[#71717a] font-black uppercase tracking-widest min-w-fit">Filtros:</span>
            
            <Popover open={isClientFilterOpen} onOpenChange={setIsClientFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-8 border-none bg-transparent text-[11px] p-0 focus:ring-0 gap-1 w-[150px] justify-between font-bold uppercase tracking-wider text-white"
                >
                  <span className="truncate">
                    {clientFilter === 'all' ? "Todos Clientes" : clientFilter}
                  </span>
                  <Search className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0 bg-[#1a1d23] border-[#2d3139]">
                <Command className="bg-[#1a1d23] text-white">
                  <CommandInput 
                    placeholder="Buscar cliente..." 
                    value={clientSearch}
                    onValueChange={setClientSearch}
                    className="text-white"
                  />
                  <CommandEmpty>Nenhum cliente.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setClientFilter('all');
                        setIsClientFilterOpen(false);
                      }}
                      className="text-white hover:bg-[#3b82f6] cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-4 w-4", clientFilter === 'all' ? "opacity-100" : "opacity-0")} />
                      Todos Clientes
                    </CommandItem>
                    {clientsWithBudgets.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setClientFilter(client.name);
                          setIsClientFilterOpen(false);
                        }}
                        className="text-white hover:bg-[#3b82f6] cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-4 w-4", clientFilter === client.name ? "opacity-100" : "opacity-0")} />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="w-[1px] h-4 bg-[#2d3139] hidden md:block" />

            <div className="flex items-center gap-1.5 bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]">
              <Button 
                variant={dateFilterType === 'diario' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('diario')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'diario' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Diário
              </Button>
              <Button 
                variant={dateFilterType === 'mensal' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('mensal')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'mensal' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Mensal
              </Button>
              <Button 
                variant={dateFilterType === 'anual' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setDateFilterType('anual')}
                className={cn("h-6 text-[10px] uppercase font-bold px-2 rounded-md transition-all", dateFilterType === 'anual' ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-[#71717a] hover:text-white")}
              >
                Anual
              </Button>
            </div>

            {dateFilterType === 'diario' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139] hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Dia:</span>
                <Input 
                  type="date" 
                  className="h-7 bg-transparent border-none text-[12px] w-[115px] p-0 pr-1 focus-visible:ring-0 text-white min-w-[115px] cursor-pointer" 
                  value={dayFilter} 
                  onChange={e => setDayFilter(e.target.value)} 
                />
              </div>
            )}

            {dateFilterType === 'mensal' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139] hover:border-blue-500/50 transition-colors">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Mês:</span>
                <Input 
                  type="month" 
                  className="h-7 bg-transparent border-none text-[12px] w-[115px] p-0 pr-1 focus-visible:ring-0 text-white min-w-[115px] cursor-pointer" 
                  value={monthFilter} 
                  onChange={e => setMonthFilter(e.target.value)} 
                />
              </div>
            )}

            {dateFilterType === 'anual' && (
              <div className="flex items-center gap-1 bg-[#0f1115] px-2 py-0.5 rounded-lg border border-[#2d3139]">
                <span className="text-[10px] text-[#71717a] font-bold uppercase tracking-wider">Ano:</span>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-7 bg-transparent border-none text-[12px] w-[60px] p-0 focus:ring-0 text-white min-w-[60px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                    {availableYears.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="w-[1px] h-4 bg-[#2d3139] hidden md:block" />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 border-none bg-transparent text-[12px] p-0 focus:ring-0 gap-1 w-[100px] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                <SelectItem value="Todas">Status: Todos</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
              </SelectContent>
            </Select>

            {(dayFilter !== '' || monthFilter !== '' || yearFilter !== '' || statusFilter !== 'Todas' || clientFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-[#71717a] hover:text-[#ef4444] ml-1" 
                onClick={() => { 
                  setDayFilter(''); 
                  setMonthFilter(''); 
                  setYearFilter('');
                  setStatusFilter('Todas');
                  setClientFilter('all');
                }}
              >
                <X size={12} />
              </Button>
            )}

            <div className="w-[1px] h-4 bg-[#2d3139] mx-1" />

            <div className="flex bg-[#0f1115] p-1 rounded-lg border border-[#2d3139]/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "h-6 px-2 rounded-md transition-all",
                  viewMode === 'table' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
                )}
                title="Lista"
              >
                <List size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-6 px-2 rounded-md transition-all",
                  viewMode === 'grid' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
                )}
                title="Colunas"
              >
                <LayoutGrid size={14} />
              </Button>
            </div>
          </div>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setPrevItems(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                <Plus size={18} />
                Novo Orçamento
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px] shadow-2xl">
            <DialogHeader className="p-6 pb-2 flex-shrink-0">
              <DialogTitle className="text-white">Novo Orçamento</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Selecionar Cliente Existente (Opcional)</Label>
                  <Select value={newBudget.clientId || ''} onValueChange={(clientId) => {
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
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white tracking-widest uppercase text-[10px] font-black h-10">
                      <SelectValue placeholder="Escolha um cliente...">
                        {newBudget.clientId ? clients.find(c => c.id === newBudget.clientId)?.name : "Escolha um cliente..."}
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
                
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Forma de Pagamento</Label>
                    <div className="flex gap-1">
                      {['Dinheiro', 'Cartão', 'PIX'].map((method) => (
                        <Button
                          key={method}
                          type="button"
                          variant={newBudget.paymentMethod?.includes(method) || (method === 'Cartão' && newBudget.paymentMethod === 'Cartão com Juros') ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "flex-1 h-9 text-[10px] font-bold uppercase",
                            (newBudget.paymentMethod?.includes(method) || (method === 'Cartão' && newBudget.paymentMethod === 'Cartão com Juros')) ? "bg-[#3b82f6] text-white" : "border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]"
                          )}
                          onClick={() => {
                            setNewBudget({
                              ...newBudget, 
                              paymentMethod: method as any,
                              interestType: 'none',
                              selectedCardBrand: undefined,
                              selectedInstallmentPlanId: undefined,
                              installments: 1,
                              cashAcceptancePercent: method === 'Dinheiro' ? 50 : undefined,
                              cashDeliveryPercent: method === 'Dinheiro' ? 50 : undefined
                            });
                          }}
                        >
                          {method}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {newBudget.paymentMethod?.includes('Cartão') && (
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Tipo de Parcelamento</Label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant={newBudget.interestType === 'none' ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "flex-1 h-9 text-[10px] font-bold uppercase",
                            newBudget.interestType === 'none' ? "bg-[#3b82f6] text-white" : "border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]"
                          )}
                          onClick={() => setNewBudget({...newBudget, interestType: 'none', installments: 1, paymentMethod: 'Cartão'})}
                        >
                          Débito
                        </Button>
                        <Button
                          type="button"
                          variant={newBudget.interestType === 'with_interest' ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "flex-1 h-9 text-[10px] font-bold uppercase",
                            newBudget.interestType === 'with_interest' ? "bg-[#3b82f6] text-white" : "border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]"
                          )}
                          onClick={() => setNewBudget({...newBudget, interestType: 'with_interest', installments: 1, paymentMethod: 'Cartão com Juros'})}
                        >
                          Crédito
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {newBudget.paymentMethod?.includes('Cartão') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Bandeira do Cartão</Label>
                      <Select value={newBudget.selectedCardBrand} onValueChange={(val: any) => {
                        setNewBudget({
                          ...newBudget, 
                          selectedCardBrand: val,
                          selectedInstallmentPlanId: undefined,
                          installments: 1,
                          installmentValue: undefined
                        });
                      }}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          <SelectItem value="VISA">VISA</SelectItem>
                          <SelectItem value="MASTERCARD">MASTERCARD</SelectItem>
                          <SelectItem value="AMERICA">AMEX</SelectItem>
                          <SelectItem value="ELO">ELO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0]">Plano / Parcelas</Label>
                      <Select value={newBudget.selectedInstallmentPlanId} onValueChange={(val) => {
                        const plan = appSettings.installmentPlans?.find(p => p.id === val);
                        setNewBudget({
                          ...newBudget, 
                          selectedInstallmentPlanId: val, 
                          installments: plan?.installments || 1
                        });
                      }} disabled={!newBudget.selectedCardBrand}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                          <SelectValue placeholder="Selecione...">
                            {newBudget.selectedInstallmentPlanId ? (
                              (() => {
                                const plan = appSettings.installmentPlans?.find(p => p.id === newBudget.selectedInstallmentPlanId);
                                const { installmentValue } = getBudgetCalculations(newBudget, appSettings);
                                return plan ? `${plan.type} - ${plan.installments}x de R$ ${installmentValue.toFixed(2)}` : 'Selecione...';
                              })()
                            ) : 'Selecione...'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          {appSettings.installmentPlans?.filter(p => 
                            p.brand === newBudget.selectedCardBrand && 
                            (newBudget.interestType === 'none' ? p.type === 'DÉBITO' : p.type === 'CRÉDITO')
                          ).map(plan => {
                            const { baseTotal } = getBudgetCalculations(newBudget, appSettings);
                            const instVal = calculateInstallmentValue(baseTotal, plan.id);
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex justify-between items-center gap-4 w-full">
                            <span className="flex items-center gap-2"><span className="font-bold text-blue-400">{plan.brand}</span> {plan.installments}x ({plan.interestRate}% juros)</span>
                            <span className="font-bold text-emerald-500">R$ {instVal.toFixed(2)} / parc</span>
                          </div>
                        </SelectItem>
                          })}
                          {(!appSettings.installmentPlans || appSettings.installmentPlans.filter(p => 
                            p.brand === newBudget.selectedCardBrand && 
                            (newBudget.interestType === 'none' ? p.type === 'DÉBITO' : p.type === 'CRÉDITO')
                          ).length === 0) && (
                            <SelectItem value="none" disabled>Nenhum plano cadastrado</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                  {getBudgetCalculations(newBudget, appSettings).finalTotal > getBudgetCalculations(newBudget, appSettings).baseTotal && (
                    <div className="bg-[#3b82f6]/10 p-3 rounded-lg border border-[#3b82f6]/30">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-[#3b82f6] uppercase font-bold tracking-wider mb-1">Resumo das Parcelas</p>
                          <p className="text-sm text-white font-bold">{newBudget.installments}x de R$ {getBudgetCalculations(newBudget, appSettings).installmentValue.toFixed(2)}</p>
                          <p className="text-[10px] text-[#a0a0a0] mt-1">Total financiado: R$ {getBudgetCalculations(newBudget, appSettings).finalTotal.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-[#a0a0a0] uppercase font-bold">Bandeira</p>
                           <p className="text-sm text-white font-black italic">{newBudget.selectedCardBrand}</p>
                        </div>
                      </div>
                    </div>
                  )}


                {newBudget.paymentMethod === 'Dinheiro' && (
                  <div className="grid grid-cols-2 gap-4 bg-[#0f1115] p-3 rounded-lg border border-[#2d3139]">
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0] text-xs">Aceite da Proposta (%)</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={newBudget.cashAcceptancePercent || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            const pct = val === '' ? 0 : Number(val);
                            const calc = getBudgetCalculations(newBudget, appSettings);
                            const total = calc.baseTotal;
                            setNewBudget({
                              ...newBudget, 
                              cashAcceptancePercent: pct,
                              cashAcceptanceValue: (total * pct) / 100,
                              cashDeliveryPercent: 100 - pct,
                              cashDeliveryValue: (total * (100 - pct)) / 100
                            });
                          }} 
                          className="bg-[#1a1d23] border-[#2d3139] h-8 text-white"
                        />
                        <span className="text-[10px] text-zinc-500">R$ {((newBudget.cashAcceptanceValue || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#a0a0a0] text-xs">Entrega do Serviço (%)</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={newBudget.cashDeliveryPercent || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            const pct = val === '' ? 0 : Number(val);
                            const calc = getBudgetCalculations(newBudget, appSettings);
                            const total = calc.baseTotal;
                            setNewBudget({
                              ...newBudget, 
                              cashDeliveryPercent: pct,
                              cashDeliveryValue: (total * pct) / 100,
                              cashAcceptancePercent: 100 - pct,
                              cashAcceptanceValue: (total * (100 - pct)) / 100
                            });
                          }} 
                          className="bg-[#1a1d23] border-[#2d3139] h-8 text-white"
                        />
                        <span className="text-[10px] text-zinc-500">R$ {((newBudget.cashDeliveryValue || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {newBudget.paymentMethod === 'PIX' && (
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Conta PIX (Para exibir no orçamento)</Label>
                    <Select value={newBudget.pixAccountId} onValueChange={(val) => setNewBudget({...newBudget, pixAccountId: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white tracking-widest uppercase text-[10px] font-black h-10">
                        <SelectValue placeholder="Selecione a conta PIX">
                          {newBudget.pixAccountId ? pixSettings.accounts?.find(a => a.id === newBudget.pixAccountId)?.label : "Selecione a conta PIX"}
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

                <Separator className="bg-[#2d3139]" />
                
                <div className="bg-[#10b981]/5 p-4 rounded-lg border border-[#10b981]/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#10b981] font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]">
                      <Handshake size={16} /> Valor da Mão de Obra
                    </Label>
                    <span className="text-[10px] text-[#71717a] lowercase italic">Serviços e mão de obra</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#10b981] font-bold">R$</span>
                    <Input 
                      type="number" 
                      value={newBudget.serviceValue || ''} 
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        const tempBudget = {...newBudget, serviceValue: val};
                        const calc = getBudgetCalculations(tempBudget, appSettings);
                        
                        setNewBudget({
                          ...tempBudget,
                          cashAcceptanceValue: (calc.baseTotal * (newBudget.cashAcceptancePercent || 0)) / 100,
                          cashDeliveryValue: (calc.baseTotal * (newBudget.cashDeliveryPercent || 0)) / 100
                        });
                      }} 
                      className="bg-[#0f1115] border-[#2d3139] text-[#10b981] font-bold pl-9 h-11 text-lg placeholder:text-[#10b981]/20" 
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#a0a0a0]">Itens do Orçamento</Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => resetPricesToStock(false)} 
                        className="border-[#2d3139] text-blue-400 hover:bg-blue-500/10 gap-2 h-8 text-[10px] font-bold uppercase"
                        title="Restaurar preços originais do estoque"
                      >
                        <RefreshCw size={12} />
                        Sincronizar Estoque
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleAddItem} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white h-8 text-[10px] font-bold uppercase">Adicionar Item</Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[200px] pr-4 border border-[#2d3139] rounded-md p-2 bg-[#0f1115]">
                    {(newBudget.items || []).map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                        <div className="col-span-6 flex items-center gap-2">
                          <InventorySelector 
                            inventory={inventory} 
                            onSelect={(selected) => {
                            const items = [...(newBudget.items || [])];
                            items[idx] = { 
                              ...items[idx], 
                              description: selected.name,
                              price: selected.price || items[idx].price,
                              imageUrl: selected.imageUrl || items[idx].imageUrl
                            };
                            setNewBudget({...newBudget, items});
                          }} 
                          />
                          <div className="w-9 h-9 rounded bg-[#1a1d23] border border-[#2d3139] overflow-hidden flex items-center justify-center flex-shrink-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Package className="text-[#71717a]" size={14} />
                            )}
                          </div>
                          <Input placeholder="Descrição" value={item.description || ''} onChange={e => {
                            const items = [...(newBudget.items || [])];
                            items[idx] = { ...items[idx], description: e.target.value };
                            setNewBudget({...newBudget, items});
                          }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9 flex-1" />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" placeholder="Qtd" value={item.quantity || ''} onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            const items = [...(newBudget.items || [])];
                            items[idx] = { ...items[idx], quantity: val };
                            
                            // Recalculate cash distribution values
                            const tempBudget = {...newBudget, items};
                            const calc = getBudgetCalculations(tempBudget, appSettings);
                            const total = calc.baseTotal;
                            
                            setNewBudget({
                              ...tempBudget,
                              cashAcceptanceValue: (total * (newBudget.cashAcceptancePercent || 0)) / 100,
                              cashDeliveryValue: (total * (newBudget.cashDeliveryPercent || 0)) / 100
                            });
                          }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9" onFocus={(e) => e.target.select()} />
                        </div>
                        <div className="col-span-3">
                          <Input type="number" placeholder="Preço" value={item.price || ''} onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            const items = [...(newBudget.items || [])];
                            items[idx] = { ...items[idx], price: val };
                            
                            // Recalculate cash distribution values
                            const tempBudget = {...newBudget, items};
                            const calc = getBudgetCalculations(tempBudget, appSettings);
                            const total = calc.baseTotal;
                            
                            setNewBudget({
                              ...tempBudget,
                              cashAcceptanceValue: (total * (newBudget.cashAcceptancePercent || 0)) / 100,
                              cashDeliveryValue: (total * (newBudget.cashDeliveryPercent || 0)) / 100
                            });
                          }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9" onFocus={(e) => e.target.select()} />
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
                Total: R$ {getBudgetCalculations(newBudget, appSettings).finalTotal.toFixed(2)}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
                <Button onClick={handleSaveBudget} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Gerar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    {showList ? (
      viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
          {filteredBudgets.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl">
               Nenhum orçamento encontrado.
            </div>
          ) : (
            filteredBudgets.map((budget) => (
              <Card 
                key={budget.id} 
                className={cn(
                  "bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group cursor-pointer",
                  selectedRowId === budget.id && "border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                )}
                onClick={() => setSelectedRowId(budget.id)}
              >
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" size="icon" title="Editar" className="h-7 w-7 text-[#a0a0a0] hover:text-white bg-[#0f1115]/80 backdrop-blur-sm" onClick={(e) => {
                      e.stopPropagation();
                      onEditClick('budget', budget);
                    }}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" title="Gerar PDF" className="h-7 w-7 text-[#a0a0a0] hover:text-[#3b82f6] bg-[#0f1115]/80 backdrop-blur-sm shadow-md" onClick={(e) => {
                      e.stopPropagation();
                      generateBudgetPDF(budget);
                    }}>
                      <Share2 size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" title="Link de Assinatura" className="h-7 w-7 text-blue-400 hover:bg-blue-400/20 bg-[#0f1115]/80 backdrop-blur-sm shadow-md" onClick={(e) => {
                      e.stopPropagation();
                      onSignatureClick('budget', budget);
                    }}>
                      <ExternalLink size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" title="Excluir" className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/20 bg-[#0f1115]/80 backdrop-blur-sm shadow-md" onClick={(e) => {
                      e.stopPropagation();
                      setBudgetToDelete(budget);
                      setIsDeleteConfirmOpen(true);
                    }}>
                      <Trash2 size={12} />
                    </Button>
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#3b82f6] font-bold">{formatRecordNumber(budget.number, budget.createdAt)}</span>
                    <span className="text-[9px] text-[#71717a]">{format(budget.createdAt instanceof Timestamp ? budget.createdAt.toDate() : new Date(budget.createdAt), 'dd/MM/yyyy')}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm truncate pr-20" title={budget.clientName || 'Cliente Sem Nome'}>{budget.clientName || 'Cliente Sem Nome'}</h3>
                  
                  <div className="flex items-center justify-between mt-1">
                     <Select value={budget.status || ''} onValueChange={(val) => handleUpdateStatus(budget.id, val)}>
                        <SelectTrigger className={cn(
                          "h-5 text-[9px] uppercase border-[#2d3139] px-2 w-fit",
                          budget.status === 'Aprovado' ? "text-emerald-500 bg-emerald-500/10" : 
                          budget.status === 'Em Negociação' ? "text-yellow-500 bg-yellow-500/10" : 
                          budget.status === 'Rejeitado' ? "text-red-500 bg-red-500/10" : "text-blue-500 bg-blue-500/10"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                          <SelectItem value="Aprovado">Aprovado</SelectItem>
                          <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                        </SelectContent>
                      </Select>
                     <span className="text-xs text-white font-black italic">R$ {(budget.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2d3139]/50 mt-1 space-y-2">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-widest">Resumo dos itens</span>
                      <p className="text-[10px] text-[#a0a0a0] line-clamp-1 italic">
                        {budget.items?.[0]?.description || 'Sem descrição'} {(budget.items?.length || 0) > 1 ? `(+${budget.items!.length - 1} itens)` : ''}
                      </p>
                   </div>
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-widest">Pagamento</span>
                        <span className="text-[10px] text-white font-bold">{budget.paymentMethod}</span>
                      </div>
                      {budget.paymentMethod === 'PIX' && budget.pixAccountId && (
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-widest">Favorecido</span>
                           <span className="text-[10px] text-blue-400 font-bold truncate max-w-[80px]">
                              {pixSettings.accounts?.find(a => a.id === budget.pixAccountId)?.favored || 'PIX'}
                           </span>
                        </div>
                      )}
                   </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-auto max-h-[600px] relative focus:outline-none focus:ring-1 focus:ring-blue-500/50" tabIndex={0}>
          <TableDoubleScroll>
          <Table>
            <TableHeader className="bg-[#1a1d23] sticky top-0 z-10 shadow-sm border-b border-[#2d3139]">
              <TableRow className="border-[#2d3139] hover:bg-transparent">
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[120px]">Ações</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[150px]">Status</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider w-[100px]">Orç / Data</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider">Cliente / Descrição</TableHead>
                <TableHead className="text-[#71717a] font-semibold uppercase text-[11px] tracking-wider text-right w-[120px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBudgets.map(budget => (
                <TableRow 
                  key={budget.id}
                  className={cn(
                    "border-[#2d3139] transition-all h-[70px] cursor-pointer hover:bg-[#25282e]/30"
                  )}
                >
                  <TableCell className="w-[120px] p-2">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <Button variant="outline" size="icon" title="Editar" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={() => onEditClick('budget', budget)}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Gerar PDF" className="h-7 w-7 border-[#2d3139] text-[#a0a0a0] hover:text-white" onClick={() => generateBudgetPDF(budget)}>
                        <Share2 size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Link de Assinatura" className="h-7 w-7 border-[#2d3139] text-blue-400 hover:bg-blue-400/10" onClick={() => onSignatureClick('budget', budget)}>
                        <ExternalLink size={12} />
                      </Button>
                      <Button variant="outline" size="icon" title="Excluir" className="h-7 w-7 border-[#2d3139] text-[#ef4444] hover:bg-[#ef4444]/10" onClick={() => {
                        setBudgetToDelete(budget);
                        setIsDeleteConfirmOpen(true);
                      }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="w-[150px]">
                    <div className="flex flex-col gap-1">
                      <Select value={budget.status || ''} onValueChange={(val) => handleUpdateStatus(budget.id, val)}>
                        <SelectTrigger className={cn(
                          "h-8 bg-[#0f1115] border-[#2d3139] text-[10px] uppercase font-bold",
                          budget.status === 'Aprovado' ? "text-emerald-500" : 
                          budget.status === 'Em Negociação' ? "text-yellow-500" : 
                          budget.status === 'Rejeitado' ? "text-red-500" : "text-blue-500"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em Negociação">Em Negociação</SelectItem>
                          <SelectItem value="Aprovado">Aprovado</SelectItem>
                          <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[#71717a] uppercase font-bold">{budget.paymentMethod}</span>
                        {budget.paymentMethod === 'PIX' && budget.pixAccountId && (
                          <span className="text-[9px] text-blue-400 font-mono truncate max-w-[120px]">
                            {pixSettings.accounts?.find(a => a.id === budget.pixAccountId)?.favored || 'PIX'}
                          </span>
                        )}
                        {budget.paymentMethod === 'Cartão com Juros' && budget.installmentValue && (
                          <span className="text-[9px] text-emerald-500 font-bold">
                            {budget.installments}x de R$ {budget.installmentValue.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-mono text-[#3b82f6] font-bold">{formatRecordNumber(budget.number, budget.createdAt)}</span>
                      <span className="text-[10px] text-[#71717a]">{format(budget.createdAt instanceof Timestamp ? budget.createdAt.toDate() : new Date(budget.createdAt), 'dd/MM/yy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-[12px] truncate max-w-[150px]">{budget.clientName || 'Cliente Sem Nome'}</span>
                      <span className="text-[10px] text-[#71717a] truncate max-w-[200px] italic mt-0.5">
                        {budget.items?.[0]?.description || 'Sem descrição'} {(budget.items?.length || 0) > 1 ? `(+${budget.items!.length - 1} itens)` : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right w-[120px]">
                    <span className="font-bold text-white text-[13px]">R$ {(budget.total || 0).toFixed(2)}</span>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBudgets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-[#71717a] text-sm">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TableDoubleScroll>
        </Card>
    )) : (
      <NoAccessList title="Orçamentos" />
    )}

      {/* Edit Budget Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setPrevEditItems(null);
        }
      }}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px] shadow-2xl">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle>Editar Orçamento #{editingBudget.number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Forma de Pagamento</Label>
                  <div className="flex gap-1">
                    {['Dinheiro', 'Cartão', 'PIX'].map((method) => (
                      <Button
                        key={method}
                        type="button"
                        variant={editingBudget.paymentMethod?.includes(method) || (method === 'Cartão' && editingBudget.paymentMethod === 'Cartão com Juros') ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex-1 h-9 text-[10px] font-bold uppercase",
                          (editingBudget.paymentMethod?.includes(method) || (method === 'Cartão' && editingBudget.paymentMethod === 'Cartão com Juros')) ? "bg-[#3b82f6] text-white" : "border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]"
                        )}
                        onClick={() => {
                          setEditingBudget({
                            ...editingBudget, 
                            paymentMethod: method as any,
                            interestType: 'none',
                            selectedCardBrand: undefined,
                            selectedInstallmentPlanId: undefined,
                            installments: 1,
                            cashAcceptancePercent: method === 'Dinheiro' ? 50 : undefined,
                            cashDeliveryPercent: method === 'Dinheiro' ? 50 : undefined
                          });
                        }}
                      >
                        {method}
                      </Button>
                    ))}
                  </div>
                </div>
                {editingBudget.paymentMethod?.includes('Cartão') && (
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Tipo de Parcelamento</Label>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={editingBudget.interestType === 'none' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex-1 h-9 text-[10px] font-bold uppercase",
                          editingBudget.interestType === 'none' ? "bg-[#3b82f6] text-white" : "border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]"
                        )}
                        onClick={() => setEditingBudget({...editingBudget, interestType: 'none', installments: 1, paymentMethod: 'Cartão'})}
                      >
                        Débito
                      </Button>
                      <Button
                        type="button"
                        variant={editingBudget.interestType === 'with_interest' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex-1 h-9 text-[10px] font-bold uppercase",
                          editingBudget.interestType === 'with_interest' ? "bg-[#3b82f6] text-white" : "border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139]"
                        )}
                        onClick={() => setEditingBudget({...editingBudget, interestType: 'with_interest', installments: 1, paymentMethod: 'Cartão com Juros'})}
                      >
                        Crédito
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {editingBudget.paymentMethod?.includes('Cartão') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Bandeira do Cartão</Label>
                    <Select value={editingBudget.selectedCardBrand || ''} onValueChange={(val: any) => {
                      setEditingBudget({
                        ...editingBudget, 
                        selectedCardBrand: val,
                        selectedInstallmentPlanId: undefined,
                        installments: 1,
                        installmentValue: undefined
                      });
                    }}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="VISA">VISA</SelectItem>
                        <SelectItem value="MASTERCARD">MASTERCARD</SelectItem>
                        <SelectItem value="AMERICA">AMEX</SelectItem>
                        <SelectItem value="ELO">ELO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Plano / Parcelas</Label>
                    <Select value={editingBudget.selectedInstallmentPlanId || ''} onValueChange={(val) => {
                      const plan = appSettings.installmentPlans?.find(p => p.id === val);
                      const total = (editingBudget.items || []).reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);
                      const instVal = calculateInstallmentValue(total, val);
                      setEditingBudget({
                        ...editingBudget, 
                        selectedInstallmentPlanId: val, 
                        installments: plan?.installments || 1,
                        installmentValue: instVal
                      });
                    }} disabled={!editingBudget.selectedCardBrand}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione o plano...">
                          {editingBudget.selectedInstallmentPlanId ? (
                            (() => {
                              const plan = appSettings.installmentPlans?.find(p => p.id === editingBudget.selectedInstallmentPlanId);
                              const { installmentValue } = getBudgetCalculations(editingBudget, appSettings);
                              return plan ? `${plan.brand} - ${plan.type} - ${plan.installments}x de R$ ${installmentValue.toFixed(2)}` : 'Selecione...';
                            })()
                          ) : 'Selecione...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {appSettings.installmentPlans?.filter(p => 
                          p.brand === editingBudget.selectedCardBrand && 
                          (editingBudget.interestType === 'none' ? p.type === 'DÉBITO' : p.type === 'CRÉDITO')
                        ).map(plan => {
                           const { baseTotal } = getBudgetCalculations(editingBudget, appSettings);
                           const instVal = calculateInstallmentValue(baseTotal, plan.id);
                           return (
                             <SelectItem key={plan.id} value={plan.id}>
                               <div className="flex justify-between items-center gap-4 w-full">
                                 <span>{plan.installments}x ({plan.interestRate}% juros)</span>
                                 <span className="font-bold text-blue-400">R$ {instVal.toFixed(2)} / parc</span>
                               </div>
                             </SelectItem>
                           );
                        })}
                        {(!appSettings.installmentPlans || appSettings.installmentPlans.filter(p => 
                          p.brand === editingBudget.selectedCardBrand && 
                          (editingBudget.interestType === 'none' ? p.type === 'DÉBITO' : p.type === 'CRÉDITO')
                        ).length === 0) && (
                          <SelectItem value="none" disabled>Nenhum plano cadastrado</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {getBudgetCalculations(editingBudget, appSettings).finalTotal > getBudgetCalculations(editingBudget, appSettings).baseTotal && (
                <div className="bg-[#3b82f6]/10 p-3 rounded-lg border border-[#3b82f6]/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-[#3b82f6] uppercase font-bold tracking-wider mb-1">Resumo das Parcelas</p>
                      <p className="text-sm text-white font-bold">{editingBudget.installments}x de R$ {getBudgetCalculations(editingBudget, appSettings).installmentValue.toFixed(2)}</p>
                      <p className="text-[10px] text-[#a0a0a0] mt-1">Total financiado: R$ {getBudgetCalculations(editingBudget, appSettings).finalTotal.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-[#a0a0a0] uppercase font-bold">Bandeira</p>
                       <p className="text-sm text-white font-black italic">{editingBudget.selectedCardBrand}</p>
                    </div>
                  </div>
                </div>
              )}


              {editingBudget.paymentMethod === 'Dinheiro' && (
                <div className="grid grid-cols-2 gap-4 bg-[#0f1115] p-3 rounded-lg border border-[#2d3139]">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0] text-xs">Aceite da Proposta (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        value={editingBudget.cashAcceptancePercent || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          const pct = val === '' ? 0 : Number(val);
                          const calc = getBudgetCalculations(editingBudget, appSettings);
                          const total = calc.baseTotal;
                          setEditingBudget({
                            ...editingBudget, 
                            cashAcceptancePercent: pct,
                            cashAcceptanceValue: (total * pct) / 100,
                            cashDeliveryPercent: 100 - pct,
                            cashDeliveryValue: (total * (100 - pct)) / 100
                          });
                        }} 
                        className="bg-[#1a1d23] border-[#2d3139] h-8 text-white"
                      />
                      <span className="text-[10px] text-zinc-500">R$ {((editingBudget.cashAcceptanceValue || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0] text-xs">Entrega do Serviço (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        value={editingBudget.cashDeliveryPercent || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          const pct = val === '' ? 0 : Number(val);
                          const calc = getBudgetCalculations(editingBudget, appSettings);
                          const total = calc.baseTotal;
                          setEditingBudget({
                            ...editingBudget, 
                            cashDeliveryPercent: pct,
                            cashDeliveryValue: (total * pct) / 100,
                            cashAcceptancePercent: 100 - pct,
                            cashAcceptanceValue: (total * (100 - pct)) / 100
                          });
                        }} 
                        className="bg-[#1a1d23] border-[#2d3139] h-8 text-white"
                      />
                      <span className="text-[10px] text-zinc-500">R$ {((editingBudget.cashDeliveryValue || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {editingBudget.paymentMethod === 'PIX' && (
                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Conta PIX (Para exibir no orçamento)</Label>
                  <Select value={editingBudget.pixAccountId || ''} onValueChange={(val) => setEditingBudget({...editingBudget, pixAccountId: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue placeholder="Selecione a conta PIX">
                        {editingBudget.pixAccountId ? (
                          pixSettings.accounts?.find(a => a.id === editingBudget.pixAccountId) 
                            ? `${pixSettings.accounts.find(a => a.id === editingBudget.pixAccountId)?.bank} - ${pixSettings.accounts.find(a => a.id === editingBudget.pixAccountId)?.favored}`
                            : 'Conta não encontrada'
                        ) : 'Selecione a conta PIX'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      {pixSettings.accounts?.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.favored} ({acc.bank})</SelectItem>
                      ))}
                      {(!pixSettings.accounts || pixSettings.accounts.length === 0) && (
                        <SelectItem value="none" disabled>Nenhuma conta cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="bg-[#10b981]/5 p-4 rounded-lg border border-[#10b981]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[#10b981] font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]">
                    <Handshake size={16} /> Valor da Mão de Obra
                  </Label>
                  <span className="text-[10px] text-[#71717a] lowercase italic">Serviços e mão de obra</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#10b981] font-bold">R$</span>
                  <Input 
                    type="number" 
                    value={editingBudget.serviceValue || ''} 
                    onChange={e => setEditingBudget({...editingBudget, serviceValue: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    className="bg-[#0f1115] border-[#2d3139] text-[#10b981] font-bold pl-9 h-11 text-lg placeholder:text-[#10b981]/20" 
                    placeholder="0.00"
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[#a0a0a0]">Itens do Orçamento</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => resetPricesToStock(true)} 
                      className="border-[#2d3139] text-blue-400 hover:bg-blue-500/10 gap-2 h-8 text-[10px] font-bold uppercase"
                      title="Restaurar preços originais do estoque"
                    >
                      <RefreshCw size={12} />
                      Sincronizar Estoque
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const newItem = { description: '', quantity: 1, price: 0, imageUrl: '' };
                      const items = [...(editingBudget.items || []), newItem];
                      const tempBudget = {...editingBudget, items};
                      const calc = getBudgetCalculations(tempBudget, appSettings);
                      const total = calc.baseTotal;
                      
                      setEditingBudget({
                        ...tempBudget,
                        cashAcceptanceValue: (total * (editingBudget.cashAcceptancePercent || 0)) / 100,
                        cashDeliveryValue: (total * (editingBudget.cashDeliveryPercent || 0)) / 100
                      });
                    }} className="border-[#2d3139] h-8 text-[10px] font-bold uppercase">Adicionar Item</Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {(editingBudget.items || []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                      <div className="col-span-6 flex items-center gap-2">
                        <InventorySelector 
                          inventory={inventory} 
                          onSelect={(selected) => {
                            const items = [...(editingBudget.items || [])];
                            items[idx] = { 
                              ...items[idx], 
                              description: selected.name,
                              price: selected.price || items[idx].price,
                              imageUrl: selected.imageUrl || items[idx].imageUrl
                            };
                            
                            const tempBudget = {...editingBudget, items};
                            const calc = getBudgetCalculations(tempBudget, appSettings);
                            const total = calc.baseTotal;
                            
                            setEditingBudget({
                              ...tempBudget,
                              cashAcceptanceValue: (total * (editingBudget.cashAcceptancePercent || 0)) / 100,
                              cashDeliveryValue: (total * (editingBudget.cashDeliveryPercent || 0)) / 100
                            });
                          }} 
                        />
                        <div className="w-9 h-9 rounded bg-[#1a1d23] border border-[#2d3139] overflow-hidden flex items-center justify-center flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package className="text-[#71717a]" size={14} />
                          )}
                        </div>
                        <Input placeholder="Descrição" value={item.description} onChange={e => {
                          const items = [...(editingBudget.items || [])];
                          items[idx] = { ...items[idx], description: e.target.value };
                          setEditingBudget({...editingBudget, items});
                        }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9 flex-1" />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" placeholder="Qtd" value={item.quantity || ''} onChange={e => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          const items = [...(editingBudget.items || [])];
                          items[idx] = { ...items[idx], quantity: val };
                          
                          // Recalculate cash distribution values
                          const tempBudget = {...editingBudget, items};
                          const calc = getBudgetCalculations(tempBudget, appSettings);
                          const total = calc.baseTotal;
                          
                          setEditingBudget({
                            ...tempBudget,
                            cashAcceptanceValue: (total * (editingBudget.cashAcceptancePercent || 0)) / 100,
                            cashDeliveryValue: (total * (editingBudget.cashDeliveryPercent || 0)) / 100
                          });
                        }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9" onFocus={(e) => e.target.select()} />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" placeholder="Preço" value={item.price || ''} onChange={e => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          const items = [...(editingBudget.items || [])];
                          items[idx] = { ...items[idx], price: val };
                          
                          // Recalculate cash distribution values
                          const tempBudget = {...editingBudget, items};
                          const calc = getBudgetCalculations(tempBudget, appSettings);
                          const total = calc.baseTotal;

                          setEditingBudget({
                            ...tempBudget,
                            cashAcceptanceValue: (total * (editingBudget.cashAcceptancePercent || 0)) / 100,
                            cashDeliveryValue: (total * (editingBudget.cashDeliveryPercent || 0)) / 100
                          });
                        }} className="bg-[#1a1d23] border-[#2d3139] text-white h-9" onFocus={(e) => e.target.select()} />
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="icon" className="text-[#ef4444] hover:bg-[#ef4444]/10 h-9" onClick={() => {
                          const items = (editingBudget.items || []).filter((_, i) => i !== idx);
                          setEditingBudget({...editingBudget, items});
                        }}>
                          <Trash2 size={14} />
                        </Button>
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
              Total: R$ {getBudgetCalculations(editingBudget, appSettings).finalTotal.toFixed(2)}
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

// --- Inventory Manager Component ---

// --- PDV (POS) Manager Component ---

function PDVManager({
  inventory = [],
  clients = [],
  updateStock,
  companyId,
  logAction,
  pixSettings,
  appSettings,
  user,
  cart,
  setCart,
  discount,
  setDiscount,
  selectedClient,
  setSelectedClient,
  paymentMethod,
  setPaymentMethod,
  linkedOS,
  setLinkedOS,
  cardDetails,
  setCardDetails,
  selectedPixAccountId,
  setSelectedPixAccountId,
  sales = [],
  currentUserData,
  isSuperAdmin,
  canManageSales = false
}: {
  inventory: any[],
  clients: Client[],
  updateStock: (parts: any[], type: 'exit' | 'entry', refId: string, refType: 'os' | 'visit') => Promise<void>,
  companyId: string,
  logAction?: any,
  pixSettings: PixSettings,
  appSettings: AppSettings,
  user: any,
  cart: any[],
  setCart: React.Dispatch<React.SetStateAction<any[]>>,
  discount: number,
  setDiscount: React.Dispatch<React.SetStateAction<number>>,
  selectedClient: string,
  setSelectedClient: React.Dispatch<React.SetStateAction<string>>,
  paymentMethod: 'Dinheiro' | 'Cartão' | 'PIX',
  setPaymentMethod: React.Dispatch<React.SetStateAction<'Dinheiro' | 'Cartão' | 'PIX'>>,
  linkedOS: any,
  setLinkedOS: React.Dispatch<React.SetStateAction<any>>,
  cardDetails: any,
  setCardDetails: React.Dispatch<React.SetStateAction<any>>,
  selectedPixAccountId: string,
  setSelectedPixAccountId: React.Dispatch<React.SetStateAction<string>>,
  sales?: any[],
  currentUserData: any,
  isSuperAdmin: boolean,
  canManageSales?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [saleDateFilter, setSaleDateFilter] = useState('');
  const [editingSale, setEditingSale] = useState<any>(null);
  const [isDeleteSaleConfirmOpen, setIsDeleteSaleConfirmOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);

  // Local states for dialogs to prevent premature updates on main view
  const [localCardDetails, setLocalCardDetails] = useState<any>(null);
  const [localPixAccountId, setLocalPixAccountId] = useState(selectedPixAccountId);

  useEffect(() => {
    if (isCardDialogOpen) {
      setLocalCardDetails({ ...cardDetails });
    }
  }, [isCardDialogOpen]);

  useEffect(() => {
    if (isPixDialogOpen) {
      setLocalPixAccountId(selectedPixAccountId);
    }
  }, [isPixDialogOpen]);


  const findInterestRate = (brand: string, type: string, installments: number) => {
    if (!appSettings.installmentPlans || !brand) return 0;
    
    // Normalize search terms: Uppercase, trim, and handle AMEX alias
    let searchBrand = brand.trim().toUpperCase();
    if (searchBrand === 'AMEX') searchBrand = 'AMERICA';
    
    // Normalize type: Uppercase and trim
    let searchType = type.trim().toUpperCase();
    
    const plan = appSettings.installmentPlans.find(p => {
      const pBrand = (p.brand || '').trim().toUpperCase();
      const pType = (p.type || '').trim().toUpperCase();
      
      return pBrand === searchBrand && 
             pType === searchType && 
             Number(p.installments) === Number(installments);
    });
    
    return plan ? plan.interestRate : 0;
  };

  const subtotal = cart.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
  const discountAmount = (subtotal * discount) / 100;
  const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
  // Total is always calculated based on current cardDetails state
  const interestAmount = (totalAfterDiscount * (cardDetails.interestPercent || 0)) / 100;
  const total = totalAfterDiscount + interestAmount;
  const displayTotal = total;

  // Local card total for preview in dialog
  const localInterestAmount = localCardDetails ? (totalAfterDiscount * (localCardDetails.interestPercent || 0)) / 100 : 0;
  const localTotal = totalAfterDiscount + localInterestAmount;

  const handleNewSale = () => {
    setCart([]);
    setDiscount(0);
    setLinkedOS('');
    setSelectedClient('Avulso');
    setPaymentMethod('Dinheiro');
    setCardDetails({ brand: '', type: 'crédito', installments: 1, interestPercent: 0, useInterest: false });
    toast.info("Nova venda iniciada!");
  };

  const handleOpenClientSearch = () => setIsClientSearchOpen(true);
  const handleOpenProductSearch = () => setIsProductSearchOpen(true);
  const handleOpenDiscount = () => setIsDiscountDialogOpen(true);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleNewSale();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        handleOpenClientSearch();
      }
      if (e.key === 'F3') {
        e.preventDefault();
        handleOpenProductSearch();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        // Focus linked OS or open search
      }
      if (e.key === 'F6') {
        e.preventDefault();
        handleOpenDiscount();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0) {
          handleFinishSale();
        }
      }
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (canManageSales) setIsHistoryOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMethod, canManageSales, discount, cardDetails, selectedClient, selectedPixAccountId]);

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      if (existing.quantity >= item.quantity) {
        toast.error("Quantidade insuficiente no estoque.");
        return;
      }
      setCart(cart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item, quantity: 1, price: item.price || 0 }]);
    }
    setIsProductSearchOpen(false);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.item.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    const itemInCart = cart.find(c => c.item.id === id);
    if (!itemInCart) return;
    if (qty > itemInCart.item.quantity) {
      toast.error("Quantidade excede o estoque disponível.");
      return;
    }
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(cart.map(c => c.item.id === id ? { ...c, quantity: qty } : c));
  };

  const handleFinishSale = async () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio!");
      return;
    }

    setIsFinishing(true);
    try {
      // Generate Sale Number matching format PDV-00001/26
      const formattedNumber = getNextFormattedNumber(sales, 'PDV-');
      const currentYear = format(new Date(), 'yy');

      const saleId = doc(collection(db, 'companies', companyId, 'sales')).id;
      const saleData = {
        number: formattedNumber,
        items: cart.map(c => ({ 
          itemId: c.item.id, 
          name: c.item.name, 
          quantity: c.quantity, 
          price: c.price 
        })),
        subtotal,
        discount,
        total,
        paymentMethod,
        paymentDetails: paymentMethod === 'Cartão' ? cardDetails : (paymentMethod === 'PIX' ? { pixAccountId: selectedPixAccountId } : null),
        clientName: selectedClient,
        companyId,
        linkedOS,
        vendorName: user?.displayName || user?.email || 'Vendedor',
        vendorEmail: user?.email || '',
        installments: paymentMethod === 'Cartão' ? (cardDetails?.installments || 1) : 1,
        createdAt: Timestamp.now()
      };

      await setDoc(doc(db, 'companies', companyId, 'sales', saleId), saleData);
      
      // Financial Integration
      const pixAccount = pixSettings.accounts?.find(a => a.id === selectedPixAccountId);
      const accInfo = paymentMethod === 'PIX' ? (pixAccount ? `${pixAccount.label} (${pixAccount.bank})` : 'PIX') : (paymentMethod === 'Cartão' ? 'Máquina de Cartão' : 'Espécie');

      await addDoc(collection(db, 'companies', companyId, 'financial'), {
        companyId,
        type: 'Receita', // Corrected type
        description: `${formattedNumber} - ${selectedClient}`,
        origin: formattedNumber,
        value: total,
        category: 'Vendas',
        paymentMethod,
        account: accInfo,
        pixAccountId: paymentMethod === 'PIX' ? selectedPixAccountId : null,
        date: Timestamp.now(),
        status: 'paid',
        createdAt: Timestamp.now(),
        createdByEmail: user?.email,
        details: `Venda PDV nº ${formattedNumber} para ${selectedClient}`
      });

      const stockParts = cart.map(c => ({ description: c.item.name, quantity: c.quantity }));
      await updateStock(stockParts, 'exit', saleId, 'os');

      if (logAction) {
        logAction('create', 'sale', `Venda PDV nº ${formattedNumber} - Total: R$ ${total.toFixed(2)}`, saleId);
      }

      setLastSale(saleData);
      setCart([]);
      setDiscount(0);
      setLinkedOS('');
      toast.success("Venda finalizada com sucesso!");
      setIsReceiptOpen(true);
    } catch (err) {
      toast.error("Erro ao registrar venda.");
    } finally {
      setIsFinishing(false);
    }
  };

  // PDV Receipt PDF Generation (Thermal 80mm format)
  const generatePDVReceiptPDF = async (saleData: any) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 250] // Increased height to accommodate QR code
    });
    
    const margin = 5;
    const pageWidth = 80;
    let currentY = 10;

    doc.setFont('Courier', 'bold');
    doc.setFontSize(10);
    doc.text(appSettings.companyName || 'LOJA PDV', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont('Courier', 'normal');
    doc.setFontSize(8);
    doc.text(`VENDEDOR: ${saleData.vendorName || 'SISTEMA'}`, margin, currentY);
    currentY += 4;
    doc.text(`DATA: ${saleData.createdAt?.toDate ? format(saleData.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}`, margin, currentY);
    currentY += 4;
    doc.text(`CLIENTE: ${saleData.clientName || 'CONSUMIDOR'}`, margin, currentY);
    currentY += 6;

    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 4;

    doc.setFont('Courier', 'bold');
    doc.text('DESC', margin, currentY);
    doc.text('QT', 45, currentY, { align: 'center' });
    doc.text('VL', pageWidth - margin, currentY, { align: 'right' });
    currentY += 4;

    doc.setFont('Courier', 'normal');
    saleData.items.forEach((item: any) => {
      const name = item.name.length > 20 ? item.name.substring(0, 18) + '..' : item.name;
      doc.text(name, margin, currentY);
      doc.text(String(item.quantity), 45, currentY, { align: 'center' });
      doc.text(item.price.toFixed(2), pageWidth - margin, currentY, { align: 'right' });
      currentY += 4;

      if (currentY > 230) {
        doc.addPage([80, 250]);
        currentY = 10;
      }
    });

    currentY += 2;
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    doc.text(`SUBTOTAL:`, margin, currentY);
    doc.text(`R$ ${saleData.subtotal.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 4;

    const discAmt = (saleData.subtotal * (saleData.discount || 0)) / 100;
    doc.text(`DESCONTO (${saleData.discount}%):`, margin, currentY);
    doc.text(`R$ ${discAmt.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    doc.setFont('Courier', 'bold');
    doc.setFontSize(10);
    doc.text(`TOTAL:`, margin, currentY);
    doc.text(`R$ ${saleData.total.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;

    doc.setFont('Courier', 'normal');
    doc.setFontSize(8);
    
    let paymentText = `FORMA: ${saleData.paymentMethod}`;
    if (saleData.paymentMethod === 'Cartão' || saleData.paymentMethod === 'Cartão com Juros') {
      if (saleData.installments > 1) {
        const valParc = saleData.total / saleData.installments;
        paymentText += ` ${saleData.installments}x de R$ ${valParc.toFixed(2)}`;
      }
      doc.text(paymentText, margin, currentY);
      currentY += 8;
    } else if (saleData.paymentMethod === 'PIX') {
      const pixAccId = saleData.paymentDetails?.pixAccountId;
      const pixAcc = (pixSettings?.accounts || []).find(a => a.id === pixAccId) || (pixSettings?.accounts?.[0]);
      if (pixAcc) {
        // QR Code for PIX on the left, text on the right
        try {
          const qrSize = 30;
          const qrDataUrl = await QRCode.toDataURL(pixAcc.qrKey || pixAcc.key || '', { margin: 1, width: 200 });
          doc.addImage(qrDataUrl, 'PNG', margin, currentY, qrSize, qrSize);
          
          doc.setFontSize(7);
          const textX = margin + qrSize + 2;
          doc.text(paymentText, textX, currentY + 5);
          doc.setFontSize(6);
          doc.text(`BANCO: ${pixAcc.bank}`, textX, currentY + 9);
          doc.text(`CHAVE: ${pixAcc.key}`, textX, currentY + 13);
          
          currentY += Math.max(qrSize, 18) + 2;
        } catch (e) {
          console.error("Error generating matching QR Code", e);
          doc.text(paymentText, margin, currentY);
          currentY += 4;
        }
        
        doc.setFontSize(8);
      } else {
        doc.text(paymentText, margin, currentY);
        currentY += 4;
      }
    } else {
      doc.text(paymentText, margin, currentY);
      currentY += 4;
    }
    
    if (saleData.paymentMethod !== 'PIX' && saleData.paymentMethod !== 'Cartão' && saleData.paymentMethod !== 'Cartão com Juros') {
      doc.text(paymentText, margin, currentY);
      currentY += 8;
    } else {
      currentY += 4;
    }

    doc.setFontSize(7);
    doc.text('OBRIGADO PELA PREFERÊNCIA!', pageWidth / 2, currentY, { align: 'center' });

    doc.save(`cupom_${saleData.number || Date.now()}.pdf`);
  };

  const printReceipt = async () => {
    if (!lastSale) return;
    await generatePDVReceiptPDF(lastSale);
  };

  const filteredSales = (sales || []).filter(s => {
    const term = saleSearchTerm.toLowerCase();
    const dateStr = s.createdAt?.toDate ? format(s.createdAt.toDate(), 'dd/MM/yyyy') : '';
    
    const textMatch = s.number?.toLowerCase().includes(term) ||
      s.clientName?.toLowerCase().includes(term) ||
      s.vendorName?.toLowerCase().includes(term) ||
      dateStr.includes(term);

    const dateMatch = saleDateFilter ? (s.createdAt?.toDate ? format(s.createdAt.toDate(), 'yyyy-MM-dd') === saleDateFilter : false) : true;

    return textMatch && dateMatch;
  });

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'sales', saleToDelete.id));
      const stockParts = saleToDelete.items.map((i: any) => ({ description: i.name, quantity: i.quantity }));
      await updateStock(stockParts, 'entry', saleToDelete.id, 'os');
      
      const financialRef = collection(db, 'companies', companyId, 'financial');
      const qFin = query(financialRef, where('origin', '==', saleToDelete.number));
      const finSnap = await getDocs(qFin);
      for (const finDoc of finSnap.docs) {
        await deleteDoc(doc(db, 'companies', companyId, 'financial', finDoc.id));
      }

      if (logAction) {
        logAction('delete', 'sale', `Excluiu venda nº ${saleToDelete.number}`, saleToDelete.id);
      }
      toast.success("Venda excluída com sucesso!");
      setIsDeleteSaleConfirmOpen(false);
      setSaleToDelete(null);
    } catch (err) {
      toast.error("Erro ao excluir venda.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1115] overflow-y-auto bento-scrollbar">
      <div className="p-2 md:p-4 flex flex-col gap-2 md:gap-3 min-h-fit">
      {/* Header Hotkeys Barra Superior */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 p-2 px-4 rounded-xl bg-[#1a1d23] border border-[#2d3139] shadow-lg">
        <div className="flex-1 flex flex-wrap items-center gap-2 md:gap-5 text-[10px] font-black uppercase tracking-tighter text-[#71717a]">
            <button onClick={handleNewSale} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <Badge variant="outline" className="bg-[#1a1d23] border-[#2d3139] text-blue-500 px-1 py-0 h-5 cursor-pointer">F1</Badge> NOVA
            </button>
            <button onClick={handleOpenClientSearch} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <Badge variant="outline" className="bg-[#1a1d23] border-[#2d3139] text-blue-500 px-1 py-0 h-5 cursor-pointer">F2</Badge> CLIENTE
            </button>
            <button onClick={handleOpenProductSearch} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <Badge variant="outline" className="bg-[#1a1d23] border-[#2d3139] text-blue-500 px-1 py-0 h-5 cursor-pointer">F3</Badge> PRODUTO
            </button>
            <button className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <Badge variant="outline" className="bg-[#1a1d23] border-[#2d3139] text-blue-500 px-1 py-0 h-5 cursor-pointer">F4</Badge> OS/SERV
            </button>
            <button onClick={handleOpenDiscount} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <Badge variant="outline" className="bg-[#1a1d23] border-[#2d3139] text-blue-500 px-1 py-0 h-5 cursor-pointer">F6</Badge> DESC
            </button>
            <button onClick={() => { if (cart.length > 0) handleFinishSale(); }} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
              <Badge variant="outline" className="bg-[#1a1d23] border-[#2d3139] text-emerald-500 px-1 py-0 h-5 cursor-pointer">F10</Badge> FINALIZAR
            </button>
            {canManageSales && (
              <button 
                onClick={() => setIsHistoryOpen(true)}
                className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                title="Histórico de Vendas"
              >
                <Badge variant="outline" className="bg-[#1a1d23] border-[#2d3139] text-amber-500 px-1 py-0 h-5 cursor-pointer">ALT+H</Badge> HISTÓRICO
              </button>
            )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 ml-2">
           <span className="hidden lg:inline text-[9px] uppercase font-black text-[#71717a] tracking-widest">Status:</span>
           <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black italic px-2 h-5">ABERTO</Badge>
        </div>
      </div>

      {/* Header Identificação */}
      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-4 gap-2 p-2 rounded-xl bg-[#1a1d23] border border-[#2d3139] shadow-md">
        <div className="space-y-0.5">
          <Label className="text-[8px] uppercase font-black text-[#71717a] tracking-widest">Vendedor / Técnico</Label>
          <div className="flex items-center gap-2 text-white font-bold text-xs bg-[#0f1115] p-1.5 rounded border border-[#2d3139]">
            <User size={12} className="text-blue-500" />
            {user?.displayName || user?.email || 'Sistema'}
          </div>
        </div>
        <div className="space-y-0.5">
          <Label className="text-[8px] uppercase font-black text-[#71717a] tracking-widest">Cliente (F2)</Label>
          <div className="flex items-center gap-2 text-white font-bold text-xs bg-[#0f1115] p-1.5 rounded border border-[#2d3139] cursor-pointer hover:border-blue-500/50" onClick={() => setIsClientSearchOpen(true)}>
            <Search size={12} className="text-blue-500" />
            <span className="truncate">{selectedClient}</span>
          </div>
        </div>
          <div className="md:col-span-2 space-y-0.5">
          <Label className="text-[8px] uppercase font-black text-[#71717a] tracking-widest">OS Vínculo (F4)</Label>
          <div className="flex gap-2">
            <Input 
              placeholder="Nº da OS..." 
              className="h-8 bg-[#0f1115] border-[#2d3139] text-white text-[11px]"
              value={linkedOS}
              onChange={e => setLinkedOS(e.target.value)}
            />
            <Button variant="outline" className="border-[#2d3139] text-[8px] font-black uppercase h-8 px-2 min-w-[70px]">
              <FileText size={10} className="mr-1 text-blue-500" /> Inserir
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Cart + Summary */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* Main Cart Area */}
        <Card className="lg:col-span-8 flex flex-col min-h-[400px] bg-[#1a1d23] border-[#2d3139] overflow-hidden shadow-2xl">
        <div className="flex-shrink-0 p-3 md:p-4 bg-[#0f1115]/80 border-b border-[#2d3139] flex items-center justify-between">
          <Label className="text-[11px] font-black text-white uppercase tracking-widest">Itens do Carrinho</Label>
          <div className="flex items-center gap-4">
             <div className="text-[10px] font-black text-[#71717a] uppercase tracking-[0.2em]">Total Parcial: R$ {subtotal.toFixed(2)}</div>
             <Button variant="outline" size="sm" onClick={() => setIsProductSearchOpen(true)} className="h-7 border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white text-[9px] font-bold uppercase">Adicionar Item (F3)</Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f1115] p-3 md:p-6">
          <div className="space-y-6">
            {cart.map((c, idx) => (
              <div key={c.item.id || idx} className="grid grid-cols-12 gap-4 mb-6 items-end group bg-[#1a1d23]/40 p-3 rounded-xl border border-[#2d3139]/50 shadow-inner">
                <div className="col-span-12 sm:col-span-12 md:col-span-6 flex flex-col gap-1.5">
                  <Label className="text-[9px] font-black text-[#71717a] uppercase tracking-widest pl-1">Produto / Serviço</Label>
                  <div className="flex items-center gap-2">
                    <InventorySelector 
                      inventory={inventory} 
                      onSelect={(selected) => {
                        const newCart = [...cart];
                        newCart[idx] = { 
                          ...newCart[idx], 
                          item: selected, 
                          price: selected.price || newCart[idx].price 
                        };
                        setCart(newCart);
                      }} 
                    />
                    <div className="w-10 h-10 rounded-lg bg-[#0f1115] border border-[#2d3139] overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg">
                      {c.item.imageUrl ? (
                        <img src={c.item.imageUrl} alt={c.item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package className="text-[#71717a] opacity-30" size={16} />
                      )}
                    </div>
                    <Input 
                      placeholder="Descrição do item..." 
                      value={c.item.name} 
                      onChange={e => {
                        const newCart = [...cart];
                        newCart[idx].item = { ...newCart[idx].item, name: e.target.value };
                        setCart(newCart);
                      }} 
                      className="bg-[#1a1d23] border-[#2d3139] text-white h-10 text-sm font-bold focus:ring-1 focus:ring-blue-500/50 flex-1 rounded-lg" 
                    />
                  </div>
                </div>
                <div className="col-span-5 md:col-span-2 flex flex-col gap-1.5">
                  <Label className="text-[9px] font-black text-[#71717a] uppercase tracking-widest text-center">Quantidade</Label>
                  <Input 
                    type="number" 
                    placeholder="Qtd" 
                    value={c.quantity || ''} 
                    onChange={e => updateQuantity(c.item.id, Number(e.target.value) || 0)} 
                    className="bg-[#0f1115] border-[#2d3139] text-white h-10 text-center font-black italic text-blue-400 text-lg rounded-lg" 
                    onFocus={(e) => e.target.select()} 
                  />
                </div>
                <div className="col-span-5 md:col-span-3 flex flex-col gap-1.5">
                   <Label className="text-[9px] font-black text-[#71717a] uppercase tracking-widest pl-1">Valor Unitário</Label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[#71717a] font-black">R$</span>
                     <Input 
                       type="number" 
                       placeholder="Preço" 
                       value={c.price || ''} 
                       onChange={e => {
                        const newCart = [...cart];
                        newCart[idx].price = Number(e.target.value) || 0;
                        setCart(newCart);
                       }} 
                       className="bg-[#0f1115] border-[#2d3139] text-white h-10 pl-9 font-black text-sm rounded-lg" 
                       onFocus={(e) => e.target.select()} 
                     />
                   </div>
                </div>
                <div className="col-span-2 md:col-span-1 flex justify-center pb-0.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-[#ef4444] hover:bg-[#ef4444]/10 h-10 w-10 transition-colors rounded-lg border border-transparent hover:border-[#ef4444]/20" 
                    onClick={() => removeFromCart(c.item.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 md:py-16 text-[#71717a]">
                 <ShoppingCart size={40} className="mb-2 opacity-20" />
                 <p className="text-[10px] italic font-bold uppercase tracking-widest">Aguardando Produtos... [F3]</p>
              </div>
            )}
          </div>
        </div>
        </Card>

        {/* Payment Summary Area */}
        <div className="lg:col-span-4 flex flex-col gap-3 overflow-hidden">
          <Card className="flex-1 bg-[#1a1d23] border-[#2d3139] shadow-2xl relative overflow-hidden flex flex-col min-h-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            <div className="p-2 md:p-3 space-y-3 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
              
              {/* Row 1: Payment Method Selection */}
              <div className="space-y-1">
                <Label className="text-[9px] font-black text-[#71717a] tracking-widest uppercase">Forma de Recebimento (F10 - Finalizar)</Label>
                <div className="flex justify-center gap-2">
                  {[
                    {id: 'Dinheiro', icon: <DollarSign size={14} />, onClick: () => { setPaymentMethod('Dinheiro'); setCardDetails(prev => ({...prev, interestPercent: 0, useInterest: false})); }},
                    {id: 'Cartão', icon: <CreditCard size={14} />, onClick: () => { setPaymentMethod('Cartão'); setIsCardDialogOpen(true); }},
                    {id: 'PIX', icon: (
                      <svg width="14" height="14" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-400">
                        <path d="M256 32L480 256L256 480L32 256L256 32Z" stroke="currentColor" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M256 128L384 256L256 384L128 256L256 128Z" fill="currentColor" />
                      </svg>
                    ), onClick: () => { setPaymentMethod('PIX'); setIsPixDialogOpen(true); setCardDetails(prev => ({...prev, interestPercent: 0, useInterest: false})); }}
                  ].map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={m.onClick}
                      className={cn(
                        "flex-1 h-10 rounded-lg border flex items-center justify-center gap-2 transition-all outline-none",
                        paymentMethod === m.id 
                          ? "bg-emerald-500 text-white border-emerald-400 font-bold shadow-lg shadow-emerald-500/20" 
                          : "bg-[#0f1115] border-[#2d3139] text-[#71717a] hover:border-[#3b82f6]/50"
                      )}
                    >
                      {m.icon}
                      <span className="text-[10px] font-bold uppercase">{m.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-2">
                 {paymentMethod === 'Cartão' && (
                   <div className="bg-[#0f1115] border border-blue-500/20 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-blue-500/5 transition-colors" onClick={() => setIsCardDialogOpen(true)}>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-black text-[#71717a]">Plano de Cartão</span>
                        <span className="text-[10px] text-white font-bold">
                          {cardDetails.brand || 'Selecione'} - {cardDetails.type} {cardDetails.installments}x 
                          {cardDetails.interestPercent > 0 ? ` (${cardDetails.interestPercent}% juros)` : ' (Sem Juros)'}
                        </span>
                      </div>
                      <div className="text-right">
                         <span className="text-[8px] uppercase font-black text-blue-400">Juros</span>
                         <div className="text-[10px] font-black text-white">{cardDetails.interestPercent}%</div>
                      </div>
                   </div>
                 )}
                 {paymentMethod === 'PIX' && (
                   <div className="bg-[#0f1115] border border-emerald-500/20 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-emerald-500/5 transition-colors" onClick={() => setIsPixDialogOpen(true)}>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-black text-[#71717a]">Conta PIX Selecionada</span>
                        <span className="text-[10px] text-white font-bold">
                          {(pixSettings?.accounts || []).find(a => a.id === selectedPixAccountId)?.label || 'Clique p/ Selecionar'}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-emerald-500" />
                   </div>
                 )}
                 {paymentMethod === 'Dinheiro' && (
                   <div className="bg-[#0f1115] border border-[#2d3139] rounded-lg p-3 flex items-center justify-center text-[10px] font-bold text-[#71717a] uppercase italic text-center">
                      Recebimento em Dinheiro (Sem detalhes adicionais)
                   </div>
                 )}
              </div>

              {/* Totals Summary */}
              <div className="space-y-2 pt-2 border-t border-[#2d3139]/50">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0f1115]/30">
                  <span className="text-[9px] text-[#71717a] font-black uppercase tracking-widest">Subtotal</span>
                  <span className="text-lg font-bold text-white">R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0f1115]/30 border border-red-500/10">
                   <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-red-500/70 font-black uppercase italic tracking-widest">Desconto (%)</span>
                    <button onClick={() => setIsDiscountDialogOpen(true)} className="text-blue-500 hover:text-blue-400 p-0.5 bg-[#0f1115] rounded border border-[#2d3139]">
                        <Pencil size={8} />
                    </button>
                  </div>
                  <span className="text-lg font-bold text-red-500 italic">{discount.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em]">Total Geral</span>
                  <span className="text-2xl font-black text-emerald-500 italic tracking-tighter">R$ {displayTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button 
                  onClick={handleFinishSale}
                  disabled={cart.length === 0 || isFinishing}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase italic tracking-tighter text-xl shadow-xl shadow-emerald-600/20"
                >
                  {isFinishing ? <Loader2 className="animate-spin" /> : "FINALIZAR (F10)"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Desconto (F6) */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent size={18} className="text-red-500" />
              Aplicar Desconto (%)
            </DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">
              Informe a porcentagem (%) a ser descontada do total.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-1.5">
               <Label className="text-[#71717a] font-bold uppercase text-[10px]">Porcentagem de Desconto</Label>
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a] font-bold">%</span>
                 <Input 
                   type="number" 
                   className="pl-10 bg-[#0f1115] border-[#2d3139] h-12 text-lg font-black text-red-500 italic" 
                   placeholder="0"
                   value={discount || ''}
                   onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                   onKeyDown={e => e.key === 'Enter' && setIsDiscountDialogOpen(false)}
                   autoFocus
                 />
               </div>
             </div>
             <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] uppercase font-black">
                <div className="p-2 rounded bg-[#0f1115] border border-[#2d3139] flex flex-col items-center">
                   <span className="text-[#71717a]">Desconto (R$)</span>
                   <span className="text-red-500">R$ {discountAmount.toFixed(2)}</span>
                </div>
                <div className="p-2 rounded bg-[#0f1115] border border-[#2d3139] flex flex-col items-center">
                   <span className="text-emerald-500">Novo Total</span>
                   <span className="text-white">R$ {total.toFixed(2)}</span>
                </div>
             </div>
          </div>
          <DialogFooter>
             <Button onClick={() => setIsDiscountDialogOpen(false)} className="w-full bg-red-500 hover:bg-neutral-600 font-black uppercase italic">
               Confirmar Desconto
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Pagamento Cartão */}
      <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard size={18} className="text-blue-500" />
              Detalhes do Pagamento em Cartão
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[#71717a] font-bold uppercase text-[10px]">Bandeira</Label>
                  <select 
                    className="w-full h-12 bg-[#0f1115] border-[#2d3139] rounded-lg text-sm text-white px-3 font-bold"
                    value={localCardDetails?.brand || ''}
                    onChange={e => {
                      const newBrand = e.target.value;
                      const rate = localCardDetails?.useInterest ? findInterestRate(newBrand, localCardDetails.type, localCardDetails.installments) : (localCardDetails?.interestPercent || 0);
                      setLocalCardDetails({...localCardDetails, brand: newBrand, interestPercent: rate});
                    }}
                  >
                    <option value="">Selecione...</option>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Elo">Elo</option>
                    <option value="Hipercard">Hipercard</option>
                    <option value="Amex">Amex</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#71717a] font-bold uppercase text-[10px]">Tipo</Label>
                  <select 
                    className="w-full h-12 bg-[#0f1115] border-[#2d3139] rounded-lg text-sm text-white px-3 font-bold"
                    value={localCardDetails?.type || 'crédito'}
                    onChange={e => {
                      const newType = e.target.value;
                      const rate = localCardDetails?.useInterest ? findInterestRate(localCardDetails.brand, newType, localCardDetails.installments) : (localCardDetails?.interestPercent || 0);
                      setLocalCardDetails({...localCardDetails, type: newType, interestPercent: rate});
                    }}
                  >
                    <option value="crédito">Crédito</option>
                    <option value="débito">Débito</option>
                  </select>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[#71717a] font-bold uppercase text-[10px]">Parcelas</Label>
                  <select 
                    className="w-full h-12 bg-[#0f1115] border-[#2d3139] rounded-lg text-sm text-white px-3 font-bold"
                    value={localCardDetails?.installments || 1}
                    onChange={e => {
                      const newInst = Number(e.target.value);
                      const rate = localCardDetails?.useInterest ? findInterestRate(localCardDetails.brand, localCardDetails.type, newInst) : (localCardDetails?.interestPercent || 0);
                      setLocalCardDetails({...localCardDetails, installments: newInst, interestPercent: rate});
                    }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[#71717a] font-bold uppercase text-[10px]">Juros</Label>
                          <select 
                            className="w-full h-12 bg-[#0f1115] border-[#2d3139] rounded-lg text-sm text-white px-3 font-bold"
                            value={localCardDetails?.useInterest ? 'with' : 'none'}
                            onChange={e => {
                               const useInt = e.target.value === 'with';
                               let rate = 0;
                               if (useInt) {
                                 rate = findInterestRate(localCardDetails?.brand || '', localCardDetails?.type || 'crédito', localCardDetails?.installments || 1);
                               }
                               setLocalCardDetails({...localCardDetails, useInterest: useInt, interestPercent: rate});
                            }}
                          >
                            <option value="none">Sem Juros</option>
                            <option value="with">Com Juros (Plano)</option>
                          </select>
                          {localCardDetails?.useInterest && localCardDetails?.brand && localCardDetails?.interestPercent === 0 && (
                            <div className="text-[8px] text-amber-500 font-bold uppercase mt-1">Nenhum plano encontrado</div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[#71717a] font-bold uppercase text-[10px]">Taxa Aplicada (%)</Label>
                          <div className="relative">
                            <Input 
                              type="number"
                              className="bg-[#0f1115] border-[#2d3139] h-12 text-sm font-black text-blue-400 text-center"
                              value={localCardDetails?.interestPercent === 0 ? '0' : localCardDetails?.interestPercent}
                              readOnly={localCardDetails?.useInterest}
                              onChange={e => !localCardDetails?.useInterest && setLocalCardDetails({...localCardDetails, interestPercent: Math.max(0, Number(e.target.value) || 0)})}
                              placeholder="0"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                               <Percent size={14} className="text-[#71717a]" />
                            </div>
                          </div>
                        </div>
                     </div>
             </div>

             <div className="p-4 rounded-xl bg-[#0f1115] border border-[#2d3139] grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                   <span className="text-xs text-[#71717a] font-bold uppercase">Total Final</span>
                   <span className="text-xl font-black text-white">R$ {localTotal.toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-xs text-[#71717a] font-bold uppercase">Parcelas</span>
                   <span className="text-lg font-black text-blue-400">
                     {(localCardDetails?.installments || 1)}x R$ {(localTotal / (localCardDetails?.installments || 1)).toFixed(2)}
                   </span>
                </div>
             </div>
          </div>
          <DialogFooter>
             <Button onClick={() => { setCardDetails(localCardDetails); setIsCardDialogOpen(false); }} className="w-full bg-blue-600 hover:bg-blue-700 font-black uppercase italic">
               Confirmar Dados do Cartão
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Seleção PIX */}
      <Dialog open={isPixDialogOpen} onOpenChange={setIsPixDialogOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-400">
                <path d="M256 32L480 256L256 480L32 256L256 32Z" stroke="currentColor" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M256 128L384 256L256 384L128 256L256 128Z" fill="currentColor" />
              </svg>
              Selecionar Conta PIX
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-1.5">
               <Label className="text-[#71717a] font-bold uppercase text-[10px]">Conta de Destino</Label>
               <select 
                 className="w-full h-12 bg-[#0f1115] border-[#2d3139] rounded-lg text-sm text-white px-3 font-bold"
                 value={localPixAccountId}
                 onChange={e => setLocalPixAccountId(e.target.value)}
               >
                 <option value="">Selecione uma conta...</option>
                 {(pixSettings?.accounts || []).map(acc => (
                   <option key={acc.id} value={acc.id}>{acc.label} ({acc.bank}) - {acc.key}</option>
                 ))}
               </select>
             </div>
             {(pixSettings?.accounts || []).length === 0 && (
               <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-xs italic text-center">
                 Nenhuma conta PIX cadastrada no sistema. Vá em Configurações para cadastrar.
               </div>
             )}
             
             {localPixAccountId && (
               <div className="bg-[#0f1115] border border-[#2d3139] rounded-xl p-4 space-y-3">
                  {(() => {
                    const acc = (pixSettings?.accounts || []).find(a => a.id === localPixAccountId);
                    if (!acc) return null;
                    return (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-[10px] text-[#71717a] font-bold uppercase">Favorecido</p>
                            <p className="text-white font-bold">{acc.favored}</p>
                          </div>
                          <div className="bg-white p-2 rounded-lg">
                            <QRCodeCanvas 
                              value={acc.qrKey || acc.key || ''} 
                              size={100}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <p className="text-[10px] text-[#71717a] font-bold uppercase">Chave PIX</p>
                              <p className="text-xs text-emerald-400 font-mono break-all">{acc.key}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] text-[#71717a] font-bold uppercase">CPF/CNPJ</p>
                              <p className="text-xs text-white">{acc.document || '-'}</p>
                           </div>
                        </div>
                      </>
                    );
                  })()}
               </div>
             )}
          </div>
          <DialogFooter>
             <Button onClick={() => { setSelectedPixAccountId(localPixAccountId); setIsPixDialogOpen(false); }} className="w-full bg-emerald-600 hover:bg-emerald-700 font-black uppercase italic">
               Confirmar Conta PIX
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Pesquisa de Produto (F3) */}
      <Dialog open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pesquisar Produto (F3)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={18} />
                <Input 
                  placeholder="Nome do produto ou código..." 
                  className="pl-10 h-12 bg-[#0f1115] border-[#2d3139] text-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
             </div>
             <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-1 gap-2">
                  {inventory.filter(p => (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.toLowerCase().includes(searchTerm.toLowerCase())) && p.quantity > 0).map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-4 rounded-lg bg-[#0f1115] border border-[#2d3139] hover:border-blue-500/50 flex justify-between items-center group"
                    >
                      <div className="text-left flex items-center gap-3">
                        <div className="w-12 h-12 rounded bg-[#1a1d23] border border-[#2d3139] overflow-hidden flex items-center justify-center flex-shrink-0">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package className="text-[#71717a]" size={20} />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-mono text-[#71717a]">#{p.code}</p>
                          <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{p.name}</p>
                          <p className="text-xs text-[#71717a]">Estoque: {p.quantity} {p.unit || 'UN'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-500 italic">R$ {(p.price || 0).toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
             </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Pesquisa de Cliente (F2) */}
      <Dialog open={isClientSearchOpen} onOpenChange={setIsClientSearchOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-xl">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente (F2)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
             <Input 
               placeholder="Nome ou CPF/CNPJ..." 
               className="h-12 bg-[#0f1115] border-[#2d3139] text-white"
               onChange={(e) => setSearchTerm(e.target.value)}
               autoFocus
             />
             <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => { setSelectedClient('Avulso'); setIsClientSearchOpen(false); }}
                    className="p-3 rounded-lg bg-[#0f1115] border border-[#2d3139] hover:bg-blue-500/10 text-left font-bold"
                  >
                    CONSUMIDOR AVULSO
                  </button>
                  {clients.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.document?.includes(searchTerm)).map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedClient(c.name); setIsClientSearchOpen(false); }}
                      className="p-3 rounded-lg bg-[#0f1115] border border-[#2d3139] hover:bg-blue-500/10 text-left"
                    >
                      <p className="font-bold text-white uppercase">{c.name}</p>
                      <p className="text-[10px] text-[#71717a]">{c.document || 'Sem Documento'}</p>
                    </button>
                  ))}
                </div>
             </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sale Success / Receipt Modal */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm text-center">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Venda Concluída!</DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">Deseja imprimir o cupom não fiscal?</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Button onClick={printReceipt} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest">
              <Printer className="mr-2" size={18} /> Imprimir Cupom
            </Button>
            <Button variant="ghost" onClick={() => setIsReceiptOpen(false)} className="w-full text-[#71717a] hover:text-white">
              Continuar sem Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Histórico de Vendas */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={18} className="text-blue-500" />
              Histórico de Vendas
            </DialogTitle>
            <DialogDescription className="text-[#71717a]">Pesquise por número da venda, cliente ou vendedor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
             <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={18} />
                  <Input 
                    placeholder="Número (Ex: 000001/24), Cliente, Vendedor ou Data (dd/mm/yyyy)..." 
                    className="pl-10 h-10 bg-[#0f1115] border-[#2d3139] text-white"
                    value={saleSearchTerm}
                    onChange={e => setSaleSearchTerm(e.target.value)}
                  />
                </div>
                {saleDateFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setSaleDateFilter('')} className="h-10 text-red-400 hover:bg-red-500/10">
                    <X size={14} />
                  </Button>
                )}
             </div>
             <ScrollArea className="h-[450px]">
                <div className="space-y-2 pr-4">
                   {filteredSales.map(sale => (
                     <div key={sale.id} className="p-3 rounded-lg bg-[#0f1115] border border-[#2d3139] flex justify-between items-center group hover:border-[#3b82f6]/30 transition-all">
                        <div className="space-y-1">
                           <div className="flex items-center gap-2">
                              <span className="text-blue-500 font-mono font-bold text-xs">#{sale.number}</span>
                              <span className="text-white font-bold text-sm truncate max-w-[200px]">{sale.clientName}</span>
                           </div>
                           <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#71717a]">
                              <span className="flex items-center gap-1"><Calendar size={10} /> {sale.createdAt?.toDate ? format(sale.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}</span>
                              <span className="flex items-center gap-1"><User size={10} /> {sale.vendorName}</span>
                              <span className="flex items-center gap-1 font-bold text-emerald-500">{sale.paymentMethod}</span>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="text-right mr-4">
                              <p className="text-white font-black text-sm">R$ {sale.total.toFixed(2)}</p>
                              <p className="text-[9px] text-[#71717a] uppercase italic">{sale.items?.length || 0} itens</p>
                           </div>
                           <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 border-[#2d3139] hover:bg-emerald-500/10 hover:text-emerald-500"
                                onClick={async () => await generatePDVReceiptPDF(sale)}
                                title="Reimprimir Cupom"
                              >
                                <Printer size={14} />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 border-[#2d3139] hover:bg-blue-500/10 hover:text-blue-500"
                                onClick={() => {
                                  // Edit Logic: Load to cart
                                  setCart(sale.items.map((i: any) => ({ 
                                    item: inventory.find(inv => inv.id === i.itemId) || { id: i.itemId, name: i.name },
                                    quantity: i.quantity,
                                    price: i.price
                                  })));
                                  setSelectedClient(sale.clientName || 'Consumidor Final');
                                  setPaymentMethod(sale.paymentMethod);
                                  setDiscount(sale.discount || 0);
                                  setIsHistoryOpen(false);
                                  toast.info(`Venda #${sale.number} carregada no PDV para edição.`);
                                }}
                                title="Editar Venda"
                              >
                                <Pencil size={14} />
                              </Button>
                              {canManageSales && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 border-[#2d3139] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                                  onClick={() => {
                                    setSaleToDelete(sale);
                                    setIsDeleteSaleConfirmOpen(true);
                                  }}
                                  title="Excluir Venda"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                           </div>
                        </div>
                     </div>
                   ))}
                   {filteredSales.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-20 text-[#71717a]">
                        <Search size={40} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">Nenhuma venda encontrada.</p>
                     </div>
                   )}
                </div>
             </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Venda */}
      <Dialog open={isDeleteSaleConfirmOpen} onOpenChange={setIsDeleteSaleConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle>Excluir Venda</DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">
              Tem certeza que deseja excluir a venda <span className="text-red-500 font-bold">{saleToDelete?.number}</span>?
              <br/><br/>
              Isso irá estornar o financeiro e o estoque associados a esta venda. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteSaleConfirmOpen(false)} className="border-[#2d3139] text-[#71717a]">Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteSale} className="bg-[#ef4444] hover:bg-red-600 text-white font-black uppercase italic tracking-widest px-8 shadow-lg shadow-red-500/20">CONFIRMAR EXCLUSÃO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
}

function InventoryManager({ 
  inventory = [], 
  transactions = [], 
  serviceOrders = [],
  visits = [],
  companyId, 
  logAction,
  showList 
}: { 
  inventory: any[], 
  transactions: any[], 
  serviceOrders: any[],
  visits: any[],
  companyId: string, 
  logAction?: any,
  showList: boolean 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'entry' | 'exit'>('entry');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    description: '',
    quantity: 0,
    minQuantity: 5,
    unit: 'un',
    price: 0, // This will be the selling price (calculated)
    costPrice: 0,
    profitMargin: 0,
    location: '',
    category: '',
    imageUrl: ''
  });

  const [newTransaction, setNewTransaction] = useState({
    itemId: '',
    type: 'entry' as 'entry' | 'exit',
    quantity: 1,
    serialNumber: '',
    referenceId: '', // OS or Visit ID
    referenceType: 'none' as 'none' | 'os' | 'visit',
    observations: ''
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter(p => 
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.code?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [inventory, searchTerm]);

  const abcData = useMemo(() => {
    // Calculate usage frequency from transactions
    const usageMap = new Map();
    transactions.filter(t => t.type === 'exit').forEach(t => {
      const count = usageMap.get(t.itemId) || 0;
      usageMap.set(t.itemId, count + t.quantity);
    });

    const data = inventory.map(item => ({
      name: item.name,
      value: usageMap.get(item.id) || 0
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    return data;
  }, [inventory, transactions]);

  const stats = useMemo(() => {
    const lowStock = inventory.filter(item => item.quantity > 0 && item.quantity <= (item.minQuantity || 0)).length;
    const zeroStock = inventory.filter(item => item.quantity <= 0).length;
    const totalItems = inventory.length;
    return { lowStock, zeroStock, totalItems };
  }, [inventory]);

  const handleSaveItem = async () => {
    if (!newItem.name || !newItem.code) {
      toast.error('Preencha os campos obrigatórios (Nome e Código).');
      return;
    }

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'inventory'), {
        ...newItem,
        companyId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      if (logAction) {
        await logAction('create', 'inventory', `Cadastrou item no estoque: ${newItem.name} (${newItem.code})`, docRef.id, newItem.name);
      }

      setIsAddOpen(false);
      setNewItem({ code: '', name: '', description: '', quantity: 0, minQuantity: 5, unit: 'un', price: 0, costPrice: 0, profitMargin: 0, location: '', category: '', imageUrl: '' });
      toast.success('Item cadastrado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
      toast.error('Erro ao cadastrar item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);

    try {
      await updateDoc(doc(db, 'inventory', selectedItem.id), {
        ...selectedItem,
        updatedAt: Timestamp.now()
      });

      if (logAction) {
        await logAction('update', 'inventory', `Atualizou item no estoque: ${selectedItem.name}`, selectedItem.id, selectedItem.name);
      }

      setIsEditOpen(false);
      setSelectedItem(null);
      toast.success('Item atualizado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'inventory');
      toast.error('Erro ao atualizar item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);

    try {
      await deleteDoc(doc(db, 'inventory', itemToDelete.id));
      
      if (logAction) {
        await logAction('delete', 'inventory', `Removeu item do estoque: ${itemToDelete.name}`, itemToDelete.id, itemToDelete.name);
      }

      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
      toast.success('Item removido do estoque.');
    } catch (err) {
      toast.error('Erro ao excluir item.');
      handleFirestoreError(err, OperationType.DELETE, 'inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessTransaction = async () => {
    if (!newTransaction.itemId || newTransaction.quantity <= 0) {
      toast.error('Selecione o item e a quantidade.');
      return;
    }

    const item = inventory.find(i => i.id === newTransaction.itemId);
    if (!item) return;

    if (newTransaction.type === 'exit' && item.quantity < newTransaction.quantity) {
      toast.error('Quantidade insuficiente em estoque.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create transaction record
      const transDoc = await addDoc(collection(db, 'inventoryTransactions'), {
        ...newTransaction,
        companyId,
        timestamp: Timestamp.now()
      });

      // 2. Update inventory quantity
      const newQty = newTransaction.type === 'entry' 
        ? item.quantity + newTransaction.quantity 
        : item.quantity - newTransaction.quantity;

      await updateDoc(doc(db, 'inventory', item.id), {
        quantity: newQty,
        updatedAt: Timestamp.now()
      });

      if (logAction) {
        await logAction('create', 'inventory_transaction', `${newTransaction.type === 'entry' ? 'Entrada' : 'Saída'} de ${newTransaction.quantity}x ${item.name}`, transDoc.id);
      }

      setIsTransactionOpen(false);
      setNewTransaction({
        itemId: '',
        type: 'entry',
        quantity: 1,
        serialNumber: '',
        referenceId: '',
        referenceType: 'none',
        observations: ''
      });
      toast.success('Movimentação realizada com sucesso!');
    } catch (err) {
      toast.error('Erro ao processar movimentação.');
      handleFirestoreError(err, OperationType.WRITE, 'inventoryTransactions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockStatus = (item: any) => {
    if (item.quantity <= 0) return { label: 'ZERO', color: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (item.quantity <= (item.minQuantity || 0)) return { label: 'BAIXO', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };
    return { label: 'OK', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' };
  };

  if (!showList) {
    return <NoAccessList title="Estoque de Peças" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic text-[#3b82f6]">Controle de Estoque</h2>
        <div className="flex items-center justify-between">
          <p className="text-[#a0a0a0] text-sm">Gerencie o inventário de peças e componentes integrados às Ordens de Serviço.</p>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">Alertas</p>
              <div className="flex gap-2">
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold tracking-tight uppercase px-1.5 py-0.5">{stats.zeroStock} ESGOTADOS</Badge>
                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold tracking-tight uppercase px-1.5 py-0.5">{stats.lowStock} CRÍTICO</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(stats.zeroStock > 0 || stats.lowStock > 0) && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="text-red-500" size={20} />
            <div>
              <p className="text-sm font-black uppercase tracking-tight italic">Status de Estoque Crítico</p>
              <p className="text-xs opacity-80">Atenção! Existem componentes esgotados ou abaixo do nível mínimo de segurança.</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:bg-red-500 hover:text-white font-bold text-[10px] uppercase tracking-widest"
            onClick={() => setSearchTerm('')}
          >
            Revisar Itens
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a1d23] border-[#2d3139] p-4 flex flex-col items-center justify-center text-center group hover:border-[#3b82f6]/40 transition-all cursor-pointer shadow-lg" onClick={() => setIsAddOpen(true)}>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2 group-hover:scale-110 transition-transform ring-1 ring-[#3b82f6]/20">
            <Plus size={20} />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-tighter">Novo Item</span>
        </Card>
        <Card className="bg-[#1a1d23] border-[#2d3139] p-4 flex flex-col items-center justify-center text-center group hover:border-emerald-500/40 transition-all cursor-pointer shadow-lg" onClick={() => { setTransactionType('entry'); setIsTransactionOpen(true); }}>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2 group-hover:scale-110 transition-transform ring-1 ring-emerald-500/20">
            <ArrowDownRight size={20} />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-tighter">Entrada</span>
        </Card>
        <Card className="bg-[#1a1d23] border-[#2d3139] p-4 flex flex-col items-center justify-center text-center group hover:border-amber-500/40 transition-all cursor-pointer shadow-lg" onClick={() => { setTransactionType('exit'); setIsTransactionOpen(true); }}>
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 group-hover:scale-110 transition-transform ring-1 ring-amber-500/20">
            <ArrowUpRight size={20} />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-tighter">Saída/Uso</span>
        </Card>
        <Card className="bg-[#1a1d23] border-[#2d3139] p-4 flex flex-col items-center justify-center text-center group hover:border-purple-500/40 transition-all cursor-pointer shadow-lg" onClick={() => setIsHistoryOpen(true)}>
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-2 group-hover:scale-110 transition-transform ring-1 ring-purple-500/20">
            <History size={20} />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-tighter">Histórico</span>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 bg-[#1a1d23] border border-[#2d3139] p-2 rounded-xl focus-within:ring-1 focus-within:ring-blue-500/50 transition-all group">
              <Search className="text-[#71717a] ml-2 group-focus-within:text-blue-500 transition-colors" size={18} />
              <Input 
                placeholder="Pesquisar por peça ou código (SN/SKU)..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-[#71717a] h-9"
              />
            </div>
            
            <div className="flex bg-[#1a1d23] p-1 rounded-lg border border-[#2d3139]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "h-9 px-3 rounded-md transition-all",
                  viewMode === 'table' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
                )}
              >
                <List size={16} className="mr-2" />
                <span className="text-xs font-bold uppercase tracking-widest">Lista</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-9 px-3 rounded-md transition-all",
                  viewMode === 'grid' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
                )}
              >
                <LayoutGrid size={16} className="mr-2" />
                <span className="text-xs font-bold uppercase tracking-widest">Colunas</span>
              </Button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[700px] p-1 custom-scrollbar">
              {filteredInventory.length === 0 ? (
                <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl">
                   Nenhum item encontrado no estoque.
                </div>
              ) : (
                filteredInventory.map((item) => (
                  <Card key={item.id} className="bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#a0a0a0] hover:text-[#3b82f6] bg-[#0f1115]/80 backdrop-blur-sm shadow-lg shadow-black/40" onClick={() => {
                           setSelectedItem(item);
                           setIsEditOpen(true);
                        }}>
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#ef4444] hover:bg-[#ef4444]/20 bg-[#0f1115]/80 backdrop-blur-sm shadow-lg shadow-black/40" onClick={() => {
                           setItemToDelete(item);
                           setIsDeleteConfirmOpen(true);
                        }}>
                          <Trash2 size={12} />
                        </Button>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg bg-[#0f1115] border border-[#2d3139] flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={24} className="text-[#3b82f6] opacity-30" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                         <span className="text-[10px] font-mono font-bold text-[#3b82f6] truncate">{item.code || '-'}</span>
                         <h3 className="font-bold text-white text-sm truncate pr-14" title={item.name}>{item.name}</h3>
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[8px] uppercase tracking-tighter border-[#2d3139] text-[#71717a] h-4">
                             {item.category || 'Geral'}
                           </Badge>
                           <Badge className={cn("text-[8px] px-1.5 h-4 font-black tracking-widest", getStockStatus(item).color)}>
                             {getStockStatus(item).label}
                           </Badge>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#2d3139]/50 mt-1">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-widest">Disponível</span>
                        <div className="flex items-center gap-1">
                           <span className={cn(
                             "text-lg font-black",
                             item.quantity <= (item.minQuantity || 0) ? "text-amber-500" : "text-white"
                           )}>{item.quantity}</span>
                           <span className="text-[10px] text-[#71717a] mb-1">{item.unit || 'un'}</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-widest">Preço Venda</span>
                        <div className="text-white font-black text-lg">
                           R$ {Number(item.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <Card className="bg-[#1a1d23] border-[#2d3139] overflow-hidden shadow-2xl">
              <TableDoubleScroll>
                <Table>
                <TableHeader className="bg-[#0f1115]">
                  <TableRow className="hover:bg-transparent border-[#2d3139]">
                    <TableHead className="text-[#71717a] text-[10px] uppercase font-black px-4 py-3">Cod.</TableHead>
                    <TableHead className="text-[#71717a] text-[10px] uppercase font-black px-4 py-3 w-[60px]"></TableHead>
                    <TableHead className="text-[#71717a] text-[10px] uppercase font-black px-4 py-3">Peça / Componente</TableHead>
                    <TableHead className="text-[#71717a] text-[10px] uppercase font-black text-center px-4 py-3">Quant.</TableHead>
                    <TableHead className="text-[#71717a] text-[10px] uppercase font-black text-center px-4 py-3">Min.</TableHead>
                    <TableHead className="text-[#71717a] text-[10px] uppercase font-black text-center px-4 py-3">Status</TableHead>
                    <TableHead className="text-[#71717a] text-[10px] uppercase font-black text-right px-4 py-3">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length > 0 ? (
                    filteredInventory.map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <TableRow key={item.id} className="border-[#2d3139] hover:bg-[#2d3139]/20 transition-colors group">
                          <TableCell className="font-mono text-[10px] text-blue-400 px-4 py-3 tracking-tighter uppercase">#{item.code}</TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="w-10 h-10 rounded-lg bg-[#0f1115] border border-[#2d3139] overflow-hidden flex items-center justify-center">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Package className="text-[#71717a]" size={16} />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white tracking-tight">{item.name}</span>
                              <span className="text-[10px] text-[#71717a] font-medium uppercase">{item.category || 'Geral'} • {item.location || 'Sem local'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-white px-4 py-3">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-center text-[#71717a] text-xs px-4 py-3 font-medium">{item.minQuantity}</TableCell>
                          <TableCell className="text-center px-4 py-3">
                            <Badge className={cn("text-[9px] font-black tracking-tight border px-1.5 py-0.5", status.color)}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-[#71717a] hover:text-blue-400 hover:bg-blue-400/10"
                                onClick={() => { setSelectedItem(item); setIsEditOpen(true); }}
                              >
                                <Pencil size={12} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-[#71717a] hover:text-red-400 hover:bg-red-400/10"
                                onClick={() => { setItemToDelete(item); setIsDeleteConfirmOpen(true); }}
                              >
                                <Trash2 size={12} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-[#71717a] hover:text-white hover:bg-[#2d3139]"
                                onClick={() => { 
                                  setSelectedItem(item);
                                  setIsHistoryOpen(true);
                                }}
                              >
                                <Eye size={12} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-[#71717a] italic">
                        <div className="flex flex-col items-center gap-2 opacity-40">
                          <Package size={40} />
                          <span className="text-sm">Nenhum item encontrado no estoque.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableDoubleScroll>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <Card className="bg-[#1a1d23] border-[#2d3139] p-6 shadow-xl relative overflow-hidden group border-t-2 border-t-blue-500">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all">
              <TrendingUp size={100} className="text-blue-500" />
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <TrendingUp size={14} className="text-blue-500" />
              </div>
              Curva ABC (Mais Usados)
            </h4>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={abcData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    stroke="#71717a" 
                    fontSize={10} 
                    tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: '#2d3139', opacity: 0.2}}
                    contentStyle={{ backgroundColor: '#0f1115', border: '1px solid #2d3139', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#3b82f6', fontSize: '11px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#a0a0a0', fontSize: '10px', marginBottom: '4px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {abcData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#60a5fa' : '#93c5fd'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-[#71717a] text-center mt-2 italic font-medium leading-relaxed">Itens com maior rotatividade baseadas em registros de OS e Visitas.</p>
          </Card>

          <Card className="bg-[#1a1d23] border-[#2d3139] p-6 shadow-xl relative overflow-hidden group">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <History size={14} className="text-emerald-500" />
              </div>
              Últimas Atividades
            </h4>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((t, idx) => {
                const item = inventory.find(i => i.id === t.itemId);
                return (
                  <div key={idx} className="flex items-center justify-between border-b border-[#2d3139]/30 pb-3 last:border-0 last:pb-0 group/item">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white group-hover/item:text-blue-400 transition-colors">{item?.name || 'Item Removido'}</span>
                      <span className="text-[9px] text-[#71717a] font-mono tracking-tighter">{format(t.timestamp?.toDate() || new Date(), "dd/MM/yy HH:mm")}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#0f1115] px-2 py-1 rounded-lg border border-[#2d3139]">
                       <span className={cn("text-[11px] font-black font-mono", t.type === 'entry' ? 'text-emerald-500' : 'text-amber-500')}>
                         {t.type === 'entry' ? '+' : '-'}{t.quantity}
                       </span>
                       {t.type === 'entry' ? <ArrowDownRight size={12} className="text-emerald-500" /> : <ArrowUpRight size={12} className="text-amber-500" />}
                    </div>
                  </div>
                );
              })}
              {transactions.length === 0 && <p className="text-center text-[10px] text-[#71717a] py-4 italic">Sem movimentações recentes.</p>}
              {transactions.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase text-[#71717a] hover:text-white mt-2" onClick={() => setIsHistoryOpen(true)}>
                  Ver Todas
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Package className="text-blue-500" /> Editar Item de Estoque
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Código / SKU</Label>
                <Input 
                  value={selectedItem.code || ''} 
                  onChange={e => setSelectedItem({...selectedItem, code: e.target.value})} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Nome da Peça</Label>
                <Input 
                  value={selectedItem.name || ''} 
                  onChange={e => setSelectedItem({...selectedItem, name: e.target.value})} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Categoria</Label>
                <Input 
                  value={selectedItem.category || ''} 
                  onChange={e => setSelectedItem({...selectedItem, category: e.target.value})} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Localização</Label>
                <Input 
                  value={selectedItem.location || ''} 
                  onChange={e => setSelectedItem({...selectedItem, location: e.target.value})} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Estoque Atual</Label>
                <Input 
                  type="number"
                  value={selectedItem.quantity || ''} 
                  onChange={e => setSelectedItem({...selectedItem, quantity: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Mínimo para Alerta</Label>
                <Input 
                  type="number"
                  value={selectedItem.minQuantity || ''} 
                  onChange={e => setSelectedItem({...selectedItem, minQuantity: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Preço de Custo (R$)</Label>
                <Input 
                  type="number"
                  value={selectedItem.costPrice || ''} 
                  onChange={e => {
                    const cost = e.target.value === '' ? 0 : Number(e.target.value);
                    const margin = selectedItem.profitMargin || 0;
                    const sellingPrice = Number((cost * (1 + margin / 100)).toFixed(2));
                    setSelectedItem({...selectedItem, costPrice: cost, price: sellingPrice});
                  }} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Margem de Lucro (%)</Label>
                <Input 
                  type="number"
                  value={selectedItem.profitMargin || ''} 
                  onChange={e => {
                    const margin = e.target.value === '' ? 0 : Number(e.target.value);
                    const cost = selectedItem.costPrice || 0;
                    const sellingPrice = Number((cost * (1 + margin / 100)).toFixed(2));
                    setSelectedItem({...selectedItem, profitMargin: margin, price: sellingPrice});
                  }} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Preço de Venda (Final) (R$)</Label>
                <Input 
                  type="number"
                  value={selectedItem.price || ''} 
                  onChange={e => {
                    const sellingPrice = e.target.value === '' ? 0 : Number(e.target.value);
                    const cost = selectedItem.costPrice || 0;
                    // Calculate margin based on selling price if cost is available
                    let margin = selectedItem.profitMargin || 0;
                    if (cost > 0) {
                      margin = Number(((sellingPrice / cost - 1) * 100).toFixed(2));
                    }
                    setSelectedItem({...selectedItem, price: sellingPrice, profitMargin: margin});
                  }} 
                  onFocus={(e) => e.target.select()}
                  className="bg-[#0f1115] border-[#2d3139] h-11 text-lg font-bold text-blue-400" 
                />
                <p className="text-[10px] text-blue-400/70 italic">Preço final utilizado nos orçamentos e vendas.</p>
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Link da Imagem do Produto (URL)</Label>
                <Input 
                  value={selectedItem.imageUrl || ''} 
                  onChange={e => setSelectedItem({...selectedItem, imageUrl: e.target.value})} 
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Observações</Label>
                <Input 
                  value={selectedItem.description || ''} 
                  onChange={e => setSelectedItem({...selectedItem, description: e.target.value})} 
                  className="bg-[#0f1115] border-[#2d3139]" 
                />
              </div>
            </div>
          )}
          <DialogFooter className="bg-[#0f1115]/50 p-6 -mx-6 -mb-6 border-t border-[#2d3139]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-[#2d3139]">Cancelar</Button>
            <Button onClick={handleUpdateItem} className="bg-[#3b82f6] hover:bg-[#2563eb] font-black uppercase italic tracking-tighter">Atualizar Registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Package className="text-blue-500" /> Novo Item de Estoque
            </DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">Cadastre novas peças ou componentes para uso técnico.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Código / SKU</Label>
              <Input 
                value={newItem.code || ''} 
                onChange={e => setNewItem({...newItem, code: e.target.value})} 
                className="bg-[#0f1115] border-[#2d3139] focus:ring-blue-500" 
                placeholder="Ex: SSD-240-KING"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Nome da Peça</Label>
              <Input 
                value={newItem.name || ''} 
                onChange={e => setNewItem({...newItem, name: e.target.value})} 
                className="bg-[#0f1115] border-[#2d3139] focus:ring-blue-500" 
                placeholder="Ex: SSD 240GB Kingston"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Categoria</Label>
              <Input 
                value={newItem.category || ''} 
                onChange={e => setNewItem({...newItem, category: e.target.value})} 
                className="bg-[#0f1115] border-[#2d3139]" 
                placeholder="Ex: Armazenamento"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Localização (Armário/Box)</Label>
              <Input 
                value={newItem.location || ''} 
                onChange={e => setNewItem({...newItem, location: e.target.value})} 
                className="bg-[#0f1115] border-[#2d3139]" 
                placeholder="Prateleira A2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Saldo Inicial</Label>
              <Input 
                type="number"
                value={newItem.quantity || ''} 
                onChange={e => setNewItem({...newItem, quantity: e.target.value === '' ? 0 : Number(e.target.value)})} 
                onFocus={(e) => e.target.select()}
                className="bg-[#0f1115] border-[#2d3139]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Qtd. Mínima (Aviso)</Label>
              <Input 
                type="number"
                value={newItem.minQuantity || ''} 
                onChange={e => setNewItem({...newItem, minQuantity: e.target.value === '' ? 0 : Number(e.target.value)})} 
                onFocus={(e) => e.target.select()}
                className="bg-[#0f1115] border-[#2d3139]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Preço de Custo (R$)</Label>
              <Input 
                type="number"
                value={newItem.costPrice || ''} 
                onChange={e => {
                  const cost = e.target.value === '' ? 0 : Number(e.target.value);
                  const margin = newItem.profitMargin || 0;
                  const final = Number((cost * (1 + margin / 100)).toFixed(2));
                  setNewItem({...newItem, costPrice: cost, price: final});
                }} 
                className="bg-[#0f1115] border-[#2d3139]" 
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Margem de Lucro (%)</Label>
              <Input 
                type="number"
                value={newItem.profitMargin || ''} 
                onChange={e => {
                  const margin = e.target.value === '' ? 0 : Number(e.target.value);
                  const cost = newItem.costPrice || 0;
                  const final = Number((cost * (1 + margin / 100)).toFixed(2));
                  setNewItem({...newItem, profitMargin: margin, price: final});
                }} 
                className="bg-[#0f1115] border-[#2d3139]" 
                placeholder="Ex: 30"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Preço de Venda (R$)</Label>
              <Input 
                type="number"
                value={newItem.price || ''} 
                onChange={e => {
                  const final = e.target.value === '' ? 0 : Number(e.target.value);
                  const cost = newItem.costPrice || 0;
                  let margin = newItem.profitMargin || 0;
                  if (cost > 0) {
                    margin = Number(((final / cost - 1) * 100).toFixed(2));
                  }
                  setNewItem({...newItem, price: final, profitMargin: margin});
                }} 
                onFocus={(e) => e.target.select()}
                className="bg-[#0f1115] border-[#2d3139] h-11 text-lg font-bold text-emerald-500" 
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Link da Imagem do Produto (URL)</Label>
              <Input 
                value={newItem.imageUrl || ''} 
                onChange={e => setNewItem({...newItem, imageUrl: e.target.value})} 
                className="bg-[#0f1115] border-[#2d3139] focus:ring-blue-500" 
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Observações Técnicas</Label>
              <Input 
                value={newItem.description || ''} 
                onChange={e => setNewItem({...newItem, description: e.target.value})} 
                className="bg-[#0f1115] border-[#2d3139]" 
              />
            </div>
          </div>
          <DialogFooter className="bg-[#0f1115]/50 p-6 -mx-6 -mb-6 border-t border-[#2d3139]">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-[#2d3139]">Cancelar</Button>
            <Button onClick={handleSaveItem} className="bg-[#3b82f6] hover:bg-[#2563eb] font-black uppercase italic tracking-tighter">Salvar no Inventário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog (Entry/Exit) */}
      <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-lg shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              {transactionType === 'entry' ? (
                <>
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><ArrowDownRight size={24} /></div>
                  Entrada de Peças
                </>
              ) : (
                <>
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><ArrowUpRight size={24} /></div>
                  Baixa de Estoque / Uso OS
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Item Selecionado</Label>
              <Select value={newTransaction.itemId} onValueChange={val => setNewTransaction({...newTransaction, itemId: val})}>
                <SelectTrigger className="bg-[#0f1115] border-[#2d3139] h-12">
                  <SelectValue placeholder="Selecione o item..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                  {inventory.map(item => (
                    <SelectItem key={item.id} value={item.id} className="focus:bg-[#3b82f6]/20">
                      <div className="flex justify-between items-center w-64">
                         <span className="font-bold">{item.name}</span>
                         <Badge variant="outline" className="text-[8px] font-mono opacity-60 border-[#2d3139] ml-2">Saldo: {item.quantity}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Quantidade ({transactionType === 'entry' ? 'Recebida' : 'Utilizada'})</Label>
                <Input 
                  type="number" 
                  value={newTransaction.quantity || ''} 
                  onChange={e => setNewTransaction({...newTransaction, quantity: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  className="bg-[#0f1115] border-[#2d3139] h-11 text-lg font-mono font-bold text-center" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">N. de Série / Lote (SN)</Label>
                <Input 
                  value={newTransaction.serialNumber} 
                  onChange={e => setNewTransaction({...newTransaction, serialNumber: e.target.value})} 
                  className="bg-[#0f1115] border-[#2d3139] h-11 font-mono tracking-tighter" 
                  placeholder="Ex: CN-02J-0F..."
                />
              </div>
            </div>

            {transactionType === 'exit' && (
              <div className="bg-[#0f1115]/30 p-4 rounded-xl border border-[#2d3139] space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Informações de Integração</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#71717a] text-[10px] uppercase font-bold">Vincular a</Label>
                    <Select value={newTransaction.referenceType} onValueChange={(val: any) => setNewTransaction({...newTransaction, referenceType: val, referenceId: ''})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="none">Nenhum vínculo</SelectItem>
                        <SelectItem value="os">Ordem de Serviço (OS)</SelectItem>
                        <SelectItem value="visit">Visita Técnica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newTransaction.referenceType !== 'none' && (
                    <div className="space-y-2">
                      <Label className="text-[#71717a] text-[10px] uppercase font-bold">Localizar #{newTransaction.referenceType.toUpperCase()}</Label>
                      <Select value={newTransaction.referenceId} onValueChange={val => setNewTransaction({...newTransaction, referenceId: val})}>
                        <SelectTrigger className="bg-[#0f1115] border-[#2d3139] overflow-hidden">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                          {newTransaction.referenceType === 'os' ? 
                            serviceOrders.slice(0, 50).map(os => <SelectItem key={os.id} value={os.id}>OS #{os.number} - {os.clientName}</SelectItem>) :
                            visits.slice(0, 50).map(v => <SelectItem key={v.id} value={v.id}>Visita #{v.number} - {v.clientName}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#a0a0a0] text-[10px] uppercase font-black">Justificativa / Motivo</Label>
              <Input 
                value={newTransaction.observations} 
                onChange={e => setNewTransaction({...newTransaction, observations: e.target.value})} 
                className="bg-[#0f1115] border-[#2d3139] font-medium" 
                placeholder="Ex: Troca de SSD em garantia ou Compra nota #123"
              />
            </div>
          </div>
          <DialogFooter className="bg-[#0f1115]/50 p-6 -mx-6 -mb-6 border-t border-[#2d3139]">
            <Button variant="outline" onClick={() => setIsTransactionOpen(false)} className="border-[#2d3139]">Cancelar</Button>
            <Button onClick={handleProcessTransaction} className={cn("font-black uppercase italic tracking-tighter", transactionType === 'entry' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600")}>
              Confirmar {transactionType === 'entry' ? 'Entrada' : 'Baixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white px-0 uppercase italic tracking-tighter">Excluir Item do Estoque?</DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">
              Esta ação não pode ser desfeita. O item <strong>{itemToDelete?.name}</strong> será removido permanentemente do registro de inventário.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139] text-[#a0a0a0]">Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteItem} className="bg-red-500 hover:bg-red-600 font-bold uppercase tracking-tighter italic">Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog (Specific Item or General) */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-3xl shadow-2xl border-l-4 border-l-purple-500">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <History className="text-purple-500" />
              {selectedItem ? `Rastreabilidade: ${selectedItem.name}` : 'Histórico Consolidado de Movimentações'}
            </DialogTitle>
            <DialogDescription className="text-[#71717a]">
              {selectedItem ? `Veja todas as entradas e saídas desta peça específica.` : 'Auditagem completa de todas as movimentações do estoque.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
             <ScrollArea className="h-[450px] pr-4">
                <TableDoubleScroll>
                  <Table>
                    <TableHeader className="bg-[#0f1115] sticky top-0 z-10">
                    <TableRow className="border-[#2d3139] hover:bg-transparent">
                      <TableHead className="text-[9px] uppercase font-black px-2 py-3">Data/Hora</TableHead>
                      {!selectedItem && <TableHead className="text-[9px] uppercase font-black px-2 py-3">Item</TableHead>}
                      <TableHead className="text-[9px] uppercase font-black px-2 py-3">Ação</TableHead>
                      <TableHead className="text-[9px] uppercase font-black text-center px-2 py-3">Qtd.</TableHead>
                      <TableHead className="text-[9px] uppercase font-black px-2 py-3">Ref Integ. / SN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => !selectedItem || t.itemId === selectedItem.id)
                      .map((t, idx) => {
                        const item = inventory.find(i => i.id === t.itemId);
                        let refDesc = 'Sem vínculo';
                        let refIcon = null;

                        if (t.referenceType === 'os') {
                          const os = serviceOrders.find(o => o.id === t.referenceId);
                          refDesc = os ? `OS #${os.number}` : 'OS Excluída';
                          refIcon = <FileText size={10} className="text-blue-400" />;
                        } else if (t.referenceType === 'visit') {
                          const v = visits.find(vis => vis.id === t.referenceId);
                          refDesc = v ? `Visita #${v.number}` : 'Visita Excluída';
                          refIcon = <CalendarIcon size={10} className="text-amber-400" />;
                        }
                        
                        return (
                          <TableRow key={idx} className="border-[#2d3139]/50 hover:bg-[#2d3139]/30 transition-colors">
                            <TableCell className="text-[10px] font-mono text-[#a0a0a0] leading-tight">
                              {format(t.timestamp?.toDate() || new Date(), "dd/MM/yy")}<br/>
                              <span className="opacity-50">{format(t.timestamp?.toDate() || new Date(), "HH:mm:ss")}</span>
                            </TableCell>
                            {!selectedItem && (
                              <TableCell className="text-[11px] font-bold text-white max-w-[120px] truncate">{item?.name || '---'}</TableCell>
                            )}
                            <TableCell>
                              <Badge className={cn("text-[8px] font-black tracking-tight border px-1 py-0 shadow-sm", t.type === 'entry' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20')}>
                                {t.type === 'entry' ? 'ENTRADA' : 'SAÍDA'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-mono font-bold text-sm">{t.quantity}</TableCell>
                            <TableCell className="text-[10px]">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 font-bold text-[#e0e0e0]">
                                  {refIcon}
                                  <span>{refDesc}</span>
                                </div>
                                {t.serialNumber && (
                                  <div className="flex items-center gap-1 text-[9px] text-blue-400 uppercase font-bold bg-blue-500/5 px-1 rounded ring-1 ring-blue-500/10 w-fit">
                                    <Shield size={8} />
                                    <span>SN: {t.serialNumber}</span>
                                  </div>
                                )}
                                {t.observations && <span className="text-[9px] text-[#71717a] italic mt-0.5 max-w-[150px] truncate">"{t.observations}"</span>}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    }
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={selectedItem ? 4 : 5} className="text-center py-16 text-[#71717a] italic">
                           <div className="flex flex-col items-center gap-2 opacity-30">
                             <History size={32} />
                             <span>Sem registros de movimentação para este item.</span>
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableDoubleScroll>
             </ScrollArea>
          </div>
          <DialogFooter className="border-t border-[#2d3139] pt-4 mt-2">
            <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-[#71717a] hover:text-white" onClick={() => setIsHistoryOpen(false)}>Fechar Histórico</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
