import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StorageService } from '../services/StorageService';
import { ExportService } from '../services/ExportService';
import { Track, ExportFormat } from '../types';

type RouteProps = RouteProp<RootStackParamList, 'Export'>;

export default function ExportScreen() {
  const route = useRoute<RouteProps>();
  const { trackId } = route.params;

  const [track, setTrack] = useState<Track | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('gpx');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadTrack();
  }, [trackId]);

  const loadTrack = async () => {
    const loadedTrack = await StorageService.getTrackById(trackId);
    setTrack(loadedTrack);
  };

  const handleExport = async () => {
    if (!track) return;

    setIsExporting(true);
    try {
      await ExportService.exportTrack(track, selectedFormat);
      Alert.alert('Success', `Track exported as ${selectedFormat.toUpperCase()}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export track');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!track) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading track...</Text>
      </View>
    );
  }

  const formatOptions: { format: ExportFormat; label: string; icon: string; description: string }[] = [
    {
      format: 'gpx',
      label: 'GPX',
      icon: 'map',
      description: 'GPS Exchange Format - Compatible with most GPS devices and apps',
    },
    {
      format: 'kml',
      label: 'KML',
      icon: 'globe',
      description: 'Keyhole Markup Language - For Google Earth and Google Maps',
    },
    {
      format: 'csv',
      label: 'CSV',
      icon: 'document-text',
      description: 'Comma-Separated Values - For spreadsheets and data analysis',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Export Track</Text>
        <Text style={styles.trackName}>{track.name}</Text>
      </View>

      <Text style={styles.sectionTitle}>Select Format</Text>

      {formatOptions.map((option) => (
        <TouchableOpacity
          key={option.format}
          style={[
            styles.formatOption,
            selectedFormat === option.format && styles.selectedFormat,
          ]}
          onPress={() => setSelectedFormat(option.format)}
        >
          <View style={styles.formatHeader}>
            <View style={styles.formatIcon}>
              <Ionicons
                name={option.icon as any}
                size={32}
                color={selectedFormat === option.format ? '#007AFF' : '#666'}
              />
            </View>
            <View style={styles.formatInfo}>
              <Text
                style={[
                  styles.formatLabel,
                  selectedFormat === option.format && styles.selectedFormatText,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.formatDescription}>{option.description}</Text>
            </View>
            {selectedFormat === option.format && (
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
            )}
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#007AFF" />
        <Text style={styles.infoText}>
          The track will be exported and you can share it with other apps or save it to your device.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
        onPress={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="share" size={24} color="white" />
            <Text style={styles.exportButtonText}>
              Export as {selectedFormat.toUpperCase()}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  trackName: {
    fontSize: 18,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  formatOption: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedFormat: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  formatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formatIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatInfo: {
    flex: 1,
    marginLeft: 16,
  },
  formatLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedFormatText: {
    color: '#007AFF',
  },
  formatDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
