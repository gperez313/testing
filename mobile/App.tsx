import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { ShoppingBag, User, Home, MapPin, Truck } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

import HomeScreen from './screens/HomeScreen';
import CartScreen from './screens/CartScreen';
import DriverOrdersScreen from './screens/DriverOrdersScreen';
import DriverDeliveryDetailScreen from './screens/DriverDeliveryDetailScreen';
import DriverScannerScreen from './screens/DriverScannerScreen';

// Mocking the backend URL for now
const BACKEND_URL = 'https://ais-dev-hj5mg4pm3enarkbaetjhhz-645930850573.us-east1.run.app';

export default function MobileApp() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Mock user role - in a real app, this would come from auth
  const [userRole, setUserRole] = useState('DRIVER'); // OWNER, DRIVER, or CUSTOMER
  const [socket, setSocket] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/products`);
      const data = await res.json();
      const productList = Array.isArray(data) ? data : data.products || [];
      setProducts(productList);
      await AsyncStorage.setItem('cached_products', JSON.stringify(productList));
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders`);
      const data = await res.json();
      const orderList = Array.isArray(data) ? data : data.orders || [];
      setOrders(orderList);
      await AsyncStorage.setItem('cached_orders', JSON.stringify(orderList));
    } catch (err) {
      console.error('Fetch orders error:', err);
    }
  }, []);

  // Initialize Socket.io
  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    
    // We still use state for socket so it can be passed to children and trigger re-renders if needed
    // but we set it asynchronously to avoid cascading render warning
    Promise.resolve().then(() => {
      setSocket(newSocket);
    });

    newSocket.on('connect', () => {
      console.log('Mobile connected to socket');
      setIsOffline(false);
      // Join user room if we had a userId
      // newSocket.emit('join', `user_${userId}`);
      if (userRole === 'DRIVER') {
        newSocket.emit('join', 'drivers');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Mobile disconnected from socket');
      setIsOffline(true);
    });

    newSocket.on('connect_error', () => {
      setIsOffline(true);
    });

    newSocket.on('order:new', (newOrder) => {
      console.log('New order received via socket:', newOrder);
      // Refresh orders or add to list
      fetchOrders();
    });

    newSocket.on('order:updated', (updatedOrder) => {
      console.log('Order updated via socket:', updatedOrder);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    return () => newSocket.close();
  }, [userRole, fetchOrders]);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedProducts = await AsyncStorage.getItem('cached_products');
        const cachedOrders = await AsyncStorage.getItem('cached_orders');
        
        if (cachedProducts) setProducts(JSON.parse(cachedProducts));
        if (cachedOrders) setOrders(JSON.parse(cachedOrders));
      } catch (err) {
        console.error('Error loading cached data:', err);
      }
    };
    
    loadCachedData();
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchOrders()]);
    setLoading(false);
  }, [fetchProducts, fetchOrders]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchInitialData();
    });
  }, [fetchInitialData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchOrders()]);
    setRefreshing(false);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateOrderStatus = async (orderId, status, extraData = {}) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status,
          ...extraData
        })
      });
      
      const data = await res.json();
      if (data.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
        
        // Emit local update for immediate feedback if socket is available
        if (socket) {
          socket.emit('order:status:local_update', { orderId, status });
        }
      }
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const renderContent = () => {
    if (isScanning && selectedOrder) {
      return (
        <DriverScannerScreen 
          expectedItems={selectedOrder.items || []}
          onScan={(scanned) => {
            console.log('Scanned items:', scanned);
            updateOrderStatus(selectedOrder.id, 'PICKED_UP', { driverScannedItems: scanned });
            setIsScanning(false);
          }}
          onClose={() => setIsScanning(false)}
        />
      );
    }

    if (selectedOrder) {
      return (
        <DriverDeliveryDetailScreen 
          order={selectedOrder}
          socket={socket}
          onBack={() => setSelectedOrder(null)}
          onUpdateStatus={updateOrderStatus}
          onOpenScanner={() => setIsScanning(true)}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen products={products} addToCart={addToCart} />;
      case 'cart':
        return (
          <CartScreen 
            cart={cart} 
            updateQuantity={updateQuantity} 
            removeItem={removeItem} 
          />
        );
      case 'driver':
        return (
          <DriverOrdersScreen 
            orders={orders} 
            onSelectOrder={setSelectedOrder}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        );
      case 'profile':
        return (
          <View style={styles.centered}>
            <Text style={{ color: 'white', marginBottom: 20 }}>Profile Screen</Text>
            <TouchableOpacity 
              style={styles.roleToggle}
              onPress={() => setUserRole(userRole === 'DRIVER' ? 'CUSTOMER' : 'DRIVER')}
            >
              <Text style={styles.roleToggleText}>
                Switch to {userRole === 'DRIVER' ? 'Customer' : 'Driver'} Mode
              </Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return <HomeScreen products={products} addToCart={addToCart} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>OFFLINE MODE - USING CACHED DATA</Text>
        </View>
      )}

      {/* Header - only show if not in detail view or scanner */}
      {!selectedOrder && !isScanning && (
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>NINPO SNACKS</Text>
            <View style={styles.locationBadge}>
              <MapPin size={12} color="#D4FF00" />
              <Text style={styles.locationText}>Dearborn, MI</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => setActiveTab('profile')}>
            <User size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Bottom Navigation - only show if not in detail view or scanner */}
      {!selectedOrder && !isScanning && (
        <View style={styles.navBar}>
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => setActiveTab('home')}
          >
            <Home size={24} color={activeTab === 'home' ? '#D4FF00' : '#666'} />
            <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => setActiveTab('cart')}
          >
            <View>
              <ShoppingBag size={24} color={activeTab === 'cart' ? '#D4FF00' : '#666'} />
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.navText, activeTab === 'cart' && styles.navTextActive]}>Cart</Text>
          </TouchableOpacity>

          {(userRole === 'DRIVER' || userRole === 'OWNER') && (
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => setActiveTab('driver')}
            >
              <Truck size={24} color={activeTab === 'driver' ? '#D4FF00' : '#666'} />
              <Text style={[styles.navText, activeTab === 'driver' && styles.navTextActive]}>Driver</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.navItem}
            onPress={() => setActiveTab('profile')}
          >
            <User size={24} color={activeTab === 'profile' ? '#D4FF00' : '#666'} />
            <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingBottom: 25,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
  },
  navTextActive: {
    color: '#D4FF00',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#111',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  roleToggle: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  roleToggleText: {
    color: '#D4FF00',
    fontWeight: 'bold',
  },
  offlineBanner: {
    backgroundColor: '#ef4444',
    paddingVertical: 4,
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
