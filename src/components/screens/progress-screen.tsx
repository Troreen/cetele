"use client";

import { useState } from "react";
import Link from "next/link";
import { HabitCard } from "../habit-card";
import { SectionHeader } from "../section-header";
import { assignmentsFor, definition } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";

export function ProgressScreen() {
  const { state } = useCetele();
  const [range, setRange] = useState<"week" | "six-months">("week");
  const ended = state.assignments.filter((item) => item.studentId === state.currentUserId && item.status === "ended");
  return <div className="personal-shell"><SectionHeader title="İlerlemem" description="Her alışkanlığın kendi kaydı ve rehberi." /><div className="range-tabs" role="tablist" aria-label="Tarih aralığı"><button className={range === "week" ? "active" : ""} role="tab" aria-selected={range === "week"} onClick={() => setRange("week")}>Hafta</button><button className={range === "six-months" ? "active" : ""} role="tab" aria-selected={range === "six-months"} onClick={() => setRange("six-months")}>6 Ay</button></div><section className={`habit-list ${range === "six-months" ? "six-month-history" : ""}`}>{assignmentsFor(state, state.currentUserId).map((assignment) => <HabitCard key={assignment.id} assignment={assignment} historyCount={range === "week" ? 7 : 182} />)}</section>{ended.length ? <section className="settings-section"><h2>Geçmiş alışkanlıklar</h2>{ended.map((assignment) => <p key={assignment.id}><Link href={`/progress/${assignment.id}`}>{definition(state, assignment.definitionId)?.name}</Link> <span className="status-text calm">Geçmişi korunuyor</span></p>)}</section> : null}</div>;
}
