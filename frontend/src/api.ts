// Client API : liste des templates + génération overlay.
// Toutes les requêtes privées portent le token Bearer fourni par l'auth.

import { headersAuth } from "./auth";

export interface Templates {
  [cle: string]: {
    nom: string;
    champs: string[];
    supporte_composer?: boolean;
    supporte_atn?: boolean;
    supporte_cheques_repas?: boolean;
    supporte_fpe?: boolean;
    employeur_fixe?: Record<string, string>;
  };
}

export interface Resultat {
  blob?: Blob;      // PDF (mode local sans bot)
  message?: string; // réponse JSON (ex. envoyé dans le chat)
}

export async function listerTemplates(token: string): Promise<Templates> {
  const r = await fetch("/api/templates", { headers: headersAuth(token) });
  if (!r.ok) throw new Error(`Erreur ${r.status}`);
  return r.json();
}

export async function genererConfig(
  cfg: Record<string, unknown>,
  token: string,
): Promise<Resultat> {
  const r = await fetch("/api/fiche-config", {
    method: "POST",
    headers: headersAuth(token),
    body: JSON.stringify(cfg),
  });
  if (!r.ok) throw new Error(`Erreur ${r.status} : ${await r.text()}`);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/pdf")) return { blob: await r.blob() };
  return { message: JSON.stringify(await r.json()) };
}

export async function genererFicheOverlay(
  template: string,
  cfg: Record<string, unknown>,
  token: string,
): Promise<Resultat> {
  const r = await fetch("/api/fiche-overlay", {
    method: "POST",
    headers: headersAuth(token),
    body: JSON.stringify({ ...cfg, template }),
  });
  if (!r.ok) throw new Error(`Erreur ${r.status} : ${await r.text()}`);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/pdf")) return { blob: await r.blob() };
  return { message: JSON.stringify(await r.json()) };
}

export async function genererTroisMoisConfig(
  template: string,
  annee: number,
  mois: number,
  cfg: Record<string, unknown>,
  bruts: string[],
  token: string,
): Promise<Resultat> {
  const r = await fetch("/api/fiche-overlay-3mois", {
    method: "POST",
    headers: headersAuth(token),
    body: JSON.stringify({ ...cfg, template, annee, mois, bruts }),
  });
  if (!r.ok) throw new Error(`Erreur ${r.status} : ${await r.text()}`);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/zip")) return { blob: await r.blob() };
  return { message: JSON.stringify(await r.json()) };
}
