import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { errorMessage } from "../../services/api.service";
import type { Membership } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: "./access.page.html",
  styleUrl: "./access.page.css",
})
export class AccessPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  email = "";
  password = "";
  newPassword = "";
  confirmation = "";
  changingPassword = false;
  busy = false;
  error = "";

  async enter() {
    this.busy = true;
    this.error = "";
    try {
      const user = await this.session.signIn(this.email, this.password);
      if (!user) {
        this.changingPassword = true;
        return;
      }
      const lawyerId = this.route.snapshot.queryParamMap.get("avocat");
      if (user.role === "lawyer") {
        const membership = await this.session.request<Membership | null>("/memberships");
        if (membership?.status !== "active") {
          await this.router.navigateByUrl("/cotisation");
          return;
        }
        const profile = await this.session.request<{ submittedAt: string | null } | null>("/lawyers/me");
        if (profile && lawyerId) {
          await this.router.navigate(["/avocats", lawyerId]);
        } else {
          await this.router.navigateByUrl(profile ? "/espace" : "/inscription/profil");
        }
        return;
      }
      if (user.role === "client" && lawyerId) {
        await this.router.navigate(["/avocats", lawyerId]);
      } else {
        await this.router.navigateByUrl(user.role === "admin" ? "/administration" : "/annuaire");
      }
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  async changePassword() {
    if (this.busy || this.newPassword !== this.confirmation) return;
    if (this.newPassword === this.password) {
      this.error = "Choisissez un mot de passe différent du mot de passe temporaire.";
      return;
    }
    this.busy = true;
    this.error = "";
    try {
      await this.session.changeTemporaryPassword(this.email, this.password, this.newPassword);
      this.password = "";
      this.newPassword = "";
      this.confirmation = "";
      await this.router.navigateByUrl("/cotisation");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  cancelPasswordChange() {
    this.changingPassword = false;
    this.password = "";
    this.newPassword = "";
    this.confirmation = "";
    this.error = "";
  }
}
