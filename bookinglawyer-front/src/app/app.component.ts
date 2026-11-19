import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SiteHeaderComponent } from "./components/site-header/site-header.component";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, SiteHeaderComponent],
  templateUrl: "./app.component.html",
})
export class AppComponent {}
