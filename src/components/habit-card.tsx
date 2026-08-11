"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Flame,
  GripVertical,
  History,
  Info,
  Layers3,
  Palette,
  RotateCcw,
} from "lucide-react";
import { Dialog } from "./dialog";
import { habitIcons } from "./icons";
import { canEditCompletion, previousDomainDate } from "@/modules/cetele/policy";
import { assignmentsFor, completionFor, definition, recentDates } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import type { Assignment } from "@/modules/cetele/types";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long", timeZone: "UTC" });
const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "UTC" });
const accentChoices = ["#55a7ff", "#f164ef", "#3ed68b", "#ff913f"];
const dayMarkers = [{ row: 2, label: "Sal" }, { row: 4, label: "Per" }, { row: 6, label: "Cmt" }];

type Panel = "info" | "menu" | "value" | "edit" | "reorder" | "note" | "reminder" | null;

type HistoryInsights = {
  href: React.ComponentProps<typeof Link>["href"];
  current: number;
  best: number;
};

type HistoryLabels = { showMonthLabels: boolean; showDayLabels: boolean };

function calendarLayout(dates: string[]) {
  if (!dates.length) return { weeks: 1, cells: [], months: [] };
  const first = new Date(`${dates[0]}T12:00:00Z`);
  const firstMonday = new Date(first);
  firstMonday.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const cells = dates.map((date) => {
    const value = new Date(`${date}T12:00:00Z`);
    const dayOffset = Math.round((value.getTime() - firstMonday.getTime()) / 86_400_000);
    return { column: Math.floor(dayOffset / 7) + 1, row: (value.getUTCDay() + 6) % 7 + 1 };
  });
  const months = dates.flatMap((date, index) => index === 0 || date.slice(0, 7) !== dates[index - 1].slice(0, 7)
    ? [{ column: cells[index].column, label: monthFormatter.format(new Date(`${date}T12:00:00Z`)) }]
    : []);
  return { weeks: cells.at(-1)?.column ?? 1, cells, months };
}

function dateLabel(date: string) {
  return dateFormatter.format(new Date(`${date}T12:00:00Z`));
}

export function EvidenceStrip({ assignment, count = 7, dates, onEditDate, calendar = false }: { assignment: Assignment; count?: number; dates?: string[]; onEditDate?: (date: string) => void; calendar?: boolean }) {
  const { state } = useCetele();
  const habit = definition(state, assignment.definitionId);
  const evidenceDates = dates ?? recentDates(state.today, count);
  const summary = dates ? `${evidenceDates.length} günlük görünüm` : `son ${count} gün`;
  const layout = calendarLayout(evidenceDates);
  return <div className={clsx("evidence-strip", calendar && "calendar-evidence-strip")} style={calendar ? { "--history-weeks": layout.weeks } as React.CSSProperties : undefined} aria-label={`${habit?.name ?? "Alışkanlık"}: ${summary}`}>
    {evidenceDates.map((date, index) => {
      const completion = completionFor(state, assignment.id, date);
      const excused = state.excuses.some((item) => item.date === date && item.studentId === assignment.studentId && (item.assignmentId === null || item.assignmentId === assignment.id));
      const retrospective = completion?.retrospective;
      const beforeAssignment = date < (assignment.startedOn ?? state.today);
      const afterAssignment = Boolean(assignment.endedOn && date > assignment.endedOn);
      const unavailable = beforeAssignment || afterAssignment;
      const editable = Boolean(onEditDate) && canEditCompletion(date, state.today) && !excused && !unavailable;
      const status = beforeAssignment ? "henüz atanmamıştı" : afterAssignment ? "atama sona ermişti" : excused ? "mazeretli" : completion ? retrospective ? "geriye dönük tamamlandı" : "tamamlandı" : date === state.today ? "bugün bekliyor" : date > state.today ? "henüz gelmedi" : "tamamlanmadı";
      const className = clsx("evidence-cell", !unavailable && completion && "done", !unavailable && excused && "excused", !unavailable && retrospective && "retrospective", unavailable && "unavailable", date === state.today && "today", editable && "editable");
      const label = `${dateLabel(date)}: ${status}${editable ? ". Değiştirmek için bas." : ""}`;
      const style = { "--accent": assignment.accent, ...(calendar ? { gridColumn: layout.cells[index].column, gridRow: layout.cells[index].row } : {}) } as React.CSSProperties;
      return editable
        ? <button type="button" key={date} className={className} style={style} aria-label={label} aria-pressed={Boolean(completion)} onClick={() => onEditDate?.(date)} />
        : <span key={date} className={className} style={style}><span className="sr-only">{label}</span></span>;
    })}
  </div>;
}

function CalendarHistory({ assignment, dates, onEditDate, labels }: { assignment: Assignment; dates: string[]; onEditDate?: (date: string) => void; labels: HistoryLabels }) {
  const layout = calendarLayout(dates);
  const columns = { "--history-weeks": layout.weeks } as React.CSSProperties;
  return <div className={clsx("calendar-history", !labels.showDayLabels && "without-day-labels")}>
    {labels.showMonthLabels ? <div className="calendar-month-labels" style={columns} aria-label="Ay etiketleri">{layout.months.map((month, index) => <span key={`${month.label}-${index}`} style={{ gridColumn: month.column }}>{month.label}</span>)}</div> : null}
    {labels.showDayLabels ? <div className="calendar-day-labels" aria-label="Gün etiketleri">{dayMarkers.map((day) => <span key={day.row} style={{ gridRow: day.row }}>{day.label}</span>)}</div> : null}
    <EvidenceStrip assignment={assignment} dates={dates} onEditDate={onEditDate} calendar />
  </div>;
}

export function HabitCard({ assignment, compact = false, compactList = false, historyCount, historyDates, historyInsights, historyLabels, showCompletionAction = true }: { assignment: Assignment; compact?: boolean; compactList?: boolean; historyCount?: number; historyDates?: string[]; historyInsights?: HistoryInsights; historyLabels?: HistoryLabels; showCompletionAction?: boolean }) {
  const { state, dispatch } = useCetele();
  const habit = definition(state, assignment.definitionId);
  const editable = assignment.studentId === state.currentUserId && assignment.status === "active";
  const todayCompletion = completionFor(state, assignment.id, state.today);
  const endedStatusLabel = assignment.status === "ended" && assignment.endedOn && assignment.endedOn < state.today
    ? `${habit?.name ?? "Alışkanlık"}: atama ${dateLabel(assignment.endedOn)} tarihinde sona erdi`
    : null;
  const yesterday = previousDomainDate(state.today);
  const yesterdayCompletion = completionFor(state, assignment.id, yesterday);
  const [panel, setPanel] = useState<Panel>(null);
  const [valueDate, setValueDate] = useState(state.today);
  const [amount, setAmount] = useState(assignment.target ?? 1);
  const [amountError, setAmountError] = useState(false);
  const [note, setNote] = useState("");
  const [editIcon, setEditIcon] = useState(assignment.icon);
  const [editAccent, setEditAccent] = useState(assignment.accent);
  const savedReminder = state.reminders.habits[assignment.id] ?? { enabled: false, time: "20:30" };
  const [reminderEnabled, setReminderEnabled] = useState(savedReminder.enabled);
  const [reminderTime, setReminderTime] = useState(savedReminder.time);
  const longPressTimer = useRef<number | null>(null);

  if (!habit) return null;
  const Icon = habitIcons[assignment.icon];
  const progress = habit.mode === "quantitative" && assignment.target
    ? Math.min(100, ((todayCompletion?.amount ?? 0) / assignment.target) * 100)
    : todayCompletion ? 100 : 0;

  const openValuePanel = (date: string) => {
    const current = completionFor(state, assignment.id, date);
    setValueDate(date);
    setAmount(current?.amount ?? assignment.target ?? 1);
    setAmountError(false);
    setNote(current?.note ?? "");
    setPanel("value");
  };

  const toggleDate = (date: string) => {
    const current = completionFor(state, assignment.id, date);
    if (habit.mode === "quantitative") {
      openValuePanel(date);
      return;
    }
    if (current) dispatch({ type: "remove-completion", assignmentId: assignment.id, date });
    else dispatch({ type: "record-completion", assignmentId: assignment.id, date, amount: null, note: "" });
  };

  const stopLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const startLongPress = (event: React.PointerEvent<HTMLElement>) => {
    if (!editable || event.button !== 0 || (event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    stopLongPress();
    longPressTimer.current = window.setTimeout(() => setPanel("menu"), 520);
  };

  const openEditPanel = () => {
    setEditIcon(assignment.icon);
    setEditAccent(assignment.accent);
    setPanel("edit");
  };

  const openReminderPanel = () => {
    const reminder = state.reminders.habits[assignment.id] ?? { enabled: false, time: "20:30" };
    setReminderEnabled(reminder.enabled);
    setReminderTime(reminder.time);
    setPanel("reminder");
  };

  const moveAssignment = (assignmentId: string, direction: -1 | 1) => {
    const ordered = assignmentsFor(state, state.currentUserId).map((item) => item.id);
    const index = ordered.indexOf(assignmentId);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= ordered.length) return;
    [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
    dispatch({ type: "reorder-assignments", orderedIds: ordered });
  };

  const openTodayNote = () => {
    setNote(todayCompletion?.note ?? "");
    setPanel("note");
  };

  return <>
    <article
      className={clsx("habit-card", compact && "compact", compactList && "compact-list-row", !showCompletionAction && "without-completion-action")}
      style={{ "--accent": assignment.accent } as React.CSSProperties}
      onPointerDown={startLongPress}
      onPointerUp={stopLongPress}
      onPointerCancel={stopLongPress}
      onPointerLeave={stopLongPress}
      onContextMenu={(event) => { if (editable) { event.preventDefault(); setPanel("menu"); } }}
      onKeyDown={(event) => { if (editable && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) { event.preventDefault(); setPanel("menu"); } }}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? `${habit.name} kartı. Seçenekler için basılı tut veya Shift+F10 tuşlarına bas.` : undefined}
    >
      {compactList ? <>
        <span className="habit-icon" aria-hidden="true"><Icon size={21} /></span>
        <div className="habit-copy"><h2>{habit.name}</h2></div>
        <div className="habit-evidence"><EvidenceStrip assignment={assignment} count={historyCount ?? 7} dates={historyDates} onEditDate={editable ? toggleDate : undefined} /></div>
      </> : <>
      <div className="habit-heading">
        <span className="habit-icon" aria-hidden="true"><Icon size={23} /></span>
        <div className="habit-copy"><h2>{habit.name}</h2><p>{habit.description}</p></div>
        <div className="habit-utility-actions">
          <button type="button" className="habit-utility" onClick={() => setPanel("info")} aria-label={`${habit.name} bilgileri`}><Info size={18} /></button>
        </div>
        {showCompletionAction ? endedStatusLabel
          ? <span className="completion-action read-only" aria-label={endedStatusLabel}><History size={22} aria-hidden="true" /></span>
          : !editable
          ? <span className={clsx("completion-action", "read-only", todayCompletion && "complete")} aria-label={`${habit.name}: ${todayCompletion ? "bugün tamamlandı" : "bugün bekliyor"}`}>{todayCompletion ? <Check size={26} /> : <span aria-hidden="true">—</span>}</span>
          : <button
              type="button"
              className={clsx("completion-action", todayCompletion && "complete", habit.mode === "quantitative" && "quantitative")}
              style={{ "--completion-progress": `${progress}%` } as React.CSSProperties}
              aria-pressed={Boolean(todayCompletion)}
              onClick={() => toggleDate(state.today)}
              aria-label={habit.mode === "quantitative"
                ? `${habit.name}: bugün ${todayCompletion?.amount ?? 0} / ${assignment.target ?? 0}. Miktar gir`
                : `${habit.name}: ${todayCompletion ? "bugünkü tamamlamayı kaldır" : "bugün tamamlandı olarak işaretle"}`}
            >
              {habit.mode === "quantitative"
                ? <><strong>{todayCompletion?.amount ?? "+"}</strong><small>{assignment.target ? `/ ${assignment.target}` : "miktar"}</small></>
                : todayCompletion ? <Check size={27} /> : <span className="completion-empty" aria-hidden="true" />}
            </button> : null}
      </div>
      <div className="habit-evidence">
        {historyDates && historyLabels ? <CalendarHistory assignment={assignment} dates={historyDates} onEditDate={editable ? toggleDate : undefined} labels={historyLabels} /> : <EvidenceStrip assignment={assignment} count={historyCount ?? (compact ? 7 : 28)} dates={historyDates} onEditDate={editable ? toggleDate : undefined} />}
      </div>
      {historyInsights ? <Link
        className="habit-insights"
        href={historyInsights.href}
        aria-label={`${habit.name} geçmişi: güncel seri ${historyInsights.current} gün, en iyi seri ${historyInsights.best} gün`}
      >
        <span><Flame size={17} aria-hidden="true" /><strong>{historyInsights.current}</strong><small>Güncel seri</small></span>
        <span><History size={17} aria-hidden="true" /><strong>{historyInsights.best}</strong><small>En iyi seri</small></span>
      </Link> : null}
      {habit.mode === "quantitative" && todayCompletion ? <div className="completion-meta"><span>{todayCompletion.amount} / {assignment.target} bugün kaydedildi</span>{todayCompletion.note ? <span>Not eklendi</span> : null}</div> : null}
      </>}
    </article>

    {panel === "info" ? <Dialog title={habit.name} onClose={() => setPanel(null)} variant="sheet">
      <div className="habit-info-sheet">
        <p className="habit-info-lead">{habit.description}</p>
        <dl>
          <div><dt>Alışkanlık rehberi</dt><dd>{habit.guide}</dd></div>
          <div><dt>Neden önemli?</dt><dd>{habit.why}</dd></div>
          <div><dt>Ne tamamlanmış sayılır?</dt><dd>{habit.completionDefinition}</dd></div>
          <div><dt>Pratik öneri</dt><dd>{habit.tips}</dd></div>
          {habit.mode === "quantitative" ? <div><dt>Günlük hedef</dt><dd>{assignment.target}</dd></div> : null}
        </dl>
      </div>
    </Dialog> : null}

    {panel === "menu" ? <Dialog title={`${habit.name} seçenekleri`} onClose={() => setPanel(null)} variant="sheet">
      <div className="habit-action-menu">
        <button type="button" onClick={() => { setPanel(null); toggleDate(yesterday); }}><RotateCcw size={19} /><span><strong>{yesterdayCompletion && habit.mode === "binary" ? "Dünün tamamlamasını kaldır" : "Dünü tamamla"}</strong><small>Dün hâlâ düzenlenebilir</small></span></button>
        {todayCompletion ? <button type="button" onClick={openTodayNote}><CircleHelp size={19} /><span><strong>Bugünün notu</strong><small>{todayCompletion.note ? "Notu düzenle" : "Kısa bir düşünce ekle"}</small></span></button> : null}
        <button type="button" onClick={openEditPanel}><Palette size={19} /><span><strong>Düzenle</strong><small>Renk ve simge</small></span></button>
        <button type="button" aria-label={`${habit.name} hatırlatıcısını yönet`} onClick={openReminderPanel}><Bell size={19} /><span><strong>Hatırlatıcı</strong><small>{savedReminder.enabled ? `${savedReminder.time} için açık` : "Bu alışkanlık için kapalı"}</small></span></button>
        <button type="button" disabled><Layers3 size={19} /><span><strong>Kategoriler</strong><small>Yakında</small></span></button>
        <button type="button" onClick={() => setPanel("reorder")}><GripVertical size={19} /><span><strong>Alışkanlıkları sırala</strong><small>Günlük görünümdeki sırayı değiştir</small></span></button>
      </div>
    </Dialog> : null}

    {panel === "reminder" ? <Dialog title={`${habit.name} hatırlatıcısı`} onClose={() => setPanel(null)} variant="sheet" initialFocus="first-field">
      <form className="form-stack" onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "habit-reminder", assignmentId: assignment.id, enabled: reminderEnabled, time: reminderTime });
        setPanel(null);
      }}>
        <p className="privacy-note">Bu ayar yalnızca {habit.name} için geçerlidir.</p>
        <label className="setting-row"><span><strong>Hatırlatıcı</strong><small>Eksikse seçtiğin saatte gösterilir.</small></span><input type="checkbox" checked={reminderEnabled} onChange={(event) => setReminderEnabled(event.target.checked)} aria-label={`${habit.name} hatırlatıcısını aç`} /></label>
        <label>Hatırlatma saati<input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} disabled={!reminderEnabled} required /></label>
        <button className="primary-button" type="submit">Hatırlatıcıyı kaydet</button>
      </form>
    </Dialog> : null}

    {panel === "value" ? <Dialog title={`${habit.name} · ${valueDate === state.today ? "Bugün" : "Dün"}`} onClose={() => setPanel(null)} variant="sheet" initialFocus="first-field">
      <form className="quantity-sheet" onSubmit={(event) => {
        event.preventDefault();
        if (!Number.isInteger(amount) || amount <= 0) {
          setAmountError(true);
          return;
        }
        dispatch({ type: "record-completion", assignmentId: assignment.id, date: valueDate, amount, note });
        setPanel(null);
      }}>
        <div className="quantity-progress" aria-label={`${amount} / ${assignment.target ?? amount}`}><span style={{ width: `${assignment.target ? Math.min(100, amount / assignment.target * 100) : 100}%`, background: assignment.accent }} /></div>
        <label>Miktar<input autoFocus inputMode="numeric" type="number" min="1" step="1" value={amount} aria-invalid={amountError} aria-describedby={amountError ? `amount-error-${assignment.id}` : undefined} onChange={(event) => { setAmount(Number(event.target.value)); setAmountError(false); }} required /></label>
        {amountError ? <p className="field-error" id={`amount-error-${assignment.id}`}>Pozitif bir tam sayı gir.</p> : null}
        <p className="quantity-target">Günlük hedef <strong>{assignment.target ?? "—"}</strong></p>
        <div className="quantity-quick-actions" aria-label="Hızlı miktarlar">
          <button type="button" onClick={() => setAmount((current) => current + 1)}>+1</button>
          <button type="button" onClick={() => setAmount((current) => current + 5)}>+5</button>
          {assignment.target ? <button type="button" onClick={() => setAmount(assignment.target ?? 1)}>Hedefi doldur</button> : null}
        </div>
        <label>Kısa not <span className="optional">İsteğe bağlı</span><textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <div className="sheet-actions">
          <button className="primary-button" type="submit">Kaydet</button>
          {completionFor(state, assignment.id, valueDate) ? <button type="button" className="secondary-button" onClick={() => { dispatch({ type: "remove-completion", assignmentId: assignment.id, date: valueDate }); setPanel(null); }}>Sıfırla</button> : null}
        </div>
      </form>
    </Dialog> : null}

    {panel === "note" && todayCompletion ? <Dialog title="Bugünün notu" onClose={() => setPanel(null)} variant="sheet" initialFocus="first-field">
      <form className="form-stack" onSubmit={(event) => { event.preventDefault(); dispatch({ type: "set-completion-note", assignmentId: assignment.id, date: state.today, note }); setPanel(null); }}>
        <label>Kısa düşünce<textarea autoFocus rows={4} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <p className="privacy-note">Bu not yalnızca senin ve üst mentorlarının görünümündedir.</p>
        <button className="primary-button">Notu kaydet</button>
      </form>
    </Dialog> : null}

    {panel === "edit" ? <Dialog title="Görünümü düzenle" onClose={() => setPanel(null)} variant="sheet">
      <form className="habit-edit-sheet" onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "customize-assignment", assignmentId: assignment.id, icon: editIcon, accent: editAccent, order: assignment.order });
        setPanel(null);
      }}>
        <p>Alışkanlığın anlamı ve hedefi mentorun tarafından belirlenir. Burada yalnızca kendi görünümünü değiştirirsin.</p>
        <label>Simge<select value={editIcon} onChange={(event) => setEditIcon(event.target.value as typeof editIcon)}><option value="book">Kitap</option><option value="focus">Odak</option><option value="walk">Yürüyüş</option><option value="heart">Kalp</option></select></label>
        <fieldset><legend>Renk</legend><div className="accent-choices">{accentChoices.map((accent) => <button type="button" key={accent} aria-label={`${accent} rengini seç`} aria-pressed={editAccent === accent} style={{ background: accent }} onClick={() => setEditAccent(accent)} />)}</div></fieldset>
        <button className="primary-button">Değişiklikleri kaydet</button>
      </form>
    </Dialog> : null}

    {panel === "reorder" ? <Dialog title="Alışkanlıkları sırala" onClose={() => setPanel(null)} variant="sheet">
      <div className="reorder-list">{assignmentsFor(state, state.currentUserId).map((item, index, ordered) => {
        const itemHabit = definition(state, item.definitionId);
        const ItemIcon = habitIcons[item.icon];
        return <div key={item.id} className="reorder-row"><span className="habit-icon" style={{ "--accent": item.accent } as React.CSSProperties}><ItemIcon size={18} /></span><strong>{itemHabit?.name}</strong><div><button type="button" onClick={() => moveAssignment(item.id, -1)} disabled={index === 0} aria-label={`${itemHabit?.name} yukarı taşı`}><ChevronUp size={19} /></button><button type="button" onClick={() => moveAssignment(item.id, 1)} disabled={index === ordered.length - 1} aria-label={`${itemHabit?.name} aşağı taşı`}><ChevronDown size={19} /></button></div></div>;
      })}</div>
    </Dialog> : null}
  </>;
}
