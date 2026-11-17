import Array "mo:base/Array";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Time "mo:base/Time";

// Separate ICP canister for AllTracks Object Journey.
// A standalone canister avoids changing the existing production tracking canister.
// In a future backend-source migration these types can be incorporated directly.
persistent actor ObjectJourney {
  public type Action = { #found; #carried; #left };

  public type CheckinInput = {
    latitude : Float;
    longitude : Float;
    accuracyMeters : ?Nat;
    action : Action;
    note : Text;
  };

  public type Checkin = {
    id : Nat;
    objectId : Text;
    latitude : Float;
    longitude : Float;
    accuracyMeters : ?Nat;
    action : Action;
    note : Text;
    createdAt : Int; // ICP Time nanoseconds (server clock).
  };

  public type SubmitResult = { #ok : Checkin; #err : Text };

  // First pilot is intentionally limited to a single, explicitly authorized item.
  let pilotId = "cup-7h9m4k";
  let maxStored : Nat = 500;
  let maxReturned : Nat = 200;
  let cooldownNs : Int = 15_000_000_000;
  let dayNs : Int = 86_400_000_000_000;
  let maxDailyCheckins : Nat = 60;

  var checkins : [Checkin] = [];
  var nextId : Nat = 1;
  var lastSubmissionNs : Int = 0;
  var dayBucket : Int = -1;
  var dailyCount : Nat = 0;

  func approximate(value : Float) : Float {
    // Rounding here is important: the exact GPS location is never persisted.
    Float.floor(value * 1000.0 + 0.5) / 1000.0
  };

  public query func getCheckins(objectId : Text) : async [Checkin] {
    if (objectId != pilotId) return [];
    let size = checkins.size();
    let count = if (size < maxReturned) size else maxReturned;
    Array.tabulate<Checkin>(
      count,
      func(i : Nat) : Checkin { checkins[size - 1 - i] },
    )
  };

  public shared func addCheckin(objectId : Text, point : CheckinInput) : async SubmitResult {
    if (objectId != pilotId) return #err("Unknown object ID");
    if (
      point.latitude != point.latitude or point.longitude != point.longitude or
      point.latitude < -90.0 or point.latitude > 90.0 or
      point.longitude < -180.0 or point.longitude > 180.0
    ) return #err("Invalid coordinates");
    if (Text.size(point.note) > 280) return #err("Note is too long");
    switch (point.accuracyMeters) {
      case (?accuracy) {
        if (accuracy > 2000) return #err("GPS accuracy exceeds supported range");
      };
      case null {};
    };

    // ICP callers may be anonymous. Without an external CAPTCHA/gateway it is not
    // possible to attest to physical custody of the object or a real device GPS.
    // Protect the pilot with a global cooldown and bounded storage; moderation
    // is required before a large-scale public rollout.
    let now = Time.now();
    let today = now / dayNs;
    if (today != dayBucket) {
      dayBucket := today;
      dailyCount := 0;
    };
    if (dailyCount >= maxDailyCheckins) {
      return #err("Daily pilot check-in limit reached. Try tomorrow.");
    };
    if (lastSubmissionNs > 0 and now - lastSubmissionNs < cooldownNs) {
      return #err("Please wait 15 seconds between check-ins");
    };

    let entry : Checkin = {
      id = nextId;
      objectId = pilotId;
      latitude = approximate(point.latitude);
      longitude = approximate(point.longitude);
      accuracyMeters = point.accuracyMeters;
      action = point.action;
      note = point.note;
      createdAt = now;
    };

    let appended = Array.append<Checkin>(checkins, [entry]);
    if (appended.size() > maxStored) {
      let offset = appended.size() - maxStored;
      checkins := Array.tabulate<Checkin>(
        maxStored,
        func(i : Nat) : Checkin { appended[offset + i] },
      );
    } else {
      checkins := appended;
    };

    nextId += 1;
    dailyCount += 1;
    lastSubmissionNs := now;
    #ok(entry)
  };
}
