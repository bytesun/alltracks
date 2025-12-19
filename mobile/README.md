# AllTracks Mobile

React Native mobile app for AllTracks - Track your outdoor adventures with GPS recording, checkpoints, and track export functionality.

## Features

### 🗺️ GPS Tracking
- **Automatic Mode**: Automatically record track points based on distance and time intervals
- **Manual Mode**: Manually add checkpoints at important locations
- Real-time map visualization with track polylines
- High-accuracy GPS location tracking

### 📍 Checkpoint Recording
- Add checkpoints with notes and photos
- Capture location, elevation, and timestamp
- View checkpoints on map
- Associate checkpoints with tracks

### 📤 Track Export
- Export tracks in multiple formats:
  - **GPX** - GPS Exchange Format (compatible with most GPS devices and apps)
  - **KML** - Keyhole Markup Language (for Google Earth and Google Maps)
  - **CSV** - Comma-Separated Values (for spreadsheets and data analysis)
- Share exported tracks via native share functionality
- Save tracks locally to device

### 📊 Track Statistics
- Distance traveled
- Duration
- Number of points recorded
- Elevation gain
- Track visualization on map

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- For physical device testing: Expo Go app

## Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) For Android development, configure Google Maps API key:
   - Open `app.json`
   - Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual Google Maps API key

## Running the App

### Development Mode

Start the Expo development server:
```bash
npm start
```

This will open the Expo Developer Tools in your browser.

### Run on iOS Simulator (Mac only)
```bash
npm run ios
```

### Run on Android Emulator
```bash
npm run android
```

### Run on Physical Device
1. Install the Expo Go app on your device
2. Scan the QR code shown in the terminal or Expo Developer Tools
3. The app will load on your device

### Run in Web Browser (Limited functionality)
```bash
npm run web
```

Note: Maps and location services have limited functionality in web mode.

## Project Structure

```
mobile/
├── App.tsx                    # Main app entry point
├── app.json                   # Expo configuration
├── package.json               # Dependencies
├── src/
│   ├── components/            # Reusable UI components
│   ├── navigation/            # Navigation configuration
│   │   └── AppNavigator.tsx   # Main navigation setup
│   ├── screens/               # App screens
│   │   ├── HomeScreen.tsx     # Dashboard/home screen
│   │   ├── TrackingScreen.tsx # Active tracking screen
│   │   ├── TracksListScreen.tsx # List of saved tracks
│   │   ├── TrackDetailScreen.tsx # Individual track details
│   │   ├── ExportScreen.tsx   # Track export functionality
│   │   └── SettingsScreen.tsx # App settings
│   ├── services/              # Business logic and services
│   │   ├── LocationService.ts # GPS location handling
│   │   ├── StorageService.ts  # Local data persistence
│   │   ├── ExportService.ts   # Track export functionality
│   │   └── TrackingContext.tsx # Global tracking state
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts           # Shared types
│   └── utils/                 # Utility functions
└── assets/                    # Images, icons, fonts

```

## Usage

### Starting a Track

1. Navigate to the "Tracking" tab
2. Tap "Start Tracking"
3. Enter a track name and optional description
4. The app will begin recording your location

### Adding Checkpoints

While tracking is active:
1. Tap the "Checkpoint" button
2. Optionally add a note and/or photo
3. Tap "Add" to save the checkpoint

### Stopping a Track

1. Tap "Stop" on the tracking screen
2. Confirm you want to stop tracking
3. The track will be saved automatically

### Viewing Tracks

1. Navigate to the "Tracks" tab
2. Tap on any track to view details
3. View track statistics and map visualization

### Exporting a Track

1. Open a track from the Tracks list
2. Tap "Export Track"
3. Select your preferred format (GPX, KML, or CSV)
4. Tap "Export" to share or save the file

### Configuring Settings

1. Navigate to the "Settings" tab
2. Choose recording mode (Automatic or Manual)
3. For Automatic mode, adjust distance and time intervals
4. Enable/disable elevation recording
5. Tap "Save Settings"

## Permissions

The app requires the following permissions:

- **Location (Always/When in Use)**: Required for GPS tracking
- **Camera**: Required to take photos at checkpoints
- **Photo Library**: Required to save checkpoint photos
- **File Storage**: Required to export and save tracks

## Data Storage

- All data is stored locally on your device using AsyncStorage
- Tracks and checkpoints are persisted between app sessions
- No data is sent to external servers by default
- You can clear all data from the Settings screen

## Troubleshooting

### Location not working
- Ensure location permissions are granted in device settings
- Check that location services are enabled on your device
- Try restarting the app

### Maps not displaying
- For Android: Ensure Google Maps API key is configured in `app.json`
- Check internet connection for map tiles to load

### Export not working
- Ensure file storage permissions are granted
- Check that you have sufficient storage space
- Try a different export format

## Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

For detailed build instructions, see [Expo Documentation](https://docs.expo.dev/build/introduction/).

## Dependencies

Key dependencies used in this project:

- **expo**: Expo SDK for React Native development
- **react-navigation**: Navigation framework
- **react-native-maps**: Native map components
- **expo-location**: Location services API
- **expo-file-system**: File system access
- **expo-sharing**: Native share functionality
- **@react-native-async-storage/async-storage**: Local data storage
- **expo-image-picker**: Camera and photo library access

## API Compatibility

This mobile app uses the same data types and structures as the AllTracks web application, allowing for future integration with the backend API.

## Future Enhancements

- Cloud sync with AllTracks backend
- Offline map tiles
- Live location sharing
- Track import functionality
- Social features (sharing with friends)
- Route planning
- Multiple track layers on map
- Fitness statistics and analysis

## License

This project is part of the AllTracks ecosystem.

## Support

For issues and feature requests, please visit the main AllTracks repository.
