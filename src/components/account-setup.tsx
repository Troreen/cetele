"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { completeAccountSetup, updateRecoveredPassword } from "@/modules/cetele/account-actions";

export function AccountSetup({ recovery = false, mentorship = true }: { recovery?: boolean; mentorship?: boolean }) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(false);
  const [core, setCore] = useState(false);
  const [direct, setDirect] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const ready = recovery ? password.length >= 8 && password === confirmation : alias.trim().length >= 2 && password.length >= 8 && password === confirmation && terms && core && (!mentorship || direct);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function submit() {
    setPending(true);
    setError("");
    try {
      const hosted = process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase";
      if (recovery) { if (hosted) await updateRecoveredPassword({ password }); }
      else if (hosted) await completeAccountSetup({ alias, password, passwordConfirmation: confirmation, terms, coreTracking: core, directMentorVisibility: mentorship ? direct : false });
      router.push(recovery ? "/sign-in" : "/today");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "İşlem tamamlanamadı. Bilgilerini kontrol edip yeniden dene.");
    } finally { setPending(false); }
  }

  return <main className="auth-page"><section className="auth-card onboarding-card">
    <div className="brand"><span className="brand-mark"><Check size={15} /></span>Çetele</div>
    <div className="auth-copy"><h1>{recovery ? "Yeni parolanı belirle" : "Çetele kimliğini kur"}</h1><p>{recovery ? "Doğrulanmış kurtarma e-postanla açılan bu oturumda yeni parolanı kaydet." : "Kısa kurulumdan sonra kendi kaydına geçeceksin. Bu metinler yasal onay bekleyen non-production fixture kopyadır."}</p></div>
    {error ? <div className="form-error error-summary" role="alert" tabIndex={-1} ref={errorRef}><strong>Kurulum tamamlanamadı</strong><span>{error}</span></div> : null}
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {!recovery ? <fieldset className="onboarding-section"><legend>Senin Çetele kimliğin</legend><label>Kullanıcı adı<input value={alias} onChange={(event) => setAlias(event.target.value)} minLength={2} maxLength={40} autoComplete="nickname" required /></label></fieldset> : null}
      <fieldset className="onboarding-section" aria-label="Parola bilgileri">{recovery ? <legend>Parola</legend> : null}<label>Yeni parola<span className="password-field"><input type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Parolayı gizle" : "Parolayı göster"}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label><label>Parola tekrarı<input type={show ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required /></label></fieldset>
      {!recovery ? <fieldset className="onboarding-section legal-fixture"><legend>Gizlilik ve anlaşma</legend><p><strong>NON-PRODUCTION FIXTURE:</strong> Son Türkçe yasal metin, controller bilgileri ve Article 6/9 kararları insan/hukuk onayı bekliyor.</p><label className="consent-choice"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /><span><strong>Hizmet Koşullarını kabul ediyorum.</strong><small>Bu hizmet sözleşmesidir; gizlilik rızası değildir.</small></span></label><label className="consent-choice"><input type="checkbox" checked={core} onChange={(event) => setCore(event.target.checked)} /><span><strong>Çekirdek Takip Rızası veriyorum.</strong><small>Atanmış manevi alışkanlıklarımın, günlük geçmişimin ve dikkat durumunun kendi kaydım için işlenmesi.</small></span></label>{mentorship ? <label className="consent-choice"><input type="checkbox" checked={direct} onChange={(event) => setDirect(event.target.checked)} /><span><strong>Doğrudan Mentor Görünürlük Rızası veriyorum.</strong><small>Yalnızca adı belirtilen Doğrudan Mentor, açıklanan hesap verebilirlik kayıtlarını görebilir.</small></span></label> : null}<p className="field-help"><a href="/legal/privacy">Gizlilik Bildirimini oku</a> · <a href="/legal/terms">Hizmet Koşullarını oku</a></p></fieldset> : null}
      {!recovery ? <div className="confirmation-note"><ShieldCheck size={19} /><p>Dolaylı mentorlar, akranlar veya daha üst mentorlar kayıtlarına erişemez. Rızalarını Ayarlar bölümünden geri çekebilirsin.</p></div> : null}
      <button className="primary-button full" type="submit" disabled={!ready || pending}>{pending ? "Kaydediliyor…" : recovery ? "Parolayı kaydet" : "Hesabı tamamla"} <ArrowRight size={18} /></button>
    </form>
  </section></main>;
}
