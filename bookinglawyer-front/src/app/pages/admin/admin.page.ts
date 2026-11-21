import { DatePipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { errorMessage } from "../../services/api.service";
import { SessionService } from "../../services/session.service";

type Client = { userId: string; firstName: string; lastName: string; email: string };
type Contact = { id: string; email: string; channel: string; createdAt: string };
type Audit = { id: string; action: string; createdAt: string };

@Component({ imports: [DatePipe, FormsModule], templateUrl: "./admin.page.html" })
export class AdminPage {
  private readonly session = inject(SessionService);
  lawyerId = "";
  name = "";
  clients: Client[] = [];
  contacts: Contact[] = [];
  audit: Audit[] = [];
  error = "";
  notice = "";
  busy = false;

  async ngOnInit() {
    await this.search();
  }

  async search() {
    await this.run(async () => {
      const query = new URLSearchParams({ name: this.name, limit: "20" });
      this.clients = await this.session.request<Client[]>("/admin/clients?" + query);
    });
  }

  async review(decision: "approved" | "rejected") {
    await this.run(async () => {
      await this.session.request("/admin/lawyers/" + encodeURIComponent(this.lawyerId.trim()) + "/review", "PATCH", { decision });
      this.notice = "Décision enregistrée.";
    });
  }

  async loadActivity() {
    await this.run(async () => {
      this.contacts = [];
      this.audit = [];
      const id = encodeURIComponent(this.lawyerId.trim());
      [this.contacts, this.audit] = await Promise.all([
        this.session.request<Contact[]>("/admin/lawyers/" + id + "/contact-events"),
        this.session.request<Audit[]>("/admin/audit/lawyer_profile/" + id),
      ]);
    });
  }

  private async run(work: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true;
    this.error = "";
    this.notice = "";
    try {
      await work();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
