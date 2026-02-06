import React, { useState, useEffect } from 'react';
import { Clock, Check, X, RefreshCw, Plus, CalendarDays, MapPin, Edit2, Trash2, Banknote, QrCode, CreditCard, Save, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Copy, Share2, User, MessageCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Booking, BookingStatus, ClubConfig, Court, PaymentMethod } from '../types';
import { COLOR_THEMES } from '../constants';
import { createPreference } from '../services/mercadopago';

interface BookingModuleProps {
  bookings: Booking[];
  courts: Court[];
  config: ClubConfig;
  onUpdateStatus: (id: string, status: BookingStatus) => void;
  onToggleRecurring: (id: string) => void;
  onUpdateBooking: (booking: Booking) => void;
  onAddBooking: (booking: Booking) => void;
}

const formatMoney = (amount?: number | null) => {
    return (amount || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

export const BookingModule: React.FC<BookingModuleProps> = ({ bookings, courts, config, onUpdateStatus, onToggleRecurring, onUpdateBooking, onAddBooking }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean, type: PaymentMethod | null, booking: Booking | null }>({ isOpen: false, type: null, booking: null });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const theme = COLOR_THEMES[config.courtColorTheme];

  const dailyBookings = bookings
    .filter(b => b.date === selectedDate && b.status !== BookingStatus.CANCELLED)
    .sort((a, b) => a.time.localeCompare(b.time));

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
          const title = `Reserva Cancha - ${booking.date} ${booking.time}`;
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
      const updated = { ...paymentModal.booking, paymentMethod: paymentModal.type, status: BookingStatus.CONFIRMED };
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 h-full flex flex-col max-w-3xl mx-auto" onClick={() => setActiveDropdownId(null)}>
      
      <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-white/5 w-full sm:w-auto">
             <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronLeft size={20}/></button>
             <div className="flex-1 text-center px-6">
                 <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">Viendo reservas del</div>
                 <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white font-bold text-lg text-center outline-none w-full cursor-pointer appearance-none" />
             </div>
             <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20}/></button>
        </div>
        <button onClick={() => { setEditingBooking(null); setIsFormModalOpen(true); }} className={`${theme.primary} hover:opacity-90 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 w-full sm:w-auto`}>
            <Plus size={20} /> <span>Nuevo Turno</span>
        </button>
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

                  return (
                      <div key={booking.id} onClick={() => setSelectedBooking(booking)} className={`relative rounded-2xl border transition-all cursor-pointer shadow-md bg-slate-800 border-l-4 ${isConfirmed ? 'border-l-green-500' : 'border-l-yellow-500'} border-y-white/5 border-r-white/5 hover:scale-[1.01]`}>
                          <div className="flex items-stretch">
                              <div className="w-20 sm:w-24 bg-slate-900/50 flex flex-col items-center justify-center p-2 border-r border-white/5 rounded-l-2xl">
                                  <span className="text-xl font-bold text-white tracking-tight">{booking.time}</span>
                                  <span className="text-[10px] text-slate-500 mt-1 font-medium">{booking.duration} min</span>
                              </div>
                              <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0">
                                  <h3 className="text-base sm:text-lg font-bold text-white truncate mb-1">{booking.customerName}</h3>
                                  <div className="flex items-center gap-3 text-sm text-slate-400">
                                      <span className="flex items-center gap-1.5 text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md text-xs font-bold uppercase"><MapPin size={10} /> {court?.name || 'Cancha ?'}</span>
                                  </div>
                              </div>
                              <div className="flex flex-col items-end justify-center p-3 gap-2 border-l border-white/5 bg-white/[0.02] min-w-[140px] rounded-r-2xl">
                                  <div className="relative w-full">
                                      <button onClick={(e) => { e.stopPropagation(); setActiveDropdownId(isDropdownActive ? null : booking.id); }} className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between border ${booking.paymentMethod ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-700/30 text-slate-400 border-white/5'}`}>
                                          <div className="flex items-center gap-2 truncate">{getPaymentIcon(booking.paymentMethod)} {booking.paymentMethod || 'Cobrar'}</div><ChevronDown size={12}/>
                                      </button>
                                      {isDropdownActive && (
                                          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[60] p-1 flex flex-col">
                                              <button onClick={(e) => handlePaymentSelect(e, booking, PaymentMethod.CASH)} className="flex items-center gap-2 px-3 py-2.5 text-xs text-green-400 hover:bg-white/5 rounded-lg text-left font-bold border-b border-white/5"><Banknote size={14}/> Efectivo</button>
                                              <button onClick={(e) => handlePaymentSelect(e, booking, PaymentMethod.QR)} className="flex items-center gap-2 px-3 py-2.5 text-xs text-blue-400 hover:bg-white/5 rounded-lg text-left font-bold border-b border-white/5"><QrCode size={14}/> QR Mercado Pago</button>
                                              <button onClick={(e) => handlePaymentSelect(e, booking, PaymentMethod.TRANSFER)} className="flex items-center gap-2 px-3 py-2.5 text-xs text-purple-400 hover:bg-white/5 rounded-lg text-left font-bold border-b border-white/5"><CreditCard size={14}/> Transferencia</button>
                                              <button onClick={(e) => handlePaymentSelect(e, booking, undefined)} className="flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-white/5 rounded-lg text-left font-medium"><X size={14}/> Marcar Impago</button>
                                          </div>
                                      )}
                                  </div>
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 w-full ${isConfirmed ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>{isConfirmed ? <Check size={12}/> : <Clock size={12}/>}{isConfirmed ? 'OK' : 'Pend.'}</span>
                              </div>
                          </div>
                      </div>
                  );
              })
          )}
      </div>

      {isFormModalOpen && (
          <BookingFormModal 
            isOpen={isFormModalOpen} 
            onClose={() => { setIsFormModalOpen(false); setEditingBooking(null); }} 
            courts={courts} 
            onSave={handleFormSave} 
            initialDate={selectedDate} 
            initialTime={'18:00'} 
            editingBooking={editingBooking}
            allBookings={bookings}
          />
      )}

      {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                  <div className="mb-6 border-b border-white/10 pb-4 flex justify-between items-start">
                      <div><h3 className="text-xl font-bold text-white mb-1">Turno #{selectedBooking.id.slice(-4)}</h3><div className="flex items-center gap-2 text-sm text-slate-400"><CalendarDays size={14}/> {selectedBooking.date}<Clock size={14}/> {selectedBooking.time}</div></div>
                      <div className="flex gap-2"><button onClick={() => handleEditClick(selectedBooking)} className="p-2 bg-slate-800 rounded-lg text-blue-400"><Edit2 size={18} /></button><button onClick={() => setSelectedBooking(null)} className="p-2 bg-slate-800 rounded-lg text-slate-400"><X size={18}/></button></div>
                  </div>
                  <div className="space-y-4 mb-6">
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300"><User size={20}/></div>
                          <div><div className="font-bold text-white">{selectedBooking.customerName}</div><div className="text-xs text-slate-400">{selectedBooking.customerPhone || 'Sin teléfono'}</div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5"><span className="text-slate-400 text-xs block mb-1">Cancha</span><span className="text-white font-bold text-sm">{courts.find(c => c.id === selectedBooking.courtId)?.name}</span></div>
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-white/5"><span className="text-slate-400 text-xs block mb-1">Precio</span><span className="font-mono font-bold text-white text-sm">{formatMoney(selectedBooking.price)}</span></div>
                      </div>
                  </div>
                  <div className="space-y-3">
                       {selectedBooking.status === BookingStatus.PENDING && (
                           <button onClick={() => { onUpdateStatus(selectedBooking.id, BookingStatus.CONFIRMED); setSelectedBooking(null); }} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Check size={18}/> Confirmar Turno</button>
                       )}
                       <div className="grid grid-cols-2 gap-2">
                           <button onClick={() => handleNotify(selectedBooking)} className="flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl font-bold text-sm"><MessageCircle size={16}/> WhatsApp</button>
                           <button onClick={() => { onToggleRecurring(selectedBooking.id); setSelectedBooking(null); }} className="flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-xl font-bold text-sm"><RefreshCw size={16}/> {selectedBooking.isRecurring ? 'Quitar Fijo' : 'Hacer Fijo'}</button>
                       </div>
                       <button onClick={() => { if(window.confirm('¿Eliminar esta reserva?')) { onUpdateStatus(selectedBooking.id, BookingStatus.CANCELLED); setSelectedBooking(null); } }} className="w-full bg-red-500/10 text-red-400 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Trash2 size={16}/> Eliminar Reserva</button>
                  </div>
              </div>
          </div>
      )}

      {paymentModal.isOpen && paymentModal.booking && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
              <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                  <button onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })} className="absolute right-4 top-4 text-slate-400 hover:text-white"><X size={20}/></button>
                  <div className="text-center mb-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/5 ${paymentModal.type === PaymentMethod.CASH ? 'bg-green-500/20 text-green-500 border-green-500/30' : paymentModal.type === PaymentMethod.QR ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' : 'bg-purple-500/20 text-purple-500 border-purple-500/30'}`}>
                          {paymentModal.type === PaymentMethod.CASH && <Banknote size={32}/>}
                          {paymentModal.type === PaymentMethod.QR && <QrCode size={32}/>}
                          {paymentModal.type === PaymentMethod.TRANSFER && <CreditCard size={32}/>}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">
                          {paymentModal.type === PaymentMethod.CASH ? 'Pago Efectivo' : paymentModal.type === PaymentMethod.QR ? 'Cobro QR' : 'Transferencia'}
                      </h3>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 mt-4"><p className="text-slate-400 text-sm mb-1">Total a cobrar</p><span className="text-white font-bold text-2xl block">{formatMoney(paymentModal.type === PaymentMethod.QR ? paymentModal.booking.price * (1 + (config.mpFeePercentage || 0) / 100) : paymentModal.booking.price)}</span></div>
                  </div>
                  <button onClick={handleConfirmPayment} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"><CheckCircle size={20}/> Confirmar Cobro Realizado</button>
              </div>
          </div>
      )}
    </div>
  );
};

const BookingFormModal = ({ isOpen, onClose, courts, onSave, initialDate, initialTime, editingBooking, allBookings }: any) => {
    const isEditMode = !!editingBooking;
    const [form, setForm] = useState<Partial<Booking>>(isEditMode ? { ...editingBooking } : { 
        customerName: '', customerPhone: '', date: initialDate, time: initialTime || '18:00', duration: 90, 
        price: 0, courtId: '', status: BookingStatus.PENDING, isRecurring: false, paymentMethod: undefined 
    });

    const checkAvailability = (courtId: string, date: string, time: string, duration: number) => {
        if (!courtId || !date || !time) return true;
        const newStart = new Date(`${date}T${time}`).getTime();
        const newEnd = newStart + duration * 60000;

        return !allBookings.some((b: Booking) => {
            if (b.status === BookingStatus.CANCELLED || b.courtId !== courtId) return false;
            if (isEditMode && b.id === editingBooking.id) return false;
            const bStart = new Date(`${b.date}T${b.time}`).getTime();
            const bEnd = bStart + b.duration * 60000;
            return newStart < bEnd && bStart < newEnd;
        });
    };

    const updatePrice = (courtId: string, duration: number) => {
        const court = courts.find((c: any) => c.id === courtId);
        if (court) {
            const calculated = Math.round((court.basePrice / 90) * duration);
            setForm(prev => ({ ...prev, courtId, duration, price: calculated }));
        } else {
            setForm(prev => ({ ...prev, courtId, duration }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.courtId) return alert("Por favor selecciona una cancha disponible.");
        if (!checkAvailability(form.courtId, form.date!, form.time!, form.duration!)) {
            return alert("⚠️ ERROR: El horario ya no está disponible para esta cancha.");
        }
        onSave({ ...form as Booking, id: isEditMode ? form.id : `b${Date.now()}` }); 
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-lg font-bold text-white">{isEditMode ? 'Editar Turno' : 'Nuevo Turno'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white bg-white/5 p-1 rounded-full"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-slate-400 block mb-1">Fecha</label><input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/></div>
                        <div><label className="text-xs text-slate-400 block mb-1">Hora Inicio</label><input type="time" required value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/></div>
                    </div>
                    
                    <div>
                        <label className="text-xs text-slate-400 block mb-2">Duración</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[30, 60, 90, 120, 150, 180].map(d => (
                                <button key={d} type="button" onClick={() => updatePrice(form.courtId || '', d)} className={`py-2 rounded-lg text-xs font-bold border transition-all ${form.duration === d ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400 hover:border-white/20'}`}>{d} min</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-2">Seleccionar Cancha</label>
                        <div className="space-y-2">
                            {courts.map(c => {
                                const isAvailable = checkAvailability(c.id, form.date!, form.time!, form.duration!);
                                return (
                                    <button key={c.id} type="button" disabled={!isAvailable} onClick={() => updatePrice(c.id, form.duration || 90)} className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${form.courtId === c.id ? 'bg-blue-600/20 border-blue-500 text-white' : isAvailable ? 'bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-700' : 'bg-slate-900 border-transparent text-slate-600 opacity-50 cursor-not-allowed'}`}>
                                        <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div><span className="font-bold text-sm">{c.name}</span></div>
                                        <span className="text-[10px] font-bold uppercase">{isAvailable ? 'Disponible' : 'Ocupada'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <input type="text" required placeholder="Nombre del Cliente" value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/>
                        <input type="tel" placeholder="Teléfono" value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div><label className="text-xs text-slate-400 block mb-1">Precio Final</label><input type="number" required value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white font-mono font-bold"/></div>
                        <div className="flex items-center gap-2 bg-slate-800 p-3 rounded-lg border border-white/10 mt-5"><input type="checkbox" checked={form.isRecurring} onChange={e => setForm({...form, isRecurring: e.target.checked})} className="rounded bg-slate-900 border-white/20"/><span className="text-xs text-slate-300 font-bold uppercase">Semanal</span></div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={20} /> {isEditMode ? 'Guardar Cambios' : 'Crear Turno'}</button>
                </form>
            </div>
        </div>
    );
};
