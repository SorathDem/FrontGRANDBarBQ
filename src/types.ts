export type Role = 'admin' | 'caja';

export interface Session {
  token: string;
  role: Role;
}

export interface Product {
  _id: string;
  name: string;
  category?: string;
  price: number;
  stock?: number;
}

export interface OrderItem {
  _id?: string;
  productId?: string;
  tipo?: string;
  nombre: string;
  cantidad: number;
  precio: number;
  recomendaciones?: string;
}

export interface Order {
  _id: string;
  mesa?: string;
  fecha?: string;
  metodoPago?: string;
  items?: OrderItem[];
  total?: number;
  status?: string;
  createdAt?: string;
}

export interface Cierre {
  _id?: string;
  fecha?: string;
  cantidadOrdenes?: number;
  totalDia?: number;
}

export interface LoginResponse {
  token?: string;
  role?: string;
  message?: string;
  error?: string;
}

export interface CreateOrderResponse {
  orden?: Order;
  _id?: string;
  alertasStockBajo?: Array<{ nombre?: string }>;
}

export interface CloseCajaResponse {
  caja?: {
    totalDia?: number;
    cantidadOrdenes?: number;
  };
}
