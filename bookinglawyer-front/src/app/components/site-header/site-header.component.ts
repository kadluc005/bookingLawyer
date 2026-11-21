import { Component, inject } from "@angular/core";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { DossierService } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";

@Component({
  selector: "app-site-header",
  imports: [RouterLink, RouterLinkActive],
  templateUrl: "./site-header.component.html",
})
export class SiteHeaderComponent {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);

  private readonly dossier = inject(DossierService);

  signOut() {
    this.dossier.clear();
    this.session.end();
    void this.router.navigateByUrl("/");
  }
}
