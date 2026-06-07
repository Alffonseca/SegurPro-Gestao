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

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto select-none font-sans">
      <div className="w-full max-w-3xl space-y-6 py-4 animate-in fade-in duration-500">
        
        {/* Banner Title */}
        <div className="text-center space-y-2">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-xl mb-1">
            <Monitor className="h-7 w-7 animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white bg-gradient-to-r from-white via-neutral-200 to-indigo-300 bg-clip-text text-transparent italic">
            Registro de Terminal & Estação
          </h1>
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

      </div>
    </div>
  );
}
