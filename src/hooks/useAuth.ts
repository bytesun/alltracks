import { useState, useEffect } from 'react';
import { signIn, signOut, authSubscribe, User } from "@junobuild/core";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = authSubscribe((user: User | null) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (user) {
      await signOut();
    } else {
      await signIn();
    }
  };

  return { user, handleAuth };
};
