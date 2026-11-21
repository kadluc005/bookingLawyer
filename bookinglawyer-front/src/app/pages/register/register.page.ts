import { Component, inject } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { Router } from "@angular/router";
import { api, errorMessage } from "../../services/api.service";
import { choices } from "../../models/profile.model";
import { SessionService } from "../../services/session.service";

@Component({ imports: [FormsModule], templateUrl: "./register.page.html" })
export class RegisterPage {
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  readonly choices = choices;
  profile = { email: "", firstName: "", lastName: "", country: "", city: "", phone: "", specialty: "" };
  password = "";
  confirmation = "";
  error = "";
  busy = false;

  async register(form: NgForm) {
    if (form.invalid || this.password !== this.confirmation) return;
    this.busy = true;
    this.error = "";
    try {
      await api("/auth/register/lawyer", { method: "POST", body: { ...this.profile, password: this.password } });
      await this.session.signIn(this.profile.email, this.password);
      await this.router.navigateByUrl("/inscription/profil");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
