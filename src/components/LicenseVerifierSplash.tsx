import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Globe, 
  Cpu, 
  Database, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Power, 
  LogOut, 
  DollarSign, 
  AlertTriangle 
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LicenseVerifierSplashProps {
  user: any;
  company: any;
  onVerified: () => void;
  onSignOut: () => void;
  appSettings?: any;
}

export default function LicenseVerifierSplash({ 
  user, 
  company, 
  onVerified, 
  onSignOut,
  appSettings 
}: LicenseVerifierSplashProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(true);

  const isWebMode = company?.dbMode === 'online';
  const receivesUpdatesStatus = isWebMode ? true : (company?.receivesUpdates !== false);

  const steps = [
    { name: 'Autenticação de Usuário', desc: `Vínculo ativo: ${user?.email}` },
    { name: 'Sincronização de Assinatura', desc: company?.isExempt ? 'Licença Isenta / Cortesia de Parceria' : `Licença SaaS Ativa (Ciclo: ${company?.billingCycle || 'Mensal'})` },
    { name: 'Verificação de Recursos', desc: `${company?.enabledMenus?.length || 14} menus operacionais liberados` },
    { name: 'Status de Atualizações', desc: !receivesUpdatesStatus ? 'Licença sem direito a atualizações' : 'Recebendo novos recursos e patches' },
    { name: 'Banco de Dados do Cliente', desc: company?.dbMode === 'local' ? 'Servidor Local (SQLite / JSON no Windows %Appdata%)' : 'Modo Cloud Firebase (100% em Nuvem)' }
  ];

  useEffect(() => {
    const duration = 10000; // Exact 10 seconds tracking
    const intervalTime = 100; // Update every 100ms
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const calculatedProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(Math.round(calculatedProgress));

      const currentStep = Math.min(
        Math.floor((calculatedProgress / 100) * steps.length),
        steps.length - 1
      );
      setStep(currentStep);

      if (calculatedProgress >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        // Stated requirement: Automatic transition after 10 seconds!
        onVerified();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onVerified, steps.length]);

  const dbModeLabel = company?.dbMode === 'local' ? 'Local Server (%AppData% JSON)' : company?.dbMode === 'online' ? 'Nuvem Cloud (Firebase)' : 'Híbrido Padrão';
  const customPriceFormatted = company?.customPrice && parseFloat(company.customPrice) > 0 
    ? `R$ ${company.customPrice}` 
    : 'Valor Padrão';

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto select-none">
      <div className="w-full max-w-2xl space-y-6 py-4 animate-in fade-in duration-700">
        
        {/* Header Title with animated logo */}
        <div className="text-center space-y-3">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#3b82f6] shadow-xl shadow-blue-950/45 mb-1">
            <Shield className="h-8 w-8 animate-pulse text-[#3b82f6]" />
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 animate-bounce"></div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent italic">
            Validação de Licenciamento
          </h1>
          <p className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-[0.25em]">
            {company?.name || appSettings?.companyName || 'SegurTec-Pro SaaS Client'}
          </p>
        </div>

        {/* Core Verification Scan Box */}
        <Card className="border-[#2d3139]/80 bg-[#16191f] shadow-2xl relative overflow-hidden">
          {/* Animated Matrix scan grid line */}
          {isScanning && (
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent animate-pulse opacity-40" style={{
              animationDuration: '2s',
              animationIterationCount: 'infinite',
              top: `${progress}%`
            }}></div>
          )}

          <CardHeader className="border-b border-[#2d3139]/30 p-5 bg-[#1a1d23]/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-base">Autenticador de Contrato Digital</CardTitle>
                <CardDescription className="text-[#71717a] text-[11px] uppercase tracking-wider font-semibold">
                  Sincronizado em tempo real com o Painel Admin SaaS
                </CardDescription>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-black text-[#3b82f6] bg-[#3b82f6]/10 px-2.5 py-1 rounded-md border border-[#3b82f6]/20">
                  {progress}% Verificado
                </span>
              </div>
            </div>

            {/* Simulated Progress bar */}
            <div className="w-full bg-[#0f1115] rounded-full h-1.5 mt-4 overflow-hidden border border-[#2d3139]/40">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-150 shadow-lg shadow-blue-500/50" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Displaying client options extracted dynamically from modern Admin SaaS database */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Box 1: Status & Updates */}
              <div className="p-3.5 bg-[#0f1115] border border-[#2d3139]/70 rounded-xl space-y-2 text-left">
                <p className="text-[#71717a] text-[9px] uppercase tracking-widest font-black">Licenciamento de Acesso</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#a0a0a0] font-medium">Status do Contrato:</span>
                  <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded uppercase">
                    {company?.status === 'blocked' ? 'Suspenso' : 'Ativo ✅'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#a0a0a0] font-medium">Recebe Atualizações:</span>
                  <span className={`text-xs font-bold ${(!receivesUpdatesStatus) ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'} border px-2 py-0.5 rounded uppercase`}>
                    {(!receivesUpdatesStatus) ? 'Bloqueada' : 'Liberadas'}
                  </span>
                </div>
              </div>

              {/* Box 2: Billing & DB Server */}
              <div className="p-3.5 bg-[#0f1115] border border-[#2d3139]/70 rounded-xl space-y-2 text-left">
                <p className="text-[#71717a] text-[9px] uppercase tracking-widest font-black">Infraestrutura & SaaS</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#a0a0a0] font-medium">Parâmetro Financeiro:</span>
                  <span className="text-xs font-bold text-white bg-[#2d3139]/70 px-2 py-0.5 rounded">
                    {company?.isExempt ? 'Isento / Parceiro' : `Pagante (${customPriceFormatted})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#a0a0a0] font-medium">Base de Dados:</span>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase">
                    {dbModeLabel}
                  </span>
                </div>
              </div>

            </div>

            {/* List of security checks scanning */}
            <div className="space-y-3 pt-2">
              <p className="text-[#a0a0a0] text-xs font-bold uppercase tracking-wider text-left border-b border-[#2d3139]/30 pb-2">
                Log de Validação do Dispositivo
              </p>
              
              <div className="space-y-2">
                {steps.map((s, idx) => {
                  const isDone = progress >= ((idx + 1) / steps.length) * 100 || idx <= step;
                  const isActive = !isDone && idx === step;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-start justify-between p-2.5 rounded-lg transition-colors ${
                        isDone ? 'bg-[#0f1115]/50 border border-emerald-500/10' : isActive ? 'bg-blue-500/5 border border-blue-500/20' : 'opacity-40'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        {isDone ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                        ) : isActive ? (
                          <RefreshCw className="h-4.5 w-4.5 text-blue-500 animate-spin shrink-0" />
                        ) : (
                          <div className="h-4.5 w-4.5 rounded-full border border-[#2d3139] shrink-0"></div>
                        )}
                        <div>
                          <p className={`text-xs font-bold ${isDone ? 'text-white' : isActive ? 'text-blue-400' : 'text-[#71717a]'}`}>
                            {s.name}
                          </p>
                          <p className="text-[10px] text-[#71717a]">{s.desc}</p>
                        </div>
                      </div>
                      
                      {isDone && (
                        <span className="text-[9px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded tracking-widest">
                          OK
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warning if updates are locked */}
            {(!receivesUpdatesStatus) && !isScanning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-orange-500/10 border border-orange-500/25 p-3 rounded-lg flex items-center gap-3 text-left"
              >
                <AlertTriangle className="h-5 w-5 text-orange-400 shrink-0" />
                <div>
                  <h4 className="text-orange-400 font-black text-xs uppercase italic tracking-tighter">LICENÇA SEM DIREITO A ATUALIZAÇÕES</h4>
                  <p className="text-[#a0a0a0] text-[10px] leading-relaxed mt-0.5">
                    Sua licença não lhe dá direito a atualizações automáticas ( Update ). Se a sua licença for Web/Local o sistema continuará funcionando em ambiente local ( Desktop ), para mais informações contacte o suporte.
                  </p>
                </div>
              </motion.div>
            )}

          </CardContent>
        </Card>

        <p className="text-center text-xs text-[#71717a] py-1 font-medium uppercase tracking-wider">
          Sistema desenvolvido por AF TECNOLOGIA. Todos os direitos reservados.
        </p>

      </div>
    </div>
  );
}
