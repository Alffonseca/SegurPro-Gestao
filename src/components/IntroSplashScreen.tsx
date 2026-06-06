import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Volume2, VolumeX, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IntroSplashScreenProps {
  onComplete: () => void;
  logoUrl?: string;
  companyName?: string;
  videoUrl?: string;
}

export default function IntroSplashScreen({
  onComplete,
  logoUrl,
  companyName = 'SegurTec-Pro Gestão',
  videoUrl
}: IntroSplashScreenProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Default fallback premium high-tech motion/abstract video CDNs
  const defaultVideoUrl = 'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b16f90da2e54e11fa2c2fe39a&profile_id=139&oauth2_token_id=57447761';
  
  // Helper to transform Google Drive and Dropbox URLs into raw streaming sources
  const resolveDirectVideoUrl = (url: string): string => {
    if (!url) return '';
    const trimmed = url.trim();

    // Google Drive direct link conversion
    if (trimmed.includes('drive.google.com')) {
      const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://docs.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
    }

    // Dropbox direct link conversion
    if (trimmed.includes('dropbox.com')) {
      return trimmed.replace('?dl=0', '?raw=1').replace('&dl=0', '&raw=1');
    }

    return trimmed;
  };

  const activeVideoUrl = videoUrl && videoUrl.trim() !== '' ? resolveDirectVideoUrl(videoUrl) : defaultVideoUrl;

  useEffect(() => {
    // 5 seconds total video intro context before launching system checks
    const mainTimer = setTimeout(() => {
      setFadeOut(true);
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 800); // Allow fadeOut animation to finish
      return () => clearTimeout(completeTimer);
    }, 4500);

    return () => clearTimeout(mainTimer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] bg-[#090b0f] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Video Player */}
          <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
            <video
              src={activeVideoUrl}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              className="w-full h-full object-cover opacity-60 scale-105"
            />
            {/* Dark Cinematic Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090b0f] via-transparent to-[#090b0f] opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#090b0f] via-transparent to-[#090b0f] opacity-90" />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Centered Logo and Branded Elements */}
          <div className="relative z-10 flex flex-col items-center max-w-md text-center px-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="flex flex-col items-center gap-6"
            >
              {logoUrl ? (
                <div className="h-24 w-auto flex items-center justify-center p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
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

              <div className="space-y-3">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 1.0 }}
                  className="text-2xl md:text-3xl font-black text-white tracking-widest uppercase italic bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-lg"
                >
                  {companyName}
                </motion.h1>
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 0.6 }}
                  transition={{ delay: 0.6, duration: 1.0 }}
                  className="text-xs font-mono font-medium tracking-[0.25em] text-zinc-400 uppercase"
                >
                  Iniciando Sistema de Gestão
                </motion.p>
              </div>
            </motion.div>

            {/* Simulated HUD Terminal Line */}
            <div className="mt-12 flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/5 rounded-full text-[9px] text-[#71717a] font-mono select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
              <span>SISTEMA DE SEGURANÇA OPERACIONAL ONLINE</span>
            </div>
          </div>

          {/* Interactive Control Controls */}
          <div className="absolute bottom-10 left-10 right-10 z-20 flex items-center justify-between">
            {/* Audio Toggle (Browsers block sound on autoplay, so muting is active. This lets user override to unmute) */}
            <Button
              variant="ghost"
              size="icon"
              id="audio_intro_toggle"
              className="h-9 w-9 text-zinc-400 hover:text-white bg-black/40 backdrop-blur-md rounded-full border border-white/10"
              onClick={() => setIsMuted(prev => !prev)}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </Button>

            {/* Circular Countdown Tracker */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end leading-none font-mono text-[9px] text-zinc-500">
                <span>CONECTANDO SERVIDORES</span>
                <span className="text-zinc-600">FASE INTRO 05s</span>
              </div>
              
              {/* Skip Intro Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-[10px] font-bold text-zinc-300 hover:text-white bg-black/40 hover:bg-white/10 border border-white/10 hover:border-white/20 uppercase tracking-wider rounded-lg backdrop-blur-md"
                onClick={() => {
                  setFadeOut(true);
                  setTimeout(onComplete, 400);
                }}
              >
                Pular
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
