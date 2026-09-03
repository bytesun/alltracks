# Activity History & Outdoor Card UX

This pass completes the local-first activity lifecycle introduced by the recording UX work.

## User journey

`Record → Finish → Outdoor Card → History → Activity Detail → Share`

## Design decisions

- Manual recording remains the default.
- Local recording remains usable without authentication.
- A successful local export saves a completed activity snapshot in IndexedDB so Finish no longer removes the activity from the user's visible history.
- History merges on-device activities with cloud activities when the user is signed in.
- The same `ActivityShareCard` component is reused in Finish and Activity Detail to prevent visual drift.
- Outdoor-card sharing generates a PNG. Mobile browsers with Web Share file support use the native share sheet; other browsers download the PNG.
- Local history is intentionally device-local. It is not presented as synced or backed up.

## Mobile QA targets

Responsive rules explicitly cover narrow phone widths at 360px, 430px, and intermediate layouts. Key actions use approximately 46–50px touch targets, summary/detail surfaces use `dvh` and safe-area padding where relevant, and map/detail layouts stack instead of compressing desktop columns.

## IndexedDB migration

The local database moves from version 2 to version 3 and adds an `activity-history` store. Active-track access is centralized through `IndexDBHandler` so older direct `openDB(..., 2)` calls do not throw `VersionError` after the migration.
