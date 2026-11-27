import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { api, errorMessage } from "../../services/api.service";

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: "./email-verification.page.html",
})
export class EmailVerificationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly token = this.route.snapshot.fragment;
  readonly validToken = /^[A-Za-z0-9_-]{43}$/.test(this.token ?? "");
  readonly incompleteLink = this.token !== null && !this.validToken;
  email = "";
  confirmed = false;
  busy = false;
  error = "";
  notice = "";

  async confirm() {
    if (!this.token || !this.validToken || this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      await api("/auth/verify-email", { method: "POST", body: { token: this.token } });
      this.confirmed = true;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  async resend() {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    this.notice = "";
    try {
      await api("/auth/resend-verification-email", {
        method: "POST",
        body: { email: this.email },
      });
      this.notice = "Si un compte avocat attend une activation, vérifiez votre boîte de réception. Attendez une minute entre deux demandes.";
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
