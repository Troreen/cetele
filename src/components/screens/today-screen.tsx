"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Eye } from "lucide-react";
import { HabitCard } from "../habit-card";
import { SectionHeader } from "../section-header";
import { assignmentsFor, completionFor, directStudents } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";

export function TodayScreen() {
  const { state } = useCetele();
  const assignments = assignmentsFor(state, state.currentUserId);
  const incompleteCount = assignments.filter((assignment) => !completionFor(state, assignment.id, state.today)).length;
  const [reminderDue, setReminderDue] = useState(false);
  const [mentorReminderDue, setMentorReminderDue] = useState(false);
  useEffect(() => {
    const update = () => {
      const [hour, minute] = state.reminders.studentTime.split(":").map(Number);
      const now = new Date();
      setReminderDue(state.reminders.studentEnabled && incompleteCount > 0 && now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute);
      const [mentorHour, mentorMinute] = state.reminders.mentorTime.split(":").map(Number);
      setMentorReminderDue(state.reminders.mentorEnabled && now.getHours() * 60 + now.getMinutes() >= mentorHour * 60 + mentorMinute);
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [incompleteCount, state.reminders.mentorEnabled, state.reminders.mentorTime, state.reminders.studentEnabled, state.reminders.studentTime]);
  const open = state.attention.filter((item) => item.state === "open" && item.responsibleMentorId === state.currentUserId).length;
  const reviewed = state.reviews.some((item) => item.mentorId === state.currentUserId && item.date === state.today);
  const hasStudents = directStudents(state).length > 0;
  return <div className="personal-shell">
    <SectionHeader title="Bugün" description="Kendi çetelen, kendi ritmin." />
    {state.reminders.studentEnabled ? <p className="privacy-note" role={reminderDue ? "status" : undefined}><Check size={16} /> {reminderDue ? `${incompleteCount} eksik günlük kayıt seni bekliyor.` : `Uygulama içi hatırlatma ${state.reminders.studentTime} için ayarlı.`}</p> : null}
    <section className="habit-list" aria-label="Bugünkü alışkanlıklar">{assignments.map((assignment) => <HabitCard key={assignment.id} assignment={assignment} />)}</section>
    {hasStudents ? <section className="mentor-responsibility"><span className="responsibility-icon"><Eye size={21} /></span><div><h2>Mentorluk</h2><p>{reviewed ? "Bugünkü inceleme tamamlandı." : mentorReminderDue ? "Günlük inceleme hatırlatması: doğrudan grubunu gözden geçir." : open ? `${open} öğrenci için takip gerekiyor.` : `İnceleme hatırlatması ${state.reminders.mentorTime} için ayarlı.`}</p></div><span className="responsibility-status">{reviewed ? <><Check size={16} /> İncelendi</> : "Bekliyor"}</span><Link href="/students" className="secondary-button">Öğrencileri gözden geçir <ArrowRight size={17} /></Link></section> : null}
  </div>;
}
