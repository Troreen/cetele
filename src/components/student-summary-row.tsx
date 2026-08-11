"use client";

import Link, { type LinkProps } from "next/link";
import { ChevronRight, X } from "lucide-react";
import { EvidenceStrip } from "./habit-card";
import { assignmentsFor, completionRatio, definition } from "@/modules/cetele/selectors";
import { useCetele } from "@/modules/cetele/store";
import type { Person } from "@/modules/cetele/types";

export function StudentSummaryRow({ student, href, invitationExpired = false, onRevoke }: {
  student: Person;
  href: LinkProps<string>["href"];
  invitationExpired?: boolean;
  onRevoke?: () => void;
}) {
  const { state } = useCetele();
  const assignments = assignmentsFor(state, student.id);
  const ratio = completionRatio(state, student.id);
  const attention = state.attention.find((item) => item.studentId === student.id && item.state === "open");
  const status = attention
    ? "Dikkat gerekiyor"
    : student.invitation === "pending"
      ? invitationExpired ? "İptal edip yeniden davet et" : "Kabul bekleniyor"
      : "Sorun görünmüyor";

  return <article className="student-row"><span className="avatar" aria-hidden="true">{student.initials}</span><div className="student-identity"><h2>{student.name}</h2><p>{student.invitation === "pending" ? invitationExpired ? "Davet süresi doldu" : "Davet bekliyor" : `${assignments.length} alışkanlık`}</p></div><div className="student-evidence">{assignments.slice(0, 3).map((assignment) => { const habitName = definition(state, assignment.definitionId)?.name ?? "Alışkanlık"; return <div className="identified-evidence" key={assignment.id}><span className="evidence-label" title={habitName}>{habitName}</span><EvidenceStrip assignment={assignment} count={6} /></div>; })}</div><strong className="today-ratio">{student.invitation === "pending" ? "—" : `${ratio.done}/${ratio.total}`}</strong><span className={`status-text ${attention ? "attention" : student.invitation === "pending" ? "pending" : "calm"}`}>{status}</span>{student.invitation === "pending" ? onRevoke ? <button className="icon-button" type="button" aria-label={invitationExpired ? `${student.name} süresi dolan davetini iptal et; ardından yeniden davet et` : `${student.name} davetini iptal et`} onClick={onRevoke}><X size={20} /></button> : null : <Link href={href} className="icon-button" aria-label={`${student.name} ayrıntıları`}><ChevronRight size={20} /></Link>}</article>;
}
