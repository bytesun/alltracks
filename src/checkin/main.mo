// Public QR check-ins for fixed locations. Stored in stable ICP canister state.
// Anyone may check in; only authenticated principals may create/close a location.
import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

actor QRCheckIn {
  public type Location = {
    id : Nat;
    name : Text;
    description : Text;
    latitude : Float;
    longitude : Float;
    createdBy : Principal;
    createdAt : Int;
    active : Bool;
  };

  public type CheckIn = {
    id : Nat;
    locationId : Nat;
    name : Text;
    note : Text;
    createdAt : Int;
    createdBy : ?Principal;
  };

  public type Result<T> = { #ok : T; #err : Text };

  stable var locations : [Location] = [];
  stable var checkIns : [CheckIn] = [];
  stable var nextLocationId : Nat = 1;
  stable var nextCheckInId : Nat = 1;
  // All anonymous callers share the anonymous principal. A short location-wide
  // cooldown provides a modest abuse brake, not full Sybil/bot protection.
  stable var lastCheckInAt : [(Nat, Int)] = [];

  public shared ({ caller }) func createLocation(
    name : Text,
    description : Text,
    latitude : Float,
    longitude : Float,
  ) : async Result<Location> {
    if (Principal.isAnonymous(caller)) return #err("Sign in to create a location");
    if (Text.size(name) == 0 or Text.size(name) > 100) return #err("Location name must be 1–100 characters");
    if (Text.size(description) > 400) return #err("Description must be at most 400 characters");
    if (latitude != latitude or longitude != longitude or latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180) {
      return #err("Invalid latitude or longitude");
    };
    if (locations.size() >= 10_000) return #err("Location capacity reached");

    let location : Location = {
      id = nextLocationId;
      name;
      description;
      latitude;
      longitude;
      createdBy = caller;
      createdAt = Time.now();
      active = true;
    };
    nextLocationId += 1;
    locations := Array.append<Location>(locations, [location]);
    #ok(location);
  };

  public query func getLocation(id : Nat) : async ?Location {
    Array.find<Location>(locations, func(l) { l.id == id });
  };

  public query func listLocations(offset : Nat, limit : Nat) : async [Location] {
    let total = locations.size();
    if (offset >= total) return [];
    let count = if (limit > 100) 100 else limit;
    let take = if (count > total - offset) total - offset else count;
    Array.tabulate<Location>(take, func(i) { locations[total - 1 - offset - i] });
  };

  public shared ({ caller }) func setLocationActive(id : Nat, active : Bool) : async Result<Location> {
    switch (Array.find<Location>(locations, func(l) { l.id == id })) {
      case null { #err("Location not found") };
      case (?found) {
        if (found.createdBy != caller) return #err("Only the owner can change this location");
        let updated = { found with active = active };
        locations := Array.map<Location, Location>(
          locations,
          func(l) { if (l.id == id) updated else l },
        );
        #ok(updated);
      };
    };
  };

  public shared ({ caller }) func checkIn(locationId : Nat, name : Text, note : Text) : async Result<CheckIn> {
    switch (Array.find<Location>(locations, func(l) { l.id == locationId })) {
      case null { return #err("Location not found") };
      case (?l) { if (not l.active) return #err("Check-ins are closed for this location") };
    };
    if (Text.size(name) > 40 or Text.size(note) > 500) return #err("Name or note is too long");
    if (checkIns.size() >= 100_000) return #err("Check-in capacity reached");
    let now = Time.now();
    switch (Array.find<(Nat, Int)>(lastCheckInAt, func(v) { v.0 == locationId })) {
      case null {};
      case (?last) {
        if (now - last.1 < 2_000_000_000) return #err("Please try again in a moment");
      };
    };

    let entry : CheckIn = {
      id = nextCheckInId;
      locationId;
      name;
      note;
      createdAt = now;
      createdBy = if (Principal.isAnonymous(caller)) null else ?caller;
    };
    nextCheckInId += 1;
    checkIns := Array.append<CheckIn>(checkIns, [entry]);
    lastCheckInAt := Array.append<(Nat, Int)>(
      Array.filter<(Nat, Int)>(lastCheckInAt, func(v) { v.0 != locationId }),
      [(locationId, now)],
    );
    #ok(entry);
  };

  public query func listCheckIns(locationId : Nat, offset : Nat, limit : Nat) : async [CheckIn] {
    let matching = Array.filter<CheckIn>(checkIns, func(c) { c.locationId == locationId });
    let total = matching.size();
    if (offset >= total) return [];
    let count = if (limit > 100) 100 else limit;
    let take = if (count > total - offset) total - offset else count;
    Array.tabulate<CheckIn>(take, func(i) { matching[total - 1 - offset - i] });
  };

  // Location owners can remove abusive public notes.
  public shared ({ caller }) func removeCheckIn(id : Nat) : async Result<Bool> {
    switch (Array.find<CheckIn>(checkIns, func(c) { c.id == id })) {
      case null { #err("Check-in not found") };
      case (?entry) {
        switch (Array.find<Location>(locations, func(l) { l.id == entry.locationId })) {
          case null { #err("Location not found") };
          case (?location) {
            if (location.createdBy != caller) return #err("Only the location owner can moderate notes");
            checkIns := Array.filter<CheckIn>(checkIns, func(c) { c.id != id });
            #ok(true);
          };
        };
      };
    };
  };
};
