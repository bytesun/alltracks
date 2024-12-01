export const idlFactory = ({ IDL }) => {
  const Time = IDL.Int;
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const NewCheckPoint = IDL.Record({
    'latitude' : IDL.Float64,
    'elevation' : IDL.Float64,
    'note' : IDL.Text,
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
    'badge' : IDL.Text,
  });
  const Group = IDL.Record({
    'id' : IDL.Text,
    'members' : IDL.Vec(IDL.Principal),
    'admin' : IDL.Principal,
    'name' : IDL.Text,
    'createdAt' : Time,
    'createdBy' : IDL.Principal,
    'description' : IDL.Text,
    'badge' : IDL.Text,
  });
  const Result_3 = IDL.Variant({ 'ok' : Group, 'err' : IDL.Text });
  const IncidentCategory = IDL.Variant({
    'other' : IDL.Null,
    'wildlife' : IDL.Null,
    'obstacle' : IDL.Null,
    'hazard' : IDL.Null,
    'weather' : IDL.Null,
  });
  const Severity = IDL.Variant({
    'low' : IDL.Null,
    'high' : IDL.Null,
    'critical' : IDL.Null,
    'medium' : IDL.Null,
  });
  const NewIncidentPoint = IDL.Record({
    'latitude' : IDL.Float64,
    'elevation' : IDL.Float64,
    'note' : IDL.Text,
    'groupId' : IDL.Opt(IDL.Text),
    'trackId' : IDL.Text,
    'longitude' : IDL.Float64,
    'timestamp' : Time,
    'category' : IncidentCategory,
    'severity' : Severity,
    'photo' : IDL.Opt(IDL.Text),
  });
  const TrackFile = IDL.Record({ 'url' : IDL.Text, 'fileType' : IDL.Text });
  const NewTrack = IDL.Record({
    'id' : IDL.Text,
    'duration' : IDL.Float64,
    'elevation' : IDL.Float64,
    'startime' : Time,
    'trackfile' : TrackFile,
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
    'trackfile' : TrackFile,
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
  const CheckPoint = IDL.Record({
    'latitude' : IDL.Float64,
    'elevation' : IDL.Float64,
    'note' : IDL.Text,
    'createdBy' : IDL.Principal,
    'groupId' : IDL.Opt(IDL.Text),
    'trackId' : IDL.Text,
    'longitude' : IDL.Float64,
    'timestamp' : Time,
    'isPublic' : IDL.Bool,
    'photo' : IDL.Opt(IDL.Text),
  });
  const CheckpointFilter = IDL.Variant({
    'user' : IDL.Principal,
    'groupId' : IDL.Text,
  });
  const Photo = IDL.Record({
    'createdBy' : IDL.Principal,
    'tags' : IDL.Vec(IDL.Text),
    'photoUrl' : IDL.Text,
    'groupId' : IDL.Opt(IDL.Text),
    'trackId' : IDL.Text,
    'timestamp' : Time,
  });
  const IncidentPoint = IDL.Record({
    'latitude' : IDL.Float64,
    'elevation' : IDL.Float64,
    'note' : IDL.Text,
    'createdBy' : IDL.Principal,
    'groupId' : IDL.Opt(IDL.Text),
    'trackId' : IDL.Text,
    'longitude' : IDL.Float64,
    'timestamp' : Time,
    'category' : IncidentCategory,
    'severity' : Severity,
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
    'id' : IDL.Text,
    'totalHours' : IDL.Float64,
    'firstHikeDate' : Time,
    'completedTrails' : IDL.Nat,
    'totalDistance' : IDL.Float64,
    'totalElevation' : IDL.Float64,
  });
  return IDL.Service({
    'addPhoto' : IDL.Func(
        [
          IDL.Record({
            'tags' : IDL.Vec(IDL.Text),
            'photoUrl' : IDL.Text,
            'groupId' : IDL.Opt(IDL.Text),
            'trackId' : IDL.Text,
            'timestamp' : Time,
          }),
        ],
        [Result],
        [],
      ),
    'createCheckpoint' : IDL.Func([NewCheckPoint], [Result], []),
    'createGroup' : IDL.Func([NewGroup], [Result_3], []),
    'createIncidentPoint' : IDL.Func([NewIncidentPoint], [Result], []),
    'createTrack' : IDL.Func([NewTrack], [Result_2], []),
    'createTrail' : IDL.Func([NewTrail], [Result_1], []),
    'getCheckPointsByTrackId' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(CheckPoint)],
        ['query'],
      ),
    'getCheckpoints' : IDL.Func(
        [CheckpointFilter, Time, Time],
        [IDL.Vec(CheckPoint)],
        ['query'],
      ),
    'getGroup' : IDL.Func([IDL.Text], [IDL.Opt(Group)], ['query']),
    'getGroupPhotos' : IDL.Func(
        [IDL.Text, Time, Time],
        [IDL.Vec(Photo)],
        ['query'],
      ),
    'getIncidentCheckpoints' : IDL.Func(
        [Time, Time],
        [IDL.Vec(CheckPoint)],
        ['query'],
      ),
    'getIncidentPointsByCategory' : IDL.Func(
        [IncidentCategory],
        [IDL.Vec(IncidentPoint)],
        ['query'],
      ),
    'getIncidentPointsBySeverity' : IDL.Func(
        [Severity],
        [IDL.Vec(IncidentPoint)],
        ['query'],
      ),
    'getIncidentPointsByTimeRange' : IDL.Func(
        [Time, Time],
        [IDL.Vec(IncidentPoint)],
        ['query'],
      ),
    'getIncidentPointsByTrack' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(IncidentPoint)],
        ['query'],
      ),
    'getMyGroups' : IDL.Func([], [IDL.Vec(Group)], ['query']),
    'getMyPhotos' : IDL.Func([Time, Time], [IDL.Vec(Photo)], ['query']),
    'getMyTrails' : IDL.Func([], [IDL.Vec(Trail)], ['query']),
    'getTrack' : IDL.Func([IDL.Text], [IDL.Opt(Track)], ['query']),
    'getTrackPhotos' : IDL.Func(
        [IDL.Text, Time, Time],
        [IDL.Vec(Photo)],
        ['query'],
      ),
    'getTracks' : IDL.Func([TrackFilter], [IDL.Vec(Track)], ['query']),
    'getTrail' : IDL.Func([IDL.Nat], [IDL.Opt(Trail)], ['query']),
    'getTrails' : IDL.Func([TrailFilter], [IDL.Vec(Trail)], ['query']),
    'getUserstats' : IDL.Func([IDL.Text], [IDL.Opt(UserStats)], ['query']),
    'migrateCheckpoints' : IDL.Func([IDL.Vec(CheckPoint)], [], []),
    'migratePhotos' : IDL.Func([IDL.Vec(Photo)], [], []),
    'migrateTracks' : IDL.Func([IDL.Vec(Track)], [], []),
    'migrateTrails' : IDL.Func([IDL.Vec(Trail)], [], []),
    'migrateUserstats' : IDL.Func([UserStats], [], []),
    'searchPhotosByTags' : IDL.Func(
        [IDL.Vec(IDL.Text)],
        [IDL.Vec(Photo)],
        ['query'],
      ),
    'searchTrails' : IDL.Func([IDL.Text], [IDL.Vec(Trail)], ['query']),
    'updateGroup' : IDL.Func([IDL.Text, NewGroup], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
