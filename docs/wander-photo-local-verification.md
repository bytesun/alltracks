# Wander × ICEStorage: developer handoff / local verification

## Branches
- Alltracks backend: ICEvent/alltracks `feat/wander-photo-grant-20261120` (PR #4)
- Alltracks frontend: bytesun/alltracks `feat/icestorage-wander-upload-adapter-20261120` (PR #59)
- ICEStorage: ICEvent/icestorage; project `alltracks` must be registered with its backend principal and given uploader and byte quota.

## Local setup
1. Check out both feature branches and install existing project dependencies.
2. Run `dfx build --check` in the backend checkout and `npm run build` (or the repository's yarn equivalent) in the frontend checkout.
3. **Important**: Alltracks backend currently targets ICEStorage principal `5pqgi-saaaa-aaaal-aaavq-cai`. The frontend can override its storage target using `VITE_ICESTORAGE_CANISTER_ID`, but this alone does not redirect the backend. For an isolated local replica, provision a matching ICEStorage canister identity or configure the backend storage target in a local-only build. Do not send test uploads to production accidentally.
4. Confirm that frontend Alltracks actor uses the newly updated `backend.did.js` interface and points to the backend under test. Log in with the same Internet Identity for Alltracks and ICEStorage calls.

## Acceptance flow
1. As an authenticated user, create a Wander Object with a local JPEG/PNG/WebP photo. Confirm the object is created and the photo is published.
2. Open its Object Journey page as a different/anonymous user. The photo must render from the trusted Alltracks binding through ICEStorage public chunk reads.
3. Create a Checkpoint. As Object owner, upload a photo and attach it to that Checkpoint. Confirm it appears in the specific timeline entry and the gallery.
4. As owner, delete the photo. The public gallery must hide it; ICEStorage public reads must reject the previously published ResourceKey.
5. Delete a Checkpoint with an attached photo. The Checkpoint and photo should disappear. The backend attempts immediate revoke/delete; if ICEStorage is unavailable, owner-page reconciliation retries the durable tombstone.
6. Simulate a lost publish acknowledgement after upload. Copy or use the prefilled Storage Object ID in **Recover an interrupted publication** and resume without uploading the file again.
7. Verify wrong-owner upload, wrong-object binding, duplicate calls, MIME/size rejection, offline recovery, and delete/publish races fail safely.
8. Verify storage quota before and after deletion; ICEStorage resource tombstone success alone is not proof of physical byte reclamation.
9. Verify an upgrade retains publication intents, bindings and pending cleanup.

## Current constraints
- Guest uploads are not enabled; only Object owners can upload or bind ICEStorage photos.
- Automatic cleanup is best-effort on Checkpoint deletion and periodically while an owner has the Journey page open; there is no independent unattended backend scheduler.
- Local E2E verification has not been run by the assistant. Keep both PRs draft until the user validates.
