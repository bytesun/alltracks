# Changelog

All notable changes to the AllTracks Mobile app will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-15

### Added
- Initial release of AllTracks Mobile app
- GPS location tracking with high accuracy
- Two tracking modes:
  - **Automatic Mode**: Continuous tracking with configurable distance/time intervals
  - **Manual Mode**: User-controlled checkpoint recording
- Checkpoint recording features:
  - Add notes to checkpoints
  - Attach photos from camera
  - Automatic location and elevation capture
  - Timestamp recording
- Track export functionality:
  - GPX format (GPS Exchange Format)
  - KML format (Keyhole Markup Language)
  - CSV format (Comma-Separated Values)
  - Native share integration
- Local data storage with AsyncStorage:
  - Persistent tracks
  - Persistent checkpoints
  - Persistent settings
- Map visualization:
  - Real-time track display
  - Polyline rendering
  - Start/end markers
  - Current location marker
- Statistics tracking:
  - Distance traveled
  - Duration
  - Elevation gain
  - Number of track points
- User interface:
  - Home/Dashboard screen with stats
  - Active tracking screen with map
  - Tracks list screen
  - Track detail screen with full map
  - Export screen with format selection
  - Settings screen with configuration options
- Settings management:
  - Recording mode selection
  - Distance interval configuration
  - Time interval configuration
  - Elevation recording toggle
  - Clear all data option
- Navigation:
  - Bottom tab navigation
  - Stack navigation for detail screens
  - Smooth transitions
- Permissions handling:
  - Location permissions (foreground and background)
  - Camera permissions
  - Photo library permissions
- Error handling and user feedback:
  - Permission denied alerts
  - Export success/failure notifications
  - Data save confirmations

### Technical Details
- Built with Expo SDK 54
- React Native 0.81
- TypeScript for type safety
- React Navigation 7
- expo-location for GPS
- expo-file-system for file operations
- react-native-maps for map display
- AsyncStorage for data persistence
- Context API for state management

### Known Limitations
- No cloud sync (local storage only)
- No offline maps
- No live location sharing
- No route planning
- No track import functionality
- Requires active internet for map tiles

### Platform Support
- iOS 13.4 or higher
- Android 6.0 (API 23) or higher

### Dependencies
- expo: ~54.0.29
- react: 19.1.0
- react-native: 0.81.5
- @react-navigation/native: ^7.1.25
- @react-navigation/bottom-tabs: ^7.8.12
- @react-navigation/stack: ^7.6.12
- react-native-maps: ^1.26.20
- expo-location: ^19.0.8
- expo-file-system: ^19.0.21
- expo-sharing: ^14.0.8
- expo-image-picker: ^17.0.10
- @react-native-async-storage/async-storage: ^2.2.0

## [Unreleased]

### Planned Features
- Cloud synchronization with AllTracks backend
- Track import functionality (GPX, KML, CSV)
- Offline map tiles
- Live location sharing
- Route planning
- Social features (friend tracking)
- Fitness statistics and analysis
- Track editing
- Multiple track layers
- 3D terrain visualization
- Weather integration
- Trail recommendations
- Group tracking
- Emergency SOS feature

### Future Improvements
- Optimize battery usage
- Add track simplification
- Improve elevation accuracy
- Add compass integration
- Add speed tracking
- Add pace calculations
- Add calorie tracking
- Add heart rate integration
- Add photo gallery for tracks
- Add track comparison
- Add achievement system
- Add dark mode
- Add multiple language support
- Add accessibility improvements
