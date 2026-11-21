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
  menuOpen = false;
  readonly session = inject(SessionService);
  private readonly router = inject(Router);

  private readonly dossier = inject(DossierService);

  setNewsHover(menu: HTMLDetailsElement, open: boolean) {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      menu.open = open;
    }
  }

  handleNewsClick(event: MouseEvent) {
    if (event.detail > 0 && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      event.preventDefault();
    }
  }

  signOut() {
    this.menuOpen = false;
    this.dossier.clear();
    this.session.end();
    void this.router.navigateByUrl("/");
  }
}
