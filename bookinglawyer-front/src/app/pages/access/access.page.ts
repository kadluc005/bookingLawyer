import { Component, inject } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { DossierService } from "../../services/dossier.service";
import { ClientService } from "../../services/client.service";
import { Role, SessionService } from "../../services/session.service";

@Component({
  imports: [RouterLink],
  templateUrl: "./access.page.html",
})
export class AccessPage {
  private readonly session = inject(SessionService);
  private readonly dossier = inject(DossierService);
  readonly clients = inject(ClientService).clients;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  enter(role: Role, clientEmail?: string) {
    if (role === "lawyer" && !this.dossier.accountEmail) {
      void this.router.navigateByUrl("/inscription");
      return;
    }
    const email = role === "lawyer" ? this.dossier.accountEmail : clientEmail ?? role + "@example.test";
    this.session.start(role, email);
    const lawyerId = this.route.snapshot.queryParamMap.get("avocat");
    if (role === "client" && lawyerId) {
      void this.router.navigate(["/avocats", lawyerId]);
      return;
    }
    void this.router.navigateByUrl(role === "admin" ? "/administration" : role === "lawyer" ? "/espace" : "/annuaire");
  }
}
