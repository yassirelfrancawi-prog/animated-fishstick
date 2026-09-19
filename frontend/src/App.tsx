import { useEffect, useState, type ChangeEvent } from "react";
import {
  List,
  Section,
  Input,
  Button,
  Cell,
  Select,
  Switch,
  Title,
  Caption,
  Banner,
} from "@telegram-apps/telegram-ui";
import { type Config, type ATN, DEFAUTS, construireConfig, bruts3Mois } from "./config";
import {
  genererConfig,
  genererFicheOverlay,
  genererTroisMoisConfig,
  listerTemplates,
  type Templates,
} from "./api";
import {
  lireSession,
  seDeconnecter,
  verifierSession,
  type SessionUtilisateur,
} from "./auth";
import { LoginScreen } from "./LoginScreen";

const TEMPLATE_GENERIQUE = "generique";

function parseDateFr(s: string): { annee: number; mois: number } {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return { annee: parseInt(m[3]), mois: parseInt(m[2]) };
  const n = new Date();
  return { annee: n.getFullYear(), mois: n.getMonth() + 1 };
}

// ─── Écran de compte inactif ──────────────────────────────────────────────
function EcranInactif({ onDeconnexion }: { onDeconnexion: () => void }) {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "var(--tgui--bg_color, #09090f)",
      gap: 20,
      textAlign: "center",
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
      }}>
        🔒
      </div>
      <div>
        <Title level="2" weight="2" style={{ color: "var(--tgui--text_color)", marginBottom: 8 }}>
          Accès suspendu
        </Title>
        <Caption level="1" style={{ color: "var(--tgui--hint_color)", display: "block", maxWidth: 300 }}>
          Votre abonnement n'est plus disponible.
        </Caption>
      </div>
      <Button size="m" mode="outline" onClick={onDeconnexion}>
        Se déconnecter
      </Button>
    </div>
  );
}

// ─── Application principale ────────────────────────────────────────────────
function AppPrincipale({
  session,
  onDeconnexion,
}: {
  session: SessionUtilisateur;
  onDeconnexion: () => void;
}) {
  const [c, setC] = useState<Config>(DEFAUTS);
  const [etat, setEtat] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [templates, setTemplates] = useState<Templates>({});
  const [template, setTemplate] = useState<string>(TEMPLATE_GENERIQUE);
  const [modeAvance, setModeAvance] = useState(false);
  const [mode3Mois, setMode3Mois] = useState(false);

  useEffect(() => {
    listerTemplates(session.token).then(setTemplates).catch(() => setTemplates({}));
  }, [session.token]);

  const overlay = template !== TEMPLATE_GENERIQUE;
  const empFixe = overlay ? templates[template]?.employeur_fixe : undefined;
  const templatesOverlay = Object.entries(templates).filter(([, t]) => t.supporte_composer);
  const brutNum = parseFloat((c.brut || "0").replace(",", ".")) || 0;
  const onssNum = parseFloat((c.cotisations || "0").replace(",", ".")) || 0;
  const onssAberrant = brutNum > 0 && onssNum > brutNum * 0.25;
  const supporteAtn = !overlay || templates[template]?.supporte_atn === true;
  const supporteChequesRepas = !overlay || templates[template]?.supporte_cheques_repas === true;
  const supporteFpe = !overlay || templates[template]?.supporte_fpe === true;
  const atnActifs = c.voiture.actif || c.telephone.actif || c.logement.actif || c.internet.actif;
  const avertissementAtn = overlay && atnActifs && !supporteAtn;
  const templateAtnSuggere = Object.entries(templates).find(([, t]) => t.supporte_atn)?.[0];
  const configCompatible: Config = {
    ...c,
    chequesRepas: supporteChequesRepas ? c.chequesRepas : "",
    fpe: supporteFpe ? c.fpe : "",
    voiture: supporteAtn ? c.voiture : { ...c.voiture, actif: false },
    telephone: supporteAtn ? c.telephone : { ...c.telephone, actif: false },
    logement: supporteAtn ? c.logement : { ...c.logement, actif: false },
    internet: supporteAtn ? c.internet : { ...c.internet, actif: false },
  };

  const set = (k: keyof Config) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setC((v) => ({ ...v, [k]: e.target.value }));
  const setATN = (k: "voiture" | "telephone" | "logement" | "internet", patch: Partial<ATN>) =>
    setC((v) => ({ ...v, [k]: { ...v[k], ...patch } }));

  async function generer() {
    setOccupe(true);
    setEtat("Génération…");
    try {
      const cfg = construireConfig(configCompatible);
      let r;
      if (mode3Mois && overlay) {
        const { annee, mois } = parseDateFr(c.periodeDebut);
        r = await genererTroisMoisConfig(template, annee, mois, cfg, bruts3Mois(c), session.token);
      } else {
        r = overlay
          ? await genererFicheOverlay(template, cfg, session.token)
          : await genererConfig(cfg, session.token);
      }
      if (r.blob) {
        window.open(URL.createObjectURL(r.blob), "_blank");
        setEtat(mode3Mois ? "ZIP des 3 fiches généré ✓" : "PDF généré ✓");
      } else setEtat(r.message || "Envoyé ✓");
    } catch (e) {
      setEtat("Erreur : " + (e as Error).message);
    } finally {
      setOccupe(false);
    }
  }

  const ligneATN = (k: "voiture" | "telephone" | "logement" | "internet", label: string) => (
    <>
      <Cell
        after={
          <Switch
            checked={c[k].actif}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setATN(k, { actif: e.target.checked })}
          />
        }
      >
        {label}
      </Cell>
      {c[k].actif && (
        <Input
          header={`${label} — montant (€)`}
          value={c[k].montant}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setATN(k, { montant: e.target.value })}
        />
      )}
    </>
  );

  return (
    <>
      {/* Header sticky */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "var(--tgui--header_bg_color, var(--tgui--bg_color))",
          borderBottom: "1px solid var(--tgui--divider, rgba(0,0,0,0.08))",
        }}
      >
        <div>
          <Title level="2" weight="2" style={{ margin: 0 }}>
            Certifio
          </Title>
          <Caption level="1" style={{ color: "var(--tgui--hint_color)" }}>
            Fiches de paie • Belgique
          </Caption>
        </div>
        {/* Infos utilisateur + déconnexion */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <Caption level="1" weight="2" style={{ display: "block", color: "var(--tgui--text_color)" }}>
              {session.username}
            </Caption>
            <Caption
              level="2"
              style={{ color: "var(--tgui--hint_color)", cursor: "pointer", textDecoration: "underline" }}
              onClick={onDeconnexion}
            >
              Déconnexion
            </Caption>
          </div>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: 14,
            color: "#fff",
          }}>
            {session.username[0]?.toUpperCase() ?? "?"}
          </div>
        </div>
      </div>

      <List>
        <Section
          header="Modèle visuel"
          footer={
            overlay
              ? "Le PDF reprendra le visuel exact du template ; l'employeur est celui du template."
              : "Rendu HTML générique. Choisis un template pour reproduire un visuel réel."
          }
        >
          <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value={TEMPLATE_GENERIQUE}>Générique (HTML)</option>
            {templatesOverlay.map(([cle, t]) => (
              <option key={cle} value={cle}>
                {t.nom}
              </option>
            ))}
          </Select>
          {overlay && empFixe && (
            <Cell subtitle={empFixe.ville || ""}>Employeur : {empFixe.nom}</Cell>
          )}
          {overlay && (
            <div style={{ padding: 12, textAlign: "center" }}>
              <img
                src={`/api/templates/${template}/preview`}
                alt={`Aperçu du modèle ${template}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: 360,
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                  objectFit: "contain",
                }}
              />
            </div>
          )}
        </Section>

        <Section header="Options">
          <Cell
            after={<Switch checked={modeAvance} onChange={(e) => setModeAvance(e.target.checked)} />}
            subtitle="ATN, chèques-repas, dates, surcharges manuelles"
          >
            Mode avancé
          </Cell>
          {overlay && (
            <Cell
              after={
                <Switch
                  checked={mode3Mois}
                  onChange={(e) => setMode3Mois(e.target.checked)}
                />
              }
              subtitle="Génère le mois choisi + les 2 précédents → ZIP"
            >
              3 mois d'un coup
            </Cell>
          )}
        </Section>

        {!overlay && (
          <Section header="Employeur">
            <Input header="Nom" value={c.empNom} onChange={set("empNom")} />
            <Input header="Adresse" value={c.empAdresse} onChange={set("empAdresse")} />
            <Input header="Code postal et ville" value={c.empCpVille} onChange={set("empCpVille")} />
          </Section>
        )}

        <Section header="Le salarié">
          <Input header="Nom et prénom" placeholder="DUPONT Sophie" value={c.nom} onChange={set("nom")} />
          <Input header="Adresse" placeholder="Rue X 12" value={c.adresse} onChange={set("adresse")} />
          <Input header="Code postal et ville" placeholder="4000 Liège" value={c.cpVille} onChange={set("cpVille")} />
          <Input header="NISS" placeholder="900615-123-45" value={c.niss} onChange={set("niss")} />
        </Section>

        <Section header="Situation">
          <Select value={c.etatCivil} onChange={set("etatCivil")}>
            <option>Isolé(e)</option>
            <option>Marié(e)</option>
            <option>Cohabitant(e) légal(e)</option>
          </Select>
          {c.etatCivil !== "Isolé(e)" && (
            <Cell
              after={
                <Switch
                  checked={c.conjointRevenus}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setC((v) => ({ ...v, conjointRevenus: e.target.checked }))
                  }
                />
              }
            >
              Le conjoint a des revenus propres
            </Cell>
          )}
          <Input
            header="Enfants à charge (réduction sur cette fiche)"
            type="number"
            value={c.enfants}
            onChange={set("enfants")}
          />
          <Select value={c.statut} onChange={set("statut")}>
            <option>Employé(e)</option>
            <option>Ouvrier(ère)</option>
            <option>Dirigeant d'entreprise</option>
          </Select>
          <Input header="Caisse d'assurances sociales" value={c.caisse} onChange={set("caisse")} />
        </Section>

        <Section
          header="Rémunération"
          footer={
            mode3Mois && overlay
              ? "Mode 3 mois : un brut par mois (laisse vide pour reprendre le brut courant)."
              : "ONSS, bonus à l'emploi et précompte sont calculés automatiquement (Annexe III 2026)."
          }
        >
          <Input header="Rémunération brute (€) — mois courant" placeholder="3000" value={c.brut} onChange={set("brut")} />
          {mode3Mois && overlay && (
            <>
              <Input
                header="Brut mois −1 (€, vide = même que mois courant)"
                placeholder="3000"
                value={c.brutMoisMoins1}
                onChange={set("brutMoisMoins1")}
              />
              <Input
                header="Brut mois −2 (€, vide = même que mois courant)"
                placeholder="3000"
                value={c.brutMoisMoins2}
                onChange={set("brutMoisMoins2")}
              />
            </>
          )}
          {modeAvance && (
            <Input
              header="Forcer ONSS perso (€, RARE — vide = calcul auto)"
              placeholder="laisse vide"
              value={c.cotisations}
              onChange={set("cotisations")}
              status={onssAberrant ? "error" : undefined}
            />
          )}
          {modeAvance && onssAberrant && (
            <Cell subtitle="Cette valeur dépasse 25 % du brut → probablement une erreur.">
              ⚠️ ONSS forcé anormalement élevé
            </Cell>
          )}
        </Section>

        {modeAvance && supporteAtn && (
          <Section header="Avantages (ATN)" footer="Active ceux qui s'appliquent et saisis leur montant.">
            {ligneATN("voiture", "Voiture de société")}
            {c.voiture.actif && (
              <Input
                header="Marque / modèle (libellé sur la fiche)"
                value={c.voitureModele}
                onChange={set("voitureModele")}
              />
            )}
            {ligneATN("telephone", "Téléphone")}
            {ligneATN("logement", "Logement")}
            {ligneATN("internet", "Internet")}
          </Section>
        )}

        {modeAvance && overlay && !templates[template]?.supporte_atn && (
          <Banner
            type="section"
            header="Avantages (ATN) — non disponibles ici"
            description="Ce template n'a pas de lignes ATN. Bascule sur un template compatible."
          >
            {templateAtnSuggere && (
              <Button size="s" onClick={() => setTemplate(templateAtnSuggere)}>
                Basculer sur {templates[templateAtnSuggere]?.nom}
              </Button>
            )}
          </Banner>
        )}

        {avertissementAtn && (
          <Banner
            type="section"
            header="⚠️ ATN non affichables"
            description="Tes ATN saisies ne seront pas utilisées pour ce template."
          />
        )}

        {modeAvance && (supporteChequesRepas || supporteFpe) && (
          <Section header="Divers">
            {supporteChequesRepas && (
              <Input
                header="Chèques-repas — part perso (€)"
                value={c.chequesRepas}
                onChange={set("chequesRepas")}
              />
            )}
            {supporteFpe && (
              <Input header="Frais généraux FPE (€)" value={c.fpe} onChange={set("fpe")} />
            )}
          </Section>
        )}

        {modeAvance && (
          <Section header="Période">
            <Input header="Du" value={c.periodeDebut} onChange={set("periodeDebut")} />
            <Input header="Au" value={c.periodeFin} onChange={set("periodeFin")} />
            <Input header="Date de calcul" value={c.dateCalcul} onChange={set("dateCalcul")} />
          </Section>
        )}

        <Section>
          {etat && <Cell>{etat}</Cell>}
          <div style={{ padding: 16 }}>
            <Button stretched size="l" loading={occupe} disabled={occupe} onClick={generer}>
              {mode3Mois && overlay ? "Générer 3 mois (ZIP)" : "Générer la fiche"}
            </Button>
          </div>
        </Section>
      </List>
    </>
  );
}

// ─── Racine avec garde d'authentification ─────────────────────────────────
export function App() {
  const [session, setSession] = useState<SessionUtilisateur | null | "chargement">("chargement");

  useEffect(() => {
    const locale = lireSession();
    if (!locale) {
      setSession(null);
      return;
    }
    // Vérifie le token auprès du backend au démarrage
    verifierSession(locale.token).then((s) => setSession(s));
  }, []);

  async function handleDeconnexion() {
    if (session && session !== "chargement") {
      await seDeconnecter(session.token);
    }
    setSession(null);
  }

  // Écran de chargement initial (vérification session)
  if (session === "chargement") {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090f",
      }}>
        <div style={{
          width: 28,
          height: 28,
          border: "2px solid rgba(99,102,241,0.3)",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Non connecté → écran de connexion
  if (!session) {
    return <LoginScreen onConnexion={setSession} />;
  }

  // Compte inactif ou désactivé
  if (session.statut !== "actif") {
    return <EcranInactif onDeconnexion={handleDeconnexion} />;
  }

  // Compte actif → application complète
  return <AppPrincipale session={session} onDeconnexion={handleDeconnexion} />;
}
