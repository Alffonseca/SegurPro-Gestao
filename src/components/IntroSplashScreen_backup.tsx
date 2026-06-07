import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

interface IntroSplashScreenProps {
  onComplete: () => void;
  logoUrl?: string;
  companyName?: string;
  videoUrl?: string; // Left in interface to maintain compatibility with App.tsx prop signature
}

export default function IntroSplashScreen({
  onComplete,
  logoUrl,
  companyName = 'SegurTec-Pro Gestão'
}: IntroSplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  // Synchronized loading effect: progress drives the splash lifecycle
  useEffect(() => {
    const start = Date.now();
    const duration = 2800; // 2.8 seconds of smooth progress bar increment
    
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
          <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center px-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
              className="flex flex-col items-center gap-5 w-full"
            >
              {logoUrl ? (
                <div className="h-24 w-auto flex items-center justify-center p-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 shadow-2xl">
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="max-h-20 max-w-full object-contain animate-pulse"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="h-24 w-24 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 shadow-2xl backdrop-blur-md">
                  <Shield size={48} className="text-blue-500 fill-blue-500/10 animate-pulse" />
                </div>
              )}

              <div className="space-y-2 mt-2 w-full">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase italic bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-lg"
                >
                  {companyName}
                </motion.h1>
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 0.6 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-[10px] font-mono font-medium tracking-[0.25em] text-zinc-400 uppercase"
                >
                  SISTEMA DE GESTÃO AUTOMOTIVA
                </motion.p>
              </div>
            </motion.div>

            {/* Smooth Glowing Progress Bar Driven strictly by state */}
            <div className="mt-14 w-full space-y-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/5 rounded-full text-[9px] text-[#71717a] font-mono select-none mx-auto w-fit">
                <span className={`h-1.5 w-1.5 rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500 animate-ping'}`} />
                <span>{progress >= 100 ? 'SISTEMA AUTENTICADO' : 'SISTEMA DE SEGURANÇA OPERACIONAL ONLINE'}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[9px] px-1">
                  <span className={`tracking-widest ${progress >= 100 ? 'text-emerald-400 font-extrabold animate-pulse' : 'text-zinc-400'}`}>
                    {progress >= 100 ? 'SISTEMA PRONTO!' : 'CARREGANDO DIRETÓRIOS...'}
                  </span>
                  <span className={`font-bold font-sans ${progress >= 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {Math.round(progress)}%
                  </span>
                </div>
                
                <div className="w-full h-1.5 bg-black/60 border border-white/10 rounded-full overflow-hidden p-[1px] relative shadow-inner">
                  <div
                    className="h-full rounded-full transition-all duration-75 ease-out shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                    style={{ 
                      width: `${progress}%`,
                      backgroundImage: progress >= 100 
                        ? 'linear-gradient(90deg, #10b981, #34d399)' 
                        : 'linear-gradient(90deg, #2563eb, #38bdf8)',
                      boxShadow: progress >= 100 
                        ? '0 0 10px rgba(16, 185, 129, 0.7)' 
                        : 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 text-center w-full font-mono text-[9px] text-zinc-600">
            <span>TECNOLOGIA DE PONTA © {new Date().getFullYear()}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
