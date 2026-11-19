import { Injectable, signal } from "@angular/core";

export interface ClientProfile {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  city: string;
  phone: string;
}

@Injectable({ providedIn: "root" })
export class ClientService {
  private readonly profiles = signal<ClientProfile[]>([]);
  readonly clients = this.profiles.asReadonly();

  save(profile: ClientProfile) {
    this.profiles.update((profiles) => [
      ...profiles.filter((entry) => entry.email !== profile.email),
      { ...profile },
    ]);
  }
}
