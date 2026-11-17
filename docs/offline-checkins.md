# AllTracks Offline Check-ins and Evidence Levels

Frontend implementation: PR #44.

## Local save and reconnect

Object Tracking and Spot Check-in save each consented check-in to the browser's IndexedDB before attempting ICP submission.

Saved fields include a unique request ID, target object/Spot ID, action, note, optional public HTTPS photo URL, capture timestamp, account Principal (or null for a guest), and rounded (~100m) GPS for Objects. The browser never stores Turnstile tokens, gateway credentials or exact GPS in this outbox. At most 100 entries are queued per browser profile.

A global watcher retries signed-in entries while AllTracks is open, after network reconnect, on tab return, on account restoration and at regular intervals with backoff. The active signed-in Principal must match the queue's saved Principal. The user can view the number of queued entries, retry and explicitly discard entries.

- Signed-in Objects: checks existing Checkpoints for the same request ID before replaying; preserves the local capture timestamp in the Checkpoint.
- Signed-in Spots: verifies the Spot still exists and looks for the request ID in existing comments before replaying; stores capture timestamp within the comment JSON. Displayed server comment time is sync time.
- Anonymous Objects: requires owner opt-in and a fresh Turnstile validation via the existing guest gateway on reconnect. The user may have to revisit the Object page and complete a human challenge. Expired verification tokens are never cached.
- Server check-in limits and errors are not bypassed. Failed uploads remain queued.

**Offline QR navigation requires a previous online visit to AllTracks.** A Service Worker caches the SPA shell and hashed scripts/styles for later visits while disconnected. Neither a first-ever offline QR scan nor map tiles/images from uncached external hosts can be guaranteed offline.

**No claim of background upload while the browser is fully closed.** Automatic retries happen while the web app is open or reopened. Browser Background Sync support varies and this version intentionally does not give service workers access to logged-in identity material or guest anti-bot tokens.

**Privacy:** anyone with access to this device/browser profile may see its pending notes and approximate coordinates. Private browsing, clearing site data, or browser storage eviction can permanently remove unsent entries.

## QR scan verification

A **static printed QR is copyable** and cannot prove the visitor physically scanned it. Requiring camera scanning would raise friction but would not make it cryptographically trustworthy; GPS can be spoofed. Existing QR check-ins should be labeled **Reported**, not verified.

Suggested evidence tiers:

1. **Reported:** QR + deliberate location consent + Turnstile + quotas and owner moderation; reasonable for a casual outdoors experiment.
2. **Tag-verified (future):** an NXP NTAG 424 DNA secure NFC label on the object emits a tap-specific SUN authenticated URL containing a counter and MAC. A server-side verifier checks the cryptogram using secret keys held in a secure server environment and rejects reused tap counters. An offline tap can be retained locally and verified on reconnect. This is substantially stronger evidence of contact with an authentic tag, but cannot entirely prevent relay attacks or a tag removed from its object.
3. **Rotating signed QR (alternative):** requires a powered/dynamic display and expiry verification, usually unsuitable for a cup or printed trail sticker.

NFC verification is a **future design**, not an implemented feature of PR #44. It can be added to the existing AllTracks canister and protected gateway without creating a new canister. Never put tag keys or private validation material in client JS or the public QR.

## Manual acceptance tests

- With the page previously loaded, turn on airplane mode and submit an Object note/photo/GPS; see pending status; refresh and confirm it remains.
- Reconnect and ensure the same signed-in identity uploads the entry once; check local queue clears and report appears.
- Sign in as a different account and confirm that account does not upload another account's queued data.
- Check a Spot comment is saved/replayed and rendered once.
- Guest: create an offline entry, reconnect and complete a new Turnstile challenge; reject disabled object, repeated request ID and abuse-rate violations.
- Verify a first-ever completely offline visit cannot load an uncached app shell.
- Confirm storage-disabled/private browsing surfaces a save error instead of claiming success.

GitHub build success does not mean a Vercel production deployment was successful. Verify Vercel's build-rate-limit/deployment status separately.
