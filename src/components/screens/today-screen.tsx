"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Eye, LayoutGrid, ListChecks } from "lucide-react";
import { HabitCard } from "../habit-card";
import { calculateStreaks } from "@/modules/cetele/policy";
import { assignmentsFor, completionFor, definition, directStudents, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { hrefWithUiState, pushUiState, readHistoryRange, readTheme, useUiSearch } from "@/modules/cetele/url-state";

const weekDayFormatter = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" });

export function TodayScreen() {
  const { state } = useCetele();
  const uiSearch = useUiSearch();
  const assignments = assignmentsFor(state, state.currentUserId);
  const range = readHistoryRange(uiSearch) ?? "week";
  const historyDates = recentDates(state.today, range === "week" ? 7 : 182);
  const urlTheme = readTheme(uiSearch) ?? state.theme;
  const configuredHabitReminders = assignments.flatMap((assignment) => {
    const reminder = state.reminders.habits[assignment.id];
    return reminder?.enabled ? [{ assignmentId: assignment.id, time: reminder.time }] : [];
  });
  const reminderFingerprint = configuredHabitReminders.map((item) => `${item.time};${completionFor(state, item.assignmentId, state.today) ? "1" : "0"}`).join("|");
  const [dueHabitReminderCount, setDueHabitReminderCount] = useState(0);
  const [mentorReminderDue, setMentorReminderDue] = useState(false);
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      const scheduledReminders = reminderFingerprint ? reminderFingerprint.split("|").map((entry) => {
        const [time, completed] = entry.split(";");
        return { time, completed: completed === "1" };
      }) : [];
      setDueHabitReminderCount(scheduledReminders.filter(({ time, completed }) => {
        const [hour, minute] = time.split(":").map(Number);
        return !completed && currentMinute >= hour * 60 + minute;
      }).length);
      const [mentorHour, mentorMinute] = state.reminders.mentorTime.split(":").map(Number);
      setMentorReminderDue(state.reminders.mentorEnabled && now.getHours() * 60 + now.getMinutes() >= mentorHour * 60 + mentorMinute);
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [reminderFingerprint, state.reminders.mentorEnabled, state.reminders.mentorTime, state.today]);
  const open = state.attention.filter((item) => item.state === "open" && item.responsibleMentorId === state.currentUserId).length;
  const reviewed = state.reviews.some((item) => item.mentorId === state.currentUserId && item.date === state.today);
  const hasStudents = directStudents(state).length > 0;
  const streakDates = recentDates(state.today, 182);
  const ended = state.assignments.filter((item) => item.studentId === state.currentUserId && item.status === "ended");
  const themeSearch = new URLSearchParams({ theme: urlTheme }).toString();
  return <div className="personal-shell today-shell">
    {configuredHabitReminders.length ? <p className="privacy-note" role={dueHabitReminderCount ? "status" : undefined}><Check size={16} /> {dueHabitReminderCount ? `${dueHabitReminderCount} alışkanlık hatırlatıcısı seni bekliyor.` : `${configuredHabitReminders.length} alışkanlık için hatırlatıcı açık.`}</p> : null}
    {range === "week" ? <div className="compact-week-header"><span className="compact-week-label">Son 7 gün</span><div className="week-date-guide" aria-label="Son yedi gün">{historyDates.map((date) => <span key={date}><small>{weekDayFormatter.format(new Date(`${date}T12:00:00Z`))}</small><strong>{Number(date.slice(-2))}</strong></span>)}</div></div> : null}
    <section className={`habit-list ${range === "six-months" ? "six-month-history" : ""}`} aria-label="Bugünkü alışkanlıklar">{assignments.map((assignment) => {
      const streaks = calculateStreaks(streakDates.map((date) => ({
        date,
        state: state.excuses.some((item) => item.studentId === assignment.studentId && item.date === date && (item.assignmentId === null || item.assignmentId === assignment.id))
          ? "excused" as const
          : completionFor(state, assignment.id, date) ? "completed" as const : "missed" as const,
      })).filter((day) => day.date !== state.today || day.state !== "missed"));
      return <HabitCard key={assignment.id} assignment={assignment} compact={range === "week"} compactList={range === "week"} historyDates={historyDates} historyLabels={range === "six-months" ? state.viewPreferences : undefined} historyInsights={{ ...streaks, href: hrefWithUiState(`/progress/${assignment.id}`, themeSearch) }} />;
    })}</section>
    {hasStudents ? <section className="mentor-responsibility"><span className="responsibility-icon"><Eye size={21} /></span><div><h2>Mentorluk</h2><p>{reviewed ? "Bugünkü inceleme tamamlandı." : mentorReminderDue ? "Günlük inceleme hatırlatması: doğrudan grubunu gözden geçir." : open ? `${open} öğrenci için takip gerekiyor.` : `İnceleme hatırlatması ${state.reminders.mentorTime} için ayarlı.`}</p></div><span className="responsibility-status">{reviewed ? <><Check size={16} /> İncelendi</> : "Bekliyor"}</span><Link href={hrefWithUiState("/students", uiSearch)} className="secondary-button">Öğrencileri gözden geçir <ArrowRight size={17} /></Link></section> : null}
    {ended.length ? <section className="settings-section ended-history"><h2>Geçmiş alışkanlıklar</h2>{ended.map((assignment) => <p key={assignment.id}><Link href={hrefWithUiState(`/progress/${assignment.id}`, themeSearch)}>{definition(state, assignment.definitionId)?.name}</Link> <span className="status-text calm">Geçmişi korunuyor</span></p>)}</section> : null}
    <div className="home-view-switch" role="tablist" aria-label="Ana sayfa görünümü">
      <button type="button" role="tab" aria-label="Hafta görünümü" title="Hafta görünümü" aria-selected={range === "week"} className={range === "week" ? "active" : ""} onClick={() => pushUiState({ range: "week", theme: urlTheme })}><ListChecks size={23} aria-hidden="true" /></button>
      <button type="button" role="tab" aria-label="6 aylık görünüm" title="6 aylık görünüm" aria-selected={range === "six-months"} className={range === "six-months" ? "active" : ""} onClick={() => pushUiState({ range: "six-months", theme: urlTheme })}><LayoutGrid size={22} aria-hidden="true" /></button>
    </div>
  </div>;
}
