import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { choices, specialties } from "../../models/profile.model";
import { errorMessage } from "../../services/api.service";
import { SessionService } from "../../services/session.service";
import { DossierService } from "../../services/dossier.service";

@Component({ imports: [FormsModule], templateUrl: "./enroll.page.html" })
export class EnrollPage {
  private readonly session = inject(SessionService);
  dossier = inject(DossierService);
  error = "";
  router = inject(Router);
  choices = choices;
  labels = specialties;
  step = 1;
  notice = "";
  busy = false;
  checked = false;
  get p() {
    return this.dossier.profile;
  }
  get specialtyLabel() {
    return this.p.specialty ? specialties[this.p.specialty] : "";
  }
  async ngOnInit() {
    this.busy = true;
    try {
      await this.dossier.load(this.session);
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  async load(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    if (
      files.length > 5 ||
      files.some(
        (f) =>
          !f.size ||
          f.size > 5 * 1024 * 1024 ||
          !/\.(pdf|docx|txt)$/i.test(f.name),
      )
    ) {
      this.notice =
        "Sélectionnez jusqu’à cinq fichiers PDF, DOCX ou TXT non vides de 5 Mo maximum chacun.";
      return;
    }
    this.invalidate();
    this.dossier.documents = files;
    this.busy = true;
    this.notice = "";
    try {
      const { readCv, suggest } = await import("../../services/cv.service");
      const text = await readCv(files[0]);
      const fields = suggest(text);
      for (const [key, value] of Object.entries(fields)) {
        const existing = this.p[key as keyof typeof this.p];
        if (existing === "" || existing === null)
          Object.assign(this.p, { [key]: value });
      }
      this.notice =
        text && Object.keys(fields).length
          ? "Champs proposés à partir du premier document. Vérifiez-les à l’étape suivante."
          : "Document joint. Complétez les champs à l’étape suivante.";
    } catch {
      this.notice =
        "Lecture automatique impossible. Vous pouvez continuer en saisie manuelle.";
    } finally {
      this.busy = false;
    }
  }
  photo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      this.notice = "Choisissez une photo JPG ou PNG de 5 Mo maximum.";
      input.value = "";
      return;
    }
    this.invalidate();
    this.dossier.photo = file;
    this.notice = "";
  }
  invalidate() {
    this.dossier.confirmed = false;
  }
  go(step: number) {
    this.step = step;
    this.checked = false;
    this.notice = "";
    window.scrollTo(0, 0);
  }
  async confirm() {
    if (!this.checked || this.busy) return;
    this.busy = true;
    this.error = "";
    const { firstName, lastName, country, city, phone, specialty, officeStreet, officeNumber, cvText, websiteUrl } = this.p;
    try {
      await this.session.request("/lawyers/me", "PATCH", {
        firstName, lastName, country, city, phone, specialty,
        officeStreet: officeStreet || null,
        officeNumber: officeNumber || null,
        cvText: cvText || null,
        websiteUrl: websiteUrl || null,
      });
      this.dossier.confirmed = true;
      await this.router.navigateByUrl("/espace");
    } catch (error) {
      this.error = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
