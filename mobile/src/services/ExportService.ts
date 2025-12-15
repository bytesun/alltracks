import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Track, TrackPoint, ExportFormat } from '../types';

export class ExportService {
  static async exportTrack(
    track: Track,
    format: ExportFormat
  ): Promise<void> {
    try {
      const content = this.generateContent(track, format);
      const filename = `${track.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${format}`;
      
      // Create a file in the cache directory
      const file = new File(Paths.cache, filename);
      await file.create();
      await file.write(content);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: this.getMimeType(format),
          dialogTitle: `Export ${track.name}`,
          UTI: this.getUTI(format),
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error exporting track:', error);
      throw error;
    }
  }

  private static generateContent(track: Track, format: ExportFormat): string {
    switch (format) {
      case 'gpx':
        return this.generateGPX(track);
      case 'kml':
        return this.generateKML(track);
      case 'csv':
        return this.generateCSV(track);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private static generateGPX(track: Track): string {
    const points = track.points
      .map(
        (point) => `    <trkpt lat="${point.latitude}" lon="${point.longitude}">
      ${point.elevation !== undefined ? `<ele>${point.elevation}</ele>` : ''}
      <time>${new Date(point.timestamp).toISOString()}</time>
      ${point.comment ? `<desc>${this.escapeXml(point.comment)}</desc>` : ''}
    </trkpt>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AllTracks Mobile" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${this.escapeXml(track.name)}</name>
    <desc>${this.escapeXml(track.description)}</desc>
    <time>${track.startTime}</time>
  </metadata>
  <trk>
    <name>${this.escapeXml(track.name)}</name>
    <desc>${this.escapeXml(track.description)}</desc>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
  }

  private static generateKML(track: Track): string {
    const coordinates = track.points
      .map(
        (point) =>
          `${point.longitude},${point.latitude}${point.elevation !== undefined ? `,${point.elevation}` : ''}`
      )
      .join('\n        ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(track.name)}</name>
    <description>${this.escapeXml(track.description)}</description>
    <Placemark>
      <name>${this.escapeXml(track.name)}</name>
      <description>${this.escapeXml(track.description)}</description>
      <LineString>
        <coordinates>
        ${coordinates}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
  }

  private static generateCSV(track: Track): string {
    const header = 'timestamp,latitude,longitude,elevation,comment\n';
    const rows = track.points
      .map(
        (point) =>
          `${point.timestamp},${point.latitude},${point.longitude},${point.elevation || ''},${this.escapeCsv(point.comment || '')}`
      )
      .join('\n');
    return header + rows;
  }

  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static escapeCsv(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private static getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'gpx':
        return 'application/gpx+xml';
      case 'kml':
        return 'application/vnd.google-earth.kml+xml';
      case 'csv':
        return 'text/csv';
      default:
        return 'text/plain';
    }
  }

  private static getUTI(format: ExportFormat): string {
    switch (format) {
      case 'gpx':
        return 'public.xml';
      case 'kml':
        return 'com.google.earth.kml';
      case 'csv':
        return 'public.comma-separated-values-text';
      default:
        return 'public.plain-text';
    }
  }

  static async exportMultipleTracks(
    tracks: Track[],
    format: ExportFormat
  ): Promise<void> {
    for (const track of tracks) {
      await this.exportTrack(track, format);
    }
  }
}
