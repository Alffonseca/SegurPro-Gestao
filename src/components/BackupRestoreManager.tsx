import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Clock, 
  Trash2, 
  ShieldAlert, 
  Check, 
  Save, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  db,
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot,
  Timestamp 
} from '../firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';

const reconstructTimestamps = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(reconstructTimestamps);
  }
  
  if (typeof obj === 'object') {
    if (typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number' && Object.keys(obj).length <= 3) {
      return new Timestamp(obj.seconds, obj.nanoseconds);
    }
    
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = reconstructTimestamps(obj[key]);
    }
    return newObj;
  }
  
  return obj;
};

interface BackupRestoreManagerProps {
  appSettings: any;
  companyId: string;
  isSuperAdmin: boolean;
  currentUserData: any;
  key?: string;
}

export function BackupRestoreManager({ appSettings, companyId, isSuperAdmin, currentUserData }: BackupRestoreManagerProps) {
  const [selectedBackupCollections, setSelectedBackupCollections] = useState<string[]>([
    'companies', 'clients', 'visits', 'receipts', 'financial', 'budgets', 'users',
    'suppliers', 'serviceOrders', 'inventory', 'inventoryTransactions', 'logs', 'laudos',
    'payables', 'receivables'
  ]);

  const [restorePoints, setRestorePoints] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreatingPoint, setIsCreatingPoint] = useState(false);
  const [pointDescription, setPointDescription] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BACKUP_COLLECTIONS_LABELS: { [key: string]: string } = {
    companies: "Dados/Conf. da Empresa",
    users: "Equipe e Usuários",
    clients: "Clientes",
    visits: "Visitas Técnicas",
    serviceOrders: "Ordens de Serviço (O.S.)",
    budgets: "Orçamentos",
    laudos: "Laudos Técnicos",
    receipts: "Recibos e Comprovantes",
    financial: "Financeiro e Lançamentos",
    inventory: "Produtos no Estoque",
    inventoryTransactions: "Movimentações de Estoque",
    suppliers: "Fornecedores",
    payables: "Contas a Pagar",
    receivables: "Contas a Receber",
    logs: "Registros de Logs/Auditoria"
  };

  // Safe date formatting helper to avoid date format crash on undefined/invalid dates
  const safeFormatRestoreDate = (dateVal: any, formatPattern: string): string => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'N/A';
      return format(d, formatPattern);
    } catch (e) {
      return 'N/A';
    }
  };

  // Real-time subscription to cloud restore points for visual feed
  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, 'companies', companyId, 'restore_points'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const points: any[] = [];
      snapshot.forEach((docSnap) => {
        points.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newer first safely
      points.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setRestorePoints(points);
    }, (err) => {
      console.error("Error reading restore points:", err);
    });
    return () => unsubscribe();
  }, [companyId]);

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

  // Helper code to capture current collection snapshot
  const fetchCurrentDataset = async (selectedCols: string[]) => {
    const backupData: any = { 
      companyName: appSettings?.companyName || 'Empresa', 
      companyId, 
      documentNumber: appSettings?.document || '', 
      exportedAt: new Date().toISOString(), 
      data: {} 
    };

    const collections = [
      'companies', 'clients', 'visits', 'receipts', 'financial', 'budgets', 'users',
      'suppliers', 'serviceOrders', 'inventory', 'inventoryTransactions', 'logs', 'laudos',
      'payables', 'receivables'
    ].filter(col => selectedCols.includes(col));
    
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
    return backupData;
  };

  // 1. Local JSON Download Backup
  const handleDownloadBackup = async () => {
    if (selectedBackupCollections.length === 0) {
      toast.warning("Selecione pelo menos um módulo/dados para exportar!");
      return;
    }
    setIsBackingUp(true);
    try {
      const backupData = await fetchCurrentDataset(selectedBackupCollections);
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${(appSettings?.companyName || 'dados').replace(/\s+/g, '_')}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Backup local JSON gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar backup local.");
    } finally {
      setIsBackingUp(false);
    }
  };

  // 2. Restore JSON File
  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (selectedBackupCollections.length === 0) {
      toast.warning("Selecione pelo menos um módulo para restaurar!");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const confirmRestore = window.confirm("ATENÇÃO: Restaurar um backup substituirá os dados atuais correspondentes. Deseja continuar?");
    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backup = reconstructTimestamps(JSON.parse(text));
      await performRestore(backup, selectedBackupCollections);
      toast.success("Restaurado com sucesso a partir de arquivo JSON!");
    } catch (error: any) {
      console.error(error);
      toast.error(`Erro na restauração: ${error.message || 'Formato de arquivo inválido'}`);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Create Cloud Instant Point ("Ponto de Restauração")
  const handleCreateRestorePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointDescription.trim()) {
      toast.error("Insira uma descrição curta para o ponto de restauração.");
      return;
    }
    
    setIsCreatingPoint(true);
    try {
      toast.loading("Compilando e gerando snapshot de segurança...", { id: 'bkp-cloud' });
      const fullDataset = await fetchCurrentDataset(Object.keys(BACKUP_COLLECTIONS_LABELS));
      
      const pointDoc = {
        description: pointDescription.trim(),
        createdAt: new Date().toISOString(),
        createdBy: currentUserData?.name || 'Administrador',
        data: fullDataset.data
      };

      await addDoc(collection(db, 'companies', companyId, 'restore_points'), pointDoc);
      toast.success("Ponto de restauração em nuvem criado com sucesso!", { id: 'bkp-cloud' });
      setPointDescription('');
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao registrar ponto de restauração na nuvem.", { id: 'bkp-cloud' });
    } finally {
      setIsCreatingPoint(false);
    }
  };

  // 4. Restore from Cloud Point
  const handleRestoreFromCloudPoint = async (point: any) => {
    const isConfirmed = window.confirm(`ATENÇÃO CRÍTICA: Deseja realmente restaurar o ponto "${point.description}" criado em ${safeFormatRestoreDate(point.createdAt, 'dd/MM/yyyy HH:mm')} por ${point.createdBy}? Todos os dados atuais do sistema serão substituídos.`);
    if (!isConfirmed) return;

    setIsRestoring(true);
    try {
      toast.loading("Restaurando os dados e aplicando rollback...", { id: 'restore-cloud' });
      const backupWrapper = { data: point.data };
      await performRestore(backupWrapper, Object.keys(BACKUP_COLLECTIONS_LABELS));
      toast.success("Sistema revertido com sucesso para o ponto selecionado!", { id: 'restore-cloud' });
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao restaurar ponto de restauração: ${err.message}`, { id: 'restore-cloud' });
    } finally {
      setIsRestoring(false);
    }
  };

  // 5. Delete Cloud Point
  const handleDeleteCloudPoint = async (pointId: string) => {
    const isConfirmed = window.confirm("Deseja excluir permanentemente este ponto de restauração do servidor?");
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'companies', companyId, 'restore_points', pointId));
      toast.success("Ponto de restauração excluído.");
    } catch (err: any) {
      toast.error("Erro ao excluir.");
    }
  };

  // Core restoration execution
  const performRestore = async (backup: any, allowedCollections: string[]) => {
    if (!backup.data) {
      throw new Error("Formato de backup inválido: falta tag de dados.");
    }

    const collections = Object.keys(backup.data).filter(col => allowedCollections.includes(col));
    if (collections.length === 0) {
      throw new Error("Nenhum dado correspondente encontrado.");
    }

    for (const col of collections) {
      const docs = backup.data[col];
      if (!Array.isArray(docs)) continue;

      for (const item of docs) {
        const { id: itemId, generalSettings, pixSettings, permissionsSettings, sales, ...data } = item;
        const targetId = (col === 'companies') ? companyId : itemId;

        if (col !== 'companies') {
          data.companyId = companyId;
        }

        // Restore main fields
        await setDoc(doc(db, col, targetId), data);

        // Subcollections settings restoration
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
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic text-[#3b82f6] flex items-center gap-3">
          <Database size={28} />
          Backup e Restauração
        </h2>
        <p className="text-[#a0a0a0] text-sm uppercase tracking-[0.2em] font-medium">Salvaguarda local, importações de dados e pontos de restauração em Nuvem.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Traditional Export / Import */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-[#1a1d23] border-[#2d3139] text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-white uppercase italic">
                <Download className="text-[#3b82f6] h-5 w-5" />
                Backup Local (Arquivo JSON)
              </CardTitle>
              <CardDescription className="text-xs text-[#71717a]">
                Exporte uma cópia compacta dos seus dados em formato JSON ou restaure arquivos gerados anteriormente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Modules selection */}
              <div className="border border-[#2d3139]/80 rounded-xl p-4 bg-[#0f1115]/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-2 border-b border-[#2d3139]/40">
                  <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-wider">
                    Módulos Selecionados para Backup / Restauração
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
                        className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer select-none ${
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button 
                  onClick={handleDownloadBackup} 
                  disabled={isBackingUp || isRestoring}
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white border border-transparent h-11 text-[11px] font-black tracking-wide uppercase"
                >
                  {isBackingUp ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Download size={14} className="mr-2" />}
                  Exportar Backup JSON
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
                    className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-white h-11 text-[11px] font-black tracking-wide uppercase"
                  >
                    {isRestoring ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Upload size={14} className="mr-2" />}
                    Importar Backup JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1a1d23]/60 border-[#2d3139] text-white p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-yellow-500 mt-1 flex-shrink-0" size={18} />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Atenção ao Restaurar!</h4>
                <p className="text-[11px] text-[#71717a] leading-relaxed">
                  A importação substituirá os documentos que coincidirem com as chaves existentes no backup. É altamente recomendável criar um Ponto de Restauração em Nuvem antes de realizar qualquer alteração maciça de arquivos.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Cloud Restore Points (Instant rollbacks) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-[#1a1d23] border-[#2d3139] text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-white uppercase italic">
                <Sparkles className="text-cyan-400 h-5 w-5 animate-pulse" />
                Pontos de Restauração em Nuvem
              </CardTitle>
              <CardDescription className="text-xs text-[#71717a]">
                Salve o estado completo do seu banco de dados diretamente no servidor em um clique para reversões instantâneas de segurança.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Form to create current point */}
              <form onSubmit={handleCreateRestorePoint} className="space-y-3 pb-4 border-b border-[#2d3139]/40">
                <div className="space-y-1.5">
                  <Label htmlFor="pt-desc" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Identificação do Ponto</Label>
                  <Input 
                    id="pt-desc"
                    placeholder="Ex: Antes de alterar preços do estoque"
                    value={pointDescription}
                    onChange={e => setPointDescription(e.target.value)}
                    disabled={isCreatingPoint || isRestoring}
                    className="bg-[#0f1115] border-[#2d3139] text-white text-xs h-9"
                  />
                </div>
                <Button 
                  type="submit"
                  disabled={isCreatingPoint || isRestoring || !pointDescription.trim()}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-white h-9 text-[10px] font-black tracking-wider uppercase"
                >
                  {isCreatingPoint ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                  Salvar Estado Atual na Nuvem
                </Button>
              </form>

              {/* Feed of restore points */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Linha do Tempo de Instâncias Salvas</span>
                
                {restorePoints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-[#0f1115]/50 rounded-xl border border-dashed border-[#2d3139] text-center">
                    <Clock className="text-[#2d3139] h-8 w-8 mb-2" />
                    <p className="text-[11px] text-[#71717a]">Nenhum ponto de restauração salvo no servidor ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 bento-scrollbar">
                    {restorePoints.map((pt) => (
                      <div 
                        key={pt.id} 
                        className="flex items-center justify-between gap-3 p-3 bg-[#0f1115]/80 hover:bg-[#0f1115] rounded-xl border border-[#2d3139] transition-all group"
                      >
                        <div className="space-y-1 flex-1 overflow-hidden">
                          <p className="text-xs font-bold text-white uppercase truncate tracking-tight">{pt.description}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-[#71717a]">
                            <span>{safeFormatRestoreDate(pt.createdAt, 'dd/MM/yyyy HH:mm:ss')}</span>
                            <span>•</span>
                            <span className="text-gray-400 italic font-mono truncate">{pt.createdBy}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button 
                            onClick={() => handleRestoreFromCloudPoint(pt)}
                            disabled={isRestoring || isCreatingPoint}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-cyan-400 hover:text-white hover:bg-cyan-500/20 border border-[#2d3139]/40 rounded-lg"
                            title="Restaurar este ponto"
                          >
                            <RotateCcw size={14} />
                          </Button>
                          <Button 
                            onClick={() => handleDeleteCloudPoint(pt.id)}
                            disabled={isRestoring || isCreatingPoint}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#71717a] hover:text-red-400 hover:bg-red-500/10 border border-[#2d3139]/40 rounded-lg"
                            title="Excluir do servidor"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
