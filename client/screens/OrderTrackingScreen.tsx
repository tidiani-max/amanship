import React, { useEffect, useState, useRef } from "react";

interface OrderData {
  id: string;
  orderNumber: string;
  driverName?: string;
  driverPhone?: string;
  deliveryPin: string;
  customerLat?: string;
  customerLng?: string;
  estimatedArrival?: string;
  status: string;
  items: any[];
  total: number;
}

export default function OrderTrackingScreen() {
  const [driverLocation, setDriverLocation] = useState({ lat: 13.7548, lng: 100.4990 });
  const [customerLocation] = useState({ lat: 13.7563, lng: 100.5018 });
  const [heading, setHeading] = useState(45);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Get orderId from URL params (React Router)
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId') || 'demo-order-id';

  // Fetch order details
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_DOMAIN || '';
        const response = await fetch(`${baseUrl}/api/orders/${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch order');
        
        const data = await response.json();
        setOrderData(data);
        
        console.log('📦 Order loaded:', data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch order:", error);
        setLoading(false);
      }
    };
    
    if (orderId && orderId !== 'demo-order-id') {
      fetchOrderData();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  // Poll driver location
  useEffect(() => {
    if (!orderId || orderId === 'demo-order-id') return;

    const pollDriverLocation = async () => {
      try {
        const baseUrl = process.env.EXPO_PUBLIC_DOMAIN || '';
        const response = await fetch(`${baseUrl}/api/driver/location/${orderId}`);
        const data = await response.json();

        console.log('📍 Driver location update:', data);

        if (data.hasLocation && data.location) {
          setDriverLocation({
            lat: data.location.latitude,
            lng: data.location.longitude
          });
          if (data.location.heading !== null) {
            setHeading(data.location.heading);
          }
        }
      } catch (error) {
        console.error("Failed to fetch driver location:", error);
      }
    };

    // Initial fetch
    pollDriverLocation();

    // Poll every 3 seconds
    const interval = setInterval(pollDriverLocation, 3000);

    return () => clearInterval(interval);
  }, [orderId]);

  // Update map when driver moves
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'updateDriver',
        lat: driverLocation.lat,
        lng: driverLocation.lng,
        heading: heading
      }, '*');
    }
  }, [driverLocation, heading]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚚</div>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Loading order details...</div>
        </div>
      </div>
    );
  }

  // Extract data with proper fallbacks
  const driverName = orderData?.driverName || "Driver";
  const driverPhone = orderData?.driverPhone || "";
  const orderNumber = orderData?.orderNumber || "N/A";
  const deliveryPin = orderData?.deliveryPin || "****";
  
  console.log('📋 Display Data:', {
    orderNumber,
    deliveryPin,
    driverName,
    driverPhone,
    rawOrderData: orderData
  });
  
  // Calculate ETA from estimatedArrival timestamp
  const estimatedMinutes = orderData?.estimatedArrival 
    ? Math.max(1, Math.ceil((new Date(orderData.estimatedArrival).getTime() - Date.now()) / 60000))
    : 5;

  // Use actual customer coordinates from order
  const actualCustomerLat = orderData?.customerLat 
    ? parseFloat(orderData.customerLat) 
    : customerLocation.lat;
  const actualCustomerLng = orderData?.customerLng 
    ? parseFloat(orderData.customerLng) 
    : customerLocation.lng;

  const mapHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .leaflet-container { background: #f5f5f5; }
    
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.3); opacity: 0.3; }
      100% { transform: scale(1); opacity: 0.6; }
    }
    
    .pulse-ring {
      position: absolute;
      width: 60px;
      height: 60px;
      background: rgba(255, 215, 0, 0.3);
      border-radius: 50%;
      animation: pulse 2s infinite;
      top: -5px;
      left: -5px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const customerLat = ${actualCustomerLat};
    const customerLng = ${actualCustomerLng};
    
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([customerLat, customerLng], 15);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);
    
    const customerIcon = L.divIcon({
      html: \`
        <div style="position: relative; width: 40px; height: 48px;">
          <div style="
            background: #1E88E5; 
            width: 40px; 
            height: 40px; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg);
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        </div>
      \`,
      className: '',
      iconSize: [40, 48],
      iconAnchor: [20, 48]
    });
    L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map);
    
    let driverMarker = null;
    let routeLine = null;

    function updateDriverLocation(lat, lng, heading) {
      const driverPos = [lat, lng];
      const customerPos = [customerLat, customerLng];

      if (!driverMarker) {
        const driverIcon = L.divIcon({
          html: \`
            <div style="position: relative; width: 50px; height: 50px;">
              <div class="pulse-ring"></div>
              <div id="driver-icon" style="
                position: absolute;
                width: 50px;
                height: 50px;
                transform: rotate(\${heading}deg);
                transition: transform 0.5s ease;
              ">
                <svg width="50" height="50" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="22" fill="#FFD700" stroke="white" stroke-width="4"/>
                  <g transform="translate(50, 50)">
                    <circle cx="-8" cy="8" r="4" fill="#333"/>
                    <circle cx="8" cy="8" r="4" fill="#333"/>
                    <rect x="-10" y="0" width="20" height="6" rx="2" fill="#333"/>
                    <rect x="-2" y="-8" width="4" height="10" rx="2" fill="#666"/>
                  </g>
                </svg>
              </div>
            </div>
          \`,
          className: '',
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });
        driverMarker = L.marker(driverPos, { icon: driverIcon }).addTo(map);
      } else {
        driverMarker.setLatLng(driverPos);
        const icon = document.getElementById('driver-icon');
        if (icon) {
          icon.style.transform = 'rotate(' + heading + 'deg)';
        }
      }

      if (routeLine) map.removeLayer(routeLine);
      
      routeLine = L.polyline([driverPos, customerPos], {
        color: '#FFD700',
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1
      }).addTo(map);

      const bounds = L.latLngBounds([driverPos, customerPos]);
      map.fitBounds(bounds, { 
        padding: [80, 80],
        maxZoom: 16
      });
    }
    
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'updateDriver') {
        updateDriverLocation(event.data.lat, event.data.lng, event.data.heading);
      }
    });
    
    updateDriverLocation(${driverLocation.lat}, ${driverLocation.lng}, ${heading});
  </script>
</body>
</html>
  `;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Map Section */}
      <div style={{ position: 'relative', height: '50%' }}>
        <iframe
          ref={iframeRef}
          srcDoc={mapHTML}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Delivery Map"
        />
        
        {/* GPS Accuracy Badge */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '8px 12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="22" y1="12" x2="18" y2="12"/>
            <line x1="6" y1="12" x2="2" y2="12"/>
            <line x1="12" y1="6" x2="12" y2="2"/>
            <line x1="12" y1="22" x2="12" y2="18"/>
          </svg>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#065f46' }}>GPS: ±12m</span>
        </div>
        
        {/* Speed Badge */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '8px 12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E88E5" strokeWidth="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#1E88E5' }}>24 km/h</span>
        </div>
      </div>

      {/* Bottom Panel */}
      <div style={{
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        marginTop: '-24px',
        padding: '24px',
        overflowY: 'auto',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
      }}>
        {/* Status Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#dbeafe',
            padding: '8px 16px',
            borderRadius: '20px',
            marginBottom: '12px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E88E5" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1E88E5' }}>{estimatedMinutes} min</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Rider is on the way</h2>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Order {orderNumber}</p>
          
          {/* Distance */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>2.3 km away</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span style={{ fontSize: '10px', marginTop: '4px', color: '#6b7280' }}>Confirmed</span>
            </div>
            <div style={{ width: '64px', height: '2px', backgroundColor: '#10b981', margin: '0 8px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span style={{ fontSize: '10px', marginTop: '4px', color: '#6b7280' }}>Picked Up</span>
            </div>
            <div style={{ width: '64px', height: '2px', backgroundColor: '#d1d5db', margin: '0 8px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#d1d5db'
              }} />
              <span style={{ fontSize: '10px', marginTop: '4px', color: '#6b7280' }}>Delivered</span>
            </div>
          </div>
        </div>

        {/* Driver Info Card */}
        <div style={{
          backgroundColor: '#f9fafb',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#1E88E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
              {driverName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>{driverName}</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              {driverPhone || "Flash Courier Partner"}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#1E88E5',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => {
                const chatUrl = `/chat?orderId=${orderId}`;
                window.location.href = chatUrl;
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            {driverPhone && (
              <button style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }} onClick={() => window.location.href = `tel:${driverPhone}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Delivery PIN */}
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '2px solid #10b981',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>Delivery PIN Code</p>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981', letterSpacing: '8px', margin: '0 0 8px 0' }}>{deliveryPin}</h1>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Share this code with the driver upon arrival</p>
        </div>
      </div>
    </div>
  );
}