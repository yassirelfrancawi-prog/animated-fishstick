import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { seConnecter, type SessionUtilisateur } from "./auth";

interface Props {
  onConnexion: (session: SessionUtilisateur) => void;
}

export function LoginScreen({ onConnexion }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Animation d'entrée décalée
    const t1 = setTimeout(() => setMounted(true), 50);
    const t2 = setTimeout(() => setVisible(true), 100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErreur("Veuillez remplir tous les champs.");
      return;
    }
    setErreur("");
    setChargement(true);
    try {
      const session = await seConnecter(username.trim(), password);
      onConnexion(session);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setChargement(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Sora:wght@300;600;700&display=swap');

        .login-root {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #09090f;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Glow ambiant */
        .login-root::before {
          content: '';
          position: absolute;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(ellipse, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Grille subtile en fond */
        .login-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .login-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Bandeau supérieur */
        .login-header {
          text-align: center;
          margin-bottom: 40px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s;
        }
        .login-card.visible .login-header {
          opacity: 1;
          transform: translateY(0);
        }

        .login-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .login-logo-mark {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
        }
        .login-logo-mark svg {
          width: 20px;
          height: 20px;
        }
        .login-logo-text {
          font-family: 'Sora', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.5px;
        }

        .login-tagline {
          font-size: 13px;
          color: #64748b;
          font-weight: 400;
          letter-spacing: 0.2px;
        }

        /* Carte formulaire */
        .login-form-card {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 20px;
          padding: 36px 32px;
          backdrop-filter: blur(12px);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
        }

        .login-title {
          font-family: 'Sora', sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0 0 4px;
          letter-spacing: -0.3px;
        }
        .login-subtitle {
          font-size: 13px;
          color: #475569;
          margin: 0 0 28px;
        }

        .login-field {
          margin-bottom: 18px;
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .login-card.visible .login-field:nth-child(1) {
          opacity: 1; transform: translateX(0);
          transition-delay: 0.2s;
        }
        .login-card.visible .login-field:nth-child(2) {
          opacity: 1; transform: translateX(0);
          transition-delay: 0.28s;
        }

        .login-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #94a3b8;
          margin-bottom: 8px;
          text-transform: none;
          letter-spacing: 0.1px;
        }

        .login-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 10px;
          padding: 12px 14px;
          color: #f1f5f9;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          box-sizing: border-box;
          -webkit-appearance: none;
        }
        .login-input::placeholder {
          color: #334155;
        }
        .login-input:focus {
          border-color: rgba(99, 102, 241, 0.6);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }
        .login-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .login-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
          color: #fca5a5;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          animation: erreurEntre 0.25s ease;
        }
        @keyframes erreurEntre {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-btn {
          width: 100%;
          padding: 13px;
          border-radius: 11px;
          border: none;
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          animation: none;
        }
        .login-card.visible .login-btn {
          animation: btnApparait 0.4s ease 0.4s forwards;
        }
        @keyframes btnApparait {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-btn:hover:not(:disabled) {
          box-shadow: 0 6px 28px rgba(99, 102, 241, 0.5);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* Spinner */
        .login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Pied de page */
        .login-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 12px;
          color: #334155;
          opacity: 0;
          transition: opacity 0.5s ease 0.5s;
        }
        .login-card.visible .login-footer {
          opacity: 1;
        }

        /* Séparateur */
        .login-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 24px 0;
        }
      `}</style>

      <div className="login-root">
        <div className={`login-card ${mounted && visible ? "visible" : ""}`}>

          {/* Logo + nom */}
          <div className="login-header">
            <div className="login-logo">
              <div className="login-logo-mark">
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 10h12M10 4v12M6 6l8 8M14 6l-8 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="login-logo-text">Certifio</span>
            </div>
            <p className="login-tagline">Fiches de paie · Belgique</p>
          </div>

          <div className="login-form-card">
            <h1 className="login-title">Connexion</h1>
            <p className="login-subtitle">Accès réservé aux comptes autorisés.</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label className="login-label" htmlFor="username">Nom d'utilisateur</label>
                <input
                  id="username"
                  className="login-input"
                  type="text"
                  autoComplete="username"
                  placeholder="votre identifiant"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  disabled={chargement}
                  spellCheck={false}
                />
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  className="login-input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  disabled={chargement}
                />
              </div>

              {erreur && (
                <div className="login-error" role="alert">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="7.5" cy="7.5" r="6.5" stroke="#fca5a5" strokeWidth="1.2"/>
                    <path d="M7.5 4.5v3.5" stroke="#fca5a5" strokeWidth="1.4" strokeLinecap="round"/>
                    <circle cx="7.5" cy="10.5" r="0.7" fill="#fca5a5"/>
                  </svg>
                  {erreur}
                </div>
              )}

              <button
                type="submit"
                className="login-btn"
                disabled={chargement}
              >
                {chargement ? (
                  <>
                    <span className="login-spinner" />
                    Connexion…
                  </>
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>

            <div className="login-divider" />

            <p style={{ fontSize: 12, color: "#334155", textAlign: "center", margin: 0 }}>
              L'accès est activé par l'administrateur.
            </p>
          </div>

          <div className="login-footer">
            © {new Date().getFullYear()} Certifio — usage professionnel uniquement
          </div>
        </div>
      </div>
    </>
  );
}
