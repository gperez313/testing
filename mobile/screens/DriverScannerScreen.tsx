import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions,
  Vibration,
  Platform,
  ScrollView,
  TextInput
} from 'react-native';
import { X, Zap, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

const DriverScannerScreen = ({ onScan, onClose, expectedItems = [] }) => {
  const [scannedItems, setScannedItems] = useState([]);
  const [lastScanned, setLastScanned] = useState(null);
  const [flash, setFlash] = useState(false);
  const [manualUpc, setManualUpc] = useState('');
  
  // Mock scanning for the web preview
  const handleMockScan = (upc) => {
    const item = expectedItems.find(i => i.upc === upc || i.productId === upc);
    
    if (item) {
      const alreadyScanned = scannedItems.filter(i => i.upc === upc || i.productId === upc).length;
      if (alreadyScanned < item.quantity) {
        const newScan = { ...item, scannedAt: new Date().toISOString() };
        setScannedItems(prev => [...prev, newScan]);
        setLastScanned({ success: true, name: item.name });
        if (Platform.OS !== 'web') Vibration.vibrate(100);
      } else {
        setLastScanned({ success: false, message: 'Already fully scanned' });
      }
    } else {
      setLastScanned({ success: false, message: 'Item not in order' });
    }
    
    setTimeout(() => setLastScanned(null), 2000);
  };

  const handleScanAll = () => {
    const allScanned = [];
    expectedItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        allScanned.push({ ...item, scannedAt: new Date().toISOString() });
      }
    });
    setScannedItems(allScanned);
    setLastScanned({ success: true, name: 'All items scanned' });
    setTimeout(() => setLastScanned(null), 2000);
  };

  const totalExpected = expectedItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalScanned = scannedItems.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Items</Text>
        <TouchableOpacity onPress={() => setFlash(!flash)} style={styles.flashButton}>
          <Zap size={24} color={flash ? '#D4FF00' : 'white'} />
        </TouchableOpacity>
      </View>

      <View style={styles.scannerContainer}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          
          <View style={styles.scanLine} />
        </View>

        {lastScanned && (
          <View style={[styles.feedback, lastScanned.success ? styles.successFeedback : styles.errorFeedback]}>
            {lastScanned.success ? (
              <CheckCircle2 size={20} color="white" />
            ) : (
              <AlertCircle size={20} color="white" />
            )}
            <Text style={styles.feedbackText}>
              {lastScanned.success ? `Scanned: ${lastScanned.name}` : lastScanned.message}
            </Text>
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>Position barcode within the frame</Text>
          <Text style={styles.progressText}>{totalScanned} / {totalExpected} Items Scanned</Text>
          
          <TouchableOpacity style={styles.scanAllButton} onPress={handleScanAll}>
            <Text style={styles.scanAllText}>SCAN ALL (DEMO)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.manualInputContainer}>
          <TextInput
            style={styles.manualInput}
            placeholder="Enter UPC manually"
            placeholderTextColor="#666"
            value={manualUpc}
            onChangeText={setManualUpc}
          />
          <TouchableOpacity 
            style={styles.manualAddButton}
            onPress={() => {
              handleMockScan(manualUpc);
              setManualUpc('');
            }}
          >
            <Plus size={20} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemList}>
          {expectedItems.map((item, idx) => {
            const scannedCount = scannedItems.filter(si => si.upc === item.upc || si.productId === item.productId).length;
            const isDone = scannedCount >= item.quantity;
            
            return (
              <TouchableOpacity 
                key={idx} 
                style={[styles.itemChip, isDone && styles.itemChipDone]}
                onPress={() => handleMockScan(item.upc || item.productId)}
              >
                <Text style={[styles.itemChipText, isDone && styles.itemChipTextDone]}>
                  {item.name} ({scannedCount}/{item.quantity})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        <TouchableOpacity 
          style={[styles.doneButton, totalScanned < totalExpected && styles.doneButtonDisabled]}
          onPress={() => onScan(scannedItems)}
          disabled={totalScanned < totalExpected}
        >
          <Text style={styles.doneButtonText}>FINISH SCANNING</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    zIndex: 10,
  },
  closeButton: {
    padding: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  flashButton: {
    padding: 10,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinder: {
    width: Dimensions.get('window').width * 0.7,
    height: Dimensions.get('window').width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#D4FF00',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#D4FF00',
    opacity: 0.5,
  },
  instructions: {
    marginTop: 40,
    alignItems: 'center',
  },
  instructionText: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 10,
  },
  progressText: {
    color: '#D4FF00',
    fontSize: 20,
    fontWeight: '900',
  },
  scanAllButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4FF00',
  },
  scanAllText: {
    color: '#D4FF00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  manualInputContainer: {
    flexDirection: 'row',
    marginTop: 30,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 300,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    color: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  manualAddButton: {
    backgroundColor: '#D4FF00',
    padding: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedback: {
    position: 'absolute',
    top: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  successFeedback: {
    backgroundColor: '#10b981',
  },
  errorFeedback: {
    backgroundColor: '#ef4444',
  },
  feedbackText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  footer: {
    padding: 20,
    backgroundColor: '#111',
  },
  itemList: {
    marginBottom: 20,
  },
  itemChip: {
    backgroundColor: '#222',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  itemChipDone: {
    backgroundColor: '#10b98122',
    borderColor: '#10b981',
  },
  itemChipText: {
    color: '#AAA',
    fontSize: 12,
  },
  itemChipTextDone: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#D4FF00',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  doneButtonText: {
    color: 'black',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  }
});

export default DriverScannerScreen;
