import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '../services/TrackingContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Track } from '../types';
import { ImportService } from '../services/ImportService';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function TracksListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { tracks, deleteTrack, loadTracks, importTrack } = useTracking();
  const [isImporting, setIsImporting] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTracks();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDeleteTrack = (trackId: string) => {
    Alert.alert(
      'Delete Track',
      'Are you sure you want to delete this track?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrack(trackId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete track');
            }
          },
        },
      ]
    );
  };

  const handleImportTrack = async () => {
    setIsImporting(true);
    try {
      const importedTrack = await ImportService.pickTrackFile();
      if (!importedTrack) {
        return;
      }

      await importTrack(importedTrack);
      Alert.alert(
        'Track Imported',
        `${importedTrack.name} was added to your tracks.`,
        [
          {
            text: 'View Track',
            onPress: () => navigation.navigate('TrackDetail', { trackId: importedTrack.id }),
          },
          {
            text: 'Done',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error importing track:', error);
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Unable to import the selected file.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => navigation.navigate('TrackDetail', { trackId: item.id })}
    >
      <View style={styles.trackHeader}>
        <View style={styles.trackIcon}>
          <Ionicons name="map" size={24} color="#007AFF" />
        </View>
        <View style={styles.trackInfo}>
          <Text style={styles.trackName}>{item.name}</Text>
          <Text style={styles.trackDate}>{formatDate(item.startTime)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTrack(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {item.description && (
        <Text style={styles.trackDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.trackStats}>
        <View style={styles.statItem}>
          <Ionicons name="navigate" size={16} color="#666" />
          <Text style={styles.statText}>{formatDistance(item.distance)}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.statText}>{formatDuration(item.duration)}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.statText}>{item.points.length} pts</Text>
        </View>
        {item.elevationGain !== undefined && (
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={16} color="#666" />
            <Text style={styles.statText}>{item.elevationGain.toFixed(0)}m</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const completedTracks = tracks.filter(t => !t.isRecording);

  return (
    <View style={styles.container}>
      {completedTracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Tracks Yet</Text>
          <Text style={styles.emptyText}>
            Start tracking your first adventure from the Tracking tab
          </Text>
          <TouchableOpacity
            style={[styles.emptyImportButton, isImporting && styles.importButtonDisabled]}
            onPress={handleImportTrack}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.emptyImportButtonText}>Import GPS Route</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>My Tracks</Text>
              <Text style={styles.headerSubtitle}>
                {completedTracks.length} {completedTracks.length === 1 ? 'track' : 'tracks'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.importButton, isImporting && styles.importButtonDisabled]}
              onPress={handleImportTrack}
              disabled={isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#007AFF" />
                  <Text style={styles.importButtonText}>Import</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <FlatList
            data={completedTracks}
            renderItem={renderTrackItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  trackItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackDate: {
    fontSize: 14,
    color: '#666',
  },
  trackDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  trackStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF4FF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  importButtonDisabled: {
    opacity: 0.7,
  },
  importButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyImportButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyImportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
