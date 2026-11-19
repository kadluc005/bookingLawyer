import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { DossierService } from "../../services/dossier.service";

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: "./membership.page.html",
})
export class MembershipPage {
  d = inject(DossierService);
  selected = this.d.method;
  saved = false;
  methods = [
    ["bank_transfer", "Virement bancaire"],
    ["paypal", "PayPal"],
    ["cryptocurrency", "Cryptomonnaie"],
  ];
}
