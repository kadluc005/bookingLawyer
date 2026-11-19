import { Component, inject } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { Router } from "@angular/router";
import { DossierService } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [FormsModule],
  templateUrl: "./register.page.html",
})
export class RegisterPage {
  private readonly dossier = inject(DossierService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  email = "";
  password = "";
  confirmation = "";

  register(form: NgForm) {
    if (!form.valid || this.password !== this.confirmation) return;

    this.dossier.startDemoRegistration(this.email);
    this.session.start("lawyer", this.email);
    form.resetForm();
    void this.router.navigateByUrl("/inscription/profil");
  }
}
