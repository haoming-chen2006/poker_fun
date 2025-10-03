import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [detections, setDetections] = useState([]);
  const [facing] = useState('back');

  // Request camera permission on mount
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission required</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Mock function to simulate card detection
  // In production, this would call your YOLO model backend
  const simulateDetection = () => {
    const cards = ['Ace of Spades', 'King of Hearts', '10 of Diamonds', 'Queen of Clubs'];
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    const confidence = (Math.random() * 0.3 + 0.7).toFixed(3); // Random confidence between 0.7-1.0

    setDetections(prev => [
      {
        id: Date.now(),
        card: randomCard,
        confidence: parseFloat(confidence),
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev.slice(0, 9) // Keep only last 10 detections
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.detectButton} onPress={simulateDetection}>
              <Text style={styles.detectButtonText}>Detect Cards</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>

      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Detected Cards</Text>
        <ScrollView style={styles.detectionList}>
          {detections.length === 0 ? (
            <Text style={styles.emptyText}>No cards detected yet</Text>
          ) : (
            detections.map((detection) => (
              <View key={detection.id} style={styles.detectionItem}>
                <View style={styles.detectionHeader}>
                  <Text style={styles.cardName}>{detection.card}</Text>
                  <Text style={styles.timestamp}>{detection.timestamp}</Text>
                </View>
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceLabel}>Confidence:</Text>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        { width: `${detection.confidence * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.confidenceText}>
                    {(detection.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
  },
  cameraContainer: {
    flex: 2,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  detectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  detectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sidebar: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderLeftWidth: 1,
    borderLeftColor: '#444',
    paddingTop: 50,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  detectionList: {
    flex: 1,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  detectionItem: {
    backgroundColor: '#333',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  detectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    color: '#aaa',
    fontSize: 14,
    marginRight: 10,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#555',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  confidenceText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 50,
  },
  permissionText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
