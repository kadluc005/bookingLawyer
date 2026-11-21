import { inject } from "@angular/core";
import { CanActivateFn, Router, Routes } from "@angular/router";
import { RegisterPage } from "./pages/register/register.page";
import { DirectoryPage } from "./pages/directory/directory.page";
import { DetailPage } from "./pages/lawyer-detail/lawyer-detail.page";
import { EnrollPage } from "./pages/enroll/enroll.page";
import { SpacePage } from "./pages/space/space.page";
import { MembershipPage } from "./pages/membership/membership.page";
import { AccessPage } from "./pages/access/access.page";
import { ClientPage } from "./pages/client/client.page";
import { AdminPage } from "./pages/admin/admin.page";
import { AdminLawyerPage } from "./pages/admin-lawyer/admin-lawyer.page";
import { InformationPage } from "./pages/information/information.page";
import { ContactPage } from "./pages/contact/contact.page";
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
  { path: "a-propos", component: InformationPage, data: { page: "about" }, title: "À propos | BookingLawyer" },
  { path: "news", component: InformationPage, data: { page: "news" }, title: "News | BookingLawyer" },
  { path: "hotnews", component: InformationPage, data: { page: "hotnews" }, title: "Hotnews | BookingLawyer" },
  { path: "pricing", component: InformationPage, data: { page: "pricing" }, title: "Tarifs | BookingLawyer" },
  { path: "pro-bono", component: InformationPage, data: { page: "probono" }, title: "Pro bono | BookingLawyer" },
  { path: "faq", component: InformationPage, data: { page: "faq" }, title: "FAQ | BookingLawyer" },
  { path: "contact", component: ContactPage, title: "Contact | BookingLawyer" },
  {
    path: "avocats/:id",
    component: DetailPage,
    title: "Profil avocat | BookingLawyer",
  },
  {
    path: "inscription",
    pathMatch: "full",
    component: RegisterPage,
    title: "Créer un compte avocat | BookingLawyer",
  },
  {
    path: "inscription/profil",
    component: EnrollPage,
    canActivate: [forRole("lawyer")],
    title: "Configurer mon profil | BookingLawyer",
  },
  {
    path: "espace",
    canActivate: [forRole("lawyer")],
    component: SpacePage,
    title: "Tableau de bord avocat | BookingLawyer",
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
  { path: "administration/avocats", component: AdminPage, canActivate: [forRole("admin")], data: { section: "lawyers" }, title: "Avocats | Administration" },
  { path: "administration/avocats/:id", component: AdminLawyerPage, canActivate: [forRole("admin")], title: "Dossier avocat | Administration" },
  { path: "**", redirectTo: "" },
];
