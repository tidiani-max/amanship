export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description: string;
  nutrition?: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
  inStock: boolean;
  stockCount: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  image?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Address {
  id: string;
  label: string;
  fullAddress: string;
  details?: string;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: "ewallet" | "bank" | "card";
}

export interface Order {
  id: string;
  items: CartItem[];
  status: "pending" | "preparing" | "on_the_way" | "delivered";
  total: number;
  deliveryFee: number;
  address: Address;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  estimatedDelivery: Date;
  rider?: Rider;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  photo: string;
  rating: number;
  vehicleNumber: string;
}

export interface Voucher {
  id: string;
  code: string;
  discount: number;
  discountType: "percentage" | "fixed";
  minOrder: number;
  validUntil: Date;
  description: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  addresses: Address[];
}
