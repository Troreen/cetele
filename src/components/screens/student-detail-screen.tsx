"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarOff, Plus, ShieldCheck } from "lucide-react";
import { Dialog } from "../dialog";
import { HabitCard } from "../habit-card";
import { StudentSummaryRow } from "../student-summary-row";
import { assignmentsFor, currentWeekDates, directStudents, person, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { previousDomainDate } from "@/modules/cetele/policy";
import { hrefWithUiState, pushUiState, readHistoryRange, readTheme, useUiSearch } from "@/modules/cetele/url-state";

export function StudentDetailScreen({ studentId }: { studentId: string }) {
  const { state, dispatch } = useCetele();
  const uiSearch = useUiSearch();
  const range = readHistoryRange(uiSearch) ?? "week";
  const urlTheme = readTheme(uiSearch) ?? state.theme;
  const historyDates = range === "week" ? currentWeekDates(state.today) : recentDates(state.today, 182);
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [note, setNote] = useState("");
  const [excuseDate, setExcuseDate] = useState(previousDomainDate(state.today));
  const [excuseScope, setExcuseScope] = useState<string>("all");
  const [endId, setEndId] = useState<string | null>(null);
  const student = person(state, studentId);
  const assignments = assignmentsFor(state, studentId);
  const open = state.attention.find((item) => item.studentId === studentId && item.state === "open");
  const mentoredGroup = directStudents(state, studentId);
  const recentReviewCount = state.reviews.filter((item) => item.mentorId === studentId && recentDates(state.today, 7).includes(item.date)).length;
  const openGroupAttentionCount = state.attention.filter((item) => mentoredGroup.some((directStudent) => directStudent.id === item.studentId) && item.state === "open").length;
  const responsibleMentor = student?.mentorId ? person(state, student.mentorId) : undefined;
  const canManageOrdinary = student?.mentorId === state.currentUserId;
  const nestedUnderMentor = responsibleMentor && responsibleMentor.id !== state.currentUserId;
  const backHref = nestedUnderMentor ? hrefWithUiState(`/students/${responsibleMentor.id}`, uiSearch) : hrefWithUiState("/students", uiSearch);
  const backLabel = nestedUnderMentor ? `${responsibleMentor.name} grubuna dön` : "Öğrencilerim";
  const endedAssignments = state.assignments.filter((item) => item.studentId === studentId && item.status === "ended");
  if (!student) return <div className="workspace"><p>Öğrenci bulunamadı.</p></div>;
  return <div className="workspace detail-workspace"><Link href={backHref} className="back-link"><ArrowLeft size={17} /> {backLabel}</Link><header className="student-detail-header"><span className="avatar large">{student.initials}</span><div><h1>{student.name}</h1><p>{student.invitation === "pending" ? "Davet kabulü bekleniyor" : `${assignments.length} etkin alışkanlık · Sorumlu mentor: ${responsibleMentor?.name ?? "—"}`}</p></div><span className={open ? "status-text attention" : "status-text calm"}>{open ? "Dikkat gerekiyor" : "Sorun görünmüyor"}</span><div className="section-actions">{canManageOrdinary ? <button className="secondary-button" onClick={() => setExcuseOpen(true)}><CalendarOff size={17} /> Mazeretli gün</button> : null}<Link href={hrefWithUiState("/library", uiSearch)} className="primary-button"><Plus size={17} /> Alışkanlık ata</Link></div></header>
    <div className="range-tabs detail-range" role="tablist" aria-label="Öğrenci alışkanlık tarih aralığı"><button type="button" role="tab" aria-selected={range === "week"} className={range === "week" ? "active" : ""} onClick={() => pushUiState({ range: "week", theme: urlTheme })}>Hafta</button><button type="button" role="tab" aria-selected={range === "six-months"} className={range === "six-months" ? "active" : ""} onClick={() => pushUiState({ range: "six-months", theme: urlTheme })}>6 Ay</button></div>
    <section className="detail-layout"><div className={`habit-list ${range === "six-months" ? "six-month-history" : ""}`}>{assignments.map((assignment) => <div className="managed-assignment" key={assignment.id}><HabitCard assignment={assignment} compact={range === "week"} historyDates={historyDates} showCompletionAction={false} />{canManageOrdinary ? <button className="secondary-button assignment-correction" onClick={() => setEndId(assignment.id)}>Atamayı düzelt / sonlandır</button> : null}</div>)}</div><aside className="student-notes"><h2>Son öğrenci notları</h2>{state.completions.filter((item) => assignments.some((assignment) => assignment.id === item.assignmentId) && item.note).slice(-4).map((item) => <p key={`${item.assignmentId}-${item.date}`} className="student-note">“{item.note}” <small>{item.date}</small></p>)}<div className="privacy-note"><ShieldCheck size={16} /> Öğrenci notları yalnızca öğrenci ve üst mentorları tarafından görülür.</div></aside></section>
    {endedAssignments.length ? <section className="settings-section" aria-label="Geçmiş atama kayıtları"><h2>Geçmiş atamalar</h2><p className="privacy-note">Sonlandırılan atamaların kayıtları salt okunur olarak korunur.</p><div className={`habit-list ${range === "six-months" ? "six-month-history" : ""}`}>{endedAssignments.map((item) => <HabitCard key={item.id} assignment={item} compact={range === "week"} historyDates={historyDates} showCompletionAction={false} />)}</div></section> : null}
    {mentoredGroup.length ? <section className="junior-responsibility" aria-labelledby="mentor-responsibility-title"><h2 id="mentor-responsibility-title">Mentor sorumluluğu</h2><dl><div><dt>Doğrudan grup</dt><dd>{mentoredGroup.length}</dd></div><div><dt>7 günlük inceleme</dt><dd>{recentReviewCount}/7</dd></div><div><dt>Açık takip</dt><dd>{openGroupAttentionCount}</dd></div></dl><div className="student-list junior-group-list">{mentoredGroup.map((directStudent) => <StudentSummaryRow key={directStudent.id} student={directStudent} href={hrefWithUiState(`/students/${directStudent.id}`, uiSearch)} />)}</div></section> : null}
    {excuseOpen ? <Dialog title="Mazeretli gün tanımla" onClose={() => setExcuseOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "excuse", studentId, assignmentId: excuseScope === "all" ? null : excuseScope, date: excuseDate, note }); setExcuseOpen(false); }}><label>Tarih<input type="date" value={excuseDate} onChange={(event) => setExcuseDate(event.target.value)} max={state.today} /></label><label>Kapsam<select value={excuseScope} onChange={(event) => setExcuseScope(event.target.value)}><option value="all">Tüm alışkanlıklar</option>{assignments.map((item) => <option key={item.id} value={item.id}>{state.definitions.find((habit) => habit.id === item.definitionId)?.name}</option>)}</select></label><label>Not <span className="optional">İsteğe bağlı</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label><p className="privacy-note">Mazeretli gün tamamlanma oranına girmez; seriyi uzatmaz veya bozmaz.</p><button className="primary-button" type="submit">Mazereti kaydet</button></form></Dialog> : null}
    {endId ? <Dialog title="Atamayı düzelt" onClose={() => setEndId(null)}><div className="form-stack"><p>Hiç kayıt yoksa atama iptal edilir. Kayıt varsa atama sonlandırılır ve bütün geçmiş korunur.</p><button className="primary-button" onClick={() => { dispatch({ type: "end-assignment", assignmentId: endId }); setEndId(null); }}>Geçmişi koruyarak sonlandır</button></div></Dialog> : null}
  </div>;
}
