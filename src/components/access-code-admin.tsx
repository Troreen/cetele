"use client";

import { useState } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { createAccessCode, revokeAccessCode } from "@/modules/cetele/account-actions";
import { browserNavigation } from "@/modules/cetele/store";

type AccessCodeSummary = { id: string; maximum_uses: number; consumed_uses: number; expires_at: string; revoked_at: string | null };

export function AccessCodeAdmin({ codes }: { codes: AccessCodeSummary[] }) {
  const [maximumUses, setMaximumUses] = useState(1);
  const [lifetimeHours, setLifetimeHours] = useState(72);
  const [oneTimeUrl, setOneTimeUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return <main className="workspace narrow-workspace">
    <header><h1>Erişim Kodları</h1><p>Bağımsız hesaplar için sınırlı kullanımlı, süreli bağlantılar. Ham kod yalnızca oluşturulduğu anda gösterilir.</p></header>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <form className="settings-section form-stack" onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setError("");
      try { setOneTimeUrl((await createAccessCode({ maximumUses, lifetimeHours })).url); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "Erişim Kodu oluşturulamadı."); }
      finally { setPending(false); }
    }}>
      <h2>Yeni Erişim Kodu</h2>
      <label>Azami kullanım<input type="number" min={1} max={100} value={maximumUses} onChange={(event) => setMaximumUses(Number(event.target.value))} /></label>
      <label>Geçerlilik (saat)<input type="number" min={1} max={720} value={lifetimeHours} onChange={(event) => setLifetimeHours(Number(event.target.value))} /></label>
      <button className="primary-button" disabled={pending}><KeyRound size={17} /> {pending ? "Oluşturuluyor…" : "Erişim Kodu oluştur"}</button>
    </form>
    {oneTimeUrl ? <section className="settings-section one-time-secret" aria-live="polite"><h2>Şimdi güvenli biçimde paylaş</h2><p>Bu bağlantı yeniden görüntülenemez. Mesajlaşma hizmetinin bağlantı önizlemesini kapat.</p><code>{oneTimeUrl}</code><button className="secondary-button" onClick={() => navigator.clipboard.writeText(oneTimeUrl)}><Copy size={17} /> Bağlantıyı kopyala</button></section> : null}
    <section className="settings-section"><h2>Oluşturulan kodlar</h2><div className="request-list">{codes.map((code) => <article key={code.id}><div><strong>{code.consumed_uses}/{code.maximum_uses} kullanım</strong><small>{new Date(code.expires_at).toLocaleString("tr-TR")}{code.revoked_at ? " · İptal edildi" : ""}</small></div>{!code.revoked_at ? <button className="danger-button" onClick={async () => { if (!confirm("Bu Erişim Kodunu hemen iptal etmek istiyor musun?")) return; await revokeAccessCode({ accessCodeId: code.id }); browserNavigation.reload(); }}><Trash2 size={16} /> İptal et</button> : null}</article>)}</div></section>
  </main>;
}
