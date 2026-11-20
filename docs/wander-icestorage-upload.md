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


## Integrated owner-only pipeline (2026-11-20)

`src/lib/uploadOwnedWanderPhoto.ts` composes the authenticated Alltracks
backend grant request, the ICEStorage actor and chunked upload. Pass the
**same signed-in HttpAgent** used to create the Alltracks backend actor.
It returns an opaque `objectId` only. Do not write that value into
`photoUrl`: the existing check-in photo field accepts public HTTPS URLs,
and ICEStorage public-read URL, certification, reference binding and cleanup
are not yet integrated. Consequently, the Check-in dialog intentionally
continues to accept external HTTPS links; this is not a finished photo UI.

The Backend grant endpoint in ICEvent/alltracks PR #4 is currently
**owner-only**, not a guest check-in upload permission. Grant issuance
must be reviewed for rate limiting, idempotency, and resource lifecycle
before production enablement. ICEStorage photo upload must not be
presented as published until the checkpoint and object reference are
persisted and public reads have been verified.

Validation commands (not yet executed by this PR):

```sh
# ICEvent/alltracks Backend checkout
# after removing the unused legacy frontend build configuration
dfx build --check
dfx generate backend

# bytesun/alltracks frontend checkout
npm run build
```

## Publication and deletion contract (pending backend implementation)

The browser now has a `PublishedWanderPhoto` model and defensive
`validatePublishedWanderPhoto` helper. Neither is evidence that a photo
has been published: only the backend can issue a trustworthy binding.

Required server-side workflow:

1. Authenticate the owner and validate the Wander Object before granting
   upload. The same principal must begin the ICEStorage upload.
2. On upload completion, verify the ICEStorage ObjectInfo status, owner,
   size and MIME. Do not trust a client-supplied object ID alone.
3. Create/update a public ICEStorage ResourceManifest with the uploaded
   ObjectRef, using the actual ResourceKey and revision checks.
4. Persist a canonical binding to the Object/checkpoint in Alltracks.
   Only return it after the manifest and Alltracks state agree; support
   idempotent retry/reconciliation if either operation times out.
5. On checkpoint deletion, detach its ObjectRef, decrement reference
   counts and delete underlying storage only when no references remain.
   Retry failed cleanup from durable server-side work, not localStorage.
6. The public viewer must read only backend-returned bindings, use
   `readPublicPhotoChunk`, validate all chunks and revoke temporary
   blob URLs. Do not assume composite queries provide certified bytes.

Until these steps are implemented and tested, do not expose the new
file-upload control in the Check-in dialog. The current external HTTPS
photo-link path is unchanged.
