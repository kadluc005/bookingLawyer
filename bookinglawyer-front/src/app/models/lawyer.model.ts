import { Specialty } from "./profile.model";

export interface Lawyer {
  id: string;
  first: string;
  last: string;
  city: string;
  country: string;
  years: number | null;
  specialty: Specialty;
  bio: string;
  officeCity?: string | null;
  officeCountry?: string | null;
  officeStreet?: string | null;
  officeNumber?: string | null;
  websiteUrl?: string | null;
  photoUrl?: string | null;
  documents?: LawyerDocument[];
}

export interface LawyerDocument {
  id: string;
  name: string;
  url: string;
}
