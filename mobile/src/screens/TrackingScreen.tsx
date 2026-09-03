function getPaceDisplay(distance: number, duration: number) {
  if (!distance || !duration || distance < 10 || duration < 10000) return 'N/A';
  const pace = duration / 60000 / (distance / 1000);
  if (!isFinite(pace)) return 'N/A';
  const min = Math.floor(pace);
  const sec = Math.round((pace - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')} min/km`;
}

function makeDefaultTrackName() {
  const when = new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Outdoor track · ${when}`;
}

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
import * as Location from 'expo-location';

export default function TrackingScreen() {
  const {
    activeTrack,
    isTracking,
    isPaused,
    isOnline,
    isSyncing,
    pendingSyncCount,
    lastSyncError,
    getActiveDuration,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
    addCheckpoint,
    syncPendingData,
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
    latitude: 20,
    longitude: 0,
    latitudeDelta: 80,
    longitudeDelta: 80,
  });

  const centerOnCurrentLocation = async () => {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch {
      // TrackingContext owns permission and tracking errors. Map centering is best-effort only.
    }
  };

  useEffect(() => {
    centerOnCurrentLocation();
  }, []);

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
    const resolvedName = trackName.trim() || makeDefaultTrackName();

    try {
      await startTracking(resolvedName, trackDescription);
      await centerOnCurrentLocation();
      setShowStartModal(false);
      setTrackName('');
      setTrackDescription('');
    } catch (error) {
      Alert.alert('Location Needed', 'AllTracks needs location access when you record your outdoor activity.');
    }
  };

  const handleStopTracking = () => {
    Alert.alert(
      'Finish Track',
      'Finish and save this track?',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Finish',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopTracking();
            } catch (error) {
              Alert.alert('Error', 'Failed to finish tracking');
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
    if (meters < 1000) return `${meters.toFixed(0)}m`;
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const calculateCurrentDistance = () => {
    if (!activeTrack || activeTrack.points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < activeTrack.points.length; i++) {
      const p1 = activeTrack.points[i - 1];
      const p2 = activeTrack.points[i];
      const R = 6371e3;
      const φ1 = (p1.latitude * Math.PI) / 180;
      const φ2 = (p2.latitude * Math.PI) / 180;
      const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
      const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }
    return totalDistance;
  };

  const syncNeedsAttention = !isOnline || pendingSyncCount > 0 || Boolean(lastSyncError) || isSyncing;

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
            <View style={styles.syncStatusRow}>
              <View style={[styles.syncChip, !isOnline && styles.syncChipOffline]}>
                <Ionicons
                  name={isOnline ? (pendingSyncCount > 0 ? 'cloud-upload-outline' : 'cloud-done-outline') : 'cloud-offline-outline'}
                  size={16}
                  color={isOnline ? '#1C6AA6' : '#9A5A10'}
                />
                <Text style={[styles.syncChipText, !isOnline && styles.syncChipTextOffline]}>
                  {isSyncing
                    ? 'Syncing'
                    : !isOnline
                      ? 'Offline'
                      : pendingSyncCount > 0
                        ? `${pendingSyncCount} pending`
                        : 'Synced'}
                </Text>
              </View>

              {syncNeedsAttention && pendingSyncCount > 0 && (
                <TouchableOpacity
                  style={[styles.syncNowButton, isSyncing && styles.syncNowButtonDisabled]}
                  disabled={isSyncing || !isOnline}
                  onPress={syncPendingData}
                >
                  <Text style={styles.syncNowButtonText}>Sync now</Text>
                </TouchableOpacity>
              )}
            </View>

            {lastSyncError ? <Text style={styles.syncErrorText}>{lastSyncError}</Text> : null}

            <View style={styles.statsBar}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{formatDuration(getActiveDuration())}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{formatDistance(calculateCurrentDistance())}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Pace</Text>
                <Text style={styles.statValue}>
                  {getPaceDisplay(calculateCurrentDistance(), getActiveDuration())}
                </Text>
              </View>
            </View>

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
                <Text style={styles.buttonText}>{settings.mode === 'manual' ? 'Record Point' : 'Checkpoint'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pauseButton}
                onPress={isPaused ? resumeTracking : pauseTracking}
              >
                <Ionicons name={isPaused ? "play" : "pause"} size={24} color="white" />
                <Text style={styles.buttonText}>{isPaused ? "Resume" : "Pause"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopTracking}
              >
                <Ionicons name="checkmark" size={24} color="white" />
                <Text style={styles.buttonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

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
              placeholder="Track name (optional)"
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
              {settings.mode === 'auto' ? (
                <Text style={styles.infoText}>
                  Recording every {settings.minDistance}m or {settings.minTime}s
                </Text>
              ) : (
                <Text style={styles.infoText}>
                  GPS points are only saved when you tap Record Point.
                </Text>
              )}
              <Text style={styles.permissionHint}>
                Location access is requested only when tracking needs your position.
              </Text>
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

      <Modal
        visible={showCheckpointModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckpointModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{settings.mode === 'manual' ? 'Record Point' : 'Add Checkpoint'}</Text>
            {settings.mode === 'manual' && (
              <Text style={styles.modalDescription}>
                This records the current location into your offline track immediately and syncs it when the network comes back.
              </Text>
            )}

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
                <Text style={styles.confirmButtonText}>{settings.mode === 'manual' ? 'Record' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  syncStatusRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: '#EEF6FC',
  },
  syncChipOffline: {
    backgroundColor: '#FFF5E8',
  },
  syncChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C6AA6',
  },
  syncChipTextOffline: {
    color: '#9A5A10',
  },
  syncErrorText: {
    fontSize: 12,
    color: '#B91C1C',
    marginBottom: 8,
  },
  syncNowButton: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  syncNowButtonDisabled: {
    opacity: 0.5,
  },
  syncNowButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
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
    backgroundColor: '#173F65',
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
  pauseButton: {
    backgroundColor: '#FF9500',
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
    marginTop: 10,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
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
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
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
  permissionHint: {
    fontSize: 12,
    color: '#65758A',
    marginTop: 5,
    lineHeight: 17,
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
    marginVertical: 6,
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
