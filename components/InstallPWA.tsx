import React, { useEffect, useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export const InstallPWA: React.FC = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1. Detectar si ya está instalada (Standalone mode)
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
      e.preventDefault();
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

  // Si ya está instalada o el usuario cerró el globo, no mostramos nada
  if (isInstalled || !isVisible) return null;

  // Si no es iOS y tampoco soporta el prompt de Android todavía, no mostramos nada
  if (!isIOS && !supportsPWA) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-slate-900 border border-blue-500/30 shadow-[0_10px_40px_rgba(59,130,246,0.3)] rounded-2xl p-4 relative flex items-center gap-4">
        
        <button onClick={() => setIsVisible(false)} className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-white rounded-full p-1 border border-white/10 shadow-lg">
          <X size={14} />
        </button>

        <div className="bg-blue-600/20 text-blue-400 p-3 rounded-xl flex-shrink-0">
          <Download size={24} />
        </div>

        <div className="flex-1">
          <h4 className="text-white font-bold text-sm leading-tight mb-1">Instalar Aplicación</h4>
          
          {isIOS ? (
            // Mensaje específico para iPhone/Safari
            <p className="text-[11px] text-slate-400 leading-tight">
              Toca el botón <Share size={12} className="inline mx-1 text-blue-400"/> de Safari y luego <strong className="text-white">"Agregar a inicio"</strong> <PlusSquare size={12} className="inline text-white"/>.
            </p>
          ) : (
            // Botón directo para Android/Chrome
            <button 
              onClick={onClickInstall}
              className="mt-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors active:scale-95 shadow-lg"
            >
              Instalar ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
