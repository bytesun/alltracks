# AllTracks Object Tracking — Track Me Down

This feature uses **the existing AllTracks production ICP canister and its existing Track / CheckPoint APIs**. It adds no canister, schema migration, external database, or deployment secrets.

## What users can do

- Sign in to AllTracks and visit **Objects** (`/objects`).
- Create an object with a name, icon and optional public description.
- See their own object list and generate a scannable QR image for each object.
- Open any object's public URL `/object/<id>` to view its story, reported stops, map and timeline.
- A **signed-in** visitor who scans the QR can voluntarily share one approximate GPS location, status (found / carried / left), and optional note.

Objects are identified with unique `obj-<UUID>` track IDs. The QR contains a public URL, not any private key, browser GPS coordinates, or owner credentials.

## Why existing Track / CheckPoint, not a new canister?

The frontend repository contains the deployed AllTracks Candid interface and client; the corresponding restored backend Motoko source is now separately maintained in https://github.com/ICEvent/alltracks (draft backend PR #1). The currently deployed backend has no Object-specific guest methods yet; backend PR #1 adds owner-scoped guest authorization while retaining existing Checkpoint authentication. To respect the request to avoid another canister, the implementation reuses the existing data model without pretending these unsupported methods exist:

- `createTrack` creates the object, with `trackType = #other`, `isPublic = true`, a unique `obj-` ID, and a versioned `description` prefixed with `alltracks:object:v1:`.
- `getTracks({user = principal}, page, pageSize)` lists the signed-in user's objects; objects are selected by ID prefix and versioned description, then owner principal.
- `getTrack(id)` retrieves an object's metadata via its public ID.
- `createCheckpoint` appends a voluntary position using `trackId = objectId`, `isPublic = true`, rounded latitude/longitude, and an encoded action/note prefixed `alltracks:object-checkin:v1:`.
- `getCheckPointsByTrackId(objectId)` returns publicly readable stop records.

No frontend-only database or browser local storage is used for persistent object data. Creation and check-in data are written into the **same deployed AllTracks ICP canister** as other tracking entries.

## Authentication and optional guest gateway

**Creating objects requires login. Posting check-ins currently requires login until the guest gateway and existing backend are both upgraded and explicitly enabled.** The existing deployed `createCheckpoint` method requires an authenticated caller. Backend PR #1 implements a separate owner-authorized relay method on the same persistent actor, but has not been deployed to mainnet. The QR landing page is public, but the check-in control asks visitors to sign in to AllTracks before using GPS.

A fail-closed HTTP gateway and conditional guest UI are now included in the PR. When fully configured, a guest may complete Cloudflare Turnstile and post via a least-privilege service identity to a **dedicated method on the existing canister**. The method has not yet been implemented on the production canister. The gate remains disabled by default and the existing logged-in checkpoint flow is unchanged.

See docs/guest-checkin-security.md for the exact authorization rules, deployment variables, WAF/Turnstile setup, test plan and release gates. See docs/object-guest-checkin-contract.did for the proposed *additive* Candid shape. Do not put the guest service identity in client source or weaken ordinary createCheckpoint authorization.

## Privacy and safety

- Location permission is only requested when the visitor taps **Get my GPS location**.
- The visitor must explicitly accept public location/note publication.
- Coordinates are rounded to 3 decimal places **before** being sent to the canister (~100 m scale).
- The ICP Checkpoint itself is signed by the logged-in principal; therefore **the identity is potentially public** even though the page doesn't display it. Do not claim anonymous participation.
- Timestamp is submitted in the existing backend format in nanoseconds and could reflect the browser's clock, not an independent backend attestation.
- QR image rendering uses a third-party public QR image URL service (`api.qrserver.com`); only the public object link is sent to that service.
- Only use objects in permitted handoff locations; don't litter trails or pick up somebody else's belongings.

## Deployment and testing

1. Merge and deploy the web frontend after reviewing CI and the reused backend API behavior.
2. Log in and visit `/objects`.
3. Create an object. Inspect its object record under the user's `Track` records in ICP.
4. Expand **Show QR** and scan with a second phone.
5. Confirm the public journey page loads without login.
6. Sign in on the second phone, grant one-time GPS permission, consent, and submit a status/note.
7. Verify the checkpoint is in the existing AllTracks canister and appears in the first phone's journey timeline.
8. Verify denied GPS permission, no consent, malformed item ID, and two object owners.
9. Validate the effect of the record namespace on existing generic track/history views (object records use `trackType=other` and can appear there until those lists filter object records).

The earlier proof-of-concept QR for `cup-7h9m4k` **is no longer associated with a pre-created object**. Create a new "Wandering Cup" object in the signed-in interface and print its newly generated QR.

## Future backend enhancement

After backend PR #1 is safely released, consider dedicated stable `Object` and `ObjectCheckin` types and APIs **inside that same canister**, with owner-scoped management, pagination, moderation/deletion and a secure anonymous/guest write policy. That change needs stable-state upgrade compatibility and test coverage. The present object IDs and public URLs could be migrated without changing their QR codes.
