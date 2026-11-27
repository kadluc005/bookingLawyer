import { Component, inject } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Lawyer } from "../../models/lawyer.model";
import { specialties } from "../../models/profile.model";
import type { ContactChannel } from "../../services/activity.service";
import { errorMessage } from "../../services/api.service";
import { DirectoryService } from "../../services/directory.service";
import { SessionService } from "../../services/session.service";
import { LawyerAvatarComponent } from "../../components/lawyer-avatar/lawyer-avatar.component";

@Component({
  imports: [RouterLink, LawyerAvatarComponent],
  templateUrl: "./lawyer-detail.page.html",
  styleUrl: "./lawyer-detail.page.css",
})
export class DetailPage {
  readonly directory = inject(DirectoryService);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get("id");
  readonly session = inject(SessionService);
  readonly labels = specialties;
  profile?: Lawyer;
  readonly revealed: Partial<Record<ContactChannel, string>> = {};
  error = "";
  busy = false;
  contactBusy: ContactChannel | null = null;
  contactError = "";

  async ngOnInit() {
    if (!this.directory.canView()) return;
    this.busy = true;
    try {
      this.profile = (await this.directory.list()).find(entry => entry.id === this.id);
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  async reveal(channel: ContactChannel) {
    if (this.session.account()?.role !== "client" || !this.profile || this.contactBusy || this.revealed[channel]) return;
    this.contactBusy = channel;
    this.contactError = "";
    try {
      const contact = await this.session.request<{ channel: ContactChannel; value: string }>(
        "/lawyers/" + encodeURIComponent(this.profile.id) + "/contact", "POST", { channel },
      );
      this.revealed[channel] = contact.value;
    } catch (error) {
      this.contactError = errorMessage(error);
    } finally {
      this.contactBusy = null;
    }
  }
}
