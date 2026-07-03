---
name: AllTracks
description: Work with AllTracks, a decentralized outdoor activity tracking and safety app built on the Internet Computer Protocol (ICP) with a React/Vite web app and a React Native/Expo mobile app. Use this skill to understand the project architecture, authenticate users via Internet Identity/NFID, and read or write data on the AllTracks backend canister — tracks, checkpoints, incident reports, trails, groups, trackathons, saved points, spots, and photos. Use it when a user asks to build on, integrate with, query, or extend AllTracks, or when working anywhere in the bytesun/alltracks repository.
---

# AllTracks

AllTracks is an open-source, decentralized outdoor activity tracking and safety application. It lets people record their journeys, share live location with family, report trail hazards, browse trails, and join group hikes and "trackathons". All persistent data is stored on-chain in an Internet Computer (ICP) canister.

- **Web app**: https://alltracks.icevent.app
- **Repository**: https://github.com/bytesun/alltracks
- **Backend canister ID**: `r6cnt-kyaaa-aaaal-aab3a-cai`
- **ICP host**: `https://ic0.app` (query/update calls), `https://icp0.io` (asset/raw access)
- **Identity providers**: Internet Identity (`https://identity.ic0.app`), NFID / IdentityKit

## Repository Layout

```
src/                      # React + Vite web app (TypeScript)
  api/alltracks/          # Candid interface + actor for the main backend canister
    backend.did           # Canister interface definition (source of truth for the API)
    backend.did.js        # idlFactory (JS)
    index.js              # createActor() + canisterId
  api/comment/            # Comment canister interface
  api/icevent/            # IcEvent canister interface
  components/             # Web UI components (Map, Tracks, CheckIn, Groups, etc.)
  pages/                  # Routed pages (Live, Events, Profile, Guide, CheckIn, ...)
  context/                # React context (Notifications, Stats)
  lib/                    # constants.ts, canisters.ts, markerIcons.ts
api/farcaster/            # Vercel serverless functions for Farcaster auth/feed
mobile/                   # React Native + Expo mobile app
  src/services/           # LocationService, StorageService, ExportService, TrackingContext
  src/screens/            # Home, Tracking, TracksList, TrackDetail, Export, Settings
skills/                   # ClawHub-published skills (this file lives here)
public/                   # PWA assets, service worker, manifest, APK
```

The web app uses `@dfinity/agent`, `@dfinity/auth-client`, `@nfid/identitykit`, `react-leaflet` for maps, and `@junobuild/core` / `arweave` for auxiliary storage. The mobile app uses Expo (`expo-location`, `react-native-maps`, AsyncStorage) and stores data locally with export to GPX/KML/CSV.

## Core Domain Concepts

| Concept | Description |
|---------|-------------|
| **Track** | A recorded route (`hike`, `bike`, `run`, `ski`, `drive`, `fly`, `paddle`, `climb`, `travel`, `other`). Has a start point, distance, duration, elevation, visibility, optional group, and a linked `trackfile` (GPX/KML/CSV). |
| **CheckPoint** | A geotagged waypoint on a track: lat/lng/elevation, timestamp, note, optional photo, public/private, optional group. |
| **IncidentPoint** | A safety report on a track with `category` (hazard, obstacle, weather, wildlife, other) and `severity` (low, medium, high, critical). |
| **Trail** | A reusable published route with difficulty (easy/moderate/hard/expert), type (out-and-back/point-to-point/loop), rating, tags, photos, and a trail file. |
| **Group** | A community of principals with an admin and a badge; scopes tracks, checkpoints, and photos. |
| **Trackathon** | A time-bounded group challenge with registrations, per-participant progress points, and mintable completion badges. |
| **SavedPoint / Spot** | User-saved favorite locations / points of interest with categories and tags. |
| **Photo** | An image attached to a track/group with tags and timestamp. |
| **UserStats** | Aggregate stats per user: total distance, elevation, hours, completed trails, first hike date. |

### Time and coordinates

- All timestamps are **ICP `Time` = `int` nanoseconds**. Convert with `BigInt(Date.now()) * 1_000_000n`, and back with `new Date(Number(t) / 1_000_000)`.
- Coordinates are decimal degrees as `float64`. Elevation is meters as `float64`.
- Candid `opt` maps to a JS array: `[]` = none, `[value]` = some. Example: `photo: []` or `photo: ["https://..."]`.
- `Result` variants return `{ ok: ... }` on success or `{ err: string }` on failure — always branch on `"ok" in result`.

## Connecting to the Backend

The actor factory already exists in the repo — reuse it rather than re-declaring the interface.

```javascript
import { HttpAgent } from "@dfinity/agent";
import { createActor, canisterId } from "./src/api/alltracks/index.js";

// Anonymous (read-only) agent
const agent = await HttpAgent.create({ host: "https://ic0.app" });
const alltracks = createActor(agent);

// Authenticated agent (write access) — obtain identity from AuthClient / IdentityKit
import { AuthClient } from "@dfinity/auth-client";
const authClient = await AuthClient.create();
await authClient.login({ identityProvider: "https://identity.ic0.app" });
const authed = await HttpAgent.create({ identity: authClient.getIdentity(), host: "https://ic0.app" });
const alltracksAuthed = createActor(authed);
```

Read operations (`query`) work with the anonymous agent. Write operations (`update`) require an authenticated identity.

## Backend API Reference

The full interface is in `src/api/alltracks/backend.did`. Grouped by domain:

### Tracks
- `createTrack(NewTrack) -> Result_6` — create a track (returns the `Track`).
- `getTrack(id) -> opt Track` (query)
- `getTracks(filter, page, pageSize) -> vec Track` (query) — `filter` = `{ user: principal }` or `{ group: text }`.

### Checkpoints
- `createCheckpoint(NewCheckPoint) -> Result_1` (returns `nat` id)
- `getLatestCheckpoints() -> vec CheckPoint` (query)
- `getCheckPointsByTrackId(trackId) -> vec CheckPoint` (query)
- `getCheckpoints(filter, startTime, endTime) -> vec CheckPoint` (query) — `filter` = `{ user: principal }` or `{ groupId: text }`.
- `addCheckpointComment(timestamp, createdBy, { comment, photo, timestamp }) -> Result_1`
- `getCheckpointComments(timestamp, createdBy) -> vec CheckpointComment` (query)

### Incident reports (safety)
- `createIncidentPoint(NewIncidentPoint) -> Result_1`
- `getIncidentCheckpoints(startTime, endTime) -> vec IncidentPoint` (query)
- `getIncidentPointsByTrack(trackId)`, `getIncidentPointsByCategory(category)`, `getIncidentPointsBySeverity(severity)`, `getIncidentPointsByTimeRange(startTime, endTime)` (all query)

### Trails
- `createTrail(NewTrail) -> Result_4`, `deleteTrail(id) -> Result_1`
- `getTrail(id)`, `getTrails(filter, page, pageSize)`, `getMyTrails(page, pageSize)`
- `getTrailsInBounds({ north, south, east, west })`, `searchTrails(term, page, pageSize)` (all query)

### Groups
- `createGroup(NewGroup) -> Result_9`, `updateGroup(groupId, NewGroup) -> Result_1`
- `getGroup(id) -> opt Group`, `getMyGroups(page, pageSize) -> vec Group` (query)

### Trackathons
- `createTrackathon(NewTrackathon) -> Result_5`, `updateTrackathon(id, NewTrackathon) -> Result_5`
- `registerForTrackathon(username, trackathonId) -> Result_2`
- `recordTrackathonPoint(trackathonId, TrackathonPoint) -> Result_2`
- `mintTrackathonBadge(trackathonId) -> Result_3`
- `getAllTrackathons`, `getMyTrackathons`, `getTrackathon`, `getTrackathonParticipants`, `getMyTrackathonProgress` (all query)

### Saved points & spots
- `createSavedPoint(NewSavedPoint) -> Result_8`, `savePoints(vec NewSavedPoint) -> Result_1`
- `getMySavedPoints()`, `getSavedPointsByCategory(category)` (query)
- `createSpot(NewSpot) -> Result_7`, `updateSpot(name, NewSpot) -> Result`, `deleteSpot(name) -> Result_1`
- `getSpots`, `getMySpots`, `getSpotById`, `searchSpotsByTag` (query)

### Photos
- `addPhoto({ groupId, photoUrl, tags, timestamp, trackId }) -> Result_1`, `deletePhoto(photoUrl) -> Result_1`
- `getTrackPhotos`, `getGroupPhotos`, `getMyPhotos`, `searchPhotosByTags` (query)

### User & stats
- `getUserstats(pid) -> opt UserStats` (query)
- `getListCounts() -> { checkpoints, incidentPoints, photos, tracks, trails }` (query)
- `createUserCredential(UserCredential) -> Result_1`, `getMyCredential() -> opt UserCredential` (query)

## Common Examples

### Record a checkpoint on the active track

```javascript
const result = await alltracksAuthed.createCheckpoint({
  latitude: 49.2827,
  longitude: -123.1207,
  elevation: 1234.5,
  timestamp: BigInt(Date.now()) * 1_000_000n,
  trackId: "your-track-uuid",
  note: "Summit reached",
  photo: [],                // [] = none, ["https://..."] = photo URL
  isPublic: true,
  groupId: [],              // [] = personal, ["group-id"] = group
});
if ("ok" in result) console.log("Checkpoint id:", result.ok);
else console.error(result.err);
```

### Report a trail hazard

```javascript
await alltracksAuthed.createIncidentPoint({
  latitude: 49.30, longitude: -123.15, elevation: 800,
  timestamp: BigInt(Date.now()) * 1_000_000n,
  trackId: "your-track-uuid",
  category: { hazard: null },     // hazard | obstacle | weather | wildlife | other
  severity: { high: null },       // low | medium | high | critical
  note: "Fallen tree blocking the trail",
  photo: [],
  groupId: [],
});
```

### List recent public checkpoints (read-only)

```javascript
const checkpoints = await alltracks.getLatestCheckpoints();
for (const cp of checkpoints) {
  const time = new Date(Number(cp.timestamp) / 1_000_000).toISOString();
  console.log(`[${time}] ${cp.latitude}, ${cp.longitude} @ ${cp.elevation}m — ${cp.note}`);
}
```

### Search trails near a map viewport

```javascript
const trails = await alltracks.getTrailsInBounds({
  north: 49.4, south: 49.1, east: -122.9, west: -123.3,
});
```

## Working in This Repo

- **Dev / build**: package manager is **yarn**. `yarn dev` (Vite), `yarn build` (`tsc -b && vite build`), `yarn lint`, `yarn preview`.
- **Mobile app**: `cd mobile && npm install && npm start` (Expo). Mobile stores tracks locally (AsyncStorage) and exports GPX/KML/CSV; it is not yet wired to the canister.
- **Interface source of truth**: when the canister API changes, update `src/api/alltracks/backend.did`, regenerate `backend.did.js` / `backend.did.d.ts`, and keep this skill in sync.
- **File types**: exports use `application/gpx+xml`, `application/vnd.google-earth.kml+xml`, and `text/csv` (see `src/lib/constants.ts`).
- **Paging**: list queries take `(..., page, pageSize)`; default page size in the app is `10` (`PAGING_LENGTH`).

## Publishing Skills

Skills under `skills/` are auto-published to ClawHub via `.github/workflows/publish-skill.yml` on any push to `main` that touches `skills/**` (using `bunx clawhub sync --all --bump patch`). Each skill lives in its own subfolder with a `SKILL.md` containing YAML frontmatter (`name`, `description`) followed by Markdown instructions.
