import { Component, inject } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { specialties } from "../../models/profile.model";
import { DirectoryService } from "../../services/directory.service";
import { ActivityService, ContactChannel } from "../../services/activity.service";
import { SessionService } from "../../services/session.service";

@Component({
  imports: [RouterLink],
  templateUrl: "./lawyer-detail.page.html",
})
export class DetailPage {
  private readonly directory = inject(DirectoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly activity = inject(ActivityService);
  readonly session = inject(SessionService);
  revealed?: { lawyerId: string; channel: ContactChannel; value: string };
  labels = specialties;
  get profile() {
    return this.directory.find(this.route.snapshot.paramMap.get("id"));
  }

  reveal(channel: ContactChannel) {
    const lawyer = this.profile;
    const client = this.session.account();
    if (!lawyer || client?.role !== "client") return;
    const index = ["amina-lawson", "malik-diallo", "claire-mensah", "joel-adjovi"].indexOf(lawyer.id);
    this.activity.contact(lawyer.id, client.email, channel);
    this.revealed = {
      lawyerId: lawyer.id,
      channel,
      value: channel === "email" ? lawyer.id + "@example.test" : "+1 202-555-01" + String(index).padStart(2, "0"),
    };
  }
}
