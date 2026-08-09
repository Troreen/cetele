"use client";

import { ChevronRight, Network, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "../section-header";
import { aggregateCompletionRatio, branchStudents, directStudents, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { hrefWithUiState, useUiSearch } from "@/modules/cetele/url-state";

function aggregateLabel(ratio: { done: number; total: number }) {
  return ratio.total ? `%${Math.round(ratio.done / ratio.total * 100)}` : "Kayıt yok";
}

export function NetworkScreen() {
  const { state } = useCetele();
  const uiSearch = useUiSearch();
  const mentors = directStudents(state).filter((student) => directStudents(state, student.id).length > 0);
  const directGroup = directStudents(state).filter((student) => student.invitation === "active");
  const branch = branchStudents(state).filter((student) => student.invitation === "active");
  const groupCompletion = aggregateCompletionRatio(state, directGroup.map((student) => student.id));
  const branchCompletion = aggregateCompletionRatio(state, branch.map((student) => student.id));
  return <div className="workspace"><SectionHeader title="Ağ" description="Doğrudan sorumluluk yerinde kalır; görünürlük yukarı doğru akar." />
    <div className="branch-summary"><Network size={24} /><div><h2>{state.people.find((item) => item.id === state.currentUserId)?.groupName} kolu</h2><p>{branch.length} kişi · {mentors.length} junior mentor</p></div><dl aria-label="Bugünkü grup ve kol özeti"><div><dt>Doğrudan grup</dt><dd>{aggregateLabel(groupCompletion)}</dd></div><div><dt>Tüm kol</dt><dd>{aggregateLabel(branchCompletion)}</dd></div><div><dt>Açık takip</dt><dd>{state.attention.filter((item) => item.state === "open").length}</dd></div><div><dt>İncelenen grup</dt><dd>{state.reviews.filter((item) => item.date === state.today).length}</dd></div></dl></div>
    <section className="mentor-ledger"><header><span>Mentor</span><span>Doğrudan grup</span><span>İnceleme düzeni</span><span>Açık takip</span><span /></header>{mentors.map((mentor) => {
      const group = directStudents(state, mentor.id);
      const reviewDays = state.reviews.filter((item) => item.mentorId === mentor.id && recentDates(state.today, 7).includes(item.date)).length;
      const open = state.attention.filter((item) => group.some((student) => student.id === item.studentId) && item.state === "open").length;
      return <article key={mentor.id}><span className="avatar">{mentor.initials}</span><div><h2>{mentor.name}</h2><p>{mentor.groupName ?? "Adsız grup"}</p></div><span><UsersRound size={17} /> {group.length} öğrenci</span><span>{reviewDays}/7 gün</span><span>{open} takip</span><Link href={hrefWithUiState(`/students/${mentor.id}`, uiSearch)} className="icon-button" aria-label={`${mentor.name} sorumluluğunu incele`}><ChevronRight size={19} /></Link></article>;
    })}</section><p className="intervention-note"><ShieldCheck size={17} /> Alt grupta yapılacak her istisnai işlem, sorumlu mentor ve müdahale eden kişiyle birlikte kaydedilir.</p>
  </div>;
}
