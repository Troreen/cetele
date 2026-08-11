"use client";

import type { Route } from "next";
import { useSyncExternalStore } from "react";
import type { Theme } from "./types";

export type HistoryRange = "week" | "six-months";

const URL_STATE_EVENT = "cetele:url-state";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(URL_STATE_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(URL_STATE_EVENT, listener);
  };
}

function clientSnapshot() {
  return window.location.search;
}

function serverSnapshot() {
  return "";
}

export function useUiSearch() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

export function readHistoryRange(search: string): HistoryRange | null {
  const value = new URLSearchParams(search).get("range");
  return value === "week" || value === "six-months" ? value : null;
}

export function readTheme(search: string): Theme | null {
  const value = new URLSearchParams(search).get("theme");
  return value === "dark" || value === "light" ? value : null;
}

export function hrefWithUiState<T extends string>(path: Route<T>, search: string) {
  const source = new URLSearchParams(search);
  const target = new URL(path, "https://cetele.local");
  for (const key of ["theme", "range"] as const) {
    const value = source.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return {
    pathname: target.pathname as Route<T>,
    query: Object.fromEntries(target.searchParams.entries()),
    hash: target.hash || undefined,
  };
}

export function pushUiState(updates: { theme?: Theme; range?: HistoryRange }) {
  const url = new URL(window.location.href);
  if (updates.theme) url.searchParams.set("theme", updates.theme);
  if (updates.range) url.searchParams.set("range", updates.range);
  window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event(URL_STATE_EVENT));
}
