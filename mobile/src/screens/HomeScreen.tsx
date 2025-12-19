import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTracking } from '../services/TrackingContext';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { tracks, activeTrack, isTracking } = useTracking();

  const completedTracks = tracks.filter(t => !t.isRecording);
  const totalDistance = completedTracks.reduce((sum, t) => sum + (t.distance || 0), 0);
  const totalDuration = completedTracks.reduce((sum, t) => sum + (t.duration || 0), 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AllTracks Mobile</Text>
        <Text style={styles.subtitle}>Track your outdoor adventures</Text>
      </View>

      {isTracking && activeTrack && (
        <View style={styles.activeCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="radio-button-on" size={24} color="#FF3B30" />
            <Text style={styles.cardTitle}>Recording</Text>
          </View>
          <Text style={styles.trackName}>{activeTrack.name}</Text>
          <Text style={styles.trackInfo}>
            {activeTrack.points.length} points recorded
          </Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="map" size={32} color="#007AFF" />
          <Text style={styles.statNumber}>{completedTracks.length}</Text>
          <Text style={styles.statLabel}>Tracks</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="navigate" size={32} color="#34C759" />
          <Text style={styles.statNumber}>
            {(totalDistance / 1000).toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>km</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time" size={32} color="#FF9500" />
          <Text style={styles.statNumber}>
            {Math.floor(totalDuration / 3600000)}
          </Text>
          <Text style={styles.statLabel}>hours</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>Features</Text>
        
        <View style={styles.featureItem}>
          <Ionicons name="location" size={24} color="#007AFF" />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>GPS Tracking</Text>
            <Text style={styles.featureDescription}>
              Record your journey with automatic or manual tracking
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="pin" size={24} color="#34C759" />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Checkpoints</Text>
            <Text style={styles.featureDescription}>
              Mark important locations with notes and photos
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="share" size={24} color="#FF9500" />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Export Tracks</Text>
            <Text style={styles.featureDescription}>
              Share your tracks in GPX, KML, or CSV format
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.helpText}>
          Use the Tracking tab to start recording a new track
        </Text>
        <Text style={styles.helpText}>
          View your saved tracks in the Tracks tab
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  activeCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF3F0',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  trackName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackInfo: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  featuresContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  featureText: {
    flex: 1,
    marginLeft: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 32,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
});
