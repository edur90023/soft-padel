import React, { useState, useMemo, useEffect } from 'react';
import { Booking, ActivityLogEntry, Expense, MonthlySummary } from '../types';
import { DollarSign, TrendingDown, TrendingUp, Wallet, Plus, Trash2, Calendar, FileText, Archive, RefreshCw, Download, FileSpreadsheet, History, AlertTriangle, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { subscribeSummaries, runMaintenance, resetFinancialData } from '../services/firestore';

interface ReportsModuleProps {
    bookings: Booking[];
    activities: ActivityLogEntry[];
    expenses: Expense[];
    onAddExpense: (e: Expense) => void;
    onDeleteExpense: (id: string) => void;
}

const formatMoney = (val: number) => val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export const ReportsModule: React.FC<ReportsModuleProps> = ({ bookings, activities, expenses, onAddExpense, onDeleteExpense }) => {
    // Estado para formulario de gastos
    const [newExpense, setNewExpense] = useState<Partial<Expense>>({
        date: new Date().toISOString().split('T')[0],
        category: 'Varios',
        description: '',
        amount: 0
    });
    
    // Estado para los resúmenes históricos (bóveda mensual)
    const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
    const [isMaintenanceRunning, setIsMaintenanceRunning] = useState(false);
    
    // NUEVO: Estado para la auditoría de cierres
    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

    // Suscribirse a los resúmenes históricos al cargar
    useEffect(() => {
        const unsub = subscribeSummaries(setSummaries);
        return () => unsub();
    }, []);

    // --- LÓGICA DE AUDITORÍA DE CIERRES HISTÓRICOS ---
    const shiftHistory = useMemo(() => {
        return activities
            .filter(act => act.type === 'SHIFT' && act.description.includes('Cierre'))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [activities]);

    const selectedShiftDetails = useMemo(() => {
        if (!selectedShiftId) return null;
        const closeEvent = activities.find(a => a.id === selectedShiftId);
        if (!closeEvent) return null;

        const openEvent = activities
            .filter(a => a.type === 'SHIFT' && a.description.includes('Apertura') && new Date(a.timestamp) < new Date(closeEvent.timestamp))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        if (!openEvent) return null;

        const turnActivity = activities.filter(act => 
            new Date(act.timestamp) >= new Date(openEvent.timestamp) && 
            new Date(act.timestamp) <= new Date(closeEvent.timestamp) &&
            (act.type === 'SALE' || act.type === 'BOOKING')
        );

        const turnExpenses = expenses.filter(e => {
            const expTime = new Date(`${e.date}T12:00:00`).getTime();
            return expTime >= new Date(openEvent.timestamp).getTime() && expTime <= new Date(closeEvent.timestamp).getTime();
        });

        return {
            openTime: openEvent.timestamp,
            closeTime: closeEvent.timestamp,
            income: turnActivity.reduce((acc, curr) => acc + (curr.amount || 0), 0),
            expenses: turnExpenses.reduce((acc, curr) => acc + curr.amount, 0),
            activity: turnActivity,
            expenseList: turnExpenses
        };
    }, [selectedShiftId, activities, expenses]);

    // Ejecutar limpieza manual (Mantenimiento)
    const handleRunMaintenance = async () => {
        if (confirm("Esta acción compactará los registros de actividad de más de 15 días en un resumen mensual para ahorrar espacio en la base de datos. Los detalles individuales antiguos se borrarán, pero el total se mantendrá. ¿Deseas continuar?")) {
            setIsMaintenanceRunning(true);
            await runMaintenance();
            setIsMaintenanceRunning(false);
            alert("Mantenimiento finalizado exitosamente.");
        }
    };

    // NUEVO: Puesta a cero total
    const handleResetFinances = async () => {
        const pass = prompt("ATENCIÓN CRÍTICA: Esta acción borrará TODO el historial financiero (ingresos, gastos y cierres). Los turnos y productos NO se borrarán. Escribe 'BORRAR TODO' para confirmar:");
        if (pass === 'BORRAR TODO') {
            await resetFinancialData();
            alert("Finanzas reiniciadas con éxito.");
        }
    };

    // --- FUNCIÓN: EXPORTAR A CSV (ORIGINAL PRESERVADA) ---
    const handleExportCSV = () => {
        if (bookings.length === 0) return alert("No hay reservas para exportar.");

        const headers = ['ID Reserva', 'Fecha', 'Hora', 'Cancha', 'Cliente', 'Telefono', 'Precio', 'Estado', 'Metodo Pago', 'Fijo'];
        
        const csvRows = [
            headers.join(','), 
            ...bookings.map(b => [
                b.id,
                b.date,
                b.time,
                b.courtId,
                `"${b.customerName}"`, 
                b.customerPhone || 'N/A',
                b.price,
                b.status,
                b.paymentMethod || 'Sin Pago',
                b.isRecurring ? 'Si' : 'No'
            ].join(','))
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reservas_club_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CALCULAR INGRESOS ACTUALES (ORIGINAL PRESERVADA)
    const currentIncome = useMemo(() => {
        return activities.reduce((acc, curr) => {
            if ((curr.type === 'SALE' || curr.type === 'BOOKING') && curr.amount) {
                return acc + curr.amount;
            }
            return acc;
        }, 0);
    }, [activities]);

    const currentExpenses = useMemo(() => {
        return expenses.reduce((acc, curr) => acc + curr.amount, 0);
    }, [expenses]);

    // CALCULAR HISTÓRICO Y TOTALES (ORIGINAL PRESERVADA)
    const historicalIncome = summaries.reduce((acc, s) => acc + s.totalIncome, 0);
    const historicalExpenses = 0; 
    
    const totalGlobalIncome = currentIncome + historicalIncome;
    const totalGlobalExpenses = currentExpenses + historicalExpenses;
    const netIncome = totalGlobalIncome - totalGlobalExpenses;

    const chartData = [
        { name: 'Actual (15d)', Ingresos: currentIncome, Gastos: currentExpenses },
        { name: 'Histórico', Ingresos: historicalIncome, Gastos: historicalExpenses },
        { name: 'Total', Ingresos: totalGlobalIncome, Gastos: totalGlobalExpenses }
    ];

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.amount || !newExpense.description) return;
        
        onAddExpense({
            id: Date.now().toString(),
            date: newExpense.date!,
            category: newExpense.category as any,
            description: newExpense.description!,
            amount: parseFloat(newExpense.amount!.toString())
        });
        
        setNewExpense({ ...newExpense, description: '', amount: 0 });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in pb-24 px-2 sm:px-4">
            
            {/* --- HEADER KPI (ORIGINAL PRESERVADO) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Ingresos Globales */}
                <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider truncate">Ingresos (Global)</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-green-400 mt-1 truncate">{formatMoney(totalGlobalIncome)}</h3>
                        <p className="text-[10px] text-slate-500">Histórico + Actual</p>
                    </div>
                    <div className="bg-green-500/10 p-3 rounded-xl text-green-400 shadow-inner flex-shrink-0">
                        <TrendingUp size={28}/>
                    </div>
                </div>

                {/* Gastos Globales */}
                <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider truncate">Gastos (Global)</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-red-400 mt-1 truncate">{formatMoney(totalGlobalExpenses)}</h3>
                    </div>
                    <div className="bg-red-500/10 p-3 rounded-xl text-red-400 shadow-inner flex-shrink-0">
                        <TrendingDown size={28}/>
                    </div>
                </div>

                {/* Resultado Neto */}
                <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between min-w-0">
                    <div className="min-w-0">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider truncate">Resultado Neto</p>
                        <h3 className={`text-2xl sm:text-3xl font-black mt-1 truncate ${netIncome >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                            {formatMoney(netIncome)}
                        </h3>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400 shadow-inner flex-shrink-0">
                        <Wallet size={28}/>
                    </div>
                </div>
            </div>

            {/* --- BARRA DE HERRAMIENTAS (ORIGINAL + REINICIO) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Exportar */}
                <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500/20 p-2 rounded-lg text-green-400"><FileSpreadsheet size={24}/></div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Reporte de Reservas</h4>
                        </div>
                    </div>
                    <button 
                        onClick={handleExportCSV}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors active:scale-95 whitespace-nowrap"
                    >
                        <Download size={14}/> CSV
                    </button>
                </div>

                {/* Mantenimiento */}
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Archive size={24}/></div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Optimización DB</h4>
                        </div>
                    </div>
                    <button 
                        onClick={handleRunMaintenance}
                        disabled={isMaintenanceRunning}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 active:scale-95 whitespace-nowrap"
                    >
                        <RefreshCw size={14} className={isMaintenanceRunning ? "animate-spin" : ""}/>
                        {isMaintenanceRunning ? "..." : "LIMPIAR"}
                    </button>
                </div>

                {/* Reinicio Financiero */}
                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/20 p-2 rounded-lg text-red-400"><AlertTriangle size={24}/></div>
                        <div>
                            <h4 className="text-white font-bold text-sm uppercase">Puesta a Cero</h4>
                        </div>
                    </div>
                    <button 
                        onClick={handleResetFinances}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 uppercase tracking-tighter"
                    >
                        REINICIAR
                    </button>
                </div>
            </div>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. COLUMNA IZQUIERDA: GASTOS E HISTORIAL */}
                <div className="lg:col-span-1 h-fit space-y-6">
                    {/* Registro de Gastos (Original) */}
                    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
                        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                            <DollarSign size={20} className="text-red-400"/> Registrar Gasto
                        </h3>
                        <form onSubmit={handleAdd} className="space-y-5">
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase block mb-1.5 ml-1">Fecha</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={newExpense.date} 
                                    onChange={e => setNewExpense({...newExpense, date: e.target.value})} 
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase block mb-1.5 ml-1">Categoría</label>
                                <select 
                                    value={newExpense.category} 
                                    onChange={e => setNewExpense({...newExpense, category: e.target.value as any})} 
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                                >
                                    <option>Varios</option>
                                    <option>Sueldos</option>
                                    <option>Servicios</option>
                                    <option>Alquiler</option>
                                    <option>Mantenimiento</option>
                                    <option>Proveedores</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase block mb-1.5 ml-1">Descripción</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Ej: Pago de Luz" 
                                    value={newExpense.description} 
                                    onChange={e => setNewExpense({...newExpense, description: e.target.value})} 
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase block mb-1.5 ml-1">Monto ($)</label>
                                <input 
                                    type="number" 
                                    required 
                                    placeholder="0.00" 
                                    value={newExpense.amount || ''} 
                                    onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} 
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-white font-mono font-bold text-lg focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/20"
                            >
                                <Plus size={20}/> Cargar Gasto
                            </button>
                        </form>
                    </div>

                    {/* NUEVO: Historial de Cierres */}
                    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-tighter">
                            <History size={20} className="text-blue-400"/> Historial de Cierres
                        </h3>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                            {shiftHistory.length === 0 ? <p className="text-slate-500 text-sm italic p-4 text-center">No hay cierres registrados aún.</p> : 
                                shiftHistory.map(shift => (
                                    <button 
                                        key={shift.id} 
                                        onClick={() => setSelectedShiftId(shift.id)} 
                                        className={`w-full text-left p-3 rounded-xl border transition-all ${selectedShiftId === shift.id ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-white">{new Date(shift.timestamp).toLocaleDateString()}</span>
                                            <span className="text-[10px] uppercase font-black opacity-60">Turno {new Date(shift.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <p className="text-[11px] mt-1 text-slate-300 truncate font-mono">{shift.description}</p>
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                </div>

                {/* 2. COLUMNA DERECHA: AUDITORÍA Y GRÁFICOS */}
                <div className="lg:col-span-2 space-y-8 min-w-0">
                    
                    {/* NUEVO: Auditoría de Turno Detallada */}
                    {selectedShiftDetails && (
                        <div className="bg-slate-900/80 border-2 border-blue-500/40 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-blue-500"><History size={120}/></div>
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div>
                                    <h3 className="text-white font-black text-xl flex items-center gap-2 uppercase tracking-tighter leading-none"><FileText className="text-blue-400" size={24}/> Auditoría de Turno</h3>
                                    <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-2">De: {new Date(selectedShiftDetails.openTime).toLocaleString()} | A: {new Date(selectedShiftDetails.closeTime).toLocaleString()}</p>
                                </div>
                                <button onClick={() => setSelectedShiftId(null)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all"><X size={20}/></button>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
                                <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center shadow-inner"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Ingresos</span><p className="text-xl font-black text-green-400 font-mono mt-1">{formatMoney(selectedShiftDetails.income)}</p></div>
                                <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center shadow-inner"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Gastos</span><p className="text-xl font-black text-red-400 font-mono mt-1">-{formatMoney(selectedShiftDetails.expenses)}</p></div>
                                <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center shadow-inner"><span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Neto</span><p className="text-xl font-black text-blue-400 font-mono mt-1">{formatMoney(selectedShiftDetails.income - selectedShiftDetails.expenses)}</p></div>
                            </div>
                            <div className="space-y-4 relative z-10">
                                <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2">Detalle de Gastos en el periodo <div className="h-px bg-white/10 flex-1"></div></h4>
                                <div className="overflow-x-auto max-h-[220px] scrollbar-hide">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-950/50 text-slate-500 uppercase font-black tracking-tighter border-b border-white/5">
                                            <tr><th className="p-3">Descripción</th><th className="p-3">Categoría</th><th className="p-3 text-right">Monto</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {selectedShiftDetails.expenseList.length === 0 ? <tr><td colSpan={3} className="py-8 text-center text-slate-500 italic uppercase font-bold text-[10px]">Sin gastos registrados en el periodo.</td></tr> : 
                                                selectedShiftDetails.expenseList.map(exp => (
                                                    <tr key={exp.id} className="text-slate-300 hover:bg-white/5 transition-colors group">
                                                        <td className="p-3 font-bold group-hover:text-white transition-colors">{exp.description}</td>
                                                        <td className="p-3 text-slate-500 uppercase font-black text-[9px]">{exp.category}</td>
                                                        <td className="p-3 text-right font-mono font-black text-red-400">-{formatMoney(exp.amount)}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gráfico de Balance (Original) */}
                    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `$${val/1000}k`} />
                                <YAxis type="category" dataKey="name" stroke="#94a3b8" width={80} tick={{fill: 'white', fontSize: 11}} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} 
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }} 
                                    formatter={(val: number) => formatMoney(val)}
                                    cursor={{fill: '#ffffff05'}}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Ingresos" fill="#4ade80" radius={[0, 6, 6, 0]} barSize={20} name="Ingresos" />
                                <Bar dataKey="Gastos" fill="#f87171" radius={[0, 6, 6, 0]} barSize={20} name="Gastos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Tabla de Resúmenes Históricos (Original) */}
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-slate-800/30">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Archive size={20} className="text-blue-400"/> Archivo Mensual (Datos Compactados)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-950/50 text-xs uppercase font-bold text-slate-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Mes</th>
                                        <th className="px-6 py-4 text-center">Operaciones</th>
                                        <th className="px-6 py-4 text-right">Ingresos Archivados</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {summaries.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">
                                                No hay meses archivados aún.
                                            </td>
                                        </tr>
                                    ) : (
                                        summaries.map(s => (
                                            <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-bold text-white">{s.monthLabel}</td>
                                                <td className="px-6 py-4 text-center font-mono">{s.operationCount}</td>
                                                <td className="px-6 py-4 text-right font-mono text-green-400">{formatMoney(s.totalIncome)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tabla de Gastos Recientes (Original) */}
                    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-slate-800/30">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <FileText size={20} className="text-slate-400"/> Gastos Recientes (Detalle)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-950/50 text-xs uppercase font-bold text-slate-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Categoría</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4 text-right">Monto</th>
                                        <th className="px-6 py-4 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {expenses.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No hay gastos recientes.</td></tr>
                                    ) : (
                                        expenses.map(exp => (
                                            <tr key={exp.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 font-mono text-slate-400">{exp.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-red-500/10 text-red-300 px-2.5 py-1 rounded-md text-xs font-bold border border-red-500/20">
                                                        {exp.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-white font-medium">{exp.description}</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-red-400">-{formatMoney(exp.amount)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => onDeleteExpense(exp.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
