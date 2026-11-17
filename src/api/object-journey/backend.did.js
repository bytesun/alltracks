// Kept in sync with canisters/object_journey/backend.did.
// Replace with dfx-generated declarations after the canister is deployed.
export const idlFactory = ({ IDL }) => {
  const Action = IDL.Variant({
    found: IDL.Null,
    carried: IDL.Null,
    left: IDL.Null,
  });
  const CheckinInput = IDL.Record({
    latitude: IDL.Float64,
    longitude: IDL.Float64,
    accuracyMeters: IDL.Opt(IDL.Nat),
    action: Action,
    note: IDL.Text,
  });
  const Checkin = IDL.Record({
    id: IDL.Nat,
    objectId: IDL.Text,
    latitude: IDL.Float64,
    longitude: IDL.Float64,
    accuracyMeters: IDL.Opt(IDL.Nat),
    action: Action,
    note: IDL.Text,
    createdAt: IDL.Int,
  });
  const SubmitResult = IDL.Variant({ ok: Checkin, err: IDL.Text });
  return IDL.Service({
    getCheckins: IDL.Func([IDL.Text], [IDL.Vec(Checkin)], ['query']),
    addCheckin: IDL.Func([IDL.Text, CheckinInput], [SubmitResult], []),
  });
};
export const init = () => [];
