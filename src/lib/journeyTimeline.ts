import type { JourneyCheckin } from '../api/object-journey/objects';
import type { PendingObjectCheckin } from './offlineCheckins';

export type JourneyTimelineEntry =
  | { kind: 'published'; item: JourneyCheckin }
  | { kind: 'local'; item: PendingObjectCheckin };

/** Local records are not public and must never affect published route statistics. */
export function buildJourneyTimeline(
  published: JourneyCheckin[],
  pending: PendingObjectCheckin[],
  objectId: string,
  principal: string | null,
): JourneyTimelineEntry[] {
  const rows: JourneyTimelineEntry[] = published.map(item => ({ kind: 'published', item }));
  for (const item of pending) {
    if (item.objectId !== objectId || (item.principal !== null && item.principal !== principal)) continue;
    // Signed-in uploads preserve the request UUID. Never guess whether a
    // gateway-authored guest stop matches by its note or coordinates.
    if (item.principal !== null && published.some(stop =>
      stop.requestId === item.id && stop.author === item.principal)) continue;
    rows.push({ kind: 'local', item });
  }
  const time = (row: JourneyTimelineEntry) => row.kind === 'local'
    ? row.item.createdAt : Date.parse(row.item.createdAt);
  return rows.sort((a, b) => time(b) - time(a));
}
