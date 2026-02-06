import React, { useState, useMemo } from 'react';
import { ClubConfig, ActivityLogEntry, ActivityType, PaymentMethod, Expense } from '../types';
import { DollarSign, Lock, Unlock, TrendingUp, Calendar, CreditCard, Banknote, QrCode, ArrowDownCircle, ArrowUpCircle, FileText, Loader2, Download } from 'lucide-react';
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

    // 1. PERSISTENCIA: DETERMINAR SI LA CAJA ESTÁ ABIERTA MIRANDO EL ÚLTIMO EVENTO 'SHIFT'
    const lastShift = useMemo(() => {
        return [...activities]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .find(act => act.type === 'SHIFT');
    }, [activities]);

    const isOpen = lastShift?.description.includes('Apertura');
    const openTime = isOpen ? lastShift?.timestamp : null;

    // 2. FILTRAR ACTIVIDAD DEL TURNO (Desde la apertura hasta ahora)
    const turnActivity = useMemo(() => {
        if (!isOpen || !openTime) return [];
        return activities.filter(act => 
            new Date(act.timestamp) >= new Date(openTime) && 
            (act.type === 'SALE' || act.type === 'BOOKING' || act.type === 'SHIFT')
        );
    }, [activities, isOpen, openTime]);

    // 3. FILTRAR GASTOS DEL TURNO (Solo Admin ve gastos)
    const turnExpenses = useMemo(() => {
        if (!isOpen || !openTime || role !== 'ADMIN') return [];
        return expenses.filter(e => {
            const expDate = new Date(`${e.date}T12:00:00`).getTime();
            const boxOpenDate = new Date(openTime).getTime();
            return expDate >= boxOpenDate;
        });
    }, [expenses, openTime, isOpen, role]);

    // 4. CÁLCULO DE INGRESOS POR MÉTODO (Para el gráfico circular)
    const incomeByMethod = useMemo(() => {
        const data = [
            { name: 'Efectivo', value: 0, color: '#22c55e', method: PaymentMethod.CASH },
            { name: 'QR MP', value: 0, color: '#3b82f6', method: PaymentMethod.QR },
            { name: 'Transferencia', value: 0, color: '#a855f7', method: PaymentMethod.TRANSFER }
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
    const totalExp = turnExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // 5. LÍNEA DE TIEMPO COMBINADA (Incomes + Expenses)
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
        if (isOpen) {
            // Acción de Cierre
            onLogActivity('SHIFT', `Cierre de Caja. Final Declarado: $${val}. Sistema calculó: $${totalIncome}`, val);
        } else {
            // Acción de Apertura
            onLogActivity('SHIFT', `Apertura de Caja. Inicial: $${val}`, val);
        }
        setAmountInput('');
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleString('es-AR');
        
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(config.name, 14, 20);
        doc.setFontSize(12);
        doc.text(`Reporte de Cierre de Caja - ${dateStr}`, 14, 30);

        autoTable(doc, {
            startY: 50,
            head: [['Concepto', 'Monto']],
            body: [
                ['Ingresos en Ventas/Turnos', formatMoney(totalIncome)],
                ['Egresos (Gastos Registrados)', formatMoney(totalExp)],
                ['Balance Neto del Turno', formatMoney(totalIncome - totalExp)]
            ],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save(`Cierre_Caja_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20">
            
            {/* SECCIÓN SUPERIOR: CONTROL Y GRÁFICO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Panel de Apertura/Cierre */}
                <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center text-center">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-4 transition-all duration-500
                        ${isOpen ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {isOpen ? <Unlock size={40} /> : <Lock size={40} />}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">{isOpen ? 'Caja Abierta' : 'Caja Cerrada'}</h2>
                    {isOpen && (
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 tracking-widest">
                            Iniciado: {new Date(openTime!).toLocaleTimeString()}
                        </p>
                    )}
                    
                    <div className="w-full max-w-xs space-y-3 mt-2">
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                            <input 
                                type="number" 
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                placeholder={isOpen ? "Monto Final" : "Monto Inicial"}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 pl-10 text-white font-mono outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button 
                            onClick={handleAction} 
                            disabled={!amountInput} 
                            className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg
                                ${isOpen ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-green-600 hover:bg-green-500 shadow-green-900/20'}`}
                        >
                            {isOpen ? 'CERRAR TURNO' : 'ABRIR TURNO'}
                        </button>
                    </div>
                </div>

                {/* Gráfico de Ingresos del Turno */}
                <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-400"/> Ventas del Turno Actual
                            </h3>
                            <p className="text-xs text-slate-500">Actividad desde la última apertura</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-mono font-bold text-green-400">{formatMoney(totalIncome)}</div>
                            {totalExp > 0 && <div className="text-xs text-red-400 font-mono">Gastos: -{formatMoney(totalExp)}</div>}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row items-center">
                        <div className="h-[250px] w-full sm:w-1/2">
                            {isOpen && totalIncome > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={incomeByMethod.filter(d => d.value > 0)} 
                                            cx="50%" cy="50%" 
                                            innerRadius={60} 
                                            outerRadius={80} 
                                            paddingAngle={5} 
                                            dataKey="value"
                                        >
                                            {incomeByMethod.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none"/>
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}} 
                                            itemStyle={{color: '#fff'}} 
                                            formatter={(val: number) => formatMoney(val)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">
                                    No hay ventas registradas en este turno.
                                </div>
                            )}
                        </div>
                        <div className="w-full sm:w-1/2 space-y-2 pl-0 sm:pl-4 mt-4 sm:mt-0">
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

            {/* SECCIÓN INFERIOR: TABLA DE MOVIMIENTOS */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <Calendar size={20}/> Movimientos del Turno
                    </h3>
                    <button 
                        onClick={handleExportPDF} 
                        disabled={!isOpen || timeline.length === 0} 
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-red-900/20"
                    >
                        <Download size={16}/> Descargar Reporte PDF
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-xs text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="p-4 rounded-l-lg">Hora</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Descripción</th>
                                <th className="p-4">Método</th>
                                <th className="p-4 text-right rounded-r-lg">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {timeline.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-slate-500 italic">
                                        {!isOpen ? 'La caja está cerrada. Abre turno para ver movimientos.' : 'Aún no hay movimientos en este turno.'}
                                    </td>
                                </tr>
                            ) : (
                                timeline.map((act) => (
                                    <tr key={act.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 font-mono text-slate-500 text-xs">
                                            {new Date(act.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex w-fit items-center gap-1 
                                                ${act.type === 'EXPENSE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                                  act.category === 'CAJA' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                                  'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                {act.type === 'EXPENSE' ? <ArrowDownCircle size={10}/> : <ArrowUpCircle size={10}/>} 
                                                {act.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-200">
                                            {act.description}
                                            <span className="text-[10px] text-slate-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                por {act.user}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-slate-400 font-medium">
                                            {act.method || '-'}
                                        </td>
                                        <td className={`p-4 text-right font-mono font-bold ${act.type === 'EXPENSE' ? 'text-red-400' : 'text-white'}`}>
                                            {act.type === 'EXPENSE' ? '-' : ''}{formatMoney(act.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
