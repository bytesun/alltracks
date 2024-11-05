import { Doc, UserData } from '@junobuild/core';

export interface User extends Doc<UserData> {
  id: string;
  name: string;
  email: string;
}
