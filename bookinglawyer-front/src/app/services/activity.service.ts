import { Injectable, signal } from "@angular/core";

export type ReviewStatus = "pending_review" | "approved" | "rejected";
export type ContactChannel = "email" | "phone";

@Injectable({ providedIn: "root" })
export class ActivityService {
  readonly reviews = signal<Partial<Record<string, ReviewStatus>>>({});
  readonly contacts = signal<{ lawyerId: string; clientEmail: string; channel: ContactChannel; date: Date }[]>([]);
  readonly audit = signal<{ lawyerId: string; actor: string; status: ReviewStatus; date: Date }[]>([]);

  review(lawyerId: string, actor: string, status: ReviewStatus) {
    this.reviews.update((reviews) => ({ ...reviews, [lawyerId]: status }));
    this.audit.update((entries) => [{ lawyerId, actor, status, date: new Date() }, ...entries]);
  }

  contact(lawyerId: string, clientEmail: string, channel: ContactChannel) {
    this.contacts.update((entries) => [{ lawyerId, clientEmail, channel, date: new Date() }, ...entries]);
  }
}
