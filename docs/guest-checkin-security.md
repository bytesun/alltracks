# AllTracks Object Tracking — guest security integration

Status: FRONTEND GATEWAY + BACKEND CODE IN DRAFT PRS. No mainnet deployment. Frontend: https://github.com/bytesun/alltracks/pull/38 ; existing backend: https://github.com/ICEvent/alltracks/pull/1 .

## Threat model
The QR is a public identifier, not a credential. GPS can be spoofed. Turnstile success means a challenge was passed, not proof a visitor physically possesses the object. Risks: spam, cycle exhaustion, replay, phishing, inappropriate notes, leaked signing credentials, unauthorized object edits.

## Canister authorization (mandatory backend upgrade)
- Signed-in owner retains createObject, owner settings, moderation rights only over their own objects.
- Public read remains available to anonymous visitors.
- submitGuestCheckin is **only callable by a dedicated gateway Principal** that has NO other administrator privileges.
- Normal createCheckpoint stays authentication-protected. Never grant a gateway Principal arbitrary Track write privileges.
- Object policy: owner controls allowGuestCheckins (default false), and staff can revoke gateway Principal in emergencies.
- Inside submitGuestCheckin: validate caller and object existence/public visibility, verify owner-enabled policy, GPS bounds and finite values, action, note <=280 Unicode code points and <=1200 UTF-8 bytes, and requestId UUID.
- Persist a bounded deduplication index keyed by object ID + requestId; record before awaits to prevent concurrent replay.
- Enforce quotas atomically inside canister (suggested 30 accepted check-ins/object/day and 30 seconds gap/object). Use Time.now() for timestamp and round coordinates to 3 decimal places. Never store IP, device IDs or CAPTCHA tokens.
- Preserve the old public Checkpoint reader by storing guest submissions as check-ins with createdBy = gateway Principal, trackId = object ID and the existing versioned note format.
- Restrict public history and add owner moderation. Stable-upgrade testing is mandatory before changing mainnet code.

Proposed additive Candid contract: docs/object-guest-checkin-contract.did. Gateway IDL lives in api/objects/_lib/guest-icp.ts. DO NOT modify the production Candid file until the canister implements this method.

## HTTP gateway (implemented; disabled by default)
POST /api/objects/:id/guest-checkin
- Strict method, Content-Type, origin, 4 KiB body, UUID, GPS bounds, note, action and CAPTCHA token checks.
- Re-rounds coordinates; browser should also round before sending.
- Verifies Turnstile server-side, matching the expected hostname and action object_checkin.
- Calls ONLY submitGuestCheckin using its dedicated server Ed25519 identity, never createCheckpoint.
- Returns 503 by default until ALL required deployment settings exist; does not log token, IP or GPS.

GET /api/objects/guest-config returns enabled=false unless everything is configured. The signed-in Checkpoint path remains active.

## Deployment settings (not configured by this PR)
GUEST_CHECKINS_ENABLED=true
GUEST_CHECKIN_WAF_READY=true (set only after edge rate limiting configured and validated)
GUEST_ALLOWED_ORIGIN=https://alltracks.icevent.app
GUEST_CHECKIN_CANISTER_ID=r6cnt-kyaaa-aaaal-aab3a-cai
GUEST_CHECKIN_IDENTITY_JSON=server-only Ed25519 identity JSON
TURNSTILE_SECRET_KEY=server-only Turnstile secret
VITE_TURNSTILE_SITE_KEY=public Turnstile sitekey

Keep ALL private values outside the source repo and frontend build. The gateway key must be a least-privilege guest-only key, NOT a controller or personal key. Use the correct preview hostname/sitekey during testing.

Configure rate limits in the *edge WAF* (e.g. 5 attempts / 10 min per IP with appropriately configured exceptions). A serverless instance's in-memory limiter is NOT durable and must not be used alone. Enforce independent per-object quotas on chain. No Redis or extra Canister is required.

## Release gates
1. The Motoko source is now synced at https://github.com/ICEvent/alltracks . Verify the restored source and stable types against the actual deployed module, and confirm the current canister controllers.
2. Review the implemented owner policy, per-object gateway ACL and submitGuestCheckin in backend PR #1; keep object policy off by default.
3. Backend CI compiles, and local dfx integration tests cover owner policy, unauthorized callers, accepted gateway submission, replay, GPS validation, quota gap, ordinary Checkpoints unchanged and upgrade persistence. Review untested concurrent bursts, full daily-quota rollover and mainnet migration separately.
4. Review stable compatibility and cycles, and back up data.
5. Provision least-privilege relay identity and grant its Principal via authorized canister administration.
6. Configure Turnstile and WAF in preview; run two-device, retry, GPS denial, forged request, expired CAPTCHA and outage tests.
7. Only then enable guest mode in production and start placing authorized QR objects.

**Do not set GUEST_CHECKINS_ENABLED=true before backend PR #1 is safely deployed to the existing canister, the owner opt-in is granted, and WAF + Turnstile have been independently verified.**
