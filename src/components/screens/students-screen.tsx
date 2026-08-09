"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, ClipboardCheck, MailPlus, Plus, Search } from "lucide-react";
import { Dialog } from "../dialog";
import { EvidenceStrip } from "../habit-card";
import { SectionHeader } from "../section-header";
import { assignmentsFor, completionRatio, definition, directStudents, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";

const REVIEW_DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });

export function StudentsScreen() {
  const { state, dispatch } = useCetele();
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const students = directStudents(state).filter((item) => item.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));
  const reviewed = state.reviews.some((item) => item.mentorId === state.currentUserId && item.date === state.today);
  const openCount = state.attention.filter((item) => item.responsibleMentorId === state.currentUserId && item.state === "open").length;
  const reviewDates = recentDates(state.today, 7);
  return <div className="workspace">
    <SectionHeader title="Öğrencilerim" description="Doğrudan mentorluğunu yaptığın öğrencilerin bugünkü durumu." actions={<><button className="secondary-button" onClick={() => setInviteOpen(true)}><MailPlus size={18} /> Öğrenci davet et</button><Link className="primary-button" href="/library"><Plus size={18} /> Alışkanlık ata</Link></>} />
    <div className="mentor-grid"><section className="people-ledger">
      <div className="review-bar"><span className="review-icon"><ClipboardCheck size={24} /></span><div><h2>Günlük inceleme</h2><p>{reviewed ? "Bugünkü tarama kaydedildi." : reviewing ? "Kayıtları taradıktan sonra incelemeyi tamamla." : `${students.filter((item) => item.invitation === "active").length} öğrencinin kaydını gözden geçir.`}</p></div><button className={reviewed ? "secondary-button complete" : "primary-button"} disabled={reviewed} onClick={() => { if (reviewing) dispatch({ type: "mark-reviewed" }); else setReviewing(true); }}>{reviewed ? <><Check size={17} /> Bugün incelendi</> : reviewing ? "İncelemeyi tamamla" : "İncelemeyi başlat"}</button></div>
      <label className="search-field"><Search size={18} /><span className="sr-only">Öğrenci ara</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Öğrenci ara" /></label>
      <div className="ledger-header"><span>Öğrenci</span><span>Son kayıtlar</span><span>Bugün</span><span>Durum</span><span aria-hidden="true" /></div>
      <div className="student-list">{students.map((student) => {
        const assignments = assignmentsFor(state, student.id);
        const ratio = completionRatio(state, student.id);
        const attention = state.attention.find((item) => item.studentId === student.id && item.state === "open");
        return <article className="student-row" key={student.id}><span className="avatar">{student.initials}</span><div className="student-identity"><h2>{student.name}</h2><p>{student.invitation === "pending" ? "Davet bekliyor" : `${assignments.length} alışkanlık`}</p></div><div className="student-evidence">{assignments.slice(0, 3).map((assignment) => { const habitName = definition(state, assignment.definitionId)?.name ?? "Alışkanlık"; return <div className="identified-evidence" key={assignment.id}><span className="evidence-label" title={habitName}>{habitName}</span><EvidenceStrip assignment={assignment} count={6} /></div>; })}</div><strong className="today-ratio">{student.invitation === "pending" ? "—" : `${ratio.done}/${ratio.total}`}</strong><span className={`status-text ${attention ? "attention" : student.invitation === "pending" ? "pending" : "calm"}`}>{attention ? "Dikkat gerekiyor" : student.invitation === "pending" ? "Kabul bekleniyor" : "Sorun görünmüyor"}</span><Link href={`/students/${student.id}`} className="icon-button" aria-label={`${student.name} ayrıntıları`}><ChevronRight size={20} /></Link></article>;
      })}</div>
    </section><aside className="responsibility-rail"><section><h2>Sorumluluk özeti</h2><dl><div><dt>Doğrudan öğrenci</dt><dd>{students.length}</dd></div><div><dt>Dikkat gereken</dt><dd>{openCount}</dd></div><div><dt>Bekleyen davet</dt><dd>{students.filter((item) => item.invitation === "pending").length}</dd></div></dl></section><section><h2>İnceleme geçmişi</h2><div className="review-history" aria-label="Son yedi günlük inceleme geçmişi">{reviewDates.map((date) => { const reviewedOnDate = state.reviews.some((item) => item.mentorId === state.currentUserId && item.date === date); return <span key={date} className={reviewedOnDate ? "done" : ""}><span className="sr-only">{REVIEW_DATE_FORMATTER.format(new Date(`${date}T12:00:00Z`))}: {reviewedOnDate ? "incelendi" : "incelenmedi"}</span></span>; })}</div></section></aside></div>
    {inviteOpen ? <Dialog title="Öğrenci davet et" onClose={() => setInviteOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (inviteName.trim() && inviteEmail) dispatch({ type: "invite", name: inviteName.trim(), email: inviteEmail }); setInviteOpen(false); }}><label>Ad soyad<input value={inviteName} onChange={(event) => setInviteName(event.target.value)} required /></label><label>E-posta<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="ogrenci@example.com" required /></label><p className="privacy-note">Davet edilen kişi e-postasını doğrular ve kendi parolasını belirler.</p><button className="primary-button" type="submit">Daveti gönder</button></form></Dialog> : null}
  </div>;
}
