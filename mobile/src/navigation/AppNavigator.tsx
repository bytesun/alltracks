import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import TrackingScreen from '../screens/TrackingScreen';
import TracksListScreen from '../screens/TracksListScreen';
import TrackDetailScreen from '../screens/TrackDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ExportScreen from '../screens/ExportScreen';

export type RootStackParamList = {
  Main: undefined;
  TrackDetail: { trackId: string };
  Export: { trackId: string };
};

export type TabParamList = {
  Tracking: undefined;
  Tracks: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'location';

          if (route.name === 'Tracking') {
            iconName = focused ? 'location' : 'location-outline';
          } else if (route.name === 'Tracks') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen name="Tracking" component={TrackingScreen} />
      <Tab.Screen name="Tracks" component={TracksListScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TrackDetail"
          component={TrackDetailScreen}
          options={{ title: 'Track Details' }}
        />
        <Stack.Screen
          name="Export"
          component={ExportScreen}
          options={{ title: 'Export Track' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
