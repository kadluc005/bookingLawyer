import { inject, Injectable } from "@angular/core";
import { Lawyer } from "../models/lawyer.model";
import { SessionService } from "./session.service";

interface DirectoryEntry {
  userId: string;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  experienceYears: number | null;
  specialty: Lawyer["specialty"];
}

@Injectable({ providedIn: "root" })
export class DirectoryService {
  private readonly session = inject(SessionService);

  async list(): Promise<Lawyer[]> {
    const entries: Lawyer[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await this.session.request<DirectoryEntry[]>("/lawyers?limit=100&offset=" + offset);
      entries.push(...page.map(entry => ({
        id: entry.userId,
        first: entry.firstName,
        last: entry.lastName,
        city: entry.city,
        country: entry.country,
        years: entry.experienceYears,
        specialty: entry.specialty,
        bio: "",
      })));
      if (page.length < 100) return entries;
    }
  }
}
