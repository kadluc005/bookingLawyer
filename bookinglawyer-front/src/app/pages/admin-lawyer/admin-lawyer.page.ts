import { DatePipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { specialties } from "../../models/profile.model";
import { AdminAudit, AdminContact, AdminLawyerDetail, AdminLawyersService } from "../../services/admin-lawyers.service";
import { errorMessage } from "../../services/api.service";
import { DossierService } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";
import { LawyerAvatarComponent } from "../../components/lawyer-avatar/lawyer-avatar.component";

@Component({
  imports: [DatePipe, RouterLink, LawyerAvatarComponent],
  templateUrl: "./admin-lawyer.page.html",
  styleUrls: ["../admin/admin.page.css", "./admin-lawyer.page.css"],
})
export class AdminLawyerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dossier = inject(DossierService);
  private readonly lawyers = inject(AdminLawyersService);
  readonly session = inject(SessionService);
  readonly specialties = specialties;
  readonly reviewLabels = { pending_review: "En attente de validation", approved: "Approuvé", rejected: "Rejeté" };
  readonly membershipLabels = { pending_payment: "Paiement en attente", active: "Active", expired: "Expirée", cancelled: "Annulée" };
  readonly id = this.route.snapshot.paramMap.get("id") ?? "";
  menuOpen = false;
  detail?: AdminLawyerDetail;
  contacts: AdminContact[] = [];
  audit: AdminAudit[] = [];
  loading = false;
  reviewing = false;
  error = "";
  contactError = "";
  auditError = "";
  notice = "";

  ngOnInit() {
    void this.load();
  }

  async load() {
    if (this.loading) return;
    this.loading = true;
    this.error = "";
    this.contactError = "";
    this.auditError = "";
    const [detail, contacts, audit] = await Promise.allSettled([
      this.lawyers.detail(this.id),
      this.lawyers.contacts(this.id),
      this.lawyers.audit(this.id),
    ]);
    if (detail.status === "fulfilled") this.detail = detail.value;
    else this.error = errorMessage(detail.reason);
    if (contacts.status === "fulfilled") this.contacts = contacts.value;
    else this.contactError = errorMessage(contacts.reason);
    if (audit.status === "fulfilled") this.audit = audit.value;
    else this.auditError = errorMessage(audit.reason);
    this.loading = false;
  }

  async review(decision: "approved" | "rejected") {
    if (this.reviewing || this.loading || !this.detail) return;
    this.reviewing = true;
    this.error = "";
    this.notice = "";
    try {
      await this.lawyers.review(this.id, decision);
      this.detail.profile.reviewStatus = decision;
      this.notice = "Décision enregistrée.";
      await this.load();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.reviewing = false;
    }
  }

  get emailContacts() {
    return this.contacts.filter((contact) => contact.channel === "email").length;
  }

  get phoneContacts() {
    return this.contacts.filter((contact) => contact.channel === "phone").length;
  }

  get officeAddress() {
    const profile = this.detail?.profile;
    if (!profile) return "";
    return [profile.officeNumber, profile.officeStreet, profile.officeCity, profile.officeCountry].filter(Boolean).join(" ");
  }

  signOut() {
    this.dossier.clear();
    this.session.end();
    void this.router.navigateByUrl("/");
  }
}
