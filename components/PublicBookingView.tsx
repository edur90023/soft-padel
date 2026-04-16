import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Phone, 
  CheckCircle, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  MessageCircle, 
  Info, 
  Sparkles, 
  ExternalLink, 
  Gift, 
  Flame, 
  Moon, 
  Map, 
  LayoutGrid, 
  Award,
  ShieldCheck,
  Star,
  Zap,
  Navigation,
  Plus,
  Smartphone,
  CreditCard,
  Wifi,
  Coffee,
  Utensils,
  Trophy,
  Activity,
  Heart,
  Music,
  Tv,
  X,
  Lock,
  Globe,
  Check,
  HelpCircle, 
  Image as ImageIcon
} from 'lucide-react';
import { Court, Booking, ClubConfig, BookingStatus, TournamentPlayer } from '../types';
import { COLOR_THEMES } from '../constants';

interface PublicBookingViewProps {
  config: ClubConfig;
  courts: Court[];
  bookings: Booking[];
  onAddBooking: (booking: Booking) => void;
}

interface TimeSlot {
    time: string;       
    id: string;         
    isNextDay: boolean;
    realDate: string;   
}

// --- UTILS CON ZONA HORARIA CORREGIDA ---
const getArgentinaDate = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
};

const isTimeInPast = (slotDateStr: string, timeStr: string) => {
    const now = getArgentinaDate();
    const [h, m] = timeStr.split(':').map(Number);
    const [year, month, day] = slotDateStr.split('-').map(Number);
    const slotDate = new Date(year, month - 1, day, h, m);
    return slotDate < new Date(now.getTime() + 15 * 60000);
};

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ config, courts, bookings, onAddBooking }) => {
  // --- ESTADOS (AMPLIADOS CON GALLERY Y RANKING) ---
  const [step, setStep] = useState<'DATE' | 'SLOTS' | 'COURT_SELECT' | 'FORM' | 'SUCCESS' | 'GALLERY' | 'RANKING'>('DATE');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]); 
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });
  const [isAgreed, setIsAgreed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  const activeAds = useMemo(() => config.ads.filter(ad => ad.isActive), [config.ads]);
  const theme = COLOR_THEMES[config.courtColorTheme];

  // --- EFECTOS ---
  useEffect(() => {
      if (activeAds.length <= 1) return;
      const interval = setInterval(() => {
          setCurrentAdIndex(prev => (prev + 1) % activeAds.length);
      }, (config.adRotationInterval || 5) * 1000);
      return () => clearInterval(interval);
  }, [activeAds, config.adRotationInterval]);

  // --- LÓGICA DE NAVEGACIÓN ---
  const handleDateChange = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const today = new Date(); today.setHours(0,0,0,0);
    if (d < today) return;
    setSelectedDate(d.toISOString().split('T')[0]);
    setSelectedSlotIds([]);
    setSelectedCourtId(null);
  };

  const generatedSlots = useMemo(() => {
      const slots: TimeSlot[] = [];
      const baseDateObj = new Date(selectedDate + 'T12:00:00');
      const nextDateObj = new Date(baseDateObj);
      nextDateObj.setDate(nextDateObj.getDate() + 1);
      const nextDateStr = nextDateObj.toISOString().split('T')[0];
      const getConfigDayIndex = (date: Date) => { const jsDay = date.getDay(); return jsDay === 0 ? 6 : jsDay - 1; };
      const todayIndex = getConfigDayIndex(baseDateObj);
      const nextDayIndex = getConfigDayIndex(nextDateObj);

      for (let h = 8; h < 24; h++) {
          if (config.schedule[todayIndex]?.[h]) {
              const hStr = h.toString().padStart(2, '0');
              slots.push({ time: `${hStr}:00`, id: `${hStr}:00`, isNextDay: false, realDate: selectedDate });
              slots.push({ time: `${hStr}:30`, id: `${hStr}:30`, isNextDay: false, realDate: selectedDate });
          }
      }
      for (let h = 0; h < 6; h++) {
           if (config.schedule[nextDayIndex]?.[h]) {
              const hStr = h.toString().padStart(2, '0');
              slots.push({ time: `${hStr}:00`, id: `${hStr}:00+1`, isNextDay: true, realDate: nextDateStr });
              slots.push({ time: `${hStr}:30`, id: `${hStr}:30+1`, isNextDay: true, realDate: nextDateStr });
           }
      }
      return slots;
  }, [selectedDate, config.schedule]);

  const getFreeCourtsForSlot = (slot: TimeSlot): Court[] => {
      if (isTimeInPast(slot.realDate, slot.time)) return [];
      const slotDate = new Date(`${slot.realDate}T${slot.time}`);
      return courts.filter(court => {
          if (court.status === 'MAINTENANCE') return false;
          return !bookings.some(b => b.courtId === court.id && b.status !== BookingStatus.CANCELLED && new Date(`${b.date}T${b.time}`) < new Date(slotDate.getTime() + 30 * 60000) && new Date(new Date(`${b.date}T${b.time}`).getTime() + b.duration * 60000) > slotDate);
      });
  };

  const availableCourtsForSelection = useMemo(() => {
    if (selectedSlotIds.length === 0) return [];
    return courts.filter(court => {
        if (court.status === 'MAINTENANCE') return false;
        return selectedSlotIds.every(slotId => {
            const slot = generatedSlots.find(s => s.id === slotId);
            if (!slot) return false;
            const slotDate = new Date(`${slot.realDate}T${slot.time}`);
            return !bookings.some(b => b.courtId === court.id && b.status !== BookingStatus.CANCELLED && new Date(`${b.date}T${b.time}`) < new Date(slotDate.getTime() + 30 * 60000) && new Date(new Date(`${b.date}T${b.time}`).getTime() + b.duration * 60000) > slotDate);
        });
    });
  }, [selectedSlotIds, courts, bookings, generatedSlots]);

  const toggleSlotSelection = (slotId: string) => {
      setSelectedCourtId(null);
      if (selectedSlotIds.includes(slotId)) {
          setSelectedSlotIds(prev => prev.filter(id => id !== slotId));
      } else {
          const newIds = [...selectedSlotIds, slotId];
          setSelectedSlotIds(generatedSlots.filter(s => newIds.includes(s.id)).map(s => s.id));
      }
  };

  const isPromoEligible = useMemo(() => {
      if (!config.promoActive || selectedSlotIds.length !== 4) return false;
      const sel = generatedSlots.filter(s => selectedSlotIds.includes(s.id));
      for (let i = 0; i < sel.length - 1; i++) {
          const current = new Date(`${sel[i].realDate}T${sel[i].time}`);
          const next = new Date(`${sel[i+1].realDate}T${sel[i+1].time}`);
          if ((next.getTime() - current.getTime()) / 60000 !== 30) return false;
      }
      return true;
  }, [selectedSlotIds, generatedSlots, config.promoActive]);

  const totalPrice = isPromoEligible ? config.promoPrice : selectedCourtId ? (courts.find(c => c.id === selectedCourtId)?.basePrice || 0) * selectedSlotIds.length : 0;
  const totalDurationMinutes = selectedSlotIds.length * 30;

  const handleConfirmBooking = () => {
      const startSlot = generatedSlots.find(s => s.id === selectedSlotIds[0]);
      const court = courts.find(c => c.id === selectedCourtId);
      if (!startSlot || !court) return;
      onAddBooking({
          id: `web-${Date.now()}`, courtId: selectedCourtId!, date: startSlot.realDate,
          time: startSlot.time, duration: selectedSlotIds.length * 30, customerName: customerData.name,
          customerPhone: customerData.phone, status: BookingStatus.PENDING, price: totalPrice, isRecurring: false
      });
      setStep('SUCCESS');
      const msg = `Hola! Reserva en *${config.name}*%0A👤 *Cliente:* ${customerData.name}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time}%0A⏳ *Duración:* ${totalDurationMinutes} min%0A🏟 *Cancha:* ${court.name}%0A💰 *Total:* $${totalPrice.toLocaleString()}${isPromoEligible ? `%0A🎁 *PROMO:* ${config.promoText}` : ''}`;
      setTimeout(() => window.open(`https://wa.me/${config.ownerPhone.replace('+', '')}?text=${msg}`, '_blank'), 500);
  };

  // --- SUB-COMPONENTE PUBLICIDAD ---
  const renderAd = () => {
    if (activeAds.length === 0) return null;
    const ad = activeAds[currentAdIndex];
    return (
        <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group mt-auto transition-all duration-1000 ease-in-out">
            <img src={ad.imageUrl} alt="Publicidad" className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent"></div>
            <div className="absolute top-5 right-5 bg-black/60 backdrop-blur-xl text-[9px] text-white/80 px-3 py-1.5 rounded-full border border-white/10 font-black uppercase tracking-[0.3em]">Destacado</div>
            {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-6 right-6 bg-white text-black p-3.5 rounded-2xl shadow-[0_15px_30px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-90 transition-all duration-500">
                    <ExternalLink size={20}/>
                </a>
            )}
        </div>
    );
  };

  // --- SUB-COMPONENTE AYUDA ---
  const HelpModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
        <div className="bg-slate-900 border border-white/10 rounded-[3.5rem] w-full max-w-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12"><HelpCircle size={200}/></div>
            <button onClick={() => setIsHelpOpen(false)} className="absolute top-6 right-6 p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><X size={24}/></button>
            <h3 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tighter uppercase italic leading-none">Guía de <span className="text-blue-500">Reserva</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 relative z-10">
                <div className="space-y-2"><div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-lg"><Calendar size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">1. Fecha</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Elegí el día en el calendario interactivo.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 shadow-lg"><Clock size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">2. Horario</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cada bloque es de 30m. Elegí los que necesites.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500 shadow-lg"><Map size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">3. Cancha</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seleccioná tu pista favorita.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-orange-600/20 rounded-2xl flex items-center justify-center text-orange-500 shadow-lg"><Smartphone size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">4. WhatsApp</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Confirmá enviando el mensaje final al club.</p></div>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="w-full mt-10 bg-white text-slate-950 font-black py-5 rounded-3xl uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all text-sm">Entendido</button>
        </div>
    </div>
  );

  if (step === 'SUCCESS') {
      return (
          <div className="h-full flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-600/5 blur-[120px] rounded-full animate-pulse"></div>
              <div className="relative z-10 max-w-lg w-full bg-slate-900 border border-white/10 p-10 md:p-16 rounded-[4rem] shadow-2xl text-center animate-in zoom-in-95 duration-700">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/30 shadow-[0_0_80px_rgba(34,197,94,0.4)]">
                      <CheckCircle size={60} className="text-green-500 animate-in zoom-in spin-in-12 duration-1000" strokeWidth={3} />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">Turno <br/><span className="text-green-500">Enviado</span></h2>
                  <p className="text-slate-400 mb-10 leading-relaxed text-xs md:text-sm font-bold uppercase tracking-[0.2em]">Finaliza la confirmación por WhatsApp.</p>
                  <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); setCustomerData({name:'', phone:''}); }} className="w-full bg-white text-slate-950 font-black py-5 md:py-6 rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-[0.3em] shadow-2xl active:scale-95 text-sm md:text-base">Nueva Reserva</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-sans bg-slate-950 selection:bg-blue-600/40">
        
        {/* FONDO ESMERILADO (GRASS) */}
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : 'none' }}></div>
             <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[12px]"></div>
             <div className="absolute -top-[15%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
             <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col h-full md:p-8 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-lg md:max-w-7xl md:max-h-[92vh] bg-slate-900/60 border border-white/20 md:rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.7)] flex flex-col md:flex-row overflow-hidden backdrop-blur-3xl transition-all duration-700">
                
                {/* SIDEBAR DETALLADA (CON MENÚ DE NAVEGACIÓN PC) */}
                <div className="hidden md:flex w-[32%] border-r border-white/10 flex-col p-10 lg:p-14 bg-black/40 justify-between shrink-0 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                     <div className="space-y-10 lg:space-y-12 relative z-10">
                        <div className="group relative w-24 h-24 lg:w-32 lg:h-32">
                            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative w-full h-full rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-white/10 bg-slate-800 rotate-6 group-hover:rotate-0 transition-transform duration-700">
                                {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover" alt="Logo"/> : <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-black text-3xl lg:text-4xl`}>{config.name.charAt(0)}</div>}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.85] mb-4 lg:mb-6 uppercase italic drop-shadow-2xl">
                                {config.name.split(' ').map((word, i) => <span key={i} className="block">{word}</span>)}
                            </h1>
                            <div className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] bg-blue-500/10 w-fit px-4 py-2 rounded-full border border-blue-500/20 shadow-inner">
                                <Navigation size={12} className="animate-pulse"/> <span>Sede Principal</span>
                            </div>
                        </div>
                        
                        {/* MENÚ DE NAVEGACIÓN PC */}
                        <div className="space-y-3 py-6 border-y border-white/5">
                            <button onClick={() => setStep('DATE')} className={`w-full text-left px-5 py-4 rounded-2xl text-xs lg:text-sm font-bold uppercase tracking-widest flex items-center gap-4 transition-all ${['DATE', 'SLOTS', 'COURT_SELECT', 'FORM'].includes(step) ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <Calendar size={20}/> Reservar Turno
                            </button>
                            <button onClick={() => setStep('GALLERY')} className={`w-full text-left px-5 py-4 rounded-2xl text-xs lg:text-sm font-bold uppercase tracking-widest flex items-center gap-4 transition-all ${step === 'GALLERY' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <ImageIcon size={20}/> Fotos del Complejo
                            </button>
                            <button onClick={() => setStep('RANKING')} className={`w-full text-left px-5 py-4 rounded-2xl text-xs lg:text-sm font-bold uppercase tracking-widest flex items-center gap-4 transition-all ${step === 'RANKING' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <Trophy size={20}/> Ranking Oficial
                            </button>
                        </div>
                     </div>
                     {renderAd()}
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900/20">
                    
                    {/* Header Mobile (CON BOTONES DE GALERÍA Y RANKING) */}
                    <div className="md:hidden p-4 sm:p-6 flex flex-col items-center shrink-0 relative bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-50">
                        {['DATE', 'GALLERY', 'RANKING'].includes(step) ? (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-1 sm:gap-2">
                                <button onClick={() => setStep('GALLERY')} className={`p-2 sm:p-3 rounded-xl transition-all ${step === 'GALLERY' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}><ImageIcon size={18}/></button>
                                <button onClick={() => setStep('RANKING')} className={`p-2 sm:p-3 rounded-xl transition-all ${step === 'RANKING' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}><Trophy size={18}/></button>
                            </div>
                        ) : (
                            <button onClick={() => {
                                if (step === 'SLOTS') setStep('DATE');
                                if (step === 'COURT_SELECT') setStep('SLOTS');
                                if (step === 'FORM') setStep('COURT_SELECT');
                            }} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-2xl bg-white/5 text-white active:scale-90 transition-all border border-white/10 shadow-xl">
                                <ArrowLeft size={20}/>
                            </button>
                        )}
                        <h1 className="text-xl sm:text-2xl font-black text-white text-center uppercase tracking-tighter italic drop-shadow-xl">{config.name}</h1>
                        <button onClick={() => setIsHelpOpen(true)} className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-2 transition-all"><HelpCircle size={22}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 scrollbar-hide relative z-30">
                        
                        {/* STEP 1: DATE */}
                        {step === 'DATE' && (
                            <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                                <div className="mb-12 md:mb-16">
                                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-4 md:mb-6 tracking-tighter uppercase italic leading-[0.8] break-words">Reservá tu <span className="text-blue-600">Turno</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[10px] border-l-4 border-blue-600 pl-4">Paso 1: Seleccioná el día</p>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 mb-12 lg:mb-16">
                                    <div className="xl:col-span-8 bg-slate-800/40 p-4 sm:p-6 rounded-[2.5rem] md:rounded-[3rem] border border-white/10 flex items-center justify-between shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] group">
                                        <button onClick={() => handleDateChange(-1)} className="p-6 md:p-10 text-white hover:bg-white/5 rounded-[2rem] md:rounded-[2.5rem] transition-all hover:scale-105 active:scale-95"><ChevronLeft size={36} className="md:w-12 md:h-12"/></button>
                                        <div className="text-center flex-1 min-w-0">
                                            <span className="text-[9px] md:text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] md:tracking-[0.5em] block mb-2 md:mb-4">Calendario</span>
                                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-2xl md:text-4xl font-black text-white text-center w-full outline-none cursor-pointer font-mono"/>
                                        </div>
                                        <button onClick={() => handleDateChange(1)} className="p-6 md:p-10 text-white hover:bg-white/5 rounded-[2rem] md:rounded-[2.5rem] transition-all hover:scale-105 active:scale-95"><ChevronRight size={36} className="md:w-12 md:h-12"/></button>
                                    </div>
                                    <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 sm:gap-6">
                                        <div className="bg-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 flex items-center gap-4 md:gap-6 shadow-xl">
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-500 shadow-lg shrink-0"><Award size={24} className="md:w-8 md:h-8"/></div>
                                            <div className="min-w-0"><p className="text-white font-black text-xl md:text-2xl uppercase italic truncate">Premium</p><p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase mt-1 truncate">Sede Pro</p></div>
                                        </div>
                                        <div className="bg-white/5 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 flex items-center gap-4 md:gap-6 shadow-xl">
                                            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-lg shrink-0"><ShieldCheck size={24} className="md:w-8 md:h-8"/></div>
                                            <div className="min-w-0"><p className="text-white font-black text-xl md:text-2xl uppercase italic truncate">Secure</p><p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase mt-1 truncate">SSL Validated</p></div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setStep('SLOTS')} className={`w-full ${theme.primary} text-white font-black py-6 md:py-10 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center gap-4 md:gap-8 shadow-[0_20px_40px_-10px_rgba(59,130,246,0.5)] hover:translate-y-[-4px] transition-all uppercase tracking-[0.2em] md:tracking-[0.4em] text-lg md:text-2xl group`}>
                                    <Clock size={28} className="md:w-9 md:h-9 group-hover:rotate-12 transition-transform duration-500"/> Ver Horarios
                                </button>
                                <div className="md:hidden mt-12">{renderAd()}</div>
                            </div>
                        )}

                        {/* STEP 2: SLOTS */}
                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800">
                                <div className="mb-12 md:mb-16 border-b border-white/5 pb-8 md:pb-10">
                                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8] break-words">Elegí tu <span className="text-blue-600">Tiempo</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] mt-4 md:mt-6">Paso 2: Marcá los bloques de 30m</p>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 md:gap-6 mb-16 md:mb-20">
                                    {generatedSlots.map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button 
                                                key={slot.id}
                                                disabled={!isAvailable}
                                                onClick={() => toggleSlotSelection(slot.id)}
                                                className={`relative h-20 md:h-28 w-full rounded-2xl md:rounded-[2rem] text-xl md:text-2xl font-black transition-all duration-300 border-2 flex flex-col items-center justify-center ${isSelected ? `${theme.primary} text-white border-white/50 shadow-[0_0_30px_rgba(59,130,246,0.6)] scale-105 md:scale-110 z-20` : isAvailable ? 'bg-slate-800/60 text-white border-white/10 hover:bg-slate-700 hover:border-white/30' : 'bg-slate-950/60 text-slate-800 border-transparent opacity-20 cursor-not-allowed grayscale'}`}
                                            >
                                                {slot.time}
                                                {slot.isNextDay && <span className={`text-[7px] md:text-[9px] uppercase tracking-widest font-black absolute bottom-2 md:bottom-3 ${isSelected ? 'text-blue-200' : 'text-blue-400'}`}>Madrugada</span>}
                                                {isSelected && <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-white text-blue-600 rounded-full p-1.5 md:p-2 shadow-2xl animate-in zoom-in"><CheckCircle size={16} className="md:w-5 md:h-5" strokeWidth={4}/></div>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedSlotIds.length > 0 && (
                                    <button onClick={() => setStep('COURT_SELECT')} className={`w-full ${theme.primary} text-white font-black py-6 md:py-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl uppercase tracking-[0.2em] md:tracking-[0.4em] flex items-center justify-center gap-4 md:gap-6 group transition-all text-lg md:text-xl active:scale-95`}>
                                        Siguiente <span className="hidden sm:inline">Seleccionar Cancha</span> <ChevronRight size={28} className="md:w-9 md:h-9 group-hover:translate-x-4 transition-transform duration-500"/>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* STEP 3: COURT SELECT */}
                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800">
                                <div className="mb-12 md:mb-16">
                                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8] break-words">Elegí la <span className="text-blue-600">Cancha</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] mt-4 md:mt-6 opacity-60">Paso 3: Disponibles para tu horario</p>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:gap-10 mb-16 md:mb-20">
                                    {availableCourtsForSelection.length === 0 ? (
                                        <div className="text-center py-24 md:py-40 bg-white/5 rounded-[3rem] md:rounded-[4rem] border-2 border-dashed border-white/5 flex flex-col items-center">
                                            <Moon size={60} className="md:w-20 md:h-20 mb-4 md:mb-6 text-slate-700 animate-pulse"/>
                                            <p className="text-slate-400 font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-xs md:text-sm">Sin disponibilidad libre</p>
                                        </div>
                                    ) : (
                                        availableCourtsForSelection.map(court => (
                                            <button 
                                                key={court.id}
                                                onClick={() => setSelectedCourtId(court.id)}
                                                className={`p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-2 transition-all flex items-center justify-between group relative overflow-hidden ${selectedCourtId === court.id ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_60px_rgba(59,130,246,0.3)] md:shadow-[0_0_80px_rgba(59,130,246,0.4)] scale-[1.02]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center gap-6 md:gap-12 text-left z-20 min-w-0">
                                                    <div className={`w-16 h-16 md:w-32 md:h-32 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center transition-all duration-700 shrink-0 ${selectedCourtId === court.id ? 'bg-blue-600 text-white scale-110 rotate-6 shadow-2xl' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>
                                                        <Navigation size={28} className="md:w-12 md:h-12"/>
                                                    </div>
                                                    <div className="min-w-0 pr-4">
                                                        <h4 className="font-black text-white text-3xl md:text-5xl leading-none uppercase italic tracking-tighter mb-2 md:mb-4 group-hover:translate-x-2 transition-transform duration-500 truncate">{court.name}</h4>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-6">
                                                            <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-white/5 shadow-inner w-fit">
                                                                <Star size={10} className="md:w-3 md:h-3 text-yellow-500 fill-yellow-500"/> {court.type}
                                                            </div>
                                                            <span className="text-xl md:text-2xl font-black text-green-400 font-mono tracking-tighter shadow-green-400/10 shadow-xl">${(court.basePrice * selectedSlotIds.length).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {selectedCourtId === court.id ? (
                                                    <div className="bg-blue-500 text-white p-4 md:p-8 rounded-2xl md:rounded-[2rem] shadow-2xl animate-in zoom-in-50 duration-500 shrink-0 z-20">
                                                        <CheckCircle size={28} className="md:w-12 md:h-12" strokeWidth={4}/>
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-[1.5rem] border-2 border-white/10 flex items-center justify-center text-white/10 group-hover:border-blue-500/50 group-hover:text-blue-500 transition-all duration-500 shrink-0 z-20">
                                                        <Plus size={24} className="md:w-10 md:h-10"/>
                                                    </div>
                                                )}
                                                
                                                <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/4 opacity-[0.02] group-hover:opacity-[0.06] transition-all duration-1000">
                                                    <LayoutGrid size={200} className="md:w-[350px] md:h-[350px]"/>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button 
                                    disabled={!selectedCourtId}
                                    onClick={() => setStep('FORM')} 
                                    className={`w-full ${theme.primary} text-white font-black py-6 md:py-10 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] uppercase tracking-[0.2em] md:tracking-[0.4em] flex items-center justify-center gap-4 md:gap-6 disabled:opacity-10 disabled:grayscale transition-all active:scale-95 text-lg md:text-xl relative group overflow-hidden`}
                                >
                                    Confirmar <span className="hidden sm:inline">Cancha y Datos</span> <ChevronRight size={28} className="md:w-9 md:h-9"/>
                                </button>
                            </div>
                        )}

                        {/* STEP 4: FORM */}
                        {step === 'FORM' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800 flex flex-col h-full max-w-4xl mx-auto">
                                <div className="mb-12 md:mb-20">
                                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8] break-words">Tus <span className="text-blue-600">Datos</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] mt-4 md:mt-6 opacity-60">Paso 4: Último paso para confirmar</p>
                                </div>

                                <div className="space-y-8 md:space-y-12 flex-1">
                                    <div className="group">
                                        <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] md:tracking-[0.5em] ml-4 mb-3 md:mb-5 block group-focus-within:text-blue-500 transition-colors">Nombre Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-all duration-500" size={24} />
                                            <input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800/40 border-2 border-white/5 rounded-[2rem] md:rounded-[2.5rem] py-6 md:py-10 pl-16 md:pl-24 pr-8 md:pr-10 text-white text-xl md:text-3xl font-black outline-none focus:border-blue-500/50 focus:bg-slate-800/60 transition-all shadow-inner" placeholder="Ej: Lionel Messi"/>
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] md:tracking-[0.5em] ml-4 mb-3 md:mb-5 block group-focus-within:text-green-500 transition-colors">WhatsApp Oficial</label>
                                        <div className="relative">
                                            <Phone className="absolute left-6 md:left-10 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-green-500 transition-all duration-500" size={24} />
                                            <input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800/40 border-2 border-white/5 rounded-[2rem] md:rounded-[2.5rem] py-6 md:py-10 pl-16 md:pl-24 pr-8 md:pr-10 text-white text-xl md:text-3xl font-black outline-none focus:border-green-500/50 focus:bg-slate-800/60 transition-all shadow-inner font-mono" placeholder="11 1234 5678"/>
                                        </div>
                                    </div>

                                    <div onClick={() => setIsAgreed(!isAgreed)} className={`p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border transition-all duration-500 flex items-start gap-6 md:gap-8 cursor-pointer group shadow-2xl ${isAgreed ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                        <div className={`mt-1 md:mt-2 w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl border-2 flex items-center justify-center transition-all duration-500 shrink-0 ${isAgreed ? 'bg-blue-600 border-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)] scale-110' : 'border-slate-700'}`}>
                                            {isAgreed && <Check size={20} className="text-white md:w-6 md:h-6" strokeWidth={4}/>}
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-lg md:text-xl uppercase italic tracking-tighter mb-1 md:mb-2">Confirmación por WhatsApp</p>
                                            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-[0.1em] md:tracking-widest opacity-80">Entiendo que debo enviar el mensaje automático para validar mi turno.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NUEVO: VIEW GALERÍA */}
                        {step === 'GALLERY' && (
                            <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 space-y-8 md:space-y-12 pb-24 md:pb-0">
                                <div className="mb-8 md:mb-16">
                                    <h2 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 md:mb-6 tracking-tighter uppercase italic leading-[0.8] break-words">Nuestro <span className="text-blue-600">Club</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[10px] border-l-4 border-blue-600 pl-4">Conoce nuestras instalaciones</p>
                                </div>
                                
                                {config.gallery && config.gallery.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                        {config.gallery.map((img, i) => (
                                            <div key={i} className="h-64 sm:h-56 md:h-72 w-full rounded-3xl md:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl group relative cursor-pointer bg-slate-900">
                                                <img src={img} alt={`Foto complejo ${i+1}`} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"/>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6 md:p-8">
                                                    <ImageIcon className="text-white drop-shadow-xl" size={24}/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 md:py-40 bg-slate-800/40 rounded-3xl md:rounded-[4rem] border-2 border-dashed border-white/5 flex flex-col items-center">
                                        <ImageIcon size={60} className="mb-4 md:mb-6 text-slate-700 animate-pulse"/>
                                        <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-xs md:text-sm">Próximamente nuevas fotos</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* NUEVO: VIEW RANKING */}
                        {step === 'RANKING' && (
                            <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 space-y-8 md:space-y-12 max-w-5xl mx-auto pb-24 md:pb-0">
                                <div className="mb-8 md:mb-16">
                                    <h2 className="text-4xl md:text-6xl lg:text-8xl font-black text-white mb-4 md:mb-6 tracking-tighter uppercase italic leading-[0.8] break-words">Ranking <span className="text-yellow-500">Torneo</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-[10px] border-l-4 border-yellow-500 pl-4">Tabla de posiciones oficial</p>
                                </div>

                                <div className="bg-slate-900/60 rounded-3xl md:rounded-[4rem] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] md:tracking-[0.3em]">
                                                <tr className="border-b border-white/5">
                                                    <th className="p-4 md:p-8">Pos.</th>
                                                    <th className="p-4 md:p-8">Jugador</th>
                                                    <th className="p-4 md:p-8 text-center hidden md:table-cell">Partidos</th>
                                                    <th className="p-4 md:p-8 text-right text-yellow-500">Puntos</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {config.tournamentRanking && config.tournamentRanking.length > 0 ? (
                                                    config.tournamentRanking.sort((a,b) => b.points - a.points).map((player, i) => (
                                                        <tr key={player.id} className="hover:bg-white/5 transition-all duration-300 group">
                                                            <td className="p-4 md:p-8">
                                                                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center font-black text-xl md:text-2xl italic shadow-lg ${i === 0 ? 'bg-yellow-500 text-black shadow-yellow-500/30' : i === 1 ? 'bg-slate-300 text-black shadow-slate-300/30' : i === 2 ? 'bg-orange-400 text-black shadow-orange-400/30' : 'bg-slate-800 text-slate-400'}`}>
                                                                    #{i+1}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 md:p-8 min-w-[150px]">
                                                                <p className="text-white font-black uppercase italic text-lg md:text-3xl mb-1 md:mb-2 group-hover:translate-x-2 transition-transform truncate">{player.name}</p>
                                                                <span className="text-[8px] md:text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 md:px-3 py-1 rounded-full font-black uppercase tracking-widest whitespace-nowrap">Cat. {player.category}</span>
                                                            </td>
                                                            <td className="p-4 md:p-8 text-center text-slate-400 font-mono font-bold text-lg md:text-xl hidden md:table-cell">
                                                                {player.matchesPlayed}
                                                            </td>
                                                            <td className="p-4 md:p-8 text-right">
                                                                <span className="font-black text-yellow-400 text-2xl md:text-5xl font-mono drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">{player.points}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="p-10 md:p-20 text-center text-slate-500 italic font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em]">
                                                            El ranking se publicará próximamente.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 p-6 md:p-10 bg-yellow-500/10 rounded-3xl md:rounded-[3rem] border border-yellow-500/20 text-center md:text-left">
                                    <Trophy className="text-yellow-500 shrink-0" size={40} strokeWidth={1.5}/>
                                    <div>
                                        <p className="text-white font-black text-xl md:text-2xl uppercase italic mb-1 md:mb-2">Temporada Oficial</p>
                                        <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider uppercase">Actualizado semanalmente en base a los resultados verificados.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER DE CONTROL PARA RESERVAS --- */}
                    {(['DATE', 'SLOTS', 'COURT_SELECT', 'FORM'] as any).includes(step) && step !== 'DATE' && (
                        <div className="bg-slate-950/95 backdrop-blur-[50px] border-t border-white/5 p-6 md:p-12 lg:px-24 lg:py-16 shrink-0 z-50 shadow-[0_-30px_100px_rgba(0,0,0,0.8)] relative">
                            {isPromoEligible && (
                                <div className="mb-6 md:mb-10 flex items-center gap-3 md:gap-5 justify-center text-[10px] md:text-xs font-black text-orange-400 bg-orange-500/10 py-3 md:py-5 rounded-xl md:rounded-[2rem] border border-orange-500/20 uppercase tracking-[0.2em] md:tracking-[0.4em] animate-pulse">
                                    <Flame size={18} className="animate-bounce md:w-6 md:h-6"/> {config.promoText || '¡Turno Largo Bonificado!'} <Flame size={18} className="animate-bounce md:w-6 md:h-6"/>
                                </div>
                            )}
                            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-12 max-w-[1200px] mx-auto">
                                <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-12 w-full lg:w-auto text-center sm:text-left">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] md:text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] md:tracking-[0.5em] mb-1 md:mb-3">Total de Reserva</span>
                                        <div className="flex items-baseline justify-center sm:justify-start gap-3 md:gap-5">
                                            <span className="text-4xl md:text-6xl font-black text-white italic tracking-tighter font-mono drop-shadow-2xl">${totalPrice.toLocaleString()}</span>
                                            {isPromoEligible && <div className="bg-red-600 text-white px-3 py-1 md:px-4 md:py-1.5 rounded-xl md:rounded-2xl font-black uppercase shadow-2xl text-[9px] md:text-xs">Promo</div>}
                                        </div>
                                    </div>
                                    <div className="h-12 md:h-16 w-full sm:w-px bg-white/10 hidden sm:block"></div>
                                    <div className="flex flex-col items-center sm:items-start">
                                        <span className="text-[9px] md:text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] md:tracking-[0.5em] mb-1 md:mb-3">Método</span>
                                        <div className="flex items-center gap-2 md:gap-3 text-slate-400 uppercase font-black text-[9px] md:text-[10px] tracking-widest bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-white/5 shadow-2xl">
                                            <Smartphone size={12} className="text-blue-500 md:w-3.5 md:h-3.5"/> WhatsApp Secure
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => {
                                        if (step === 'SLOTS') setStep('COURT_SELECT');
                                        else if (step === 'COURT_SELECT') setStep('FORM');
                                        else handleConfirmBooking();
                                    }}
                                    disabled={
                                        selectedSlotIds.length === 0 || 
                                        (step === 'COURT_SELECT' && !selectedCourtId) ||
                                        (step === 'FORM' && (!customerData.name || !customerData.phone || !isAgreed))
                                    }
                                    className={`w-full lg:w-auto h-20 md:h-28 lg:px-24 rounded-2xl md:rounded-[3rem] font-black text-white shadow-2xl transition-all flex items-center justify-center gap-4 md:gap-8 uppercase tracking-[0.2em] md:tracking-[0.4em] text-sm md:text-xl relative group overflow-hidden ${ (selectedSlotIds.length > 0 && (step !== 'COURT_SELECT' || selectedCourtId) && (step !== 'FORM' || isAgreed)) ? 'bg-green-600 hover:bg-green-500 active:scale-95 shadow-green-900/50 translate-y-[-4px] md:translate-y-[-6px]' : 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5 opacity-30 grayscale' }`}
                                >
                                    {step === 'FORM' ? <><MessageCircle size={24} className="animate-pulse md:w-10 md:h-10"/> Reservar ahora</> : <>Continuar <ChevronRight size={24} className="md:w-10 md:h-10"/></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {/* MODAL DE AYUDA Y BOTÓN FLOTANTE */}
        {isHelpOpen && <HelpModal/>}
        <button onClick={() => setIsHelpOpen(true)} className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-16 h-16 md:w-20 md:h-20 bg-slate-800 text-blue-400 rounded-full flex items-center justify-center shadow-2xl border border-white/10 hover:bg-slate-700 transition-all active:scale-90 z-[90]"><HelpCircle size={24} className="md:w-8 md:h-8"/></button>
    </div>
  );
};
