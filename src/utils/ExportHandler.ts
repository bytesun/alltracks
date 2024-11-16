import { saveAs } from 'file-saver';
import {  generateGPX, generateKML } from './exportFormats';
import { uploadFile, setDoc } from '@junobuild/core';
import { TrackPoint } from '../types/TrackPoint';
import { v4 as uuidv4 } from 'uuid';
// import { openDB } from 'idb';

export class ExportHandler {
  static async exportTrack(
    trackPoints: TrackPoint[],
    format: string,
    storage: 'local' | 'cloud',
    filename: string,
    description: string,
    distance: number,
    elevationGain: number
  ) {
    // // Save to IndexDB first
    // const db = await openDB('tracks-db', 1, {
    //   upgrade(db) {
    //     db.createObjectStore('tracks', { keyPath: 'id' });
    //   },
    // });

    // await db.put('tracks', {
    //   id: filename,
    //   points: trackPoints,
    //   description,
    //   timestamp: Date.now(),
    //   format,
    //   distance,
    //   elevationGain
    // });

    // Continue with export
    const { content, mimeType } = this.generateContent(trackPoints, format);
    const expFilename = `${filename}.${format}`;

    if (storage === 'local') {
      return this.localExport(content, mimeType, expFilename);
    } else {
      return this.cloudExport(content, mimeType, expFilename, filename, description, distance, elevationGain);
    }
  }
  
 private static generateContent(trackPoints: TrackPoint[], format: string) {
    let content: string;
    let mimeType: string;

    switch (format) {
      case 'gpx':
        content = generateGPX(trackPoints);
        mimeType = 'application/gpx+xml';
        break;
      case 'kml':
        content = generateKML(trackPoints);
        mimeType = 'application/vnd.google-earth.kml+xml';
        break;
      default:
        content = this.generateCSV(trackPoints);
        mimeType = 'text/csv';
    }

    return { content, mimeType };
  }

  private static generateCSV(trackPoints: TrackPoint[]) {
    const header = 'timestamp,latitude,longitude,elevation,comment\n';
    return header + trackPoints.map(point =>
      `${point.timestamp},${point.latitude},${point.longitude},${point.elevation || ''},${point.comment || ''}`
    ).join('\n');
  }

  private static localExport(content: string, mimeType: string, filename: string) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    saveAs(blob, filename);
  }

  private static async cloudExport(
    content: string,
    mimeType: string,
    filename: string,
    originalFilename: string,
    description: string,
    distance: number,
    elevationGain: number
  ) {
    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });
    
    const savedAsset = await uploadFile({
      data: file,
      collection: "tracks"
    });

    if (savedAsset) {
      return await setDoc({
        collection: "tracks",
        doc: {
          key: uuidv4(),
          data: {
            filename: originalFilename,
            description,
            trackfile: savedAsset.downloadUrl,
            distance,
            elevationGain
          }
        }
      });
    }
  }
}
