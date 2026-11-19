export const specialties = {
  criminal_law: "Droit pénal",
  civil_law: "Affaires civiles",
  arbitration: "Arbitrage",
  cybercrime: "Cybercriminalité",
};
export type Specialty = keyof typeof specialties;
export const choices = Object.entries(specialties);
export interface Profile {
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  officeStreet: string;
  officeNumber: string;
  specialty: Specialty | "";
  experienceYears: number | null;
  cvText: string;
  websiteUrl: string;
}
