export const idlFactory = ({ IDL }) => {
  const Comto = IDL.Variant({
    'calendar' : IDL.Nat,
    'event' : IDL.Nat,
    'note' : IDL.Nat,
    'other' : IDL.Text,
    'todo' : IDL.Nat,
    'user' : IDL.Text,
  });
  const NewComment = IDL.Record({
    'attachments' : IDL.Vec(IDL.Text),
    'comment' : IDL.Text,
    'comto' : Comto,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Comment = IDL.Record({
    'attachments' : IDL.Vec(IDL.Text),
    'comment' : IDL.Text,
    'comto' : Comto,
    'timestamp' : IDL.Int,
    'user' : IDL.Text,
  });
  return IDL.Service({
    'addComment' : IDL.Func([NewComment], [Result], []),
    'getComments' : IDL.Func([Comto, IDL.Nat], [IDL.Vec(Comment)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
