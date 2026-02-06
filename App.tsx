import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { BookingModule } from './components/BookingModule';
import { POSModule } from './components/POSModule';
import { InventoryModule } from './components/InventoryModule';
import { ActivityModule } from './components/ActivityModule';
import { PublicBookingView } from './components/PublicBookingView';
import { CashboxModule } from './components/CashboxModule';
import { ReportsModule } from './components/ReportsModule';
import { SettingsView } from './components/SettingsView';
import { INITIAL_CONFIG, COLOR_THEMES } from './constants';
import { User, Booking, Product, ClubConfig, Court, ActivityLogEntry, BookingStatus, PaymentMethod, CartItem, ActivityType, Expense } from './types';
import { ArrowLeft, LayoutGrid, Lock, Bell, X } from 'lucide-react';
import { 
  subscribeBookings, subscribeCourts, subscribeProducts, subscribeConfig, subscribeUsers, subscribeActivity, subscribeExpenses,
  addBooking, updateBooking, updateBookingStatus, toggleBookingRecurring,
  addProduct, updateProduct, deleteProduct, updateStock,
  updateConfig, updateCourtsList, updateUserList,
  logActivity as logActivityService, seedDatabase,
  addExpense, deleteExpense
} from './services/firestore';

const NOTIFICATION_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; 

const NotificationToast = ({ message, onClose }: { message: string | null, onClose: () => void }) => {
    if (!message) return null;
    return (
        <div className="fixed top-4 right-4 z-[60] bg-blue-600 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-sm border border-white/20 backdrop-blur-md">
            <div className="bg-white/20 p-2 rounded-full"><Bell size={20} className="animate-pulse"/></div>
            <div className="flex-1"><h4 className="font-bold text-sm">Nueva Actividad</h4><p className="text-xs opacity-90">{message}</p></div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={16}/></button>
        </div>
    );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<ClubConfig>(INITIAL_CONFIG);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    seedDatabase();
    const unsubBookings = subscribeBookings(setBookings, handleNewBookingIncoming);
    const unsubCourts = subscribeCourts(setCourts);
    const unsubProducts = subscribeProducts(setProducts);
    const unsubConfig = subscribeConfig(setConfig);
    const unsubUsers = subscribeUsers(setUsers);
    const unsubActivity = subscribeActivity(setActivities);
    const unsubExpenses = subscribeExpenses(setExpenses);
    return () => { unsubBookings(); unsubCourts(); unsubProducts(); unsubConfig(); unsubUsers(); unsubActivity(); unsubExpenses(); };
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const playNotificationSound = () => { try { const audio = new Audio(NOTIFICATION_SOUND); audio.volume = 0.5; audio.play().catch(() => {}); } catch(e) {} };
  const handleNewBookingIncoming = (nb: Booking) => { playNotificationSound(); showToast(`Nueva Reserva: ${nb.customerName}`); };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.username === username && u.password === password);
    if (foundUser) { setUser(foundUser); setLoginError(''); handleLogActivity('SYSTEM', `Inicio sesión: ${foundUser.username}`); } 
    else { setLoginError('Credenciales incorrectas'); }
  };
  const handleLogout = () => { handleLogActivity('SYSTEM', `Cierre sesión: ${user?.username}`); setUser(null); setUsername(''); setPassword(''); setActiveView('dashboard'); setShowLogin(false); };
  
  const handleLogActivity = (type: ActivityType, desc: string, amt?: number, method?: PaymentMethod) => { 
      const l: ActivityLogEntry = { id: Date.now().toString(), type, description: desc, timestamp: new Date().toISOString(), user: user?.username || 'Sistema', amount: amt, method }; 
      logActivityService(l); 
      if (type !== 'SYSTEM') showToast(desc); 
  };
  
  const handleUpdateStatus = async (id: string, s: BookingStatus) => {
      const b = bookings.find(x => x.id === id);
      if (s === BookingStatus.CANCELLED && b?.seriesId) {
          if (window.confirm("¿Deseas eliminar TODA la serie semanal futura?")) {
              const future = bookings.filter(x => x.seriesId === b.seriesId && x.date >= b.date && x.status !== BookingStatus.CANCELLED);
              await Promise.all(future.map(x => updateBookingStatus(x.id, BookingStatus.CANCELLED)));
              handleLogActivity('BOOKING', `Serie cancelada: ${b.customerName}`);
              return;
          }
      }
      updateBookingStatus(id, s);
      handleLogActivity('BOOKING', `Estado: ${s} (${b?.customerName})`);
  };

  const handleUpdateBooking = (b: Booking) => { 
      updateBooking(b); 
      if (b.status === BookingStatus.CONFIRMED && b.paymentMethod) { handleLogActivity('BOOKING', `Cobro: ${b.customerName}`, b.price, b.paymentMethod); }
      else { handleLogActivity('BOOKING', `Modificada: ${b.customerName}`); }
  };

  const handleAddBooking = async (booking: Booking) => { 
      if (booking.isRecurring) {
          const seriesId = `series-${Date.now()}`;
          const start = new Date(booking.date + 'T12:00:00');
          for (let i = 0; i < 8; i++) {
              const next = new Date(start);
              next.setDate(start.getDate() + (i * 7));
              await addBooking({ ...booking, id: `b-${seriesId}-${i}`, date: next.toISOString().split('T')[0], status: BookingStatus.PENDING, seriesId });
          }
          handleLogActivity('BOOKING', `Serie creada (8 semanas): ${booking.customerName}`);
      } else {
          await addBooking(booking);
          handleLogActivity('BOOKING', `Nueva reserva: ${booking.customerName}`);
      }
  };

  const handleProcessSale = (items: CartItem[], total: number, method: PaymentMethod) => { 
      items.forEach(i => { const p = products.find(pr => pr.id === i.id); if(p) updateStock(p.id, p.stock - i.quantity); }); 
      handleLogActivity('SALE', `Venta POS - ${method}`, total, method); 
  };

  const handleAddProduct = (p: Product) => { addProduct(p); handleLogActivity('STOCK', `Nuevo: ${p.name}`); };
  const handleUpdateProduct = (p: Product) => { updateProduct(p); handleLogActivity('STOCK', `Editado: ${p.name}`); };
  const handleDeleteProduct = (id: string) => { deleteProduct(id); handleLogActivity('STOCK', `Eliminado`); };
  const handleUpdateConfig = (c: ClubConfig) => updateConfig(c);
  const handleUpdateCourts = (c: Court[]) => updateCourtsList(c);
  const handleUpdateUsers = (u: User[]) => updateUserList(u);
  const handleAddExpense = (e: Expense) => { addExpense(e); showToast('Gasto registrado'); };
  const handleDeleteExpense = (id: string) => { deleteExpense(id); showToast('Gasto eliminado'); };

  if (!user) {
    const theme = COLOR_THEMES[config.courtColorTheme];
    if (showLogin) {
        return (
            <div className={`min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-50`}></div>
                <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative z-10 backdrop-blur-xl animate-in fade-in">
                    <button onClick={() => setShowLogin(false)} className="absolute top-4 left-4 text-slate-400 hover:text-white flex items-center gap-1 text-xs font-bold"><ArrowLeft size={16}/> Volver</button>
                    <div className="text-center mb-8 mt-4"><div className={`w-16 h-16 ${theme.primary} rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg`}>{config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover rounded-2xl"/> : <LayoutGrid className="text-white h-8 w-8" />}</div><h1 className="text-2xl font-bold text-white">{config.name}</h1><p className="text-slate-400">Acceso Administrativo</p></div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Usuario</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Usuario"/></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Contraseña"/></div>
                        {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
                        <button type="submit" className={`w-full ${theme.primary} text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all`}>Ingresar</button>
                    </form>
                </div>
            </div>
        );
    }
    return <div className="relative h-screen w-full"><PublicBookingView config={config} courts={courts} bookings={bookings} onAddBooking={handleAddBooking} /><button onClick={() => setShowLogin(true)} className="absolute top-4 right-4 z-50 p-2 text-white/10 hover:text-white/50 transition-colors rounded-full"><Lock size={16}/></button></div>;
  }

  return (
    <>
        <NotificationToast message={toast} onClose={() => setToast(null)} />
        <Layout activeView={activeView} onChangeView={setActiveView} config={config} role={user.role} onLogout={handleLogout}>
            {activeView === 'dashboard' && <Dashboard bookings={bookings} products={products} config={config} />}
            {activeView === 'bookings' && <BookingModule bookings={bookings} courts={courts} config={config} onUpdateStatus={handleUpdateStatus} onToggleRecurring={() => {}} onUpdateBooking={handleUpdateBooking} onAddBooking={handleAddBooking} />}
            {activeView === 'pos' && <POSModule products={products} config={config} onProcessSale={handleProcessSale} />}
            {activeView === 'inventory' && <InventoryModule products={products} config={config} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} />}
            {activeView === 'activity' && <ActivityModule activities={activities} config={config} />}
            {activeView === 'cashbox' && <CashboxModule config={config} role={user.role} activities={activities} expenses={expenses} onLogActivity={handleLogActivity} />}
            {activeView === 'reports' && <ReportsModule bookings={bookings} activities={activities} expenses={expenses} onAddExpense={handleAddExpense} onDeleteExpense={handleDeleteExpense} />}
            {activeView === 'settings' && <SettingsView config={config} courts={courts} users={users} onUpdateConfig={handleUpdateConfig} onUpdateCourts={handleUpdateCourts} onUpdateUsers={handleUpdateUsers} />}
            {activeView === 'public' && <PublicBookingView config={config} courts={courts} bookings={bookings} onAddBooking={handleAddBooking} />}
        </Layout>
    </>
  );
};
export default App;
