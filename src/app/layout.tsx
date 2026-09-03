import type { Metadata } from "next";
import "./globals.css";
import { CeteleProvider } from "@/modules/cetele/store";

export const metadata: Metadata = { title: "Mülahaza", description: "Kişisel günlük alışkanlık kaydı ve mentorluk sorumluluğu." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr" suppressHydrationWarning><body><CeteleProvider>{children}</CeteleProvider></body></html>;
}
