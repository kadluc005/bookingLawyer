import JSZip from "jszip";
import { Profile, choices, Specialty } from "../models/profile.model";

export async function readCv(file: File): Promise<string> {
  if (/\.txt$/i.test(file.name)) return file.text();
  if (/\.docx$/i.test(file.name)) {
    const archive = await JSZip.loadAsync(file);
    const entry = archive.file("word/document.xml");
    if (!entry) throw new Error("Document Word illisible.");
    const xml = new DOMParser().parseFromString(
      await entry.async("string"),
      "application/xml",
    );
    return Array.from(
      xml.getElementsByTagNameNS("*", "p"),
      (p) => p.textContent || "",
    ).join("\n");
  }
  return "";
}

export function suggest(text: string): Partial<Profile> {
  const fields: Partial<Profile> = {};
  const email = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  const phone = text.match(
    /(?:^|\n)\s*(?:t[ée]l(?:[ée]phone)?\.?|mobile)\s*[:–-]\s*([+\d][\d ().-]{5,30}\d)/i,
  )?.[1];
  if (email) fields.email = email;
  if (phone) fields.phone = phone.trim();
  const names = {
    firstName: "Pr[ée]nom",
    lastName: "Nom",
    country: "Pays",
    city: "Ville",
  };
  for (const [key, label] of Object.entries(names)) {
    const value = text
      .match(
        new RegExp(
          "(?:^|\\n)\\s*" + label + "\\s*[:–-]\\s*([^\\r\\n]{1,120})",
          "i",
        ),
      )?.[1]
      ?.trim();
    if (value) fields[key as keyof typeof names] = value;
  }
  const specialty = choices.find(([, label]) =>
    text.toLowerCase().includes(label.toLowerCase()),
  );
  if (specialty) fields.specialty = specialty[0] as Specialty;
  const years = text.match(/\b(\d{1,2})\s+ans?\s+d['’]expérience/i);
  if (years) fields.experienceYears = Number(years[1]);
  return fields;
}
