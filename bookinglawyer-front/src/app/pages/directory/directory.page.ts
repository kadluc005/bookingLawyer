import { Component, inject } from "@angular/core";
import { Lawyer } from "../../models/lawyer.model";
import { errorMessage } from "../../services/api.service";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { LawyerCardComponent } from "../../components/lawyer-card/lawyer-card.component";
import { choices } from "../../models/profile.model";
import { DirectoryService } from "../../services/directory.service";

@Component({
  imports: [FormsModule, LawyerCardComponent, RouterLink],
  templateUrl: "./directory.page.html",
  styleUrl: "./directory.page.css",
})
export class DirectoryPage {
  readonly directory = inject(DirectoryService);
  query = "";
  specialty = "";
  choices = choices;

  entries: Lawyer[] = [];
  error = "";
  busy = false;

  async ngOnInit() {
    if (!this.directory.canView()) return;
    this.busy = true;
    try {
      this.entries = await this.directory.list();
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  get results() {
    const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
    const query = normalize(this.query);
    return this.entries.filter(entry => (!this.specialty || entry.specialty === this.specialty) &&
      normalize([entry.first, entry.last, entry.city, entry.country].join(" ")).includes(query));
  }
}
