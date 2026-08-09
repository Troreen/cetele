"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { acceptMentorshipInvitation, setAccountPassword, signInWithPassword } from "@/modules/cetele/actions";

type AuthMode = "sign-in" | "invite" | "password";

export function AuthCard({ mode, invitationId }: { mode: AuthMode; invitationId?: string }) {
  const router = useRouter();
  const production = process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase";
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState(production ? "" : mode === "sign-in" ? "mert@example.com" : "davetli@example.com");
  const [password, setPassword] = useState(production ? "" : "cetele-demo");
  const [error, setError] = useState("");
  const content = {
    "sign-in": { title: "Çetelene dön", description: "Kendi kaydın ve sorumlulukların tek yerde.", button: "Giriş yap" },
    invite: { title: "Davetini kabul et", description: "Davet edildiğin mentorluk ilişkisini güvenle kur.", button: "E-postamı doğrula" },
    password: { title: "Parolanı belirle", description: "Daha sonraki girişlerinde bu e-posta ve parolayı kullanacaksın.", button: "Parolayı kaydet" },
  }[mode];

  async function submit() {
    setError("");
    try {
      if (production && mode === "sign-in") await signInWithPassword({ email, password });
      if (production && mode === "password") {
        await setAccountPassword({ password });
        if (invitationId) await acceptMentorshipInvitation({ invitationId });
      }
      if (mode === "invite") {
        const destination = invitationId ? `/set-password?invitation=${encodeURIComponent(invitationId)}` : "/set-password";
        router.push(destination as Route);
      } else {
        router.push("/today");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "İşlem tamamlanamadı.");
    }
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/today" className="brand"><span className="brand-mark">✓</span>Çetele</Link>
    <div className="auth-copy"><h1>{content.title}</h1><p>{content.description}</p></div>
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {mode === "sign-in" || !production ? <label>E-posta<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={mode !== "sign-in"} /></label> : <p className="privacy-note"><Check size={16} /> Davet e-posta adresin doğrulandı.</p>}
      {mode !== "invite" ? <label>Parola<span className="password-field"><input type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Parolayı gizle" : "Parolayı göster"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button full" type="submit">{content.button} <ArrowRight size={18} /></button>
    </form>
    {mode === "sign-in" ? <p className="auth-footnote">{production ? "Güvenli Supabase oturumu" : "Yerel doğrulama modu"}. <Link href="/invite/accept">Davet akışını gör</Link></p> : <p className="auth-footnote"><Check size={15} /> E-posta adresin davetle sabitlenir.</p>}
  </section></main>;
}
