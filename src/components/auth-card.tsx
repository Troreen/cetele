"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { claimManualInvitation, signInWithPassword } from "@/modules/cetele/actions";

type AuthMode = "sign-in" | "claim";

const AUTH_FAILURE_COPY: Record<AuthMode, string> = {
  "sign-in": "E-posta veya parola doğrulanamadı. Lütfen tekrar dene.",
  claim: "Davet tamamlanamadı. Bağlantı kullanılmış veya süresi dolmuş olabilir.",
};
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const FRAGMENT_UNREAD = "fragment-unread";
const FRAGMENT_INVALID = "fragment-invalid";

function subscribeToFragment(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function invitationTokenFromFragment() {
  const candidate = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
  return TOKEN_PATTERN.test(candidate) ? candidate : FRAGMENT_INVALID;
}

export function AuthCard({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const hosted = process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase";
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState(hosted ? "" : mode === "sign-in" ? "mert@example.com" : "davetli@example.com");
  const [password, setPassword] = useState(hosted ? "" : "cetele-demo");
  const [passwordConfirmation, setPasswordConfirmation] = useState(hosted ? "" : "cetele-demo");
  const fragmentState = useSyncExternalStore(subscribeToFragment, invitationTokenFromFragment, () => FRAGMENT_UNREAD);
  const fragmentReady = fragmentState !== FRAGMENT_UNREAD;
  const token = fragmentState !== FRAGMENT_UNREAD && fragmentState !== FRAGMENT_INVALID ? fragmentState : "";
  const [error, setError] = useState("");
  const [claimOutcome, setClaimOutcome] = useState<"sign-in-required" | "cleanup-required" | null>(null);
  const content = mode === "sign-in"
    ? { title: "Çetelene dön", description: "Kendi kaydın ve sorumlulukların tek yerde.", button: "Giriş yap" }
    : { title: "Davetini kabul et", description: "E-posta adresini ve yeni parolanı belirleyerek hesabını oluştur.", button: "Daveti kabul et" };

  async function submit() {
    setError("");
    if (mode === "claim" && (!token || password !== passwordConfirmation)) {
      setError(!token ? AUTH_FAILURE_COPY.claim : "Parolalar aynı olmalı.");
      return;
    }
    try {
      if (hosted && mode === "sign-in") await signInWithPassword({ email, password });
      if (hosted && mode === "claim") {
        const result = await claimManualInvitation({ token, email, password, passwordConfirmation });
        if (result.outcome !== "signed-in") {
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
          setClaimOutcome(result.outcome);
          return;
        }
      }
      if (mode === "claim") window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      router.push("/today");
    } catch {
      setError(AUTH_FAILURE_COPY[mode]);
    }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/today" className="brand"><span className="brand-mark">✓</span>Çetele</Link>
    <div className="auth-copy"><h1>{claimOutcome === "sign-in-required" ? "Hesabın hazır" : claimOutcome === "cleanup-required" ? "Yardım gerekiyor" : content.title}</h1><p>{claimOutcome === "sign-in-required" ? "Davet kabul edildi ve mentorluk ilişkin kuruldu." : claimOutcome === "cleanup-required" ? "Hesap oluşturma işlemi güvenle tamamlanamadı." : content.description}</p></div>
    {claimOutcome === "sign-in-required" ? <div className="form-stack"><p className="privacy-note" role="status"><Check size={16} /> Oturum otomatik açılamadı. Belirlediğin e-posta ve parola ile giriş yapabilirsin.</p><Link className="primary-button full" href="/sign-in">Giriş ekranına git <ArrowRight size={18} /></Link></div> : claimOutcome === "cleanup-required" ? <div className="form-stack"><p className="form-error" role="alert">Hesap oluşturma geri alınamadı. Bu bağlantıyla yeniden deneme; bağlantıyı paylaşan mentorla iletişime geç ve Çetele yöneticisinden yardım iste.</p><Link className="secondary-button full" href="/sign-in">Giriş ekranına dön</Link></div> : <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <label>E-posta<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label>Parola<span className="password-field"><input type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "claim" ? "new-password" : "current-password"} minLength={8} maxLength={72} required /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Parolayı gizle" : "Parolayı göster"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
      {mode === "claim" ? <label>Parola tekrarı<input type={show ? "text" : "password"} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" minLength={8} maxLength={72} required /></label> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : mode === "claim" && fragmentReady && !token ? <p className="form-error" role="alert">{AUTH_FAILURE_COPY.claim}</p> : null}
      <button className="primary-button full" type="submit" disabled={mode === "claim" && (!fragmentReady || !token)}>{content.button} <ArrowRight size={18} /></button>
    </form>}
    {!claimOutcome ? mode === "claim" ? <p className="auth-footnote"><Check size={15} /> {hosted ? "Bağlantı tek kullanımlıktır ve 72 saat geçerlidir." : "Yerel demo: sunucuda hesap veya mentorluk ilişkisi oluşturulmaz."}</p> : <p className="auth-footnote">{hosted ? "Güvenli Supabase oturumu" : "Yerel doğrulama modu"}</p> : null}
  </section></main>;
}
