import { Component, inject } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { api, errorMessage } from "../../services/api.service";
import { ClientProfile } from "../../services/client.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [FormsModule],
  templateUrl: "./client.page.html",
})
export class ClientPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly registering = inject(ActivatedRoute).snapshot.data["registering"] === true;
  readonly profile: ClientProfile = {
    email: this.registering ? "" : this.session.account()?.email ?? "",
    firstName: "", lastName: "", country: "", city: "", phone: "",
  };
  password = "";
  saved = false;
  error = "";
  busy = false;

  async ngOnInit() {
    if (this.registering) return;
    try {
      Object.assign(this.profile, await this.session.request<Omit<ClientProfile, "email">>("/clients/me"));
    } catch (error) {
      this.error = errorMessage(error);
    }
  }

  async save(form: NgForm) {
    if (form.invalid || this.busy) return;
    this.busy = true;
    this.saved = false;
    this.error = "";
    const { email, ...profile } = this.profile;
    try {
      if (this.registering) {
        await api("/auth/register/client", { method: "POST", body: { ...profile, email, password: this.password } });
        await this.session.signIn(email, this.password);
        await this.router.navigateByUrl("/annuaire");
      } else {
        await this.session.request("/clients/me", "PATCH", profile);
        this.saved = true;
      }
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
