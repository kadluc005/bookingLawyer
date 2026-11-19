import { Component, inject } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ClientProfile, ClientService } from "../../services/client.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [FormsModule],
  templateUrl: "./client.page.html",
})
export class ClientPage {
  private readonly clients = inject(ClientService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly registering = inject(ActivatedRoute).snapshot.data["registering"] === true;
  readonly profile: ClientProfile = {
    email: this.registering ? "" : this.session.account()?.email ?? "",
    firstName: "", lastName: "", country: "", city: "", phone: "",
    ...(this.registering ? {} : this.clients.clients().find((client) => client.email === this.session.account()?.email)),
  };
  password = "";
  saved = false;
  duplicateEmail = false;

  save(form: NgForm) {
    if (!form.valid) return;
    this.profile.email = this.profile.email.trim().toLowerCase();
    this.duplicateEmail = this.registering && this.clients.clients().some((client) => client.email === this.profile.email);
    if (this.duplicateEmail) return;
    this.clients.save(this.profile);
    this.saved = true;
    if (this.registering) {
      this.password = "";
      this.session.start("client", this.profile.email);
      void this.router.navigateByUrl("/annuaire");
    }
  }
}
