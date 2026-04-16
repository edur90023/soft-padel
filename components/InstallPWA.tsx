import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { ClubConfig } from '../types';

interface InstallPWAProps {
  config?: ClubConfig; // Lo hacemos opcional por seguridad
}

export const InstallPWA: React.FC<InstallPWAProps> = ({ config }) => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1. Detectar si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detectar si es iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Escuchar el evento de instalación en Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault(); // Esto genera el mensaje (normal) en consola
      setSupportsPWA(true);
      setPromptInstall(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onClickInstall = async () => {
    if (!promptInstall) return;
    promptInstall.prompt();
    const { outcome } = await promptInstall.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
  };

  // Si ya está instalada o el usuario cerró el cartel, no mostramos nada
  if (isInstalled || !isVisible) return null;
  
  // Si no es iOS y tampoco soporta PWA, no mostramos nada
  if (!isIOS && !supportsPWA) return null;

  // Variables seguras para evitar errores de "undefined"
  const clubName = config?.name || 'App Oficial';
  const logo = config?.logoUrl;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm animate-in slide-in-from-top-10 fade-in duration-500">
      <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-blue-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-5 relative flex items-center gap-4">
        
        <button onClick={() => setIsVisible(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-all">
          <X size={20} />
        </button>

        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg shrink-0 bg-slate-800">
          {logo ? (
            <img src={logo} className="w-full h-full object-cover" alt="App Logo" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black text-xl italic">
              {clubName.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 pr-6">
          <h4 className="text-white font-black text-sm uppercase italic leading-none mb-1">App Oficial</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{clubName}</p>
          
          {isIOS ? (
            <p className="text-[10px] text-blue-400 font-medium leading-tight">
              Toca <Share size={12} className="inline mx-1"/> y luego <strong className="text-white">"Añadir a pantalla de inicio"</strong>.
            </p>
          ) : (
            <button 
              onClick={onClickInstall}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black py-2 px-4 rounded-full transition-all active:scale-95 shadow-lg uppercase tracking-widest flex items-center gap-2"
            >
              <Download size={12}/> Instalar Ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
