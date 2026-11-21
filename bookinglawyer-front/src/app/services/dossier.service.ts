import { Injectable } from "@angular/core";
import { SessionService } from "./session.service";
import type { ReviewStatus } from "./activity.service";
import { Profile } from "../models/profile.model";

export interface Membership {
  status: "pending_payment" | "active" | "expired" | "cancelled";
  startsAt: string | null;
  endsAt: string | null;
}

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
  reviewStatus: ReviewStatus = "pending_review";

  async load(session: SessionService) {
    const email = session.account()?.email ?? "";
    if (this.accountEmail !== email) this.clear();
    const profile = await session.request<Partial<Profile> & { reviewStatus: ReviewStatus }>("/lawyers/me");
    this.accountEmail = email;
    this.reviewStatus = profile.reviewStatus;
    this.profile = { ...blank(), ...profile, email, officeStreet: profile.officeStreet ?? "", officeNumber: profile.officeNumber ?? "", cvText: profile.cvText ?? "", websiteUrl: profile.websiteUrl ?? "" };
  }

  clear() {
    this.accountEmail = "";
    this.profile = blank();
    this.documents = [];
    this.photo = undefined;
    this.confirmed = false;
    this.reviewStatus = "pending_review";
  }
}
