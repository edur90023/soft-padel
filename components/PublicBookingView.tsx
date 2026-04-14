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
  Tv
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

// --- UTILS (Lógica de Tiempo Argentina) ---
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
  // STEPS: DATE -> SLOTS -> COURT_SELECT -> FORM -> SUCCESS
  const [step, setStep] = useState<'DATE' | 'SLOTS' | 'COURT_SELECT' | 'FORM' | 'SUCCESS'>('DATE');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]); 
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });
  const [isAgreed, setIsAgreed] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // ADS STATE & THEME
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const activeAds = useMemo(() => config.ads.filter(ad => ad.isActive), [config.ads]);
  const theme = COLOR_THEMES[config.courtColorTheme];

  useEffect(() => {
      if (activeAds.length <= 1) return;
      const interval = setInterval(() => {
          setCurrentAdIndex(prev => (prev + 1) % activeAds.length);
      }, (config.adRotationInterval || 5) * 1000);
      return () => clearInterval(interval);
  }, [activeAds, config.adRotationInterval]);

  const handleDateChange = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const now = new Date();
    now.setHours(0,0,0,0);
    if (d < now) return;
    setSelectedDate(d.toISOString().split('T')[0]);
    setSelectedSlotIds([]);
    setSelectedCourtId(null);
  };

  // --- GENERACIÓN DE SLOTS (Lógica Completa de 24hs) ---
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

  // --- DISPONIBILIDAD CRUZADA ---
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

  // --- SUB-COMPONENTS ---
  const HelpModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in">
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative">
            <button onClick={() => setIsHelpModalOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"><X size={24}/></button>
            <h3 className="text-3xl font-black text-white mb-6 uppercase italic tracking-tighter">Guía de Reserva</h3>
            <div className="space-y-6">
                <div className="flex gap-4"><div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center shrink-0 text-blue-400"><Calendar size={20}/></div><div><p className="text-white font-bold">1. Elegí la fecha</p><p className="text-xs text-slate-500">Podés reservar hasta con 7 días de anticipación.</p></div></div>
                <div className="flex gap-4"><div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center shrink-0 text-purple-400"><Clock size={20}/></div><div><p className="text-white font-bold">2. Marcá los horarios</p><p className="text-xs text-slate-500">Cada bloque es de 30 minutos. Para un turno normal elegí 3 bloques (90m).</p></div></div>
                <div className="flex gap-4"><div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center shrink-0 text-green-400"><Map size={20}/></div><div><p className="text-white font-bold">3. Seleccioná la Cancha</p><p className="text-xs text-slate-500">El sistema te mostrará solo las que están libres en el horario elegido.</p></div></div>
                <div className="flex gap-4"><div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center shrink-0 text-orange-400"><Smartphone size={20}/></div><div><p className="text-white font-bold">4. WhatsApp</p><p className="text-xs text-slate-500">Es obligatorio enviar el mensaje final para que confirmemos tu turno.</p></div></div>
            </div>
            <button onClick={() => setIsHelpModalOpen(false)} className="w-full mt-10 bg-white text-slate-950 font-black py-4 rounded-2xl uppercase tracking-widest">Entendido</button>
        </div>
    </div>
  );

  const ServiceItem = ({ icon: Icon, label, desc }: { icon: any, label: string, desc: string }) => (
    <div className="flex items-center gap-4 p-5 bg-white/5 rounded-[1.5rem] border border-white/5 hover:border-blue-500/30 transition-all group">
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg">
            <Icon size={24}/>
        </div>
        <div>
            <p className="text-white font-black text-xs uppercase tracking-widest">{label}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{desc}</p>
        </div>
    </div>
  );

  if (step === 'SUCCESS') {
      return (
          <div className="h-full flex items-center justify-center p-6 bg-cover bg-center relative animate-in fade-in" style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : undefined }}>
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
              <div className="relative z-10 max-w-md w-full bg-slate-900 border border-white/10 p-12 rounded-[3rem] shadow-2xl text-center">
                  <div className="w-28 h-28 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                      <CheckCircle size={60} className="text-green-500 animate-in zoom-in spin-in-12 duration-700" strokeWidth={3} />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">¡Casi listo!</h2>
                  <p className="text-slate-400 mb-10 leading-relaxed text-sm uppercase tracking-widest font-bold">
                    Tu solicitud se generó correctamente. <br/>
                    <span className="text-green-400">Enviá el WhatsApp para confirmar.</span>
                  </p>
                  <div className="flex flex-col gap-4">
                    <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); setCustomerData({name: '', phone: ''}); }} className="w-full bg-white text-slate-950 font-black py-5 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest shadow-xl">Nueva Reserva</button>
                    <p className="text-[10px] text-slate-600 font-black uppercase">ID Transacción: WEB-{Date.now().toString().slice(-6)}</p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden font-sans selection:bg-blue-500/30" style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"></div>
        
        {/* ELEMENTOS DECORATIVOS DE FONDO (EXPANDIDOS) */}
        <div className="absolute -top-[15%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-blue-400/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex-1 flex flex-col h-full md:p-8 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-lg md:max-w-[1400px] md:max-h-[94vh] bg-slate-900/40 md:bg-slate-900/60 md:border md:border-white/10 md:rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.7)] flex flex-col md:flex-row overflow-hidden backdrop-blur-3xl transition-all duration-700">
                
                {/* --- SIDEBAR DESKTOP --- */}
                <div className="hidden md:flex w-[30%] border-r border-white/5 flex-col p-14 bg-slate-950/40 justify-between relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                     
                     <div className="space-y-12 relative z-10">
                        <div className="group relative w-32 h-32 cursor-help" onClick={() => setIsHelpModalOpen(true)}>
                            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 group-hover:opacity-60 transition-opacity duration-700"></div>
                            <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-white/10 bg-slate-800 rotate-6 group-hover:rotate-0 transition-all duration-700 ease-out">
                                {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover"/> : <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-black text-5xl`}>{config.name.charAt(0)}</div>}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-xl border border-white/20 animate-bounce">
                                <HelpCircle size={16}/>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-6xl font-black text-white tracking-tighter leading-[0.85] mb-6 uppercase italic drop-shadow-2xl">
                                {config.name.split(' ').map((word, i) => <span key={i} className="block">{word}</span>)}
                            </h1>
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-inner">
                                    <Activity size={12}/> <span>Live Tracking</span>
                                </div>
                                <div className="flex items-center gap-2 text-green-400 font-black uppercase tracking-[0.2em] text-[10px] bg-green-500/10 px-4 py-2 rounded-full border border-green-500/20 shadow-inner">
                                    <ShieldCheck size={12}/> <span>SSL Secured</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 py-10 border-y border-white/5 relative">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] block ml-1">Fecha Seleccionada</label>
                                <div className="text-white font-black text-3xl flex items-center gap-4 bg-white/5 p-5 rounded-[1.5rem] border border-white/5 hover:bg-white/10 transition-colors shadow-inner">
                                    <Calendar size={28} className="text-blue-500"/> {selectedDate}
                                </div>
                            </div>
                            {selectedSlotIds.length > 0 && (
                                <div className="space-y-3 animate-in slide-in-from-left-6">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] block ml-1">Tiempo de Juego</label>
                                    <div className="text-white font-black text-3xl flex items-center gap-4 bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                                        <Clock size={28} className="text-purple-500"/> {formatDuration(totalDurationMinutes)}
                                    </div>
                                </div>
                            )}
                            {selectedCourtId && (
                                <div className="space-y-3 animate-in slide-in-from-left-6">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] block ml-1">Cancha Reservada</label>
                                    <div className="text-white font-black text-3xl flex items-center gap-4 bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                                        <Map size={28} className="text-green-500"/> {courts.find(c => c.id === selectedCourtId)?.name}
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>

                     <div className="space-y-8 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                            <ServiceItem icon={Wifi} label="Wifi" desc="Alta Velocidad"/>
                            <ServiceItem icon={Coffee} label="Bar" desc="Cafetería Pro"/>
                            <ServiceItem icon={Utensils} label="Grill" desc="Parrilla Libre"/>
                            <ServiceItem icon={Trophy} label="Pro" desc="Canchas WPT"/>
                        </div>
                        {renderAd()}
                     </div>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900/5 transition-all duration-500">
                    
                    {/* MOBILE HEADER (DETALLADO) */}
                    <div className="md:hidden p-6 pb-2 flex flex-col items-center shrink-0 relative bg-slate-950/90 backdrop-blur-xl border-b border-white/5 z-50">
                        {step !== 'DATE' && (
                            <button onClick={() => setStep(step === 'SLOTS' ? 'DATE' : step === 'COURT_SELECT' ? 'SLOTS' : 'COURT_SELECT')} className="absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-2xl bg-white/5 text-white active:scale-90 transition-all border border-white/10">
                                <ArrowLeft size={24}/>
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-lg ${theme.primary} flex items-center justify-center text-white font-black text-sm`}>{config.name.charAt(0)}</div>
                             <h1 className="text-xl font-black text-white text-center uppercase tracking-tighter italic">{config.name}</h1>
                        </div>
                        <button onClick={() => setIsHelpModalOpen(true)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"><HelpCircle size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-24 scrollbar-hide relative z-30">
                        
                        {/* VIEW: DATE (PASO 1) */}
                        {step === 'DATE' && (
                            <div className="animate-in fade-in slide-in-from-bottom-20 duration-1000">
                                <div className="mb-20">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Sparkles className="text-yellow-500 animate-pulse" size={20}/>
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Booking System v4.0</span>
                                    </div>
                                    <h2 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter uppercase italic leading-[0.8]">Sacá tu <span className="text-blue-600">Turno</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] border-l-4 border-blue-600 pl-4">Comenzá seleccionando el día de juego</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
                                    <div className="lg:col-span-7 bg-slate-800/40 p-6 rounded-[3rem] border border-white/10 flex items-center justify-between shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] group">
                                        <button onClick={() => handleDateChange(-1)} className="p-10 text-white hover:bg-white/5 rounded-[2.5rem] transition-all hover:scale-110 active:scale-95"><ChevronLeft size={48}/></button>
                                        <div className="text-center flex-1">
                                            <div className="relative inline-block">
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] block mb-4">Calendario</span>
                                                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-4xl font-black text-white text-center w-full outline-none cursor-pointer font-mono group-hover:text-blue-400 transition-colors"/>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDateChange(1)} className="p-10 text-white hover:bg-white/5 rounded-[2.5rem] transition-all hover:scale-110 active:scale-95"><ChevronRight size={48}/></button>
                                    </div>

                                    <div className="lg:col-span-5 grid grid-cols-1 gap-6">
                                        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex items-center gap-6 group hover:bg-white/10 transition-all">
                                            <div className="w-16 h-16 bg-yellow-500/20 rounded-[1.5rem] flex items-center justify-center text-yellow-500 group-hover:rotate-12 transition-transform shadow-lg"><Award size={32}/></div>
                                            <div><p className="text-white font-black text-2xl uppercase italic leading-tight">Elite Club</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Canchas Panorámicas</p></div>
                                        </div>
                                        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex items-center gap-6 group hover:bg-white/10 transition-all">
                                            <div className="w-16 h-16 bg-blue-500/20 rounded-[1.5rem] flex items-center justify-center text-blue-500 group-hover:-rotate-12 transition-transform shadow-lg"><ShieldCheck size={32}/></div>
                                            <div><p className="text-white font-black text-2xl uppercase italic leading-none">Instantáneo</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Reserva Validada</p></div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setStep('SLOTS')} className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] flex items-center justify-center gap-8 shadow-[0_30px_60px_-15px_rgba(59,130,246,0.6)] hover:translate-y-[-8px] active:scale-95 transition-all uppercase tracking-[0.4em] text-2xl relative overflow-hidden group`}>
                                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                    <Clock size={36} className="group-hover:rotate-12 transition-transform"/> Ver Horarios Disponibles
                                </button>

                                <div className="mt-24 grid grid-cols-2 md:grid-cols-5 gap-10 opacity-20">
                                    <div className="flex flex-col items-center gap-3 font-black text-[9px] uppercase tracking-[0.3em]"><Music size={24}/> Música Amb.</div>
                                    <div className="flex flex-col items-center gap-3 font-black text-[9px] uppercase tracking-[0.3em]"><IceCream size={24}/> Snack Bar</div>
                                    <div className="flex flex-col items-center gap-3 font-black text-[9px] uppercase tracking-[0.3em]"><Smartphone size={24}/> App Control</div>
                                    <div className="flex flex-col items-center gap-3 font-black text-[9px] uppercase tracking-[0.3em]"><Tv size={24}/> Streaming</div>
                                    <div className="flex flex-col items-center gap-3 font-black text-[9px] uppercase tracking-[0.3em]"><Heart size={24}/> Comunidad</div>
                                </div>
                            </div>
                        )}

                        {/* VIEW: SLOTS (PASO 2) */}
                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800">
                                <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-white/5 pb-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-4"><Zap size={16} className="text-yellow-500 fill-yellow-500"/><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Horarios de Alto Rendimiento</span></div>
                                        <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Elegí tu <span className="text-blue-600">Tiempo</span></h2>
                                    </div>
                                    <div className="flex gap-6 p-4 bg-black/40 rounded-[2rem] border border-white/10 shadow-2xl">
                                        <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-white/5"><div className="w-3 h-3 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div> Disponible</div>
                                        <div className="flex items-center gap-3 px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><div className="w-3 h-3 rounded-full bg-slate-800"></div> Reservado</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6 mb-20">
                                    {generatedSlots.filter(s => !s.isNextDay).map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button 
                                                key={slot.id}
                                                disabled={!isAvailable}
                                                onMouseEnter={() => setShowTooltip(slot.id)}
                                                onMouseLeave={() => setShowTooltip(null)}
                                                onClick={() => toggleSlotSelection(slot.id)}
                                                className={`relative h-28 w-full rounded-[2rem] text-2xl font-black transition-all border-2 flex flex-col items-center justify-center ${isSelected ? `${theme.primary} text-white border-white/50 shadow-[0_0_40px_rgba(59,130,246,0.7)] scale-110 z-20` : isAvailable ? 'bg-slate-800/60 text-white border-white/10 hover:bg-slate-700 hover:border-white/30 hover:scale-105' : 'bg-slate-950/60 text-slate-800 border-transparent opacity-20 cursor-not-allowed grayscale'}`}
                                            >
                                                {slot.time}
                                                {isSelected && <div className="absolute -top-3 -right-3 bg-white text-blue-600 rounded-full p-2 shadow-2xl animate-in zoom-in duration-300"><CheckCircle size={20} strokeWidth={4}/></div>}
                                                {showTooltip === slot.id && isAvailable && !isSelected && (
                                                    <div className="absolute -bottom-10 bg-white text-slate-900 text-[10px] font-black px-2 py-1 rounded shadow-2xl z-50 uppercase whitespace-nowrap animate-in fade-in slide-in-from-top-2">Clic para sumar</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedSlotIds.length > 0 && (
                                    <div className="animate-in zoom-in duration-500">
                                        <button onClick={() => setStep('COURT_SELECT')} className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] uppercase tracking-[0.4em] flex items-center justify-center gap-6 group transition-all text-xl`}>
                                            Siguiente: Elegir Cancha <ChevronRight size={36} className="group-hover:translate-x-4 transition-transform duration-500"/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: COURT SELECT (PASO 3) */}
                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800">
                                <div className="mb-16">
                                    <div className="flex items-center gap-2 mb-4"><Star size={16} className="text-yellow-500 fill-yellow-500"/><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Personalizá tu Experiencia</span></div>
                                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Elegí tu <span className="text-blue-600">Cancha</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mt-4 opacity-60">Opciones disponibles para el bloque de {formatDuration(totalDurationMinutes)}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-10 mb-20">
                                    {availableCourtsForSelection.length === 0 ? (
                                        <div className="text-center py-40 bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 flex flex-col items-center">
                                            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-8"><Moon size={48} className="text-slate-600 animate-pulse"/></div>
                                            <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-lg">No hay canchas 100% libres</p>
                                            <p className="text-slate-600 text-xs mt-6 uppercase font-bold tracking-widest max-w-sm leading-relaxed">Este horario está parcialmente ocupado. <br/>Intentá con otro bloque o cambiá el día.</p>
                                            <button onClick={() => setStep('SLOTS')} className="mt-10 text-blue-500 font-black uppercase text-[10px] tracking-[0.3em] hover:text-white transition-colors border-b border-blue-500/20 pb-1">Volver a Horarios</button>
                                        </div>
                                    ) : (
                                        availableCourtsForSelection.map(court => (
                                            <button 
                                                key={court.id}
                                                onClick={() => setSelectedCourtId(court.id)}
                                                className={`p-12 rounded-[3.5rem] border-2 transition-all flex items-center justify-between group relative overflow-hidden ${selectedCourtId === court.id ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_80px_rgba(59,130,246,0.4)] scale-[1.02]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-12 text-left z-20">
                                                    <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 shadow-2xl relative overflow-hidden ${selectedCourtId === court.id ? 'bg-blue-600 text-white scale-110 rotate-6' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'}`}>
                                                        <Navigation size={50} className={selectedCourtId === court.id ? 'animate-bounce' : ''}/>
                                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="px-3 py-1 bg-blue-600 text-[8px] font-black text-white uppercase rounded-md tracking-[0.2em]">Sede Pro</div>
                                                            <div className="flex text-yellow-500"><Star size={10} className="fill-yellow-500"/><Star size={10} className="fill-yellow-500"/><Star size={10} className="fill-yellow-500"/><Star size={10} className="fill-yellow-500"/><Star size={10} className="fill-yellow-500"/></div>
                                                        </div>
                                                        <h4 className="font-black text-white text-5xl leading-none uppercase italic tracking-tighter mb-4 group-hover:translate-x-2 transition-transform duration-500">{court.name}</h4>
                                                        <div className="flex items-center gap-8">
                                                            <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-5 py-2 rounded-full border border-white/5 shadow-inner">
                                                                <Trophy size={14} className="text-yellow-600"/> {court.type === 'Indoor' ? 'Cubierta' : 'Al Aire Libre'}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Inversión:</span>
                                                                <span className="text-3xl font-black text-green-400 font-mono tracking-tighter shadow-green-400/10 shadow-xl">${court.basePrice.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="relative z-20">
                                                    {selectedCourtId === court.id ? (
                                                        <div className="bg-blue-500 text-white p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.3)] animate-in zoom-in-50 duration-500">
                                                            <CheckCircle size={48} strokeWidth={4}/>
                                                        </div>
                                                    ) : (
                                                        <div className="w-20 h-20 rounded-[1.5rem] border-2 border-white/10 flex items-center justify-center text-white/10 group-hover:border-blue-500/50 group-hover:text-blue-500 transition-all duration-500 hover:rotate-90">
                                                            <Plus size={40}/>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/4 opacity-[0.02] group-hover:opacity-[0.06] transition-all duration-1000 group-hover:scale-110">
                                                    <LayoutGrid size={350}/>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button 
                                    disabled={!selectedCourtId}
                                    onClick={() => setStep('FORM')} 
                                    className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] uppercase tracking-[0.4em] flex items-center justify-center gap-6 disabled:opacity-10 disabled:grayscale transition-all active:scale-95 text-xl relative group overflow-hidden`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                    Confirmar Selección <ChevronRight size={36}/>
                                </button>
                            </div>
                        )}

                        {/* VIEW: FORM (PASO 4) */}
                        {step === 'FORM' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800 flex flex-col h-full">
                                <div className="mb-20">
                                    <div className="flex items-center gap-2 mb-4"><Smartphone size={16} className="text-blue-500"/><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Seguridad por WhatsApp</span></div>
                                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Tus <span className="text-blue-600">Datos</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mt-4 opacity-60">Paso final para validar la reserva</p>
                                </div>

                                <div className="space-y-12 flex-1 max-w-4xl">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] ml-4 mb-5 block group-focus-within:text-blue-500 transition-colors">Nombre Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-all duration-500" size={32}/>
                                            <input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800/40 border-2 border-white/5 rounded-[2.5rem] py-10 pl-24 pr-10 text-white text-3xl font-black outline-none focus:border-blue-500/50 focus:bg-slate-800/60 transition-all placeholder-slate-800 shadow-inner" placeholder="Ej: Lionel Messi"/>
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] ml-4 mb-5 block group-focus-within:text-green-500 transition-colors">WhatsApp de contacto</label>
                                        <div className="relative">
                                            <Phone className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-green-500 transition-all duration-500" size={32}/>
                                            <input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800/40 border-2 border-white/5 rounded-[2.5rem] py-10 pl-24 pr-10 text-white text-3xl font-black outline-none focus:border-green-500/50 focus:bg-slate-800/60 transition-all placeholder-slate-800 font-mono shadow-inner" placeholder="11 1234 5678"/>
                                        </div>
                                    </div>

                                    <div onClick={() => setIsAgreed(!isAgreed)} className={`p-10 rounded-[3rem] border transition-all duration-500 flex items-start gap-8 cursor-pointer group shadow-2xl ${isAgreed ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                        <div className={`mt-2 w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${isAgreed ? 'bg-blue-600 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.6)] scale-110' : 'border-slate-700'}`}>
                                            {isAgreed && <CheckCircle size={24} className="text-white" strokeWidth={4}/>}
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-xl uppercase italic tracking-tighter mb-2">Confirmación por WhatsApp</p>
                                            <p className="text-xs text-slate-500 font-bold leading-relaxed uppercase tracking-widest opacity-60">Entiendo que para validar mi lugar, debo finalizar el envío del mensaje automático que se abrirá a continuación. Sin el envío del mensaje, la reserva no tendrá validez.</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-20 flex items-center justify-center gap-12 opacity-10 grayscale">
                                    <Smartphone size={40}/> <CreditCard size={40}/> <ShieldCheck size={40}/> <Wifi size={40}/> <Music size={40}/>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER DE CONTROL Y RESUMEN FINANCIERO (DETALLADO) --- */}
                    {step !== 'DATE' && (
                        <div className="bg-slate-950/95 backdrop-blur-[50px] border-t border-white/5 p-12 md:px-24 md:py-16 shrink-0 z-50 shadow-[0_-30px_100px_rgba(0,0,0,0.8)] relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-2 bg-blue-600 rounded-full text-[9px] font-black text-white uppercase tracking-[0.5em] shadow-2xl border border-white/20">
                                Estado: {step.replace('_', ' ')}
                            </div>

                            {isPromoEligible && (
                                <div className="mb-10 flex items-center gap-5 justify-center text-xs font-black text-orange-400 bg-orange-500/10 py-5 rounded-[2rem] border border-orange-500/20 uppercase tracking-[0.4em] animate-pulse shadow-inner">
                                    <Flame size={24} className="animate-bounce"/> {config.promoText || '¡Bonificación Automática Activada!'} <Flame size={24} className="animate-bounce"/>
                                </div>
                            )}
                            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 md:max-w-[1200px] md:mx-auto">
                                <div className="flex items-center gap-12 w-full lg:w-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] mb-3">Resumen de Inversión</span>
                                        <div className="flex items-baseline gap-5">
                                            <span className="text-6xl font-black text-white italic tracking-tighter font-mono drop-shadow-2xl">${totalPrice.toLocaleString()}</span>
                                            {isPromoEligible && (
                                                <div className="bg-red-600 text-white px-4 py-1.5 rounded-2xl font-black uppercase italic shadow-[0_10px_30px_rgba(220,38,38,0.5)] animate-in zoom-in text-xs tracking-tighter">
                                                    Promo Active
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-16 w-px bg-white/10 hidden md:block"></div>
                                    <div className="hidden xl:flex flex-col">
                                        <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] mb-3">Método de Validación</span>
                                        <div className="flex items-center gap-3 text-slate-400 uppercase font-black text-[10px] tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                            <Smartphone size={14} className="text-blue-500"/> WhatsApp Verificado
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="w-full lg:w-auto flex flex-col gap-4">
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
                                        {step === 'FORM' ? (
                                            <>
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <MessageCircle size={40} className="animate-pulse"/> Finalizar Reserva
                                            </>
                                        ) : (
                                            <>Continuar Paso <ChevronRight size={40} className="group-hover:translate-x-4 transition-transform"/></>
                                        )}
                                    </button>
                                    <div className="flex justify-between px-6 opacity-40 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Seguridad Bancaria</span>
                                        <span>2024 © {config.name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {isHelpModalOpen && <HelpModal/>}
    </div>
  );
};
