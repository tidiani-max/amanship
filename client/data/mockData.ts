import { Category, Product, Order, PaymentMethod, Address, Voucher, Rider } from "@/types";

export const mockCategories: Category[] = [
  { id: "1", name: "Milk", icon: "droplet", color: "#4A90E2" },
  { id: "2", name: "Eggs", icon: "circle", color: "#FF9800" },
  { id: "3", name: "Snacks", icon: "box", color: "#9C27B0" },
  { id: "4", name: "Fruits", icon: "sun", color: "#4CAF50" },
  { id: "5", name: "Frozen", icon: "thermometer", color: "#00BCD4" },
  { id: "6", name: "Drinks", icon: "coffee", color: "#F44336" },
  { id: "7", name: "Veggies", icon: "feather", color: "#8BC34A" },
  { id: "8", name: "Meat", icon: "target", color: "#E91E63" },
];

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Fresh Full Cream Milk",
    brand: "Ultra Milk",
    price: 18500,
    originalPrice: 22000,
    image: "",
    category: "1",
    description: "Fresh pasteurized full cream milk, rich in calcium and vitamin D.",
    nutrition: { calories: "120 kcal", protein: "8g", carbs: "12g", fat: "5g" },
    inStock: true,
    stockCount: 50,
  },
  {
    id: "2",
    name: "Organic Free Range Eggs",
    brand: "Happy Farm",
    price: 32000,
    image: "",
    category: "2",
    description: "Premium organic eggs from free-range hens.",
    nutrition: { calories: "70 kcal", protein: "6g", carbs: "0.5g", fat: "5g" },
    inStock: true,
    stockCount: 30,
  },
  {
    id: "3",
    name: "Potato Chips Original",
    brand: "Chitato",
    price: 15000,
    image: "",
    category: "3",
    description: "Crispy potato chips with original flavor.",
    inStock: true,
    stockCount: 100,
  },
  {
    id: "4",
    name: "Fresh Banana",
    brand: "Local Farm",
    price: 8000,
    image: "",
    category: "4",
    description: "Sweet and ripe bananas, perfect for snacking.",
    inStock: true,
    stockCount: 45,
  },
  {
    id: "5",
    name: "Frozen Chicken Nuggets",
    brand: "Fiesta",
    price: 45000,
    originalPrice: 52000,
    image: "",
    category: "5",
    description: "Crispy chicken nuggets, ready to fry.",
    inStock: true,
    stockCount: 25,
  },
  {
    id: "6",
    name: "Mineral Water 1.5L",
    brand: "Aqua",
    price: 5500,
    image: "",
    category: "6",
    description: "Pure mineral water from natural springs.",
    inStock: true,
    stockCount: 200,
  },
  {
    id: "7",
    name: "Fresh Spinach",
    brand: "Organic Green",
    price: 12000,
    image: "",
    category: "7",
    description: "Fresh organic spinach, washed and ready to cook.",
    inStock: true,
    stockCount: 20,
  },
  {
    id: "8",
    name: "Beef Rendang Ready",
    brand: "Kokita",
    price: 35000,
    image: "",
    category: "8",
    description: "Ready-to-eat beef rendang with authentic Indonesian taste.",
    inStock: false,
    stockCount: 0,
  },
];

export const mockPromotions = [
  { title: "50% OFF", subtitle: "First Order", color: "#FF6B6B" },
  { title: "Free Delivery", subtitle: "Min. Rp50k", color: "#4A90E2" },
  { title: "Buy 2 Get 1", subtitle: "Selected Items", color: "#9C27B0" },
];

export const mockPaymentMethods: PaymentMethod[] = [
  { id: "1", name: "GoPay", icon: "credit-card", type: "ewallet" },
  { id: "2", name: "OVO", icon: "credit-card", type: "ewallet" },
  { id: "3", name: "ShopeePay", icon: "credit-card", type: "ewallet" },
  { id: "4", name: "DANA", icon: "credit-card", type: "ewallet" },
  { id: "5", name: "BCA Virtual Account", icon: "briefcase", type: "bank" },
  { id: "6", name: "Credit Card", icon: "credit-card", type: "card" },
];

export const mockAddresses: Address[] = [
  {
    id: "1",
    label: "Home",
    fullAddress: "Jl. Sudirman No. 123, Jakarta Selatan",
    details: "Apartment Tower A, Unit 15B",
    isDefault: true,
  },
  {
    id: "2",
    label: "Office",
    fullAddress: "Jl. Gatot Subroto Kav. 45, Jakarta Selatan",
    details: "Gedung Graha 5th Floor",
    isDefault: false,
  },
];

export const mockRider: Rider = {
  id: "1",
  name: "Budi Santoso",
  phone: "+62 812-3456-7890",
  photo: "",
  rating: 4.8,
  vehicleNumber: "B 1234 ABC",
};

export const mockVouchers: Voucher[] = [
  {
    id: "1",
    code: "NEWUSER50",
    discount: 50,
    discountType: "percentage",
    minOrder: 50000,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    description: "50% off for new users",
  },
  {
    id: "2",
    code: "FREEDELIVERY",
    discount: 15000,
    discountType: "fixed",
    minOrder: 75000,
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    description: "Free delivery for orders above Rp75,000",
  },
];

export const mockOrders: Order[] = [
  {
    id: "KG-001234",
    items: [
      { product: mockProducts[0], quantity: 2 },
      { product: mockProducts[1], quantity: 1 },
    ],
    status: "delivered",
    total: 69000,
    deliveryFee: 10000,
    address: mockAddresses[0],
    paymentMethod: mockPaymentMethods[0],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    estimatedDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
    rider: mockRider,
  },
  {
    id: "KG-001235",
    items: [
      { product: mockProducts[2], quantity: 3 },
      { product: mockProducts[5], quantity: 2 },
    ],
    status: "on_the_way",
    total: 56000,
    deliveryFee: 10000,
    address: mockAddresses[0],
    paymentMethod: mockPaymentMethods[1],
    createdAt: new Date(),
    estimatedDelivery: new Date(Date.now() + 10 * 60 * 1000),
    rider: mockRider,
  },
];
