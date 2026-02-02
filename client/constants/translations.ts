// constants/translations.ts
// COMPLETE FILE - Replace your entire translations.ts with this

export type Language = "en" | "id";

export interface TranslationKeys {
  // Common
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    edit: string;
    delete: string;
    confirm: string;
    back: string;
    next: string;
    done: string;
    close: string;
    search: string;
    filter: string;
    sort: string;
    apply: string;
    reset: string;
    yes: string;
    no: string;
    ok: string;
    add: string;
    remove: string;
    update: string;
    submit: string;
    proceed: string;
  };

  // Account Screen
  account: {
    title: string;
    myAccount: string;
    support: string;
    settings: string;
    noPhone: string;
    savedAddresses: string;
    paymentMethods: string;
    myVouchers: string;
    helpCenter: string;
    chatSupport: string;
    notifications: string;
    language: string;
    about: string;
    storeDashboard: string;
    logout: string;
  };

  // Onboarding
  onboarding: {
    welcome: string;
    getStarted: string;
    skip: string;
    next: string;
    slide1Title: string;
    slide1Description: string;
    slide2Title: string;
    slide2Description: string;
    slide3Title: string;
    slide3Description: string;
  };

  // Authentication
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    phoneNumber: string;
    enterPhone: string;
    enterOTP: string;
    verifyOTP: string;
    resendOTP: string;
    continueWithPhone: string;
    invalidPhone: string;
    invalidOTP: string;
  };

  // Home Screen
  home: {
    title: string;
    searchPlaceholder: string;
    categories: string;
    featuredProducts: string;
    popularProducts: string;
    nearbyStores: string;
    viewAll: string;
    deliveryTo: string;
    changeLocation: string;
  };

  // Categories
  categories: {
    title: string;
    all: string;
    fresh: string;
    dairy: string;
    bakery: string;
    beverages: string;
    snacks: string;
    household: string;
    personal: string;
    searchPlaceholder: string;
    noResults: string;
    noResultsDescription: string;
  };

  // Products
  products: {
    addToCart: string;
    outOfStock: string;
    inStock: string;
    quantity: string;
    price: string;
    description: string;
    details: string;
    reviews: string;
    rating: string;
    noReviews: string;
    addToBasket: string;
    totalPrice: string;
    currentLocation: string;
    nutritionFacts: string;
    labelThisPlace: string;
    noteForDriver: string;
    premiumSelection: string;
    stockAvailable: string;
  };

  // Cart
  cart: {
    title: string;
    empty: string;
    emptyDescription: string;
    startShopping: string;
    subtotal: string;
    deliveryFee: string;
    serviceFee: string;
    discount: string;
    total: string;
    proceedToCheckout: string;
    removeItem: string;
    updateQuantity: string;
  };

  // Checkout
  checkout: {
    title: string;
    deliveryAddress: string;
    changeAddress: string;
    addAddress: string;
    paymentMethod: string;
    selectPayment: string;
    orderSummary: string;
    placeOrder: string;
    processing: string;
    orderNotes: string;
    addNotes: string;
  };

  // Orders
  orders: {
    title: string;
    myOrders: string;
    active: string;
    completed: string;
    cancelled: string;
    orderNumber: string;
    orderDate: string;
    orderStatus: string;
    trackOrder: string;
    viewDetails: string;
    cancelOrder: string;
    reorder: string;
    noOrders: string;
    noOrdersDescription: string;
    history: string;
    trackingStatus: string;
    arrivingSoon: string;
    
    status: {
      pending: string;
      confirmed: string;
      preparing: string;
      ready: string;
      outForDelivery: string;
      delivered: string;
      cancelled: string;
      created: string;
      picking: string;
      packing: string;
      packed: string;
      delivering: string;
      readyToGo: string;
      onTheWay: string;
    };
  };

  // Order Tracking
  tracking: {
    title: string;
    estimatedArrival: string;
    trackingNumber: string;
    driverInfo: string;
    contactDriver: string;
    callDriver: string;
    chatWithDriver: string;
    orderPlaced: string;
    orderConfirmed: string;
    beingPrepared: string;
    outForDelivery: string;
    delivered: string;
    pickingItems: string;
    readyForPickup: string;
    onTheWay: string;
    searchingForDriver: string;
    yourDeliveryLocation: string;
    driverAt: string;
    orderSummary: string;
    totalPayment: string;
    kmAway: string;
    arrivingSoon: string;
    pin: string;
  };

  // Profile
  profile: {
    title: string;
    myProfile: string;
    editProfile: string;
    personalInfo: string;
    name: string;
    email: string;
    phone: string;
    addresses: string;
    savedAddresses: string;
    addNewAddress: string;
    settings: string;
    notifications: string;
    language: string;
    theme: string;
    privacy: string;
    termsOfService: string;
    helpCenter: string;
    about: string;
    version: string;
    logout: string;
  };

  // Notifications
  notifications: {
    title: string;
    markAllRead: string;
    clearAll: string;
    noNotifications: string;
    noNotificationsDescription: string;
    today: string;
    yesterday: string;
    earlier: string;
    orderUpdate: string;
    promotion: string;
    system: string;
    settings: string;
    orderUpdates: string;
    orderUpdatesDesc: string;
    chatMessages: string;
    chatMessagesDesc: string;
    chatMessagesDescDriver: string;
    deliveryAlerts: string;
    deliveryAlertsDesc: string;
    deliveryAlertsDescDriver: string;
    promotions: string;
    promotionsDesc: string;
    pushNotificationsOn: string;
    notificationsOff: string;
    pushStatusOn: string;
    pushStatusOff: string;
    enableAccess: string;
    enableAccessMessage: string;
    enable: string;
    fix: string;
    preferences: string;
    securityNote: string;
  };

  // Language Settings
  language: {
    title: string;
    selectLanguage: string;
    current: string;
    english: string;
    indonesian: string;
    changeLanguageNote: string;
  };

  // Address Management
  address: {
    title: string;
    addAddress: string;
    editAddress: string;
    deleteAddress: string;
    setAsDefault: string;
    addressLabel: string;
    home: string;
    work: string;
    other: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    saveAddress: string;
    deleteConfirm: string;
    deliveryAddress: string;
    currentLocation: string;
    useGPS: string;
    useGPSDesc: string;
    orSearch: string;
    searchPlaceholder: string;
    labelPlace: string;
    labelPlaceholder: string;
    noteForDriver: string;
    noteForDriverPlaceholder: string;
    savedAddress: string;
    confirmDeliveryAddress: string;
  };

  // Voice Order
  voiceOrder: {
    title: string;
    listening: string;
    processing: string;
    tapToSpeak: string;
    speakNow: string;
    hearingYou: string;
    foundItems: string;
    confirm: string;
    tryAgain: string;
    cancel: string;
    itemsDetected: string;
    reviewAndEdit: string;
    noItems: string;
    goBack: string;
    totalValue: string;
    addAllToCart: string;
  };

  // Vouchers
  vouchers: {
    title: string;
    available: string;
    used: string;
    expired: string;
    applyVoucher: string;
    removeVoucher: string;
    voucherCode: string;
    enterCode: string;
    discount: string;
    validUntil: string;
    minPurchase: string;
    termsAndConditions: string;
    noVouchers: string;
    myRewards: string;
    history: string;
    copy: string;
    copied: string;
    voucherReady: string;
    noVouchersFound: string;
  };

  // Help Center
  help: {
    title: string;
    searchHelp: string;
    faq: string;
    contactSupport: string;
    reportIssue: string;
    orderHelp: string;
    paymentHelp: string;
    deliveryHelp: string;
    accountHelp: string;
    howToOrder: string;
    trackingHelp: string;
    refundPolicy: string;
  };

  // Chat
  chat: {
    title: string;
    chatWithRider: string;
    typeMessage: string;
    sendMessage: string;
    attachPhoto: string;
    online: string;
    offline: string;
    typing: string;
  };

  // About
  about: {
    title: string;
    version: string;
    description: string;
    developer: string;
    contact: string;
    privacyPolicy: string;
    termsOfService: string;
    licenses: string;
  };

  // Admin Dashboard
  admin: {
    title: string;
    dashboard: string;
    overview: string;
    totalOrders: string;
    totalRevenue: string;
    activeUsers: string;
    pendingOrders: string;
    manageProducts: string;
    manageUsers: string;
    manageOrders: string;
    reports: string;
    settings: string;
  };

  // Picker Dashboard
  picker: {
    title: string;
    dashboard: string;
    assignedOrders: string;
    completedToday: string;
    startPicking: string;
    markComplete: string;
    itemsList: string;
    scanBarcode: string;
    inventory: string;
    realTimeSync: string;
    addProduct: string;
    editProduct: string;
    newProduct: string;
    productName: string;
    productNamePlaceholder: string;
    pricePlaceholder: string;
    tapToUpload: string;
    saveProduct: string;
    discardChanges: string;
    noProductsFound: string;
    productAdded: string;
    productUpdated: string;
  };

  // Driver Dashboard
  driver: {
    title: string;
    dashboard: string;
    availableDeliveries: string;
    activeDelivery: string;
    completedToday: string;
    acceptDelivery: string;
    pickupLocation: string;
    deliveryLocation: string;
    navigate: string;
    markDelivered: string;
    earnings: string;
  };

  // Errors
  errors: {
    networkError: string;
    serverError: string;
    notFound: string;
    unauthorized: string;
    sessionExpired: string;
    tryAgain: string;
    somethingWrong: string;
    couldNotAddToCart: string;
    couldNotGetLocation: string;
    couldNotSaveAddress: string;
    saveFailed: string;
  };

  // Success Messages
  success: {
    orderPlaced: string;
    orderCancelled: string;
    addressSaved: string;
    addressDeleted: string;
    profileUpdated: string;
    paymentSuccess: string;
  };

  // Order Success Screen
  orderSuccess: {
    title: string;
    orderConfirmed: string;
    minutes: string;
    trackOrder: string;
    backToHome: string;
  };

  // Order Receipt
  receipt: {
    printReceipt: string;
    orderInformation: string;
    orderNumber: string;
    orderId: string;
    date: string;
    store: string;
    customerDetails: string;
    name: string;
    phone: string;
    email: string;
    orderItems: string;
    product: string;
    quantity: string;
    subtotal: string;
    deliveryFee: string;
    total: string;
    thankYou: string;
    trustedService: string;
    printFailed: string;
    sharingNotAvailable: string;
  };
}

export const translations: Record<Language, TranslationKeys> = {
  en: {
    common: {
      loading: "Loading...",
      error: "Error",
      retry: "Retry",
      cancel: "Cancel",
      save: "Save",
      edit: "Edit",
      delete: "Delete",
      confirm: "Confirm",
      back: "Back",
      next: "Next",
      done: "Done",
      close: "Close",
      search: "Search",
      filter: "Filter",
      sort: "Sort",
      apply: "Apply",
      reset: "Reset",
      yes: "Yes",
      no: "No",
      ok: "OK",
      add: "Add",
      remove: "Remove",
      update: "Update",
      submit: "Submit",
      proceed: "Proceed",
    },

    account: {
      title: "Account",
      myAccount: "My Account",
      support: "Support",
      settings: "Settings",
      noPhone: "No phone number",
      savedAddresses: "Saved Addresses",
      paymentMethods: "Payment Methods",
      myVouchers: "My Vouchers",
      helpCenter: "Help Center",
      chatSupport: "Chat Support",
      notifications: "Notifications",
      language: "Language",
      about: "About",
      storeDashboard: "Store Dashboard",
      logout: "Logout",
    },

    onboarding: {
      welcome: "Welcome to ZendO",
      getStarted: "Get Started",
      skip: "Skip",
      next: "Next",
      slide1Title: "Fast Delivery",
      slide1Description: "Get your groceries delivered in minutes",
      slide2Title: "Wide Selection",
      slide2Description: "Choose from thousands of fresh products",
      slide3Title: "Easy Ordering",
      slide3Description: "Order with just a few taps or use voice",
    },

    auth: {
      signIn: "Sign In",
      signUp: "Sign Up",
      signOut: "Sign Out",
      phoneNumber: "Phone Number",
      enterPhone: "Enter your phone number",
      enterOTP: "Enter OTP",
      verifyOTP: "Verify OTP",
      resendOTP: "Resend OTP",
      continueWithPhone: "Continue with Phone",
      invalidPhone: "Please enter a valid phone number",
      invalidOTP: "Invalid OTP",
    },

    home: {
      title: "Home",
      searchPlaceholder: "Search for products...",
      categories: "Categories",
      featuredProducts: "Featured Products",
      popularProducts: "Popular Products",
      nearbyStores: "Nearby Stores",
      viewAll: "View All",
      deliveryTo: "Delivery to",
      changeLocation: "Change Location",
    },

    categories: {
      title: "Categories",
      all: "All",
      fresh: "Fresh Produce",
      dairy: "Dairy & Eggs",
      bakery: "Bakery",
      beverages: "Beverages",
      snacks: "Snacks",
      household: "Household",
      personal: "Personal Care",
      searchPlaceholder: "Search categories...",
      noResults: "No results found",
      noResultsDescription: "Try a different search term",
    },

    products: {
      addToCart: "Add to Cart",
      outOfStock: "Out of Stock",
      inStock: "In Stock",
      quantity: "Quantity",
      price: "Price",
      description: "Description",
      details: "Details",
      reviews: "Reviews",
      rating: "Rating",
      noReviews: "No reviews yet",
      addToBasket: "Add to Basket",
      totalPrice: "Total Price",
      currentLocation: "Current Location",
      nutritionFacts: "Nutrition Facts",
      labelThisPlace: "Label This Place",
      noteForDriver: "Note for Driver (Optional)",
      premiumSelection: "Premium Selection",
      stockAvailable: "IN STOCK",
    },

    cart: {
      title: "Cart",
      empty: "Your cart is empty",
      emptyDescription: "Add items to get started",
      startShopping: "Start Shopping",
      subtotal: "Subtotal",
      deliveryFee: "Delivery Fee",
      serviceFee: "Service Fee",
      discount: "Discount",
      total: "Total",
      proceedToCheckout: "Proceed to Checkout",
      removeItem: "Remove Item",
      updateQuantity: "Update Quantity",
    },

    checkout: {
      title: "Checkout",
      deliveryAddress: "Delivery Address",
      changeAddress: "Change Address",
      addAddress: "Add Address",
      paymentMethod: "Payment Method",
      selectPayment: "Select Payment Method",
      orderSummary: "Order Summary",
      placeOrder: "Place Order",
      processing: "Processing...",
      orderNotes: "Order Notes",
      addNotes: "Add notes for the delivery",
    },

    orders: {
      title: "Orders",
      myOrders: "My Orders",
      active: "Active",
      completed: "Completed",
      cancelled: "Cancelled",
      orderNumber: "Order #",
      orderDate: "Order Date",
      orderStatus: "Status",
      trackOrder: "Track Order",
      viewDetails: "View Details",
      cancelOrder: "Cancel Order",
      reorder: "Reorder",
      noOrders: "No orders yet",
      noOrdersDescription: "Your orders will appear here",
      history: "History",
      trackingStatus: "TRACKING STATUS",
      arrivingSoon: "ARRIVING SOON",
      
      status: {
        pending: "PENDING",
        confirmed: "PREPARING",
        preparing: "PREPARING",
        ready: "Ready for Pickup",
        outForDelivery: "Out for Delivery",
        delivered: "DELIVERED",
        cancelled: "Cancelled",
        created: "PENDING",
        picking: "PACKING",
        packing: "PACKING",
        packed: "READY TO GO",
        delivering: "ON THE WAY",
        readyToGo: "READY TO GO",
        onTheWay: "ON THE WAY",
      },
    },

    tracking: {
      title: "Order Tracking",
      estimatedArrival: "Estimated Arrival",
      trackingNumber: "Tracking Number",
      driverInfo: "Driver Information",
      contactDriver: "Contact Driver",
      callDriver: "Call Driver",
      chatWithDriver: "Chat with Driver",
      orderPlaced: "Order Placed",
      orderConfirmed: "Order Confirmed",
      beingPrepared: "Being Prepared",
      outForDelivery: "Out for Delivery",
      delivered: "Delivered",
      pickingItems: "Picking Items",
      readyForPickup: "Ready for Pickup",
      onTheWay: "On the Way",
      searchingForDriver: "Searching for driver...",
      yourDeliveryLocation: "Your delivery location",
      driverAt: "Driver at:",
      orderSummary: "Order Summary",
      totalPayment: "Total Payment",
      kmAway: "km away",
      arrivingSoon: "Arriving Soon",
      pin: "PIN",
    },

    profile: {
      title: "Profile",
      myProfile: "My Profile",
      editProfile: "Edit Profile",
      personalInfo: "Personal Information",
      name: "Name",
      email: "Email",
      phone: "Phone",
      addresses: "Addresses",
      savedAddresses: "Saved Addresses",
      addNewAddress: "Add New Address",
      settings: "Settings",
      notifications: "Notifications",
      language: "Language",
      theme: "Theme",
      privacy: "Privacy",
      termsOfService: "Terms of Service",
      helpCenter: "Help Center",
      about: "About",
      version: "Version",
      logout: "Logout",
    },

    notifications: {
      title: "Notifications",
      markAllRead: "Mark All as Read",
      clearAll: "Clear All",
      noNotifications: "No notifications",
      noNotificationsDescription: "You're all caught up!",
      today: "Today",
      yesterday: "Yesterday",
      earlier: "Earlier",
      orderUpdate: "Order Update",
      promotion: "Promotion",
      system: "System",
      settings: "Notification Settings",
      orderUpdates: "Order Updates",
      orderUpdatesDesc: "Status changes and delivery progress",
      chatMessages: "Chat Messages",
      chatMessagesDesc: "Alerts for new messages from your driver",
      chatMessagesDescDriver: "Alerts for new messages from customers",
      deliveryAlerts: "Delivery Alerts",
      deliveryAlertsDesc: "Real-time location updates",
      deliveryAlertsDescDriver: "New delivery opportunities",
      promotions: "Promotions",
      promotionsDesc: "Special offers and exclusive discounts",
      pushNotificationsOn: "Push Notifications On",
      notificationsOff: "Notifications are Off",
      pushStatusOn: "You're getting all order & chat updates.",
      pushStatusOff: "Enable access to get real-time delivery alerts.",
      enableAccess: "Enable Access",
      enableAccessMessage: "Please allow notifications in settings first.",
      enable: "Enable",
      fix: "Fix",
      preferences: "PREFERENCES",
      securityNote: "System alerts regarding account security cannot be disabled.",
    },

    language: {
      title: "Language",
      selectLanguage: "Select Language",
      current: "Current",
      english: "English",
      indonesian: "Indonesian",
      changeLanguageNote: "App will use your selected language for all content.",
    },

    address: {
      title: "Addresses",
      addAddress: "Add Address",
      editAddress: "Edit Address",
      deleteAddress: "Delete Address",
      setAsDefault: "Set as Default",
      addressLabel: "Label",
      home: "Home",
      work: "Work",
      other: "Other",
      streetAddress: "Street Address",
      city: "City",
      state: "State/Province",
      postalCode: "Postal Code",
      country: "Country",
      saveAddress: "Save Address",
      deleteConfirm: "Are you sure you want to delete this address?",
      deliveryAddress: "Delivery Address",
      currentLocation: "Current Location",
      useGPS: "Use GPS for precise delivery",
      useGPSDesc: "Use GPS for precise delivery",
      orSearch: "OR SEARCH",
      searchPlaceholder: "Search area, street or landmark...",
      labelPlace: "Label This Place",
      labelPlaceholder: "e.g. Home, My Office, Mom's House",
      noteForDriver: "Note for Driver (Optional)",
      noteForDriverPlaceholder: "Gate code, building color, floor number...",
      savedAddress: "Saved Address",
      confirmDeliveryAddress: "Confirm Delivery Address",
    },

    voiceOrder: {
      title: "Voice Order",
      listening: "Listening...",
      processing: "Processing...",
      tapToSpeak: "Tap to speak",
      speakNow: "Speak now",
      hearingYou: "I'm hearing you...",
      foundItems: "Found items",
      confirm: "Confirm Order",
      tryAgain: "Try Again",
      cancel: "Cancel",
      itemsDetected: "Items Detected",
      reviewAndEdit: "Review and edit before adding to cart.",
      noItems: "No items in this voice order.",
      goBack: "Go Back",
      totalValue: "Total Value",
      addAllToCart: "Add All to Cart",
    },

    vouchers: {
      title: "Vouchers",
      available: "Available",
      used: "Used",
      expired: "Expired",
      applyVoucher: "Apply Voucher",
      removeVoucher: "Remove Voucher",
      voucherCode: "Voucher Code",
      enterCode: "Enter voucher code",
      discount: "Discount",
      validUntil: "Valid Until",
      minPurchase: "Minimum Purchase",
      termsAndConditions: "Terms & Conditions",
      noVouchers: "No vouchers available",
      myRewards: "My Rewards",
      history: "History",
      copy: "COPY",
      copied: "Copied",
      voucherReady: "Voucher code ready to use!",
      noVouchersFound: "No vouchers found",
    },

    help: {
      title: "Help Center",
      searchHelp: "Search for help...",
      faq: "Frequently Asked Questions",
      contactSupport: "Contact Support",
      reportIssue: "Report an Issue",
      orderHelp: "Order Help",
      paymentHelp: "Payment Help",
      deliveryHelp: "Delivery Help",
      accountHelp: "Account Help",
      howToOrder: "How to Order",
      trackingHelp: "Tracking Help",
      refundPolicy: "Refund Policy",
    },

    chat: {
      title: "Chat",
      chatWithRider: "Chat with Rider",
      typeMessage: "Type a message...",
      sendMessage: "Send",
      attachPhoto: "Attach Photo",
      online: "Online",
      offline: "Offline",
      typing: "typing...",
    },

    about: {
      title: "About",
      version: "Version",
      description: "ZendO - Your fastest grocery delivery service",
      developer: "Developed by",
      contact: "Contact Us",
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms of Service",
      licenses: "Open Source Licenses",
    },

    admin: {
      title: "Admin Dashboard",
      dashboard: "Dashboard",
      overview: "Overview",
      totalOrders: "Total Orders",
      totalRevenue: "Total Revenue",
      activeUsers: "Active Users",
      pendingOrders: "Pending Orders",
      manageProducts: "Manage Products",
      manageUsers: "Manage Users",
      manageOrders: "Manage Orders",
      reports: "Reports",
      settings: "Settings",
    },

    picker: {
      title: "Picker Dashboard",
      dashboard: "Dashboard",
      assignedOrders: "Assigned Orders",
      completedToday: "Completed Today",
      startPicking: "Start Picking",
      markComplete: "Mark Complete",
      itemsList: "Items List",
      scanBarcode: "Scan Barcode",
      inventory: "Inventory",
      realTimeSync: "Real-time Sync Active",
      addProduct: "Add",
      editProduct: "Edit",
      newProduct: "New Product",
      productName: "Product Name",
      productNamePlaceholder: "e.g. Indomie Goreng",
      pricePlaceholder: "e.g. 3500",
      tapToUpload: "Tap to upload photo",
      saveProduct: "Save Product",
      discardChanges: "Discard Changes",
      noProductsFound: "No products found",
      productAdded: "Product Added",
      productUpdated: "Product Updated",
    },

    driver: {
      title: "Driver Dashboard",
      dashboard: "Dashboard",
      availableDeliveries: "Available Deliveries",
      activeDelivery: "Active Delivery",
      completedToday: "Completed Today",
      acceptDelivery: "Accept Delivery",
      pickupLocation: "Pickup Location",
      deliveryLocation: "Delivery Location",
      navigate: "Navigate",
      markDelivered: "Mark as Delivered",
      earnings: "Today's Earnings",
    },

    errors: {
      networkError: "Network error. Please check your connection.",
      serverError: "Server error. Please try again later.",
      notFound: "Not found",
      unauthorized: "Unauthorized access",
      sessionExpired: "Session expired. Please sign in again.",
      tryAgain: "Please try again",
      somethingWrong: "Something went wrong",
      couldNotAddToCart: "Could not add to cart",
      couldNotGetLocation: "Could not get current location.",
      couldNotSaveAddress: "Could not save address.",
      saveFailed: "Save failed",
    },

    success: {
      orderPlaced: "Order placed successfully!",
      orderCancelled: "Order cancelled",
      addressSaved: "Address saved successfully",
      addressDeleted: "Address deleted",
      profileUpdated: "Profile updated successfully",
      paymentSuccess: "Payment successful",
    },

    orderSuccess: {
      title: "Order Successful",
      orderConfirmed: "Your order has been confirmed",
      minutes: "minutes",
      trackOrder: "Track Order",
      backToHome: "Back to Home",
    },

    receipt: {
      printReceipt: "🖨️ Print Receipt",
      orderInformation: "Order Information",
      orderNumber: "Order Number",
      orderId: "Order ID",
      date: "Date",
      store: "Store",
      customerDetails: "Customer Details",
      name: "Name",
      phone: "Phone",
      email: "Email",
      orderItems: "Order Items",
      product: "Product",
      quantity: "Qty",
      subtotal: "Subtotal",
      deliveryFee: "Delivery Fee",
      total: "TOTAL",
      thankYou: "Thank you for your order!",
      trustedService: "AmanMart - Your trusted quick delivery service",
      printFailed: "Failed to print receipt",
      sharingNotAvailable: "Sharing is not available on this device",
    },
  },

  id: {
    common: {
      loading: "Memuat...",
      error: "Kesalahan",
      retry: "Coba Lagi",
      cancel: "Batal",
      save: "Simpan",
      edit: "Edit",
      delete: "Hapus",
      confirm: "Konfirmasi",
      back: "Kembali",
      next: "Lanjut",
      done: "Selesai",
      close: "Tutup",
      search: "Cari",
      filter: "Filter",
      sort: "Urutkan",
      apply: "Terapkan",
      reset: "Reset",
      yes: "Ya",
      no: "Tidak",
      ok: "OK",
      add: "Tambah",
      remove: "Hapus",
      update: "Perbarui",
      submit: "Kirim",
      proceed: "Lanjutkan",
    },

    account: {
      title: "Akun",
      myAccount: "Akun Saya",
      support: "Dukungan",
      settings: "Pengaturan",
      noPhone: "Tidak ada nomor telepon",
      savedAddresses: "Alamat Tersimpan",
      paymentMethods: "Metode Pembayaran",
      myVouchers: "Voucher Saya",
      helpCenter: "Pusat Bantuan",
      chatSupport: "Chat Dukungan",
      notifications: "Notifikasi",
      language: "Bahasa",
      about: "Tentang",
      storeDashboard: "Dashboard Toko",
      logout: "Keluar",
    },

    onboarding: {
      welcome: "Selamat Datang di ZendO",
      getStarted: "Mulai",
      skip: "Lewati",
      next: "Lanjut",
      slide1Title: "Pengiriman Cepat",
      slide1Description: "Dapatkan belanjaan Anda dalam hitungan menit",
      slide2Title: "Pilihan Lengkap",
      slide2Description: "Pilih dari ribuan produk segar",
      slide3Title: "Pemesanan Mudah",
      slide3Description: "Pesan dengan beberapa ketukan atau gunakan suara",
    },

    auth: {
      signIn: "Masuk",
      signUp: "Daftar",
      signOut: "Keluar",
      phoneNumber: "Nomor Telepon",
      enterPhone: "Masukkan nomor telepon Anda",
      enterOTP: "Masukkan OTP",
      verifyOTP: "Verifikasi OTP",
      resendOTP: "Kirim Ulang OTP",
      continueWithPhone: "Lanjutkan dengan Telepon",
      invalidPhone: "Silakan masukkan nomor telepon yang valid",
      invalidOTP: "OTP tidak valid",
    },

    home: {
      title: "Beranda",
      searchPlaceholder: "Cari produk...",
      categories: "Kategori",
      featuredProducts: "Produk Unggulan",
      popularProducts: "Produk Populer",
      nearbyStores: "Toko Terdekat",
      viewAll: "Lihat Semua",
      deliveryTo: "Kirim ke",
      changeLocation: "Ubah Lokasi",
    },

    categories: {
      title: "Kategori",
      all: "Semua",
      fresh: "Produk Segar",
      dairy: "Susu & Telur",
      bakery: "Roti",
      beverages: "Minuman",
      snacks: "Camilan",
      household: "Rumah Tangga",
      personal: "Perawatan Pribadi",
      searchPlaceholder: "Cari kategori...",
      noResults: "Tidak ada hasil",
      noResultsDescription: "Coba kata kunci lain",
    },

    products: {
      addToCart: "Tambah ke Keranjang",
      outOfStock: "Habis",
      inStock: "Tersedia",
      quantity: "Jumlah",
      price: "Harga",
      description: "Deskripsi",
      details: "Detail",
      reviews: "Ulasan",
      rating: "Rating",
      noReviews: "Belum ada ulasan",
      addToBasket: "Tambah ke Keranjang",
      totalPrice: "Total Harga",
      currentLocation: "Lokasi Saat Ini",
      nutritionFacts: "Informasi Nutrisi",
      labelThisPlace: "Beri Label Tempat Ini",
      noteForDriver: "Catatan untuk Pengemudi (Opsional)",
      premiumSelection: "Pilihan Premium",
      stockAvailable: "TERSEDIA",
    },

    cart: {
      title: "Keranjang",
      empty: "Keranjang Anda kosong",
      emptyDescription: "Tambahkan item untuk memulai",
      startShopping: "Mulai Belanja",
      subtotal: "Subtotal",
      deliveryFee: "Biaya Pengiriman",
      serviceFee: "Biaya Layanan",
      discount: "Diskon",
      total: "Total",
      proceedToCheckout: "Lanjut ke Pembayaran",
      removeItem: "Hapus Item",
      updateQuantity: "Perbarui Jumlah",
    },

    checkout: {
      title: "Pembayaran",
      deliveryAddress: "Alamat Pengiriman",
      changeAddress: "Ubah Alamat",
      addAddress: "Tambah Alamat",
      paymentMethod: "Metode Pembayaran",
      selectPayment: "Pilih Metode Pembayaran",
      orderSummary: "Ringkasan Pesanan",
      placeOrder: "Buat Pesanan",
      processing: "Memproses...",
      orderNotes: "Catatan Pesanan",
      addNotes: "Tambahkan catatan untuk pengiriman",
    },

    orders: {
      title: "Pesanan",
      myOrders: "Pesanan Saya",
      active: "Aktif",
      completed: "Selesai",
      cancelled: "Dibatalkan",
      orderNumber: "Pesanan #",
      orderDate: "Tanggal Pesanan",
      orderStatus: "Status",
      trackOrder: "Lacak Pesanan",
      viewDetails: "Lihat Detail",
      cancelOrder: "Batalkan Pesanan",
      reorder: "Pesan Lagi",
      noOrders: "Belum ada pesanan",
      noOrdersDescription: "Pesanan Anda akan muncul di sini",
      history: "Riwayat",
      trackingStatus: "STATUS PELACAKAN",
      arrivingSoon: "SEGERA TIBA",
      
      status: {
        pending: "MENUNGGU",
        confirmed: "MENYIAPKAN",
        preparing: "MENYIAPKAN",
        ready: "Siap Diambil",
        outForDelivery: "Sedang Dikirim",
        delivered: "TERKIRIM",
        cancelled: "Dibatalkan",
        created: "MENUNGGU",
        picking: "MENGEMAS",
        packing: "MENGEMAS",
        packed: "SIAP DIKIRIM",
        delivering: "DALAM PERJALANAN",
        readyToGo: "SIAP DIKIRIM",
        onTheWay: "DALAM PERJALANAN",
      },
    },

    tracking: {
      title: "Lacak Pesanan",
      estimatedArrival: "Perkiraan Tiba",
      trackingNumber: "Nomor Pelacakan",
      driverInfo: "Informasi Pengemudi",
      contactDriver: "Hubungi Pengemudi",
      callDriver: "Telepon Pengemudi",
      chatWithDriver: "Chat dengan Pengemudi",
      orderPlaced: "Pesanan Dibuat",
      orderConfirmed: "Pesanan Dikonfirmasi",
      beingPrepared: "Sedang Disiapkan",
      outForDelivery: "Sedang Dikirim",
      delivered: "Terkirim",
      pickingItems: "Mengambil Item",
      readyForPickup: "Siap untuk Dijemput",
      onTheWay: "Dalam Perjalanan",
      searchingForDriver: "Mencari pengemudi...",
      yourDeliveryLocation: "Lokasi pengiriman Anda",
      driverAt: "Pengemudi di:",
      orderSummary: "Ringkasan Pesanan",
      totalPayment: "Total Pembayaran",
      kmAway: "km jauhnya",
      arrivingSoon: "Segera Tiba",
      pin: "PIN",
    },

    profile: {
      title: "Profil",
      myProfile: "Profil Saya",
      editProfile: "Edit Profil",
      personalInfo: "Informasi Pribadi",
      name: "Nama",
      email: "Email",
      phone: "Telepon",
      addresses: "Alamat",
      savedAddresses: "Alamat Tersimpan",
      addNewAddress: "Tambah Alamat Baru",
      settings: "Pengaturan",
      notifications: "Notifikasi",
      language: "Bahasa",
      theme: "Tema",
      privacy: "Privasi",
      termsOfService: "Syarat Layanan",
      helpCenter: "Pusat Bantuan",
      about: "Tentang",
      version: "Versi",
      logout: "Keluar",
    },

    notifications: {
      title: "Notifikasi",
      markAllRead: "Tandai Semua Dibaca",
      clearAll: "Hapus Semua",
      noNotifications: "Tidak ada notifikasi",
      noNotificationsDescription: "Anda sudah melihat semuanya!",
      today: "Hari Ini",
      yesterday: "Kemarin",
      earlier: "Sebelumnya",
      orderUpdate: "Update Pesanan",
      promotion: "Promosi",
      system: "Sistem",
      settings: "Pengaturan Notifikasi",
      orderUpdates: "Update Pesanan",
      orderUpdatesDesc: "Perubahan status dan progres pengiriman",
      chatMessages: "Pesan Chat",
      chatMessagesDesc: "Peringatan untuk pesan baru dari pengemudi Anda",
      chatMessagesDescDriver: "Peringatan untuk pesan baru dari pelanggan",
      deliveryAlerts: "Peringatan Pengiriman",
      deliveryAlertsDesc: "Update lokasi real-time",
      deliveryAlertsDescDriver: "Peluang pengiriman baru",
      promotions: "Promosi",
      promotionsDesc: "Penawaran khusus dan diskon eksklusif",
      pushNotificationsOn: "Notifikasi Push Aktif",
      notificationsOff: "Notifikasi Dinonaktifkan",
      pushStatusOn: "Anda menerima semua update pesanan & chat.",
      pushStatusOff: "Aktifkan akses untuk mendapat peringatan pengiriman real-time.",
      enableAccess: "Aktifkan Akses",
      enableAccessMessage: "Silakan izinkan notifikasi di pengaturan terlebih dahulu.",
      enable: "Aktifkan",
      fix: "Perbaiki",
      preferences: "PREFERENSI",
      securityNote: "Peringatan sistem terkait keamanan akun tidak dapat dinonaktifkan.",
    },

    language: {
      title: "Bahasa",
      selectLanguage: "Pilih Bahasa",
      current: "Saat Ini",
      english: "Inggris",
      indonesian: "Indonesia",
      changeLanguageNote: "Aplikasi akan menggunakan bahasa yang Anda pilih untuk semua konten.",
    },

    address: {
      title: "Alamat",
      addAddress: "Tambah Alamat",
      editAddress: "Edit Alamat",
      deleteAddress: "Hapus Alamat",
      setAsDefault: "Jadikan Default",
      addressLabel: "Label",
      home: "Rumah",
      work: "Kantor",
      other: "Lainnya",
      streetAddress: "Alamat Jalan",
      city: "Kota",
      state: "Provinsi",
      postalCode: "Kode Pos",
      country: "Negara",
      saveAddress: "Simpan Alamat",
      deleteConfirm: "Apakah Anda yakin ingin menghapus alamat ini?",
      deliveryAddress: "Alamat Pengiriman",
      currentLocation: "Lokasi Saat Ini",
      useGPS: "Gunakan GPS untuk pengiriman yang presisi",
      useGPSDesc: "Gunakan GPS untuk pengiriman yang presisi",
      orSearch: "ATAU CARI",
      searchPlaceholder: "Cari area, jalan atau landmark...",
      labelPlace: "Beri Label Tempat Ini",
      labelPlaceholder: "mis. Rumah, Kantor Saya, Rumah Ibu",
      noteForDriver: "Catatan untuk Pengemudi (Opsional)",
      noteForDriverPlaceholder: "Kode gerbang, warna bangunan, nomor lantai...",
      savedAddress: "Alamat Tersimpan",
      confirmDeliveryAddress: "Konfirmasi Alamat Pengiriman",
    },

    voiceOrder: {
      title: "Pesan Suara",
      listening: "Mendengarkan...",
      processing: "Memproses...",
      tapToSpeak: "Ketuk untuk bicara",
      speakNow: "Bicara sekarang",
      hearingYou: "Saya mendengar Anda...",
      foundItems: "Item ditemukan",
      confirm: "Konfirmasi Pesanan",
      tryAgain: "Coba Lagi",
      cancel: "Batal",
      itemsDetected: "Item Terdeteksi",
      reviewAndEdit: "Tinjau dan edit sebelum menambahkan ke keranjang.",
      noItems: "Tidak ada item dalam pesanan suara ini.",
      goBack: "Kembali",
      totalValue: "Total Nilai",
      addAllToCart: "Tambahkan Semua ke Keranjang",
    },

    vouchers: {
      title: "Voucher",
      available: "Tersedia",
      used: "Digunakan",
      expired: "Kedaluwarsa",
      applyVoucher: "Gunakan Voucher",
      removeVoucher: "Hapus Voucher",
      voucherCode: "Kode Voucher",
      enterCode: "Masukkan kode voucher",
      discount: "Diskon",
      validUntil: "Berlaku Hingga",
      minPurchase: "Pembelian Minimum",
      termsAndConditions: "Syarat & Ketentuan",
      noVouchers: "Tidak ada voucher tersedia",
      myRewards: "Hadiah Saya",
      history: "Riwayat",
      copy: "SALIN",
      copied: "Disalin",
      voucherReady: "Kode voucher siap digunakan!",
      noVouchersFound: "Tidak ada voucher ditemukan",
    },

    help: {
      title: "Pusat Bantuan",
      searchHelp: "Cari bantuan...",
      faq: "Pertanyaan yang Sering Diajukan",
      contactSupport: "Hubungi Dukungan",
      reportIssue: "Laporkan Masalah",
      orderHelp: "Bantuan Pesanan",
      paymentHelp: "Bantuan Pembayaran",
      deliveryHelp: "Bantuan Pengiriman",
      accountHelp: "Bantuan Akun",
      howToOrder: "Cara Memesan",
      trackingHelp: "Bantuan Pelacakan",
      refundPolicy: "Kebijakan Pengembalian",
    },

    chat: {
      title: "Chat",
      chatWithRider: "Chat dengan Pengemudi",
      typeMessage: "Ketik pesan...",
      sendMessage: "Kirim",
      attachPhoto: "Lampirkan Foto",
      online: "Online",
      offline: "Offline",
      typing: "mengetik...",
    },

    about: {
      title: "Tentang",
      version: "Versi",
      description: "ZendO - Layanan pengiriman belanja tercepat Anda",
      developer: "Dikembangkan oleh",
      contact: "Hubungi Kami",
      privacyPolicy: "Kebijakan Privasi",
      termsOfService: "Syarat Layanan",
      licenses: "Lisensi Open Source",
    },

    admin: {
      title: "Dashboard Admin",
      dashboard: "Dashboard",
      overview: "Ringkasan",
      totalOrders: "Total Pesanan",
      totalRevenue: "Total Pendapatan",
      activeUsers: "Pengguna Aktif",
      pendingOrders: "Pesanan Menunggu",
      manageProducts: "Kelola Produk",
      manageUsers: "Kelola Pengguna",
      manageOrders: "Kelola Pesanan",
      reports: "Laporan",
      settings: "Pengaturan",
    },

    picker: {
      title: "Dashboard Picker",
      dashboard: "Dashboard",
      assignedOrders: "Pesanan Ditugaskan",
      completedToday: "Selesai Hari Ini",
      startPicking: "Mulai Mengambil",
      markComplete: "Tandai Selesai",
      itemsList: "Daftar Item",
      scanBarcode: "Pindai Barcode",
      inventory: "Inventaris",
      realTimeSync: "Sinkronisasi Real-time Aktif",
      addProduct: "Tambah",
      editProduct: "Edit",
      newProduct: "Produk Baru",
      productName: "Nama Produk",
      productNamePlaceholder: "mis. Indomie Goreng",
      pricePlaceholder: "mis. 3500",
      tapToUpload: "Ketuk untuk unggah foto",
      saveProduct: "Simpan Produk",
      discardChanges: "Buang Perubahan",
      noProductsFound: "Tidak ada produk ditemukan",
      productAdded: "Produk Ditambahkan",
      productUpdated: "Produk Diperbarui",
    },

    driver: {
      title: "Dashboard Pengemudi",
      dashboard: "Dashboard",
      availableDeliveries: "Pengiriman Tersedia",
      activeDelivery: "Pengiriman Aktif",
      completedToday: "Selesai Hari Ini",
      acceptDelivery: "Terima Pengiriman",
      pickupLocation: "Lokasi Penjemputan",
      deliveryLocation: "Lokasi Pengiriman",
      navigate: "Navigasi",
      markDelivered: "Tandai Terkirim",
      earnings: "Penghasilan Hari Ini",
    },

    errors: {
      networkError: "Kesalahan jaringan. Periksa koneksi Anda.",
      serverError: "Kesalahan server. Silakan coba lagi nanti.",
      notFound: "Tidak ditemukan",
      unauthorized: "Akses tidak sah",
      sessionExpired: "Sesi berakhir. Silakan masuk lagi.",
      tryAgain: "Silakan coba lagi",
      somethingWrong: "Terjadi kesalahan",
      couldNotAddToCart: "Tidak dapat menambahkan ke keranjang",
      couldNotGetLocation: "Tidak dapat mendapatkan lokasi saat ini.",
      couldNotSaveAddress: "Tidak dapat menyimpan alamat.",
      saveFailed: "Penyimpanan gagal",
    },

    success: {
      orderPlaced: "Pesanan berhasil dibuat!",
      orderCancelled: "Pesanan dibatalkan",
      addressSaved: "Alamat berhasil disimpan",
      addressDeleted: "Alamat dihapus",
      profileUpdated: "Profil berhasil diperbarui",
      paymentSuccess: "Pembayaran berhasil",
    },

    orderSuccess: {
      title: "Pesanan Berhasil",
      orderConfirmed: "Pesanan Anda telah dikonfirmasi",
      minutes: "menit",
      trackOrder: "Lacak Pesanan",
      backToHome: "Kembali ke Beranda",
    },

    receipt: {
      printReceipt: "🖨️ Cetak Struk",
      orderInformation: "Informasi Pesanan",
      orderNumber: "Nomor Pesanan",
      orderId: "ID Pesanan",
      date: "Tanggal",
      store: "Toko",
      customerDetails: "Detail Pelanggan",
      name: "Nama",
      phone: "Telepon",
      email: "Email",
      orderItems: "Item Pesanan",
      product: "Produk",
      quantity: "Jml",
      subtotal: "Subtotal",
      deliveryFee: "Biaya Pengiriman",
      total: "TOTAL",
      thankYou: "Terima kasih atas pesanan Anda!",
      trustedService: "AmanMart - Layanan pengiriman cepat terpercaya Anda",
      printFailed: "Gagal mencetak struk",
      sharingNotAvailable: "Berbagi tidak tersedia di perangkat ini",
    },
  },
};