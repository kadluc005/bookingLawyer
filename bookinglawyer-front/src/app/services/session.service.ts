import { Injectable, signal } from "@angular/core";

export type Role = "lawyer" | "client" | "admin";

@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly current = signal<{ role: Role; email: string } | null>(null);
  readonly account = this.current.asReadonly();

  start(role: Role, email: string) {
    this.current.set({ role, email: email.trim().toLowerCase() });
  }

  end() {
    this.current.set(null);
  }
}
