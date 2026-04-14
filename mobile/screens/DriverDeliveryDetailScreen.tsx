import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Linking,
  Platform
} from 'react-native';
import { 
  ArrowLeft, 
  MapPin, 
  Package, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  Scan
} from 'lucide-react';

const DriverDeliveryDetailScreen = ({ order, socket, onBack, onUpdateStatus, onOpenScanner }) => {
  useEffect(() => {
    if (!socket || !order || order.status !== 'PICKED_UP') return;

    // Simulate location tracking
    const interval = setInterval(() => {
      // Mock coordinates moving towards a destination
      const lat = 40.7128 + (Math.random() - 0.5) * 0.01;
      const lng = -74.0060 + (Math.random() - 0.5) * 0.01;
      
      console.log('Emitting driver location:', { lat, lng });
      socket.emit('driver:location:update', {
        orderId: order.id,
        coords: { lat, lng }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [socket, order]);

  if (!order) return null;

  const handleNavigate = () => {
    const address = encodeURIComponent(order.address || '');
    const url = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `geo:0,0?q=${address}`,
      web: `https://www.google.com/maps/search/?api=1&query=${address}`
    });
    if (url) Linking.openURL(url);
  };

  const renderActionButtons = () => {
    switch (order.status) {
      case 'PAID':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => onUpdateStatus(order.id, 'PICKED_UP')}
          >
            <Package size={20} color="black" />
            <Text style={styles.primaryButtonText}>CONFIRM PICKUP</Text>
          </TouchableOpacity>
        );
      case 'PICKED_UP':
        return (
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton, { flex: 1, marginRight: 10 }]}
              onPress={handleNavigate}
            >
              <Navigation size={20} color="white" />
              <Text style={styles.secondaryButtonText}>NAVIGATE</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton, { flex: 1 }]}
              onPress={() => onUpdateStatus(order.id, 'ARRIVING')}
            >
              <CheckCircle2 size={20} color="black" />
              <Text style={styles.primaryButtonText}>ARRIVED</Text>
            </TouchableOpacity>
          </View>
        );
      case 'ARRIVING':
        return (
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton, { flex: 1, marginRight: 10 }]}
              onPress={onOpenScanner}
            >
              <Scan size={20} color="white" />
              <Text style={styles.secondaryButtonText}>SCAN ITEMS</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.successButton, { flex: 1 }]}
              onPress={() => onUpdateStatus(order.id, 'COMPLETED')}
            >
              <CheckCircle2 size={20} color="white" />
              <Text style={styles.successButtonText}>COMPLETE</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusInfo}>
            <Text style={styles.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.statusLabel}>{order.status}</Text>
          </View>
          <Text style={styles.customerName}>{order.customerName || 'Guest Customer'}</Text>
        </View>

        {order.status === 'PICKED_UP' && (
          <View style={styles.trackingIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.trackingText}>Real-time tracking active</Text>
          </View>
        )}

        {/* Address Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color="#D4FF00" />
            <Text style={styles.cardTitle}>DELIVERY ADDRESS</Text>
          </View>
          <Text style={styles.addressText}>{order.address || 'Pickup at Market'}</Text>
          <TouchableOpacity style={styles.textButton} onPress={handleNavigate}>
            <Text style={styles.textButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Items Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Package size={18} color="#D4FF00" />
            <Text style={styles.cardTitle}>ITEMS ({order.items?.length || 0})</Text>
          </View>
          {order.items?.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.name || 'Unknown Item'}</Text>
            </View>
          ))}
        </View>

        {/* Notes Card */}
        {order.notes && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <AlertCircle size={18} color="#f59e0b" />
              <Text style={styles.cardTitle}>DELIVERY NOTES</Text>
            </View>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {renderActionButtons()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#D4FF00',
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  orderId: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  statusLabel: {
    color: '#D4FF00',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  customerName: {
    color: '#666',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginLeft: 8,
  },
  addressText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
  },
  textButton: {
    marginTop: 10,
  },
  textButtonText: {
    color: '#D4FF00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  itemQty: {
    color: '#D4FF00',
    fontSize: 14,
    fontWeight: 'bold',
    width: 30,
  },
  itemName: {
    color: '#AAA',
    fontSize: 14,
  },
  notesText: {
    color: '#f59e0b',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 15,
  },
  buttonGroup: {
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#D4FF00',
  },
  primaryButtonText: {
    color: 'black',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
    marginLeft: 10,
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 10,
  },
  successButton: {
    backgroundColor: '#10b981',
  },
  successButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
    marginLeft: 10,
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98122',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10b98144',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 10,
  },
  trackingText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default DriverDeliveryDetailScreen;
