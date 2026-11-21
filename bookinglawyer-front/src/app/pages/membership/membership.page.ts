import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { errorMessage } from "../../services/api.service";
import { SessionService } from "../../services/session.service";
import { DossierService } from "../../services/dossier.service";

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: "./membership.page.html",
})
export class MembershipPage {
  d = inject(DossierService);
  selected = this.d.method;
  saved = false;
  busy = false;
  error = "";
  private readonly session = inject(SessionService);
  methods = [
    ["bank_transfer", "Virement bancaire"],
    ["paypal", "PayPal"],
    ["cryptocurrency", "Cryptomonnaie"],
  ];

  async save() {
    if (!this.selected || this.busy) return;
    this.busy = true;
    this.error = "";
    try {
      await this.session.request("/memberships", "POST", { method: this.selected });
      this.d.method = this.selected;
      this.saved = true;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
