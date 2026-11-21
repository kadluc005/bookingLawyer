import { Injectable, signal } from "@angular/core";
import { api, ApiError } from "./api.service";

export type Role = "lawyer" | "client" | "admin";
type Account = { id: string; role: Role; email: string };
const SESSION_KEY = "bookinglawyer.accessToken";

type Session = { user: Account; accessToken: string };

@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly token = signal<string | null>(null);
  private readonly current = signal<Account | null>(null);
  readonly account = this.current.asReadonly();

  async restore() {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) return;
    try {
      const account = await api<Account>("/auth/me", { token });
      this.token.set(token);
      this.current.set(account);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) this.end();
    }
  }

  async signIn(email: string, password: string) {
    const session = await api<Session>("/auth/token", { method: "POST", body: { email, password } });
    sessionStorage.setItem(SESSION_KEY, session.accessToken);
    this.current.set(session.user);
    this.token.set(session.accessToken);
    return session.user;
  }

  async request<T>(path: string, method = "GET", body?: unknown) {
    const token = this.token();
    if (!token) return Promise.reject(new Error("Connectez-vous pour continuer."));
    try {
      return await api<T>(path, { token, method, body });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && this.token() === token) this.end();
      throw error;
    }
  }

  end() {
    sessionStorage.removeItem(SESSION_KEY);
    this.current.set(null);
    this.token.set(null);
  }
}
