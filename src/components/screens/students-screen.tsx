"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, ClipboardCheck, Copy, ExternalLink, MailPlus, Plus, Search, ShieldAlert } from "lucide-react";
import { Dialog } from "../dialog";
import { SectionHeader } from "../section-header";
import { StudentSummaryRow } from "../student-summary-row";
import { directStudents, recentDates } from "@/modules/cetele/selectors";
import { browserNavigation, useCetele } from "@/modules/cetele/store";
import { hrefWithUiState, useUiSearch } from "@/modules/cetele/url-state";
import { createManualInvitation } from "@/modules/cetele/actions";

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
const INVITATION_EXPIRY_FORMATTER = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" });
const LOCAL_DEMO_TOKEN = "A".repeat(43);

function subscribeToClock(onChange: () => void) {
  const interval = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(interval);
}

function currentMinute() {
  return Math.floor(Date.now() / 60_000);
}

function invitationIsExpired(expiresAt: string | undefined, now: number) {
  return expiresAt ? new Date(expiresAt).getTime() <= now : false;
}

export function StudentsScreen() {
  const { state, dispatch, adapter } = useCetele();
  const uiSearch = useUiSearch();
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; expiresAt: string } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const now = useSyncExternalStore(subscribeToClock, currentMinute, () => 0) * 60_000;
  const students = directStudents(state).filter((item) => item.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));
  const pendingCount = students.filter((item) => item.invitation === "pending" && !invitationIsExpired(item.invitationExpiresAt, now)).length;
  const reviewed = state.reviews.some((item) => item.mentorId === state.currentUserId && item.date === state.today);
  const openCount = state.attention.filter((item) => item.responsibleMentorId === state.currentUserId && item.state === "open").length;
  const reviewDates = recentDates(state.today, 7);

  async function createInvitation() {
    setCreatingInvite(true);
    setInviteError("");
    try {
      if (adapter === "local") {
        dispatch({ type: "invite", name: "Talep edilmemiş davet" });
        const url = new URL("/invite/accept", window.location.origin);
        url.hash = `token=${LOCAL_DEMO_TOKEN}`;
        const expiresAt = new Date(new Date(`${state.today}T12:00:00Z`).getTime() + 72 * 60 * 60 * 1000).toISOString();
        setInviteResult({ url: url.toString(), expiresAt });
      } else {
        setInviteResult(await createManualInvitation({}));
      }
    } catch {
      setInviteError("Davet bağlantısı oluşturulamadı. Lütfen tekrar dene.");
    } finally {
      setCreatingInvite(false);
    }
  }

  function closeInvitation() {
    const refreshHostedInvitations = adapter === "supabase" && inviteResult !== null;
    setInviteOpen(false);
    setInviteResult(null);
    setInviteError("");
    setCopied(false);
    if (refreshHostedInvitations) browserNavigation.reload();
  }

  return <div className="workspace">
    <SectionHeader title="Öğrencilerim" description="Doğrudan mentorluğunu yaptığın öğrencilerin bugünkü durumu." actions={<><button className="secondary-button" onClick={() => setInviteOpen(true)}><MailPlus size={18} /> Öğrenci davet et</button><Link className="primary-button" href={hrefWithUiState("/library", uiSearch)}><Plus size={18} /> Alışkanlık ata</Link></>} />
    <div className="mentor-grid"><section className="people-ledger">
      <div className="review-bar"><span className="review-icon"><ClipboardCheck size={24} /></span><div><h2>Günlük inceleme</h2><p>{reviewed ? "Bugünkü tarama kaydedildi." : reviewing ? "Kayıtları taradıktan sonra incelemeyi tamamla." : `${students.filter((item) => item.invitation === "active").length} öğrencinin kaydını gözden geçir.`}</p></div><button className={reviewed ? "secondary-button complete" : "primary-button"} disabled={reviewed} onClick={() => { if (reviewing) dispatch({ type: "mark-reviewed" }); else setReviewing(true); }}>{reviewed ? <><Check size={17} /> Bugün incelendi</> : reviewing ? "İncelemeyi tamamla" : "İncelemeyi başlat"}</button></div>
      <label className="search-field"><Search size={18} /><span className="sr-only">Öğrenci ara</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci ara" /></label>
      <div className="ledger-header"><span>Öğrenci</span><span>Son kayıtlar</span><span>Bugün</span><span>Durum</span><span aria-hidden="true" /></div>
      <div className="student-list">{students.map((student) => {
        const invitationExpired = student.invitation === "pending" && invitationIsExpired(student.invitationExpiresAt, now);
        return <StudentSummaryRow key={student.id} student={student} href={hrefWithUiState(`/students/${student.id}`, uiSearch)} invitationExpired={invitationExpired} onRevoke={() => dispatch({ type: "revoke-invitation", invitationId: student.id })} />;
      })}</div>
    </section><aside className="responsibility-rail"><section><h2>Sorumluluk özeti</h2><dl><div><dt>Doğrudan öğrenci</dt><dd>{students.length}</dd></div><div><dt>Dikkat gereken</dt><dd>{openCount}</dd></div><div><dt>Bekleyen davet</dt><dd>{pendingCount}</dd></div></dl></section><section><h2>İnceleme geçmişi</h2><div className="review-history" aria-label="Son yedi günlük inceleme geçmişi">{reviewDates.map((date) => { const reviewedOnDate = state.reviews.some((item) => item.mentorId === state.currentUserId && item.date === date); return <span key={date} className={reviewedOnDate ? "done" : ""}><span className="sr-only">{REVIEW_DATE_FORMATTER.format(new Date(`${date}T12:00:00Z`))}: {reviewedOnDate ? "incelendi" : "incelenmedi"}</span></span>; })}</div></section></aside></div>
    {inviteOpen ? <Dialog title="Öğrenci davet et" onClose={closeInvitation}>{inviteResult ? <div className="form-stack invitation-result">
      <p className="privacy-note"><ShieldAlert size={18} /> Bu tek kullanımlı bağlantıyı yalnızca davet ettiğin kişiye, özel bir kanaldan ilet. Pencereyi kapattıktan sonra Çetele bağlantıyı yeniden göstermez.</p>
      {adapter === "local" ? <p className="privacy-note">Yerel demo bağlantısıdır; sunucuda davet oluşturulduğunu kanıtlamaz.</p> : null}
      <label>Davet bağlantısı<input aria-label="Davet bağlantısı" value={inviteResult.url} readOnly /></label>
      <p>Son kullanım: {INVITATION_EXPIRY_FORMATTER.format(new Date(inviteResult.expiresAt))}</p>
      <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => { void navigator.clipboard?.writeText(inviteResult.url).then(() => setCopied(true)); }}><Copy size={17} /> {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}</button>{adapter === "local" ? <a className="primary-button" href={inviteResult.url}>Yerel demo bağlantısını aç <ExternalLink size={17} /></a> : null}</div>
    </div> : <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void createInvitation(); }}><p className="privacy-note"><ShieldAlert size={18} /> Davet edilen kişinin adını veya e-posta adresini burada istemeyiz. Kişi kullanıcı adını ve özel e-postasını kurulumda kendisi seçer.</p>{inviteError ? <p className="form-error" role="alert">{inviteError}</p> : null}<button className="primary-button" type="submit" disabled={creatingInvite}>{creatingInvite ? "Oluşturuluyor…" : "Tek kullanımlı bağlantı oluştur"}</button></form>}</Dialog> : null}
  </div>;
}
