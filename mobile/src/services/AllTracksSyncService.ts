import { HttpAgent } from '@dfinity/agent';
import { Track, CheckPoint } from '../types';
// Import the existing canister interface from the web app so mobile sync uses the same backend contract.
import { createActor } from '../../../src/api/alltracks/index.js';

const IC_HOST = 'https://ic0.app';

const createTrackGpx = (track: Track): string => {
  const points = track.points
    .map(
      (point) => `    <trkpt lat="${point.latitude}" lon="${point.longitude}">
      ${point.elevation !== undefined ? `<ele>${point.elevation}</ele>` : ''}
      <time>${new Date(point.timestamp).toISOString()}</time>
      ${point.comment ? `<cmt>${escapeXml(point.comment)}</cmt>` : ''}
    </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AllTracks Mobile" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(track.name)}</name>
    <desc>${escapeXml(track.description)}</desc>
    <time>${track.startTime}</time>
  </metadata>
  <trk>
    <name>${escapeXml(track.name)}</name>
    <desc>${escapeXml(track.description)}</desc>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export class AllTracksSyncService {
  private static actor: any | null = null;

  private static getActor() {
    if (!this.actor) {
      const agent = new HttpAgent({ host: IC_HOST });
      this.actor = (createActor as any)(agent, {});
    }

    return this.actor;
  }

  static async isBackendReachable(): Promise<boolean> {
    try {
      const response = await fetch(`${IC_HOST}/api/v2/status`, {
        method: 'GET',
        cache: 'no-store',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async syncCheckpoint(checkpoint: CheckPoint): Promise<void> {
    const actor = this.getActor();
    const result = await actor.createCheckpoint({
      latitude: checkpoint.latitude,
      longitude: checkpoint.longitude,
      elevation: checkpoint.elevation || 0,
      timestamp: BigInt(checkpoint.timestamp * 1_000_000),
      trackId: checkpoint.trackId,
      note: checkpoint.note || '',
      photo:
        checkpoint.photo && !checkpoint.photo.startsWith('file:')
          ? [checkpoint.photo]
          : [],
      isPublic: checkpoint.isPublic,
      groupId: checkpoint.groupId ? [checkpoint.groupId] : [],
    });

    if ('err' in result) {
      throw new Error(result.err);
    }
  }

  static async syncTrack(track: Track): Promise<void> {
    if (track.points.length === 0) {
      return;
    }

    const actor = this.getActor();
    const totalElevation =
      track.elevationGain ??
      track.points.reduce((sum, point) => sum + (point.elevation || 0), 0);

    const gpx = createTrackGpx(track);
    const dataUrl = `data:application/gpx+xml;charset=utf-8,${encodeURIComponent(gpx)}`;
    const result = await actor.createTrack({
      id: track.id,
      name: track.name,
      description: track.description,
      length: track.distance || 0,
      duration: track.duration || 0,
      elevation: totalElevation,
      startime: BigInt(new Date(track.startTime).getTime() * 1_000_000),
      trackfile: {
        fileType: 'application/gpx+xml',
        url: dataUrl,
      },
      isPublic: false,
      groupId: [],
      startPoint: {
        latitude: track.points[0].latitude,
        longitude: track.points[0].longitude,
      },
      trackType: { hike: null },
    });

    if ('err' in result) {
      throw new Error(result.err);
    }
  }
}
