import { db } from '../firebaseConfig';
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, writeBatch, where, limit, getDoc } from 'firebase/firestore';
import { Booking, Product, Court, User, ActivityLogEntry, ClubConfig, BookingStatus, Expense, MonthlySummary, ActiveTab } from '../types';
import { MOCK_USERS, MOCK_COURTS, INITIAL_CONFIG } from '../constants';

const BOOKINGS_COL = 'bookings';
const PRODUCTS_COL = 'products';
const COURTS_COL = 'courts';
const USERS_COL = 'users';
const ACTIVITY_COL = 'activity_logs';
const EXPENSES_COL = 'expenses';
const CONFIG_COL = 'club_config';
const SUMMARIES_COL = 'monthly_summaries';
const TABS_COL = 'active_tabs'; // Nueva colección
const CONFIG_DOC_ID = 'main_config';

const sanitize = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    if (data instanceof Date) return data.toISOString();
    const cleanData = Array.isArray(data) ? [...data] : { ...data };
    Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) cleanData[key] = null;
        else if (typeof cleanData[key] === 'object' && cleanData[key] !== null) cleanData[key] = sanitize(cleanData[key]);
    });
    return cleanData;
};

const serializeConfig = (config: ClubConfig) => {
    const safeConfig: any = sanitize(config);
    if (safeConfig.schedule && Array.isArray(safeConfig.schedule)) {
        const scheduleMap: any = {};
        safeConfig.schedule.forEach((dayHours: boolean[], index: number) => {
            scheduleMap[`day${index}`] = dayHours;
        });
        safeConfig.schedule = scheduleMap;
    }
    return safeConfig;
};

const deserializeConfig = (data: any): ClubConfig => {
    const config = { ...data } as ClubConfig;
    if (config.schedule && !Array.isArray(config.schedule)) {
        const scheduleArray: boolean[][] = [];
        const scheduleObj = config.schedule as any;
        for (let i = 0; i < 7; i++) {
            scheduleArray.push(scheduleObj[`day${i}`] || []);
        }
        config.schedule = scheduleArray;
    }
    if (config.mpAlias === undefined || config.mpAlias === null) config.mpAlias = INITIAL_CONFIG.mpAlias || '';
    return config;
};

// --- BOOKINGS ---
export const subscribeBookings = (callback: (data: Booking[]) => void, onNewBooking?: (booking: Booking) => void) => {
    const q = query(collection(db, BOOKINGS_COL));
    let isFirstLoad = true;
    return onSnapshot(q, (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        callback(bookings);
        if (!isFirstLoad && onNewBooking) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') onNewBooking({ id: change.doc.id, ...change.doc.data() } as Booking);
            });
        }
        isFirstLoad = false;
    });
};

export const addBooking = async (booking: Booking) => {
    const data = sanitize(booking);
    if (booking.id && !booking.id.startsWith('temp') && !booking.id.startsWith('web')) {
        await setDoc(doc(db, BOOKINGS_COL, booking.id), data);
    } else {
        const { id, ...rest } = data;
        await addDoc(collection(db, BOOKINGS_COL), rest);
    }
};

export const updateBooking = async (b: Booking) => updateDoc(doc(db, BOOKINGS_COL, b.id), sanitize(b));
export const updateBookingStatus = async (id: string, status: BookingStatus) => updateDoc(doc(db, BOOKINGS_COL, id), { status });
export const toggleBookingRecurring = async (id: string, v: boolean) => updateDoc(doc(db, BOOKINGS_COL, id), { isRecurring: !v });

// --- CONSUMOS (ACTIVE TABS) ---
export const subscribeActiveTabs = (callback: (tabs: ActiveTab[]) => void) => {
    return onSnapshot(collection(db, TABS_COL), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActiveTab)));
    });
};

export const updateActiveTab = async (courtId: string, items: any[]) => {
    if (items.length === 0) {
        await deleteDoc(doc(db, TABS_COL, courtId));
    } else {
        await setDoc(doc(db, TABS_COL, courtId), {
            items: sanitize(items),
            lastUpdated: new Date().toISOString()
        });
    }
};

export const clearActiveTab = async (courtId: string) => deleteDoc(doc(db, TABS_COL, courtId));

// --- PRODUCTS ---
export const subscribeProducts = (cb: (d: Product[]) => void) => onSnapshot(query(collection(db, PRODUCTS_COL), orderBy('name')), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Product))));
export const addProduct = async (p: Product) => { const { id, ...r } = sanitize(p); await addDoc(collection(db, PRODUCTS_COL), r); };
export const updateProduct = async (p: Product) => updateDoc(doc(db, PRODUCTS_COL, p.id), sanitize(p));
export const deleteProduct = async (id: string) => deleteDoc(doc(db, PRODUCTS_COL, id));
export const updateStock = async (id: string, n: number) => updateDoc(doc(db, PRODUCTS_COL, id), { stock: n });

// --- COURTS ---
export const subscribeCourts = (cb: (d: Court[]) => void) => onSnapshot(query(collection(db, COURTS_COL), orderBy('name')), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Court))));
export const updateCourtsList = async (courts: Court[]) => { for (const c of courts) await setDoc(doc(db, COURTS_COL, c.id), sanitize(c)); };

// --- USERS ---
export const subscribeUsers = (cb: (d: User[]) => void) => onSnapshot(collection(db, USERS_COL), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as User))));
export const updateUserList = async (users: User[]) => { for (const u of users) await setDoc(doc(db, USERS_COL, u.id), sanitize(u)); };
export const deleteUser = async (id: string) => deleteDoc(doc(db, USERS_COL, id));

// --- CONFIG ---
export const subscribeConfig = (callback: (data: ClubConfig) => void) => {
    return onSnapshot(doc(db, CONFIG_COL, CONFIG_DOC_ID), (docSnap) => {
        if (docSnap.exists()) {
            callback(deserializeConfig(docSnap.data()));
        } else {
            const initial = serializeConfig(INITIAL_CONFIG);
            setDoc(doc(db, CONFIG_COL, CONFIG_DOC_ID), initial);
            callback(INITIAL_CONFIG);
        }
    });
};
export const updateConfig = async (config: ClubConfig) => setDoc(doc(db, CONFIG_COL, CONFIG_DOC_ID), serializeConfig(config));

// --- ACTIVITY ---
export const subscribeActivity = (cb: (d: ActivityLogEntry[]) => void) => {
    const q = query(collection(db, ACTIVITY_COL), orderBy('timestamp', 'desc'), limit(200));
    return onSnapshot(q, (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLogEntry))));
};

export const logActivity = async (entry: ActivityLogEntry) => { const { id, ...r } = sanitize(entry); await addDoc(collection(db, ACTIVITY_COL), r); };

// --- GASTOS ---
export const subscribeExpenses = (cb: (d: Expense[]) => void) => onSnapshot(query(collection(db, EXPENSES_COL), orderBy('date', 'desc')), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() } as Expense))));
export const addExpense = async (e: Expense) => { const { id, ...r } = sanitize(e); await addDoc(collection(db, EXPENSES_COL), r); };
export const deleteExpense = async (id: string) => deleteDoc(doc(db, EXPENSES_COL, id));

// --- MANTENIMIENTO ---
export const subscribeSummaries = (callback: (data: MonthlySummary[]) => void) => {
    const q = query(collection(db, SUMMARIES_COL), orderBy('id', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const summaries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlySummary));
        callback(summaries);
    });
};

export const runMaintenance = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 15); 
    const cutoffStr = cutoffDate.toISOString();

    try {
        const oldLogsQuery = query(
            collection(db, ACTIVITY_COL),
            where('timestamp', '<', cutoffStr),
            limit(500)
        );
        
        const snapshot = await getDocs(oldLogsQuery);
        if (snapshot.empty) return;

        const batch = writeBatch(db);
        const summariesCache: { [key: string]: MonthlySummary } = {};

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data() as ActivityLogEntry;
            const date = new Date(data.timestamp);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!summariesCache[monthKey]) {
                const summaryRef = doc(db, SUMMARIES_COL, monthKey);
                const summarySnap = await getDoc(summaryRef);
                if (summarySnap.exists()) {
                    summariesCache[monthKey] = summarySnap.data() as MonthlySummary;
                } else {
                    const monthName = date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
                    summariesCache[monthKey] = {
                        id: monthKey,
                        monthLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                        totalIncome: 0,
                        totalExpenses: 0,
                        operationCount: 0,
                        lastUpdated: new Date().toISOString()
                    };
                }
            }
            if (data.amount && (data.type === 'SALE' || data.type === 'BOOKING')) {
                summariesCache[monthKey].totalIncome += data.amount;
            }
            summariesCache[monthKey].operationCount += 1;
            batch.delete(docSnap.ref);
        }
        Object.values(summariesCache).forEach(summary => {
            const ref = doc(db, SUMMARIES_COL, summary.id);
            summary.lastUpdated = new Date().toISOString();
            batch.set(ref, summary);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error mantenimiento:", error);
    }
};

export const seedDatabase = async () => {
    try {
        const uSnap = await getDocs(collection(db, USERS_COL));
        if (uSnap.empty) for (const u of MOCK_USERS) await setDoc(doc(db, USERS_COL, u.id), sanitize(u));
        const cSnap = await getDocs(collection(db, COURTS_COL));
        if (cSnap.empty) for (const c of MOCK_COURTS) await setDoc(doc(db, COURTS_COL, c.id), sanitize(c));
    } catch (e) {}
};
