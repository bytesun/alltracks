export const generateGPX = (trackPoints: TrackPoint[]): string => {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="HikingTrack">
  <trk>
    <name>Hiking Track ${new Date().toISOString()}</name>
    <trkseg>`;
    
  const points = trackPoints.map(point => 
    `      <trkpt lat="${point.latitude}" lon="${point.longitude}">
        <ele>${point.elevation || 0}</ele>
        <time>${new Date(point.timestamp).toISOString()}</time>
        ${point.comment ? `<cmt>${point.comment}</cmt>` : ''}
      </trkpt>`
  ).join('\n');
    
  const footer = `
    </trkseg>
  </trk>
</gpx>`;
    
  return header + points + footer;
};

export const generateKML = (trackPoints: TrackPoint[]): string => {
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Hiking Track ${new Date().toISOString()}</name>
    <Placemark>
      <LineString>
        <coordinates>`;
        
  const points = trackPoints.map(point => 
    `          ${point.longitude},${point.latitude},${point.elevation || 0}`
  ).join('\n');
        
  const footer = `
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
        
  return header + points + footer;
};

export interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  elevation?: number;
  comment?: string;
}
