# Wander photo integration — code review and release blockers

Review scope: ICEvent/alltracks PR #4 and bytesun/alltracks PR #59 (feature branches, 2026-11-21). This review is static; no local end-to-end execution was performed.

## Implemented
- Alltracks backend owner-scoped upload grants and publication intents.
- ICEStorage project photo publication, revocation and logical deletion integration.
- Owner-only binding of a published photo to an existing unique guest Checkpoint.
- Checkpoint deletion tombstones associated photo intents; authenticated retry endpoint can reconcile.
- Frontend transport, upload, trusted public reader, and owner lifecycle orchestration (`src/lib/wanderPhotoLifecycle.ts`).

## Blocking findings
1. **Wander UI not wired.** The new frontend modules are adapters, not confirmed usage by actual create/edit/check-in/photo gallery components. Add UI actions, progress, error/retry UX and revoke blob URLs.
2. **Checkpoint deletion does not revoke ICEStorage immediately.** It hides the Alltracks reference, but the already-issued ResourceKey may still read publicly until cleanup is called. A scheduled worker or synchronous best-effort revoke plus durable retry is required.
3. **Cleanup recovery not automatic.** `retryWanderPhotoCleanup` is authenticated and globally throttled; no scheduler/worker currently drives the pending queue.
4. **Lost acknowledgement recovery is incomplete in the frontend.** `publishOwnedWanderPhoto` returns the object ID in an error message but has no explicit resume-by-ID API/UI; retrying a new upload may waste quota.
5. **Storage hardcoded to mainnet canister.** `createIceStorageUploadActor` currently uses a mainnet canister ID. A local E2E run must inject a local ICEStorage canister ID; otherwise it is not a local integration test.
6. **Storage object lifecycle capacity.** Durable intent and binding arrays have hard limits without compaction; repeated create/delete eventually blocks new photos.
7. **Photo publishing race and cleanup.** Exercise publish/delete interleavings and verify external ICEStorage state, not only the Alltracks intent.
8. **Checkpoint ownership model.** Current owner-only photo upload and owner-only binding do not support guest photo attachments; the UI must clearly communicate this restriction.

## Release gate
- Build both feature branches locally with a configurable local ICEStorage actor.
- Verify upload → prepare → publish → bind → public display → checkpoint delete → revoke → delete → reclaimed quota on a local replica.
- Verify checkpoint guest deletion, duplicate/replayed requests, lost responses, upgrades and concurrent retries.
- Complete UI integration and recovery before removing draft status.
- Do not merge or deploy to mainnet until blockers are addressed.

## 2026-11-21 follow-up implementation review
- `ObjectJourney.tsx` now mounts `WanderPhotoGallery`; owner can upload/publish, bind to a Checkpoint, delete and resume; `WanderCheckpointPhotos` renders checkpoint-specific published images.
- Frontend actor declarations (`backend.did`, `backend.did.js`, `backend.did.d.ts`) include the lifecycle methods; previously the runtime actor would have rejected them before calling the canister.
- `VITE_ICESTORAGE_CANISTER_ID` is propagated to the ICEStorage actor for local development; the Motoko backend still uses a fixed ICEStorage principal and requires an equivalent local canister identity or configurable backend actor to test end-to-end.
- ICEStorage finalize is idempotent for completed sessions; the frontend retries transient failures and retains the storage object ID in a final error.
- Backend Checkpoint deletion now performs immediate best-effort revoke/delete after persisting tombstones. Remote failures remain retryable, but **unattended automatic cleanup is not implemented**. Owner-page reconciliation is opportunistic, not a server worker.
- **Not verified**: local build, local E2E, local upgrade, physical bytes reclaimed, guest photo upload, and unattended cleanup. These are blockers; this review is not an approval to merge.
