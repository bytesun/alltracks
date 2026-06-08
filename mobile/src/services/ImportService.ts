import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Track, TrackPoint } from '../types';
import { LocationService } from './LocationService';

const SUPPORTED_EXTENSIONS = ['csv', 'gpx', 'kml'] as const;

type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export class ImportService {
  static async pickTrackFile(): Promise<Track | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/gpx+xml', 'application/vnd.google-earth.kml+xml', 'text/csv', 'application/xml', 'text/xml', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
      base64: false,
    });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const asset = result.assets[0];
    const extension = this.getExtension(asset.name);

    if (!extension) {
      throw new Error('Unsupported file type. Please choose a GPX, KML, or CSV file.');
    }

    const file = new File(asset.uri);
    const content = await file.text();
    return this.buildTrackFromContent(asset.name, content, extension);
  }

  static buildTrackFromContent(fileName: string, content: string, extension: SupportedExtension): Track {
    const points = this.parseContent(content, extension);

    if (points.length < 2) {
      throw new Error('The selected file does not contain enough route points to import.');
    }

    const normalizedPoints = this.normalizePoints(points);
    const startTimestamp = normalizedPoints[0].timestamp;
    const endTimestamp = normalizedPoints[normalizedPoints.length - 1].timestamp;

    let distance = 0;
    let elevationGain = 0;

    for (let index = 1; index < normalizedPoints.length; index += 1) {
      const previousPoint = normalizedPoints[index - 1];
      const currentPoint = normalizedPoints[index];
      distance += LocationService.calculateDistance(previousPoint, currentPoint);

      const previousElevation = previousPoint.elevation ?? 0;
      const currentElevation = currentPoint.elevation ?? 0;
      if (currentElevation > previousElevation) {
        elevationGain += currentElevation - previousElevation;
      }
    }

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: this.getBaseName(fileName),
      description: `Imported from ${fileName}`,
      startTime: new Date(startTimestamp).toISOString(),
      endTime: new Date(Math.max(startTimestamp, endTimestamp)).toISOString(),
      points: normalizedPoints,
      distance,
      duration: Math.max(0, endTimestamp - startTimestamp),
      elevationGain: elevationGain > 0 ? elevationGain : undefined,
      isRecording: false,
    };
  }

  private static parseContent(content: string, extension: SupportedExtension): TrackPoint[] {
    switch (extension) {
      case 'csv':
        return this.parseCSV(content);
      case 'gpx':
        return this.parseGPX(content);
      case 'kml':
        return this.parseKML(content);
      default:
        throw new Error('Unsupported file type.');
    }
  }

  private static parseCSV(content: string): TrackPoint[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return [];
    }

    const dataLines = this.looksLikeCsvHeader(lines[0]) ? lines.slice(1) : lines;

    return dataLines
      .map((line, index) => this.parseCSVLine(line, index))
      .filter((point): point is TrackPoint => point !== null);
  }

  private static parseCSVLine(line: string, index: number): TrackPoint | null {
    const values = this.splitCsvRow(line);
    if (values.length < 3) {
      return null;
    }

    const [timestampValue, latitudeValue, longitudeValue, elevationValue, commentValue] = values;
    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      timestamp: this.parseTimestamp(timestampValue, index),
      latitude,
      longitude,
      elevation: this.parseOptionalNumber(elevationValue),
      comment: this.cleanCsvValue(commentValue),
    };
  }

  private static parseGPX(content: string): TrackPoint[] {
    const pointMatches = [
      ...content.matchAll(/<(trkpt|rtept)\b[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi),
    ];

    const parsedPoints: Array<TrackPoint | null> = pointMatches.map((match, index) => {
        const latitude = Number(match[2]);
        const longitude = Number(match[3]);
        const innerContent = match[4];

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return {
          latitude,
          longitude,
          elevation: this.parseOptionalNumber(this.extractTagValue(innerContent, 'ele')),
          timestamp: this.parseTimestamp(this.extractTagValue(innerContent, 'time'), index),
          comment:
            this.extractTagValue(innerContent, 'desc') ??
            this.extractTagValue(innerContent, 'cmt') ??
            undefined,
        };
      });

    return parsedPoints.filter((point): point is TrackPoint => point !== null);
  }

  private static parseKML(content: string): TrackPoint[] {
    const coordinateBlocks = [...content.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/gi)]
      .map((match) => match[1].trim())
      .filter(Boolean);

    const largestBlock =
      coordinateBlocks.sort((left, right) => right.length - left.length)[0] ?? '';

    const parsedPoints: Array<TrackPoint | null> = largestBlock
      .split(/\s+/)
      .map((coordinate, index) => {
        const [longitudeValue, latitudeValue, elevationValue] = coordinate.split(',');
        const latitude = Number(latitudeValue);
        const longitude = Number(longitudeValue);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return {
          latitude,
          longitude,
          elevation: this.parseOptionalNumber(elevationValue),
          timestamp: Date.now() + index * 1000,
        };
      });

    return parsedPoints.filter((point): point is TrackPoint => point !== null);
  }

  private static normalizePoints(points: TrackPoint[]): TrackPoint[] {
    let lastTimestamp = 0;

    return points.map((point, index) => {
      const timestamp =
        Number.isFinite(point.timestamp) && point.timestamp > 0
          ? point.timestamp
          : lastTimestamp > 0
            ? lastTimestamp + 1000
            : Date.now() + index * 1000;

      lastTimestamp = Math.max(lastTimestamp, timestamp);

      return {
        ...point,
        timestamp,
      };
    });
  }

  private static parseTimestamp(value: string | undefined, index: number): number {
    if (!value) {
      return Date.now() + index * 1000;
    }

    const numericTimestamp = Number(value);
    if (Number.isFinite(numericTimestamp) && numericTimestamp > 0) {
      return numericTimestamp;
    }

    const parsedTimestamp = Date.parse(value);
    if (Number.isFinite(parsedTimestamp) && parsedTimestamp > 0) {
      return parsedTimestamp;
    }

    return Date.now() + index * 1000;
  }

  private static parseOptionalNumber(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private static extractTagValue(content: string, tagName: string): string | undefined {
    const match = content.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return match?.[1]?.trim();
  }

  private static getExtension(fileName: string): SupportedExtension | null {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension || !SUPPORTED_EXTENSIONS.includes(extension as SupportedExtension)) {
      return null;
    }

    return extension as SupportedExtension;
  }

  private static getBaseName(fileName: string): string {
    return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Imported Track';
  }

  private static cleanCsvValue(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const cleaned = value.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
    return cleaned || undefined;
  }

  private static looksLikeCsvHeader(line: string): boolean {
    return /timestamp|latitude|longitude/i.test(line);
  }

  private static splitCsvRow(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const nextCharacter = line[index + 1];

      if (character === '"') {
        if (inQuotes && nextCharacter === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (character === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += character;
      }
    }

    values.push(current.trim());
    return values;
  }
}
