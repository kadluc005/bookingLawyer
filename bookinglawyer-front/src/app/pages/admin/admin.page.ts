import { DatePipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { lawyers } from "../../data/lawyers";
import { specialties } from "../../models/profile.model";
import { ActivityService, ReviewStatus } from "../../services/activity.service";
import { ClientService } from "../../services/client.service";
import { DossierService } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [DatePipe],
  templateUrl: "./admin.page.html",
})
export class AdminPage {
  readonly activity = inject(ActivityService);
  readonly clients = inject(ClientService).clients;
  readonly dossier = inject(DossierService);
  private readonly session = inject(SessionService);
  readonly lawyers = lawyers;
  readonly specialties = specialties;
  readonly reviewLabels = {
    pending_review: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
  };
  selectedId = "";

  review(id: string, status: ReviewStatus) {
    const actor = this.session.account()?.email;
    if (actor) this.activity.review(id, actor, status);
  }
}
