import { DatePipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DossierService, type Membership } from "../../services/dossier.service";
import { SessionService } from "../../services/session.service";
import { errorMessage } from "../../services/api.service";

interface ContactClient {
  clientId: string;
  firstName: string;
  lastName: string;
  lastContactAt: string;
  emailRequests: number;
  phoneRequests: number;
}

interface ContactsPage {
  clients: ContactClient[];
  hasMore: boolean;
}

@Component({
  imports: [DatePipe, RouterLink],
  templateUrl: "./space.page.html",
  styleUrl: "./space.page.css",
})
export class SpacePage {
  readonly dossier = inject(DossierService);
  private readonly session = inject(SessionService);
  error = "";
  loading = true;
  membership: Membership | null = null;

  readonly pageSize = 20;
  clients: ContactClient[] = [];
  contactOffset = 0;
  hasMoreContacts = false;
  contactsLoading = false;
  contactsError = "";

  ngOnInit() {
    void this.loadOverview();
    void this.loadContacts();
  }

  async loadContacts(offset = 0) {
    if (this.contactsLoading) return;
    this.contactsLoading = true;
    this.contactsError = "";
    try {
      const query = new URLSearchParams({ limit: String(this.pageSize), offset: String(offset) });
      const page = await this.session.request<ContactsPage>("/lawyers/me/contacts?" + query);
      this.clients = page.clients;
      this.hasMoreContacts = page.hasMore;
      this.contactOffset = offset;
    } catch (error) {
      this.contactsError = errorMessage(error);
    } finally {
      this.contactsLoading = false;
    }
  }

  private async loadOverview() {
    try {
      const [, membership] = await Promise.all([
        this.dossier.load(this.session),
        this.session.request<Membership | null>("/memberships"),
      ]);
      this.membership = membership;
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  get reviewLabel() {
    return {
      pending_review: "En attente",
      approved: "Approuvé",
      rejected: "Rejeté",
    }[this.dossier.reviewStatus];
  }
}
