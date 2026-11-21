import { Component, inject } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Lawyer } from "../../models/lawyer.model";
import { specialties } from "../../models/profile.model";
import type { ContactChannel } from "../../services/activity.service";
import { errorMessage } from "../../services/api.service";
import { DirectoryService } from "../../services/directory.service";
import { SessionService } from "../../services/session.service";

@Component({ imports: [RouterLink], templateUrl: "./lawyer-detail.page.html" })
export class DetailPage {
  private readonly directory = inject(DirectoryService);
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get("id");
  readonly session = inject(SessionService);
  readonly labels = specialties;
  profile?: Lawyer;
  revealed?: { channel: ContactChannel; value: string };
  error = "";
  busy = false;

  async ngOnInit() {
    if (this.session.account()?.role !== "client") return;
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
    if (!this.profile || this.busy) return;
    this.busy = true;
    this.error = "";
    this.revealed = undefined;
    try {
      this.revealed = await this.session.request("/lawyers/" + this.profile.id + "/contact", "POST", { channel });
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
