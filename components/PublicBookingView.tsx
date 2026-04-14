import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, User, Phone, CheckCircle, ArrowLeft, Calendar, 
  Clock, MapPin, MessageCircle, ExternalLink, Moon, Map, X, Flame, Navigation, Star, Plus
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

// --- UTILS CORREGIDOS ---
const getArgentinaDate = () => {
    // Corrección del string de zona horaria
    return new Date(new Date().toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}));
};

const isTimeInPast = (slotDateStr: string, timeStr: string) => {
    const now = getArgentinaDate();
    const [h, m] = timeStr.split(':').map(Number);
    const [year, month, day] = slotDateStr.split('-').map(Number);
    const slotDate = new Date(year, month - 1, day, h, m);
    // Margen de 15 minutos
    return slotDate < new Date(now.getTime() + 15 * 60000);
};

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({ config, courts, bookings, onAddBooking }) => {
  const [step, setStep] = useState<'DATE' | 'SLOTS' | 'COURT_SELECT' | 'FORM' | 'SUCCESS'>('DATE');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]); 
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });
  const [isAgreed, setIsAgreed] = useState(false);

  const activeAds = useMemo(() => config.ads.filter(ad => ad.isActive), [config.ads]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const theme = COLOR_THEMES[config.courtColorTheme];

  useEffect(() => {
      if (activeAds.length <= 1) return;
      const interval = setInterval(() => setCurrentAdIndex(prev => (prev + 1) % activeAds.length), (config.adRotationInterval || 5) * 1000);
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
      const msg = `Hola! Reserva en *${config.name}*%0A👤 *Cliente:* ${customerData.name}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time}%0A🏟 *Cancha:* ${court.name}%0A💰 *Total:* $${totalPrice.toLocaleString()}`;
      setTimeout(() => window.open(`https://wa.me/${config.ownerPhone.replace('+', '')}?text=${msg}`, '_blank'), 500);
  };

  const renderAd = () => {
    if (activeAds.length === 0) return null;
    const ad = activeAds[currentAdIndex];
    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-md border border-white/10 mt-4">
            <img src={ad.imageUrl} className="w-full h-full object-cover" alt="Ad"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            {ad.linkUrl && <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 bg-blue-600 p-1.5 rounded-full"><ExternalLink size={12} className="text-white"/></a>}
        </div>
    );
  };

  if (step === 'SUCCESS') {
      return (
          <div className="h-screen flex items-center justify-center p-4 bg-slate-950">
              <div className="max-w-sm w-full bg-slate-900 border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={32} className="text-green-500" /></div>
                  <h2 className="text-2xl font-bold text-white mb-2 uppercase italic">¡Turno Solicitado!</h2>
                  <p className="text-slate-400 mb-8 text-sm">Abre WhatsApp para confirmar.</p>
                  <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); setCustomerData({name:'', phone:''}); }} className="w-full bg-white text-slate-950 font-bold py-3 rounded-xl uppercase tracking-widest">Hacer otra reserva</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 font-sans selection:bg-blue-600/40">
        <div className="flex-1 flex flex-col h-full md:p-4 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-5xl md:max-h-[85vh] bg-slate-900 border border-white/10 md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden backdrop-blur-3xl">
                
                {/* --- SIDEBAR IZQUIERDO --- */}
                <div className="hidden md:flex w-72 border-r border-white/5 flex-col p-6 bg-black/20 justify-between shrink-0">
                     <div className="space-y-6">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-slate-800">
                            {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover" alt="Logo"/> : <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-bold text-2xl`}>{config.name.charAt(0)}</div>}
                        </div>
                        <h1 className="text-2xl font-black text-white leading-none uppercase italic">{config.name}</h1>
                        
                        <div className="space-y-4 py-4 border-y border-white/5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Fecha</label>
                                <div className="text-white font-bold text-base flex items-center gap-2"><Calendar size={16} className="text-blue-500"/> {selectedDate}</div>
                            </div>
                            {selectedSlotIds.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Tiempo</label>
                                    <div className="text-white font-bold text-base flex items-center gap-2"><Clock size={16} className="text-purple-500"/> {selectedSlotIds.length * 30} min</div>
                                </div>
                            )}
                            {selectedCourtId && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Cancha</label>
                                    <div className="text-white font-bold text-base flex items-center gap-2"><Map size={16} className="text-green-500"/> {courts.find(c => c.id === selectedCourtId)?.name}</div>
                                </div>
                            )}
                        </div>
                     </div>
                     {renderAd()}
                </div>

                {/* --- CONTENIDO PRINCIPAL --- */}
                <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40 relative">
                    {/* Header Mobile */}
                    <div className="md:hidden p-4 flex items-center justify-between border-b border-white/5 bg-slate-950/50 shrink-0">
                        {step !== 'DATE' && (
                            <button onClick={() => {
                                if (step === 'SLOTS') setStep('DATE');
                                if (step === 'COURT_SELECT') setStep('SLOTS');
                                if (step === 'FORM') setStep('COURT_SELECT');
                            }} className="p-2 rounded-xl bg-white/5 text-white">
                                <ArrowLeft size={18}/>
                            </button>
                        )}
                        <h1 className="text-base font-black text-white uppercase italic tracking-tighter">{config.name}</h1>
                        <div className="w-8"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
                        {step === 'DATE' && (
                            <div className="animate-in fade-in duration-500">
                                <h2 className="text-2xl font-black text-white mb-6 uppercase italic tracking-tighter">1. Seleccioná el día</h2>
                                <div className="bg-slate-800/60 p-1 rounded-2xl border border-white/10 flex items-center justify-between mb-8 max-w-sm">
                                    <button onClick={() => handleDateChange(-1)} className="p-4 text-white hover:bg-white/5 rounded-xl"><ChevronLeft size={24}/></button>
                                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white font-bold text-lg text-center outline-none cursor-pointer font-mono w-full"/>
                                    <button onClick={() => handleDateChange(1)} className="p-4 text-white hover:bg-white/5 rounded-xl"><ChevronRight size={24}/></button>
                                </div>
                                <button onClick={() => setStep('SLOTS')} className={`w-full max-w-sm ${theme.primary} text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest transition-all active:scale-95`}>Ver Horarios</button>
                                <div className="md:hidden mt-10">{renderAd()}</div>
                            </div>
                        )}

                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in duration-500">
                                <h2 className="text-2xl font-black text-white mb-6 uppercase italic tracking-tighter">2. Elegí tu horario</h2>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8">
                                    {generatedSlots.filter(s => !s.isNextDay).map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button key={slot.id} disabled={!isAvailable} onClick={() => toggleSlotSelection(slot.id)}
                                                className={`h-12 rounded-xl text-sm font-bold border transition-all ${isSelected ? `${theme.primary} border-white/30 text-white shadow-lg` : isAvailable ? 'bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-700' : 'bg-slate-950 text-slate-800 border-transparent opacity-20 cursor-not-allowed'}`}
                                            >{slot.time}</button>
                                        );
                                    })}
                                </div>
                                {selectedSlotIds.length > 0 && <button onClick={() => setStep('COURT_SELECT')} className={`w-full max-w-sm ${theme.primary} text-white font-black py-4 rounded-xl shadow-xl transition-all uppercase tracking-widest`}>Siguiente: Elegir Cancha</button>}
                            </div>
                        )}

                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in duration-500">
                                <h2 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">3. Seleccioná Cancha</h2>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-6">Disponibles para tu horario</p>
                                <div className="grid grid-cols-1 gap-3 mb-8">
                                    {availableCourtsForSelection.length === 0 ? <p className="text-slate-500 text-sm italic py-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">Sin pistas libres para este bloque.</p> :
                                        availableCourtsForSelection.map(court => (
                                            <button key={court.id} onClick={() => setSelectedCourtId(court.id)} className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${selectedCourtId === court.id ? 'bg-blue-600/20 border-blue-500 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${selectedCourtId === court.id ? 'bg-blue-600' : 'bg-slate-800'}`}><Navigation size={18} className="text-white"/></div>
                                                    <div className="text-left"><span className="text-white font-bold block text-sm">{court.name}</span><span className="text-[10px] text-slate-500 uppercase font-black">{court.type}</span></div>
                                                </div>
                                                <span className="text-white font-black text-sm font-mono tracking-tighter">${(court.basePrice * selectedSlotIds.length).toLocaleString()}</span>
                                            </button>
                                        ))
                                    }
                                </div>
                                <button disabled={!selectedCourtId} onClick={() => setStep('FORM')} className={`w-full max-w-sm ${theme.primary} text-white font-black py-4 rounded-xl disabled:opacity-30 uppercase tracking-widest`}>Siguiente: Datos</button>
                            </div>
                        )}

                        {step === 'FORM' && (
                            <div className="animate-in fade-in duration-500 max-w-md">
                                <h2 className="text-2xl font-black text-white mb-6 uppercase italic tracking-tighter">4. Completá tus datos</h2>
                                <div className="space-y-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">Nombre Completo</label><input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Lionel Messi"/></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-600 uppercase ml-2 tracking-widest">WhatsApp</label><input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="11 1234 5678"/></div>
                                    <div onClick={() => setIsAgreed(!isAgreed)} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl cursor-pointer border border-white/5 hover:bg-white/10 transition-all">
                                        <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isAgreed ? 'bg-blue-600 border-blue-600' : 'border-slate-700'}`}>{isAgreed && <CheckCircle size={16} className="text-white" strokeWidth={3}/>}</div>
                                        <div className="flex-1"><p className="text-[11px] text-white font-black uppercase tracking-tight">Confirmación por WhatsApp</p><p className="text-[9px] text-slate-500 font-medium mt-0.5 leading-tight">Al reservar se abrirá WhatsApp. Debes enviar el mensaje para validar el turno.</p></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER COMPACTO --- */}
                    {step !== 'DATE' && (
                        <div className="bg-slate-950/80 backdrop-blur-md border-t border-white/5 p-6 md:px-10 flex flex-col md:flex-row gap-6 md:items-center justify-between shrink-0">
                            <div className="flex items-center gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mb-0.5">Total a Confirmar</span>
                                    <span className="text-3xl font-black text-white font-mono italic tracking-tighter">${totalPrice.toLocaleString()}</span>
                                </div>
                                {isPromoEligible && (
                                    <div className="bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl flex items-center gap-3 animate-pulse">
                                        <Flame size={16} className="text-orange-500 fill-orange-500"/>
                                        <div className="flex flex-col"><span className="text-[8px] text-orange-400 font-black uppercase leading-none">PROMO</span><span className="text-[10px] text-orange-500 font-bold uppercase tracking-tighter">{config.promoText}</span></div>
                                    </div>
                                )}
                            </div>
                            {step === 'FORM' ? 
                                <button onClick={handleConfirmBooking} disabled={!customerData.name || !customerData.phone || !isAgreed} className="px-12 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl shadow-xl disabled:opacity-20 flex items-center gap-3 transition-all active:scale-95 uppercase tracking-[0.2em] text-sm"><MessageCircle size={20}/> Reservar ahora</button> :
                                <button onClick={() => { if(step==='SLOTS') setStep('COURT_SELECT'); if(step==='COURT_SELECT') setStep('FORM'); }} disabled={selectedSlotIds.length === 0 || (step==='COURT_SELECT' && !selectedCourtId)} className="px-12 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-[0.2em] text-sm flex items-center gap-2">Continuar <ChevronRight size={20}/></button>
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
