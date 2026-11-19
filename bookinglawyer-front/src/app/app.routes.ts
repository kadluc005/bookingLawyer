import { inject } from "@angular/core";
import { CanActivateFn, Router, Routes } from "@angular/router";
import { RegisterPage } from "./pages/register/register.page";
import { DossierService } from "./services/dossier.service";
import { DirectoryPage } from "./pages/directory/directory.page";
import { DetailPage } from "./pages/lawyer-detail/lawyer-detail.page";
import { EnrollPage } from "./pages/enroll/enroll.page";
import { SpacePage } from "./pages/space/space.page";
import { MembershipPage } from "./pages/membership/membership.page";
import { AccessPage } from "./pages/access/access.page";
import { ClientPage } from "./pages/client/client.page";
import { AdminPage } from "./pages/admin/admin.page";
import { Role, SessionService } from "./services/session.service";

const forRole = (role: Role): CanActivateFn => () =>
  inject(SessionService).account()?.role === role ||
  inject(Router).parseUrl("/connexion");

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    redirectTo: "annuaire",
  },
  {
    path: "connexion",
    component: AccessPage,
    title: "Connexion | BookingLawyer",
  },
  {
    path: "annuaire",
    component: DirectoryPage,
    title: "Annuaire | BookingLawyer",
  },
  {
    path: "avocats/:id",
    component: DetailPage,
    title: "Profil avocat | BookingLawyer",
  },
  {
    path: "inscription",
    pathMatch: "full",
    component: RegisterPage,
    canActivate: [() =>
      !(inject(SessionService).account()?.role === "lawyer" && inject(DossierService).accountEmail) ||
      inject(Router).parseUrl("/inscription/profil")
    ],
    title: "Créer un compte avocat | BookingLawyer",
  },
  {
    path: "inscription/profil",
    component: EnrollPage,
    canActivate: [forRole("lawyer"), () =>
      !!inject(DossierService).accountEmail ||
      inject(Router).parseUrl("/inscription")
    ],
    title: "Configurer mon profil | BookingLawyer",
  },
  {
    path: "espace",
    canActivate: [forRole("lawyer")],
    component: SpacePage,
    title: "Mon dossier | BookingLawyer",
  },
  {
    path: "cotisation",
    canActivate: [forRole("lawyer")],
    component: MembershipPage,
    title: "Cotisation | BookingLawyer",
  },
  { path: "inscription/client", component: ClientPage, data: { registering: true }, title: "Inscription client | BookingLawyer" },
  { path: "client/profil", component: ClientPage, canActivate: [forRole("client")], title: "Mon profil client | BookingLawyer" },
  { path: "administration", component: AdminPage, canActivate: [forRole("admin")], title: "Administration | BookingLawyer" },
  { path: "**", redirectTo: "" },
];
