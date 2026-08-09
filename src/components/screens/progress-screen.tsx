"use client";

import Link from "next/link";
import { HabitCard } from "../habit-card";
import { SectionHeader } from "../section-header";
import { assignmentsFor, currentWeekDates, definition, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { hrefWithUiState, pushUiState, readHistoryRange, readTheme, useUiSearch } from "@/modules/cetele/url-state";

export function ProgressScreen() {
  const { state } = useCetele();
  const uiSearch = useUiSearch();
  const range = readHistoryRange(uiSearch) ?? "week";
  const historyDates = range === "week" ? currentWeekDates(state.today) : recentDates(state.today, 182);
  const ended = state.assignments.filter((item) => item.studentId === state.currentUserId && item.status === "ended");
  const urlTheme = readTheme(uiSearch) ?? state.theme;
  return <div className="personal-shell"><SectionHeader title="İlerlemem" description="Her alışkanlığın kendi kaydı ve rehberi." /><div className="range-tabs" role="tablist" aria-label="Tarih aralığı"><button className={range === "week" ? "active" : ""} role="tab" aria-selected={range === "week"} onClick={() => pushUiState({ range: "week", theme: urlTheme })}>Hafta</button><button className={range === "six-months" ? "active" : ""} role="tab" aria-selected={range === "six-months"} onClick={() => pushUiState({ range: "six-months", theme: urlTheme })}>6 Ay</button></div><section className={`habit-list ${range === "six-months" ? "six-month-history" : ""}`}>{assignmentsFor(state, state.currentUserId).map((assignment) => <HabitCard key={assignment.id} assignment={assignment} historyDates={historyDates} />)}</section>{ended.length ? <section className="settings-section"><h2>Geçmiş alışkanlıklar</h2>{ended.map((assignment) => <p key={assignment.id}><Link href={hrefWithUiState(`/progress/${assignment.id}`, uiSearch)}>{definition(state, assignment.definitionId)?.name}</Link> <span className="status-text calm">Geçmişi korunuyor</span></p>)}</section> : null}</div>;
}
