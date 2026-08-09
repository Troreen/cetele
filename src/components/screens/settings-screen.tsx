"use client";

import { Bell, Moon, RotateCcw, Sun } from "lucide-react";
import { SectionHeader } from "../section-header";
import { useCetele } from "@/modules/cetele/store";
import { pushUiState } from "@/modules/cetele/url-state";
import type { Theme } from "@/modules/cetele/types";

const THEME_PREFERENCE_EVENT = "cetele:theme-preference-saved";

export function SettingsScreen() {
  const { state, dispatch, reset, adapter } = useCetele();
  const saveTheme = (theme: Theme) => {
    pushUiState({ theme });
    dispatch({ type: "theme", theme });
    if (adapter === "local") window.dispatchEvent(new Event(THEME_PREFERENCE_EVENT));
  };
  return <div className="workspace settings-workspace"><SectionHeader title="Ayarlar" description="Hatırlatmalar, görünüm ve yerel demo verileri." />
    <section className="settings-section"><div className="settings-heading"><Bell size={20} /><div><h2>Hatırlatmalar</h2><p>Baskı kurmadan, seçtiğin saatte sessiz bir anımsatma.</p></div></div><label className="setting-row"><span><strong>Eksik alışkanlıklar</strong><small>Gün bitmeden kendi kayıtların için.</small></span><input type="time" value={state.reminders.studentTime} onChange={(event) => dispatch({ type: "reminders", key: "studentTime", value: event.target.value })} /><input type="checkbox" checked={state.reminders.studentEnabled} onChange={(event) => dispatch({ type: "reminders", key: "studentEnabled", value: event.target.checked })} aria-label="Öğrenci hatırlatmasını aç" /></label><label className="setting-row"><span><strong>Günlük inceleme</strong><small>Doğrudan öğrencilerin varsa görünür.</small></span><input type="time" value={state.reminders.mentorTime} onChange={(event) => dispatch({ type: "reminders", key: "mentorTime", value: event.target.value })} /><input type="checkbox" checked={state.reminders.mentorEnabled} onChange={(event) => dispatch({ type: "reminders", key: "mentorEnabled", value: event.target.checked })} aria-label="Mentor hatırlatmasını aç" /></label></section>
    <section className="settings-section"><div className="settings-heading"><Moon size={20} /><div><h2>Görünüm</h2><p>Açık ve koyu tema aynı bilgi hiyerarşisini korur.</p></div></div><div className="theme-choices" role="group" aria-label="Renk teması"><button type="button" className={state.theme === "dark" ? "active" : ""} aria-pressed={state.theme === "dark"} onClick={() => saveTheme("dark")}><Moon size={20} /> Koyu</button><button type="button" className={state.theme === "light" ? "active" : ""} aria-pressed={state.theme === "light"} onClick={() => saveTheme("light")}><Sun size={20} /> Açık</button></div></section>
    {adapter === "local" ? <section className="settings-section"><div className="settings-heading"><RotateCcw size={20} /><div><h2>Demo verisi</h2><p>Yerel doğrulama durumunu başlangıç örneğine döndürür.</p></div></div><button className="secondary-button" onClick={reset}>Demo verisini sıfırla</button></section> : null}
  </div>;
}
