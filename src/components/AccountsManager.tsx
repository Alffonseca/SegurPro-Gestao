import React, { useState, useEffect, useMemo } from 'react';
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
    try {
      // 1. Update status in payables
      await updateDoc(doc(db, 'payables', selectedPayable.id), {
        status: 'Pago',
        paymentDate: payDate,
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : ''
      });

      // 2. Add despesa to cash flow (financial)
      await addDoc(collection(db, 'financial'), {
        companyId,
        type: 'Despesa',
        category: selectedPayable.category || 'Contas a Pagar',
        description: `Inclusão de Baixa: ${selectedPayable.description} (${selectedPayable.supplierName})`,
        value: Number(selectedPayable.value),
        date: payDate,
        origin: 'Contas a Pagar',
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : '',
        createdAt: Timestamp.now()
      });

      toast.success('Pagamento baixado e lançado no caixa!');
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
      
      const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [filteredPayablesByPeriod, searchTerm, statusFilter]);

  // Dash details
  const stats = useMemo(() => {
    const totalMonth = filteredPayablesByPeriod.reduce((acc, p) => acc + (p.status === 'Pago' ? 0 : Number(p.value || 0)), 0);
    const totalPaid = filteredPayablesByPeriod.reduce((acc, p) => acc + (p.status === 'Pago' ? Number(p.value || 0) : 0), 0);
    const totalPendingCount = filteredPayablesByPeriod.filter(p => p.status === 'Pendente').length;
    return { totalMonth, totalPaid, totalPendingCount };
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
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md">
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
        <CardContent>
          {filteredPayables.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
              <Building2 className="text-[#2d3139] h-12 w-12 mb-3" />
              <p className="text-xs font-bold text-white uppercase">Nenhuma conta encontrada</p>
              <p className="text-[11px] text-[#71717a] mt-1">Crie listagens de despesas para acompanhar suas liquidações e caixa em {currentMonthYearStr}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#2d3139]/60 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
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
                  {filteredPayables.map((p) => (
                    <tr key={p.id} className="hover:bg-[#2d3139]/10 transition-colors">
                      <td className="p-4 font-semibold text-white flex items-center gap-2">
                        <Building2 size={12} className="text-gray-400" />
                        {p.supplierName}
                      </td>
                      <td className="p-4 text-gray-300">
                        <div>{p.description}</div>
                        {p.notes && <p className="text-[10px] text-gray-500 font-mono mt-0.5">{p.notes}</p>}
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
                          {p.status === 'Pendente' && (
                            <Button
                              onClick={() => {
                                setSelectedPayable(p);
                                setPayDate(format(new Date(), 'yyyy-MM-dd'));
                                if (pixSettings?.accounts?.length > 0) {
                                  setPixAccountId(pixSettings.accounts[0].id);
                                } else {
                                  setPixAccountId('');
                                }
                                setIsPayOpen(true);
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white font-bold h-7 px-2.5 text-[10px] uppercase.tracking-wider"
                              title="Dar Baixa (Pago)"
                            >
                              <Check size={12} className="mr-1" />
                              Baixar
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md">
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
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase text-green-400 italic">Quitar Documento</DialogTitle>
            <DialogDescription className="text-xs text-[#a0a0a0]">Confirme os dados de fechamento financeiro.</DialogDescription>
          </DialogHeader>
          {selectedPayable && (
            <form onSubmit={handleMarkAsPaid} className="space-y-4 pt-2">
              <div className="p-3.5 bg-[#0f1115] border border-[#2d3139] rounded-xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Favorecido</p>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedPayable.supplierName}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Valor de Desembolso</p>
                <p className="text-lg font-black text-red-400 mt-0.5 font-mono">R$ {Number(selectedPayable.value).toFixed(2)}</p>
              </div>
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
              <DialogFooter>
                <Button type="submit" className="bg-green-500 hover:bg-green-600 font-mono font-bold w-full uppercase text-xs">REGISTRAR BAIXA</Button>
              </DialogFooter>
            </form>
          )}
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
}

export function ReceivableManager({ companyId, clients = [], pixSettings }: ReceivableManagerProps) {
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
      await updateDoc(doc(db, 'receivables', selectedReceivable.id), {
        description,
        value: Number(value),
        dueDate,
        clientName: clientNameInput,
        category,
        notes
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
    try {
      // 1. Update receivables state inside firebase
      await updateDoc(doc(db, 'receivables', selectedReceivable.id), {
        status: 'Pago',
        paymentDate: payDate,
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : ''
      });

      // 2. Add receipt/revenue entry inside our cash-book (financials)
      await addDoc(collection(db, 'financial'), {
        companyId,
        type: 'Receita',
        category: selectedReceivable.category || 'Contas a Receber',
        description: `Recebimento Pago: ${selectedReceivable.description} (${selectedReceivable.clientName})`,
        value: Number(selectedReceivable.value),
        date: payDate,
        origin: 'Contas a Receber',
        paymentMethod,
        pixAccountId: paymentMethod === 'PIX' ? pixAccountId : '',
        createdAt: Timestamp.now()
      });

      toast.success('Recebimento liquidado e registrado no fluxo de caixa!');
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

      // Check if there is ALREADY a receivable in receivables for this client during this referenceMonth
      const checkReceivable = receivables.find(r => 
        (r.clientId === client.id || (r.clientName || '').toLowerCase() === (client.name || '').toLowerCase()) &&
        r.referenceMonth === currentMonthYearStr
      );

      return {
        client,
        value: isContractVal,
        paymentDay: paymentDay,
        dueDate: isoDueDate,
        provisioned: !!checkReceivable,
        receivableRecordId: checkReceivable?.id,
        isPaid: checkReceivable?.status === 'Pago'
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
      const saveStatus = isCurrentOrPastMonth ? 'Pago' : 'Pendente';
      const payDateVal = isCurrentOrPastMonth ? format(new Date(), 'yyyy-MM-dd') : '';

      await addDoc(collection(db, 'receivables'), {
        companyId,
        clientId: item.client?.id || item.clientId || '',
        clientName: item.client?.name || item.clientName,
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
          description: `Mensalidade Recebida (Auto): ${item.client?.name || item.clientName} - Ref ${currentMonthYearStr}`,
          value: Number(item.value || 0),
          date: payDateVal,
          origin: 'Contas a Receber',
          paymentMethod: 'PIX',
          createdAt: Timestamp.now()
        });
        toast.success(`Mensalidade de ${item.client?.name || item.clientName} lançada como PAGO e integrada ao fluxo de caixa!`);
      } else {
        toast.success(`Mensalidade de ${item.client?.name || item.clientName} lançada como PENDENTE no contas a receber!`);
      }
    } catch (err) {
      toast.error('Erro ao lançar plano.');
      console.error(err);
    }
  };

  const handleDirectReceiveContractOnly = async (item: any) => {
    try {
      // 1. Create a Paid Receivable object instantly inside receivables
      await addDoc(collection(db, 'receivables'), {
        companyId,
        clientId: item.client?.id || item.clientId || '',
        clientName: item.client?.name || item.clientName,
        description: `Mensalidade Contrato - Ref ${currentMonthYearStr}`,
        value: Number(item.value || 0),
        dueDate: item.dueDate,
        category: 'Contrato',
        status: 'Pago',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        isContractPrediction: true,
        referenceMonth: currentMonthYearStr,
        createdAt: Timestamp.now()
      });

      // 2. Launch in finances immediately as Revenue
      await addDoc(collection(db, 'financial'), {
        companyId,
        type: 'Receita',
        category: 'Contrato',
        description: `Mensalidade Recebida: ${item.client?.name || item.clientName} - Ref ${currentMonthYearStr}`,
        value: Number(item.value || 0),
        date: format(new Date(), 'yyyy-MM-dd'),
        origin: 'Contas a Receber',
        paymentMethod: 'PIX',
        createdAt: Timestamp.now()
      });

      toast.success(`Baixa efetuada com sucesso! Recebimento do de ${item.client?.name || item.clientName} lançado no financeiro.`);
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
        return r.status === 'Pendente';
      }
      return true;
    });
  }, [combinedReceivables, searchTerm, statusFilter]);

  // General dashboard stats inside receivables page - based on dynamically combined list for accurate totals
  const stats = useMemo(() => {
    const pendingItems = combinedReceivables.filter(r => r.status === 'Pendente');
    const totalMonth = pendingItems.reduce((acc, r) => acc + Number(r.value || 0), 0);
    const totalReceived = combinedReceivables
      .filter(r => r.status === 'Pago')
      .reduce((acc, r) => acc + Number(r.value || 0), 0);
    
    return {
      totalMonth,
      totalReceived,
      totalPendingCount: pendingItems.length
    };
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
      (c.name || '').toLowerCase() === (clientName || '').toLowerCase()
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
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md">
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
                <div className="grid grid-cols-2 gap-4">
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
          <CardContent>
            {filteredCombinedReceivables.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
                <User className="text-[#2d3139] h-12 w-12 mb-3" />
                <p className="text-xs font-bold text-white uppercase">Nenhum recebível cadastrado</p>
                <p className="text-[11px] text-[#71717a] mt-1">Nenhum direito a receber para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#2d3139]/60 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
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
                      const dayInfo = getDueDaysInfo(r.dueDate, r.status);
                      return (
                        <tr key={r.id} className="hover:bg-[#2d3139]/10 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <User size={12} className="text-[#a0a0a0]" />
                              <span className="uppercase">{r.clientName}</span>
                            </div>
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border mt-1 inline-block ${
                              typeLabel === 'Contrato' 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' 
                                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25'
                            }`}>
                              {typeLabel === 'Contrato' ? 'CONTRATO MENSAL' : 'SERVIÇO / AVULSO'}
                            </span>
                          </td>
                          <td className="p-4 text-gray-300">
                            <div className="font-medium">{r.description}</div>
                            <div className="flex gap-1.5 items-center mt-1">
                              <Badge className="bg-green-400/5 text-green-400 border border-green-500/10 text-[8px] uppercase px-1.5 py-0.5 font-bold">{r.category}</Badge>
                              {r.referenceMonth && <span className="text-[8px] text-blue-300 font-extrabold bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">Ref: {r.referenceMonth}</span>}
                            </div>
                            {r.notes && <p className="text-[10px] text-gray-500 font-mono mt-1 italic">{r.notes}</p>}
                          </td>
                          <td className="p-4 font-mono font-bold text-green-400 text-sm">
                            R$ {Number(r.value).toFixed(2)}
                          </td>
                          <td className="p-4 text-gray-400 font-mono">
                            {r.dueDate ? format(safeParseDate(r.dueDate), 'dd/MM/yyyy') : 'N/A'}
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border inline-block ${dayInfo.color}`}>
                              {dayInfo.label}
                            </span>
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
                                  {r.status === 'Pendente' && (
                                    <Button
                                      onClick={() => {
                                        setSelectedReceivable(r);
                                        setPayDate(format(new Date(), 'yyyy-MM-dd'));
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
                                  <Button
                                    onClick={() => {
                                      setSelectedReceivable(r);
                                      setDescription(r.description || '');
                                      setValue(String(r.value));
                                      setDueDate(r.dueDate || '');
                                      setClientNameInput(r.clientName || '');
                                      setCategory(r.category || 'Mensalidade');
                                      setNotes(r.notes || '');
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
              </div>
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
          <CardContent>
            {contractPredictions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
                <AlertCircle className="text-blue-400 h-10 w-10 mb-3" />
                <p className="text-xs font-bold text-white uppercase">Nenhum contrato recorrente registrado</p>
                <p className="text-[11px] text-[#71717a] mt-1">Atribua o tipo "Contrato" com "Valor Mensal" e "Dia de Vencimento" para um ou mais clientes no cadastro de clientes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#2d3139]/60 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0f1115] border-b border-[#2d3139] text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                      <th className="p-4">Cliente de Contrato</th>
                      <th className="p-4">Dia Preferível</th>
                      <th className="p-4">Vencimento Planejado</th>
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
                        <td className="p-4 text-gray-400 font-mono">
                          {format(safeParseDate(cp.dueDate), 'dd/MM/yyyy')}
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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-md">
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
            <div className="grid grid-cols-2 gap-4">
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
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-md font-black uppercase text-green-400 italic">Registrar Recebimento</DialogTitle>
            <DialogDescription className="text-xs text-[#a0a0a0]">Confirme os dados de entrada de caixa.</DialogDescription>
          </DialogHeader>
          {selectedReceivable && (
            <form onSubmit={handleMarkAsReceived} className="space-y-4 pt-2">
              <div className="p-3.5 bg-[#0f1115] border border-[#2d3139] rounded-xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Devedor (Cliente)</p>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedReceivable.clientName}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Valor de Entrada</p>
                <p className="text-lg font-black text-green-400 mt-0.5 font-mono">R$ {Number(selectedReceivable.value).toFixed(2)}</p>
              </div>
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
              <DialogFooter>
                <Button type="submit" className="bg-green-500 hover:bg-green-600 font-mono font-bold w-full uppercase text-xs">CONFIRMAR RECEBIMENTO</Button>
              </DialogFooter>
            </form>
          )}
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
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
              <ShoppingCart className="text-[#2d3139] h-12 w-12 mb-3" />
              <p className="text-xs font-bold text-white uppercase">Nenhuma venda encontrada</p>
              <p className="text-[11px] text-[#71717a] mt-1">Realize vendas rápidas no módulo PDV para povoar este histórico real.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#2d3139]/60 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
