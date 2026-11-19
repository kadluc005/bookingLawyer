import { Injectable } from "@angular/core";
import { Profile } from "../models/profile.model";

const blank = (): Profile => ({
  firstName: "",
  lastName: "",
  city: "",
  country: "",
  email: "",
  phone: "",
  officeStreet: "",
  officeNumber: "",
  specialty: "",
  experienceYears: null,
  cvText: "",
  websiteUrl: "",
});
@Injectable({ providedIn: "root" })
export class DossierService {
  accountEmail = "";
  profile = blank();
  documents: File[] = [];
  photo?: File;
  confirmed = false;
  method = "";

  get reviewId() {
    return "dossier:" + this.accountEmail;
  }

  startDemoRegistration(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.accountEmail !== normalizedEmail) this.clear();
    this.accountEmail = normalizedEmail;
    this.profile.email = this.accountEmail;
  }

  clear() {
    this.accountEmail = "";
    this.profile = blank();
    this.documents = [];
    this.photo = undefined;
    this.confirmed = false;
    this.method = "";
  }
}
