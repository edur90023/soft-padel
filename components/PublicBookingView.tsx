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
  Smartphone,
  CreditCard,
  Wifi,
  Coffee,
  IceCream,
  Utensils,
  Trophy,
  History,
  AlertCircle,
  HelpCircle,
  X,
  Lock,
  Globe,
  Activity,
  Heart,
  Music,
  Tv,
  Plus,
  Check,
  Bell,
  ThumbsUp
} from 'lucide-react';
import { Court, Booking, ClubConfig, BookingStatus } from '../types';
import { COLOR_THEMES } from '../constants';

interface PublicBookingViewProps {
  config: ClubConfig;
  courts: Court[];
  bookings: Booking[];
  onAddBooking: (booking: Booking) => void;
}

// --- HELPER TYPES ---
interface TimeSlot {
    time: string;       
    id: string;         
    isNextDay: boolean;
    realDate: string;   
}

// --- UTILS (ZONA HORARIA CORREGIDA) ---
const getArgentinaDate = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
};

const isTimeInPast = (slotDateStr: string, timeStr: string) => {
    const now = getArgentinaDate();
    const [h, m] = timeStr.split(':').map(Number);
    const [year, month, day] = slotDateStr.split('-').map(Number);
    const slotDate = new Date(year, month - 1, day, h, m);
    const bufferTime = new Date(now.getTime() + 15 * 60000);
    return slotDate < bufferTime;
};

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ config, courts, bookings, onAddBooking }) => {
  // --- ESTADOS ---
  const [step, setStep] = useState<'DATE' | 'SLOTS' | 'COURT_SELECT' | 'FORM' | 'SUCCESS'>('DATE');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]); 
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });
  const [isAgreed, setIsAgreed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const activeAds = useMemo(() => config.ads.filter(ad => ad.isActive), [config.ads]);
  const theme = COLOR_THEMES[config.courtColorTheme];

  // --- RENDERAD (CORREGIDO PARA EVITAR REFERENCE ERROR) ---
  const renderAd = () => {
    if (activeAds.length === 0) return null;
    const ad = activeAds[currentAdIndex];
    return (
        <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group mt-auto transition-all duration-1000 ease-in-out">
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

  const ServiceBadge = ({ icon: Icon, label }: { icon: any, label: string }) => (
    <div className="flex flex-col items-center gap-2 p-5 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all group shadow-xl">
        <Icon className="text-blue-400 group-hover:scale-110 transition-transform duration-500" size={24}/>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );

  const HelpModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
        <div className="bg-slate-900 border border-white/10 rounded-[3.5rem] w-full max-w-2xl p-12 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12"><HelpCircle size={200}/></div>
            <button onClick={() => setIsHelpOpen(false)} className="absolute top-8 right-8 p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><X size={24}/></button>
            <h3 className="text-5xl font-black text-white mb-8 tracking-tighter uppercase italic leading-none">Guía de <span className="text-blue-500">Reserva</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-2"><div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500"><Calendar size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">1. Fecha</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Elegí el día en el calendario interactivo.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500"><Clock size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">2. Horario</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Cada bloque es de 30m. Elegí los que necesites.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500"><Map size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">3. Cancha</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seleccioná tu pista favorita entre las disponibles.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-orange-600/20 rounded-2xl flex items-center justify-center text-orange-500"><Smartphone size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">4. WhatsApp</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Confirmá enviando el mensaje final al club.</p></div>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="w-full mt-12 bg-white text-slate-950 font-black py-6 rounded-3xl uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Entendido</button>
        </div>
    </div>
  );

  useEffect(() => {
      if (activeAds.length <= 1) return;
      const interval = setInterval(() => setCurrentAdIndex(prev => (prev + 1) % activeAds.length), (config.adRotationInterval || 5) * 1000);
      return () => clearInterval(interval);
  }, [activeAds, config.adRotationInterval]);

  const handleDateChange = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const today = new Date(); today.setHours(0,0,0,0);
    if (d < today) return;
    setSelectedDate(d.toISOString().split('T')[0]);
    setSelectedSlotIds([]);
    setSelectedCourtId(null);
  };

  // --- GENERADOR DE SLOTS (INCLUYE MADRUGADA) ---
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
      const msg = `Hola! Reserva en *${config.name}*%0A👤 *Cliente:* ${customerData.name}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time}%0A⏳ *Duración:* ${selectedSlotIds.length * 30} min%0A🏟 *Cancha:* ${court.name}%0A💰 *Total:* $${totalPrice.toLocaleString()}${isPromoEligible ? `%0A🎁 *PROMO:* ${config.promoText}` : ''}`;
      setTimeout(() => { window.open(`https://wa.me/${config.ownerPhone.replace('+', '')}?text=${msg}`, '_blank'); }, 1000);
  };

  if (step === 'SUCCESS') {
      return (
          <div className="h-full flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-600/5 blur-[120px] rounded-full animate-pulse"></div>
              <div className="relative z-10 max-w-lg w-full bg-slate-900 border border-white/10 p-16 rounded-[4rem] shadow-2xl text-center animate-in zoom-in-95 duration-700">
                  <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-10 border border-green-500/30 shadow-[0_0_80px_rgba(34,197,94,0.4)]">
                      <CheckCircle size={70} className="text-green-500 animate-in zoom-in spin-in-12 duration-1000" strokeWidth={3} />
                  </div>
                  <h2 className="text-5xl font-black text-white mb-6 tracking-tighter uppercase italic leading-none">Turno <br/><span className="text-green-500">Enviado</span></h2>
                  <p className="text-slate-400 mb-12 leading-relaxed text-sm font-bold uppercase tracking-[0.2em]">Finaliza la confirmación por WhatsApp.</p>
                  <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); setCustomerData({name:'', phone:''}); setIsAgreed(false); }} className="w-full bg-white text-slate-950 font-black py-6 rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-[0.4em] shadow-2xl active:scale-95">Nueva Reserva</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-sans selection:bg-blue-600/40 bg-slate-950">
        
        {/* --- FONDO ESMERILADO RECUPERADO --- */}
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : 'none' }}></div>
             <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[12px]"></div>
             {/* Destellos de color */}
             <div className="absolute -top-[15%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
             <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col h-full md:p-8 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-lg md:max-w-7xl md:max-h-[92vh] bg-slate-900/60 border border-white/20 md:rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col md:flex-row overflow-hidden backdrop-blur-3xl transition-all duration-700">
                
                {/* --- SIDEBAR DESKTOP --- */}
                <div className="hidden md:flex w-[32%] border-r border-white/10 flex-col p-14 bg-black/40 justify-between relative overflow-hidden shrink-0">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                     <div className="space-y-12 relative z-10">
                        <div className="group relative w-32 h-32">
                            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-white/10 bg-slate-800 rotate-6 group-hover:rotate-0 transition-transform duration-700">
                                {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover" alt="Logo"/> : <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-black text-4xl`}>{config.name.charAt(0)}</div>}
                            </div>
                        </div>
                        <div>
                            <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.85] mb-6 uppercase italic drop-shadow-2xl">
                                {config.name.split(' ').map((word, i) => <span key={i} className="block">{word}</span>)}
                            </h1>
                            <div className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] bg-blue-500/10 w-fit px-4 py-2 rounded-full border border-blue-500/20 shadow-inner">
                                <Navigation size={12} className="animate-pulse"/> <span>Sede Principal</span>
                            </div>
                        </div>
                        <div className="space-y-8 py-10 border-y border-white/5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] block">Fecha Seleccionada</label>
                                <div className="text-white font-black text-3xl flex items-center gap-4 bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                                    <Calendar size={28} className="text-blue-500"/> {selectedDate}
                                </div>
                            </div>
                            {selectedSlotIds.length > 0 && (
                                <div className="space-y-2 animate-in slide-in-from-left-6">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] block">Tiempo de Juego</label>
                                    <div className="text-white font-black text-3xl flex items-center gap-4 bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                                        <Clock size={28} className="text-purple-500"/> {selectedSlotIds.length * 30} min
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>
                     {renderAd()}
                </div>

                {/* --- CONTENIDO PRINCIPAL --- */}
                <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900/20">
                    
                    {/* Header Mobile */}
                    <div className="md:hidden p-6 pb-2 flex flex-col items-center shrink-0 relative bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-50">
                        {step !== 'DATE' && (
                            <button onClick={() => {
                                if (step === 'SLOTS') setStep('DATE');
                                if (step === 'COURT_SELECT') setStep('SLOTS');
                                if (step === 'FORM') setStep('COURT_SELECT');
                            }} className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-white/5 text-white active:scale-90 transition-all border border-white/10 shadow-xl">
                                <ArrowLeft size={24}/>
                            </button>
                        )}
                        <h1 className="text-2xl font-black text-white text-center uppercase tracking-tighter italic drop-shadow-xl">{config.name}</h1>
                        <button onClick={() => setIsHelpOpen(true)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-2 transition-all"><HelpCircle size={24}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 md:p-20 scrollbar-hide relative z-30">
                        
                        {/* STEP 1: DATE */}
                        {step === 'DATE' && (
                            <div className="animate-in fade-in slide-in-from-bottom-20 duration-1000">
                                <div className="mb-16">
                                    <h2 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter uppercase italic leading-[0.8]">Reservá tu <span className="text-blue-600">Turno</span></h2>
                                    <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] border-l-4 border-blue-600 pl-4">Comenzá seleccionando el día de juego</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
                                    <div className="lg:col-span-8 bg-slate-800/60 backdrop-blur-md p-6 rounded-[3rem] border border-white/10 flex items-center justify-between shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] group">
                                        <button onClick={() => handleDateChange(-1)} className="p-10 text-white hover:bg-white/10 rounded-[2.5rem] transition-all hover:scale-110 active:scale-95"><ChevronLeft size={48}/></button>
                                        <div className="text-center flex-1">
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] block mb-4">Calendario</span>
                                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-4xl font-black text-white text-center w-full outline-none cursor-pointer font-mono"/>
                                        </div>
                                        <button onClick={() => handleDateChange(1)} className="p-10 text-white hover:bg-white/10 rounded-[2.5rem] transition-all hover:scale-110 active:scale-95"><ChevronRight size={48}/></button>
                                    </div>
                                    <div className="lg:col-span-4 grid grid-cols-1 gap-6">
                                        <div className="bg-white/5 backdrop-blur-md p-10 rounded-[3rem] border border-white/10 flex items-center gap-6 shadow-xl">
                                            <div className="w-16 h-16 bg-yellow-500/20 rounded-[1.5rem] flex items-center justify-center text-yellow-500 shadow-lg"><Award size={32}/></div>
                                            <div><p className="text-white font-black text-2xl uppercase italic">Premium</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sede Pro</p></div>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-md p-10 rounded-[3rem] border border-white/10 flex items-center gap-6 shadow-xl">
                                            <div className="w-16 h-16 bg-blue-500/20 rounded-[1.5rem] flex items-center justify-center text-blue-500 shadow-lg"><ShieldCheck size={32}/></div>
                                            <div><p className="text-white font-black text-2xl uppercase italic">Secure</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">SSL Validated</p></div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setStep('SLOTS')} className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] flex items-center justify-center gap-8 shadow-[0_30px_60px_-15px_rgba(59,130,246,0.6)] hover:translate-y-[-8px] transition-all uppercase tracking-[0.4em] text-2xl group`}>
                                    <Clock size={36} className="group-hover:rotate-12 transition-transform duration-500"/> Ver Horarios Disponibles
                                </button>
                                <div className="md:hidden mt-20">{renderAd()}</div>
                            </div>
                        )}

                        {/* STEP 2: SLOTS (SE MAPEAN TODOS LOS HORARIOS INCLUSO MADRUGADA) */}
                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800">
                                <div className="mb-16 border-b border-white/5 pb-10">
                                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Elegí tu <span className="text-blue-600">Tiempo</span></h2>
                                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mt-4">Paso 2: Marcá los bloques de 30m</p>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6 mb-20">
                                    {/* CORRECCIÓN: Se quitó el .filter(s => !s.isNextDay) para mostrar la madrugada */}
                                    {generatedSlots.map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button 
                                                key={slot.id}
                                                disabled={!isAvailable}
                                                onMouseEnter={() => setHoveredSlot(slot.id)}
                                                onMouseLeave={() => setHoveredSlot(null)}
                                                onClick={() => toggleSlotSelection(slot.id)}
                                                className={`relative h-28 w-full rounded-[2rem] text-2xl font-black transition-all duration-500 border-2 flex flex-col items-center justify-center ${isSelected ? `${theme.primary} text-white border-white/60 shadow-[0_0_60px_rgba(59,130,246,0.8)] scale-110 z-20` : isAvailable ? 'bg-slate-800/60 text-white border-white/10 hover:bg-slate-700 hover:border-white/40 hover:scale-105 shadow-xl' : 'bg-slate-950/60 text-slate-800 border-transparent opacity-20 cursor-not-allowed grayscale'}`}
                                            >
                                                {slot.time}
                                                {/* Indicador visual para turnos después de las 00:00 */}
                                                {slot.isNextDay && <span className={`text-[9px] uppercase tracking-widest font-black absolute bottom-2 ${isSelected ? 'text-blue-200' : 'text-blue-400'}`}>Madrugada</span>}
                                                
                                                {isSelected && <div className="absolute -top-4 -right-4 bg-white text-blue-600 rounded-full p-2.5 shadow-2xl animate-in zoom-in duration-500 border-4 border-slate-900"><CheckCircle size={24} strokeWidth={4}/></div>}
                                                {hoveredSlot === slot.id && isAvailable && !isSelected && (
                                                    <div className="absolute -bottom-12 bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl shadow-2xl z-50 uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-top-3">Seleccionar</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedSlotIds.length > 0 && (
                                    <div className="animate-in zoom-in duration-700">
                                        <button onClick={() => setStep('COURT_SELECT')} className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] uppercase tracking-[0.5em] flex items-center justify-center gap-10 group transition-all duration-700 text-2xl relative overflow-hidden`}>
                                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            Siguiente: Elegir Cancha <ChevronRight size={44} className="group-hover:translate-x-6 transition-transform duration-700"/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 3: COURT SELECT */}
                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800">
                                <div className="mb-16">
                                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Elegí la <span className="text-blue-600">Cancha</span></h2>
                                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] mt-4 opacity-60">Opciones 100% libres para tu horario</p>
                                </div>

                                <div className="grid grid-cols-1 gap-10 mb-20">
                                    {availableCourtsForSelection.length === 0 ? (
                                        <div className="text-center py-40 bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 flex flex-col items-center">
                                            <Moon size={80} className="mb-6 text-slate-700 animate-pulse"/>
                                            <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-sm">Sin disponibilidad libre</p>
                                            <button onClick={() => setStep('SLOTS')} className="mt-8 text-blue-500 font-black uppercase text-[10px] tracking-[0.3em] hover:text-white transition-colors border-b border-blue-500/20 pb-1">Volver a Horarios</button>
                                        </div>
                                    ) : (
                                        availableCourtsForSelection.map(court => (
                                            <button 
                                                key={court.id}
                                                onClick={() => setSelectedCourtId(court.id)}
                                                className={`p-12 rounded-[3.5rem] border-2 transition-all flex items-center justify-between group relative overflow-hidden backdrop-blur-md ${selectedCourtId === court.id ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_80px_rgba(59,130,246,0.4)] scale-[1.02]' : 'bg-slate-800/40 border-white/10 hover:bg-slate-800/60 hover:border-white/30'}`}
                                            >
                                                <div className="flex items-center gap-12 text-left z-20">
                                                    <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 ${selectedCourtId === court.id ? 'bg-blue-600 text-white scale-110 rotate-6 shadow-2xl' : 'bg-slate-900 text-slate-500 group-hover:bg-slate-800'}`}>
                                                        <Navigation size={50}/>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-white text-5xl leading-none uppercase italic tracking-tighter mb-4">{court.name}</h4>
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                                                                <Star size={12} className="text-yellow-500 fill-yellow-500"/> {court.type}
                                                            </div>
                                                            <span className="text-2xl font-black text-green-400 font-mono tracking-tighter">${(court.basePrice * selectedSlotIds.length).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {selectedCourtId === court.id ? (
                                                    <div className="bg-blue-500 text-white p-8 rounded-[2rem] shadow-2xl animate-in zoom-in-50 duration-500">
                                                        <Check size={48} strokeWidth={4}/>
                                                    </div>
                                                ) : (
                                                    <div className="w-20 h-20 rounded-[1.5rem] border-2 border-white/10 flex items-center justify-center text-white/10 group-hover:border-blue-500/50 group-hover:text-blue-500 transition-all duration-500">
                                                        <Plus size={40}/>
                                                    </div>
                                                )}
                                                
                                                <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/4 opacity-[0.02] group-hover:opacity-[0.06] transition-all duration-1000 pointer-events-none">
                                                    <LayoutGrid size={350}/>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button 
                                    disabled={!selectedCourtId}
                                    onClick={() => setStep('FORM')} 
                                    className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] uppercase tracking-[0.4em] flex items-center justify-center gap-6 disabled:opacity-10 disabled:grayscale transition-all active:scale-95 text-xl relative group overflow-hidden`}
                                >
                                    Siguiente: Datos Personales <ChevronRight size={36}/>
                                </button>
                            </div>
                        )}

                        {/* STEP 4: FORM */}
                        {step === 'FORM' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800 flex flex-col h-full max-w-4xl">
                                <div className="mb-20">
                                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Tus <span className="text-blue-600">Datos</span></h2>
                                    <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] mt-4 opacity-60">Paso final de confirmación</p>
                                </div>

                                <div className="space-y-12 flex-1">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] ml-4 mb-5 block group-focus-within:text-blue-500 transition-colors">Nombre Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-all duration-500" size={32}/>
                                            <input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800/60 backdrop-blur-md border-2 border-white/10 rounded-[2.5rem] py-10 pl-24 pr-10 text-white text-3xl font-black outline-none focus:border-blue-500/50 transition-all shadow-inner" placeholder="Ej: Lionel Messi"/>
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] ml-4 mb-5 block group-focus-within:text-green-500 transition-colors">WhatsApp Oficial</label>
                                        <div className="relative">
                                            <Phone className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-green-500 transition-all duration-500" size={32}/>
                                            <input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800/60 backdrop-blur-md border-2 border-white/10 rounded-[2.5rem] py-10 pl-24 pr-10 text-white text-3xl font-black outline-none focus:border-green-500/50 transition-all shadow-inner font-mono" placeholder="11 1234 5678"/>
                                        </div>
                                    </div>

                                    <div onClick={() => setIsAgreed(!isAgreed)} className={`p-10 rounded-[3rem] border transition-all duration-500 flex items-start gap-8 cursor-pointer group shadow-2xl backdrop-blur-md ${isAgreed ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-800/40 border-white/10 hover:bg-slate-800/60'}`}>
                                        <div className={`mt-2 w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${isAgreed ? 'bg-blue-600 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.6)] scale-110' : 'border-slate-600'}`}>
                                            {isAgreed && <Check size={24} className="text-white" strokeWidth={4}/>}
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-xl uppercase italic tracking-tighter mb-2">Confirmación por WhatsApp</p>
                                            <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest opacity-80">Entiendo que debo enviar el mensaje automático para validar mi turno.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER FINAL --- */}
                    {step !== 'DATE' && (
                        <div className="bg-slate-950/90 backdrop-blur-[50px] border-t border-white/10 p-12 md:px-24 md:py-16 shrink-0 z-50 shadow-[0_-30px_100px_rgba(0,0,0,0.8)] relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-10 py-2 bg-blue-600 rounded-full text-[9px] font-black text-white uppercase tracking-[0.5em] shadow-2xl border border-white/20">
                                Reserva Segura v4.0
                            </div>

                            {isPromoEligible && (
                                <div className="mb-10 flex items-center gap-5 justify-center text-xs font-black text-orange-400 bg-orange-500/10 py-5 rounded-[2rem] border border-orange-500/20 uppercase tracking-[0.4em] animate-pulse">
                                    <Flame size={24} className="animate-bounce"/> {config.promoText || '¡Turno Largo Bonificado!'} <Flame size={24} className="animate-bounce"/>
                                </div>
                            )}
                            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 md:max-w-[1200px] md:mx-auto">
                                <div className="flex items-center gap-12 w-full lg:w-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mb-3">Total de Reserva</span>
                                        <div className="flex items-baseline gap-5">
                                            <span className="text-6xl font-black text-white italic tracking-tighter font-mono drop-shadow-2xl">${totalPrice.toLocaleString()}</span>
                                            {isPromoEligible && <div className="bg-red-600 text-white px-4 py-1.5 rounded-2xl font-black uppercase shadow-2xl text-xs">Promo Active</div>}
                                        </div>
                                    </div>
                                    <div className="h-16 w-px bg-white/10 hidden md:block"></div>
                                    <div className="hidden xl:flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mb-3">Método de Validación</span>
                                        <div className="flex items-center gap-3 text-slate-300 uppercase font-black text-[10px] tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                                            <Smartphone size={14} className="text-blue-500"/> WhatsApp Secure Auth
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
                                    className={`h-28 w-full lg:w-auto lg:px-24 rounded-[3rem] font-black text-white shadow-2xl transition-all flex items-center justify-center gap-8 uppercase tracking-[0.4em] text-xl relative group overflow-hidden ${ (selectedSlotIds.length > 0 && (step !== 'COURT_SELECT' || selectedCourtId) && (step !== 'FORM' || isAgreed)) ? 'bg-green-600 hover:bg-green-500 active:scale-95 shadow-green-900/50 translate-y-[-6px]' : 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5 opacity-30 grayscale' }`}
                                >
                                    {step === 'FORM' ? <><MessageCircle size={40} className="animate-pulse"/> Reservar</> : <>Continuar <ChevronRight size={40}/></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* BOTÓN FLOTANTE AYUDA */}
        <button onClick={() => setIsHelpOpen(true)} className="fixed bottom-8 right-8 w-20 h-20 bg-slate-800 text-blue-400 rounded-full flex items-center justify-center shadow-2xl border border-white/10 hover:bg-slate-700 transition-all active:scale-90 z-[90]"><HelpCircle size={32}/></button>
        {isHelpOpen && <HelpModal/>}
    </div>
  );
};
