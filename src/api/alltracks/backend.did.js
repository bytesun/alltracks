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
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const NewGroup = IDL.Record({
    'id' : IDL.Text,
    'members' : IDL.Vec(IDL.Principal),
    'admin' : IDL.Principal,
    'name' : IDL.Text,
    'description' : IDL.Text,
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
  const Result_3 = IDL.Variant({ 'ok' : Group, 'err' : IDL.Text });
  const NewTrack = IDL.Record({
    'id' : IDL.Text,
    'duration' : IDL.Float64,
    'elevation' : IDL.Float64,
    'startime' : Time,
    'trackfile' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'groupId' : IDL.Opt(IDL.Text),
    'length' : IDL.Float64,
    'isPublic' : IDL.Bool,
  });
  const Track = IDL.Record({
    'id' : IDL.Text,
    'duration' : IDL.Float64,
    'elevation' : IDL.Float64,
    'startime' : Time,
    'trackfile' : IDL.Text,
    'name' : IDL.Text,
    'createdBy' : IDL.Principal,
    'description' : IDL.Text,
    'groupId' : IDL.Opt(IDL.Text),
    'length' : IDL.Float64,
    'isPublic' : IDL.Bool,
  });
  const Result_2 = IDL.Variant({ 'ok' : Track, 'err' : IDL.Text });
  const TrailType = IDL.Variant({
    'tloop' : IDL.Null,
    'outandback' : IDL.Null,
    'pointto' : IDL.Null,
  });
  const Difficulty = IDL.Variant({
    'easy' : IDL.Null,
    'hard' : IDL.Null,
    'expert' : IDL.Null,
    'moderate' : IDL.Null,
  });
  const NewTrail = IDL.Record({
    'duration' : IDL.Float64,
    'ttype' : TrailType,
    'trailfile' : IDL.Text,
    'difficulty' : Difficulty,
    'name' : IDL.Text,
    'rate' : IDL.Float64,
    'tags' : IDL.Vec(IDL.Text),
    'description' : IDL.Text,
    'distance' : IDL.Float64,
    'elevationGain' : IDL.Float64,
    'photos' : IDL.Vec(IDL.Text),
  });
  const Trail = IDL.Record({
    'id' : IDL.Nat,
    'duration' : IDL.Float64,
    'ttype' : TrailType,
    'trailfile' : IDL.Text,
    'difficulty' : Difficulty,
    'name' : IDL.Text,
    'createdAt' : Time,
    'createdBy' : IDL.Principal,
    'rate' : IDL.Float64,
    'tags' : IDL.Vec(IDL.Text),
    'description' : IDL.Text,
    'distance' : IDL.Float64,
    'elevationGain' : IDL.Float64,
    'photos' : IDL.Vec(IDL.Text),
  });
  const Result_1 = IDL.Variant({ 'ok' : Trail, 'err' : IDL.Text });
  const CheckpointFilter = IDL.Variant({
    'user' : IDL.Principal,
    'groupId' : IDL.Text,
    'trackId' : IDL.Text,
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
  const TrackFilter = IDL.Variant({
    'user' : IDL.Principal,
    'group' : IDL.Text,
  });
  const TrailFilter = IDL.Variant({
    'ttype' : TrailType,
    'difficulty' : Difficulty,
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
    'createCheckpoint' : IDL.Func([NewCheckPoint], [Result], []),
    'createGroup' : IDL.Func([NewGroup], [Result_3], []),
    'createTrack' : IDL.Func([NewTrack], [Result_2], []),
    'createTrail' : IDL.Func([NewTrail], [Result_1], []),
    'getCheckpoints' : IDL.Func(
        [CheckpointFilter],
        [IDL.Vec(CheckPoint)],
        ['query'],
      ),
    'getGroup' : IDL.Func([IDL.Text], [IDL.Opt(Group)], ['query']),
    'getMyGroups' : IDL.Func([], [IDL.Vec(Group)], ['query']),
    'getMyTrails' : IDL.Func([], [IDL.Vec(Trail)], ['query']),
    'getTrack' : IDL.Func([IDL.Text], [IDL.Opt(Track)], ['query']),
    'getTracks' : IDL.Func([TrackFilter], [IDL.Vec(Track)], ['query']),
    'getTrail' : IDL.Func([IDL.Nat], [IDL.Opt(Trail)], ['query']),
    'getTrails' : IDL.Func([TrailFilter], [IDL.Vec(Trail)], ['query']),
    'getUserstats' : IDL.Func([IDL.Principal], [IDL.Opt(UserStats)], ['query']),
    'searchTrails' : IDL.Func([IDL.Text], [IDL.Vec(Trail)], ['query']),
    'updateGroup' : IDL.Func([IDL.Text, NewGroup], [Result], []),
    'updateUserStats' : IDL.Func(
        [IDL.Float64, IDL.Float64, IDL.Float64],
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
