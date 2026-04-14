import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, User, Phone, CheckCircle, ArrowLeft, Calendar, Clock, MapPin, DollarSign, MessageCircle, Info, Sparkles, ExternalLink, Gift, Flame, Moon, Map, LayoutGrid } from 'lucide-react';
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
    time: string;       // "HH:mm" visual
    id: string;         // "HH:mm" or "HH:mm+1" for next day
    isNextDay: boolean;
    realDate: string;   // YYYY-MM-DD
}

// --- UTILS (Preservados del original) ---
const getArgentinaDate = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
};

const isTimeInPast = (slotDateStr: string, timeStr: string) => {
    const now = getArgentinaDate();
    const [h, m] = timeStr.split(':').map(Number);
    const [year, month, day] = slotDateStr.split('-').map(Number);
    const slotDate = new Date(year, month - 1, day, h, m);
    // Buffer de 15 mins
    const bufferTime = new Date(now.getTime() + 15 * 60000);
    return slotDate < bufferTime;
};

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ config, courts, bookings, onAddBooking }) => {
  // STEPS: 'DATE' -> 'SLOTS' -> 'COURT_SELECT' -> 'FORM' -> 'SUCCESS'
  const [step, setStep] = useState<'DATE' | 'SLOTS' | 'COURT_SELECT' | 'FORM' | 'SUCCESS'>('DATE');
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]); // Array of IDs (e.g. "23:00", "00:00+1")
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });

  // ADS STATE (Preservado)
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const activeAds = useMemo(() => config.ads.filter(ad => ad.isActive), [config.ads]);

  const theme = COLOR_THEMES[config.courtColorTheme];

  // --- LOGIC ---

  // Ads Rotation Effect (Preservado)
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
    setSelectedDate(d.toISOString().split('T')[0]);
    setSelectedSlotIds([]);
    setSelectedCourtId(null);
  };

  // --- GENERATE SMART SLOTS (Original preservado) ---
  const generatedSlots = useMemo(() => {
      const slots: TimeSlot[] = [];
      const baseDateObj = new Date(selectedDate + 'T12:00:00'); // Safe middle of day
      const nextDateObj = new Date(baseDateObj);
      nextDateObj.setDate(nextDateObj.getDate() + 1);
      const nextDateStr = nextDateObj.toISOString().split('T')[0];

      const getConfigDayIndex = (date: Date) => {
          const jsDay = date.getDay(); // 0(Sun) - 6(Sat)
          return jsDay === 0 ? 6 : jsDay - 1;
      };

      const todayIndex = getConfigDayIndex(baseDateObj);
      const nextDayIndex = getConfigDayIndex(nextDateObj);

      // Today's Slots (08:00 to 23:30)
      for (let h = 8; h < 24; h++) {
          if (config.schedule[todayIndex]?.[h]) {
              const hStr = h.toString().padStart(2, '0');
              slots.push({ time: `${hStr}:00`, id: `${hStr}:00`, isNextDay: false, realDate: selectedDate });
              slots.push({ time: `${hStr}:30`, id: `${hStr}:30`, isNextDay: false, realDate: selectedDate });
          }
      }

      // Next Day Early Morning Slots (00:00 to 05:00)
      for (let h = 0; h < 6; h++) {
           if (config.schedule[nextDayIndex]?.[h]) {
              const hStr = h.toString().padStart(2, '0');
              slots.push({ time: `${hStr}:00`, id: `${hStr}:00+1`, isNextDay: true, realDate: nextDateStr });
              slots.push({ time: `${hStr}:30`, id: `${hStr}:30+1`, isNextDay: true, realDate: nextDateStr });
           }
      }

      return slots;
  }, [selectedDate, config.schedule]);


  // Check availability para botones de slots
  const getFreeCourtsForSlot = (slot: TimeSlot): Court[] => {
      if (isTimeInPast(slot.realDate, slot.time)) return [];

      const slotDate = new Date(`${slot.realDate}T${slot.time}`);

      return courts.filter(court => {
          if (court.status === 'MAINTENANCE') return false;

          const hasBooking = bookings.some(b => {
             if (b.courtId !== court.id) return false;
             if (b.status === BookingStatus.CANCELLED) return false;
             
             const bStart = new Date(`${b.date}T${b.time}`);
             const bEnd = new Date(bStart.getTime() + b.duration * 60000);
             const slotEnd = new Date(slotDate.getTime() + 30 * 60000);

             return bStart < slotEnd && bEnd > slotDate;
          });

          return !hasBooking;
      });
  };

  // --- NUEVA LÓGICA: FILTRAR CANCHAS DISPONIBLES PARA TODO EL BLOQUE SELECCIONADO ---
  const availableCourtsForSelection = useMemo(() => {
    if (selectedSlotIds.length === 0) return [];
    
    return courts.filter(court => {
        if (court.status === 'MAINTENANCE') return false;
        
        // La cancha elegida debe estar libre en TODOS los slots marcados
        return selectedSlotIds.every(slotId => {
            const slot = generatedSlots.find(s => s.id === slotId);
            if (!slot) return false;
            
            const slotDate = new Date(`${slot.realDate}T${slot.time}`);
            const hasBooking = bookings.some(b => {
                if (b.courtId !== court.id) return false;
                if (b.status === BookingStatus.CANCELLED) return false;
                
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
      setSelectedCourtId(null); // Reset cancha si cambia el horario
      if (selectedSlotIds.includes(slotId)) {
          setSelectedSlotIds(prev => prev.filter(id => id !== slotId));
      } else {
          const newIds = [...selectedSlotIds, slotId];
          const sortedIds = generatedSlots
            .filter(s => newIds.includes(s.id))
            .map(s => s.id);
            
          setSelectedSlotIds(sortedIds);
      }
  };

  // --- PROMO LOGIC & PRICE ---
  const checkPromoEligibility = () => {
      if (!config.promoActive || selectedSlotIds.length !== 4) return false;

      const selectedSlots = generatedSlots.filter(s => selectedSlotIds.includes(s.id));
      if (selectedSlots.length !== 4) return false;

      // Verify Continuity
      for (let i = 0; i < selectedSlots.length - 1; i++) {
          const current = new Date(`${selectedSlots[i].realDate}T${selectedSlots[i].time}`);
          const next = new Date(`${selectedSlots[i+1].realDate}T${selectedSlots[i+1].time}`);
          const diffMinutes = (next.getTime() - current.getTime()) / 60000;
          if (diffMinutes !== 30) return false;
      }

      return true;
  };

  const isPromoEligible = checkPromoEligibility();

  const calculateTotal = () => {
      if (isPromoEligible && config.promoActive) {
          return config.promoPrice;
      }

      if (!selectedCourtId) return 0;
      const court = courts.find(c => c.id === selectedCourtId);
      if (!court) return 0;

      // Precio por bloque de 30 min (basePrice es de 90 min)
      const slotPrice = court.basePrice / 3;
      return Math.round((slotPrice * selectedSlotIds.length) / 100) * 100;
  };

  const totalPrice = calculateTotal();
  const totalDurationMinutes = selectedSlotIds.length * 30;

  const formatDuration = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0 && m > 0) return `${h}h ${m}min`;
      if (h > 0) return `${h} hs`;
      return `${m} min`;
  };

  const handleConfirmBooking = () => {
      if (!selectedCourtId || selectedSlotIds.length === 0) return;
      
      const startSlot = generatedSlots.find(s => s.id === selectedSlotIds[0]);
      const court = courts.find(c => c.id === selectedCourtId);
      if (!startSlot || !court) return;

      const newBooking: Booking = {
          id: `web-${Date.now()}`,
          courtId: selectedCourtId,
          date: startSlot.realDate,
          time: startSlot.time,
          duration: totalDurationMinutes,
          customerName: customerData.name,
          customerPhone: customerData.phone,
          status: BookingStatus.PENDING,
          price: totalPrice,
          isRecurring: false
      };
      
      onAddBooking(newBooking);
      setStep('SUCCESS');

      const clubPhone = config.ownerPhone.replace('+', '');
      let promoText = "";
      if (isPromoEligible) {
          promoText = `%0A🎁 *PROMO ACTIVADA:* ${config.promoText}`;
      }

      const msg = `Hola! Quiero confirmar una reserva en *${config.name}* 🎾%0A%0A👤 *Cliente:* ${customerData.name}%0A📱 *Tel:* ${customerData.phone}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time} (${formatDuration(totalDurationMinutes)})%0A🏟 *Cancha:* ${court.name}${promoText}%0A💰 *Total:* $${totalPrice.toLocaleString()}`;
      
      setTimeout(() => {
          window.open(`https://wa.me/${clubPhone}?text=${msg}`, '_blank');
      }, 1000);
  };

  // --- RENDER HELPERS ---
  const todaySlots = generatedSlots.filter(s => !s.isNextDay);
  const nextDaySlots = generatedSlots.filter(s => s.isNextDay);
  const nextDayDate = nextDaySlots.length > 0 ? nextDaySlots[0].realDate : '';

  const renderSlotButton = (slot: TimeSlot) => {
      const freeCourts = getFreeCourtsForSlot(slot);
      const isAvailable = freeCourts.length > 0;
      const isSelected = selectedSlotIds.includes(slot.id);

      return (
          <button
              key={slot.id}
              disabled={!isAvailable}
              onClick={() => toggleSlotSelection(slot.id)}
              className={`
                  relative h-16 w-full rounded-xl text-sm font-bold transition-all border flex flex-col items-center justify-center
                  ${isSelected 
                      ? `${theme.primary} text-white border-white/30 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-105 z-10` 
                      : isAvailable 
                          ? slot.isNextDay
                              ? 'bg-slate-800/40 text-slate-300 border-white/5 hover:bg-slate-700/60 hover:border-white/20 hover:text-white'
                              : 'bg-slate-800/60 text-white border-white/10 hover:bg-slate-700 hover:border-white/30'
                          : 'bg-slate-900/20 text-slate-800 border-transparent opacity-30 cursor-not-allowed'}
              `}
          >
              <span className="tracking-tight text-base">{slot.time}</span>
              {isSelected && (
                  <div className="absolute top-1 right-1">
                      <CheckCircle size={12} className="text-white/70"/>
                  </div>
              )}
          </button>
      );
  };

  const renderAd = () => {
    if (activeAds.length === 0) return null;
    return (
        <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group animate-in fade-in duration-700 mt-auto">
            <img 
                src={activeAds[currentAdIndex].imageUrl} 
                alt="Publicidad" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md text-[10px] text-white/70 px-2 py-0.5 rounded-md border border-white/10">
                Publicidad
            </div>
            {activeAds[currentAdIndex].linkUrl && (
                <a 
                    href={activeAds[currentAdIndex].linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-full border border-white/20 transition-all active:scale-95"
                >
                    <ExternalLink size={16}/>
                </a>
            )}
            {activeAds.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {activeAds.map((_, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentAdIndex ? 'bg-white w-3' : 'bg-white/40'}`}/>
                    ))}
                </div>
            )}
        </div>
    );
  };

  if (step === 'SUCCESS') {
      return (
          <div 
            className="h-full flex items-center justify-center p-6 bg-cover bg-center relative animate-in fade-in"
            style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : undefined }}
          >
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"></div>
              
              <div className="relative z-10 max-w-sm w-full bg-white/5 border border-white/20 p-8 rounded-3xl shadow-2xl text-center">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-in zoom-in spin-in-12">
                      <CheckCircle size={40} className="text-white" strokeWidth={3}/>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">¡Reserva Enviada!</h2>
                  <p className="text-slate-300 mb-8 leading-relaxed text-sm">
                      Tu solicitud ha ingresado al sistema. <br/>
                      <span className="text-green-400 font-bold">Se abrirá WhatsApp para finalizar la confirmación.</span>
                  </p>
                  <button 
                    onClick={() => {
                        setStep('DATE');
                        setSelectedSlotIds([]);
                        setSelectedCourtId(null);
                        setCustomerData({name: '', phone: ''});
                    }}
                    className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-transform active:scale-95"
                  >
                      Nueva Reserva
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div 
        className="h-full flex flex-col bg-slate-950 relative overflow-hidden font-sans"
        style={{ 
            backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}
    >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg"></div>

        <div className="relative z-10 flex-1 flex flex-col h-full md:p-6 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-lg md:max-w-6xl md:max-h-[85vh] bg-slate-900/40 md:bg-slate-900/80 md:border md:border-white/10 md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden backdrop-blur-md">
                
                {/* --- SIDEBAR (DESKTOP) --- */}
                <div className="hidden md:flex w-1/3 border-r border-white/10 flex-col p-8 bg-black/20">
                     <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6 shadow-xl border border-white/10 bg-slate-800">
                         {config.logoUrl ? (
                             <img src={config.logoUrl} className="w-full h-full object-cover"/>
                         ) : (
                             <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-bold text-3xl`}>{config.name.charAt(0)}</div>
                         )}
                     </div>
                     <h1 className="text-2xl font-bold text-white tracking-tight mb-1">{config.name}</h1>
                     <div className="flex items-center gap-2 text-slate-400 text-sm mb-8">
                         <MapPin size={14}/> <span>Reserva de Padel Online</span>
                     </div>

                     <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-4">
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha</label>
                             <div className="text-white font-bold text-lg flex items-center gap-2">
                                 <Calendar size={18} className="text-blue-400"/> {selectedDate}
                             </div>
                         </div>
                         {selectedSlotIds.length > 0 && (
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Selección</label>
                                <div className="text-white font-bold text-lg flex items-center gap-2">
                                    <Clock size={18} className="text-blue-400"/> {formatDuration(totalDurationMinutes)}
                                </div>
                             </div>
                         )}
                         {selectedCourtId && (
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cancha</label>
                                <div className="text-white font-bold text-lg flex items-center gap-2">
                                    <Map size={18} className="text-blue-400"/> {courts.find(c => c.id === selectedCourtId)?.name}
                                </div>
                             </div>
                         )}
                     </div>
                     {renderAd()}
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                    
                    {/* MOBILE HEADER */}
                    <div className="md:hidden p-6 pb-2 flex flex-col items-center justify-center relative shrink-0">
                        {step !== 'DATE' && (
                            <button 
                                onClick={() => {
                                    if (step === 'SLOTS') setStep('DATE');
                                    if (step === 'COURT_SELECT') setStep('SLOTS');
                                    if (step === 'FORM') setStep('COURT_SELECT');
                                }} 
                                className="absolute left-6 top-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                            >
                                <ArrowLeft size={20}/>
                            </button>
                        )}
                        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3 shadow-xl border border-white/10 bg-slate-800">
                            {config.logoUrl ? (
                                <img src={config.logoUrl} className="w-full h-full object-cover"/>
                            ) : (
                                <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-bold text-3xl`}>{config.name.charAt(0)}</div>
                            )}
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight text-center">{config.name}</h1>
                    </div>

                    <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
                        
                        {/* VIEW: DATE */}
                        {step === 'DATE' && (
                            <div className="h-full flex flex-col p-6 md:p-10 animate-in slide-in-from-right-8 duration-300">
                                <h2 className="text-2xl font-bold text-white mb-6">Selecciona el día</h2>
                                <div className="bg-slate-800/60 p-1 rounded-2xl border border-white/10 flex items-center justify-between mb-6 md:max-w-md">
                                    <button onClick={() => handleDateChange(-1)} className="p-4 hover:bg-white/10 rounded-xl text-white transition-colors"><ChevronLeft/></button>
                                    <div className="text-center">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">FECHA SELECCIONADA</div>
                                        <input 
                                            type="date" 
                                            value={selectedDate}
                                            onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlotIds([]); }}
                                            className="bg-transparent text-xl font-bold text-white text-center w-full focus:outline-none appearance-none cursor-pointer font-mono"
                                        />
                                    </div>
                                    <button onClick={() => handleDateChange(1)} className="p-4 hover:bg-white/10 rounded-xl text-white transition-colors"><ChevronRight/></button>
                                </div>
                                <button 
                                    onClick={() => setStep('SLOTS')}
                                    className={`w-full md:max-w-md ${theme.primary} text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2`}
                                >
                                    <Clock size={20}/> Ver Horarios Disponibles
                                </button>
                                <div className="md:hidden mt-8 flex-1 flex flex-col justify-end">
                                    {renderAd()}
                                </div>
                            </div>
                        )}

                        {/* VIEW: SLOTS */}
                        {step === 'SLOTS' && (
                            <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
                                <div className="p-6 md:p-10">
                                    <h2 className="text-2xl font-bold text-white mb-6">Horarios Disponibles</h2>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
                                        {todaySlots.map(slot => renderSlotButton(slot))}
                                    </div>
                                    {nextDaySlots.length > 0 && (
                                        <>
                                            <div className="py-6 flex items-center gap-4">
                                                <div className="h-px bg-white/10 flex-1"></div>
                                                <span className="text-xs font-bold text-slate-400 bg-slate-900/40 px-3 py-1 rounded-full border border-white/5 flex items-center gap-2">
                                                    <Calendar size={12}/> {nextDayDate}
                                                </span>
                                                <div className="h-px bg-white/10 flex-1"></div>
                                            </div>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
                                                {nextDaySlots.map(slot => renderSlotButton(slot))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW: COURT SELECT */}
                        {step === 'COURT_SELECT' && (
                            <div className="h-full flex flex-col p-6 md:p-10 animate-in slide-in-from-right-8 duration-300">
                                <h2 className="text-2xl font-bold text-white mb-2">Selecciona tu Cancha</h2>
                                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                    Estas canchas están libres para el horario que elegiste.
                                </p>
                                
                                <div className="grid grid-cols-1 gap-4 mb-8">
                                    {availableCourtsForSelection.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                            <Moon size={40} className="mx-auto mb-2 opacity-30"/>
                                            No hay canchas disponibles para este periodo completo.
                                        </div>
                                    ) : (
                                        availableCourtsForSelection.map(court => (
                                            <button 
                                                key={court.id} 
                                                onClick={() => setSelectedCourtId(court.id)}
                                                className={`
                                                    p-5 rounded-2xl border-2 transition-all flex items-center justify-between group
                                                    ${selectedCourtId === court.id 
                                                        ? 'bg-blue-600/20 border-blue-500 shadow-xl' 
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                                                `}
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedCourtId === court.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                                                        <MapPin size={24}/>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg">{court.name}</h4>
                                                        <div className="flex gap-2 items-center mt-1">
                                                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{court.type === 'Indoor' ? 'Techada' : 'Descubierta'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                            <span className="text-xs font-mono text-green-400 font-bold">${court.basePrice.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedCourtId === court.id && (
                                                    <div className="bg-blue-500 rounded-full p-1 shadow-lg animate-in zoom-in">
                                                        <CheckCircle size={20} className="text-white" strokeWidth={3}/>
                                                    </div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW: FORM */}
                        {step === 'FORM' && (
                             <div className="h-full p-6 md:p-10 animate-in slide-in-from-right-8 duration-300 flex flex-col md:max-w-lg md:mx-auto">
                                 <h3 className="text-2xl font-bold text-white mb-2">Tus Datos</h3>
                                 <p className="text-slate-400 text-sm mb-8">Completa para recibir la confirmación por WhatsApp.</p>
                                 
                                 <div className="space-y-5">
                                     <div>
                                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Nombre y Apellido</label>
                                         <div className="relative">
                                             <User className="absolute left-4 top-3.5 text-slate-500" size={18}/>
                                             <input 
                                                 type="text" 
                                                 required
                                                 value={customerData.name}
                                                 onChange={e => setCustomerData({...customerData, name: e.target.value})}
                                                 className="w-full bg-slate-800/80 border border-white/10 rounded-xl py-3.5 pl-12 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                 placeholder="Ej: Leo Messi"
                                             />
                                         </div>
                                     </div>
                                     <div>
                                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Teléfono (WhatsApp)</label>
                                         <div className="relative">
                                             <Phone className="absolute left-4 top-3.5 text-slate-500" size={18}/>
                                             <input 
                                                 type="tel" 
                                                 required
                                                 value={customerData.phone}
                                                 onChange={e => setCustomerData({...customerData, phone: e.target.value})}
                                                 className="w-full bg-slate-800/80 border border-white/10 rounded-xl py-3.5 pl-12 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                 placeholder="11 1234 5678"
                                             />
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        )}
                    </div>

                    {/* FOOTER SUMMARY */}
                    {step !== 'DATE' && (
                        <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-4 pb-12 md:pb-6 shrink-0 z-20">
                            {isPromoEligible && (
                                <div className="mb-3 flex items-center gap-2 justify-center text-xs font-bold text-orange-300 animate-pulse">
                                    <Flame size={14}/> <span>{config.promoText || 'Promo Activada'}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-4 md:max-w-4xl md:mx-auto">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total Reservado</span>
                                    <span className="text-xl font-black text-white flex items-baseline gap-1">
                                        ${totalPrice.toLocaleString()}
                                        {isPromoEligible && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 rounded ml-1 border border-red-500/30 uppercase">Promo</span>}
                                    </span>
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
                                        (step === 'FORM' && (!customerData.name || !customerData.phone))
                                    }
                                    className={`
                                        px-8 py-3.5 rounded-xl font-black text-white shadow-xl transition-all flex items-center gap-2 uppercase tracking-tighter text-sm
                                        ${(selectedSlotIds.length > 0 && (step !== 'COURT_SELECT' || selectedCourtId)) 
                                            ? 'bg-green-600 hover:bg-green-500 active:scale-95' 
                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                                    `}
                                >
                                    {step === 'FORM' ? (
                                        <><MessageCircle size={18}/> Reservar</>
                                    ) : (
                                        <>Siguiente <ChevronRight size={18}/></>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
