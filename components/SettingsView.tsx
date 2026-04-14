import React, { useState } from 'react';
import { ClubConfig, Court, User, Advertisement } from '../types';
import { 
    Settings, LayoutGrid, Activity, Calendar, Users, Megaphone, Flame, 
    Info, CreditCard, Percent, ImageIcon, CheckCircle, Plus, Edit2, Trash2, 
    Eye, EyeOff, X, Upload 
} from 'lucide-react';

interface SettingsViewProps {
    config: ClubConfig;
    courts: Court[];
    users: User[];
    onUpdateConfig: (c: ClubConfig) => void;
    onUpdateCourts: (c: Court[]) => void;
    onUpdateUsers: (u: User[]) => void;
}

// Función auxiliar para redimensionar imágenes y evitar el límite de 1MB de Firestore
const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; // Ancho máximo suficiente para logos y banners
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    // Comprimimos a JPEG con calidad 0.7 para reducir drásticamente el peso
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); 
                } else {
                    resolve(event.target?.result as string);
                }
            };
        };
    });
};

export const SettingsView: React.FC<SettingsViewProps> = ({ config, courts, users, onUpdateConfig, onUpdateCourts, onUpdateUsers }) => {
    const [newCourtName, setNewCourtName] = useState('');
    const [activeTab, setActiveTab] = useState<'general' | 'courts' | 'schedule' | 'users' | 'ads' | 'promos'>('general');
    
    const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
    const [adForm, setAdForm] = useState<Partial<Advertisement>>({ linkUrl: '', imageUrl: '', isActive: true });
    
    const [editingCourt, setEditingCourt] = useState<Court | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState<User>({ id: '', name: '', username: '', password: '', role: 'OPERATOR' });

    // --- HANDLERS ---

    const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const optimized = await processImage(file);
                setAdForm(prev => ({ ...prev, imageUrl: optimized }));
            } catch (error) {
                console.error("Error optimizando imagen de publicidad", error);
            }
        }
    };
    
    const handleSaveAd = () => {
        if (!adForm.imageUrl) return alert("Imagen requerida");
        let updatedAds;
        if (editingAd) updatedAds = config.ads.map(ad => ad.id === editingAd.id ? { ...ad, ...adForm } as Advertisement : ad);
        else updatedAds = [...config.ads, { id: `ad-${Date.now()}`, imageUrl: adForm.imageUrl!, linkUrl: adForm.linkUrl, isActive: true }];
        onUpdateConfig({ ...config, ads: updatedAds });
        setEditingAd(null); 
        setAdForm({ linkUrl: '', imageUrl: '', isActive: true });
    };

    const handleDeleteAd = (id: string) => {
        if(window.confirm('¿Eliminar publicidad?')) {
            onUpdateConfig({ ...config, ads: config.ads.filter(a => a.id !== id) });
            if (editingAd?.id === id) { setEditingAd(null); setAdForm({ linkUrl: '', imageUrl: '', isActive: true }); }
        }
    };

    const toggleAdStatus = (id: string) => {
        onUpdateConfig({ ...config, ads: config.ads.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a) });
    };

    const handleAddCourt = () => { 
        if (!newCourtName.trim()) return; 
        onUpdateCourts([...courts, { 
            id: `c${Date.now()}`, name: newCourtName, type: 'Indoor', 
            surfaceColor: config.courtColorTheme as any, status: 'AVAILABLE', 
            basePrice: 0, isOffer1Active: false, offer1Price: 0, 
            isOffer2Active: false, offer2Price: 0 
        }]); 
        setNewCourtName(''); 
    };

    const handleUpdateCourt = (c: Court) => { 
        onUpdateCourts(courts.map(x => x.id === c.id ? c : x)); 
        setEditingCourt(null); 
    };

    const toggleCourtStatus = (id: string) => 
        onUpdateCourts(courts.map(c => c.id === id ? { ...c, status: c.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE' } as Court : c));

    const handleDeleteCourt = (id: string) => { 
        if (confirm('¿Eliminar cancha?')) onUpdateCourts(courts.filter(c => c.id !== id)); 
    };
    
    const handleSaveUser = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (editingUser) onUpdateUsers(users.map(u => u.id === editingUser.id ? userForm : u)); 
        else onUpdateUsers([...users, { ...userForm, id: `u${Date.now()}` }]); 
        setEditingUser(null); 
        setUserForm({ id: '', name: '', username: '', password: '', role: 'OPERATOR' }); 
    };

    const handleDeleteUser = (id: string) => { 
        if (users.length <= 1) return alert("Debe haber al menos 1 usuario"); 
        if (confirm('¿Eliminar usuario?')) onUpdateUsers(users.filter(u => u.id !== id)); 
    };
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
        const file = e.target.files?.[0]; 
        if (file) { 
            try {
                const optimized = await processImage(file);
                onUpdateConfig({...config, logoUrl: optimized}); 
            } catch (error) {
                alert("Error al procesar el logo.");
            }
        }
    };

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
        const file = e.target.files?.[0]; 
        if (file) { 
            try {
                const optimized = await processImage(file);
                onUpdateConfig({...config, bookingBackgroundImage: optimized}); 
            } catch (error) {
                alert("Error al procesar la imagen de fondo.");
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24 animate-in fade-in">
            {/* Header de Pestañas */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><Settings className="text-blue-400" /> Configuración</h2></div>
                <div className="flex bg-slate-800/50 p-1 rounded-lg border border-white/5 overflow-x-auto max-w-full">
                    {[
                        { id: 'general', label: 'General', icon: LayoutGrid }, 
                        { id: 'courts', label: 'Canchas', icon: Activity }, 
                        { id: 'schedule', label: 'Horarios', icon: Calendar }, 
                        { id: 'users', label: 'Usuarios', icon: Users }, 
                        { id: 'ads', label: 'Publicidad', icon: Megaphone }, 
                        { id: 'promos', label: 'Promos', icon: Flame }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <tab.icon size={16}/> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-2xl border border-white/10 min-h-[500px]">
                
                {/* PESTAÑA: GENERAL */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
                        <div className="space-y-6">
                            <h3 className="text-white font-bold text-lg border-b border-white/10 pb-2 flex items-center gap-2"><Info size={18}/> Datos del Club</h3>
                            <div><label className="block text-slate-400 text-xs font-bold uppercase mb-2">Nombre</label><input type="text" value={config.name} onChange={e => onUpdateConfig({...config, name: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white font-bold"/></div>
                            <div><label className="block text-slate-400 text-xs font-bold uppercase mb-2">WhatsApp Admin</label><input type="tel" value={config.ownerPhone} onChange={e => onUpdateConfig({...config, ownerPhone: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/></div>
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Alias Mercado Pago</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400"><CreditCard size={18}/></div>
                                    <input 
                                        type="text" 
                                        value={config.mpAlias || ''} 
                                        onChange={e => onUpdateConfig({...config, mpAlias: e.target.value})} 
                                        className="w-full bg-slate-800 border border-white/10 rounded-lg py-3 pl-10 text-white uppercase placeholder-slate-600 focus:ring-2 focus:ring-purple-500" 
                                        placeholder="ALIAS.EJEMPLO.MP"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Comisión Mercado Pago (%)</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400"><Percent size={18}/></div>
                                    <input type="number" min="0" value={config.mpFeePercentage || 0} onChange={e => onUpdateConfig({...config, mpFeePercentage: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-white/10 rounded-lg py-3 pl-10 text-white font-mono placeholder-slate-600 focus:ring-2 focus:ring-purple-500"/>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-white font-bold text-lg border-b border-white/10 pb-2 flex items-center gap-2"><ImageIcon size={18}/> Visuales</h3>
                            <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                                    {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-cover"/> : <ImageIcon className="text-slate-600"/>}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-white mb-1">Logo del Club</div>
                                    <label className="inline-block bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-600/30 transition-colors">
                                        Subir Imagen <input type="file" className="hidden" onChange={handleLogoUpload}/>
                                    </label>
                                </div>
                            </div>
                            <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-white/10">
                                    {config.bookingBackgroundImage ? <img src={config.bookingBackgroundImage} className="w-full h-full object-cover"/> : <ImageIcon className="text-slate-600"/>}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-white mb-1">Fondo Reservas</div>
                                    <label className="inline-block bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-600/30 transition-colors">
                                        Subir Imagen <input type="file" className="hidden" onChange={handleBgUpload}/>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Tema de Color</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {(['blue','green','red','yellow'] as const).map((color) => (
                                        <button 
                                            key={color} 
                                            onClick={() => onUpdateConfig({...config, courtColorTheme: color})} 
                                            className={`h-12 rounded-lg border-2 flex items-center justify-center transition-all ${config.courtColorTheme === color ? 'border-white ring-2 ring-white/20' : 'border-transparent opacity-60 hover:opacity-100'} bg-${color === 'yellow' ? 'yellow-500' : color + '-600'}`}
                                        >
                                            {config.courtColorTheme === color && <CheckCircle className="text-white drop-shadow-md" size={20}/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑA: CANCHAS */}
                {activeTab === 'courts' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex gap-2">
                            <input type="text" value={newCourtName} onChange={e => setNewCourtName(e.target.value)} placeholder="Nombre nueva cancha..." className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-blue-500"/>
                            <button onClick={handleAddCourt} disabled={!newCourtName} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold flex items-center gap-2"><Plus size={18}/> Crear</button>
                        </div>
                        <div className="grid gap-4">
                            {courts.map(c => (
                                <div key={c.id} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row items-center gap-4 hover:border-white/20 transition-all">
                                    <div className={`w-2 h-full min-h-[50px] rounded-full ${c.status === 'AVAILABLE' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <h4 className="font-bold text-white text-lg">{c.name}</h4>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-1 text-xs">
                                            <span className="bg-white/10 px-2 py-0.5 rounded text-slate-300">{c.type === 'Indoor' ? 'Techada' : 'Descubierta'}</span>
                                            <span className="text-green-400 font-mono border border-green-500/30 px-2 py-0.5 rounded bg-green-500/10">${c.basePrice}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleCourtStatus(c.id)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${c.status === 'AVAILABLE' ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'}`}>{c.status === 'AVAILABLE' ? 'DISPONIBLE' : 'MANTENIMIENTO'}</button>
                                        <button onClick={() => setEditingCourt(c)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"><Edit2 size={18}/></button>
                                        <button onClick={() => handleDeleteCourt(c.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PESTAÑA: HORARIOS */}
                {activeTab === 'schedule' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
                            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Calendar size={20}/> Grilla de Disponibilidad</h3>
                            <div className="overflow-x-auto pb-4">
                                <div className="min-w-[1000px]">
                                    <div className="flex mb-2">
                                        <div className="w-24 shrink-0"></div>
                                        {Array.from({length: 24}, (_, i) => i).map(h => (
                                            <div key={h} className="flex-1 text-center text-[10px] text-slate-500 font-mono font-bold">{h.toString().padStart(2, '0')}:00</div>
                                        ))}
                                    </div>
                                    {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day, dIndex) => { 
                                        const daySchedule = config.schedule && config.schedule[dIndex] ? config.schedule[dIndex] : Array(24).fill(false); 
                                        return (
                                            <div key={day} className="flex items-center mb-1 gap-1">
                                                <div className="w-24 shrink-0 text-sm font-bold text-slate-300 uppercase tracking-wider">{day}</div>
                                                {Array.from({length: 24}, (_, i) => i).map(h => { 
                                                    const isOpen = daySchedule[h]; 
                                                    return (
                                                        <button 
                                                            key={h} 
                                                            onClick={() => { 
                                                                const newSchedule = config.schedule ? [...config.schedule] : Array(7).fill(null).map(() => Array(24).fill(false)); 
                                                                if (!newSchedule[dIndex]) newSchedule[dIndex] = Array(24).fill(false); 
                                                                newSchedule[dIndex][h] = !newSchedule[dIndex][h]; 
                                                                onUpdateConfig({...config, schedule: newSchedule}); 
                                                            }} 
                                                            className={`flex-1 h-8 rounded-sm transition-all border border-white/5 ${isOpen ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-800/50 hover:bg-slate-700'}`} 
                                                        />
                                                    ); 
                                                })}
                                            </div>
                                        ); 
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑA: USUARIOS */}
                {activeTab === 'users' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold text-lg">Personal Autorizado</h3>
                            <button onClick={() => { setEditingUser(null); setUserForm({ id: `u${Date.now()}`, name: '', username: '', password: '', role: 'OPERATOR' }); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm shadow-lg shadow-blue-600/20"><Plus size={16}/> Crear Usuario</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users.map(u => (
                                <div key={u.id} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${u.role === 'ADMIN' ? 'bg-purple-600' : 'bg-blue-600'}`}>{u.name.charAt(0).toUpperCase()}</div>
                                            <div><h4 className="font-bold text-white leading-tight">{u.name}</h4><p className="text-xs text-slate-400">@{u.username}</p></div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded border border-white/10 text-slate-400">{u.role}</span>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => { setEditingUser(u); setUserForm(u); }} className="flex-1 py-1.5 text-xs font-bold text-blue-300 bg-blue-500/10 rounded">Editar</button>
                                        <button onClick={() => handleDeleteUser(u.id)} className="flex-1 py-1.5 text-xs font-bold text-red-300 bg-red-500/10 rounded">Eliminar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PESTAÑA: PUBLICIDAD */}
                {activeTab === 'ads' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                        <div className="lg:col-span-1 bg-slate-800/50 p-6 rounded-xl border border-white/5 space-y-4 h-fit">
                            <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">{editingAd ? <Edit2 size={18}/> : <Plus size={18}/>} {editingAd ? 'Editar Banner' : 'Nuevo Banner'}</h3>
                            <div><label className="block text-slate-400 text-xs font-bold uppercase mb-1">Enlace URL</label><input type="text" placeholder="https://..." value={adForm.linkUrl || ''} onChange={e => setAdForm({...adForm, linkUrl: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white"/></div>
                            <div>
                                <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Imagen</label>
                                <div className="w-full h-32 bg-slate-900 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center relative overflow-hidden group hover:border-blue-500 transition-colors">
                                    {adForm.imageUrl ? <img src={adForm.imageUrl} className="w-full h-full object-cover" /> : <div className="text-center p-4"><ImageIcon className="mx-auto text-slate-500 mb-2"/><span className="text-xs text-slate-500">Subir Imagen</span></div>}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleAdImageUpload}/>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {editingAd && <button onClick={() => { setEditingAd(null); setAdForm({linkUrl: '', imageUrl: '', isActive: true}); }} className="flex-1 bg-slate-700 text-white p-2 rounded-lg font-bold">Cancelar</button>}
                                <button onClick={handleSaveAd} disabled={!adForm.imageUrl} className="flex-1 bg-blue-600 text-white p-2 rounded-lg font-bold disabled:opacity-50">Guardar</button>
                            </div>
                        </div>
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-slate-800/30 p-4 rounded-xl border border-white/5 flex justify-between items-center"><span className="text-white font-bold">Intervalo de Rotación (seg)</span><input type="number" min="2" value={config.adRotationInterval || 5} onChange={(e) => onUpdateConfig({...config, adRotationInterval: parseInt(e.target.value)})} className="w-16 bg-slate-900 border border-white/10 rounded p-2 text-center text-white"/></div>
                            <div className="space-y-3">
                                {config.ads.map((ad, i) => (
                                    <div key={ad.id} className="bg-slate-800/50 p-3 rounded-xl flex items-center gap-4">
                                        <div className="w-20 h-12 bg-slate-900 rounded overflow-hidden"><img src={ad.imageUrl} className="w-full h-full object-cover"/></div>
                                        <div className="flex-1"><p className="text-white font-bold text-sm">Banner {i+1}</p></div>
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleAdStatus(ad.id)} className={`p-2 rounded ${ad.isActive ? 'text-green-400 bg-green-500/10' : 'text-slate-500 bg-slate-700/50'}`}>{ad.isActive ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                                            <button onClick={() => handleDeleteAd(ad.id)} className="p-2 text-red-400 bg-red-500/10 rounded"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* PESTAÑA: PROMOS */}
                {activeTab === 'promos' && (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 space-y-6">
                            <div className="flex items-center justify-between">
                                <div><h4 className="text-white font-bold text-lg">Promo "Turno Largo" (2hs)</h4><p className="text-xs text-slate-400">Descuento automático al reservar 4 bloques.</p></div>
                                <button onClick={() => onUpdateConfig({...config, promoActive: !config.promoActive})} className={`w-12 h-6 rounded-full transition-colors relative ${config.promoActive ? 'bg-green-500' : 'bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${config.promoActive ? 'left-7' : 'left-1'}`}></div></button>
                            </div>
                            {config.promoActive && (
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div><label className="text-xs text-slate-400 font-bold block mb-1">Precio Fijo</label><input type="number" value={config.promoPrice} onChange={e => onUpdateConfig({...config, promoPrice: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white font-bold text-lg"/></div>
                                    <div><label className="text-xs text-slate-400 font-bold block mb-1">Texto Beneficio</label><input type="text" value={config.promoText} onChange={e => onUpdateConfig({...config, promoText: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white" placeholder="Ej: ¡Gaseosa Gratis!"/></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODALES */}
            {editingCourt && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Editar {editingCourt.name}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs text-slate-400 block mb-1">Nombre</label><input type="text" value={editingCourt.name} onChange={e => setEditingCourt({...editingCourt, name: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/></div>
                                <div><label className="text-xs text-slate-400 block mb-1">Tipo</label><select value={editingCourt.type} onChange={e => setEditingCourt({...editingCourt, type: e.target.value as any})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"><option value="Indoor">Techada</option><option value="Outdoor">Descubierta</option></select></div>
                            </div>
                            <div><label className="text-xs text-slate-400 block mb-1">Precio Base</label><input type="number" value={editingCourt.basePrice} onChange={e => setEditingCourt({...editingCourt, basePrice: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white font-mono font-bold"/></div>
                            <div className="flex gap-3 pt-4"><button onClick={() => setEditingCourt(null)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl">Cancelar</button><button onClick={() => handleUpdateCourt(editingCourt)} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">Guardar</button></div>
                        </div>
                    </div>
                </div>
            )}
            
            {userForm.id && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
                        <button onClick={() => setUserForm({ ...userForm, id: '' })} className="absolute right-4 top-4 text-slate-400 hover:text-white"><X size={20}/></button>
                        <h3 className="text-xl font-bold text-white mb-6">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div><label className="text-xs text-slate-400 block mb-1">Nombre</label><input required type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/></div>
                            <div><label className="text-xs text-slate-400 block mb-1">Usuario (Login)</label><input required type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/></div>
                            <div><label className="text-xs text-slate-400 block mb-1">Contraseña</label><input required type="text" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"/></div>
                            <div><label className="text-xs text-slate-400 block mb-1">Rol</label><select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})} className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white"><option value="OPERATOR">Operador</option><option value="ADMIN">Administrador</option></select></div>
                            <div className="pt-4 flex gap-3"><button type="button" onClick={() => setUserForm({ ...userForm, id: '' })} className="flex-1 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl">Cancelar</button><button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl">Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
