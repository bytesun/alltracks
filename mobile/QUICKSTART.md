# AllTracks Mobile - Quick Start Guide

This guide will help you get the AllTracks mobile app running in just a few minutes.

## Prerequisites

Make sure you have the following installed:
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`

For device testing:
- **iOS**: Xcode and iOS Simulator (Mac only) or Expo Go app on iPhone
- **Android**: Android Studio and emulator or Expo Go app on Android device

## Installation

1. **Navigate to the mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

## Running on Different Platforms

### iOS Simulator (Mac only)
Press `i` in the terminal or run:
```bash
npm run ios
```

### Android Emulator
Make sure you have an Android emulator running, then press `a` in the terminal or run:
```bash
npm run android
```

### Physical Device (Easiest Option)
1. Install the **Expo Go** app from:
   - App Store (iOS)
   - Google Play Store (Android)

2. Scan the QR code shown in the terminal with:
   - iOS: Camera app
   - Android: Expo Go app

The app will load on your device over your local network.

### Web Browser (Limited)
Press `w` in the terminal or run:
```bash
npm run web
```

Note: Maps and location features have limited functionality in web mode.

## First Time Setup

### For Android Users
If you want to use Google Maps on Android:
1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Open `app.json`
3. Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key

## Testing Core Features

### 1. Start GPS Tracking
1. Go to the **Tracking** tab
2. Tap **Start Tracking**
3. Enter a track name (e.g., "Test Walk")
4. Tap **Start**
5. Walk around to see points being recorded

### 2. Add a Checkpoint
While tracking:
1. Tap the **Checkpoint** button
2. Optionally add a note
3. Optionally take a photo
4. Tap **Add**

### 3. Stop and View Track
1. Tap **Stop** on the tracking screen
2. Go to the **Tracks** tab
3. Tap on your track to view details

### 4. Export a Track
1. Open a track from the Tracks list
2. Tap **Export Track**
3. Choose a format (GPX, KML, or CSV)
4. Tap **Export** and share or save

### 5. Configure Settings
1. Go to the **Settings** tab
2. Switch between Automatic and Manual modes
3. Adjust recording intervals
4. Enable/disable elevation recording

## Recording Modes

### Automatic Mode
- Tracks your location continuously
- Records points based on distance (default: 10m) or time (default: 5s)
- Best for: Hiking, biking, running

### Manual Mode
- You control when points are recorded
- Tap "Checkpoint" to add each point
- Best for: Waypoint marking, location scouting

## Troubleshooting

### Location not working
- Grant location permissions when prompted
- On iOS: Settings → AllTracks → Location → "Always" or "While Using"
- On Android: Settings → Apps → AllTracks → Permissions → Location → Allow

### Maps not displaying
- Check your internet connection (maps need to download tiles)
- For Android: Ensure Google Maps API key is configured

### Camera not working
- Grant camera permissions when prompted
- Settings → AllTracks → Camera → Allow

### App crashes on start
- Try clearing the app cache
- Reinstall the app
- Check that you have the latest Expo Go version

## Data Storage

All data is stored locally on your device:
- Tracks and checkpoints persist between app sessions
- No account required
- Data stays private unless you export and share

To clear all data:
1. Go to Settings
2. Scroll to "Danger Zone"
3. Tap "Clear All Data"

## Development Tips

### Enable Hot Reload
Changes to your code automatically reload in the app. Shake your device or press `Ctrl+M` (Android) / `Cmd+D` (iOS) to access the developer menu.

### View Logs
Run `npx expo logs` in a separate terminal to see console output and errors.

### Debug on Physical Device
Shake your device to open the developer menu and enable:
- Fast Refresh
- Performance Monitor
- Element Inspector

## Next Steps

- Read the full [README](./README.md) for detailed documentation
- Explore the codebase in `src/`
- Customize the app for your needs
- Build for production with `expo build`

## Support

For issues or questions:
- Check the main [AllTracks repository](https://github.com/bytesun/alltracks)
- Review the [Expo documentation](https://docs.expo.dev/)
- Check React Native documentation for component details

Happy tracking! 🗺️
