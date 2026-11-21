import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";

@Component({
  imports: [FormsModule, RouterLink],
  templateUrl: "./contact.page.html",
  styleUrl: "./contact.page.css",
})
export class ContactPage {
  readonly request = {
    firstName: "",
    lastName: "",
    country: "",
    city: "",
    phone: "",
    email: "",
    password: "",
    description: "",
    eventDate: "",
    eventLocation: "",
  };
}
