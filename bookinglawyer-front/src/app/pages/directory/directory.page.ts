import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { LawyerCardComponent } from "../../components/lawyer-card/lawyer-card.component";
import { choices } from "../../models/profile.model";
import { DirectoryService } from "../../services/directory.service";

@Component({
  imports: [FormsModule, LawyerCardComponent],
  templateUrl: "./directory.page.html",
  styleUrl: "./directory.page.css",
})
export class DirectoryPage {
  private readonly directory = inject(DirectoryService);
  query = "";
  specialty = "";
  choices = choices;

  get results() {
    return this.directory.search(this.query, this.specialty);
  }
}
