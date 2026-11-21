import { DatePipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { errorMessage } from "../../services/api.service";
import { DossierService, type Membership } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [DatePipe, RouterLink],
  templateUrl: "./membership.page.html",
})
export class MembershipPage {
  readonly dossier = inject(DossierService);
  private readonly session = inject(SessionService);
  membership: Membership | null = null;
  loading = true;
  busy = false;
  error = "";
  loadFailed = false;

  async ngOnInit() {
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
    if (this.busy || this.membership?.status === "active") return;
    this.busy = true;
    this.error = "";
    try {
      const result = await this.session.request<{ membership: Membership }>("/memberships", "POST", {});
      this.membership = result.membership;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
