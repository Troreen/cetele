"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelAccountDeletion } from "@/modules/cetele/account-actions";

export function DeletionRecovery() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return <main className="auth-page"><section className="auth-card"><div className="auth-copy"><h1>Hesap kapatma isteği</h1><p>Hesabın koruma süresinde ve uygulama erişimi kapalı. İsteği sen verdiysen hiçbir şey yapma. Çekirdek Takip Rızasını geri çekmediysen, süre dolmadan hesabı kurtarabilirsin.</p></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button full" disabled={pending} onClick={async () => { setPending(true); setError(""); try { await cancelAccountDeletion(); router.push("/today"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Hesap kurtarılamadı."); } finally { setPending(false); } }}>{pending ? "Kurtarılıyor…" : "Silme isteğini geri al"}</button><button className="text-button" onClick={() => router.push("/sign-in")}>Giriş ekranına dön</button></section></main>;
}
