import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import MapView, { Polyline, Marker } from '../components/MapView';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '../services/TrackingContext';
import * as ImagePicker from 'expo-image-picker';

export default function TrackingScreen() {
  const {
    activeTrack,
    isTracking,
    startTracking,
    stopTracking,
    addCheckpoint,
    settings,
  } = useTracking();

  const [showStartModal, setShowStartModal] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [trackDescription, setTrackDescription] = useState('');
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [checkpointNote, setCheckpointNote] = useState('');
  const [checkpointPhoto, setCheckpointPhoto] = useState<string | undefined>();
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [showPointDetail, setShowPointDetail] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    if (activeTrack && activeTrack.points.length > 0) {
      const lastPoint = activeTrack.points[activeTrack.points.length - 1];
      setMapRegion({
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [activeTrack?.points]);

  const handleStartTracking = async () => {
    if (!trackName.trim()) {
      Alert.alert('Error', 'Please enter a track name');
      return;
    }

    try {
      await startTracking(trackName, trackDescription);
      setShowStartModal(false);
      setTrackName('');
      setTrackDescription('');
    } catch (error) {
      Alert.alert('Error', 'Failed to start tracking. Please check location permissions.');
    }
  };

  const handleStopTracking = () => {
    Alert.alert(
      'Stop Tracking',
      'Are you sure you want to stop tracking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopTracking();
            } catch (error) {
              Alert.alert('Error', 'Failed to stop tracking');
            }
          },
        },
      ]
    );
  };

  const handleAddCheckpoint = async () => {
    try {
      await addCheckpoint(checkpointNote, checkpointPhoto);
      setShowCheckpointModal(false);
      setCheckpointNote('');
      setCheckpointPhoto(undefined);
    } catch (error) {
      Alert.alert('Error', 'Failed to add checkpoint');
    }
  };

  const pickImage = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setCheckpointPhoto(result.assets[0].uri);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={mapRegion}
        showsUserLocation
        showsMyLocationButton
        onMarkerPress={(marker: any) => {
          const pointIndex = activeTrack?.points.findIndex(
            p => p.latitude === marker.coordinate.latitude && p.longitude === marker.coordinate.longitude
          );
          if (pointIndex !== undefined && pointIndex >= 0 && activeTrack?.points[pointIndex]) {
            setSelectedPoint(activeTrack.points[pointIndex]);
            setShowPointDetail(true);
          }
        }}
      >
        {activeTrack && activeTrack.points.length > 0 && (
          <>
            <Polyline
              coordinates={activeTrack.points.map((p) => ({
                latitude: p.latitude,
                longitude: p.longitude,
              }))}
              strokeColor="#007AFF"
              strokeWidth={3}
            />
            <Marker
              coordinate={{
                latitude: activeTrack.points[0].latitude,
                longitude: activeTrack.points[0].longitude,
              }}
              title="Start"
              pinColor="green"
            />
            {activeTrack.points.length > 1 && (
              <Marker
                coordinate={{
                  latitude: activeTrack.points[activeTrack.points.length - 1].latitude,
                  longitude: activeTrack.points[activeTrack.points.length - 1].longitude,
                }}
                title="Current"
                pinColor="blue"
              />
            )}
          </>
        )}
      </MapView>

      <View style={styles.controls}>
        {!isTracking ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setShowStartModal(true)}
          >
            <Ionicons name="play" size={32} color="white" />
            <Text style={styles.buttonText}>Start Tracking</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.statsBar}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>
                  {activeTrack ? formatDuration(Date.now() - new Date(activeTrack.startTime).getTime()) : '0:00'}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Points</Text>
                <Text style={styles.statValue}>{activeTrack?.points.length || 0}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Elevation</Text>
                <Text style={styles.statValue}>
                  {activeTrack?.points[activeTrack.points.length - 1]?.elevation?.toFixed(0) || 0}m
                </Text>
              </View>
            </View>

            {/* Point List */}
            {activeTrack && activeTrack.points.length > 0 && (
              <ScrollView style={styles.pointList} horizontal showsHorizontalScrollIndicator={false}>
                {activeTrack.points.filter(p => p.comment || p.photo).map((point, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.pointCard}
                    onPress={() => {
                      setSelectedPoint(point);
                      setShowPointDetail(true);
                    }}
                  >
                    <Ionicons name="location" size={20} color="#007AFF" />
                    <Text style={styles.pointIndex}>#{index + 1}</Text>
                    {point.photo && <Ionicons name="camera" size={16} color="#34C759" />}
                    {point.comment && <Ionicons name="text" size={16} color="#FF9500" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.checkpointButton}
                onPress={() => setShowCheckpointModal(true)}
              >
                <Ionicons name="pin" size={24} color="white" />
                <Text style={styles.buttonText}>Checkpoint</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopTracking}
              >
                <Ionicons name="stop" size={24} color="white" />
                <Text style={styles.buttonText}>Stop</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Start Tracking Modal */}
      <Modal
        visible={showStartModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStartModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start New Track</Text>

            <TextInput
              style={styles.input}
              placeholder="Track Name *"
              value={trackName}
              onChangeText={setTrackName}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={trackDescription}
              onChangeText={setTrackDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalInfo}>
              <Text style={styles.infoText}>
                Mode: {settings.mode === 'auto' ? 'Automatic' : 'Manual'}
              </Text>
              {settings.mode === 'auto' && (
                <Text style={styles.infoText}>
                  Recording every {settings.minDistance}m or {settings.minTime}s
                </Text>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowStartModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleStartTracking}
              >
                <Text style={styles.confirmButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Checkpoint Modal */}
      <Modal
        visible={showCheckpointModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckpointModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Checkpoint</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Note (optional)"
              value={checkpointNote}
              onChangeText={setCheckpointNote}
              multiline
              numberOfLines={3}
            />

            {checkpointPhoto ? (
              <View>
                <Image source={{ uri: checkpointPhoto }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                  <Ionicons name="camera" size={24} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Ionicons name="camera" size={24} color="#007AFF" />
                <Text style={styles.photoButtonText}>Add Photo</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCheckpointModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddCheckpoint}
              >
                <Text style={styles.confirmButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Point Detail Modal */}
      <Modal
        visible={showPointDetail}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPointDetail(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Point Details</Text>

            {selectedPoint && (
              <ScrollView>
                <View style={styles.pointDetailInfo}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>
                    {selectedPoint.latitude?.toFixed(6)}, {selectedPoint.longitude?.toFixed(6)}
                  </Text>
                </View>

                {selectedPoint.elevation && (
                  <View style={styles.pointDetailInfo}>
                    <Text style={styles.detailLabel}>Elevation</Text>
                    <Text style={styles.detailValue}>{selectedPoint.elevation.toFixed(0)}m</Text>
                  </View>
                )}

                {selectedPoint.timestamp && (
                  <View style={styles.pointDetailInfo}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedPoint.timestamp).toLocaleString()}
                    </Text>
                  </View>
                )}

                {selectedPoint.comment && (
                  <View style={styles.pointDetailInfo}>
                    <Text style={styles.detailLabel}>Note</Text>
                    <Text style={styles.detailValue}>{selectedPoint.comment}</Text>
                  </View>
                )}

                {selectedPoint.photo && (
                  <View style={styles.pointDetailInfo}>
                    <Text style={styles.detailLabel}>Photo</Text>
                    <Image source={{ uri: selectedPoint.photo }} style={styles.pointPhoto} />
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => setShowPointDetail(false)}
            >
              <Text style={styles.confirmButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  startButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
  },
  checkpointButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalInfo: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  photoButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
  pointList: {
    maxHeight: 80,
    marginVertical: 8,
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  pointIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pointDetailInfo: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  pointPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: 'cover',
  },
});
