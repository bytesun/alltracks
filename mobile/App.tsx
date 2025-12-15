import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TrackingProvider } from './src/services/TrackingContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TrackingProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </TrackingProvider>
    </GestureHandlerRootView>
  );
}
