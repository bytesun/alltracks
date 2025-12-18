// This file is only used on native platforms (iOS/Android)
// Web will use MapView.web.tsx automatically
// Using OpenStreetMap via Leaflet in WebView for Expo Go compatibility

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MapView({ children, style, region, initialRegion, showsUserLocation, onMarkerPress, ...props }: any) {
  const webViewRef = useRef<WebView>(null);
  const displayRegion = region || initialRegion || { latitude: 37.78825, longitude: -122.4324 };
  
  // Extract markers and polylines from children
  const markers: any[] = [];
  const polylines: any[] = [];
  
  React.Children.forEach(children, (child: any) => {
    if (child?.type?.name === 'Marker' || child?.type?.displayName === 'Marker') {
      markers.push(child.props);
    } else if (child?.type?.name === 'Polyline' || child?.type?.displayName === 'Polyline') {
      polylines.push(child.props);
    }
  });
  
  const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { height: 100vh; width: 100vw; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${displayRegion.latitude}, ${displayRegion.longitude}], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    
    // Add current position marker if requested
    ${showsUserLocation ? `L.marker([${displayRegion.latitude}, ${displayRegion.longitude}]).addTo(map).bindPopup('Current Location');` : ''}
    
    // Add polylines
    ${polylines.map((pl, idx) => {
      const coords = pl.coordinates?.map((c: any) => `[${c.latitude}, ${c.longitude}]`).join(',') || '';
      return coords ? `L.polyline([${coords}], {color: '${pl.strokeColor || '#0000FF'}', weight: ${pl.strokeWidth || 3}}).addTo(map);` : '';
    }).join('\n')}
    
    // Add markers
    ${markers.map((m, idx) => {
      if (!m.coordinate) return '';
      const color = m.pinColor === 'green' ? 'green' : m.pinColor === 'blue' ? 'blue' : 'red';
      return `
        var marker${idx} = L.marker([${m.coordinate.latitude}, ${m.coordinate.longitude}], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
        }).addTo(map);
        marker${idx}.bindPopup('${m.title || 'Point'}');
        marker${idx}.on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'markerPress', index: ${idx}}));
        });
      `;
    }).join('\n')}
    
    // Listen for region updates from React Native
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'updateRegion') {
          map.setView([data.latitude, data.longitude], 13);
        } else if (data.type === 'addMarker') {
          L.marker([data.latitude, data.longitude])
            .addTo(map)
            .bindPopup(data.title || 'Marker');
        } else if (data.type === 'addPolyline') {
          const coords = data.coordinates.map(c => [c.latitude, c.longitude]);
          L.polyline(coords, {
            color: data.color || '#0000FF',
            weight: data.weight || 3
          }).addTo(map);
        }
      } catch(e) {
        console.error('Error parsing message:', e);
      }
    });
  </script>
</body>
</html>
  `;
  
  useEffect(() => {
    if (region && webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateRegion',
        latitude: region.latitude,
        longitude: region.longitude
      });
      webViewRef.current.postMessage(message);
    }
  }, [region]);
  
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress' && onMarkerPress) {
        const marker = markers[data.index];
        onMarkerPress(marker);
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };
  
  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.webview}
        javaScriptEnabled={true}
        onMessage={handleMessage}
      />
    </View>
  );
}

export function Polyline(props: any) {
  return null;
}

export function Marker(props: any) {
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
