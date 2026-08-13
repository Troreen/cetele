"use client";

import { UsersRound } from "lucide-react";
import { SectionHeader } from "../section-header";
import { aggregateCompletionRatio, directStudents } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";

function aggregateLabel(ratio: { done: number; total: number }) {
  return ratio.total ? `%${Math.round(ratio.done / ratio.total * 100)}` : "Kayıt yok";
}

export function NetworkScreen() {
  const { state } = useCetele();
  const direct = directStudents(state).filter((student) => student.invitation === "active");
  const completion = aggregateCompletionRatio(state, direct.map((student) => student.id));
  return <div className="workspace"><SectionHeader title="Doğrudan grubum" description="Yalnızca doğrudan sorumluluğun ve bu ilişki için açıklanan kayıtlar." />
    <section className="branch-summary direct-summary"><UsersRound size={24} /><div><h2>Doğrudan grup</h2><p>{direct.length} kişi</p></div><dl aria-label="Bugünkü doğrudan grup özeti"><div><dt>Bugün</dt><dd>{aggregateLabel(completion)}</dd></div><div><dt>Açık takip</dt><dd>{state.attention.filter((item) => item.responsibleMentorId === state.currentUserId && item.state === "open").length}</dd></div></dl></section>
    <p className="privacy-note">Dolaylı öğrenciler, alt gruplar ve şube toplamları bu yüzeyde bulunmaz.</p>
  </div>;
}
