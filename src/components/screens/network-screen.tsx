"use client";

import { ChevronRight, Network, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "../section-header";
import { directStudents, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";

export function NetworkScreen() {
  const { state } = useCetele();
  const mentors = directStudents(state).filter((student) => directStudents(state, student.id).length > 0);
  return <div className="workspace"><SectionHeader title="Ağ" description="Doğrudan sorumluluk yerinde kalır; görünürlük yukarı doğru akar." />
    <div className="branch-summary"><Network size={24} /><div><h2>{state.people.find((item) => item.id === state.currentUserId)?.groupName} kolu</h2><p>{state.people.filter((item) => item.mentorId).length} kişi · {mentors.length} junior mentor</p></div><dl><div><dt>Açık takip</dt><dd>{state.attention.filter((item) => item.state === "open").length}</dd></div><div><dt>Bugün incelenen grup</dt><dd>{state.reviews.filter((item) => item.date === state.today).length}</dd></div></dl></div>
    <section className="mentor-ledger"><header><span>Mentor</span><span>Doğrudan grup</span><span>İnceleme düzeni</span><span>Açık takip</span><span /></header>{mentors.map((mentor) => {
      const group = directStudents(state, mentor.id);
      const reviewDays = state.reviews.filter((item) => item.mentorId === mentor.id && recentDates(state.today, 7).includes(item.date)).length;
      const open = state.attention.filter((item) => group.some((student) => student.id === item.studentId) && item.state === "open").length;
      return <article key={mentor.id}><span className="avatar">{mentor.initials}</span><div><h2>{mentor.name}</h2><p>{mentor.groupName ?? "Adsız grup"}</p></div><span><UsersRound size={17} /> {group.length} öğrenci</span><span>{reviewDays}/7 gün</span><span>{open} takip</span><Link href={`/students/${mentor.id}`} className="icon-button" aria-label={`${mentor.name} sorumluluğunu incele`}><ChevronRight size={19} /></Link></article>;
    })}</section><p className="intervention-note"><ShieldCheck size={17} /> Alt grupta yapılacak her istisnai işlem, sorumlu mentor ve müdahale eden kişiyle birlikte kaydedilir.</p>
  </div>;
}
