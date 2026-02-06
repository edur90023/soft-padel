export type Role = 'ADMIN' | 'OPERATOR' | 'PUBLIC';

export enum BookingStatus {
  PENDING = 'Pendiente',
  CONFIRMED = 'Confirmado',
  CANCELLED = 'Cancelado',
}

export enum PaymentMethod {
  CASH = 'Efectivo',
  TRANSFER = 'Transferencia',
  QR = 'QR Mercado Pago',
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: 'ADMIN' | 'OPERATOR';
}

export interface Court {
  id: string;
  name: string;
  type: 'Indoor' | 'Outdoor';
  surfaceColor: 'blue' | 'green' | 'red' | 'yellow';
  status: 'AVAILABLE' | 'MAINTENANCE';
  // Pricing
  basePrice: number;
  // Offer 1
  isOffer1Active: boolean;
  offer1Price: number;
  offer1Label?: string;
  // Offer 2
  isOffer2Active: boolean;
  offer2Price: number;
  offer2Label?: string;
}

export interface Booking {
  id: string;
  courtId: string;
  date: string;
  time: string;
  duration: number;
  customerName: string;
  customerPhone: string;
  status: BookingStatus;
  paymentMethod?: PaymentMethod;
  price: number;
  isRecurring: boolean;
  seriesId?: string; // <--- Identificador para agrupar turnos fijos semanales
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStockAlert: number;
  imageUrl: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  initialAmount: number;
  finalAmount: number | null;
  status: 'OPEN' | 'CLOSED';
}

export interface Advertisement {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
}

export interface ClubConfig {
  name: string;
  logoUrl?: string;
  schedule: boolean[][];
  slotDuration: number;
  courtColorTheme: 'blue' | 'green' | 'red' | 'yellow';
  ownerPhone: string;
  bookingBackgroundImage?: string;
  ads: Advertisement[];
  adRotationInterval: number;
  
  // Promotion Config
  promoActive: boolean;
  promoText: string;
  promoPrice: number;

  // Payment Config
  mpAlias: string;
  mpFeePercentage: number;
}

export type ActivityType = 'BOOKING' | 'SALE' | 'SHIFT' | 'SYSTEM' | 'STOCK';

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  user: string;
  amount?: number;
  method?: PaymentMethod;
}

export interface Expense {
  id: string;
  date: string;
  category: 'Sueldos' | 'Servicios' | 'Mantenimiento' | 'Alquiler' | 'Varios';
  description: string;
  amount: number;
}

export interface MonthlySummary {
  id: string;
  monthLabel: string;
  totalIncome: number;
  totalExpenses: number;
  operationCount: number;
  lastUpdated: string;
}
