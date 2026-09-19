// Couche d'authentification — toute communication avec le backend.
// Aucun utilisateur, mot de passe ou statut n'est codé ici.

export type StatutCompte = "actif" | "inactif" | "desactive";

export interface SessionUtilisateur {
  username: string;
  statut: StatutCompte;
  token: string;
}

// Clé de stockage du token de session (localStorage).
const CLE_SESSION = "certifio_session";

// ─── Persistance locale ────────────────────────────────────────────────────

export function lireSession(): SessionUtilisateur | null {
  try {
    const raw = localStorage.getItem(CLE_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUtilisateur;
  } catch {
    return null;
  }
}

function sauvegarderSession(session: SessionUtilisateur): void {
  localStorage.setItem(CLE_SESSION, JSON.stringify(session));
}

export function supprimerSession(): void {
  localStorage.removeItem(CLE_SESSION);
}

// ─── Appels API ────────────────────────────────────────────────────────────

/**
 * Connexion : envoie username + password au backend.
 * Le backend retourne { token, username, statut } ou une erreur 401/403.
 */
export async function seConnecter(
  username: string,
  password: string,
): Promise<SessionUtilisateur> {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (r.status === 401) throw new Error("Identifiants incorrects.");
  if (r.status === 403) throw new Error("Compte désactivé.");
  if (!r.ok) throw new Error(`Erreur serveur (${r.status}).`);

  const data = await r.json() as { token: string; username: string; statut: StatutCompte };
  const session: SessionUtilisateur = {
    token: data.token,
    username: data.username,
    statut: data.statut,
  };
  sauvegarderSession(session);
  return session;
}

/**
 * Déconnexion : invalide le token côté serveur puis supprime la session locale.
 */
export async function seDeconnecter(token: string): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // On supprime la session locale même si le serveur est injoignable.
  } finally {
    supprimerSession();
  }
}

/**
 * Vérifie la validité du token actuel auprès du backend.
 * Retourne la session mise à jour (le statut peut avoir changé) ou null si invalide.
 */
export async function verifierSession(token: string): Promise<SessionUtilisateur | null> {
  try {
    const r = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      supprimerSession();
      return null;
    }
    const data = await r.json() as { username: string; statut: StatutCompte };
    const session: SessionUtilisateur = { token, username: data.username, statut: data.statut };
    sauvegarderSession(session);
    return session;
  } catch {
    return null;
  }
}

// ─── En-tête d'autorisation ────────────────────────────────────────────────

/** Construit les headers HTTP incluant le token Bearer. */
export function headersAuth(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
