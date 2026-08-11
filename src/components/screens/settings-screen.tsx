"use client";

import { Bell, Moon, RotateCcw, Sun } from "lucide-react";
import { SectionHeader } from "../section-header";
import { assignmentsFor, definition } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import { pushUiState } from "@/modules/cetele/url-state";
import type { Theme } from "@/modules/cetele/types";

const THEME_PREFERENCE_EVENT = "cetele:theme-preference-saved";

export function SettingsScreen() {
  const { state, dispatch, reset, adapter } = useCetele();
  const assignments = assignmentsFor(state, state.currentUserId);
  const saveTheme = (theme: Theme) => {
    pushUiState({ theme });
    dispatch({ type: "theme", theme });
    if (adapter === "local") window.dispatchEvent(new Event(THEME_PREFERENCE_EVENT));
  };
  return <div className="workspace settings-workspace"><SectionHeader title="Ayarlar" description="Hatırlatmalar, görünüm ve yerel demo verileri." />
    <section className="settings-section"><div className="settings-heading"><Bell size={20} /><div><h2>Hatırlatmalar</h2><p>Her alışkanlık kendi saatinde, baskı kurmadan hatırlatılır.</p></div></div>{assignments.map((assignment) => { const habitName = definition(state, assignment.definitionId)?.name ?? "Alışkanlık"; const reminder = state.reminders.habits[assignment.id] ?? { enabled: false, time: "20:30" }; return <label className="setting-row" key={assignment.id}><span><strong>{habitName}</strong><small>Yalnızca bu alışkanlık eksikse.</small></span><input type="time" value={reminder.time} disabled={!reminder.enabled} onChange={(event) => dispatch({ type: "habit-reminder", assignmentId: assignment.id, enabled: reminder.enabled, time: event.target.value })} aria-label={`${habitName} hatırlatma saati`} /><input type="checkbox" checked={reminder.enabled} onChange={(event) => dispatch({ type: "habit-reminder", assignmentId: assignment.id, enabled: event.target.checked, time: reminder.time })} aria-label={`${habitName} hatırlatıcısını aç`} /></label>; })}<label className="setting-row"><span><strong>Günlük inceleme</strong><small>Doğrudan öğrencilerin varsa görünür.</small></span><input type="time" value={state.reminders.mentorTime} disabled={!state.reminders.mentorEnabled} onChange={(event) => dispatch({ type: "mentor-reminder", enabled: state.reminders.mentorEnabled, time: event.target.value })} /><input type="checkbox" checked={state.reminders.mentorEnabled} onChange={(event) => dispatch({ type: "mentor-reminder", enabled: event.target.checked, time: state.reminders.mentorTime })} aria-label="Mentor hatırlatmasını aç" /></label></section>
    <section className="settings-section"><div className="settings-heading"><Moon size={20} /><div><h2>Görünüm</h2><p>Tema ve Bugün içindeki altı aylık görünümün etiketleri.</p></div></div><div className="theme-choices" role="group" aria-label="Renk teması"><button type="button" className={state.theme === "dark" ? "active" : ""} aria-pressed={state.theme === "dark"} onClick={() => saveTheme("dark")}><Moon size={20} /> Koyu</button><button type="button" className={state.theme === "light" ? "active" : ""} aria-pressed={state.theme === "light"} onClick={() => saveTheme("light")}><Sun size={20} /> Açık</button></div><div className="appearance-settings"><label className="setting-row"><span><strong>Ay etiketleri</strong><small>Altı aylık ızgaranın üstünde ayları gösterir.</small></span><input type="checkbox" checked={state.viewPreferences.showMonthLabels} onChange={(event) => dispatch({ type: "view-preferences", showMonthLabels: event.target.checked, showDayLabels: state.viewPreferences.showDayLabels })} aria-label="Ay etiketlerini göster" /></label><label className="setting-row"><span><strong>Gün etiketleri</strong><small>Haftanın günlerini ızgaranın solunda gösterir.</small></span><input type="checkbox" checked={state.viewPreferences.showDayLabels} onChange={(event) => dispatch({ type: "view-preferences", showMonthLabels: state.viewPreferences.showMonthLabels, showDayLabels: event.target.checked })} aria-label="Gün etiketlerini göster" /></label></div></section>
    {adapter === "local" ? <section className="settings-section"><div className="settings-heading"><RotateCcw size={20} /><div><h2>Demo verisi</h2><p>Yerel doğrulama durumunu başlangıç örneğine döndürür.</p></div></div><button className="secondary-button" onClick={reset}>Demo verisini sıfırla</button></section> : null}
  </div>;
}
