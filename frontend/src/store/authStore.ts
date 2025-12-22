import { create } from 'zustand';

interface UserInfo {
  id: string;
  nome: string;
  email: string;
  varejista_id: string;
}

interface MeResponse {
  user: UserInfo;
  varejista_razao_social?: string | null;
  varejista_nome_fantasia?: string | null;
  varejista_id: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  varejistaNomeFantasia: string | null;
  isAuthenticated: boolean;
  setSession: (tokens: { access_token: string; refresh_token: string; expires_in?: number }) => void;
  setMe: (me: MeResponse) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem('pinn_varejista_access_token'),
  refreshToken: localStorage.getItem('pinn_varejista_refresh_token'),
  user: null,
  varejistaNomeFantasia: null,
  isAuthenticated: !!localStorage.getItem('pinn_varejista_access_token'),

  setSession: ({ access_token, refresh_token }) => {
    localStorage.setItem('pinn_varejista_access_token', access_token);
    localStorage.setItem('pinn_varejista_refresh_token', refresh_token);

    set({
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
    });
  },

  setMe: (me) => {
    set({
      user: me.user,
      varejistaNomeFantasia: me.varejista_nome_fantasia ?? me.varejista_razao_social ?? null,
    });
  },

  clearSession: () => {
    localStorage.removeItem('pinn_varejista_access_token');
    localStorage.removeItem('pinn_varejista_refresh_token');

    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      varejistaNomeFantasia: null,
      isAuthenticated: false,
    });
  },
}));
