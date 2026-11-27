import { DatePipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { errorMessage } from "../../services/api.service";
import type { Membership } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: "./membership.page.html",
})
export class MembershipPage {
  private readonly session = inject(SessionService);
  readonly methods = [
    ["bank_transfer", "Virement bancaire"],
    ["paypal", "PayPal"],
    ["cryptocurrency", "Cryptomonnaie"],
  ];
  method = "";
  membership: Membership | null = null;
  loading = true;
  busy = false;
  error = "";
  emailWarning = "";
  adminWarning = "";
  justActivated = false;
  loadFailed = false;

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    this.loadFailed = false;
    this.error = "";
    try {
      this.membership = await this.session.request<Membership | null>("/memberships");
    } catch (error) {
      this.error = errorMessage(error);
      this.loadFailed = true;
    } finally {
      this.loading = false;
    }
  }

  async save() {
    if (!this.method || this.busy || this.membership?.status === "active") return;
    this.busy = true;
    this.error = "";
    this.emailWarning = "";
    this.adminWarning = "";
    try {
      const result = await this.session.request<{
        membership: Membership;
        proformaSent: boolean;
        confirmationSent: boolean;
        adminNotified: boolean;
      }>("/memberships", "POST", { method: this.method });
      this.membership = result.membership;
      this.justActivated = result.membership.status === "active";
      if (!result.proformaSent || !result.confirmationSent) {
        this.emailWarning = "La cotisation est active. Un e-mail relatif à cette cotisation n’a pas pu être envoyé.";
      }
      if (!result.adminNotified) {
        this.adminWarning = "La notification à l’administration n’a pas pu être envoyée.";
      }
    } catch (error) {
      const message = errorMessage(error);
      try {
        const current = await this.session.request<Membership | null>("/memberships");
        if (current?.status === "active") {
          this.membership = current;
          this.emailWarning = "Votre cotisation est active. Vérifiez votre boîte e-mail pour retrouver la facture et la confirmation.";
        } else {
          this.error = message;
        }
      } catch {
        this.error = message;
      }
    } finally {
      this.busy = false;
    }
  }
}
