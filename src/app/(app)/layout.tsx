import { AppShell } from "@/components/app-shell";
import { CeteleProvider } from "@/modules/cetele/store";
import { loadCeteleState } from "@/modules/cetele/loader";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) { const loaded = await loadCeteleState(); return <CeteleProvider initialState={loaded.state} adapter={loaded.adapter}><AppShell>{children}</AppShell></CeteleProvider>; }
