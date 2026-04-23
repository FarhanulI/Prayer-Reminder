import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // A simple mock for now
  const login = () => {
    setLoading(true);
    setTimeout(() => {
      setUser({ uid: '123', email: 'test@example.com' });
      setLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
  };

  return { user, loading, login, logout };
};
