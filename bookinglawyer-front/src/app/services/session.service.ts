import { Injectable, signal } from "@angular/core";
import { api } from "./api.service";

export type Role = "lawyer" | "client" | "admin";
type Account = { id: string; role: Role; email: string };
type Session = { user: Account; accessToken: string };

@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly token = signal<string | null>(null);
  private readonly current = signal<Account | null>(null);
  readonly account = this.current.asReadonly();

  async signIn(email: string, password: string) {
    const session = await api<Session>("/auth/token", { method: "POST", body: { email, password } });
    this.current.set(session.user);
    this.token.set(session.accessToken);
    return session.user;
  }

  request<T>(path: string, method = "GET", body?: unknown) {
    const token = this.token();
    if (!token) return Promise.reject(new Error("Connectez-vous pour continuer."));
    return api<T>(path, { token, method, body });
  }

  end() {
    this.current.set(null);
    this.token.set(null);
  }
}
