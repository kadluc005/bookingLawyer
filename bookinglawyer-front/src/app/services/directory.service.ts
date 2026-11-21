import { inject, Injectable } from "@angular/core";
import { Lawyer, LawyerDocument } from "../models/lawyer.model";
import { SessionService } from "./session.service";

interface DirectoryEntry {
  userId: string;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  experienceYears: number | null;
  specialty: Lawyer["specialty"];
  officeCity?: string | null;
  officeCountry?: string | null;
  officeStreet?: string | null;
  officeNumber?: string | null;
  websiteUrl?: string | null;
  photoUrl?: string | null;
  documents?: LawyerDocument[];
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
        officeCity: entry.officeCity,
        officeCountry: entry.officeCountry,
        officeStreet: entry.officeStreet,
        officeNumber: entry.officeNumber,
        websiteUrl: entry.websiteUrl,
        photoUrl: entry.photoUrl,
        documents: entry.documents,
      })));
      if (page.length < 100) return entries;
    }
  }
}
