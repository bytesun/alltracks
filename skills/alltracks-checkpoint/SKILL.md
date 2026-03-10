---
name: AllTracks Checkpoint Recorder
description: Record location checkpoints (waypoints) on AllTracks, the decentralized outdoor activity tracking app built on the Internet Computer Protocol (ICP). Use this skill to mark locations during a hike or outdoor activity, log GPS coordinates with optional notes, photos, and elevation data, query existing checkpoints, and verify recorded data. Works with the AllTracks web app at https://alltracks.icevent.app. Use this skill when a user asks to "record a checkpoint", "mark a waypoint", "check in at a location", "log my position", or "save a location on AllTracks".
---

# AllTracks Checkpoint Recorder

Record and query location checkpoints (waypoints) on [AllTracks](https://alltracks.icevent.app), an open-source, decentralized outdoor activity tracking application built on the Internet Computer Protocol (ICP).

## What is a Checkpoint?

A checkpoint is a geotagged location marker recorded during an outdoor activity. Each checkpoint captures:

- **Location**: Latitude, longitude, and elevation in meters
- **Timestamp**: When the checkpoint was recorded (ICP nanosecond time)
- **Track**: The active track (route) it belongs to (`trackId`)
- **Note**: Optional text description (e.g. "Summit reached", "Water source")
- **Photo**: Optional photo URL attachment
- **Visibility**: Public (visible to all users) or private
- **Group**: Optional group association

## Prerequisites

1. **Authentication**: The user must be signed in via Internet Identity (II) or NFID at [alltracks.icevent.app](https://alltracks.icevent.app).
2. **Active Track**: A `trackId` (UUID) is required to associate the checkpoint with a track. Start or select a track in the AllTracks app before recording checkpoints.
3. **Location Access**: The browser must have permission to access the device's GPS/location.

---

## Method 1: Record a Checkpoint via the Web Interface

Use browser tools (`browser_navigate`, `browser_click`, `browser_type`, etc.) to interact with the AllTracks web app.

### Step 1 — Open AllTracks

```
browser_navigate("https://alltracks.icevent.app")
```

### Step 2 — Authenticate

If the user is not already logged in:
1. Locate the **Login** button in the top-right corner.
2. Click it to open the authentication modal.
3. Choose **Internet Identity** (recommended) or **NFID** and complete the authentication flow.

### Step 3 — Start or Select an Active Track

To start a new track:
1. Click **Start Track** in the sidebar or main toolbar.
2. Enter a track name when prompted.
3. Note the `trackId` displayed in the track header or URL (it is a UUID string).

To use an existing track:
1. Open **My Tracks** in the sidebar.
2. Select the desired track. The `trackId` is shown in the track detail view or URL.

### Step 4 — Record the Checkpoint

1. With an active track running, click the **Check-In** (📍) button on the map toolbar.
2. The app captures your current GPS coordinates and elevation automatically.
3. Fill in the optional fields in the check-in modal:
   - **Note**: A short description of the location (e.g. "Summit", "Water source", "Camp site").
   - **Photo**: Attach a photo if available.
   - **Private**: Toggle on to make this checkpoint visible only to you.
   - **Incident**: Toggle on if this checkpoint marks a hazard or safety incident.
4. Ensure **Cloud Sync** is enabled to persist the checkpoint to the ICP canister.
5. Click **Save** to record the checkpoint.

### Step 5 — Verify the Checkpoint

Navigate to the **Check-In** page (sidebar → *Check-In*) to see the list of all recorded checkpoints with timestamps, coordinates, and notes, and to view them on the map.

---

## Method 2: Record a Checkpoint Programmatically via ICP Canister

For automated or script-based recording, call the AllTracks canister directly using the `@dfinity/agent` npm package.

### Installation

```bash
npm install @dfinity/agent @dfinity/principal
```

### Code Example

```javascript
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./src/api/alltracks/backend.did.js";

const CANISTER_ID = "orkad-xyaaa-aaaal-ai7ta-cai";
const ICP_HOST    = "https://icp0.io";

// Create an authenticated agent (requires Internet Identity delegation)
const agent = await HttpAgent.create({ host: ICP_HOST });

// Create the AllTracks actor
const alltracks = Actor.createActor(idlFactory, {
  agent,
  canisterId: CANISTER_ID,
});

// Record a checkpoint
const result = await alltracks.createCheckpoint({
  latitude:  49.2827,                                     // decimal degrees
  longitude: -123.1207,                                   // decimal degrees
  elevation: 1234.5,                                      // meters above sea level
  timestamp: BigInt(Date.now()) * 1_000_000n,             // nanoseconds (ICP Time)
  trackId:   "your-track-uuid",                           // UUID of the active track
  note:      "Summit reached — clear skies",              // description (can be "")
  photo:     [],                                          // [] = none, ["https://..."] = URL
  isPublic:  true,                                        // true = public, false = private
  groupId:   [],                                          // [] = personal, ["group-id"] = group
});

if ("ok" in result) {
  console.log("Checkpoint recorded. ID:", result.ok);
} else {
  console.error("Error:", result.err);
}
```

### Checkpoint Parameters

| Field       | Type               | Required | Description |
|-------------|--------------------|----------|-------------|
| `latitude`  | `number`           | ✅       | Latitude in decimal degrees (e.g. `49.2827`) |
| `longitude` | `number`           | ✅       | Longitude in decimal degrees (e.g. `-123.1207`) |
| `elevation` | `number`           | ✅       | Elevation in meters above sea level |
| `timestamp` | `bigint`           | ✅       | Time in nanoseconds — `BigInt(Date.now()) * 1_000_000n` |
| `trackId`   | `string`           | ✅       | UUID of the track this checkpoint belongs to |
| `note`      | `string`           | ✅       | Text note; use `""` if none |
| `isPublic`  | `boolean`          | ✅       | `true` = visible to all users; `false` = private |
| `photo`     | `[] \| [string]`   | ❌       | `[]` for no photo; `["https://..."]` for a photo URL |
| `groupId`   | `[] \| [string]`   | ❌       | `[]` for personal; `["group-id"]` for a group checkpoint |

### Return Value

`createCheckpoint` returns a `Result_1` variant:

- **Success** → `{ ok: bigint }` — the internal identifier of the created checkpoint.
- **Failure** → `{ err: string }` — human-readable error message.

---

## Querying Checkpoints

### Get the Most Recent Checkpoints

```javascript
const checkpoints = await alltracks.getLatestCheckpoints();

for (const cp of checkpoints) {
  const time = new Date(Number(cp.timestamp) / 1_000_000).toISOString();
  console.log(`[${time}] ${cp.latitude.toFixed(6)}, ${cp.longitude.toFixed(6)} @ ${cp.elevation}m — ${cp.note}`);
}
```

### Get Checkpoints by Track

```javascript
const trackCheckpoints = await alltracks.getCheckPointsByTrackId("your-track-uuid");
```

### Get Checkpoints by User or Group within a Time Range

```javascript
import { Principal } from "@dfinity/principal";

const oneWeekAgo = BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000) * 1_000_000n;
const now        = BigInt(Date.now()) * 1_000_000n;

// Filter by user
const userCheckpoints = await alltracks.getCheckpoints(
  { user: Principal.fromText("your-principal-id") },
  oneWeekAgo,
  now
);

// Filter by group
const groupCheckpoints = await alltracks.getCheckpoints(
  { groupId: "your-group-id" },
  oneWeekAgo,
  now
);
```

---

## Example Interactions

**User**: "Record a checkpoint at the summit with the note 'Amazing view!'"

Agent steps:
1. Navigate to `https://alltracks.icevent.app`.
2. Confirm the user is authenticated.
3. Confirm there is an active track running.
4. Click the Check-In (📍) button.
5. Enter the note "Amazing view!" in the note field.
6. Enable Cloud Sync.
7. Click Save.
8. Confirm the checkpoint appears in the Check-In list.

---

**User**: "Show me my recent checkpoints."

Agent steps:
1. Navigate to `https://alltracks.icevent.app`.
2. Click **Check-In** in the sidebar.
3. Report the list of checkpoints with timestamps, coordinates, and notes.

---

## Canister Reference

| Item | Value |
|------|-------|
| **Canister ID** | `orkad-xyaaa-aaaal-ai7ta-cai` |
| **Network** | Internet Computer (ICP) mainnet |
| **ICP URL** | `https://icp0.io` |
| **Web App** | `https://alltracks.icevent.app` |
| **Alternative URL** | `https://orkad-xyaaa-aaaal-ai7ta-cai.icp0.io` |
| **IDL / Interface** | `src/api/alltracks/backend.did` |
| **Source Repository** | `https://github.com/bytesun/alltracks` |
