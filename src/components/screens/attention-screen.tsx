"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Clock3, Eye, ShieldCheck } from "lucide-react";
import { Dialog } from "../dialog";
import { SectionHeader } from "../section-header";
import { definition, person } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { hrefWithUiState, useUiSearch } from "@/modules/cetele/url-state";

export function AttentionScreen() {
  const { state, dispatch } = useCetele();
  const uiSearch = useUiSearch();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const items = state.attention.filter((item) => item.state !== "invalidated");
  return <div className="workspace narrow-workspace"><SectionHeader title="Dikkat" description="Geçmişteki boşluğu sakin ve sorumlu bir takiple ele al." />
    <div className="attention-summary"><Eye size={22} /><div><strong>{items.filter((item) => item.state === "open").length} açık takip</strong><p>Günlük incelemeden ayrıdır; yalnızca gerçek takip yapıldığında kapat.</p></div></div>
    <section className="attention-list">{items.map((item) => {
      const student = person(state, item.studentId);
      const assignment = state.assignments.find((entry) => entry.id === item.assignmentId);
      const habit = assignment ? definition(state, assignment.definitionId) : undefined;
      const otherHabits = (item.contributingAssignmentIds ?? []).filter((id) => id !== item.assignmentId).map((id) => state.assignments.find((entry) => entry.id === id)).map((entry) => entry ? definition(state, entry.definitionId)?.name : undefined).filter(Boolean);
      const actor = item.followedUpBy ? person(state, item.followedUpBy) : undefined;
      return <article className="attention-item" key={item.id}><span className="avatar">{student?.initials}</span><div className="attention-copy"><div className="attention-title"><h2>{student?.name}</h2><span className={item.state === "open" ? "status-text attention" : "status-text calm"}>{item.state === "open" ? <><Clock3 size={15} /> Takip bekliyor</> : <><Check size={15} /> Takip edildi</>}</span></div><p><strong>{habit?.name}</strong> · {item.triggerDates.map((date) => `${Number(date.slice(-2))} Ağustos`).join(" ve ")} kaydı yok.{otherHabits.length ? ` Aynı dönemde ayrıca: ${otherHabits.join(", ")}.` : ""}</p><small>Sorumlu mentor: {person(state, item.responsibleMentorId)?.name}</small>{item.privateNote ? <div className="private-note"><ShieldCheck size={15} /><span><strong>Özel takip notu</strong>{item.privateNote}<small>{actor?.name} tarafından kaydedildi.</small></span></div> : null}</div><div className="attention-actions">{item.state === "open" ? <button className="primary-button" onClick={() => setActiveId(item.id)}>Takip edildi</button> : null}<Link href={hrefWithUiState(`/students/${item.studentId}`, uiSearch)} className="icon-button" aria-label={`${student?.name} kaydını aç`}><ChevronRight size={20} /></Link></div></article>;
    })}</section>
    {activeId ? <Dialog title="Takibi kaydet" onClose={() => setActiveId(null)}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "follow-up", attentionId: activeId, note }); setActiveId(null); setNote(""); }}><p>Uygulama dışında yaptığın görüşmeyi ayrı ve atfedilebilir bir kayıt olarak işaretle.</p><label>Özel not <span className="optional">İsteğe bağlı</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} /></label><p className="privacy-note"><ShieldCheck size={16} /> Bu not yalnızca doğrudan mentorun takip kaydında görünür. Öğrenci göremez.</p><button className="primary-button" type="submit">Takip edildi olarak kaydet</button></form></Dialog> : null}
  </div>;
}
