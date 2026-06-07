import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

interface IntroSplashScreenProps {
  onComplete: () => void;
  logoUrl?: string;
  companyName?: string;
  businessActivity?: string;
  videoUrl?: string; // Left in interface to maintain compatibility with App.tsx prop signature
}

export default function IntroSplashScreen({
  onComplete,
  logoUrl,
  companyName = 'SegurTec-Pro Gestão',
  businessActivity
}: IntroSplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  // Synchronized loading effect: progress drives the splash lifecycle
  useEffect(() => {
    const start = Date.now();
    const duration = 10000; // 10 seconds of smooth progress bar increment
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const currentProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(progressInterval);
        
        // Wait 700ms showing "SISTEMA PRONTO!" with full green bar, then trigger fadeout
        const bufferTimer = setTimeout(() => {
          setFadeOut(true);
          
          // Wait 600ms of exit animation duration, then call parent onComplete()
          const completeTimer = setTimeout(() => {
            onComplete();
          }, 600);
          
          return () => clearTimeout(completeTimer);
        }, 700);
        
        return () => clearTimeout(bufferTimer);
      }
    }, 20);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] bg-[#090b0f] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Futuristic Cyber Grid and Ambient Lighting Background */}
          <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden">
            <div className="absolute inset-0 animate-cyber-grid opacity-30 mix-blend-screen" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090b0f] via-transparent to-[#090b0f] opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#090b0f] via-transparent to-[#090b0f] opacity-90" />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Centered Brand Presentation */}
          <div className="relative z-10 flex flex-col items-center max-w-xl md:max-w-3xl w-full text-center px-6 md:px-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
              className="flex flex-col items-center gap-6 w-full"
            >
              {logoUrl ? (
                <div className="h-32 md:h-44 px-8 py-5 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all">
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="max-h-24 md:max-h-36 max-w-full object-contain filter drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="h-28 w-28 md:h-36 md:w-36 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/25 to-blue-600/10 border border-blue-500/40 shadow-2xl backdrop-blur-md">
                  <Shield className="h-14 w-14 md:h-18 md:w-18 text-blue-500 fill-blue-500/10 animate-pulse" />
                </div>
              )}

              <div className="space-y-3 mt-3 w-full">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase italic bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] leading-tight px-2"
                >
                  {companyName}
                </motion.h1>
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 0.7 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-[11px] md:text-xs font-mono font-bold tracking-[0.3em] text-blue-400/80 uppercase"
                >
                  {businessActivity ? businessActivity.toUpperCase() : 'SISTEMA DE GESTÃO INTEGRADA'}
                </motion.p>
              </div>
            </motion.div>

            {/* Smooth Glowing Progress Bar Driven strictly by state */}
            <div className="mt-14 w-full max-w-md space-y-4">
              <div className="flex items-center gap-2 px-3.5 py-1 bg-black/50 border border-white/5 rounded-full text-[9px] md:text-[10px] text-zinc-400 font-mono select-none mx-auto w-fit">
                <span className={`h-2 w-2 rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500 animate-ping'}`} />
                <span>{progress >= 100 ? 'SISTEMA AUTENTICADO' : 'SISTEMA DE SEGURANÇA OPERACIONAL ONLINE'}</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[9px] md:text-[10px] px-1">
                  <span className={`tracking-widest ${progress >= 100 ? 'text-emerald-400 font-extrabold animate-pulse' : 'text-zinc-400'}`}>
                    {progress >= 100 ? 'SISTEMA PRONTO!' : 'CARREGANDO DIRETÓRIOS...'}
                  </span>
                  <span className={`font-bold font-sans ${progress >= 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {Math.round(progress)}%
                  </span>
                </div>
                
                <div className="w-full h-2 bg-black/70 border border-white/10 rounded-full overflow-hidden p-[1px] relative shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-75 ease-out shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                    style={{ 
                      width: `${progress}%`,
                      backgroundImage: progress >= 100 
                        ? 'linear-gradient(90deg, #10b981, #34d399)' 
                        : 'linear-gradient(90deg, #2563eb, #38bdf8)',
                      boxShadow: progress >= 100 
                        ? '0 0 12px rgba(16, 185, 129, 0.8)' 
                        : 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 text-center w-full text-xs text-[#71717a] font-medium tracking-wider">
            <span>Sistema desenvolvido por AF TECNOLOGIA. Todos os direitos reservados.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
