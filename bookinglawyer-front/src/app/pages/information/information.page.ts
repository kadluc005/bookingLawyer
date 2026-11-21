import { Component, inject } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";

@Component({
  imports: [RouterLink],
  templateUrl: "./information.page.html",
  styleUrl: "./information.page.css",
})
export class InformationPage {
  private readonly route = inject(ActivatedRoute);
  get page(): string {
    return this.route.snapshot.data["page"] as string;
  }
}
