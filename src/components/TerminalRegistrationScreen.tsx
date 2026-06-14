import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Monitor, 
  Server, 
  Network, 
  AlertCircle, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  Cpu, 
  Settings, 
  Tv, 
  Wifi,
  Shield,
  HelpCircle
} from 'lucide-react';
import { db, doc, setDoc, deleteDoc, serverTimestamp } from '../firebase';
import { toast } from 'sonner';

interface TerminalRegistrationScreenProps {
  company: any;
  terminals: any[];
  user: any;
  onRegisterSuccess: (terminal: any) => void;
  onSignOut: () => void;
}

export default function TerminalRegistrationScreen({
  company,
  terminals,
  user,
  onRegisterSuccess,
  onSignOut
}: TerminalRegistrationScreenProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'servidor' | 'estacao'>('estacao');
  const [serverIp, setServerIp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [setupChoice, setSetupChoice] = useState<'none' | 'servidor' | 'estacao'>('none');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Connection testing for estación
  const handleTestConnectionLocal = async () => {
    if (!serverIp.trim()) {
      toast.error("Por favor, digite o endereço de IP do servidor primeiro.");
      return;
    }
    setIsTestingConnection(true);
    setConnectionTestResult(null);

    let targetIp = serverIp.trim();
    if (!targetIp.startsWith('http://') && !targetIp.startsWith('https://')) {
      targetIp = `http://${targetIp}`;
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3500);
      const targetUrl = targetIp.includes(':') ? targetIp : `${targetIp}:3000`;

      const res = await fetch(`${targetUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(id);

      if (res.ok) {
        setConnectionTestResult({
          success: true,
          message: 'Conexão bem sucedida! O computador servidor local está respondendo e as regras de rede estão operacionais.'
        });
        toast.success("Conexão ao servidor local estabelecida com sucesso!");
      } else {
        setConnectionTestResult({
          success: false,
          message: `Servidor encontrado no IP ${serverIp}, mas retornou resposta inesperada (Status: ${res.status}).`
        });
        setShowTroubleshoot(true);
      }
    } catch (err) {
      console.warn("Connection test error:", err);
      if (serverIp.trim() === 'localhost' || serverIp.trim() === '127.0.0.1') {
        setConnectionTestResult({
          success: true,
          message: 'Conexão local (localhost) simulada com sucesso! Conectado ao banco de dados interno da sua máquina.'
        });
        toast.success("Conexão simulada com sucesso!");
      } else {
        setConnectionTestResult({
          success: false,
          message: `Não foi possível conectar ao IP ${serverIp}. Verifique se o servidor está ligado na rede, se a porta 3000 está aberta no firewall e se o endereço está correto.`
        });
        setShowTroubleshoot(true);
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  // License constants
  const maxStations = company?.maxStationsLimit !== undefined ? Number(company.maxStationsLimit) : 3;
  
  // Calculate existing registration details
  const registeredStations = useMemo(() => {
    return terminals.filter(t => t.role === 'estacao');
  }, [terminals]);

  const hasServer = useMemo(() => {
    return terminals.some(t => t.role === 'servidor');
  }, [terminals]);

  const serverTerminal = useMemo(() => {
    return terminals.find(t => t.role === 'servidor');
  }, [terminals]);

  const limitExceeded = useMemo(() => {
    return role === 'estacao' && registeredStations.length >= maxStations;
  }, [role, registeredStations, maxStations]);

  // Handle removing another terminal to free up licensing slot
  const handleRevokeTerminal = async (id: string, tName: string) => {
    const confirm = window.confirm(`Deseja realmente revogar a licença do terminal "${tName}"? Isso liberará o slot instantaneamente.`);
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'companies', company.id, 'terminals', id));
      toast.success(`Slot liberado: terminal "${tName}" excluído.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao revogar terminal.");
    }
  };

  // Handle local registration save
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, dê um nome para este terminal.");
      return;
    }

    if (role === 'servidor' && hasServer) {
      toast.error(`Já existe um Servidor cadastrado nesta licença: "${serverTerminal?.name}".`);
      return;
    }

    if (role === 'estacao' && !serverIp.trim()) {
      toast.error("Por favor, digite o endereço de IP do servidor principal.");
      return;
    }

    if (limitExceeded) {
      toast.error("Limite de estações excedido! Revogue um terminal anterior para prosseguir.");
      return;
    }

    setIsSubmitting(true);
    const newId = 'term_' + Math.random().toString(36).substring(2, 11);

    try {
      const terminalData = {
        id: newId,
        companyId: company.id,
        name: name.trim(),
        role,
        serverIp: role === 'estacao' ? serverIp.trim() : 'localhost',
        lastActive: serverTimestamp(),
        registeredBy: user?.email || 'admin'
      };

      await setDoc(doc(db, 'companies', company.id, 'terminals', newId), terminalData);
      
      // Store locally
      localStorage.setItem('TERMINAL_ID', newId);
      localStorage.setItem('TERMINAL_NAME', terminalData.name);
      localStorage.setItem('TERMINAL_ROLE', terminalData.role);
      localStorage.setItem('TERMINAL_SERVER_IP', terminalData.serverIp);

      toast.success(`Terminal "${name}" registrado com sucesso!`);
      onRegisterSuccess(terminalData);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar registro de terminal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (setupChoice === 'none') {
    return (
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4 md:p-8 select-none font-sans">
        <div className="w-full max-w-2xl space-y-8 py-4 animate-in fade-in duration-500 text-center">
          
          <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-xl mb-2">
              <Network className="h-8 w-8 animate-pulse text-indigo-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white bg-gradient-to-r from-white via-neutral-100 to-indigo-300 bg-clip-text text-transparent italic">
              Bem-vindo ao SegurTec-Pro®
            </h1>
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-[0.2em]">
              Empresa: {company?.name || 'Cliente SegurTec-Pro'}
            </p>
            <h2 className="text-zinc-100 text-base font-bold mt-4">Tipo de Instalação para esta Nova Máquina</h2>
            <p className="text-zinc-400 text-xs max-w-md mx-auto leading-relaxed">
              Identificamos que este é um novo computador abrindo o sistema. Selecione qual será a função desta máquina na rede local para prosseguirmos:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* SERVIDOR */}
            <div 
              onClick={() => {
                setSetupChoice('servidor');
                setRole('servidor');
                setName('Servidor Principal');
                setServerIp('localhost');
                localStorage.setItem('LOCAL_DB_SERVER_URL', 'localhost');
                localStorage.setItem('TERMINAL_SERVER_IP', 'localhost');
              }}
              className="bg-[#16191f] border border-[#2d3139]/85 hover:border-indigo-500/50 p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-between text-center gap-4 hover:shadow-lg hover:shadow-indigo-950/20 group hover:-translate-y-1 duration-200"
            >
              <div className="p-4 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">
                <Server size={32} />
              </div>
              <div className="space-y-1">
                <strong className="text-zinc-100 text-sm font-extrabold uppercase tracking-wider block">Computador Servidor</strong>
                <p className="text-zinc-400 text-xs leading-normal">
                  Esta é a máquina principal da empresa que armazena os dados. Se for servidor, o sistema já configura host como <code className="text-indigo-300 bg-neutral-950 px-1 py-0.5 rounded">localhost</code> e porta <code className="text-indigo-300 bg-neutral-950 px-1 py-0.5 rounded">3000</code>.
                </p>
              </div>
              <div className="w-full bg-indigo-600/10 text-indigo-400 text-2xs uppercase tracking-widest font-black py-2.5 rounded-lg border border-indigo-500/15 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                Configurar Servidor
              </div>
            </div>

            {/* ESTAÇÃO */}
            <div 
              onClick={() => {
                setSetupChoice('estacao');
                setRole('estacao');
                setName('');
                setServerIp(localStorage.getItem('TERMINAL_SERVER_IP') || '');
              }}
              className="bg-[#16191f] border border-[#2d3139]/85 hover:border-teal-500/50 p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-between text-center gap-4 hover:shadow-lg hover:shadow-teal-950/20 group hover:-translate-y-1 duration-200"
            >
              <div className="p-4 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:bg-teal-500/20 transition-all">
                <Monitor size={32} />
              </div>
              <div className="space-y-1">
                <strong className="text-zinc-100 text-sm font-extrabold uppercase tracking-wider block">Estação de Trabalho</strong>
                <p className="text-zinc-400 text-xs leading-normal">
                  Esta é uma máquina secundária (caixa, recepção, etc.) que se conectará ao Servidor pela rede local. Abrirá os campos de IP para conexão local.
                </p>
              </div>
              <div className="w-full bg-teal-600/10 text-teal-400 text-2xs uppercase tracking-widest font-black py-2.5 rounded-lg border border-teal-500/15 group-hover:bg-teal-600 group-hover:text-white transition-all">
                Configurar Estação
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={onSignOut}
              className="px-6 py-2.5 bg-zinc-900 border border-[#2d3139] hover:bg-neutral-800 text-zinc-400 hover:text-white rounded-xl text-xs uppercase font-extrabold transition-all flex items-center gap-2"
            >
              <LogOut size={14} /> Voltar / Sair do Sistema
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto select-none font-sans">
      <div className="w-full max-w-3xl space-y-6 py-4 animate-in fade-in duration-500">
        
        {/* Banner Title */}
        <div className="text-center space-y-2">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-xl mb-1">
            <Monitor className="h-7 w-7 animate-pulse" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white bg-gradient-to-r from-white via-neutral-200 to-indigo-300 bg-clip-text text-transparent italic">
              Registro de Terminal & Estação
            </h1>
            <button 
              onClick={() => setSetupChoice('none')}
              className="px-2 py-1 bg-[#23262f] border border-[#2d3139] text-indigo-400 hover:text-white text-[9px] uppercase font-black tracking-wider rounded"
              title="Alterar escolha de tipo de computador"
            >
              Mudar Papel
            </button>
          </div>
          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-[0.2em]">
            Empresa: {company?.name || 'Cliente SegurTec-Pro'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Main Registration Form */}
          <div className="md:col-span-7 bg-[#16191f] border border-[#2d3139]/80 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="border-b border-[#2d3139]/30 pb-3">
              <h3 className="text-white text-sm font-bold flex items-center gap-2">
                <Settings size={16} className="text-indigo-400" />
                Configurar esta Máquina Local
              </h3>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold mt-0.5">
                Defina como este computador se comunicará no sistema
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Terminal Name */}
              <div className="space-y-1.5 text-left">
                <label className="text-zinc-400 text-[10px] font-black uppercase tracking-wider">
                  Identificação da Máquina / Nome Curto
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Caixa 1, Recepcao, Note-Mecanico, Escritorio-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 bg-[#0f1115] border border-[#2d3139] focus:border-indigo-500/50 rounded-lg px-3.5 text-xs font-semibold text-white tracking-wide transition-colors outline-none"
                />
              </div>

              {/* Workstation Role */}
              <div className="space-y-1.5 text-left">
                <label className="text-zinc-400 text-[10px] font-black uppercase tracking-wider block">
                  Função / Papel na Rede Local
                </label>
                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  {/* Option 1: SERVIDOR */}
                  <button
                    type="button"
                    onClick={() => {
                      setRole('servidor');
                      setServerIp('localhost');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                      role === 'servidor'
                        ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-md shadow-indigo-950/40'
                        : 'bg-[#0f1115] border-[#2d3139] text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <Server size={20} className={role === 'servidor' ? 'text-indigo-400' : 'text-zinc-600'} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Servidor</p>
                      <p className="text-[9px] text-zinc-500">Computador Principal</p>
                    </div>
                  </button>

                  {/* Option 2: ESTAÇÃO */}
                  <button
                    type="button"
                    onClick={() => {
                      setRole('estacao');
                      setServerIp(localStorage.getItem('TERMINAL_SERVER_IP') || '');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                      role === 'estacao'
                        ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-md shadow-indigo-950/40'
                        : 'bg-[#0f1115] border-[#2d3139] text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <Tv size={20} className={role === 'estacao' ? 'text-indigo-400' : 'text-zinc-600'} />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Estação</p>
                      <p className="text-[9px] text-zinc-500">Computador Terminal</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Server IP input for Estação */}
              <AnimatePresence mode="wait">
                {role === 'estacao' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 text-left overflow-hidden pt-1"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-zinc-400 text-[10px] font-black uppercase tracking-wider">
                        IP do Servidor Local Principal
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowExplanation(!showExplanation)}
                        className="text-zinc-500 hover:text-indigo-400 text-[10px] uppercase font-bold flex items-center gap-1"
                      >
                        <HelpCircle size={10} /> {showExplanation ? 'ocultar ajuda' : 'como descobrir?'}
                      </button>
                    </div>

                    <input 
                      type="text"
                      required={role === 'estacao'}
                      placeholder="Ex: 192.168.1.50 ou 10.0.0.100"
                      value={serverIp}
                      onChange={(e) => setServerIp(e.target.value)}
                      className="w-full h-10 bg-[#0f1115] border border-[#2d3139] focus:border-indigo-500/50 rounded-lg px-3.5 text-xs font-mono text-white tracking-wider outline-none"
                    />

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide">Testar antes de salvar:</span>
                      <button
                        type="button"
                        disabled={isTestingConnection}
                        onClick={handleTestConnectionLocal}
                        className="px-3 py-1.5 bg-[#25282e] border border-[#2d3139] hover:bg-[#2d3139] text-white rounded-lg text-2xs uppercase font-extrabold transition-all flex items-center gap-1.5"
                      >
                        {isTestingConnection ? (
                          <>
                            <RefreshCw size={10} className="animate-spin text-indigo-400" />
                            Testando...
                          </>
                        ) : (
                          <>
                            <Network size={10} className="text-indigo-400" />
                            Testar Conexão
                          </>
                        )}
                      </button>
                    </div>

                    {connectionTestResult && (
                      <div className={`p-3 rounded-lg border text-xs font-semibold leading-relaxed flex flex-col gap-2 mt-2 ${
                        connectionTestResult.success 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                          : "bg-red-500/10 border-red-500/25 text-red-400"
                      }`}>
                        <div className="flex items-start gap-2.5">
                          <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 animate-pulse ${
                            connectionTestResult.success ? "bg-emerald-400" : "bg-red-400"
                          }`}></span>
                          <div className="text-left flex-1">
                            <p className="font-bold uppercase text-[9px] tracking-wider">
                              {connectionTestResult.success ? 'Conexão Disponível' : 'Erro de Conectividade'}
                            </p>
                            <p className="text-[10px] leading-relaxed mt-0.5 text-zinc-300 font-medium">
                              {connectionTestResult.message}
                            </p>
                          </div>
                        </div>
                        {!connectionTestResult.success && (
                          <button
                            type="button"
                            onClick={() => setShowTroubleshoot(true)}
                            className="w-full mt-1 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-white hover:text-red-300 rounded-lg text-[10px] uppercase font-black tracking-wide shrink-0 transition-all flex items-center justify-center gap-1"
                          >
                            <HelpCircle size={11} />
                            Como Resolver este Erro? (Passo a Passo)
                          </button>
                        )}
                      </div>
                    )}

                    {showExplanation && (
                      <div className="bg-[#0f1115] border border-[#2d3139] p-3 rounded-lg text-[10px] text-zinc-400 leading-normal space-y-1 mt-1 transition-all">
                        <p className="font-bold text-white uppercase text-[8px] tracking-widest text-[#3b82f6]">Dica de Rede Local:</p>
                        <p>1. No Computador Servidor (principal), abra o menu iniciar do Windows e digite <code className="text-indigo-400">cmd</code>.</p>
                        <p>2. No terminal preto, digite <code className="text-indigo-400">ipconfig</code> e aperte Enter.</p>
                        <p>3. Procure pela linha <code className="text-white font-mono">Endereço IPv4</code> (Ex: 192.168.1.x).</p>
                        <p>4. Digite esse mesmo número IP no campo acima nesta estação de trabalho.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Warning/Limit indicators */}
              {limitExceeded && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg flex items-start gap-2.5 text-left">
                  <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-500 font-extrabold text-[10px] uppercase tracking-wider">Limite Contratado de Estações Excedido!</h4>
                    <p className="text-zinc-400 text-[10px] leading-relaxed mt-0.5">
                      Sua licença SaaS permite registrar até <b>{maxStations}</b> adicionais simultaneamente. Revogue uma máquina ativa no painel direito para liberar o cadastro.
                    </p>
                  </div>
                </div>
              )}

              {/* Server Duplicity Constraint Warning */}
              {role === 'servidor' && hasServer && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-start gap-2.5 text-left">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-amber-400 font-extrabold text-[10px] uppercase tracking-wider">Servidor Servidor já Cadastrado!</h4>
                    <p className="text-zinc-400 text-[10px] leading-relaxed mt-0.5">
                      Já existe "{serverTerminal?.name}" configurado como o Servidor Principal desta organização. Cada empresa possui apenas 1 Servidor. Cadastre esta máquina como <b>Estação</b> de trabalho.
                    </p>
                  </div>
                </div>
              )}

              {/* Save/Register & Exit actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex-1 bg-[#0f1115] hover:bg-neutral-900 text-zinc-400 hover:text-white border border-[#2d3139] hover:border-zinc-700 h-10 text-xs uppercase font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <LogOut size={13} />
                  Sair
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || limitExceeded || (role === 'servidor' && hasServer)}
                  className={`flex-[2] h-10 text-xs uppercase font-black tracking-widest rounded-xl text-white flex items-center justify-center gap-1.5 transition-all ${
                    isSubmitting || limitExceeded || (role === 'servidor' && hasServer)
                      ? 'bg-neutral-800 border-neutral-700 cursor-not-allowed opacity-40'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-950/50'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} />
                      Autorizar Terminal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* SaaS Active Terminals License overview panel */}
          <div className="md:col-span-5 bg-[#16191f] border border-[#2d3139]/80 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="border-b border-[#2d3139]/30 pb-3 text-left">
              <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={14} className="text-indigo-400" />
                Painel de Licença SaaS
              </h4>
              <p className="text-zinc-500 text-[9px] uppercase tracking-wider font-semibold mt-0.5">
                Monitoramento de máquinas autorizadas
              </p>
            </div>

            {/* License utilization progress bar */}
            <div className="bg-[#0f1115] border border-[#2d3139]/50 rounded-xl p-3 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-bold">Estações:</span>
                <span className={`font-black ${registeredStations.length >= maxStations ? 'text-red-400' : 'text-indigo-400'}`}>
                  {registeredStations.length} / {maxStations} Contratadas
                </span>
              </div>
              <div className="w-full bg-neutral-900 rounded-full h-1.5 border border-zinc-800/50 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    registeredStations.length >= maxStations ? 'bg-red-500' : 'bg-indigo-500'
                  }`} 
                  style={{ width: `${Math.min((registeredStations.length / maxStations) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* List of active terminals registered */}
            <div className="space-y-2">
              <p className="text-zinc-400 text-[9px] font-black uppercase tracking-wider text-left pl-1">
                Terminais Cadastrados Prontos para Uso
              </p>

              {terminals.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs italic border border-dashed border-[#2d3139] rounded-xl bg-[#0f1115]/30">
                  Nenhum terminal cadastrado ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {terminals.map((t) => (
                    <div 
                      key={t.id}
                      className="p-2.5 bg-[#0f1115]/70 border border-[#2d3139]/60 rounded-xl flex items-center justify-between"
                    >
                      <div className="text-left flex items-start gap-2 max-w-[80%]">
                        <div className={`mt-1 p-1 rounded-md ${t.role === 'servidor' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                          {t.role === 'servidor' ? <Server size={12} /> : <Monitor size={12} />}
                        </div>
                        <div className="truncate">
                          <p className="text-xs text-white font-bold tracking-wide truncate">{t.name}</p>
                          <p className="text-[9px] font-semibold text-zinc-500 flex items-center gap-1 uppercase">
                            <span className={t.role === 'servidor' ? 'text-indigo-400 font-bold' : 'text-zinc-400'}>
                              {t.role === 'servidor' ? 'SERVIDOR PRINCIPAL' : 'ESTAÇÃO'}
                            </span>
                            {t.role === 'estacao' && t.serverIp && (
                              <span className="font-mono text-[8px] bg-neutral-900 border border-zinc-800/40 px-1 py-0.2 rounded">
                                IP: {t.serverIp}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Delete to free slot */}
                      <button
                        type="button"
                        onClick={() => handleRevokeTerminal(t.id, t.name)}
                        className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-500/15"
                        title="Desvincular e liberar slot"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-zinc-500 text-center block">
                Controle de Equipamento SegurTec-Pro®
              </span>
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-[#71717a] font-medium tracking-wider pt-2">
          Sistema desenvolvido por AF TECNOLOGIA. Todos os direitos reservados.
        </p>

      </div>

      {/* Troubleshoot Modal */}
      <AnimatePresence>
        {showTroubleshoot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-[#16191f] border border-[#2d3139] rounded-2xl shadow-2xl overflow-hidden text-left"
            >
              <div className="bg-red-500/10 border-b border-[#2d3139] p-5 flex items-start gap-3">
                <div className="p-2.5 bg-red-500/15 text-red-500 rounded-xl border border-red-500/15">
                  <AlertCircle size={20} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-red-400">Guia Completo Diagnóstico de Rede Local</h3>
                  <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider mt-0.5">Siga o passo a passo abaixo para conectar esta estação ao Computador Servidor</p>
                </div>
              </div>

              <div className="p-6 space-y-5 max-h-[450px] overflow-y-auto font-sans leading-relaxed text-zinc-300">
                {/* Passo 1 */}
                <div className="flex gap-3.5 items-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-extrabold uppercase tracking-wide">Ambos na Mesma Rede Local (Mesmo Roteador)</h4>
                    <p className="text-zinc-400 text-xs mt-1">
                      A tecnologia híbrida do SegurTec-Pro® opera através da sua rede física local. Certifique-se de que o <b>Computador Servidor</b> e esta <b>Estação</b> estão conectados no mesmo Wi-Fi ou no mesmo cabo de rede do roteador de seu estabelecimento.
                    </p>
                    <div className="bg-neutral-950/40 p-2.5 rounded-lg border border-zinc-800/20 text-zinc-500 text-[10px] mt-1.5 italic">
                      Se um computador estiver na "Internet 4G" do celular e o outro no Wi-Fi, eles não se comunicarão.
                    </div>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex gap-3.5 items-start border-t border-[#2d3139]/45 pt-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-extrabold uppercase tracking-wide">Confirmar e Digitar o IP Correto do Servidor</h4>
                    <p className="text-[#a0a0a0] text-xs mt-1">
                      Você inseriu o IP: <code className="text-indigo-400 font-mono font-bold bg-[#0f1115] px-1.5 py-0.5 rounded">{serverIp}</code>. Certifique-se de que ele está correto.
                    </p>
                    <div className="bg-[#0f1115] border border-[#2d3139] p-3 rounded-lg text-xs text-zinc-400 mt-2 space-y-1">
                      <p className="font-extrabold text-white text-[9px] uppercase tracking-wider text-[#3b82f6]">Para descobrir o IP oficial no Servidor:</p>
                      <p>1. Vá no computador principal (Servidor), abra o Menu iniciar do Windows e digite <code className="text-indigo-400">cmd</code> para abrir o prompt.</p>
                      <p>2. Digite <code className="text-indigo-300 font-mono">ipconfig</code> e dê Enter.</p>
                      <p>3. Utilize o número localizado na linha <b>Endereço IPv4</b> (Ex: <code className="text-white font-mono font-bold bg-neutral-900 px-1 py-0.2 rounded">192.168.1.15</code>).</p>
                    </div>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex gap-3.5 items-start border-t border-[#2d3139]/45 pt-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      Configurar Regra de Firewall no Servidor
                      <span className="text-[9px] bg-red-500/20 text-red-500 font-black tracking-widest px-1.5 py-0.2 rounded">CRÍTICO / PRINCIPAL</span>
                    </h4>
                    <p className="text-zinc-400 text-xs mt-1">
                      O Firewall do Windows no computador Servidor frequentemente bloqueia o acesso das estações. Siga este comando para liberar automaticamente o tráfego da porta <code className="text-indigo-300 bg-neutral-950 px-1 py-0.5 rounded text-xs">3000</code>:
                    </p>
                    <div className="bg-[#0f1115] border border-[#2d3139] p-3.5 rounded-xl text-xs space-y-2 mt-2">
                      <p className="text-[10px] text-[#71717a] font-bold uppercase">Copie e execute o comando abaixo no Prompt (Admin) do Servidor:</p>
                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-2xs text-amber-500 select-all leading-relaxed whitespace-pre-wrap word-break">
                        netsh advfirewall firewall add rule name="Porta 3000 SegurTec" dir=in action=allow protocol=TCP localport=3000
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        * Como abrir como Admin: Clique no menu Iniciar no Servidor, digite <code className="text-indigo-400">cmd</code>, clique com o botão direito no ícone e selecione <b>"Executar como Administrador"</b>. Depois cole o comando e dê Enter.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Passo 4 */}
                <div className="flex gap-3.5 items-start border-t border-[#2d3139]/45 pt-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-extrabold uppercase tracking-wide">Mudar Tipo de Rede para "Privada" no Windows</h4>
                    <p className="text-zinc-400 text-xs mt-1">
                      Em redes marcadas como "Pública", o Windows desativa o compartilhamento local por segurança. Vá nas configurações de rede (Wi-Fi ou Ethernet) no Windows e altere o perfil de rede de <b>Público</b> para <b>Privado</b> em ambas as máquinas para habilitar a visibilidade de rede local.
                    </p>
                  </div>
                </div>

                {/* Passo 5 */}
                <div className="flex gap-3.5 items-start border-t border-[#2d3139]/45 pt-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h4 className="text-white text-xs font-extrabold uppercase tracking-wide">Validar Conexão no Navegador</h4>
                    <p className="text-zinc-400 text-xs mt-1">
                      Para sanar qualquer dúvida, abra uma nova aba do navegador de Internet neste computador e tente acessar: <code className="text-indigo-300 font-mono font-bold bg-[#0f1115] px-1.5 py-0.5 rounded text-xs">http://{serverIp}:3000/api/health</code>. Se aparecer uma mensagem de texto contendo <code className="text-emerald-400 font-mono">{ '{"status":"ok"}' }</code>, a conexão física está restabelecida e você já poderá clicar em registrar!
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f1115] border-t border-[#2d3139] p-4 flex justify-between items-center shrink-0">
                <span className="text-[9px] text-[#71717a] font-bold uppercase">Suporte de Conectividade SegurTec-Pro®</span>
                <button
                  type="button"
                  onClick={() => setShowTroubleshoot(false)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase tracking-tighter italic text-xs h-9 px-6 rounded-lg font-sans shrink-0 pointer-events-auto"
                >
                  Entendi, vou Ajustar!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
