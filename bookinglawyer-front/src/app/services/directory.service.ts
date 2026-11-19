import { inject, Injectable } from "@angular/core";
import { ActivityService } from "./activity.service";
import { lawyers } from "../data/lawyers";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
@Injectable({ providedIn: "root" })
export class DirectoryService {
  private readonly activity = inject(ActivityService);

  private get visibleLawyers() {
    return lawyers.filter(({ id }) => (this.activity.reviews()[id] ?? "approved") === "approved");
  }

  search(query: string, specialty: string) {
    const term = normalize(query);
    return this.visibleLawyers.filter(
      (p) =>
        (!specialty || p.specialty === specialty) &&
        normalize([p.first, p.last, p.city, p.country].join(" ")).includes(
          term,
        ),
    );
  }

  find(id: string | null) {
    return this.visibleLawyers.find((lawyer) => lawyer.id === id);
  }
}
