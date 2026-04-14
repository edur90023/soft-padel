import React, { useState, useEffect } from 'react';
import { Clock, Check, X, RefreshCw, Plus, CalendarDays, MapPin, Edit2, Trash2, Banknote, QrCode, CreditCard, Save, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Copy, Share2, User, MessageCircle, CheckCircle, Loader2, Repeat } from 'lucide-react';
import { Booking, BookingStatus, ClubConfig, Court, PaymentMethod } from '../types';
import { COLOR_THEMES } from '../constants';
import { createPreference } from '../services/mercadopago';

interface BookingModuleProps {
  bookings: Booking[];
  courts: Court[];
  config: ClubConfig;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
  onUpdateBooking: (booking: Booking) => void;
  onAddBooking: (booking: Booking) => void;
}

const formatMoney = (amount?: number | null) => {
    return (amount || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

// --- COMPONENTE PRINCIPAL EXPORTADO ---
export const BookingModule: React.FC<BookingModuleProps> = ({ bookings, courts, config, onUpdateStatus, onUpdateBooking, onAddBooking }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  
  // Estado del Modal de Pago
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean, type: PaymentMethod | null, booking: Booking | null }>({ isOpen: false, type: null, booking: null });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const theme = COLOR_THEMES[config.courtColorTheme];

  const dailyBookings = bookings
    .filter(b => b.date === selectedDate && b.status !== BookingStatus.CANCELLED)
    .sort((a, b) => a.time.localeCompare(b.time));

  // --- LÓGICA DE TURNOS FIJOS ---
  const checkIsLastOfSeries = (booking: Booking) => {
    if (!booking.seriesId) return false;
    const seriesBookings = bookings.filter(b => b.seriesId === booking.seriesId && b.status !== BookingStatus.CANCELLED);
    if (seriesBookings.length === 0) return false;
    const dates = seriesBookings.map(b => new Date(b.date).getTime());
    const maxDate = Math.max(...dates);
    return new Date(booking.date).getTime() === maxDate;
  };

  const handleRenewSeries = (booking: Booking) => {
    if (!window.confirm('¿Deseas programar 8 semanas más para este cliente fijo a partir de la semana siguiente?')) return;
    const nextStartDate = new Date(booking.date + 'T12:00:00');
    nextStartDate.setDate(nextStartDate.getDate() + 7);
    const renewalData: Booking = {
      ...booking,
      id: `b${Date.now()}`,
      date: nextStartDate.toISOString().split('T')[0],
      isRecurring: true,
      status: BookingStatus.PENDING,
      paymentMethod: undefined
    };
    onAddBooking(renewalData);
    setSelectedBooking(null);
    alert('Nueva serie de 8 semanas generada.');
  };

  const handleDateChange = (days: number) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + days);
      setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNotify = (booking: Booking) => {
    const court = courts.find(c => c.id === booking.courtId);
    const message = `Hola *${booking.customerName}*! 👋%0AConfirmamos tu reserva:%0A📅 ${booking.date} a las ${booking.time}hs%0A🏟 ${court?.name || 'Cancha'}%0A💰 ${formatMoney(booking.price)}`;
    let phone = booking.customerPhone?.replace(/[^0-9]/g, '') || '';
    if (!phone) return alert("El cliente no tiene teléfono registrado");
    if (phone.length === 10) phone = '549' + phone;
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleEditClick = (booking: Booking) => {
      setEditingBooking(booking);
      setSelectedBooking(null);
      setIsFormModalOpen(true);
  };

  const openPaymentModal = async (booking: Booking, method: PaymentMethod) => {
      setPaymentModal({ isOpen: true, type: method, booking });
      setQrUrl(null); 
      if (method === PaymentMethod.QR) {
          setIsLoadingQr(true);
          const fee = config.mpFeePercentage || 0;
          const finalPrice = booking.price + (booking.price * fee / 100);
          const title = `Reserva Cancha - ${booking.customerName}`;
          const url = await createPreference(title, finalPrice);
          setQrUrl(url);
          setIsLoadingQr(false);
      }
  };

  const handlePaymentSelect = (e: React.MouseEvent, booking: Booking, method?: PaymentMethod) => {
      e.stopPropagation(); 
      setActiveDropdownId(null); 
      if (!method) {
          onUpdateBooking({ ...booking, paymentMethod: undefined });
          return;
      }
      openPaymentModal(booking, method);
  };

  const handleConfirmPayment = () => {
      if (!paymentModal.booking || !paymentModal.type) return;
      const updated = { 
          ...paymentModal.booking, 
          paymentMethod: paymentModal.type,
          status: BookingStatus.CONFIRMED 
      };
      onUpdateBooking(updated);
      setPaymentModal({ isOpen: false, type: null, booking: null });
  };

  const handleFormSave = (booking: Booking) => {
      if (editingBooking) {
          onUpdateBooking(booking);
      } else {
          onAddBooking(booking);
      }
      setIsFormModalOpen(false);
      setEditingBooking(null);
  };

  const getPaymentIcon = (method?: PaymentMethod) => {
      switch(method) {
          case PaymentMethod.CASH: return <Banknote size={14} />;
          case PaymentMethod.QR: return <QrCode size={14} />;
          case PaymentMethod.TRANSFER: return <CreditCard size={14} />;
          default: return <AlertCircle size={14} />;
      }
  };

  const getFinalPrice = () => {
      if (!paymentModal.booking || !paymentModal.type) return 0;
      const basePrice = paymentModal.booking.price;
      if (paymentModal.type === PaymentMethod.QR) {
          const fee = config.mpFeePercentage || 0;
          return basePrice * (1 + fee / 100);
      }
      return basePrice;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 h-full flex flex-col max-w-3xl mx-auto" onClick={() => setActiveDropdownId(null)}>
      <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-white/5 w-full sm:w-auto">
             <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20}/></button>
             <div className="flex-1 text-center px-6">
                 <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">Viendo reservas del</div>
                 <div className="relative">
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white font-bold text-lg text-center outline-none w-full cursor-pointer appearance-none z-10 relative" />
                 </div>
             </div>
             <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20}/></button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
             <button onClick={() => { setEditingBooking(null); setIsFormModalOpen(true); }} className={`${theme.primary} hover:opacity-90 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95`}>
                <Plus size={20} /> <span>Nuevo Turno</span>
            </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 relative z-0">
          {dailyBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/5">
                  <CalendarDays size={48} className="mb-4 opacity-50"/>
                  <p className="text-lg font-medium">No hay reservas para este día.</p>
                  <button onClick={() => { setEditingBooking(null); setIsFormModalOpen(true); }} className="mt-4 text-blue-400 hover:text-blue-300 font-bold text-sm">+ Crear la primera</button>
              </div>
          ) : (
              dailyBookings.map((booking) => {
                  const court = courts.find(c => c.id === booking.courtId);
                  const isConfirmed = booking.status === BookingStatus.CONFIRMED;
                  const isDropdownActive = activeDropdownId === booking.id;
                  const isLastOfSeries = checkIsLastOfSeries(booking);

                  return (
                      <div key={booking.id} onClick={() => setSelectedBooking(booking)} className={`relative group rounded-2xl border transition-all cursor-pointer shadow-md bg-slate-800 border-l-4 ${isConfirmed ? 'border-l-green-500' : 'border-l-yellow-500'} border-y-white/5 border-r-white/5 ${isDropdownActive ? 'z-50 ring-2 ring-blue-500/50' : 'z-0 hover:scale-[1.01] active:scale-[0.99]'}`}>
                          <div className="flex items-stretch">
                              <div className="w-20 sm:w-24 bg-slate-900/50 flex flex-col items-center justify-center p-2 sm:p-4 border-r border-white/5 rounded-l-2xl">
                                  <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{booking.time}</span>
                                  <span className="text-[10px] sm:text-xs text-slate-500 mt-1 font-medium">{booking.duration} min</span>
                              </div>
                              <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                      <h3 className="text-base sm:text-lg font-bold text-white truncate pr-2 flex items-center gap-2">
                                        {booking.customerName}
                                        {booking.seriesId && <Repeat size={14} className="text-blue-400" />}
                                        {isLastOfSeries && <AlertCircle size={14} className="text-orange-500 animate-pulse" />}
                                      </h3>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-slate-400 mb-1">
                                      <span className="flex items-center gap-1.5 text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide"><MapPin size={10} /> {court?.name || 'Cancha ?'}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 sm:mt-2">
                                      <span className="font-mono text-slate-300 font-bold bg-white/5 px-2 py-0.5 rounded text-xs border border-white/5">{formatMoney(booking.price)}</span>
                                  </div>
                              </div>
                              <div className="flex flex-col items-end justify-center p-3 sm:p-4 gap-2 border-l border-white/5 bg-white/[0.02] min-w-[140px] rounded-r-2xl relative">
                                  <div className="relative w-full">
                                      <button onClick={(e) => { e.stopPropagation(); setActiveDropdownId(isDropdownActive ? null : booking.id); }} className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between gap-1 transition-colors border ${booking.paymentMethod ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' : 'bg-slate-700/30 text-slate-400 border-white/5 hover:bg-slate-700/50'}`}>
                                          <div className="flex items-center gap-2 truncate">{getPaymentIcon(booking.paymentMethod)}<span className="truncate">{booking.paymentMethod || 'Cobrar'}</span></div><ChevronDown size={12} className={`transition-transform duration-200 ${isDropdownActive ? 'rotate-180' : ''}`}/>
                                      </button>
                                      {isDropdownActive && (
                                          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[60] overflow-hidden flex flex-col p-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                              <button onClick={(e) => handlePaymentSelect(e, booking, PaymentMethod.CASH)} className="flex items-center gap-2 px-3 py-2.5 text-xs text-green-400 hover:bg-white/5 rounded-lg transition-colors text-left font-bold border-b border-white/5"><Banknote size={14}/> Efectivo</button>
                                              <button onClick={(e) => handlePaymentSelect(e, booking, PaymentMethod.QR)} className="flex items-center gap-2 px-3 py-2.5 text-xs text-blue-400 hover:bg-white/5 rounded-lg transition-colors text-left font-bold border-b border-white/5"><QrCode size={14}/> QR Mercado Pago</button>
                                              <button onClick={(e) => handlePaymentSelect(e, booking, PaymentMethod.TRANSFER)} className="flex items-center gap-2 px-3 py-2.5 text-xs text-purple-400 hover:bg-white/5 rounded-lg transition-colors text-left font-bold border-b border-white/5"><CreditCard size={14}/> Transferencia</button>
                                              <button onClick={(e) => handlePaymentSelect(e, booking, undefined)} className="flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-white/5 rounded-lg transition-colors text-left font-medium"><X size={14}/> Marcar Impago</button>
                                          </div>
                                      )}
                                  </div>
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 w-full text-center ${isConfirmed ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{isConfirmed ? <Check size={12}/> : <Clock size={12}/>}{isConfirmed ? 'OK' : 'Pend.'}</span>
                              </div>
                          </div>
                      </div>
                  );
              })
          )}
      </div>

      {isFormModalOpen && (
          <BookingFormModal isOpen={isFormModalOpen} onClose={() => { setIsFormModalOpen(false); setEditingBooking(null); }} courts={courts} onSave={handleFormSave} initialDate={selectedDate} allBookings={bookings} editingBooking={editingBooking} />
      )}

      {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative overflow-hidden">
                  {selectedBooking.seriesId && checkIsLastOfSeries(selectedBooking) && (
                    <div className="absolute top-0 left-0 right-0 bg-orange-600 p-2 flex justify-between items-center px-4">
                        <span className="text-[10px] font-black text-white flex items-center gap-1"><AlertCircle size={12}/> ¡ÚLTIMO TURNO DE LA SERIE!</span>
                        <button onClick={() => handleRenewSeries(selectedBooking)} className="bg-white text-orange-600 px-2 py-0.5 rounded text-[10px] font-black hover:bg-slate-100 transition-colors">RENOVAR 8 SEMANAS</button>
                    </div>
                  )}
                  <div className={`mb-6 border-b border-white/10 pb-4 ${selectedBooking.seriesId && checkIsLastOfSeries(selectedBooking) ? 'mt-6' : ''}`}>
                      <div className="flex justify-between items-start">
                          <div><h3 className="text-xl font-bold text-white mb-1">Detalle del Turno</h3><div className="flex items-center gap-2 text-sm text-slate-400"><CalendarDays size={14}/> {selectedBooking.date}<Clock size={14}/> {selectedBooking.time}</div></div>
                          <div className="flex gap-2"><button onClick={() => handleEditClick(selectedBooking)} className="p-2 bg-slate-800 rounded-lg text-blue-400 hover:bg-slate-700 hover:text-white transition-colors"><Edit2 size={18} /></button><button onClick={() => setSelectedBooking(null)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"><X size={18}/></button></div>
                      </div>
                      <div className="mt-3 text-sm text-blue-400 font-bold flex items-center gap-1"><MapPin size={14}/> {courts.find(c => c.id === selectedBooking.courtId)?.name}</div>
                  </div>
                  <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-white/5">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300"><User size={20}/></div>
                          <div><div className="font-bold text-white">{selectedBooking.customerName}</div><div className="text-xs text-slate-400">{selectedBooking.customerPhone || 'Sin teléfono'}</div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5"><span className="text-slate-400 text-xs block mb-1">Estado</span><span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${selectedBooking.status === BookingStatus.CONFIRMED ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{selectedBooking.status}</span></div>
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5"><span className="text-slate-400 text-xs block mb-1">Precio</span><span className="font-mono font-bold text-white text-sm">{formatMoney(selectedBooking.price)}</span></div>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5 flex items-center justify-between"><span className="text-slate-400 text-xs">Pago con</span><span className="text-sm font-bold text-white flex items-center gap-2">{getPaymentIcon(selectedBooking.paymentMethod)} {selectedBooking.paymentMethod || 'No registrado'}</span></div>
                  </div>
                  <div className="space-y-3">
                       {selectedBooking.status === BookingStatus.PENDING && (
                           <button onClick={() => { onUpdateStatus(selectedBooking.id, BookingStatus.CONFIRMED); setSelectedBooking(null); }} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"><Check size={18}/> Confirmar Turno</button>
                       )}
                       <div className="grid grid-cols-2 gap-2">
                           <button onClick={() => handleNotify(selectedBooking)} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm border border-white/5"><MessageCircle size={16}/> WhatsApp</button>
                           {!selectedBooking.seriesId && (
                               <button onClick={() => { onUpdateBooking({...selectedBooking, isRecurring: true}); setSelectedBooking(null); }} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm border border-white/5"><RefreshCw size={16}/> Hacer Fijo</button>
                           )}
                       </div>
                       <button onClick={() => { onUpdateStatus(selectedBooking.id, BookingStatus.CANCELLED); setSelectedBooking(null); }} className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Trash2 size={16}/> {selectedBooking.seriesId ? 'Eliminar Turno / Serie' : 'Eliminar Reserva'}</button>
                  </div>
              </div>
          </div>
      )}

      {paymentModal.isOpen && paymentModal.booking && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
              <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                  <button onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })} className="absolute right-4 top-4 text-slate-400 hover:text-white"><X size={20}/></button>
                  <div className="text-center mb-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-4 
                        ${paymentModal.type === PaymentMethod.CASH ? 'bg-green-500/20 text-green-500 border-green-500/30' : 
                          paymentModal.type === PaymentMethod.QR ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' : 
                          'bg-purple-500/20 text-purple-500 border-purple-500/30'}`}>
                          {paymentModal.type === PaymentMethod.CASH && <Banknote size={32}/>}
                          {paymentModal.type === PaymentMethod.QR && <QrCode size={32}/>}
                          {paymentModal.type === PaymentMethod.TRANSFER && <CreditCard size={32}/>}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">Pago {paymentModal.type}</h3>
                      {paymentModal.type === PaymentMethod.QR && (config.mpFeePercentage || 0) > 0 && (<div className="text-xs text-orange-400 mb-2 font-bold bg-orange-500/10 px-2 py-1 rounded inline-block border border-orange-500/20">Recargo: {config.mpFeePercentage}% aplicado</div>)}
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 mt-4"><p className="text-slate-400 text-sm mb-1">Total a cobrar</p><span className="text-white font-bold text-2xl block">{formatMoney(getFinalPrice())}</span></div>
                  </div>
                  {paymentModal.type === PaymentMethod.QR && (
                      <div className="bg-white p-4 rounded-xl mb-6 mx-auto w-fit shadow-inner min-h-[230px] flex flex-col items-center justify-center">
                          {isLoadingQr ? (
                              <div className="flex flex-col items-center animate-pulse">
                                  <Loader2 className="animate-spin text-blue-500 mb-2" size={32}/>
                                  <span className="text-xs text-slate-500 font-bold">Generando QR...</span>
                              </div>
                          ) : qrUrl ? (
                              <>
                                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="QR" className="w-48 h-48 object-contain" />
                                  <p className="text-black/50 text-[10px] text-center mt-2 font-mono">Escanea con Mercado Pago</p>
                              </>
                          ) : (
                              <p className="text-red-500 text-xs font-bold text-center p-4">Error al conectar con MP.</p>
                          )}
                      </div>
                  )}
                  {paymentModal.type === PaymentMethod.TRANSFER && (
                      <div className="space-y-4 mb-6">
                          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Alias / CBU</p>
                              <div className="flex items-center justify-center gap-2">
                                  <span className="text-xl font-mono text-white font-bold select-all">{config.mpAlias || 'SIN ALIAS'}</span>
                                  <button onClick={() => navigator.clipboard.writeText(config.mpAlias || '')} className="text-slate-400 hover:text-white p-1" title="Copiar"><Copy size={14}/></button>
                              </div>
                          </div>
                          <button onClick={() => {
                              const text = `Hola! Para confirmar tu turno de ${formatMoney(getFinalPrice())}, por favor transferí al alias: *${config.mpAlias}*`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                          }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-tighter text-sm shadow-lg shadow-green-900/20"><Share2 size={18}/> Compartir por WhatsApp</button>
                      </div>
                  )}
                  <button onClick={handleConfirmPayment} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">Confirmar Pago Realizado</button>
              </div>
          </div>
      )}
    </div>
  );
};

// --- COMPONENTE INTERNO: MODAL DE FORMULARIO ---
const BookingFormModal = ({ isOpen, onClose, courts, onSave, initialDate, allBookings, editingBooking }: any) => {
    const isEditMode = !!editingBooking;
    const [form, setForm] = useState<Partial<Booking>>(isEditMode ? { ...editingBooking } : { 
        customerName: '', customerPhone: '', date: initialDate, time: '18:00', duration: 90, 
        price: 0, courtId: '', status: BookingStatus.PENDING, isRecurring: false 
    });

    const checkAvailability = (courtId: string, d: string, t: string, dur: number) => {
        if (!courtId || !d || !t) return true;
        const newStart = new Date(`${d}T${t}`).getTime();
        const newEnd = newStart + dur * 60000;
        return !allBookings.some((b: Booking) => 
            b.courtId === courtId && b.status !== BookingStatus.CANCELLED && 
            (isEditMode ? b.id !== editingBooking.id : true) &&
            new Date(`${b.date}T${b.time}`).getTime() < newEnd && 
            new Date(`${b.date}T${b.time}`).getTime() + b.duration * 60000 > newStart
        );
    };

    const updateData = (cid: string, dur: number) => {
        const c = courts.find((x: Court) => x.id === cid);
        setForm(prev => ({ 
            ...prev, 
            courtId: cid, 
            duration: dur, 
            price: c ? Math.round((c.basePrice / 90) * dur) : 0 
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.courtId) return alert("Selecciona una cancha disponible");
        if (!checkAvailability(form.courtId, form.date!, form.time!, form.duration!)) {
            return alert("⚠️ ERROR: El horario ya no está disponible.");
        }
        const finalBooking = {
            ...form as Booking,
            id: isEditMode ? form.id : `b${Date.now()}`,
            status: form.isRecurring ? BookingStatus.PENDING : (form.status || BookingStatus.PENDING)
        };
        onSave(finalBooking); 
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-lg font-bold text-white">{isEditMode ? 'Editar Turno' : 'Nueva Reserva Manual'}</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold">Fecha</label><input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-slate-800 border-white/10 rounded-lg p-2 text-white text-sm"/></div>
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold">Hora Inicio</label><input type="time" required value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-slate-800 border-white/10 rounded-lg p-2 text-white text-sm"/></div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block">Duración</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[30, 60, 90, 120, 150, 180].map(d => (
                                <button key={d} type="button" onClick={() => updateData(form.courtId || '', d)} className={`py-2 rounded-lg text-xs font-bold border transition-all ${form.duration === d ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400'}`}>{d} min</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 block">Canchas Disponibles</label>
                        <div className="space-y-2">
                            {courts.map((c: Court) => {
                                const ok = checkAvailability(c.id, form.date!, form.time!, form.duration!);
                                return (
                                    <button key={c.id} type="button" disabled={!ok} onClick={() => updateData(c.id, form.duration!)} className={`w-full p-3 rounded-xl border flex justify-between items-center transition-all ${form.courtId === c.id ? 'border-blue-500 bg-blue-600/10 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]' : ok ? 'border-white/5 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'opacity-20 grayscale cursor-not-allowed'}`}>
                                        <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}></div><span className="text-sm font-bold">{c.name}</span></div>
                                        <span className="text-[9px] font-bold uppercase">{ok ? 'Libre' : 'Ocupada'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-3 pt-2">
                        <input required placeholder="Nombre del Cliente" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full bg-slate-800 border-white/10 rounded-lg p-3 text-white text-sm"/>
                        <input placeholder="Teléfono (WhatsApp)" value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} className="w-full bg-slate-800 border-white/10 rounded-lg p-3 text-white text-sm"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div><label className="text-[10px] text-slate-500 uppercase font-bold">Precio Final</label><input type="number" required value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} className="w-full bg-slate-800 border-white/10 rounded-lg p-3 text-white font-mono font-bold"/></div>
                        <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-lg border border-white/10 h-[50px] cursor-pointer"><input type="checkbox" id="rec" checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} className="rounded"/><label htmlFor="rec" className="text-[10px] text-slate-300 font-bold uppercase cursor-pointer">Fijo (8 Semanas)</label></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                        <Save size={20} /> {isEditMode ? 'Guardar Cambios' : 'Crear Turno'}
                    </button>
                </form>
            </div>
        </div>
    );
};
