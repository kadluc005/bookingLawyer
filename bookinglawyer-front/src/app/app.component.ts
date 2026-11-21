import { Component, inject } from "@angular/core";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { SiteHeaderComponent } from "./components/site-header/site-header.component";

@Component({
  selector: "app-root",
  imports: [RouterLink, RouterOutlet, SiteHeaderComponent],
  templateUrl: "./app.component.html",
})
export class AppComponent {
  readonly router = inject(Router);
}
