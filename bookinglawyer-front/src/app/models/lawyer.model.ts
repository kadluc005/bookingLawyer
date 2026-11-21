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
}
