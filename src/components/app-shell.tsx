"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, ChevronRight, LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { navIcons } from "./icons";
import { Dialog } from "./dialog";
import { CETELE_STORAGE_KEY, useCetele } from "@/modules/cetele/store";
import { assignmentsFor, definition, directStudents } from "@/modules/cetele/selectors";
import { signOut } from "@/modules/cetele/actions";
import { hrefWithUiState, readTheme, useUiSearch } from "@/modules/cetele/url-state";

const navigation = [
  { href: "/today", label: "Bugün", icon: navIcons.today },
  { href: "/students", label: "Öğrencilerim", icon: navIcons.students },
  { href: "/attention", label: "Dikkat", icon: navIcons.attention },
  { href: "/library", label: "Alışkanlıklar", icon: navIcons.library },
  { href: "/network", label: "Doğrudan grup", icon: navIcons.network },
  { href: "/settings", label: "Ayarlar", icon: navIcons.settings },
] as const;
const THEME_PREFERENCE_EVENT = "cetele:theme-preference-saved";

function readSavedLocalTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(CETELE_STORAGE_KEY) ?? "null") as { theme?: unknown } | null;
    return saved?.theme === "dark" || saved?.theme === "light" ? saved.theme : null;
  } catch {
    return null;
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, dispatch, adapter } = useCetele();
  const uiSearch = useUiSearch();
  const baseTheme = useRef(state.theme);
  const lastUrlTheme = useRef<ReturnType<typeof readTheme>>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const MoreIcon = navIcons.settings;
  const current = state.people.find((item) => item.id === state.currentUserId);
  const hasStudents = directStudents(state).length > 0;
  const habitReminders = assignmentsFor(state, state.currentUserId).flatMap((assignment) => {
    const reminder = state.reminders.habits[assignment.id];
    return reminder?.enabled ? [{ assignment, reminder, name: definition(state, assignment.definitionId)?.name ?? "Alışkanlık" }] : [];
  });
  const visibleNavigation = navigation.filter((item) => hasStudents || !["/students", "/attention", "/network"].includes(item.href));

  useEffect(() => {
    const updateBaseTheme = () => {
      if (adapter !== "local") return;
      const savedTheme = readSavedLocalTheme();
      if (savedTheme) baseTheme.current = savedTheme;
    };
    window.addEventListener(THEME_PREFERENCE_EVENT, updateBaseTheme);
    return () => window.removeEventListener(THEME_PREFERENCE_EVENT, updateBaseTheme);
  }, [adapter]);

  useEffect(() => {
    const urlTheme = readTheme(uiSearch);
    const savedTheme = adapter === "local" ? readSavedLocalTheme() : null;
    if (urlTheme) {
      if (lastUrlTheme.current !== urlTheme) {
        if (savedTheme === urlTheme) baseTheme.current = savedTheme;
        else if (lastUrlTheme.current === null && savedTheme) baseTheme.current = savedTheme;
      }
      lastUrlTheme.current = urlTheme;
      if (urlTheme !== state.theme) dispatch({ type: "url-theme", theme: urlTheme });
      return;
    }

    if (lastUrlTheme.current !== null) {
      lastUrlTheme.current = null;
      if (baseTheme.current !== state.theme) dispatch({ type: "url-theme", theme: baseTheme.current });
      return;
    }

    const loadedBaseTheme = savedTheme ?? state.theme;
    baseTheme.current = loadedBaseTheme;
    if (loadedBaseTheme !== state.theme) dispatch({ type: "url-theme", theme: loadedBaseTheme });
  }, [adapter, dispatch, state.theme, uiSearch]);

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link href={hrefWithUiState("/today", uiSearch)} className="brand" aria-label="Mülahaza ana sayfa"><span className="brand-mark" aria-hidden="true">✓</span>Mülahaza</Link>
        <div className="topbar-actions">
          <button type="button" className="icon-button" aria-label="Bildirimler" aria-haspopup="dialog" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(true)}><Bell size={19} /></button>
          <button type="button" className="profile-button" aria-label={`Hesap menüsü: ${current?.name}`} aria-haspopup="dialog" aria-expanded={accountOpen} onClick={() => setAccountOpen(true)}><span className="avatar small">{current?.initials}</span><span><strong>{current?.name}</strong><small>Öğrenci · Mentor</small></span><ChevronDown size={16} /></button>
        </div>
      </header>
      <aside className="side-rail" aria-label="Ana menü">
        <nav className="side-nav">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const count = item.href === "/attention" ? state.attention.filter((attention) => attention.state === "open").length : 0;
            return <Link key={item.href} href={hrefWithUiState(item.href, uiSearch)} className={clsx("nav-link", active && "active")} aria-current={active ? "page" : undefined}><Icon size={19} /><span>{item.label}</span>{count > 0 ? <strong className="nav-count" aria-label={`${count} açık kayıt`}>{count}</strong> : null}</Link>;
          })}
        </nav>
        <form action={signOut} className="sign-out"><button type="submit" className="nav-link sign-out-button"><LogOut size={18} />Çıkış yap</button></form>
      </aside>
      <main className="main-content">{children}</main>
      <nav className="bottom-nav" aria-label="Mobil menü">
        {visibleNavigation.filter((item) => ["/today", "/students"].includes(item.href)).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={hrefWithUiState(item.href, uiSearch)} className={clsx(active && "active")} aria-current={active ? "page" : undefined}><Icon size={21} /><span>{item.label}</span></Link>;
        })}
        <button type="button" aria-haspopup="dialog" aria-expanded={moreOpen} className={clsx(["/attention", "/library", "/network", "/settings"].some((path) => pathname.startsWith(path)) && "active")} onClick={() => setMoreOpen(true)}><MoreIcon size={21} /><span>Daha</span>{state.attention.some((item) => item.state === "open") ? <span className="more-dot"><span className="sr-only">Açık dikkat kaydı var</span></span> : null}</button>
      </nav>
      {notificationsOpen ? <Dialog title="Bildirimler" variant="sheet" onClose={() => setNotificationsOpen(false)}><div className="form-stack">{habitReminders.length ? habitReminders.map(({ assignment, reminder, name }) => <p className="privacy-note" key={assignment.id}><Bell size={16} /> <strong>{name}</strong> · {reminder.time}</p>) : <p className="privacy-note">Etkin alışkanlık hatırlatıcısı yok.</p>}{hasStudents ? <p className="privacy-note">{state.reminders.mentorEnabled ? `Mentor inceleme hatırlatıcısı ${state.reminders.mentorTime} için açık.` : "Mentor inceleme hatırlatıcısı kapalı."}</p> : null}<Link className="secondary-button" href={hrefWithUiState("/settings", uiSearch)} onClick={() => setNotificationsOpen(false)}>Bildirim ayarlarını aç</Link></div></Dialog> : null}
      {accountOpen ? <Dialog title="Hesabım" variant="sheet" onClose={() => setAccountOpen(false)}><div className="form-stack"><div className="account-summary"><span className="avatar">{current?.initials}</span><span><strong>{current?.name}</strong><small>Öğrenci · Mentor</small></span></div><Link className="secondary-button" href={hrefWithUiState("/settings", uiSearch)} onClick={() => setAccountOpen(false)}><Settings size={18} /> Ayarları aç</Link><form action={signOut}><button type="submit" className="secondary-button full"><LogOut size={18} /> Çıkış yap</button></form></div></Dialog> : null}
      {moreOpen ? <Dialog title="Diğer bölümler" variant="sheet" onClose={() => setMoreOpen(false)}><nav className="more-menu" aria-label="Diğer bölümler">{visibleNavigation.filter((item) => ["/attention", "/library", "/network", "/settings"].includes(item.href)).map((item) => { const Icon = item.icon; const count = item.href === "/attention" ? state.attention.filter((entry) => entry.state === "open").length : 0; return <Link key={item.href} href={hrefWithUiState(item.href, uiSearch)} onClick={() => setMoreOpen(false)} aria-current={pathname.startsWith(item.href) ? "page" : undefined}><Icon size={20} /><span>{item.label}</span>{count ? <strong aria-label={`${count} açık kayıt`}>{count}</strong> : <ChevronRight className="more-chevron" size={17} />}</Link>; })}</nav></Dialog> : null}
    </div>
  );
}
