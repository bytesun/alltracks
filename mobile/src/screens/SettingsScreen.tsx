import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTracking } from '../services/TrackingContext';
import { StorageService } from '../services/StorageService';

export default function SettingsScreen() {
  const { settings, updateSettings } = useTracking();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all tracks and checkpoints. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              Alert.alert('Success', 'All data cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recording Mode</Text>

        <TouchableOpacity
          style={[
            styles.optionCard,
            localSettings.mode === 'auto' && styles.selectedCard,
          ]}
          onPress={() => setLocalSettings({ ...localSettings, mode: 'auto' })}
        >
          <View style={styles.optionHeader}>
            <Ionicons name="location" size={24} color="#007AFF" />
            <Text style={styles.optionTitle}>Automatic</Text>
            {localSettings.mode === 'auto' && (
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
            )}
          </View>
          <Text style={styles.optionDescription}>
            Automatically record points based on distance and time intervals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            localSettings.mode === 'manual' && styles.selectedCard,
          ]}
          onPress={() => setLocalSettings({ ...localSettings, mode: 'manual' })}
        >
          <View style={styles.optionHeader}>
            <Ionicons name="hand-left" size={24} color="#34C759" />
            <Text style={styles.optionTitle}>Manual</Text>
            {localSettings.mode === 'manual' && (
              <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
            )}
          </View>
          <Text style={styles.optionDescription}>
            Manually add checkpoints by tapping the button
          </Text>
        </TouchableOpacity>
      </View>

      {localSettings.mode === 'auto' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automatic Recording Settings</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Minimum Distance (meters)</Text>
              <TextInput
                style={styles.settingInput}
                value={localSettings.minDistance.toString()}
                onChangeText={(text) =>
                  setLocalSettings({
                    ...localSettings,
                    minDistance: parseInt(text) || 10,
                  })
                }
                keyboardType="number-pad"
              />
            </View>
            <Text style={styles.settingDescription}>
              Record a point when you've moved at least this distance
            </Text>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Minimum Time (seconds)</Text>
              <TextInput
                style={styles.settingInput}
                value={localSettings.minTime.toString()}
                onChangeText={(text) =>
                  setLocalSettings({
                    ...localSettings,
                    minTime: parseInt(text) || 5,
                  })
                }
                keyboardType="number-pad"
              />
            </View>
            <Text style={styles.settingDescription}>
              Record a point at least every this many seconds
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Record Elevation</Text>
            <Switch
              value={localSettings.recordElevation}
              onValueChange={(value) =>
                setLocalSettings({ ...localSettings, recordElevation: value })
              }
              trackColor={{ true: '#007AFF', false: '#E5E5EA' }}
            />
          </View>
          <Text style={styles.settingDescription}>
            Include elevation data in track points
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Ionicons name="save" size={24} color="white" />
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>

      <View style={styles.dangerSection}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
          <Ionicons name="trash" size={24} color="#FF3B30" />
          <Text style={styles.dangerButtonText}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>AllTracks Mobile v1.0.0</Text>
        <Text style={styles.footerText}>© 2024 AllTracks</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    width: 100,
    textAlign: 'center',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  dangerSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
