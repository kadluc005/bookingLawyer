import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AdminLawyer, AdminLawyersService } from "../../services/admin-lawyers.service";
import { specialties } from "../../models/profile.model";
import { errorMessage } from "../../services/api.service";
import { SessionService } from "../../services/session.service";
import { DossierService } from "../../services/dossier.service";

type Client = { userId: string; firstName: string; lastName: string; email: string };

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: "./admin.page.html",
  styleUrl: "./admin.page.css",
})
export class AdminPage {
  readonly session = inject(SessionService);
  private readonly dossier = inject(DossierService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly lawyersService = inject(AdminLawyersService);
  readonly specialties = specialties;
  readonly reviewLabels = {
    pending_review: "En attente de validation",
    approved: "Approuvé",
    rejected: "Rejeté",
  };
  readonly pageSize = 20;
  menuOpen = false;
  lawyers: AdminLawyer[] = [];
  totalLawyers: number | null = null;
  pendingLawyers: number | null = null;
  lawyersOffset = 0;
  lawyersBusy = false;
  lawyersError = "";
  name = "";
  searchedName = "";
  offset = 0;
  clients: Client[] = [];
  clientError = "";
  clientsBusy = false;

  get showLawyers() {
    return this.route.snapshot.data["section"] === "lawyers";
  }

  ngOnInit() {
    void this.search();
    void this.loadLawyers();
  }

  async loadLawyers(offset = 0) {
    if (this.lawyersBusy) return;
    this.lawyersBusy = true;
    this.lawyersError = "";
    try {
      const result = await this.lawyersService.list(this.pageSize, offset);
      this.lawyers = result.lawyers;
      this.totalLawyers = result.total;
      this.pendingLawyers = result.pending;
      this.lawyersOffset = offset;
    } catch (error) {
      this.lawyersError = errorMessage(error);
    } finally {
      this.lawyersBusy = false;
    }
  }

  async search(offset = 0) {
    if (this.clientsBusy) return;
    this.clientsBusy = true;
    this.clientError = "";
    if (offset === 0) this.searchedName = this.name.trim();
    try {
      const query = new URLSearchParams({ name: this.searchedName, limit: String(this.pageSize), offset: String(offset) });
      this.clients = await this.session.request<Client[]>("/admin/clients?" + query);
      this.offset = offset;
    } catch (error) {
      this.clientError = errorMessage(error);
    } finally {
      this.clientsBusy = false;
    }
  }

  signOut() {
    this.dossier.clear();
    this.session.end();
    void this.router.navigateByUrl("/");
  }
}
