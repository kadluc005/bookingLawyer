import { Component } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { api, errorMessage } from "../../services/api.service";

@Component({ imports: [FormsModule, RouterLink], templateUrl: "./register.page.html" })
export class RegisterPage {
  email = "";
  error = "";
  busy = false;
  requested = false;

  async register(form: NgForm) {
    if (form.invalid || this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      await api("/auth/register/lawyer", { method: "POST", body: { email: this.email } });
      this.requested = true;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
