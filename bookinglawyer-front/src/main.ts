import { inject, provideAppInitializer } from "@angular/core";
import { SessionService } from "./app/services/session.service";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";

bootstrapApplication(AppComponent, {
  providers: [
    provideAppInitializer(() => inject(SessionService).restore()),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: "top", anchorScrolling: "enabled" })),
  ],
}).catch(console.error);
