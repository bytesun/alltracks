import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Comto =
  | { 'calendar' : bigint }
  | { 'event' : bigint }
  | { 'note' : bigint }
  | { 'other' : string }
  | { 'todo' : bigint }
  | { 'user' : string };

export interface NewComment {
  'attachments' : Array<string>;
  'comment' : string;
  'comto' : Comto;
}

export interface Comment {
  'attachments' : Array<string>;
  'comment' : string;
  'comto' : Comto;
  'timestamp' : bigint;
  'user' : string;
}

export type Result = { 'ok' : bigint } | { 'err' : string };

export interface _SERVICE {
  'addComment' : ActorMethod<[NewComment], Result>;
  'getComments' : ActorMethod<[Comto, bigint], Array<Comment>>;
}

export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
