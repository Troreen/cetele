"use client";

import Link from "next/link";
import { ArrowLeft, Flame, History } from "lucide-react";
import { HabitCard } from "../habit-card";
import { calculateStreaks } from "@/modules/cetele/policy";
import { completionFor, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { hrefWithUiState, readTheme, useUiSearch } from "@/modules/cetele/url-state";

export function AssignmentDetailScreen({ assignmentId }: { assignmentId: string }) {
  const { state } = useCetele();
  const uiSearch = useUiSearch();
  const urlTheme = readTheme(uiSearch) ?? state.theme;
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) return <div className="workspace"><p>Kayıt bulunamadı.</p></div>;

  const days = recentDates(state.today, 182);
  const history = days.map((date) => ({
    date,
    state: state.excuses.some((item) => item.studentId === assignment.studentId && item.date === date && (item.assignmentId === null || item.assignmentId === assignment.id))
      ? "excused" as const
      : completionFor(state, assignment.id, date) ? "completed" as const : "missed" as const,
  })).filter((day) => day.date !== state.today || day.state !== "missed");
  const streaks = calculateStreaks(history);

  return <div className="personal-shell detail-workspace">
    <Link href={hrefWithUiState("/today", new URLSearchParams({ theme: urlTheme, range: "six-months" }).toString())} className="back-link"><ArrowLeft size={17} /> Bugün</Link>
    <section className="six-month-history" aria-label="Alışkanlık geçmişi">
      <HabitCard assignment={assignment} historyDates={days} historyLabels={state.viewPreferences} />
    </section>
    <section className="history-stats detail-stats" aria-label="Seri özeti">
      <span><Flame size={17} /><strong>{streaks.current}</strong> Güncel seri</span>
      <span><History size={17} /><strong>{streaks.best}</strong> En iyi seri</span>
    </section>
  </div>;
}
