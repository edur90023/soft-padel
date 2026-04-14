import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, User, Phone, CheckCircle, ArrowLeft, Calendar, 
  Clock, MapPin, MessageCircle, ExternalLink, Moon, Map, X, Flame
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

  // --- LÓGICA DE PRECIO CORREGIDA: Valor cancha * bloques ---
  const calculateTotal = () => {
      if (isPromoEligible && config.promoActive) return config.promoPrice;
      if (!selectedCourtId) return 0;
      const court = courts.find(c => c.id === selectedCourtId);
      if (!court) return 0;
      
      // Como el precio en config es por 30min, solo multiplicamos por la cantidad de slots elegidos
      return court.basePrice * selectedSlotIds.length;
  };

  const totalPrice = calculateTotal();

  const handleConfirmBooking = () => {
      const startSlot = generatedSlots.find(s => s.id === selectedSlotIds[0]);
      if (!startSlot || !selectedCourtId) return;
      onAddBooking({
          id: `web-${Date.now()}`, courtId: selectedCourtId, date: startSlot.realDate,
          time: startSlot.time, duration: selectedSlotIds.length * 30, customerName: customerData.name,
          customerPhone: customerData.phone, status: BookingStatus.PENDING, price: totalPrice, isRecurring: false
      });
      setStep('SUCCESS');
      const msg = `Hola! Reserva en *${config.name}*%0A👤 *Cliente:* ${customerData.name}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time}%0A⏳ *Duración:* ${selectedSlotIds.length * 30} min%0A🏟 *Cancha:* ${courts.find(c => c.id === selectedCourtId)?.name}%0A💰 *Total:* $${totalPrice.toLocaleString()}${isPromoEligible ? `%0A🎁 *PROMO:* ${config.promoText}` : ''}`;
      setTimeout(() => window.open(`https://wa.me/${config.ownerPhone.replace('+', '')}?text=${msg}`, '_blank'), 500);
  };

  const renderAd = () => {
    if (activeAds.length === 0) return null;
    const ad = activeAds[currentAdIndex];
    return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10 mt-auto">
            <img src={ad.imageUrl} className="w-full h-full object-cover" alt="Publicidad"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div className="absolute top-2 right-2 bg-black/50 text-[8px] text-white/70 px-2 py-0.5 rounded-md uppercase font-bold tracking-widest">Publicidad</div>
            {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 bg-blue-600 p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                    <ExternalLink size={14} className="text-white"/>
                </a>
            )}
        </div>
    );
  };

  if (step === 'SUCCESS') {
      return (
          <div className="h-screen flex items-center justify-center p-6 bg-slate-950">
              <div className="max-w-sm w-full bg-slate-900 border border-white/10 p-8 rounded-3xl text-center shadow-2xl">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={32} className="text-green-500" /></div>
                  <h2 className="text-2xl font-bold text-white mb-2">¡Reserva Enviada!</h2>
                  <p className="text-slate-400 mb-8 text-sm">Se abrirá WhatsApp para finalizar la confirmación.</p>
                  <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); }} className="w-full bg-white text-slate-950 font-bold py-3 rounded-xl">Hacer otra reserva</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 relative overflow-hidden font-sans">
        <div className="relative z-10 flex-1 flex flex-col h-full md:p-6 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full max-w-5xl md:max-h-[85vh] bg-slate-900 border border-white/10 md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
                
                {/* SIDEBAR */}
                <div className="hidden md:flex w-72 border-r border-white/5 flex-col p-6 bg-black/20 justify-between shrink-0">
                     <div className="space-y-6">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-slate-800">
                            {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover"/> : <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-bold text-2xl`}>{config.name.charAt(0)}</div>}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white leading-tight mb-1">{config.name}</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> Chilecito, La Rioja</p>
                        </div>
                        <div className="space-y-4 py-4 border-y border-white/5">
                            <div><label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Día</label><div className="text-white font-bold text-sm flex items-center gap-2"><Calendar size={14} className="text-blue-500"/> {selectedDate}</div></div>
                            {selectedSlotIds.length > 0 && <div><label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Duración</label><div className="text-white font-bold text-sm flex items-center gap-2"><Clock size={14} className="text-purple-500"/> {selectedSlotIds.length * 30} min</div></div>}
                            {selectedCourtId && <div><label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Cancha</label><div className="text-white font-bold text-sm flex items-center gap-2"><Map size={14} className="text-green-500"/> {courts.find(c => c.id === selectedCourtId)?.name}</div></div>}
                        </div>
                     </div>
                     {renderAd()}
                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50">
                    <div className="md:hidden p-4 flex items-center justify-between border-b border-white/5 bg-slate-900">
                        {step !== 'DATE' && <button onClick={() => { if(step==='SLOTS') setStep('DATE'); if(step==='COURT_SELECT') setStep('SLOTS'); if(step==='FORM') setStep('COURT_SELECT'); }}><ArrowLeft size={20} className="text-white"/></button>}
                        <h1 className="text-sm font-bold text-white uppercase tracking-widest">{config.name}</h1>
                        <div className="w-5"></div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
                        {step === 'DATE' && (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <h2 className="text-xl font-bold text-white mb-6">Seleccioná la fecha</h2>
                                <div className="bg-slate-800/60 p-1 rounded-2xl border border-white/10 flex items-center justify-between mb-8 max-w-sm">
                                    <button onClick={() => handleDateChange(-1)} className="p-4 text-white hover:bg-white/5 rounded-xl transition-colors"><ChevronLeft/></button>
                                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white font-bold text-lg text-center outline-none cursor-pointer font-mono"/>
                                    <button onClick={() => handleDateChange(1)} className="p-4 text-white hover:bg-white/5 rounded-xl transition-colors"><ChevronRight/></button>
                                </div>
                                <button onClick={() => setStep('SLOTS')} className={`w-full max-w-sm ${theme.primary} text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95`}>Ver Horarios Disponibles</button>
                                <div className="md:hidden mt-10">{renderAd()}</div>
                            </div>
                        )}

                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <h2 className="text-xl font-bold text-white mb-6">Horarios Disponibles</h2>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
                                    {generatedSlots.filter(s => !s.isNextDay).map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button key={slot.id} disabled={!isAvailable} onClick={() => toggleSlotSelection(slot.id)}
                                                className={`h-14 rounded-xl text-sm font-bold border transition-all ${isSelected ? `${theme.primary} border-white/30 text-white scale-105 shadow-lg` : isAvailable ? 'bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-700' : 'bg-slate-950 text-slate-700 border-transparent opacity-20 cursor-not-allowed grayscale'}`}
                                            >{slot.time}</button>
                                        );
                                    })}
                                </div>
                                {selectedSlotIds.length > 0 && <button onClick={() => setStep('COURT_SELECT')} className={`w-full max-w-sm ${theme.primary} text-white font-bold py-4 rounded-xl shadow-xl transition-all`}>Siguiente: Elegir Cancha</button>}
                            </div>
                        )}

                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <h2 className="text-xl font-bold text-white mb-2">Elegí tu Cancha</h2>
                                <p className="text-slate-400 text-xs mb-6 uppercase tracking-widest">Disponibles para tu horario</p>
                                <div className="grid grid-cols-1 gap-3 mb-8">
                                    {availableCourtsForSelection.length === 0 ? <p className="text-slate-500 text-sm italic py-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">No hay canchas 100% libres para este bloque.</p> :
                                        availableCourtsForSelection.map(court => (
                                            <button key={court.id} onClick={() => setSelectedCourtId(court.id)} className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${selectedCourtId === court.id ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${selectedCourtId === court.id ? 'bg-blue-600' : 'bg-slate-800'}`}><MapPin size={20} className="text-white"/></div>
                                                    <div className="text-left"><span className="font-bold block text-base">{court.name}</span><span className="text-[10px] opacity-60 uppercase font-bold tracking-tighter">{court.type}</span></div>
                                                </div>
                                                <span className="font-bold text-lg font-mono">${(court.basePrice * selectedSlotIds.length).toLocaleString()}</span>
                                            </button>
                                        ))
                                    }
                                </div>
                                <button disabled={!selectedCourtId} onClick={() => setStep('FORM')} className={`w-full max-w-sm ${theme.primary} text-white font-bold py-4 rounded-xl disabled:opacity-30 transition-all`}>Siguiente: Mis Datos</button>
                            </div>
                        )}

                        {step === 'FORM' && (
                            <div className="animate-in fade-in slide-in-from-right-4 max-w-md">
                                <h2 className="text-xl font-bold text-white mb-6">Tus Datos</h2>
                                <div className="space-y-4">
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nombre Completo</label><input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Juan Pérez"/></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">WhatsApp</label><input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="11 1234 5678"/></div>
                                    <div onClick={() => setIsAgreed(!isAgreed)} className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer border border-white/5 hover:bg-white/10 transition-all">
                                        <div className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isAgreed ? 'bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'border-slate-600'}`}>{isAgreed && <CheckCircle size={14} className="text-white"/>}</div>
                                        <div className="flex-1"><p className="text-[11px] text-white font-bold uppercase tracking-tight">Confirmación por WhatsApp</p><p className="text-[9px] text-slate-500 leading-tight mt-0.5">Entiendo que debo enviar el mensaje final para validar mi reserva.</p></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    {step !== 'DATE' && (
                        <div className="bg-slate-900/80 backdrop-blur-md border-t border-white/5 p-6 md:px-10 flex flex-col md:flex-row gap-4 md:items-center justify-between shrink-0">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total a pagar</span>
                                    <span className="text-2xl font-bold text-white font-mono">${totalPrice.toLocaleString()}</span>
                                </div>
                                {isPromoEligible && (
                                    <div className="bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse">
                                        <Flame size={14} className="text-orange-500"/>
                                        <span className="text-[10px] text-orange-400 font-bold uppercase tracking-tighter">{config.promoText}</span>
                                    </div>
                                )}
                            </div>
                            {step === 'FORM' ? 
                                <button onClick={handleConfirmBooking} disabled={!customerData.name || !customerData.phone || !isAgreed} className="px-10 py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-20 flex items-center gap-2 transition-all active:scale-95"><MessageCircle size={18}/> Reservar</button> :
                                <button onClick={() => { if(step==='SLOTS') setStep('COURT_SELECT'); if(step==='COURT_SELECT') setStep('FORM'); }} disabled={selectedSlotIds.length === 0 || (step==='COURT_SELECT' && !selectedCourtId)} className="px-10 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95">Siguiente</button>
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
