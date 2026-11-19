import { Lawyer } from "../models/lawyer.model";

export const lawyers: readonly Lawyer[] = [
  {
    id: "amina-lawson",
    first: "Amina",
    last: "Lawson",
    city: "Lomé",
    country: "Togo",
    years: 12,
    specialty: "civil_law",
    bio: "Accompagne les particuliers dans les litiges familiaux, les successions et les différends locatifs.",
  },
  {
    id: "malik-diallo",
    first: "Malik",
    last: "Diallo",
    city: "Dakar",
    country: "Sénégal",
    years: 9,
    specialty: "arbitration",
    bio: "Conseille les entreprises dans la résolution des différends commerciaux et les procédures arbitrales.",
  },
  {
    id: "claire-mensah",
    first: "Claire",
    last: "Mensah",
    city: "Cotonou",
    country: "Bénin",
    years: 7,
    specialty: "cybercrime",
    bio: "Intervient dans les affaires de fraude numérique, d’usurpation d’identité et de protection des données.",
  },
  {
    id: "joel-adjovi",
    first: "Joël",
    last: "Adjovi",
    city: "Lomé",
    country: "Togo",
    years: 15,
    specialty: "criminal_law",
    bio: "Assiste les particuliers à chaque étape de la procédure pénale, de l’enquête à l’audience.",
  },
];
