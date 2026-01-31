import { translations, Language } from "@/constants/translations";

// Simple translation cache
const translationCache = new Map<string, string>();

// Common English to Indonesian translations
const commonTranslations: Record<string, string> = {
  // Common words
  "Loading...": "Memuat...",
  "Search": "Cari",
  "Cart": "Keranjang",
  "Home": "Beranda",
  "Orders": "Pesanan",
  "Account": "Akun",
  "Add to Cart": "Tambah ke Keranjang",
  "Checkout": "Checkout",
  "Total": "Total",
  "Subtotal": "Subtotal",
  "Delivery Fee": "Biaya Pengiriman",
  "Discount": "Diskon",
  "Save": "Simpan",
  "Cancel": "Batal",
  "Confirm": "Konfirmasi",
  "Delete": "Hapus",
  "Edit": "Edit",
  "Back": "Kembali",
  "Next": "Lanjut",
  "Done": "Selesai",
  "Close": "Tutup",
  "Yes": "Ya",
  "No": "Tidak",
  "OK": "OK",
  "Error": "Kesalahan",
  "Success": "Berhasil",
  "Failed": "Gagal",
  
  // Product related
  "Products": "Produk",
  "Categories": "Kategori",
  "Price": "Harga",
  "Stock": "Stok",
  "Out of Stock": "Habis",
  "In Stock": "Tersedia",
  "Description": "Deskripsi",
  "Details": "Detail",
  "Reviews": "Ulasan",
  "Rating": "Rating",
  
  // Order related
  "Order": "Pesanan",
  "Track Order": "Lacak Pesanan",
  "Order Number": "Nomor Pesanan",
  "Order Status": "Status Pesanan",
  "Pending": "Menunggu",
  "Confirmed": "Dikonfirmasi",
  "Delivered": "Terkirim",
  "Cancelled": "Dibatalkan",
  
  // Location
  "Delivering to": "Kirim ke",
  "Current Location": "Lokasi Saat Ini",
  "Change Location": "Ubah Lokasi",
  
  // Search
  "Search products...": "Cari produk...",
  "Search for products...": "Cari produk...",
  "No products found": "Tidak ada produk ditemukan",
  
  // Store
  "Nearby Stores": "Toko Terdekat",
  "All Stores": "Semua Toko",
  "Store": "Toko",
  
  // Time
  "min": "mnt",
  "minutes": "menit",
  "hour": "jam",
  "hours": "jam",
  "day": "hari",
  "days": "hari",
  
  // Promotions
  "Special Offers": "Penawaran Spesial",
  "CLAIM NOW": "KLAIM SEKARANG",
  "CLAIMED": "DIKLAIM",
  "EXPIRED": "Kedaluwarsa",
  "COMING SOON": "SEGERA HADIR",
  
  // Actions
  "ADD": "TAMBAH",
  "Shop Now": "Belanja Sekarang",
  "View All": "Lihat Semua",
  "Shop by Category": "Belanja berdasarkan Kategori",
  "All Products": "Semua Produk",
  
  // Messages
  "Your cart is empty": "Keranjang Anda kosong",
  "Add items to get started": "Tambahkan item untuk memulai",
  "No orders yet": "Belum ada pesanan",
  "No notifications": "Tidak ada notifikasi",
};

export function autoTranslate(text: string, language: Language): string {
  // If English, return as-is
  if (language === "en") return text;
  
  // Check cache first
  const cacheKey = `${language}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }
  
  // Try common translations
  if (commonTranslations[text]) {
    const translated = commonTranslations[text];
    translationCache.set(cacheKey, translated);
    return translated;
  }
  
  // Try case-insensitive match
  const lowerText = text.toLowerCase();
  const matchingKey = Object.keys(commonTranslations).find(
    key => key.toLowerCase() === lowerText
  );
  
  if (matchingKey) {
    const translated = commonTranslations[matchingKey];
    translationCache.set(cacheKey, translated);
    return translated;
  }
  
  // Return original if no translation found
  return text;
}