import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Package, MapPin, Clock, ChevronRight } from 'lucide-react';

const DriverOrdersScreen = ({ orders, onSelectOrder, onRefresh, refreshing }) => {
  const activeOrders = orders.filter(o => 
    ['PAID', 'PICKED_UP', 'ARRIVING'].includes(o.status)
  );
  
  const availableOrders = orders.filter(o => o.status === 'PAID' && !o.driverId);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4FF00" />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVE DELIVERIES</Text>
        {activeOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active deliveries</Text>
          </View>
        ) : (
          activeOrders.map(order => (
            <TouchableOpacity 
              key={order.id} 
              style={styles.orderCard}
              onPress={() => onSelectOrder(order)}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
              
              <View style={styles.orderBody}>
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>{order.address || 'No address provided'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Package size={16} color="#666" />
                  <Text style={styles.infoText}>{order.items?.length || 0} items</Text>
                </View>
              </View>
              
              <View style={styles.orderFooter}>
                <Text style={styles.timeText}>
                  <Clock size={12} color="#666" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <ChevronRight size={20} color="#D4FF00" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AVAILABLE ORDERS</Text>
        {availableOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No new orders available</Text>
          </View>
        ) : (
          availableOrders.map(order => (
            <TouchableOpacity 
              key={order.id} 
              style={styles.orderCard}
              onPress={() => onSelectOrder(order)}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
                <Text style={styles.priceText}>${(order.total || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.orderBody}>
                <View style={styles.infoRow}>
                  <MapPin size={16} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>{order.address || 'Market Pickup'}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => onSelectOrder(order)}
              >
                <Text style={styles.acceptButtonText}>VIEW DETAILS</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'PAID': return '#3b82f6';
    case 'PICKED_UP': return '#f59e0b';
    case 'ARRIVING': return '#10b981';
    default: return '#666';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 15,
  },
  orderCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderBottomColor: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderId: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderBody: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#AAA',
    fontSize: 14,
    marginLeft: 10,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  priceText: {
    color: '#D4FF00',
    fontSize: 18,
    fontWeight: '900',
  },
  acceptButton: {
    backgroundColor: '#D4FF00',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  acceptButtonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    color: '#444',
    fontSize: 14,
  }
});

export default DriverOrdersScreen;
