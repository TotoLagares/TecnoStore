// Sesión del usuario (admin o cliente): token + datos del usuario.
// Se guarda en localStorage para no perder la sesión al recargar.
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';

const TOKEN_KEY = 'tecnostore_token';
const USER_KEY = 'tecnostore_user';

const AuthContext = createContext(null);

// localStorage puede fallar (modo privado, bloqueado): por eso el try/catch.
function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (err) {
    // Sin localStorage la sesión dura hasta recargar la página.
  }
}

function readUser() {
  try {
    return JSON.parse(readStorage(USER_KEY));
  } catch (err) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => {
    const saved = readStorage(TOKEN_KEY);
    setAuthToken(saved); // el cliente HTTP necesita el token desde el primer request
    return saved;
  });
  const [user, setUser] = useState(readUser);
  // Mientras se valida el token guardado, las rutas protegidas esperan.
  const [checking, setChecking] = useState(Boolean(token));
  // true si el token guardado resultó vencido: el panel avisa "Tu sesión expiró".
  const [sessionExpired, setSessionExpired] = useState(false);

  function saveSession(newToken, newUser) {
    if (newToken) setSessionExpired(false);
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    writeStorage(TOKEN_KEY, newToken);
    writeStorage(USER_KEY, newUser ? JSON.stringify(newUser) : null);
  }

  function logout() {
    saveSession(null, null);
  }

  async function login(email, password) {
    const data = await authApi.login(email, password);
    saveSession(data.token, data.user);
    return data.user;
  }

  function updateUser(newUser) {
    setUser(newUser);
    writeStorage(USER_KEY, JSON.stringify(newUser));
  }

  // Ante un 401 en un request autenticado: se cierra la sesión y se va al login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      saveSession(null, null);
      navigate('/login?expired=1');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Al montar: si hay un token guardado, se valida contra GET /auth/me.
  useEffect(() => {
    if (!token) return;
    authApi
      .getMe({ redirectOn401: false })
      .then((me) => updateUser(me))
      .catch((err) => {
        // Token vencido: se limpia sin redirigir (el visitante puede estar en
        // el sitio público). Si intenta entrar al panel, se le avisa.
        if (err.status === 401) {
          logout();
          setSessionExpired(true);
        }
      })
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    token,
    user,
    checking,
    sessionExpired,
    isAuthenticated: Boolean(token),
    // Solo los admins entran al panel; las cuentas nuevas son de cliente.
    isAdmin: Boolean(token) && user?.role === 'admin',
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
