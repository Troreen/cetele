"use client";

import Link from "next/link";
import { ArrowLeft, Flame, History } from "lucide-react";
import { HabitCard } from "../habit-card";
import { calculateStreaks } from "@/modules/cetele/policy";
import { completionFor, currentWeekDates, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { hrefWithUiState, pushUiState, readHistoryRange, readTheme, useUiSearch } from "@/modules/cetele/url-state";

export function AssignmentDetailScreen({ assignmentId }: { assignmentId: string }) {
  const { state } = useCetele();
  const uiSearch = useUiSearch();
  const range = readHistoryRange(uiSearch) ?? "six-months";
  const urlTheme = readTheme(uiSearch) ?? state.theme;
  const assignment = state.assignments.find((item) => item.id === assignmentId);
  if (!assignment) return <div className="workspace"><p>Kayıt bulunamadı.</p></div>;

  const days = recentDates(state.today, 182);
  const historyDates = range === "week" ? currentWeekDates(state.today) : days;
  const history = days.map((date) => ({
    date,
    state: state.excuses.some((item) => item.studentId === assignment.studentId && item.date === date && (item.assignmentId === null || item.assignmentId === assignment.id))
      ? "excused" as const
      : completionFor(state, assignment.id, date) ? "completed" as const : "missed" as const,
  }));
  const streaks = calculateStreaks(history);

  return <div className="personal-shell detail-workspace">
    <Link href={hrefWithUiState("/progress", uiSearch)} className="back-link"><ArrowLeft size={17} /> İlerlemem</Link>
    <div className="range-tabs detail-range" role="tablist" aria-label="Tarih aralığı">
      <button type="button" role="tab" aria-selected={range === "week"} className={range === "week" ? "active" : ""} onClick={() => pushUiState({ range: "week", theme: urlTheme })}>Hafta</button>
      <button type="button" role="tab" aria-selected={range === "six-months"} className={range === "six-months" ? "active" : ""} onClick={() => pushUiState({ range: "six-months", theme: urlTheme })}>6 Ay</button>
    </div>
    <section className={range === "six-months" ? "six-month-history" : ""} aria-label="Alışkanlık geçmişi">
      <HabitCard assignment={assignment} historyDates={historyDates} />
    </section>
    <section className="history-stats detail-stats" aria-label="Seri özeti">
      <span><Flame size={17} /><strong>{streaks.current}</strong> Güncel seri</span>
      <span><History size={17} /><strong>{streaks.best}</strong> En iyi seri</span>
    </section>
  </div>;
}
