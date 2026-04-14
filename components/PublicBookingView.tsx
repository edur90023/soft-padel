import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, User, Phone, CheckCircle, ArrowLeft, Calendar, 
  Clock, MapPin, MessageCircle, ExternalLink, Moon, Map, LayoutGrid, Award,
  ShieldCheck, Star, Zap, Navigation, Smartphone, Wifi, Coffee, Utensils, 
  HelpCircle, X, Flame, Check, Bell
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

// --- UTILS ---
const getArgentinaDate = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
};

const isTimeInPast = (slotDateStr: string, timeStr: string) => {
    const now = getArgentinaDate();
    const [h, m] = timeStr.split(':').map(Number);
    const [year, month, day] = slotDateStr.split('-').map(Number);
    const slotDate = new Date(year, month - 1, day, h, m);
    return slotDate < new Date(now.getTime() + 15 * 60000); // Buffer de 15 min
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

  // --- EFECTOS ---
  useEffect(() => {
      if (activeAds.length <= 1) return;
      const interval = setInterval(() => setCurrentAdIndex(prev => (prev + 1) % activeAds.length), (config.adRotationInterval || 5) * 1000);
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
      const msg = `Hola! Reserva en *${config.name}*%0A👤 *Cliente:* ${customerData.name}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time}%0A⏳ *Duración:* ${totalDurationMinutes} min%0A🏟 *Cancha:* ${court.name}%0A💰 *Total:* $${totalPrice.toLocaleString()}${isPromoEligible ? `%0A🎁 *PROMO:* ${config.promoText}` : ''}`;
      setTimeout(() => window.open(`https://wa.me/${config.ownerPhone.replace('+', '')}?text=${msg}`, '_blank'), 500);
  };

  // --- SUB-COMPONENTES OPTIMIZADOS ---
  const renderAd = () => {
    if (activeAds.length === 0) return null;
    const ad = activeAds[currentAdIndex];
    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10 mt-auto transition-all duration-700">
            <img src={ad.imageUrl} alt="Publicidad" className="w-full h-full object-cover transition-transform duration-[2000ms] hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-[8px] text-white/80 px-2 py-1 rounded border border-white/10 uppercase tracking-widest">Publicidad</div>
            {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 bg-white text-black p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <ExternalLink size={14}/>
                </a>
            )}
        </div>
    );
  };

  const HelpModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsHelpOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
            <h3 className="text-xl font-black text-white mb-6 uppercase italic">Guía de Reserva</h3>
            <div className="space-y-4">
                <div className="flex items-start gap-3"><Calendar className="text-blue-500 mt-1" size={18}/><div><p className="text-white font-bold text-sm">1. Fecha</p><p className="text-xs text-slate-400">Elegí el día en el calendario.</p></div></div>
                <div className="flex items-start gap-3"><Clock className="text-purple-500 mt-1" size={18}/><div><p className="text-white font-bold text-sm">2. Horario</p><p className="text-xs text-slate-400">Seleccioná bloques de 30m.</p></div></div>
                <div className="flex items-start gap-3"><Map className="text-green-500 mt-1" size={18}/><div><p className="text-white font-bold text-sm">3. Cancha</p><p className="text-xs text-slate-400">Elegí la pista que prefieras.</p></div></div>
                <div className="flex items-start gap-3"><Smartphone className="text-orange-500 mt-1" size={18}/><div><p className="text-white font-bold text-sm">4. WhatsApp</p><p className="text-xs text-slate-400">Confirmá enviando el mensaje final.</p></div></div>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="w-full mt-6 bg-white text-slate-950 font-bold py-3 rounded-xl uppercase tracking-widest text-sm">Entendido</button>
        </div>
    </div>
  );

  if (step === 'SUCCESS') {
      return (
          <div className="h-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full animate-pulse"></div>
              <div className="relative z-10 max-w-sm w-full bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl text-center">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                      <CheckCircle size={40} className="text-green-500" strokeWidth={3} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-3 uppercase italic leading-none">Turno Enviado</h2>
                  <p className="text-slate-400 mb-8 text-xs font-bold uppercase tracking-widest">Finaliza por WhatsApp.</p>
                  <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); setCustomerData({name:'', phone:''}); setIsAgreed(false); }} className="w-full bg-white text-slate-950 font-bold py-3.5 rounded-xl uppercase tracking-widest text-sm">Nueva Reserva</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-sans bg-slate-950 text-sm">
        
        {/* FONDO ESMERILADO (Optimizado) */}
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : 'none' }}></div>
             <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[10px]"></div>
             <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
             <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col h-full md:p-6 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-5xl md:max-h-[85vh] bg-slate-900/60 border border-white/10 md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden backdrop-blur-2xl">
                
                {/* --- SIDEBAR DESKTOP (Reducido y proporcionado) --- */}
                <div className="hidden md:flex w-64 border-r border-white/10 flex-col p-6 bg-black/40 justify-between shrink-0 relative">
                     <div className="space-y-6 relative z-10">
                        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg border border-white/10 bg-slate-800">
                            {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover"/> : <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-black text-2xl`}>{config.name.charAt(0)}</div>}
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white uppercase italic leading-tight">{config.name}</h1>
                            <div className="flex items-center gap-1 text-blue-400 font-bold uppercase tracking-widest text-[9px] mt-2">
                                <Navigation size={10} className="animate-pulse"/> Sede Central
                            </div>
                        </div>

                        <div className="space-y-4 py-4 border-y border-white/5">
                            <div>
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Fecha</label>
                                <div className="text-white font-bold text-sm flex items-center gap-2"><Calendar size={14} className="text-blue-500"/> {selectedDate}</div>
                            </div>
                            {selectedSlotIds.length > 0 && (
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tiempo</label>
                                    <div className="text-white font-bold text-sm flex items-center gap-2"><Clock size={14} className="text-purple-500"/> {totalDurationMinutes} min</div>
                                </div>
                            )}
                            {selectedCourtId && (
                                <div>
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Cancha</label>
                                    <div className="text-white font-bold text-sm flex items-center gap-2"><Map size={14} className="text-green-500"/> {courts.find(c => c.id === selectedCourtId)?.name}</div>
                                </div>
                            )}
                        </div>
                     </div>
                     {renderAd()}
                </div>

                {/* --- CONTENIDO PRINCIPAL --- */}
                <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900/20">
                    
                    {/* Header Mobile (Compacto) */}
                    <div className="md:hidden p-4 flex items-center justify-between border-b border-white/5 bg-slate-950/80 backdrop-blur-xl shrink-0 z-50">
                        {step !== 'DATE' ? (
                            <button onClick={() => {
                                if (step === 'SLOTS') setStep('DATE');
                                if (step === 'COURT_SELECT') setStep('SLOTS');
                                if (step === 'FORM') setStep('COURT_SELECT');
                            }} className="p-2 rounded-lg bg-white/5 text-white">
                                <ArrowLeft size={18}/>
                            </button>
                        ) : <div className="w-8"></div>}
                        <h1 className="text-base font-black text-white text-center uppercase tracking-tighter italic">{config.name}</h1>
                        <button onClick={() => setIsHelpOpen(true)} className="text-slate-400 hover:text-white p-2"><HelpCircle size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide relative z-30">
                        
                        {/* STEP 1: DATE */}
                        {step === 'DATE' && (
                            <div className="animate-in fade-in duration-500 max-w-xl mx-auto">
                                <div className="mb-8">
                                    <h2 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase italic leading-none">Reservá tu <span className="text-blue-500">Turno</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Paso 1: Seleccioná el día</p>
                                </div>

                                <div className="bg-slate-800/40 p-4 rounded-3xl border border-white/10 flex items-center justify-between shadow-xl mb-6 backdrop-blur-md">
                                    <button onClick={() => handleDateChange(-1)} className="p-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-colors"><ChevronLeft size={24}/></button>
                                    <div className="text-center flex-1">
                                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Calendario</span>
                                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-lg md:text-2xl font-black text-white text-center w-full outline-none cursor-pointer font-mono"/>
                                    </div>
                                    <button onClick={() => handleDateChange(1)} className="p-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-colors"><ChevronRight size={24}/></button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                                        <Award className="text-yellow-500" size={24}/>
                                        <div><p className="text-white font-bold text-sm uppercase italic">Premium</p><p className="text-[9px] text-slate-400 font-bold uppercase">Canchas Pro</p></div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-3">
                                        <ShieldCheck className="text-blue-500" size={24}/>
                                        <div><p className="text-white font-bold text-sm uppercase italic">Seguro</p><p className="text-[9px] text-slate-400 font-bold uppercase">Gestión Rápida</p></div>
                                    </div>
                                </div>

                                <button onClick={() => setStep('SLOTS')} className={`w-full ${theme.primary} text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest text-sm`}>
                                    <Clock size={20}/> Ver Horarios
                                </button>
                                <div className="md:hidden mt-8">{renderAd()}</div>
                            </div>
                        )}

                        {/* STEP 2: SLOTS */}
                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in duration-500">
                                <div className="mb-8">
                                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic leading-none">Elegí tu <span className="text-blue-500">Tiempo</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Paso 2: Marcá los bloques de 30m</p>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-10">
                                    {generatedSlots.map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button 
                                                key={slot.id}
                                                disabled={!isAvailable}
                                                onClick={() => toggleSlotSelection(slot.id)}
                                                className={`relative h-14 md:h-16 w-full rounded-xl text-base font-black transition-all border flex items-center justify-center ${isSelected ? `${theme.primary} text-white border-white/50 shadow-lg scale-105 z-10` : isAvailable ? 'bg-slate-800/60 text-slate-200 border-white/10 hover:bg-slate-700' : 'bg-slate-900/50 text-slate-600 border-transparent opacity-30 cursor-not-allowed'}`}
                                            >
                                                {slot.time}
                                                {slot.isNextDay && <span className={`text-[8px] uppercase font-bold absolute bottom-1 ${isSelected ? 'text-white/80' : 'text-blue-400'}`}>Madrugada</span>}
                                                {isSelected && <CheckCircle size={14} className="absolute -top-2 -right-2 bg-white text-blue-600 rounded-full" strokeWidth={4}/>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedSlotIds.length > 0 && (
                                    <div className="max-w-md mx-auto">
                                        <button onClick={() => setStep('COURT_SELECT')} className={`w-full ${theme.primary} text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 text-sm`}>
                                            Siguiente: Cancha <ChevronRight size={20}/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 3: COURT SELECT */}
                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in duration-500 max-w-xl mx-auto">
                                <div className="mb-8">
                                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic leading-none">Seleccioná <span className="text-blue-500">Pista</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Paso 3: Disponibles para tu horario</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 mb-8">
                                    {availableCourtsForSelection.length === 0 ? (
                                        <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                            <Moon size={40} className="mx-auto mb-3 text-slate-600"/>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin disponibilidad libre</p>
                                            <button onClick={() => setStep('SLOTS')} className="mt-4 text-blue-400 font-bold text-[10px] uppercase">Volver a Horarios</button>
                                        </div>
                                    ) : (
                                        availableCourtsForSelection.map(court => (
                                            <button 
                                                key={court.id}
                                                onClick={() => setSelectedCourtId(court.id)}
                                                className={`p-5 md:p-6 rounded-2xl border-2 transition-all flex items-center justify-between backdrop-blur-md ${selectedCourtId === court.id ? 'bg-blue-600/20 border-blue-500 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedCourtId === court.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                        <Navigation size={20}/>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-white text-lg uppercase italic leading-none mb-1">{court.name}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-black/30 px-2 py-0.5 rounded">{court.type}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-lg font-black text-green-400 font-mono">${(court.basePrice * selectedSlotIds.length).toLocaleString()}</span>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button disabled={!selectedCourtId} onClick={() => setStep('FORM')} className={`w-full ${theme.primary} text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 transition-all text-sm`}>
                                    Siguiente: Datos <ChevronRight size={20}/>
                                </button>
                            </div>
                        )}

                        {/* STEP 4: FORM */}
                        {step === 'FORM' && (
                            <div className="animate-in fade-in duration-500 max-w-md mx-auto">
                                <div className="mb-8">
                                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic leading-none">Tus <span className="text-blue-500">Datos</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Paso final de confirmación</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Nombre Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                                            <input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800/60 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm font-bold outline-none focus:border-blue-500 transition-all backdrop-blur-md" placeholder="Ej: Lionel Messi"/>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block">WhatsApp</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                                            <input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800/60 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm font-bold outline-none focus:border-blue-500 transition-all font-mono backdrop-blur-md" placeholder="11 1234 5678"/>
                                        </div>
                                    </div>

                                    <div onClick={() => setIsAgreed(!isAgreed)} className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 backdrop-blur-md ${isAgreed ? 'bg-blue-600/10 border-blue-500/50' : 'bg-white/5 border-white/10'}`}>
                                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isAgreed ? 'bg-blue-600 border-blue-600' : 'border-slate-500'}`}>
                                            {isAgreed && <Check size={14} className="text-white" strokeWidth={3}/>}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-xs uppercase tracking-widest mb-1">Entiendo la reserva</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-tight">Al reservar se abrirá WhatsApp. Debo enviar el mensaje para validar el turno.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER COMPACTO PERO ELEGANTE --- */}
                    {step !== 'DATE' && (
                        <div className="bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 p-4 md:p-6 shrink-0 z-50">
                            {isPromoEligible && (
                                <div className="mb-4 max-w-md mx-auto flex items-center justify-center gap-2 text-[10px] font-bold text-orange-400 bg-orange-500/10 py-2 rounded-lg border border-orange-500/20 uppercase tracking-widest animate-pulse">
                                    <Flame size={14}/> {config.promoText || 'Promo Activada'} <Flame size={14}/>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Total a Pagar</span>
                                    <span className="text-2xl md:text-3xl font-black text-white italic tracking-tighter font-mono">${totalPrice.toLocaleString()}</span>
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
                                    className={`px-6 md:px-10 py-3 md:py-4 rounded-xl font-black text-white transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs md:text-sm shadow-lg ${ (selectedSlotIds.length > 0 && (step !== 'COURT_SELECT' || selectedCourtId) && (step !== 'FORM' || isAgreed)) ? 'bg-green-600 hover:bg-green-500 active:scale-95' : 'bg-slate-800 text-slate-600 border border-white/5 opacity-50' }`}
                                >
                                    {step === 'FORM' ? <><MessageCircle size={18}/> Reservar</> : <>Siguiente <ChevronRight size={18}/></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {/* BOTÓN AYUDA FLOTANTE */}
        <button onClick={() => setIsHelpOpen(true)} className="fixed bottom-24 md:bottom-6 right-6 p-3 bg-slate-800 text-blue-400 rounded-full shadow-2xl border border-white/10 hover:bg-slate-700 transition-all z-[60]"><HelpCircle size={20}/></button>
        {isHelpOpen && <HelpModal/>}
    </div>
  );
};
