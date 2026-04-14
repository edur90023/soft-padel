import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, QrCode, AlertTriangle, X, Copy, Share2, CheckCircle, Loader2, Barcode, Clock, LayoutGrid } from 'lucide-react';
import { Product, CartItem, ClubConfig, PaymentMethod, Court, ActiveTab } from '../types';
import { COLOR_THEMES } from '../constants';
import { createCartPreference } from '../services/mercadopago';

interface POSModuleProps {
  products: Product[];
  config: ClubConfig;
  courts: Court[];
  activeTabs: ActiveTab[];
  onProcessSale: (items: CartItem[], total: number, method: PaymentMethod) => void;
  onUpdateActiveTab: (courtId: string, items: CartItem[]) => void;
}

const formatMoney = (amount?: number | null) => {
    return (amount || 0).toLocaleString();
};

export const POSModule: React.FC<POSModuleProps> = ({ products, config, courts, activeTabs, onProcessSale, onUpdateActiveTab }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean, type: PaymentMethod | null }>({ isOpen: false, type: null });
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const theme = COLOR_THEMES[config.courtColorTheme];
  const categories: string[] = ['all', ...Array.from(new Set(products.map((p) => p.category))) as string[]];

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return alert("No hay stock disponible.");
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { alert(`Stock máximo alcanzado (${product.stock})`); return prev; }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        const currentTime = Date.now();
        if (currentTime - lastKeyTime.current > 50) barcodeBuffer.current = '';
        lastKeyTime.current = currentTime;

        if (e.key === 'Enter') {
            if (barcodeBuffer.current.length > 2) {
                const foundProduct = products.find(p => p.barcode === barcodeBuffer.current);
                if (foundProduct) {
                    addToCart(foundProduct);
                    barcodeBuffer.current = '';
                } else {
                    barcodeBuffer.current = '';
                }
            }
        } else if (e.key.length === 1) {
            barcodeBuffer.current += e.key;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.id !== productId));

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const original = products.find(p => p.id === productId);
        const maxStock = original ? original.stock : item.stock;
        const newQty = item.quantity + delta;
        if (delta > 0 && newQty > maxStock) { alert(`No puedes superar el stock (${maxStock})`); return item; }
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalTotal = total + (paymentModal.type === PaymentMethod.QR ? (total * (config.mpFeePercentage || 0) / 100) : 0);

  const filteredProducts = products.filter(p => 
    (selectedCategory === 'all' || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm)))
  );

  const handleSaveToCourt = () => {
      if (!selectedCourtId) return alert("Selecciona una cancha");
      if (cart.length === 0) return alert("El carrito está vacío");
      
      const existingTab = activeTabs.find(t => t.id === selectedCourtId);
      let newItems = [...cart];
      
      if (existingTab) {
          existingTab.items.forEach(oldItem => {
              const index = newItems.findIndex(i => i.id === oldItem.id);
              if (index !== -1) newItems[index].quantity += oldItem.quantity;
              else newItems.push(oldItem);
          });
      }
      
      onUpdateActiveTab(selectedCourtId, newItems);
      setCart([]);
      setSelectedCourtId('');
      alert("Consumos guardados en la cancha.");
  };

  const loadTab = (tab: ActiveTab) => {
      if (cart.length > 0 && !confirm("Se reemplazará el carrito actual con los consumos de la cancha. ¿Continuar?")) return;
      setCart(tab.items);
      setSelectedCourtId(tab.id);
  };

  const handlePaymentClick = async (method: PaymentMethod) => {
      setPaymentModal({ isOpen: true, type: method });
      setQrUrl(null);
      if (method === PaymentMethod.QR) {
          setIsLoadingQr(true);
          const url = await createCartPreference(cart, config.mpFeePercentage || 0);
          setQrUrl(url);
          setIsLoadingQr(false);
      }
  };

  const confirmModalPayment = () => {
      if (paymentModal.type) {
          onProcessSale(cart, finalTotal, paymentModal.type);
          if (selectedCourtId) onUpdateActiveTab(selectedCourtId, []); 
          setCart([]);
          setPaymentModal({ isOpen: false, type: null });
          setSelectedCourtId('');
      }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      
      {/* Catálogo de Productos */}
      <div className="flex-1 flex flex-col bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"/>
                    <Search className="absolute left-3 top-3.5 text-slate-500 h-5 w-5"/>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-400">
                    <Barcode size={20}/><span className="text-xs font-bold uppercase tracking-wider">Escáner Activo</span>
                </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? `${theme.primary} text-white` : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</button>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => {
                    const hasStock = product.stock > 0;
                    return (
                        <div key={product.id} onClick={() => hasStock && addToCart(product)} className={`group bg-slate-800/50 p-3 rounded-xl border border-white/5 flex flex-col transition-all ${hasStock ? 'hover:bg-slate-700/50 hover:border-blue-500/50 cursor-pointer active:scale-95' : 'opacity-50 grayscale cursor-not-allowed border-red-900/30'}`}>
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-slate-900">
                                <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                                {product.stock <= 0 ? (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1"><AlertTriangle size={10}/> AGOTADO</span></div>
                                ) : (
                                    product.stock <= product.minStockAlert && (<span className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">Quedan {product.stock}</span>)
                                )}
                            </div>
                            <h4 className="text-white font-medium text-sm leading-tight mb-1 line-clamp-2 flex-1">{product.name}</h4>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex flex-col">
                                    <span className={`text-[10px] font-bold ${hasStock ? 'text-slate-400' : 'text-red-400'}`}>{hasStock ? `${product.stock} un.` : 'Sin Stock'}</span>
                                </div>
                                <span className="text-yellow-400 font-bold">${formatMoney(product.price)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Panel de Cuentas Abiertas (Barra Inferior) */}
        {activeTabs.length > 0 && (
            <div className="p-4 bg-blue-600/10 border-t border-white/10">
                <h3 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2"><Clock size={14}/> Consumos Pendientes por Cancha</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {activeTabs.map(tab => (
                        <button key={tab.id} onClick={() => loadTab(tab)} className="bg-slate-800 border border-blue-500/30 p-3 rounded-xl flex items-center gap-3 hover:bg-slate-700 transition-all min-w-[160px] shadow-lg">
                            <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><LayoutGrid size={16}/></div>
                            <div className="text-left">
                                <p className="text-white font-bold text-xs truncate">{courts.find(c => c.id === tab.id)?.name || 'Cancha'}</p>
                                <p className="text-blue-400 font-mono text-[10px]">${tab.items.reduce((s,i) => s+(i.price*i.quantity),0).toLocaleString()}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      {/* Sidebar del Carrito */}
      <div className="w-full lg:w-[400px] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-slate-800 font-bold text-xl flex items-center gap-2"><ShoppingCart className="text-slate-600"/> Carrito</h2>
            {cart.length > 0 && <button onClick={() => {setCart([]); setSelectedCourtId('');}} className="text-xs font-bold text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">VACIAR</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40"><Barcode size={48} className="mb-2"/><p className="text-sm font-medium">Escanea o selecciona productos</p></div>
            ) : (
                cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-right-2">
                         <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0"><img src={item.imageUrl} className="w-full h-full object-cover" alt="" /></div>
                         <div className="flex-1 min-w-0"><h4 className="text-slate-800 font-medium text-sm truncate">{item.name}</h4><p className="text-slate-500 text-xs">${formatMoney(item.price * item.quantity)}</p></div>
                         <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                             <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-600"><Minus size={14}/></button>
                             <span className="text-sm font-bold w-4 text-center text-slate-800">{item.quantity}</span>
                             <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-600"><Plus size={14}/></button>
                         </div>
                         <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                    </div>
                ))
            )}
        </div>

        {/* Totales y Asignación */}
        <div className="p-6 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Asignar consumos a cancha</label>
                <div className="flex gap-2">
                    <select value={selectedCourtId} onChange={e => setSelectedCourtId(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Venta inmediata (Bar)</option>
                        {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={handleSaveToCourt} disabled={!selectedCourtId || cart.length === 0} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg disabled:opacity-30 transition-all shadow-md flex items-center justify-center" title="Guardar como pendiente"><Plus size={20}/></button>
                </div>
                {selectedCourtId && <p className="text-[9px] text-blue-600 font-bold mt-2 uppercase">Los productos se guardarán hasta que se cobre el turno.</p>}
            </div>

            <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Total a Pagar</span><span className="text-3xl font-black text-slate-800">${formatMoney(total)}</span></div>
            
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handlePaymentClick(PaymentMethod.CASH)} disabled={cart.length === 0} className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-green-100 bg-green-50 text-green-700 hover:bg-green-100 transition-all disabled:opacity-50"><Banknote size={24} className="mb-1"/><span className="text-xs font-bold">Efectivo</span></button>
                <button onClick={() => handlePaymentClick(PaymentMethod.QR)} disabled={cart.length === 0} className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all disabled:opacity-50"><QrCode size={24} className="mb-1"/><span className="text-xs font-bold">QR MP</span></button>
                <button onClick={() => handlePaymentClick(PaymentMethod.TRANSFER)} disabled={cart.length === 0} className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all disabled:opacity-50"><CreditCard size={24} className="mb-1"/><span className="text-xs font-bold">Transf.</span></button>
            </div>
        </div>
      </div>

      {/* Modal de Pago (Código Original) */}
      {paymentModal.isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
              <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                  <button onClick={() => setPaymentModal({ isOpen: false, type: null })} className="absolute right-4 top-4 text-slate-400 hover:text-white"><X size={20}/></button>
                  <div className="text-center mb-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/5 
                        ${paymentModal.type === PaymentMethod.CASH ? 'bg-green-500/20 text-green-500' : 
                          paymentModal.type === PaymentMethod.QR ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                          {paymentModal.type === PaymentMethod.CASH && <Banknote size={32}/>}
                          {paymentModal.type === PaymentMethod.QR && <QrCode size={32}/>}
                          {paymentModal.type === PaymentMethod.TRANSFER && <CreditCard size={32}/>}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-4">Total: ${formatMoney(finalTotal)}</h3>
                      
                      {paymentModal.type === PaymentMethod.QR && (
                          <div className="bg-white p-4 rounded-xl mb-4 mx-auto w-fit shadow-inner min-h-[200px] flex flex-col items-center justify-center">
                              {isLoadingQr ? <Loader2 className="animate-spin text-blue-500" size={32}/> : qrUrl ? (
                                  <>
                                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`} alt="QR" className="w-44 h-44"/>
                                      <p className="text-black/50 text-[10px] mt-2 font-mono uppercase">Escanea con Mercado Pago</p>
                                  </>
                              ) : <p className="text-red-500 text-xs font-bold">Error generando QR</p>}
                          </div>
                      )}

                      {paymentModal.type === PaymentMethod.TRANSFER && (
                          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-3 mb-6">
                              <p className="text-xs text-slate-500 uppercase font-bold">Alias de Cobro</p>
                              <div className="flex items-center justify-center gap-2">
                                  <span className="text-lg font-mono text-white font-bold">{config.mpAlias || 'SIN ALIAS'}</span>
                                  <button onClick={() => navigator.clipboard.writeText(config.mpAlias || '')} className="text-slate-400 hover:text-white"><Copy size={16}/></button>
                              </div>
                              <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hola! El total es $${finalTotal}. Por favor transferí al alias: ${config.mpAlias}`)}`, '_blank')} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-sm"><Share2 size={16}/> Enviar datos</button>
                          </div>
                      )}
                  </div>
                  <button onClick={confirmModalPayment} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Confirmar Pago Realizado</button>
              </div>
          </div>
      )}
    </div>
  );
};
