# Wander photo upload — integration gate

Status: adapter committed; **not wired to UI or production storage**.

## Existing behavior
Wander Check-in continues to accept an optional external HTTPS image URL encoded in the Checkpoint note. Do not replace or silently migrate existing photo links.

## New adapter
`src/lib/iceStorageUpload.ts` validates JPEG/PNG/WebP and 10 MiB maximum, splits an authorized session into chunks, reports progress and returns an opaque object ID. It does **not** implement a backend actor transport, public URL construction, grant issuance or deletion.

## Required next implementation
1. Compare ICEStorage deployed Candid `ObjectUploadRequest`, `ObjectSessionResult`, `uploadObjectChunk`, and completion methods against the production interface.
2. Implement a transport using the **signed-in caller identity**. `issueProjectUploadGrant` must be called by the registered Alltracks backend, not directly by a browser. Do not store a privileged identity or secret in frontend code.
3. Verify the grant is scoped to caller Principal, object ID, MIME type, file size, and expiry. Validate file content on the storage side; client MIME is only a preliminary check.
4. Add a separate, audited gateway design for anonymous visitors; never grant shared unrestricted storage access.
5. Define a public, certified read URL / short object reference, and check Checkpoint note-length constraints before persisting.
6. Link Checkpoint deletion to reference removal and quota reclamation; do not delete shared files while references remain.
7. Test lost acknowledgement, duplicate submission, network offline/retry, quota exhaustion, and orphan cleanup.

## Release gates
Do not enable the UI or deploy the integration to mainnet until the real transport, authorization flow, and read/delete lifecycle are implemented and verified end to end.
