import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyAuthPayload = (data) => {
    localStorage.setItem("fitclash-token", data.token);
    setUser(data.user);
  };

  useEffect(() => {
    const token = localStorage.getItem("fitclash-token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((profile) => setUser(profile))
      .catch(() => {
        localStorage.removeItem("fitclash-token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (payload, mode = "login") => {
    const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
    const data = await api.post(endpoint, payload, { includeAuth: false });
    applyAuthPayload(data);
  };

  const loginWithStrava = async (code) => {
    const data = await api.post("/auth/strava", { code }, { includeAuth: false });
    applyAuthPayload(data);
  };

  const logout = () => {
    localStorage.removeItem("fitclash-token");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, loginWithStrava, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
