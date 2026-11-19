import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DossierService } from "../../services/dossier.service";
import { ActivityService } from "../../services/activity.service";

@Component({
  imports: [RouterLink],
  templateUrl: "./space.page.html",
})
export class SpacePage {
  d = inject(DossierService);
  private readonly activity = inject(ActivityService);

  get reviewLabel() {
    return {
      pending_review: "En attente",
      approved: "Approuvé",
      rejected: "Rejeté",
    }[this.activity.reviews()[this.d.reviewId] ?? "pending_review"];
  }
}
