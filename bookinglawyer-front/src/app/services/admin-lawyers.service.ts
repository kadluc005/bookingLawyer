import { inject, Injectable } from "@angular/core";
import { SessionService } from "./session.service";
import { Specialty } from "../models/profile.model";

export type ReviewStatus = "pending_review" | "approved" | "rejected";
export type MembershipStatus = "pending_payment" | "active" | "expired" | "cancelled";

export interface AdminLawyer {
  lawyerId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  city: string | null;
  country: string | null;
  specialty: Specialty | null;
  reviewStatus: ReviewStatus | null;
  submittedAt: string | null;
  accountStatus: string;
  hasActiveMembership: boolean;
}

export interface AdminLawyerDetail {
  email: string;
  accountStatus: string;
  profile: {
    userId: string;
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    phone: string;
    specialty: Specialty;
    experienceYears: number | null;
    officeStreet: string | null;
    officeNumber: string | null;
    officeCity: string | null;
    officeCountry: string | null;
    websiteUrl: string | null;
    photoUrl?: string | null;
    cvText: string | null;
    reviewStatus: ReviewStatus;
    submittedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
  };
  memberships: {
    id: string;
    status: MembershipStatus;
    amount: string;
    currency: string;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
  }[];
  documents: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
}

export interface AdminContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  channel: string;
  createdAt: string;
}

export interface AdminAudit {
  id: string;
  action: string;
  createdAt: string;
}

@Injectable({ providedIn: "root" })
export class AdminLawyersService {
  private readonly session = inject(SessionService);

  list(limit: number, offset: number) {
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return this.session.request<{ lawyers: AdminLawyer[]; total: number; pending: number }>("/admin/lawyers?" + query);
  }

  detail(id: string) {
    return this.session.request<AdminLawyerDetail>("/admin/lawyers/" + encodeURIComponent(id));
  }

  contacts(id: string) {
    return this.session.request<AdminContact[]>("/admin/lawyers/" + encodeURIComponent(id) + "/contact-events");
  }

  audit(id: string) {
    return this.session.request<AdminAudit[]>("/admin/audit/lawyer_profile/" + encodeURIComponent(id));
  }

  review(id: string, decision: "approved" | "rejected", reason?: string) {
    return this.session.request<{ notificationSent: boolean | null }>("/admin/lawyers/" + encodeURIComponent(id) + "/review", "PATCH", { decision, reason });
  }
}
