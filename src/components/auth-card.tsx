"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { previewRegistrationClaim, requestPasswordRecovery, startRegistration } from "@/modules/cetele/account-actions";
import { signInWithPassword } from "@/modules/cetele/actions";

type AuthMode = "sign-in" | "claim" | "access-code" | "mentorship-invitation";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const FRAGMENT_UNREAD = "fragment-unread";
const FRAGMENT_INVALID = "fragment-invalid";

function subscribeToFragment(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function claimTokenFromFragment() {
  const candidate = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
  return TOKEN_PATTERN.test(candidate) ? candidate : FRAGMENT_INVALID;
}

export function AuthCard({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const hosted = process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase";
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(hosted ? "" : "ornek@example.test");
  const [password, setPassword] = useState(hosted ? "" : "cetele-demo");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [mentorAlias, setMentorAlias] = useState("");
  const fragmentState = useSyncExternalStore(subscribeToFragment, claimTokenFromFragment, () => FRAGMENT_UNREAD);
  const token = fragmentState !== FRAGMENT_UNREAD && fragmentState !== FRAGMENT_INVALID ? fragmentState : "";
  const isClaim = mode !== "sign-in";
  useEffect(() => {
    if (!hosted || !token || !isClaim) return;
    void previewRegistrationClaim({ token, kind: mode === "access-code" ? "access_code" : "mentorship_invitation" })
      .then((claim) => setMentorAlias(claim.mentorAlias ?? ""))
      .catch(() => setError("Bağlantı doğrulanamadı. Yeni bir bağlantı iste."));
  }, [hosted, isClaim, mode, token]);
  const title = mode === "sign-in" ? "Çetelene dön" : mode === "access-code" ? "Erişim Kodunu kullan" : "Mentorluk davetini aç";
  const description = mode === "sign-in"
    ? "Özel e-posta adresin ve parolanla giriş yap."
    : mode === "access-code"
      ? "Bu kod bağımsız bir Çetele hesabı kurar; mentorluk ilişkisi oluşturmaz."
      : `Geçerli bağlantı, kurulum tamamlandığında ${mentorAlias || "bağlantıda belirtilen kişi"} ile bir Doğrudan Mentor ilişkisi kurar.`;

  async function submit() {
    setError("");
    setStatus("");
    try {
      if (mode === "sign-in") {
        if (recovery) {
          const result = await requestPasswordRecovery({ email });
          setStatus(result.message);
          return;
        }
        if (hosted) {
          const result = await signInWithPassword({ email, password });
          router.push(result.destination);
        } else router.push("/today");
        return;
      }
      if (!token) throw new Error();
      if (!hosted) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        router.push(`/account/setup?kind=${mode === "access-code" ? "access_code" : "mentorship_invitation"}`);
        return;
      }
      const result = await startRegistration({ token, email, kind: mode === "access-code" ? "access_code" : "mentorship_invitation" });
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      setStatus(result.message);
    } catch {
      setError(isClaim ? "Bağlantı doğrulanamadı. Yeni bir bağlantı iste." : "E-posta veya parola doğrulanamadı. Tekrar dene.");
    }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href={mode === "sign-in" ? "/sign-in" : "#"} className="brand"><span className="brand-mark"><Check size={15} /></span>Çetele</Link>
    <div className="auth-copy"><h1>{recovery ? "Parolanı yenile" : title}</h1><p>{recovery ? "Hesap olup olmadığını açığa çıkarmadan yenileme bağlantısı göndeririz." : description}</p></div>
    {status ? <div className="form-stack"><p className="privacy-note" role="status"><Mail size={17} /> {status}</p><Link className="secondary-button full" href="/sign-in">Giriş ekranına dön</Link></div> : <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label>Özel e-posta<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      {mode === "sign-in" && !recovery ? <label>Parola<span className="password-field"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : isClaim && fragmentState === FRAGMENT_INVALID ? <p className="form-error" role="alert">Bağlantı doğrulanamadı. Yeni bir bağlantı iste.</p> : null}
      <button className="primary-button full" type="submit" disabled={isClaim && (!token || fragmentState === FRAGMENT_UNREAD)}>{recovery ? "Yenileme bağlantısı iste" : mode === "sign-in" ? "Giriş yap" : "Doğrulama e-postası iste"} <ArrowRight size={18} /></button>
      {mode === "sign-in" ? <button className="text-button" type="button" onClick={() => { setRecovery(!recovery); setError(""); setStatus(""); }}><KeyRound size={16} /> {recovery ? "Girişe dön" : "Parolamı unuttum"}</button> : null}
    </form>}
    <p className="auth-footnote"><Check size={15} /> {isClaim ? "Çetele yasal ad istemez; e-posta yalnızca Supabase Auth içinde kalır." : hosted ? "Güvenli Supabase oturumu" : "Yerel doğrulama modu"}</p>
  </section></main>;
}
