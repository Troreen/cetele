"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarOff, Plus, ShieldCheck } from "lucide-react";
import { Dialog } from "../dialog";
import { HabitCard } from "../habit-card";
import { assignmentsFor, directStudents, person, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { previousDomainDate } from "@/modules/cetele/policy";

export function StudentDetailScreen({ studentId }: { studentId: string }) {
  const { state, dispatch } = useCetele();
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [note, setNote] = useState("");
  const [excuseDate, setExcuseDate] = useState(previousDomainDate(state.today));
  const [excuseScope, setExcuseScope] = useState<string>("all");
  const [endId, setEndId] = useState<string | null>(null);
  const student = person(state, studentId);
  const assignments = assignmentsFor(state, studentId);
  const open = state.attention.find((item) => item.studentId === studentId && item.state === "open");
  const mentoredGroup = directStudents(state, studentId);
  const responsibleMentor = student?.mentorId ? person(state, student.mentorId) : undefined;
  const canManageOrdinary = student?.mentorId === state.currentUserId;
  const endedAssignments = state.assignments.filter((item) => item.studentId === studentId && item.status === "ended");
  if (!student) return <div className="workspace"><p>Öğrenci bulunamadı.</p></div>;
  return <div className="workspace detail-workspace"><Link href="/students" className="back-link"><ArrowLeft size={17} /> Öğrencilerim</Link><header className="student-detail-header"><span className="avatar large">{student.initials}</span><div><h1>{student.name}</h1><p>{student.invitation === "pending" ? "Davet kabulü bekleniyor" : `${assignments.length} etkin alışkanlık · Sorumlu mentor: ${responsibleMentor?.name ?? "—"}`}</p></div><span className={open ? "status-text attention" : "status-text calm"}>{open ? "Dikkat gerekiyor" : "Sorun görünmüyor"}</span><div className="section-actions">{canManageOrdinary ? <button className="secondary-button" onClick={() => setExcuseOpen(true)}><CalendarOff size={17} /> Mazeretli gün</button> : null}<Link href="/library" className="primary-button"><Plus size={17} /> Alışkanlık ata</Link></div></header>
    <section className="detail-layout"><div className="habit-list">{assignments.map((assignment) => <div className="managed-assignment" key={assignment.id}><HabitCard assignment={assignment} />{canManageOrdinary ? <button className="assignment-correction" onClick={() => setEndId(assignment.id)}>Atamayı düzelt / sonlandır</button> : null}</div>)}</div><aside className="student-notes"><h2>Son öğrenci notları</h2>{state.completions.filter((item) => assignments.some((assignment) => assignment.id === item.assignmentId) && item.note).slice(-4).map((item) => <p key={`${item.assignmentId}-${item.date}`} className="student-note">“{item.note}” <small>{item.date}</small></p>)}<div className="privacy-note"><ShieldCheck size={16} /> Öğrenci notları yalnızca öğrenci ve üst mentorları tarafından görülür.</div></aside></section>
    {endedAssignments.length ? <section className="settings-section"><h2>Geçmiş atamalar</h2>{endedAssignments.map((item) => <p key={item.id}>{state.definitions.find((habit) => habit.id === item.definitionId)?.name} <span className="status-text calm">Geçmişi korunuyor</span></p>)}</section> : null}
    {mentoredGroup.length ? <section className="junior-responsibility"><h2>Mentor sorumluluğu</h2><p>{student.name}, {mentoredGroup.length} doğrudan öğrencinin sıradan sorumlusudur. Sen üst mentor olarak inceleme ve takip düzenini görürsün; müdahale ikincil ve atfedilebilirdir.</p><dl><div><dt>Doğrudan grup</dt><dd>{mentoredGroup.length}</dd></div><div><dt>7 günlük inceleme</dt><dd>{state.reviews.filter((item) => item.mentorId === studentId && recentDates(state.today, 7).includes(item.date)).length}/7</dd></div><div><dt>Açık takip</dt><dd>{state.attention.filter((item) => mentoredGroup.some((member) => member.id === item.studentId) && item.state === "open").length}</dd></div></dl><div className="junior-group-list">{mentoredGroup.map((member) => <Link key={member.id} href={`/students/${member.id}`}><span className="avatar small">{member.initials}</span><span>{member.name}<small>Sorumlu mentor: {student.name}</small></span></Link>)}</div></section> : null}
    {excuseOpen ? <Dialog title="Mazeretli gün tanımla" onClose={() => setExcuseOpen(false)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "excuse", studentId, assignmentId: excuseScope === "all" ? null : excuseScope, date: excuseDate, note }); setExcuseOpen(false); }}><label>Tarih<input type="date" value={excuseDate} onChange={(event) => setExcuseDate(event.target.value)} max={state.today} /></label><label>Kapsam<select value={excuseScope} onChange={(event) => setExcuseScope(event.target.value)}><option value="all">Tüm alışkanlıklar</option>{assignments.map((item) => <option key={item.id} value={item.id}>{state.definitions.find((habit) => habit.id === item.definitionId)?.name}</option>)}</select></label><label>Not <span className="optional">İsteğe bağlı</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label><p className="privacy-note">Mazeretli gün tamamlanma oranına girmez; seriyi uzatmaz veya bozmaz.</p><button className="primary-button" type="submit">Mazereti kaydet</button></form></Dialog> : null}
    {endId ? <Dialog title="Atamayı düzelt" onClose={() => setEndId(null)}><div className="form-stack"><p>Hiç kayıt yoksa atama iptal edilir. Kayıt varsa atama sonlandırılır ve bütün geçmiş korunur.</p><button className="primary-button" onClick={() => { dispatch({ type: "end-assignment", assignmentId: endId }); setEndId(null); }}>Geçmişi koruyarak sonlandır</button></div></Dialog> : null}
  </div>;
}
