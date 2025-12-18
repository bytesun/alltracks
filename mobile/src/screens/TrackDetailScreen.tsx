import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Polyline, Marker } from '../components/MapView';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StorageService } from '../services/StorageService';
import { Track } from '../types';

type NavigationProp = StackNavigationProp<RootStackParamList, 'TrackDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'TrackDetail'>;

export default function TrackDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { trackId } = route.params;

  const [track, setTrack] = useState<Track | null>(null);

  useEffect(() => {
    loadTrack();
  }, [trackId]);

  const loadTrack = async () => {
    const loadedTrack = await StorageService.getTrackById(trackId);
    setTrack(loadedTrack);
  };

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  };

  const formatDistance = (meters: number | undefined) => {
    if (!meters) return 'N/A';
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!track) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const mapRegion = track.points.length > 0
    ? {
        latitude: track.points[0].latitude,
        longitude: track.points[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{track.name}</Text>
        {track.description && (
          <Text style={styles.description}>{track.description}</Text>
        )}
      </View>

      {mapRegion && (
        <MapView style={styles.map} initialRegion={mapRegion}>
          <Polyline
            coordinates={track.points.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor="#007AFF"
            strokeWidth={3}
          />
          {track.points.length > 0 && (
            <>
              <Marker
                coordinate={{
                  latitude: track.points[0].latitude,
                  longitude: track.points[0].longitude,
                }}
                title="Start"
                pinColor="green"
              />
              {track.points.length > 1 && (
                <Marker
                  coordinate={{
                    latitude: track.points[track.points.length - 1].latitude,
                    longitude: track.points[track.points.length - 1].longitude,
                  }}
                  title="End"
                  pinColor="red"
                />
              )}
            </>
          )}
        </MapView>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="navigate" size={32} color="#007AFF" />
          <Text style={styles.statValue}>{formatDistance(track.distance)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time" size={32} color="#34C759" />
          <Text style={styles.statValue}>{formatDuration(track.duration)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="location" size={32} color="#FF9500" />
          <Text style={styles.statValue}>{track.points.length}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>

        {track.elevationGain !== undefined && (
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={32} color="#FF3B30" />
            <Text style={styles.statValue}>{track.elevationGain.toFixed(0)}m</Text>
            <Text style={styles.statLabel}>Elevation</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Track Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Start Time:</Text>
          <Text style={styles.infoValue}>{formatDate(track.startTime)}</Text>
        </View>
        {track.endTime && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>End Time:</Text>
            <Text style={styles.infoValue}>{formatDate(track.endTime)}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => navigation.navigate('Export', { trackId: track.id })}
      >
        <Ionicons name="share" size={24} color="white" />
        <Text style={styles.exportButtonText}>Export Track</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
  },
  map: {
    width: '100%',
    height: 300,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  infoSection: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
