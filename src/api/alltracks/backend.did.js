export const idlFactory = ({ IDL }) => {
  const Time = IDL.Int;
  const NewCheckPoint = IDL.Record({
    'latitude' : IDL.Float64,
    'elevation' : IDL.Float64,
    'note' : IDL.Opt(IDL.Text),
    'groupId' : IDL.Opt(IDL.Text),
    'trackId' : IDL.Text,
    'longitude' : IDL.Float64,
    'timestamp' : Time,
    'isPublic' : IDL.Bool,
    'photo' : IDL.Opt(IDL.Text),
  });
  const CheckPoint = IDL.Record({
    'latitude' : IDL.Float64,
    'elevation' : IDL.Float64,
    'note' : IDL.Opt(IDL.Text),
    'createdBy' : IDL.Principal,
    'groupId' : IDL.Opt(IDL.Text),
    'trackId' : IDL.Text,
    'longitude' : IDL.Float64,
    'timestamp' : Time,
    'isPublic' : IDL.Bool,
    'photo' : IDL.Opt(IDL.Text),
  });
  const NewGroup = IDL.Record({
    'id' : IDL.Text,
    'members' : IDL.Vec(IDL.Principal),
    'admin' : IDL.Principal,
    'name' : IDL.Text,
    'description' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const CheckpointFilter = IDL.Variant({
    'user' : IDL.Principal,
    'groupId' : IDL.Text,
    'trackId' : IDL.Text,
  });
  const Group = IDL.Record({
    'id' : IDL.Text,
    'members' : IDL.Vec(IDL.Principal),
    'admin' : IDL.Principal,
    'name' : IDL.Text,
    'createdAt' : Time,
    'createdBy' : IDL.Principal,
    'description' : IDL.Text,
  });
  const UserStats = IDL.Record({
    'totalHours' : IDL.Float64,
    'firstHikeDate' : Time,
    'completedTrails' : IDL.Nat,
    'totalDistance' : IDL.Float64,
    'hikerId' : IDL.Principal,
    'totalElevation' : IDL.Float64,
  });
  return IDL.Service({
    'createCheckpoint' : IDL.Func([NewCheckPoint], [CheckPoint], []),
    'createGroup' : IDL.Func([NewGroup], [Result], []),
    'getCheckpoints' : IDL.Func(
        [CheckpointFilter],
        [IDL.Vec(CheckPoint)],
        ['query'],
      ),
    'getGroup' : IDL.Func([IDL.Text], [IDL.Opt(Group)], ['query']),
    'getMyGroups' : IDL.Func([], [IDL.Vec(Group)], ['query']),
    'getUserstats' : IDL.Func([IDL.Principal], [IDL.Opt(UserStats)], ['query']),
    'updateGroup' : IDL.Func([IDL.Text, NewGroup], [Result], []),
    'updateUserStats' : IDL.Func(
        [IDL.Float64, IDL.Float64, IDL.Float64],
        [UserStats],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
