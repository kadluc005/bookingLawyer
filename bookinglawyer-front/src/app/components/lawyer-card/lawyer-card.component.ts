import { Component, Input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Lawyer } from "../../models/lawyer.model";
import { specialties } from "../../models/profile.model";

@Component({
  selector: "app-lawyer-card",
  imports: [RouterLink],
  templateUrl: "./lawyer-card.component.html",
})
export class LawyerCardComponent {
  @Input({ required: true }) lawyer!: Lawyer;
  readonly specialties = specialties;
}
