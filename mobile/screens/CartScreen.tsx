import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image
} from 'react-native';
import { Trash2, Plus, Minus } from 'lucide-react';

const CartScreen = ({ cart, updateQuantity, removeItem }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>YOUR CARGO IS EMPTY</Text>
        <TouchableOpacity style={styles.shopButton}>
          <Text style={styles.shopButtonText}>START SHOPPING</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.itemList}>
        {cart.map(item => (
          <View key={item.id} style={styles.cartItem}>
            <Image 
              source={{ uri: item.image || `https://picsum.photos/seed/${item.name}/100/100` }} 
              style={styles.itemImage}
            />
            <div style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  style={styles.qtyBtn}
                >
                  <Minus size={16} color="white" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  style={styles.qtyBtn}
                >
                  <Plus size={16} color="white" />
                </TouchableOpacity>
              </View>
            </div>
            <TouchableOpacity onPress={() => removeItem(item.id)}>
              <Trash2 size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutButton}>
          <Text style={styles.checkoutText}>PROCEED TO CHECKOUT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  shopButton: {
    backgroundColor: '#D4FF00',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 20,
  },
  shopButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  itemList: {
    flex: 1,
    padding: 20,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 15,
  },
  itemName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemPrice: {
    color: '#D4FF00',
    fontSize: 14,
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    color: 'white',
    marginHorizontal: 15,
    fontSize: 14,
  },
  footer: {
    padding: 20,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  totalValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
  },
  checkoutButton: {
    backgroundColor: '#D4FF00',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  checkoutText: {
    color: 'black',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
});

export default CartScreen;
