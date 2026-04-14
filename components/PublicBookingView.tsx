import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, User, Phone, CheckCircle, ArrowLeft, Calendar, 
  Clock, MapPin, DollarSign, MessageCircle, Info, Sparkles, ExternalLink, 
  Gift, Flame, Moon, Map, LayoutGrid, Award, ShieldCheck, Star, Zap, 
  Navigation, Smartphone, CreditCard, Wifi, Coffee, IceCream, Utensils, 
  Trophy, History, AlertCircle, HelpCircle, X, Lock, Globe, Activity, 
  Heart, Music, Tv, Plus, Check
} from 'lucide-react';
import { Court, Booking, ClubConfig, BookingStatus } from '../types';
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

const getArgentinaDate = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina_Buenos_Aires"}));
};

const isTimeInPast = (slotDateStr: string, timeStr: string) => {
    const now = getArgentinaDate();
    const [h, m] = timeStr.split(':').map(Number);
    const [year, month, day] = slotDateStr.split('-').map(Number);
    const slotDate = new Date(year, month - 1, day, h, m);
    return slotDate < new Date(now.getTime() + 15 * 60000);
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

  // --- LÓGICA DE NEGOCIO ---
  const handleDateChange = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    if (d < new Date(new Date().setHours(0,0,0,0))) return;
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

  const handleConfirmBooking = () => {
      const startSlot = generatedSlots.find(s => s.id === selectedSlotIds[0]);
      if (!startSlot || !selectedCourtId) return;
      onAddBooking({
          id: `web-${Date.now()}`, courtId: selectedCourtId, date: startSlot.realDate,
          time: startSlot.time, duration: selectedSlotIds.length * 30, customerName: customerData.name,
          customerPhone: customerData.phone, status: BookingStatus.PENDING, price: totalPrice, isRecurring: false
      });
      setStep('SUCCESS');
      const msg = `Hola! Reserva en *${config.name}*%0A👤 *Cliente:* ${customerData.name}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time}%0A🏟 *Cancha:* ${courts.find(c => c.id === selectedCourtId)?.name}%0A💰 *Total:* $${totalPrice.toLocaleString()}${isPromoEligible ? `%0A🎁 *PROMO:* ${config.promoText}` : ''}`;
      setTimeout(() => window.open(`https://wa.me/${config.ownerPhone.replace('+', '')}?text=${msg}`, '_blank'), 500);
  };

  // --- COMPONENTES AUXILIARES (DEFINIDOS PARA EVITAR REFERENCEERROR) ---
  const renderAd = () => {
    if (activeAds.length === 0) return null;
    const ad = activeAds[currentAdIndex];
    return (
        <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group mt-auto transition-all duration-1000">
            <img src={ad.imageUrl} alt="Publicidad" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-[10px] text-white/70 px-3 py-1 rounded-full border border-white/10 font-black uppercase tracking-[0.2em]">Publicidad</div>
            {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-5 right-5 bg-white text-black p-3 rounded-full shadow-2xl hover:scale-110 transition-transform">
                    <ExternalLink size={18}/>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[3rem] p-10 relative shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setIsHelpOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={32}/></button>
            </div>
            <h3 className="text-4xl font-black text-white mb-6 uppercase italic tracking-tighter">¿Necesitas Ayuda?</h3>
            <div className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center shrink-0 text-blue-500"><Info size={24}/></div>
                    <p className="text-slate-400 text-sm leading-relaxed">Selecciona los bloques de 30 minutos que desees. Si eliges 4 bloques seguidos, podrías acceder a una <span className="text-white font-bold">PROMO</span> especial.</p>
                </div>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-600/20 flex items-center justify-center shrink-0 text-green-500"><MessageCircle size={24}/></div>
                    <p className="text-slate-400 text-sm leading-relaxed">Al confirmar, el sistema te redirigirá a WhatsApp. <span className="text-white font-bold">Debes enviar el mensaje</span> para que el club reciba tu reserva.</p>
                </div>
            </div>
        </div>
    </div>
  );

  if (step === 'SUCCESS') {
      return (
          <div className="h-full flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-600/5 blur-[120px] rounded-full"></div>
              <div className="relative z-10 max-w-md w-full bg-slate-900 border border-white/10 p-12 rounded-[4rem] shadow-2xl text-center animate-in zoom-in-95 duration-500">
                  <div className="w-28 h-28 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-10 border border-green-500/30">
                      <CheckCircle size={60} className="text-green-500 animate-in zoom-in spin-in-12 duration-700" strokeWidth={3} />
                  </div>
                  <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">¡Turno <br/>Solicitado!</h2>
                  <p className="text-slate-400 mb-12 leading-relaxed text-sm font-bold uppercase tracking-widest">Abre WhatsApp para finalizar.</p>
                  <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); setCustomerData({name:'', phone:''}); setIsAgreed(false); }} className="w-full bg-white text-slate-950 font-black py-6 rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-[0.4em] shadow-2xl active:scale-95">Nueva Reserva</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 relative overflow-hidden font-sans selection:bg-blue-600/40">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"></div>
        
        {/* ELEMENTOS DECORATIVOS DE FONDO (RESTAURADOS) */}
        <div className="absolute -top-[15%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>

        <div className="relative z-10 flex-1 flex flex-col h-full md:p-10 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-lg md:max-w-7xl md:max-h-[92vh] bg-slate-900/40 md:bg-slate-900/60 md:border md:border-white/10 md:rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.7)] flex flex-col md:flex-row overflow-hidden backdrop-blur-3xl transition-all duration-700">
                
                {/* --- SIDEBAR DESKTOP --- */}
                <div className="hidden md:flex w-[32%] border-r border-white/5 flex-col p-14 bg-slate-950/40 justify-between relative overflow-hidden">
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
                                <Navigation size={12} className="animate-pulse"/> <span>Chilecito, La Rioja</span>
                            </div>
                        </div>

                        <div className="space-y-8 py-10 border-y border-white/5 relative">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] block ml-1">Fecha</label>
                                <div className="text-white font-black text-3xl flex items-center gap-4 bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                                    <Calendar size={28} className="text-blue-500"/> {selectedDate}
                                </div>
                            </div>
                            {selectedSlotIds.length > 0 && (
                                <div className="space-y-3 animate-in slide-in-from-left-6">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] block ml-1">Tiempo</label>
                                    <div className="text-white font-black text-3xl flex items-center gap-4 bg-white/5 p-5 rounded-[1.5rem] border border-white/5 shadow-inner">
                                        <Clock size={28} className="text-purple-500"/> {selectedSlotIds.length * 30} min
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>

                     <div className="space-y-8 relative z-10">
                        <div className="grid grid-cols-3 gap-4">
                            <ServiceBadge icon={Wifi} label="Wifi"/>
                            <ServiceBadge icon={Coffee} label="Bar"/>
                            <ServiceBadge icon={Utensils} label="Parrilla"/>
                        </div>
                        {renderAd()}
                     </div>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900/10">
                    
                    {/* MOBILE HEADER */}
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
                        <h1 className="text-xl font-black text-white text-center uppercase tracking-tighter italic">{config.name}</h1>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-24 scrollbar-hide relative z-30">
                        
                        {/* VIEW: DATE */}
                        {step === 'DATE' && (
                            <div className="animate-in fade-in slide-in-from-bottom-12 duration-700">
                                <div className="mb-14">
                                    <h2 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">Reservá tu <span className="text-blue-600">Turno</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] border-l-4 border-blue-600 pl-4">Selecciona el día de juego</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14">
                                    <div className="lg:col-span-8 bg-slate-800/40 p-6 rounded-[3rem] border border-white/10 flex items-center justify-between shadow-2xl">
                                        <button onClick={() => handleDateChange(-1)} className="p-10 text-white hover:bg-white/5 rounded-[2.5rem] transition-all"><ChevronLeft size={48}/></button>
                                        <div className="text-center flex-1">
                                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] block mb-4">Calendario</span>
                                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-4xl font-black text-white text-center w-full outline-none cursor-pointer font-mono"/>
                                        </div>
                                        <button onClick={() => handleDateChange(1)} className="p-10 text-white hover:bg-white/5 rounded-[2.5rem] transition-all"><ChevronRight size={48}/></button>
                                    </div>

                                    <div className="lg:col-span-4 grid grid-cols-1 gap-6">
                                        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex items-center gap-6 group hover:bg-white/10 transition-all">
                                            <div className="w-16 h-16 bg-yellow-500/20 rounded-[1.5rem] flex items-center justify-center text-yellow-500"><Award size={32}/></div>
                                            <div><p className="text-white font-black text-2xl uppercase italic">Premium</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Sede Pro</p></div>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => setStep('SLOTS')} className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] flex items-center justify-center gap-8 shadow-2xl transition-all uppercase tracking-[0.4em] text-2xl group`}>
                                    <Clock size={36} className="group-hover:rotate-12 transition-transform duration-500"/> Ver Horarios
                                </button>
                                <div className="md:hidden mt-20">{renderAd()}</div>
                            </div>
                        )}

                        {/* VIEW: SLOTS */}
                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800">
                                <div className="mb-16 border-b border-white/5 pb-10">
                                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Elegí tu <span className="text-blue-600">Tiempo</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mt-4">Paso 2: Marcá los bloques de 30m</p>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6 mb-20">
                                    {generatedSlots.filter(s => !s.isNextDay).map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button key={slot.id} disabled={!isAvailable} onClick={() => toggleSlotSelection(slot.id)}
                                                className={`h-28 w-full rounded-[2rem] text-2xl font-black transition-all border-2 flex flex-col items-center justify-center ${isSelected ? `${theme.primary} text-white border-white/50 shadow-2xl scale-110 z-20` : isAvailable ? 'bg-slate-800/60 text-white border-white/10 hover:bg-slate-700' : 'bg-slate-950/60 text-slate-800 border-transparent opacity-20 cursor-not-allowed grayscale'}`}
                                            >
                                                {slot.time}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedSlotIds.length > 0 && (
                                    <button onClick={() => setStep('COURT_SELECT')} className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] shadow-2xl uppercase tracking-[0.4em] transition-all text-xl`}>
                                        Continuar: Elegir Cancha
                                    </button>
                                )}
                            </div>
                        )}

                        {/* VIEW: COURT SELECT */}
                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800">
                                <div className="mb-16">
                                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Seleccioná tu <span className="text-blue-600">Pista</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mt-4 opacity-60">Opciones disponibles para el horario elegido</p>
                                </div>

                                <div className="grid grid-cols-1 gap-10 mb-20">
                                    {availableCourtsForSelection.length === 0 ? (
                                        <div className="text-center py-40 bg-white/5 rounded-[4rem] border-2 border-dashed border-white/5 flex flex-col items-center">
                                            <Moon size={80} className="mb-6 text-slate-700 animate-pulse"/>
                                            <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-sm">Sin disponibilidad libre</p>
                                        </div>
                                    ) : (
                                        availableCourtsForSelection.map(court => (
                                            <button key={court.id} onClick={() => setSelectedCourtId(court.id)}
                                                className={`p-12 rounded-[3.5rem] border-2 transition-all flex items-center justify-between group relative overflow-hidden ${selectedCourtId === court.id ? 'bg-blue-600/20 border-blue-500 shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center gap-12 text-left z-20">
                                                    <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all ${selectedCourtId === court.id ? 'bg-blue-600 text-white scale-110' : 'bg-slate-800 text-slate-500'}`}><Navigation size={50}/></div>
                                                    <div>
                                                        <h4 className="font-black text-white text-5xl leading-none uppercase italic tracking-tighter mb-4">{court.name}</h4>
                                                        <span className="text-2xl font-black text-green-400 font-mono tracking-tighter">${(court.basePrice * selectedSlotIds.length).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                {selectedCourtId === court.id && <div className="bg-blue-500 text-white p-8 rounded-[2rem] shadow-2xl animate-in zoom-in-50"><Check size={48} strokeWidth={4}/></div>}
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button disabled={!selectedCourtId} onClick={() => setStep('FORM')} className={`w-full ${theme.primary} text-white font-black py-10 rounded-[2.5rem] shadow-2xl uppercase tracking-[0.4em] transition-all text-xl disabled:opacity-10`}>
                                    Siguiente: Datos Personales
                                </button>
                            </div>
                        )}

                        {/* VIEW: FORM */}
                        {step === 'FORM' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-800 max-w-4xl">
                                <div className="mb-20">
                                    <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">Tus <span className="text-blue-600">Datos</span></h2>
                                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] mt-4 opacity-60">Paso final de confirmación</p>
                                </div>

                                <div className="space-y-12">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] ml-4 mb-5 block group-focus-within:text-blue-500">Nombre Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500" size={32}/>
                                            <input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800/40 border-2 border-white/5 rounded-[2.5rem] py-10 pl-24 pr-10 text-white text-3xl font-black outline-none focus:border-blue-500/50 transition-all shadow-inner" placeholder="Ej: Lionel Messi"/>
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] ml-4 mb-5 block group-focus-within:text-green-500">WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-green-500" size={32}/>
                                            <input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800/40 border-2 border-white/5 rounded-[2.5rem] py-10 pl-24 pr-10 text-white text-3xl font-black outline-none focus:border-green-500/50 transition-all shadow-inner font-mono" placeholder="11 1234 5678"/>
                                        </div>
                                    </div>

                                    <div onClick={() => setIsAgreed(!isAgreed)} className={`p-10 rounded-[3rem] border transition-all duration-500 flex items-start gap-8 cursor-pointer shadow-2xl ${isAgreed ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                        <div className={`mt-2 w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${isAgreed ? 'bg-blue-600 border-blue-600 shadow-lg' : 'border-slate-700'}`}>
                                            {isAgreed && <Check size={24} className="text-white" strokeWidth={4}/>}
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-xl uppercase italic tracking-tighter mb-2">Entiendo la reserva</p>
                                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest opacity-60">Debo enviar el mensaje de WhatsApp para que el club valide mi turno.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER FINAL --- */}
                    {step !== 'DATE' && (
                        <div className="bg-slate-950/95 backdrop-blur-3xl border-t border-white/5 p-12 md:px-24 md:py-16 shrink-0 z-50 shadow-2xl relative">
                            {isPromoEligible && (
                                <div className="mb-10 flex items-center gap-5 justify-center text-xs font-black text-orange-400 bg-orange-500/10 py-5 rounded-[2rem] border border-orange-500/20 uppercase tracking-[0.4em] animate-pulse">
                                    <Flame size={24}/> {config.promoText || '¡PROMO ACTIVADA!'} <Flame size={24}/>
                                </div>
                            )}
                            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 md:max-w-[1200px] md:mx-auto">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-[0.5em] mb-3">Total</span>
                                    <span className="text-6xl font-black text-white italic tracking-tighter font-mono">${totalPrice.toLocaleString()}</span>
                                </div>
                                <button onClick={() => { if(step==='FORM') handleConfirmBooking(); else if(step==='SLOTS') setStep('COURT_SELECT'); else setStep('FORM'); }}
                                    disabled={selectedSlotIds.length === 0 || (step==='COURT_SELECT' && !selectedCourtId) || (step==='FORM' && (!customerData.name || !customerData.phone || !isAgreed))}
                                    className={`h-28 w-full lg:w-auto lg:px-24 rounded-[3rem] font-black text-white shadow-2xl transition-all flex items-center justify-center gap-8 uppercase tracking-[0.4em] text-xl ${selectedSlotIds.length > 0 ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-900 opacity-30 cursor-not-allowed'}`}
                                >
                                    {step === 'FORM' ? <><MessageCircle size={40}/> Reservar</> : <>Siguiente <ChevronRight size={40}/></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {/* MODAL DE AYUDA Y BOTÓN FLOTANTE */}
        {isHelpOpen && <HelpModal/>}
        <button onClick={() => setIsHelpOpen(true)} className="fixed bottom-8 right-8 w-20 h-20 bg-slate-800 text-blue-400 rounded-full flex items-center justify-center shadow-2xl border border-white/10 hover:bg-slate-700 transition-all active:scale-90 z-[90]"><HelpCircle size={32}/></button>
    </div>
  );
};
