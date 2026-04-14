import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const HomeScreen = ({ products, addToCart }) => {
  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Image 
          source={{ uri: 'https://picsum.photos/seed/snacks/800/400' }} 
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTag}>NEW ARRIVAL</Text>
          <Text style={styles.heroTitle}>Midnight Munchies</Text>
          <TouchableOpacity style={styles.heroButton}>
            <Text style={styles.heroButtonText}>SHOP NOW</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CATEGORIES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
          {['All', 'Chips', 'Drinks', 'Candy', 'Healthy'].map(cat => (
            <TouchableOpacity key={cat} style={styles.categoryChip}>
              <Text style={styles.categoryText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>POPULAR ITEMS</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.grid}>
          {products.map(product => (
            <TouchableOpacity key={product.id} style={styles.productCard}>
              <Image 
                source={{ uri: product.image || `https://picsum.photos/seed/${product.name}/300/300` }} 
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => addToCart(product)}
                >
                  <Text style={styles.addButtonText}>ADD</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  hero: {
    margin: 20,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroTag: {
    color: '#D4FF00',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  heroTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  heroButton: {
    backgroundColor: '#D4FF00',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  heroButtonText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
  },
  seeAll: {
    color: '#D4FF00',
    fontSize: 12,
  },
  categories: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 10,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 50) / 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 150,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productPrice: {
    color: '#D4FF00',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: 'white',
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
