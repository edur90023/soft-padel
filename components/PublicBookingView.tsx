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
  MessageCircle, 
  ExternalLink, 
  Moon, 
  Map, 
  LayoutGrid, 
  Star,
  Navigation,
  Plus,
  Smartphone,
  Trophy,
  X,
  Flame,
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
  const [step, setStep] = useState<'DATE' | 'SLOTS' | 'COURT_SELECT' | 'FORM' | 'SUCCESS' | 'GALLERY' | 'RANKING'>('DATE');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]); 
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '' });
  const [isAgreed, setIsAgreed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // --- ESTADO PARA LAS PESTAÑAS DE CATEGORÍA ---
  const [rankingCategory, setRankingCategory] = useState<string>('Todas');

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
          time: startSlot.time, duration: totalDurationMinutes, customerName: customerData.name,
          customerPhone: customerData.phone, status: BookingStatus.PENDING, price: totalPrice, isRecurring: false
      });
      setStep('SUCCESS');
      const msg = `Hola! Reserva en *${config.name}*%0A👤 *Cliente:* ${customerData.name}%0A📅 *Fecha:* ${startSlot.realDate}%0A⏰ *Hora:* ${startSlot.time}%0A⏳ *Duración:* ${totalDurationMinutes} min%0A🏟 *Cancha:* ${court.name}%0A💰 *Total:* $${totalPrice.toLocaleString()}${isPromoEligible ? `%0A🎁 *PROMO:* ${config.promoText}` : ''}`;
      setTimeout(() => window.open(`https://wa.me/${config.ownerPhone.replace('+', '')}?text=${msg}`, '_blank'), 500);
  };

  // --- LÓGICA DE FILTRADO DEL RANKING ---
  const rankingCategories = useMemo(() => {
      const cats = new Set(config.tournamentRanking?.map(p => p.category) || []);
      return ['Todas', ...Array.from(cats).sort()];
  }, [config.tournamentRanking]);

  const filteredRanking = useMemo(() => {
      const players = config.tournamentRanking || [];
      if (rankingCategory === 'Todas') return players.sort((a,b) => b.points - a.points);
      return players.filter(p => p.category === rankingCategory).sort((a,b) => b.points - a.points);
  }, [config.tournamentRanking, rankingCategory]);


  const renderAd = () => {
    if (activeAds.length === 0) return null;
    const ad = activeAds[currentAdIndex];
    return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-white/10 group mt-6 shrink-0 transition-all duration-1000 ease-in-out bg-slate-900">
            <img src={ad.imageUrl} alt="Publicidad" className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xl text-[8px] text-white/80 px-2 py-1 rounded-full border border-white/10 font-black uppercase tracking-widest">Destacado</div>
            {ad.linkUrl && (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 bg-white text-black p-2.5 rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all duration-300">
                    <ExternalLink size={16}/>
                </a>
            )}
        </div>
    );
  };

  const HelpModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rotate-12"><HelpCircle size={150}/></div>
            <button onClick={() => setIsHelpOpen(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"><X size={20}/></button>
            <h3 className="text-3xl font-black text-white mb-6 tracking-tighter uppercase italic leading-none">Guía de <span className="text-blue-500">Reserva</span></h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-2"><div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-500 shadow-md"><Calendar size={20}/></div><p className="text-white font-black uppercase text-xs mt-2">1. Fecha</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Elegí el día en el calendario.</p></div>
                <div className="space-y-2"><div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-500 shadow-md"><Clock size={20}/></div><p className="text-white font-black uppercase text-xs mt-2">2. Horario</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Marcá los bloques de 30 min.</p></div>
                <div className="space-y-2"><div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center text-green-500 shadow-md"><Map size={20}/></div><p className="text-white font-black uppercase text-xs mt-2">3. Cancha</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Seleccioná tu pista preferida.</p></div>
                <div className="space-y-2"><div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center text-orange-500 shadow-md"><Smartphone size={20}/></div><p className="text-white font-black uppercase text-xs mt-2">4. WhatsApp</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Confirmá enviando el mensaje final.</p></div>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="w-full mt-8 bg-white text-slate-950 font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">Entendido</button>
        </div>
    </div>
  );

  if (step === 'SUCCESS') {
      return (
          <div className="h-full flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full animate-pulse"></div>
              <div className="relative z-10 max-w-sm w-full bg-slate-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl text-center animate-in zoom-in-95 duration-700">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                      <CheckCircle size={48} className="text-green-500 animate-in zoom-in spin-in-12 duration-1000" strokeWidth={3} />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">Turno <br/><span className="text-green-500">Enviado</span></h2>
                  <p className="text-slate-400 mb-8 leading-relaxed text-xs font-bold uppercase tracking-widest">Abre WhatsApp para confirmar.</p>
                  <button onClick={() => { setStep('DATE'); setSelectedSlotIds([]); setSelectedCourtId(null); setCustomerData({name:'', phone:''}); setIsAgreed(false); }} className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest shadow-xl active:scale-95 text-xs">Nueva Reserva</button>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden font-sans bg-slate-950 selection:bg-blue-600/40">
        
        {/* FONDO ESMERILADO */}
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000 opacity-80" style={{ backgroundImage: config.bookingBackgroundImage ? `url(${config.bookingBackgroundImage})` : 'none' }}></div>
             <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[10px]"></div>
             <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
             <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col h-full md:p-6 lg:p-8 md:items-center md:justify-center overflow-hidden">
            <div className="flex-1 w-full md:max-w-5xl lg:max-w-6xl md:max-h-[92vh] bg-slate-900/60 border border-white/10 md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden backdrop-blur-2xl transition-all duration-700">
                
                {/* --- SIDEBAR DESKTOP (Ancho ajustado) --- */}
                <div className="hidden md:flex w-64 lg:w-72 border-r border-white/10 flex-col p-6 lg:p-8 bg-black/40 justify-between relative overflow-hidden shrink-0">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                     
                     <div className="flex-1 flex flex-col min-h-0 relative z-10">
                        {/* Logo y Título */}
                        <div className="mb-6 shrink-0">
                            <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden shadow-xl border-2 border-white/10 bg-slate-800 mb-4">
                                {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover" alt="Logo"/> : <div className={`w-full h-full ${theme.primary} flex items-center justify-center text-white font-black text-3xl`}>{config.name.charAt(0)}</div>}
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tighter leading-[0.9] mb-2 uppercase italic drop-shadow-xl break-words">
                                {config.name}
                            </h1>
                            <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-widest text-[9px] bg-blue-500/10 w-fit px-3 py-1.5 rounded-full border border-blue-500/20">
                                <Navigation size={10} className="animate-pulse"/> <span>Sede Principal</span>
                            </div>
                        </div>
                        
                        <div className="space-y-2 py-4 border-t border-white/5 overflow-y-auto pr-2 scrollbar-hide flex-1">
                            <button onClick={() => setStep('DATE')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 transition-all ${['DATE', 'SLOTS', 'COURT_SELECT', 'FORM'].includes(step) ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <Calendar size={18}/> Reservar Turno
                            </button>
                            <button onClick={() => setStep('GALLERY')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 transition-all ${step === 'GALLERY' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <ImageIcon size={18}/> Ver Fotos
                            </button>
                            <button onClick={() => setStep('RANKING')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-3 transition-all ${step === 'RANKING' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                <Trophy size={18}/> Ranking Torneo
                            </button>

                            {['DATE', 'SLOTS', 'COURT_SELECT', 'FORM'].includes(step) && (
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Fecha</label>
                                        <div className="text-white font-bold text-xs flex items-center gap-2"><Calendar size={12} className="text-blue-500"/> {selectedDate}</div>
                                    </div>
                                    {selectedSlotIds.length > 0 && (
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Tiempo</label>
                                            <div className="text-white font-bold text-xs flex items-center gap-2"><Clock size={12} className="text-purple-500"/> {totalDurationMinutes} min</div>
                                        </div>
                                    )}
                                    {selectedCourtId && (
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Cancha</label>
                                            <div className="text-white font-bold text-xs flex items-center gap-2"><Map size={12} className="text-green-500"/> {courts.find(c => c.id === selectedCourtId)?.name}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                     </div>
                     {renderAd()}
                </div>

                {/* --- CONTENIDO PRINCIPAL --- */}
                <div className="flex-1 flex flex-col min-h-0 relative bg-slate-900/20">
                    
                    {/* Header Mobile */}
                    <div className="md:hidden p-4 sm:p-5 flex items-center justify-between shrink-0 relative bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-50">
                        {['DATE', 'GALLERY', 'RANKING'].includes(step) ? (
                            <div className="flex gap-2">
                                <button onClick={() => setStep('GALLERY')} className={`p-2.5 rounded-lg transition-all ${step === 'GALLERY' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}><ImageIcon size={18}/></button>
                                <button onClick={() => setStep('RANKING')} className={`p-2.5 rounded-lg transition-all ${step === 'RANKING' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}><Trophy size={18}/></button>
                            </div>
                        ) : (
                            <button onClick={() => {
                                if (step === 'SLOTS') setStep('DATE');
                                if (step === 'COURT_SELECT') setStep('SLOTS');
                                if (step === 'FORM') setStep('COURT_SELECT');
                            }} className="p-2 rounded-lg bg-white/5 text-white active:scale-90 transition-all border border-white/10 shadow-sm">
                                <ArrowLeft size={18}/>
                            </button>
                        )}
                        <h1 className="text-base font-black text-white text-center uppercase tracking-tighter italic truncate px-2">{config.name}</h1>
                        <button onClick={() => setIsHelpOpen(true)} className="text-slate-400 hover:text-white p-2 transition-all"><HelpCircle size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10 scrollbar-hide relative z-30">
                        
                        {/* STEP 1: DATE (Layout Corregido) */}
                        {step === 'DATE' && (
                            <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 max-w-xl mx-auto">
                                <div className="mb-8">
                                    <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter uppercase italic leading-[0.9] break-words">Reservá tu <span className="text-blue-500">Turno</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] border-l-2 border-blue-600 pl-3">Paso 1: Seleccioná el día</p>
                                </div>

                                {/* CALENDARIO (Solo centrado, sin tarjetas apretadas) */}
                                <div className="bg-slate-800/40 p-4 sm:p-6 rounded-[2rem] border border-white/10 flex items-center justify-between shadow-xl mb-8 backdrop-blur-md">
                                    <button onClick={() => handleDateChange(-1)} className="p-4 sm:p-6 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-all hover:scale-105 active:scale-95"><ChevronLeft size={24}/></button>
                                    <div className="text-center flex-1 min-w-0 px-2">
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2">Calendario</span>
                                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-xl sm:text-3xl font-black text-white text-center w-full outline-none cursor-pointer font-mono"/>
                                    </div>
                                    <button onClick={() => handleDateChange(1)} className="p-4 sm:p-6 bg-white/5 text-white hover:bg-white/10 rounded-2xl transition-all hover:scale-105 active:scale-95"><ChevronRight size={24}/></button>
                                </div>

                                <button onClick={() => setStep('SLOTS')} className={`w-full ${theme.primary} text-white font-black py-5 sm:py-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest text-sm sm:text-base`}>
                                    <Clock size={20} className="animate-pulse"/> Ver Horarios Disponibles
                                </button>
                                <div className="md:hidden mt-8">{renderAd()}</div>
                            </div>
                        )}

                        {/* STEP 2: SLOTS */}
                        {step === 'SLOTS' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-500">
                                <div className="mb-8 border-b border-white/5 pb-6">
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-[0.9] break-words">Elegí tu <span className="text-blue-500">Tiempo</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-3 border-l-2 border-blue-500 pl-3">Paso 2: Marcá los bloques de 30m</p>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 mb-10">
                                    {generatedSlots.map(slot => {
                                        const isAvailable = getFreeCourtsForSlot(slot).length > 0;
                                        const isSelected = selectedSlotIds.includes(slot.id);
                                        return (
                                            <button 
                                                key={slot.id}
                                                disabled={!isAvailable}
                                                onClick={() => toggleSlotSelection(slot.id)}
                                                className={`relative h-16 sm:h-20 w-full rounded-xl text-base sm:text-lg font-black transition-all duration-300 border-2 flex flex-col items-center justify-center ${isSelected ? `${theme.primary} text-white border-white/40 shadow-lg scale-105 z-20` : isAvailable ? 'bg-slate-800/60 text-white border-white/10 hover:bg-slate-700 hover:border-white/30' : 'bg-slate-950/40 text-slate-700 border-transparent opacity-30 cursor-not-allowed grayscale'}`}
                                            >
                                                {slot.time}
                                                {slot.isNextDay && <span className={`text-[7px] uppercase tracking-widest font-black absolute bottom-1.5 ${isSelected ? 'text-white' : 'text-blue-400'}`}>Madrugada</span>}
                                                {isSelected && <div className="absolute -top-2 -right-2 bg-white text-blue-600 rounded-full p-1 shadow-md animate-in zoom-in"><CheckCircle size={16} strokeWidth={4}/></div>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedSlotIds.length > 0 && (
                                    <div className="max-w-sm mx-auto">
                                        <button onClick={() => setStep('COURT_SELECT')} className={`w-full ${theme.primary} text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all text-sm`}>
                                            Siguiente: Cancha <ChevronRight size={20}/>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 3: COURT SELECT */}
                        {step === 'COURT_SELECT' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-500 max-w-2xl mx-auto">
                                <div className="mb-8">
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-[0.9] break-words">Elegí la <span className="text-blue-500">Cancha</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-3 border-l-2 border-blue-500 pl-3">Paso 3: Disponibles para tu horario</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-10">
                                    {availableCourtsForSelection.length === 0 ? (
                                        <div className="text-center py-20 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 backdrop-blur-sm">
                                            <Moon size={48} className="mx-auto mb-4 text-slate-600 animate-pulse"/>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin disponibilidad libre</p>
                                        </div>
                                    ) : (
                                        availableCourtsForSelection.map(court => (
                                            <button 
                                                key={court.id}
                                                onClick={() => setSelectedCourtId(court.id)}
                                                className={`p-5 sm:p-6 rounded-2xl border-2 transition-all flex items-center justify-between group relative overflow-hidden backdrop-blur-md ${selectedCourtId === court.id ? 'bg-blue-600/20 border-blue-500 shadow-lg scale-[1.01]' : 'bg-slate-800/60 border-white/5 hover:bg-slate-800/80 hover:border-white/20'}`}
                                            >
                                                <div className="flex items-center gap-4 sm:gap-6 text-left z-20 min-w-0">
                                                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0 ${selectedCourtId === court.id ? 'bg-blue-600 text-white scale-110 shadow-md' : 'bg-slate-900 text-slate-500 group-hover:bg-slate-800'}`}>
                                                        <Navigation size={24}/>
                                                    </div>
                                                    <div className="min-w-0 pr-2">
                                                        <h4 className="font-black text-white text-xl sm:text-2xl leading-none uppercase italic tracking-tighter mb-2 truncate">{court.name}</h4>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-black/40 px-2 py-1 rounded border border-white/5 w-fit">
                                                                <Star size={10} className="text-yellow-500 fill-yellow-500"/> {court.type}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 z-20 shrink-0">
                                                    <span className="text-lg sm:text-xl font-black text-green-400 font-mono tracking-tighter">${(court.basePrice * selectedSlotIds.length).toLocaleString()}</span>
                                                    {selectedCourtId === court.id ? (
                                                        <div className="bg-blue-500 text-white p-2 sm:p-3 rounded-xl shadow-md animate-in zoom-in">
                                                            <Check size={20} strokeWidth={3}/>
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 border-white/10 flex items-center justify-center text-white/10 group-hover:text-blue-500 transition-colors">
                                                            <Plus size={20}/>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="absolute right-0 bottom-0 translate-y-1/2 translate-x-1/4 opacity-[0.03] group-hover:opacity-[0.06] transition-all duration-1000 pointer-events-none">
                                                    <LayoutGrid size={150}/>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <button 
                                    disabled={!selectedCourtId}
                                    onClick={() => setStep('FORM')} 
                                    className={`w-full max-w-sm mx-auto ${theme.primary} text-white font-black py-5 sm:py-6 rounded-2xl shadow-lg uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-20 transition-all active:scale-95 text-sm sm:text-base`}
                                >
                                    Confirmar Cancha <ChevronRight size={20}/>
                                </button>
                            </div>
                        )}

                        {/* STEP 4: FORM */}
                        {step === 'FORM' && (
                            <div className="animate-in fade-in slide-in-from-right-16 duration-500 flex flex-col h-full max-w-lg mx-auto">
                                <div className="mb-10">
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-[0.9] break-words">Tus <span className="text-blue-600">Datos</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-3 border-l-2 border-blue-500 pl-3">Paso 4: Confirmación final</p>
                                </div>

                                <div className="space-y-6 sm:space-y-8 flex-1">
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block group-focus-within:text-blue-500 transition-colors">Nombre Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-all duration-500" size={20} />
                                            <input type="text" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="w-full bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-2xl py-4 sm:py-5 pl-14 pr-4 text-white text-base sm:text-lg font-bold outline-none focus:border-blue-500 transition-all shadow-inner" placeholder="Ej: Lionel Messi"/>
                                        </div>
                                    </div>

                                    <div className="group">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mb-2 block group-focus-within:text-green-500 transition-colors">WhatsApp Oficial</label>
                                        <div className="relative">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-green-500 transition-all duration-500" size={20} />
                                            <input type="tel" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="w-full bg-slate-800/60 backdrop-blur-md border border-white/10 rounded-2xl py-4 sm:py-5 pl-14 pr-4 text-white text-base sm:text-lg font-bold outline-none focus:border-green-500 transition-all shadow-inner font-mono" placeholder="11 1234 5678"/>
                                        </div>
                                    </div>

                                    <div onClick={() => setIsAgreed(!isAgreed)} className={`p-5 sm:p-6 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer group shadow-md backdrop-blur-md ${isAgreed ? 'bg-blue-600/10 border-blue-500/50' : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60'}`}>
                                        <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isAgreed ? 'bg-blue-600 border-blue-600 shadow-md scale-110' : 'border-slate-600'}`}>
                                            {isAgreed && <Check size={14} className="text-white" strokeWidth={3}/>}
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-sm uppercase italic tracking-tight mb-1">Confirmación por WhatsApp</p>
                                            <p className="text-[10px] text-slate-400 font-medium leading-tight">Al reservar se abrirá WhatsApp. Debo enviar el mensaje para validar el turno.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VIEW: GALERÍA */}
                        {step === 'GALLERY' && (
                            <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 space-y-8 md:space-y-10 pb-20 md:pb-0 max-w-6xl mx-auto">
                                <div className="mb-8 md:mb-12">
                                    <h2 className="text-4xl md:text-5xl font-black text-white mb-2 md:mb-4 tracking-tighter uppercase italic leading-[0.9] break-words">Nuestro <span className="text-blue-500">Club</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] border-l-2 border-blue-600 pl-3">Conoce nuestras instalaciones</p>
                                </div>
                                
                                {config.gallery && config.gallery.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {config.gallery.map((img, i) => (
                                            <div key={i} className="h-64 md:h-72 w-full rounded-3xl overflow-hidden border border-white/10 shadow-xl group relative cursor-pointer bg-slate-900">
                                                <img src={img} alt={`Foto complejo ${i+1}`} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"/>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                    <ImageIcon className="text-white drop-shadow-xl" size={24}/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-slate-800/40 rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center">
                                        <ImageIcon size={48} className="mb-4 text-slate-600 animate-pulse"/>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Próximamente nuevas fotos</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW: RANKING CON TABS DE CATEGORÍA */}
                        {step === 'RANKING' && (
                            <div className="animate-in fade-in slide-in-from-bottom-12 duration-700 space-y-8 md:space-y-10 max-w-4xl mx-auto pb-20 md:pb-0">
                                <div className="mb-6 md:mb-8">
                                    <h2 className="text-4xl md:text-5xl font-black text-white mb-2 md:mb-4 tracking-tighter uppercase italic leading-[0.9] break-words">Ranking <span className="text-yellow-500">Torneo</span></h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] border-l-2 border-yellow-500 pl-3">Tabla de posiciones oficial</p>
                                </div>

                                {/* TABS DE CATEGORÍAS */}
                                {rankingCategories.length > 1 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {rankingCategories.map(cat => (
                                            <button 
                                                key={cat} 
                                                onClick={() => setRankingCategory(cat)}
                                                className={`px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${rankingCategory === cat ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-105' : 'bg-slate-800/80 text-slate-400 border border-white/5 hover:bg-slate-700 hover:text-white'}`}
                                            >
                                                {cat === 'Todas' ? '🏆 Todas' : `Categoría ${cat}`}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-slate-900/60 rounded-3xl border border-white/10 overflow-hidden shadow-xl backdrop-blur-xl">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-white/5">
                                                <tr>
                                                    <th className="p-4 sm:p-6 w-16">Pos.</th>
                                                    <th className="p-4 sm:p-6">Jugador</th>
                                                    <th className="p-4 sm:p-6 text-center hidden sm:table-cell">Partidos</th>
                                                    <th className="p-4 sm:p-6 text-right text-yellow-500">Puntos</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredRanking.length > 0 ? (
                                                    filteredRanking.map((player, i) => (
                                                        <tr key={player.id} className="hover:bg-white/5 transition-all duration-300 group">
                                                            <td className="p-4 sm:p-6">
                                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm sm:text-lg italic shadow-sm ${i === 0 ? 'bg-yellow-500 text-black shadow-yellow-500/30' : i === 1 ? 'bg-slate-300 text-black shadow-slate-300/30' : i === 2 ? 'bg-orange-400 text-black shadow-orange-400/30' : 'bg-slate-800 text-slate-400'}`}>
                                                                    #{i+1}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 sm:p-6 min-w-[120px]">
                                                                <p className="text-white font-black uppercase italic text-sm sm:text-xl mb-1 group-hover:translate-x-1 transition-transform truncate">{player.name}</p>
                                                                <span className="text-[8px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest whitespace-nowrap">Cat. {player.category}</span>
                                                            </td>
                                                            <td className="p-4 sm:p-6 text-center text-slate-400 font-mono font-bold text-sm hidden sm:table-cell">
                                                                {player.matchesPlayed}
                                                            </td>
                                                            <td className="p-4 sm:p-6 text-right">
                                                                <span className="font-black text-yellow-400 text-xl sm:text-3xl font-mono">{player.points}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="p-10 text-center text-slate-500 italic font-bold uppercase text-[9px] tracking-widest">
                                                            Aún no hay jugadores registrados en esta categoría.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-center sm:text-left">
                                    <Trophy className="text-yellow-500 shrink-0" size={32} strokeWidth={1.5}/>
                                    <div>
                                        <p className="text-white font-black text-lg uppercase italic mb-1">Temporada Oficial</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Actualizado semanalmente en base a los resultados verificados.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER DE CONTROL PARA RESERVAS (Tamaño Seguro) --- */}
                    {(['DATE', 'SLOTS', 'COURT_SELECT', 'FORM'] as any).includes(step) && step !== 'DATE' && (
                        <div className="bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 p-5 md:p-8 shrink-0 z-50 shadow-2xl relative">
                            {isPromoEligible && (
                                <div className="mb-4 max-w-sm mx-auto flex items-center justify-center gap-2 text-[9px] font-black text-orange-400 bg-orange-500/10 py-2 rounded-lg border border-orange-500/20 uppercase tracking-widest animate-pulse">
                                    <Flame size={14}/> {config.promoText || 'Promo Activada'} <Flame size={14}/>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
                                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Total a Pagar</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter font-mono">${totalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                                    <div className="flex flex-col items-end sm:items-start hidden sm:flex">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Validación</span>
                                        <div className="flex items-center gap-1 text-slate-400 uppercase font-black text-[9px] tracking-widest">
                                            <Smartphone size={12} className="text-blue-500"/> WhatsApp
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
                                    className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-white transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm shadow-lg ${ (selectedSlotIds.length > 0 && (step !== 'COURT_SELECT' || selectedCourtId) && (step !== 'FORM' || isAgreed)) ? 'bg-green-600 hover:bg-green-500 active:scale-95' : 'bg-slate-800 text-slate-600 border border-white/5 opacity-50' }`}
                                >
                                    {step === 'FORM' ? <><MessageCircle size={18}/> Reservar</> : <>Siguiente <ChevronRight size={18}/></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        {/* BOTÓN FLOTANTE AYUDA */}
        <button onClick={() => setIsHelpOpen(true)} className="fixed bottom-28 sm:bottom-8 right-6 p-3 bg-slate-800 text-blue-400 rounded-full shadow-2xl border border-white/10 hover:bg-slate-700 transition-all active:scale-90 z-[90]"><HelpCircle size={20}/></button>
        
        {isHelpOpen && <HelpModal/>}
    </div>
  );
};
