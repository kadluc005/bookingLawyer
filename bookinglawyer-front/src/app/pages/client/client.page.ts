import { Component, inject } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { api, errorMessage } from "../../services/api.service";
import { ClientProfile } from "../../services/client.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [FormsModule],
  templateUrl: "./client.page.html",
  styleUrl: "./client.page.css",
})
export class ClientPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly registering = inject(ActivatedRoute).snapshot.data["registering"] === true;
  readonly profile: ClientProfile = {
    email: this.registering ? "" : this.session.account()?.email ?? "",
    firstName: "", lastName: "", country: "", city: "", phone: "",
  };
  draft: ClientProfile = { ...this.profile };
  password = "";
  saved = false;
  error = "";
  busy = false;
  loading = false;
  loaded = false;
  editing = false;

  get formProfile() {
    return this.registering ? this.profile : this.draft;
  }

  async ngOnInit() {
    if (this.registering) return;
    await this.loadProfile();
  }

  async loadProfile() {
    this.loading = true;
    this.error = "";
    try {
      Object.assign(this.profile, await this.session.request<Omit<ClientProfile, "email">>("/clients/me"));
      this.loaded = true;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  edit() {
    this.draft = { ...this.profile };
    this.saved = false;
    this.error = "";
    this.editing = true;
  }

  cancel() {
    if (this.busy) return;
    this.draft = { ...this.profile };
    this.error = "";
    this.editing = false;
  }

  async save(form: NgForm) {
    if (form.invalid || this.busy) return;
    this.busy = true;
    this.saved = false;
    this.error = "";
    const { email, ...profile } = this.formProfile;
    try {
      if (this.registering) {
        await api("/auth/register/client", { method: "POST", body: { ...profile, email, password: this.password } });
        await this.session.signIn(email, this.password);
        await this.router.navigateByUrl("/annuaire");
      } else {
        const updated = await this.session.request<Omit<ClientProfile, "email">>("/clients/me", "PATCH", profile);
        Object.assign(this.profile, updated);
        this.saved = true;
        this.editing = false;
      }
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
