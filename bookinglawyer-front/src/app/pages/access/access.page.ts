import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { errorMessage } from "../../services/api.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: "./access.page.html",
})
export class AccessPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  email = "";
  password = "";
  busy = false;
  error = "";

  async enter() {
    this.busy = true;
    this.error = "";
    try {
      const user = await this.session.signIn(this.email, this.password);
      const lawyerId = this.route.snapshot.queryParamMap.get("avocat");
      if (user.role === "client" && lawyerId) {
        await this.router.navigate(["/avocats", lawyerId]);
      } else {
        await this.router.navigateByUrl(user.role === "admin" ? "/administration" : user.role === "lawyer" ? "/espace" : "/annuaire");
      }
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
