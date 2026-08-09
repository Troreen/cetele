"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Flame, History } from "lucide-react";
import { HabitCard } from "../habit-card";
import { calculateStreaks } from "@/modules/cetele/policy";
import { completionFor } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";

export function AssignmentDetailScreen({ assignmentId }: { assignmentId: string }) {
  const { state } = useCetele();
  const [range, setRange] = useState<"week" | "six-months">("six-months");
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) return <div className="workspace"><p>Kayıt bulunamadı.</p></div>;

  const days = Array.from({ length: 182 }, (_, index) => {
    const date = new Date(`${state.today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (181 - index));
    return date.toISOString().slice(0, 10);
  });
  const history = days.map((date) => ({
    date,
    state: state.excuses.some((item) => item.studentId === assignment.studentId && item.date === date && (item.assignmentId === null || item.assignmentId === assignment.id))
      ? "excused" as const
      : completionFor(state, assignment.id, date) ? "completed" as const : "missed" as const,
  }));
  const streaks = calculateStreaks(history);

  return <div className="personal-shell detail-workspace">
    <Link href="/progress" className="back-link"><ArrowLeft size={17} /> İlerlemem</Link>
    <div className="range-tabs detail-range" role="tablist" aria-label="Tarih aralığı">
      <button type="button" role="tab" aria-selected={range === "week"} className={range === "week" ? "active" : ""} onClick={() => setRange("week")}>Hafta</button>
      <button type="button" role="tab" aria-selected={range === "six-months"} className={range === "six-months" ? "active" : ""} onClick={() => setRange("six-months")}>6 Ay</button>
    </div>
    <section className={range === "six-months" ? "six-month-history" : ""} aria-label="Alışkanlık geçmişi">
      <HabitCard assignment={assignment} historyCount={range === "week" ? 7 : 182} />
    </section>
    <section className="history-stats detail-stats" aria-label="Seri özeti">
      <span><Flame size={17} /><strong>{streaks.current}</strong> Güncel seri</span>
      <span><History size={17} /><strong>{streaks.best}</strong> En iyi seri</span>
    </section>
  </div>;
}
