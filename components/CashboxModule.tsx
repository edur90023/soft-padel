import React, { useState, useMemo } from 'react';
import { ClubConfig, ActivityLogEntry, ActivityType, PaymentMethod, Expense } from '../types';
import { DollarSign, Lock, Unlock, TrendingUp, Calendar, CreditCard, Banknote, QrCode, ArrowDownCircle, ArrowUpCircle, FileText, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { COLOR_THEMES } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CashboxModuleProps {
    config: ClubConfig;
    role: string;
    activities: ActivityLogEntry[];
    expenses: Expense[];
    onLogActivity: (type: ActivityType, description: string, amount?: number, method?: PaymentMethod) => void;
}

const formatMoney = (val: number) => val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export const CashboxModule: React.FC<CashboxModuleProps> = ({ config, role, activities = [], expenses = [], onLogActivity }) => {
    const [amountInput, setAmountInput] = useState<string>('');
    const theme = COLOR_THEMES[config.courtColorTheme];

    // 1. DETERMINAR ESTADO DE CAJA BASADO EN EL HISTORIAL (Persistencia)
    const lastShiftEvent = useMemo(() => {
        return [...activities]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .find(act => act.type === 'SHIFT');
    }, [activities]);

    const isBoxOpen = lastShiftEvent?.description.includes('Apertura');
    const boxOpenTimestamp = isBoxOpen ? lastShiftEvent?.timestamp : null;

    // 2. FILTRAR ACTIVIDAD DESDE LA APERTURA (Incluyendo la apertura misma)
    const turnActivity = useMemo(() => {
        if (!isBoxOpen || !boxOpenTimestamp) return [];
        return activities.filter(act => 
            new Date(act.timestamp) >= new Date(boxOpenTimestamp) && 
            (act.type === 'SALE' || act.type === 'BOOKING' || act.type === 'SHIFT')
        );
    }, [activities, isBoxOpen, boxOpenTimestamp]);

    // 3. FILTRAR GASTOS DESDE LA APERTURA
    const turnExpenses = useMemo(() => {
        if (!isBoxOpen || !boxOpenTimestamp || role !== 'ADMIN') return [];
        return expenses.filter(exp => new Date(`${exp.date}T12:00:00`) >= new Date(boxOpenTimestamp));
    }, [expenses, boxOpenTimestamp, isBoxOpen, role]);

    // 4. CÁLCULO DE TOTALES POR MÉTODO (Solo ventas y reservas)
    const incomeByMethod = useMemo(() => {
        const data = [
            { name: 'Efectivo', value: 0, color: '#22c55e', method: PaymentMethod.CASH },
            { name: 'QR MP', value: 0, color: '#3b82f6', method: PaymentMethod.QR },
            { name: 'Transferencia', value: 0, color: '#a855f7', method: PaymentMethod.TRANSFER },
        ];
        turnActivity.forEach(act => {
            if (act.amount && act.method && (act.type === 'SALE' || act.type === 'BOOKING')) {
                const idx = data.findIndex(d => d.method === act.method);
                if (idx !== -1) data[idx].value += act.amount;
            }
        });
        return data;
    }, [turnActivity]);

    const totalIncome = incomeByMethod.reduce((acc, curr) => acc + curr.value, 0);
    const totalExpensesAmount = turnExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const turnBalance = totalIncome - totalExpensesAmount;

    // LÍNEA DE TIEMPO COMBINADA PARA EL LISTADO
    const timeline = useMemo(() => {
        const events = [
            ...turnActivity.map(e => ({
                id: e.id,
                time: e.timestamp,
                type: e.type === 'SHIFT' ? 'SYSTEM' : 'INCOME',
                category: e.type === 'SHIFT' ? 'CAJA' : e.type,
                description: e.description,
                amount: e.amount || 0,
                method: e.method,
                user: e.user
            })),
            ...turnExpenses.map(e => ({
                id: e.id,
                time: `${e.date}T12:00:00`,
                type: 'EXPENSE',
                category: e.category,
                description: e.description,
                amount: e.amount,
                method: null,
                user: 'Admin'
            }))
        ];
        return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }, [turnActivity, turnExpenses]);

    const handleAction = () => {
        if (!amountInput) return;
        const val = parseFloat(amountInput);
        if (isBoxOpen) {
            onLogActivity('SHIFT', `Cierre de Caja. Monto Final Declarado: $${val}. Sistema: $${totalIncome}`, val);
        } else {
            onLogActivity('SHIFT', `Apertura de Caja. Monto Inicial: $${val}`, val);
        }
        setAmountInput('');
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleString('es-AR');
        doc.setFontSize(20);
        doc.text(`Cierre de Caja - ${config.name}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Desde: ${new Date(boxOpenTimestamp!).toLocaleString()} hasta ${dateStr}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: [['Concepto', 'Monto']],
            body: [
                ['Total Ingresos (Turno)', formatMoney(totalIncome)],
                ['Total Gastos (Turno)', formatMoney(totalExpensesAmount)],
                ['Balance Neto', formatMoney(turnBalance)]
            ],
        });

        doc.save(`Cierre_Caja_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CONTROL DE CAJA */}
                <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center justify-center text-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg border-4 transition-all duration-500
                        ${isBoxOpen ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {isBoxOpen ? <Unlock size={40} /> : <Lock size={40} />}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">{isBoxOpen ? 'Caja Abierta' : 'Caja Cerrada'}</h2>
                    {isBoxOpen && <p className="text-[10px] text-slate-500 uppercase font-bold">Abierta desde: {new Date(boxOpenTimestamp!).toLocaleTimeString()}</p>}
                    
                    <div className="w-full max-w-xs space-y-3 mt-6">
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                            <input 
                                type="number" 
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                placeholder={isBoxOpen ? "Monto de Cierre" : "Monto de Apertura"}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl py-2.5 pl-10 text-white font-mono"
                            />
                        </div>
                        <button 
                            onClick={handleAction} 
                            disabled={!amountInput} 
                            className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 ${isBoxOpen ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                        >
                            {isBoxOpen ? 'CERRAR TURNO' : 'ABRIR TURNO'}
                        </button>
                    </div>
                </div>

                {/* VENTAS DEL TURNO */}
                <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><TrendingUp size={20} className="text-blue-400"/> Ventas del Turno Actual</h3>
                            <p className="text-xs text-slate-500">Solo actividad desde la última apertura</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-mono font-bold text-green-400">{formatMoney(totalIncome)}</div>
                            {totalExpensesAmount > 0 && <div className="text-xs text-red-400 font-mono">Gastos: -{formatMoney(totalExpensesAmount)}</div>}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row items-center">
                        <div className="h-[250px] w-full sm:w-1/2">
                            {isBoxOpen && totalIncome > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={incomeByMethod.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {incomeByMethod.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>))}
                                        </Pie>
                                        <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}} itemStyle={{color: '#fff'}} formatter={(val: number) => formatMoney(val)}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">Sin ventas en este turno</div>
                            )}
                        </div>
                        <div className="w-full sm:w-1/2 space-y-2">
                            {incomeByMethod.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                                        <span className="text-sm text-slate-300 font-medium">{item.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-white">{formatMoney(item.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* LISTADO DE MOVIMIENTOS DEL TURNO CORREGIDO */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2"><Calendar size={20}/> Movimientos del Turno</h3>
                    <button onClick={handleExportPDF} disabled={!isBoxOpen || timeline.length === 0} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                        <FileText size={16}/> Reporte Turno
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-xs uppercase font-bold text-slate-400">
                            <tr>
                                <th className="px-4 py-3">Hora</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Descripción</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {timeline.map((act) => (
                                <tr key={act.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 font-mono text-slate-500">{new Date(act.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex w-fit items-center gap-1 ${
                                            act.type === 'EXPENSE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                            act.category === 'CAJA' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                            'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                            {act.type === 'EXPENSE' ? <ArrowDownCircle size={10}/> : <ArrowUpCircle size={10}/>} {act.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-200">{act.description}</td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${act.type === 'EXPENSE' ? 'text-red-400' : 'text-white'}`}>
                                        {act.type === 'EXPENSE' ? '-' : ''}{formatMoney(act.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!isBoxOpen && <p className="text-center text-slate-500 py-10 italic">La caja está cerrada. Abre turno para registrar movimientos.</p>}
                    {isBoxOpen && timeline.length === 0 && <p className="text-center text-slate-500 py-10 italic">Aún no hay movimientos en este turno.</p>}
                </div>
            </div>
        </div>
    );
};
