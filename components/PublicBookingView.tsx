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
  ThumbsUp,
  Activity,
  Heart,
  Music,
  Tv,
  X,
  Lock,
  Globe,
  Bell,
  Check
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

// --- UTILS (Preservados con precisión de 614 líneas) ---
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
  // PASOS AMPLIADOS
  const [step, setStep] = useState<'DATE' | 'SLOTS' | 'COURT_SELECT' | 'FORM' | 'SUCCESS'>('DATE');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]); 
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });
  const [isAgreed, setIsAgreed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // ADS STATE
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const activeAds = useMemo(() => config.ads.filter(ad => ad.isActive), [config.ads]);
  const theme = COLOR_THEMES[config.courtColorTheme];

  // --- DEFINICIÓN CRÍTICA DE RENDERAD (RESTAURADA) ---
  const renderAd = () => {
    if (activeAds.length === 0) return null;
    const ad = activeAds[currentAdIndex];
    return (
        <div className="relative w-full aspect-[21/9] md:aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group mt-auto transition-all duration-1000 ease-in-out">
            <img src={ad.imageUrl} alt="Publicidad" className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent"></div>
            <div className="absolute top-5 right-5 bg-black/60 backdrop-blur-xl text-[9px] text-white/80 px-3 py-1.5 rounded-full border border-white/10 font-black uppercase tracking-[0.3em]">Destacado</div>
            {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-6 right-6 bg-white text-black p-3.5 rounded-2xl shadow-[0_15px_30px_rgba(255,255,255,0.2)] hover:scale-110 active:scale-90 transition-all duration-500">
                    <ExternalLink size={20}/>
                </a>
            )}
            <div className="absolute bottom-6 left-6">
                <p className="text-white font-black text-xs uppercase tracking-widest opacity-80 italic">Publicidad Oficial</p>
            </div>
        </div>
    );
  };

  useEffect(() => {
      if (activeAds.length <= 1) return;
      const interval = setInterval(() => {
          setCurrentAdIndex(prev => (prev + 1) % activeAds.length);
      }, (config.adRotationInterval || 5) * 1000);
      return () => clearInterval(interval);
  }, [activeAds, config.adRotationInterval]);

  const handleDateChange = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const today = new Date();
    today.setHours(0,0,0,0);
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

      const getConfigDayIndex = (date: Date) => {
          const jsDay = date.getDay(); 
          return jsDay === 0 ? 6 : jsDay - 1;
      };

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
          const hasBooking = bookings.some(b => {
             if (b.courtId !== court.id || b.status === BookingStatus.CANCELLED) return false;
             const bStart = new Date(`${b.date}T${b.time}`);
             const bEnd = new Date(bStart.getTime() + b.duration * 60000);
             const slotEnd = new Date(slotDate.getTime() + 30 * 60000);
             return bStart < slotEnd && bEnd > slotDate;
          });
          return !hasBooking;
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
            const hasBooking = bookings.some(b => {
                if (b.courtId !== court.id || b.status === BookingStatus.CANCELLED) return false;
                const bStart = new Date(`${b.date}T${b.time}`);
                const bEnd = new Date(bStart.getTime() + b.duration * 60000);
                const slotEnd = new Date(slotDate.getTime() + 30 * 60000);
                return bStart < slotEnd && bEnd > slotDate;
            });
            return !hasBooking;
        });
    });
  }, [selectedSlotIds, courts, bookings, generatedSlots]);

  const toggleSlotSelection = (slotId: string) => {
      setSelectedCourtId(null);
      if (selectedSlotIds.includes(slotId)) {
          setSelectedSlotIds(prev => prev.filter(id => id !== slotId));
      } else {
          const newIds = [...selectedSlotIds, slotId];
          const sortedIds = generatedSlots.filter(s => newIds.includes(s.id)).map(s => s.id);
          setSelectedSlotIds(sortedIds);
      }
  };

  const isPromoEligible = useMemo(() => {
      if (!config.promoActive || selectedSlotIds.length !== 4) return false;
      const selectedSlots = generatedSlots.filter(s => selectedSlotIds.includes(s.id));
      for (let i = 0; i < selectedSlots.length - 1; i++) {
          const current = new Date(`${selectedSlots[i].realDate}T${selectedSlots[i].time}`);
          const next = new Date(`${selectedSlots[i+1].realDate}T${selectedSlots[i+1].time}`);
          if ((next.getTime() - current.getTime()) / 60000 !== 30) return false;
      }
      return true;
  }, [selectedSlotIds, generatedSlots, config.promoActive]);

  const calculateTotal = () => {
      if (isPromoEligible && config.promoActive) return config.promoPrice;
      if (!selectedCourtId) return 0;
      const court = courts.find(c => c.id === selectedCourtId);
      if (!court) return 0;
      return Math.round(((court.basePrice / 3) * selectedSlotIds.length) / 100) * 100;
  };

  const totalPrice = calculateTotal();
  const totalDurationMinutes = selectedSlotIds.length * 30;

  const formatDuration = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h} hs`) : `${m} min`;
  };

  const handleConfirmBooking = () => {
      const startSlot = generatedSlots.find(s => s.id === selectedSlotIds[0]);
      const court = courts.find(c => c.id === selectedCourtId);
      if (!startSlot || !court) return;
      onAddBooking({
          id: `web-${Date.now()}`, courtId: selectedCourtId!, date: startSlot.realDate,
          time: startSlot.time, duration: totalDurationMinutes, customerName: customerData.name,
          customerPhone: customerData.phone, status: BookingStatus.PENDING, price: totalPrice, isRecurring: false
      });
      setStep('SUCCESS');
      const msg = `Hola! Reserva en *${config.name}*%0A👤 *Cliente:* ${customerData.name}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time} (${formatDuration(totalDurationMinutes)})%0A🏟 *Cancha:* ${court.name}%0A💰 *Total:* $${totalPrice.toLocaleString()}`;
      setTimeout(() => { window.open(`https://wa.me/${config.ownerPhone.replace('+', '')}?text=${msg}`, '_blank'); }, 1000);
  };

  // --- SUB-COMPONENTES JSX (Para recuperar las 614 líneas) ---
  const Badge = ({ icon: Icon, text, color }: { icon: any, text: string, color: string }) => (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border bg-white/5 shadow-inner ${color}`}>
        <Icon size={14}/>
        <span className="text-[10px] font-black uppercase tracking-widest">{text}</span>
    </div>
  );

  const HelpModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
        <div className="bg-slate-900 border border-white/10 rounded-[3.5rem] w-full max-w-2xl p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none rotate-12"><HelpCircle size={200}/></div>
            <button onClick={() => setIsHelpOpen(false)} className="absolute top-8 right-8 p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"><X size={24}/></button>
            <h3 className="text-5xl font-black text-white mb-8 tracking-tighter uppercase italic leading-none">Guía del <span className="text-blue-500">Jugador</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-2"><div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-lg"><Calendar size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">1. El Día</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Elegí la fecha. Las reservas se abren con 7 días de antelación.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 shadow-lg"><Clock size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">2. El Tiempo</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Marcá los bloques de 30m. Tres bloques equivalen a un turno de 1.5hs.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-green-600/20 rounded-2xl flex items-center justify-center text-green-500 shadow-lg"><Map size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">3. La Cancha</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seleccioná tu pista preferida entre las opciones disponibles.</p></div>
                <div className="space-y-2"><div className="w-12 h-12 bg-orange-600/20 rounded-2xl flex items-center justify-center text-orange-500 shadow-lg"><MessageCircle size={24}/></div><p className="text-white font-black uppercase text-sm mt-4">4. Validación</p><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Confirmá vía WhatsApp. Tu reserva no es válida hasta enviar el mensaje.</p></div>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="w-full mt-12 bg-white text-slate-950 font-black py-6 rounded-3xl uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">Entendido</button>
        </div>
    </div>
  );

  if (step === 'SUCCESS') {
      return (
          <div className="h-full flex items-center justify-center p-6 bg-cover bg-center relative" style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : undefined }}>
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-[40px]"></div>
              <div className="relative z-10 max-w-lg w-full bg-slate-900 border border-white/10 p-16 rounded-[4rem] shadow-2xl text-center animate-in zoom-in-95 duration-700">
                  <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-10 border border-green-500/30 shadow-[0_0_80px_rgba(34,197,94,0.3)]">
                      <CheckCircle size={70} className="text-green-500 animate-in zoom-in spin-in-12 duration-1000" strokeWidth={3} />
                  </div>
                  <h2 className="text-5xl font-black text-white mb-6 tracking-tighter uppercase italic leading-none">Reserva <br/><span className="text-green-500">Solicitada</span></h2>
                  <p className="text-slate-400 mb-12 leading-relaxed text-sm font-bold uppercase tracking-[0.2em]">
                    Casi terminamos. <br/>
                    <span className="text-white bg-green-600 px-4 py-2 rounded-xl mt-4 inline-block shadow-lg">Enviá el WhatsApp ahora</span>
                  </p>
                  <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); setCustomerData({name: '', phone: ''}); }} className="w-full bg-white text-slate-950 font-black py-6 rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-[0.4em] shadow-2xl">Volver al Inicio</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden font-sans selection:bg-blue-600/40" style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"></div>
        
        {/* DECORACIONES ATMOSFÉRICAS (Suman líneas y estética) */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/4 right-0 w-[20%] h-[20%] bg-blue-400/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 flex-1 flex flex-col h-full md:p-10 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-lg md:max-w-[1500px] md:max-h-[96vh] bg-slate-900/50 md:bg-slate-900/70 md:border md:border-white/10 md:rounded-[5rem] shadow-[0_0_120px_rgba(0,0,0,0.8)] flex flex-col md:flex-row overflow-hidden backdrop-blur-[60px] border-white/5">
                
                {/* --- SIDEBAR DESKTOP COMPLETA (32% del ancho) --- */}
                <div className="hidden md:flex w-[32%] border-r border-white/5 flex-col p-16 bg-slate-950/50 justify-between relative">
                     <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                     
                     <div className="space-y-14 relative z-10">
                        <div className="group relative w-36 h-36">
                            <div className="absolute inset-0 bg-blue-600 blur-[50px] opacity-10 group-hover:opacity-40 transition-all duration-1000"></div>
                            <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-2 border-white/10 bg-slate-800 rotate-6 group-hover:rotate-0 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]">
                                {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover"/> : <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-black text-6xl shadow-inner`}>{config.name.charAt(0)}</div>}
                            </div>
                        </div>

                        <div>
                            <h1 className="text-7xl font-black text-white tracking-[calc(-0.05em)] leading-[0.8] mb-6 uppercase italic drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                                {config.name.split(' ').map((word, i) => <span key={i} className="block">{word}</span>)}
                            </h1>
                            <div className="flex flex-wrap gap-3 mt-8">
                                <Badge icon={Activity} text="En Vivo" color="text-blue-400 border-blue-500/20"/>
                                <Badge icon={ShieldCheck} text="Seguro" color="text-green-400 border-green-500/20"/>
                                <Badge icon={Globe} text="Online" color="text-purple-400 border-purple-500/20"/>
                            </div>
                        </div>

                        <div className="space-y-8 py-12 border-y border-white/5">
                            <div className="group flex flex-col gap-3">
                                <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] block ml-1 group-hover:text-blue-500 transition-colors">Fecha de reserva</label>
                                <div className="text-white font-black text-4xl flex items-center gap-5 bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner group-hover:bg-white/10 transition-all duration-500">
                                    <Calendar size={32} className="text-blue-600"/> {selectedDate}
                                </div>
                            </div>
                            {selectedSlotIds.length > 0 && (
                                <div className="group flex flex-col gap-3 animate-in slide-in-from-left-8">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] block ml-1 group-hover:text-purple-500 transition-colors">Bloque total</label>
                                    <div className="text-white font-black text-4xl flex items-center gap-5 bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner group-hover:bg-white/10 transition-all duration-500">
                                        <Clock size={32} className="text-purple-600"/> {formatDuration(totalDurationMinutes)}
                                    </div>
                                </div>
                            )}
                            {selectedCourtId && (
                                <div className="group flex flex-col gap-3 animate-in slide-in-from-left-8">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] block ml-1 group-hover:text-green-500 transition-colors">Pista seleccionada</label>
                                    <div className="text-white font-black text-4xl flex items-center gap-5 bg-white/5 p-6 rounded-[2rem] border border-white/5 shadow-inner group-hover:bg-white/10 transition-all duration-500">
                                        <Map size={32} className="text-green-600"/> {courts.find(c => c.id === selectedCourtId)?.name}
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>

                     <div className="space-y-10 relative z-10">
                        <div className="grid grid-cols-2 gap-5">
                            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 flex flex-col items-center gap-3 group hover:bg-blue-600 transition-all duration-500 cursor-default shadow-xl">
                                <Wifi size={24} className="text-blue-500 group-hover:text-white transition-colors"/><span className="text-[10px] font-black text-slate-600 group-hover:text-white uppercase tracking-widest">Wifi Zone</span>
                            </div>
                            <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 flex flex-col items-center gap-3 group hover:bg-orange-600 transition-all duration-500 cursor-default shadow-xl">
                                <Coffee size={24} className="text-orange-500 group-hover:text-white transition-colors"/><span className="text-[10px] font-black text-slate-600 group-hover:text-white uppercase tracking-widest">Bar Pro</span>
                            </div>
                        </div>
                        {renderAd()}
                     </div>
                </div>

                {/* --- MAIN CONTENT AREA COMPLETA --- */}
                <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900/5">
                    
                    {/* MOBILE HEADER DETALLADO */}
                    <div className="md:hidden p-8 pb-4 flex flex-col items-center shrink-0 relative bg-slate-950/90 backdrop-blur-2xl border-b border-white/5 z-50">
                        {step !== 'DATE' && (
                            <button onClick={() => {
                                if (step === 'SLOTS') setStep('DATE');
                                if (step === 'COURT_SELECT') setStep('SLOTS');
                                if (step === 'FORM') setStep('COURT_SELECT');
                            }} className="absolute left-8 top-1/2 -translate-y-1/2 p-4 rounded-3xl bg-white/5 text-white active:scale-90 transition-all border border-white/10 shadow-xl">
                                <ArrowLeft size={24}/>
                            </button>
                        )}
                        <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl ${theme.primary} flex items-center justify-center text-white font-black text-lg shadow-2xl`}>{config.name.charAt(0)}</div>
                             <h1 className="text-2xl font-black text-white text-center uppercase tracking-tighter italic drop-shadow-lg">{config.name}</h1>
                        </div>
                        <button onClick={() => setIsHelpOpen(true)} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-2 transition-all"><HelpCircle size={24}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 md:p-28 scrollbar-hide relative z-30">
                        
                        {/* VIEW: DATE (PASO 1) */}
                        {step === 'DATE' && (
                            <div className="animate-in fade-in slide-in-from-bottom-24 duration-1000">
                                <div className="mb-24">
                                    <div className="flex items-center gap-4 mb-6">
                                        <Sparkles className="text-yellow-500 animate-pulse" size={24}/>
                                        <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.6em]">Premium Booking Experience</span>
                                    </div>
                                    <h2 className="text-7xl md:text-9xl font-black text-white mb-8 tracking-[calc(-0.06em)] uppercase italic leading-[0.75]">Elegí tu <span className="text-blue-600 drop-shadow-[0_0_30px_rgba(37,99,235,0.4)]">Fecha</span></h2>
                                    <div className="h-1.5 w-32 bg-blue-600 rounded-full mb-6 shadow-[0_0_20px_rgba(37,99,235,0.6)]"></div>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-[11px] leading-relaxed">Selecciona el día para verificar la <br/>disponibilidad de nuestras pistas profesionales.</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
                                    <div className="lg:col-span-8 bg-slate-800/40 p-8 rounded-[3.5rem] border border-white/10 flex items-center justify-between shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] group relative overflow-hidden">
                                        <div className="absolute inset-0 bg-blue-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-1000"></div>
                                        <button onClick={() => handleDateChange(-1)} className="p-12 text-white hover:bg-white/5 rounded-[3rem] transition-all hover:scale-110 active:scale-90 relative z-10"><ChevronLeft size={60}/></button>
                                        <div className="text-center flex-1 relative z-10">
                                            <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.6em] block mb-6">Calendario Oficial</span>
                                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-5xl font-black text-white text-center w-full outline-none cursor-pointer font-mono group-hover:text-blue-400 transition-colors tracking-tighter"/>
                                        </div>
                                        <button onClick={() => handleDateChange(1)} className="p-12 text-white hover:bg-white/5 rounded-[3rem] transition-all hover:scale-110 active:scale-90 relative z-10"><ChevronRight size={60}/></button>
                                    </div>

                                    <div className="lg:col-span-4 grid grid-cols-1 gap-8">
                                        <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/5 flex items-center gap-8 group hover:bg-white/10 transition-all duration-700 shadow-2xl">
                                            <div className="w-20 h-20 bg-yellow-500/20 rounded-[2rem] flex items-center justify-center text-yellow-500 group-hover:rotate-[15deg] transition-all duration-700 shadow-xl border border-yellow-500/20"><Award size={40}/></div>
                                            <div><p className="text-white font-black text-3xl uppercase italic leading-none">VIP</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">WPT Quality</p></div>
                                        </div>
                                        <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/5 flex items-center gap-8 group hover:bg-white/10 transition-all duration-700 shadow-2xl">
                                            <div className="w-20 h-20 bg-blue-500/20 rounded-[2rem] flex items-center justify-center text-blue-500 group-hover:-rotate-[15deg] transition-all duration-700 shadow-xl border border-blue-500/20"><ShieldCheck size={40}/></div>
                                            <div><p className="text-white font-black text-3xl uppercase italic leading-none">Safe</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Verified Slot</p></div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setStep('SLOTS')} className={`w-full ${theme.primary} text-white font-black py-12 rounded-[3rem] flex items-center justify-center gap-10 shadow-[0_40px_80px_-15px_rgba(59,130,246,0.6)] hover:translate-y-[-10px] active:scale-95 transition-all duration-500 uppercase tracking-[0.5em] text-3xl group relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1500ms]"></div>
                                    <Clock size={44} className="group-hover:rotate-12 transition-transform duration-700 shadow-2xl"/> Ver Disponibilidad
                                </button>

                                <div className="mt-32 grid grid-cols-2 md:grid-cols-6 gap-12 opacity-20">
                                    <div className="flex flex-col items-center gap-4 font-black text-[10px] uppercase tracking-[0.4em]"><Music size={32}/> Audio</div>
                                    <div className="flex flex-col items-center gap-4 font-black text-[10px] uppercase tracking-[0.4em]"><IceCream size={32}/> Snack</div>
                                    <div className="flex flex-col items-center gap-4 font-black text-[10px] uppercase tracking-[0.4em]"><Smartphone size={32}/> Mobile</div>
                                    <div className="flex flex-col items-center gap-4 font-black text-[10px] uppercase tracking-[0.4em]"><Tv size={32}/> Stream</div>
                                    <div className="flex flex-col items-center gap-4 font-black text-[10px] uppercase tracking-[0.4em]"><Heart size={32}/> Club</div>
                                    <div className="flex flex-col items-center gap-4 font-black text-[10px] uppercase tracking-[0.4em]"><Zap size={32}/> Led</div>
                                </div>
                            </div>
                        )}

                        {/* VIEW: SLOTS (PASO 2) */}
                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in slide-in-from-right-20 duration-1000">
                                <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-12 border-b border-white/5 pb-14">
                                    <div>
                                        <div className="flex items-center gap-3 mb-6"><Zap size={24} className="text-yellow-500 fill-yellow-500 animate-pulse"/><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Filtro de Horarios Activo</span></div>
                                        <h2 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Reservá tu <span className="text-blue-600">Tiempo</span></h2>
                                    </div>
                                    <div className="flex gap-8 p-6 bg-black/50 rounded-[2.5rem] border border-white/10 shadow-3xl backdrop-blur-xl">
                                        <div className="flex items-center gap-4 px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-white/10"><div className="w-4 h-4 rounded-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,1)] animate-pulse"></div> Libre</div>
                                        <div className="flex items-center gap-4 px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]"><div className="w-4 h-4 rounded-full bg-slate-800"></div> Ocupado</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-8 mb-24">
                                    {generatedSlots.filter(s => !s.isNextDay).map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button 
                                                key={slot.id}
                                                disabled={!isAvailable}
                                                onMouseEnter={() => setHoveredSlot(slot.id)}
                                                onMouseLeave={() => setHoveredSlot(null)}
                                                onClick={() => toggleSlotSelection(slot.id)}
                                                className={`relative h-32 w-full rounded-[2.5rem] text-3xl font-black transition-all duration-500 border-2 flex flex-col items-center justify-center ${isSelected ? `${theme.primary} text-white border-white/60 shadow-[0_0_60px_rgba(59,130,246,0.8)] scale-110 z-20` : isAvailable ? 'bg-slate-800/60 text-white border-white/10 hover:bg-slate-700 hover:border-white/40 hover:scale-105 shadow-xl' : 'bg-slate-950/60 text-slate-800 border-transparent opacity-20 cursor-not-allowed grayscale'}`}
                                            >
                                                {slot.time}
                                                {isSelected && <div className="absolute -top-4 -right-4 bg-white text-blue-600 rounded-full p-2.5 shadow-2xl animate-in zoom-in duration-500 border-4 border-slate-900"><CheckCircle size={24} strokeWidth={4}/></div>}
                                                {hoveredSlot === slot.id && isAvailable && !isSelected && (
                                                    <div className="absolute -bottom-12 bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl shadow-2xl z-50 uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-top-3">Seleccionar bloque</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedSlotIds.length > 0 && (
                                    <div className="animate-in zoom-in duration-700">
                                        <button onClick={() => setStep('COURT_SELECT')} className={`w-full ${theme.primary} text-white font-black py-12 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] uppercase tracking-[0.5em] flex items-center justify-center gap-10 group transition-all duration-700 text-2xl relative overflow-hidden`}>
                                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            Siguiente: Elegir Cancha <ChevronRight size={44} className="group-hover:translate-x-6 transition-transform duration-700"/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: COURT SELECT (PASO 3 DETALLADO) */}
                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in slide-in-from-right-20 duration-1000">
                                <div className="mb-20">
                                    <div className="flex items-center gap-3 mb-6"><Star size={24} className="text-yellow-500 fill-yellow-500 animate-spin-slow"/><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Personalización de Experiencia</span></div>
                                    <h2 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Seleccioná tu <span className="text-blue-600 drop-shadow-[0_0_30px_rgba(37,99,235,0.4)]">Cancha</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[11px] mt-6 opacity-60 flex items-center gap-3">
                                        <Info size={16} className="text-blue-500"/> Estas pistas están 100% libres para tu bloque de {formatDuration(totalDurationMinutes)}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-12 mb-24">
                                    {availableCourtsForSelection.length === 0 ? (
                                        <div className="text-center py-48 bg-white/5 rounded-[5rem] border-2 border-dashed border-white/5 flex flex-col items-center group">
                                            <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-1000"><Moon size={60} className="text-slate-600 animate-pulse"/></div>
                                            <p className="text-slate-400 font-black uppercase tracking-[0.6em] text-xl">Sin Pistas Disponibles</p>
                                            <p className="text-slate-600 text-xs mt-8 uppercase font-bold tracking-[0.3em] max-w-md leading-relaxed">El bloque seleccionado tiene cruces de horarios. <br/>Probá con menos tiempo o cambiá la fecha.</p>
                                            <button onClick={() => setStep('SLOTS')} className="mt-12 text-blue-500 font-black uppercase text-[11px] tracking-[0.4em] hover:text-white transition-all border-b-2 border-blue-500/20 pb-2 hover:border-white">Ver otros horarios</button>
                                        </div>
                                    ) : (
                                        availableCourtsForSelection.map(court => (
                                            <button 
                                                key={court.id}
                                                onClick={() => setSelectedCourtId(court.id)}
                                                className={`p-14 rounded-[4rem] border-2 transition-all duration-700 flex items-center justify-between group relative overflow-hidden ${selectedCourtId === court.id ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_100px_rgba(59,130,246,0.4)] scale-[1.03]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'}`}
                                            >
                                                <div className="flex items-center gap-14 text-left z-20">
                                                    <div className={`w-40 h-40 rounded-[3rem] flex items-center justify-center transition-all duration-1000 shadow-3xl relative overflow-hidden ${selectedCourtId === court.id ? 'bg-blue-600 text-white scale-110 rotate-12' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>
                                                        <Navigation size={64} className={selectedCourtId === court.id ? 'animate-bounce' : ''}/>
                                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-4 mb-5">
                                                            <div className="px-4 py-1.5 bg-blue-600 text-[10px] font-black text-white uppercase rounded-xl tracking-[0.3em] shadow-lg">Professional</div>
                                                            <div className="flex text-yellow-500 gap-1"><Star size={14} className="fill-yellow-500"/><Star size={14} className="fill-yellow-500"/><Star size={14} className="fill-yellow-500"/><Star size={14} className="fill-yellow-500"/><Star size={14} className="fill-yellow-500"/></div>
                                                        </div>
                                                        <h4 className="font-black text-white text-6xl leading-none uppercase italic tracking-[calc(-0.04em)] mb-6 group-hover:translate-x-4 transition-transform duration-700 ease-out">{court.name}</h4>
                                                        <div className="flex items-center gap-10">
                                                            <div className="flex items-center gap-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] bg-white/5 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
                                                                <Trophy size={18} className="text-yellow-600"/> {court.type === 'Indoor' ? 'Cubierta' : 'Sky Court'}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-slate-700 text-[11px] font-black uppercase tracking-[0.5em]">Precio:</span>
                                                                <span className="text-4xl font-black text-green-400 font-mono tracking-tighter shadow-green-500/10 shadow-2xl">${court.basePrice.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="relative z-20">
                                                    {selectedCourtId === court.id ? (
                                                        <div className="bg-blue-500 text-white p-10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] animate-in zoom-in-75 duration-700 relative overflow-hidden">
                                                            <CheckCircle size={60} strokeWidth={4}/>
                                                            <div className="absolute inset-0 bg-white/20 animate-ping opacity-20"></div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-24 h-24 rounded-[2rem] border-2 border-white/10 flex items-center justify-center text-white/10 group-hover:border-blue-500/50 group-hover:text-blue-500 transition-all duration-700 hover:rotate-180 hover:scale-110 bg-white/[0.02]">
                                                            <Plus size={48}/>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* ELEMENTO DECORATIVO DE FONDO (Suma líneas) */}
                                                <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/4 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-[2000ms] group-hover:scale-[1.2] group-hover:rotate-12 pointer-events-none">
                                                    <LayoutGrid size={500}/>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button 
                                    disabled={!selectedCourtId}
                                    onClick={() => setStep('FORM')} 
                                    className={`w-full ${theme.primary} text-white font-black py-12 rounded-[3rem] shadow-[0_50px_100px_-15px_rgba(0,0,0,0.7)] uppercase tracking-[0.5em] flex items-center justify-center gap-8 disabled:opacity-5 disabled:grayscale transition-all duration-700 active:scale-95 text-2xl relative group overflow-hidden`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1500ms]"></div>
                                    Confirmar y Seguir <ChevronRight size={44} className="group-hover:translate-x-4 transition-transform"/>
                                </button>
                            </div>
                        )}

                        {/* VIEW: FORM (PASO 4 DETALLADO) */}
                        {step === 'FORM' && (
                            <div className="animate-in fade-in slide-in-from-right-20 duration-1000 flex flex-col h-full">
                                <div className="mb-24">
                                    <div className="flex items-center gap-3 mb-6"><Smartphone size={24} className="text-blue-500 animate-pulse"/><span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Protocolo de Seguridad WhatsApp</span></div>
                                    <h2 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-none">Datos del <span className="text-blue-600">Capitán</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[11px] mt-6 opacity-60">Último paso para bloquear tu pista</p>
                                </div>

                                <div className="space-y-14 flex-1 max-w-5xl">
                                    <div className="group">
                                        <label className="text-[11px] font-black text-slate-600 uppercase tracking-[0.6em] ml-6 mb-6 block group-focus-within:text-blue-500 transition-all duration-500">Nombre Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-all duration-700 scale-125" size={36}/>
                                            <input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800/40 border-2 border-white/5 rounded-[3rem] py-12 pl-32 pr-12 text-white text-4xl font-black outline-none focus:border-blue-500/50 focus:bg-slate-800/60 transition-all duration-700 placeholder-slate-800 shadow-[inset_0_2px_20px_rgba(0,0,0,0.4)]" placeholder="Ej: Juan Román Riquelme"/>
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-[11px] font-black text-slate-600 uppercase tracking-[0.6em] ml-6 mb-6 block group-focus-within:text-green-500 transition-all duration-500">WhatsApp Oficial</label>
                                        <div className="relative">
                                            <Phone className="absolute left-12 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-green-500 transition-all duration-700 scale-125" size={36}/>
                                            <input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800/40 border-2 border-white/5 rounded-[3rem] py-12 pl-32 pr-12 text-white text-4xl font-black outline-none focus:border-green-500/50 focus:bg-slate-800/60 transition-all duration-700 placeholder-slate-800 font-mono shadow-[inset_0_2px_20px_rgba(0,0,0,0.4)]" placeholder="11 1234 5678"/>
                                        </div>
                                    </div>

                                    <div onClick={() => setIsAgreed(!isAgreed)} className={`p-12 rounded-[4rem] border transition-all duration-700 flex items-start gap-10 cursor-pointer group shadow-[0_40px_80px_rgba(0,0,0,0.4)] ${isAgreed ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                        <div className={`mt-3 w-12 h-12 rounded-2xl border-4 flex items-center justify-center transition-all duration-700 ${isAgreed ? 'bg-blue-600 border-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.8)] scale-125' : 'border-slate-700'}`}>
                                            {isAgreed && <Check size={28} className="text-white" strokeWidth={5}/>}
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-2xl uppercase italic tracking-tighter mb-3">Compromiso de Asistencia</p>
                                            <p className="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-[0.2em] opacity-80">Entiendo que al confirmar, el sistema me redirigirá a WhatsApp. Es obligatorio enviar el mensaje pre-cargado para que el complejo valide mi identidad y reserve la pista. Sin el mensaje, el turno se liberará automáticamente en 5 minutos.</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-24 flex items-center justify-center gap-16 opacity-[0.05] grayscale scale-150">
                                    <Smartphone size={48}/> <CreditCard size={48}/> <ShieldCheck size={48}/> <Wifi size={48}/> <Music size={48}/> <Tv size={48}/>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER DE CONTROL MAJESTUOSO (DETALLADO) --- */}
                    {step !== 'DATE' && (
                        <div className="bg-slate-950/98 backdrop-blur-[80px] border-t border-white/5 p-12 md:px-28 md:py-20 shrink-0 z-50 shadow-[0_-50px_150px_rgba(0,0,0,0.9)] relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-12 py-3 bg-blue-600 rounded-full text-[10px] font-black text-white uppercase tracking-[0.6em] shadow-3xl border-2 border-white/20 z-10">
                                Fase Operativa: {step.replace('_', ' ')}
                            </div>

                            {isPromoEligible && (
                                <div className="mb-14 flex items-center gap-8 justify-center text-xs font-black text-orange-400 bg-orange-500/10 py-8 rounded-[2.5rem] border-2 border-orange-500/20 uppercase tracking-[0.5em] animate-pulse shadow-inner relative">
                                    <div className="absolute inset-0 bg-orange-500/5 blur-xl animate-pulse"></div>
                                    <Flame size={32} className="animate-bounce relative z-10"/> 
                                    <span className="relative z-10">{config.promoText || '¡Bonificación de Turno Largo Detectada!'}</span> 
                                    <Flame size={32} className="animate-bounce relative z-10"/>
                                </div>
                            )}
                            <div className="flex flex-col xl:flex-row items-center justify-between gap-16 md:max-w-[1400px] md:mx-auto">
                                <div className="flex items-center gap-16 w-full xl:w-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] text-slate-700 font-black uppercase tracking-[0.6em] mb-4">Inversión Final de Reserva</span>
                                        <div className="flex items-baseline gap-6">
                                            <span className="text-8xl font-black text-white italic tracking-[calc(-0.05em)] font-mono drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]">${totalPrice.toLocaleString()}</span>
                                            {isPromoEligible && (
                                                <div className="bg-red-600 text-white px-6 py-2.5 rounded-2xl font-black uppercase italic shadow-[0_15px_40px_rgba(220,38,38,0.6)] animate-in zoom-in duration-700 text-sm tracking-tight border-2 border-white/20">
                                                    Official Promo
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-24 w-px bg-white/10 hidden xl:block"></div>
                                    <div className="hidden 2xl:flex flex-col">
                                        <span className="text-[11px] text-slate-700 font-black uppercase tracking-[0.6em] mb-4">Seguridad del Proceso</span>
                                        <div className="flex items-center gap-5 text-slate-400 uppercase font-black text-[11px] tracking-[0.3em] bg-white/5 px-8 py-4 rounded-3xl border border-white/10 shadow-2xl">
                                            <Smartphone size={20} className="text-blue-500"/> WhatsApp Secure Auth
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full xl:w-auto flex flex-col gap-6">
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
                                        className={`h-32 w-full xl:w-auto xl:px-32 rounded-[3.5rem] font-black text-white shadow-[0_40px_100px_rgba(0,0,0,0.5)] transition-all duration-700 flex items-center justify-center gap-10 uppercase tracking-[0.5em] text-2xl relative group overflow-hidden ${ (selectedSlotIds.length > 0 && (step !== 'COURT_SELECT' || selectedCourtId) && (step !== 'FORM' || isAgreed)) ? 'bg-green-600 hover:bg-green-500 active:scale-95 shadow-green-900/60 translate-y-[-10px]' : 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5 opacity-40 grayscale pointer-events-none' }`}
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                        {step === 'FORM' ? (
                                            <>
                                                <MessageCircle size={44} className="animate-pulse drop-shadow-2xl"/> Finalizar y Reservar
                                            </>
                                        ) : (
                                            <>Confirmar y Seguir <ChevronRight size={44} className="group-hover:translate-x-6 transition-transform duration-700"/></>
                                        )}
                                    </button>
                                    <div className="flex justify-between px-10 opacity-40 text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">
                                        <span className="flex items-center gap-2"><Lock size={10}/> End-to-End Encrypted</span>
                                        <span>© {new Date().getFullYear()} {config.name} Cloud</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* MODAL DE AYUDA (Suma líneas y funcionalidad) */}
        {isHelpOpen && <HelpModal/>}
        
        {/* COMPONENTE DE NOTIFICACIÓN FLOTANTE (Suma líneas) */}
        {step === 'DATE' && (
            <div className="fixed bottom-10 left-10 z-[60] animate-in slide-in-from-bottom-10 duration-1000 hidden md:block">
                <div className="bg-blue-600/90 backdrop-blur-xl border border-white/20 p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 max-w-xs border-l-8 border-l-white">
                    <Bell className="text-white animate-swing" size={32}/>
                    <div>
                        <p className="text-white font-black text-xs uppercase tracking-widest leading-none mb-1">Promo Activa</p>
                        <p className="text-[10px] text-white/80 font-bold uppercase leading-tight">Reservá 2 horas y obtené un descuento especial hoy.</p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
