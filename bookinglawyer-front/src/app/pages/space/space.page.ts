import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DossierService } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";
import { errorMessage } from "../../services/api.service";

@Component({
  imports: [RouterLink],
  templateUrl: "./space.page.html",
})
export class SpacePage {
  d = inject(DossierService);
  private readonly session = inject(SessionService);
  error = "";

  async ngOnInit() {
    try {
      await this.d.load(this.session);
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  get reviewLabel() {
    return {
      pending_review: "En attente",
      approved: "Approuvé",
      rejected: "Rejeté",
    }[this.d.reviewStatus];
  }
}
