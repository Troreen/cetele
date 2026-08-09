import type { CeteleState } from "./types";

export const fixtureState: CeteleState = {
  version: 1,
  today: "2026-08-09",
  currentUserId: "mentor",
  theme: "dark",
  people: [
    { id: "senior", name: "Selim Kaya", initials: "SK", mentorId: null, invitation: "active", groupName: "Merkez" },
    { id: "mentor", name: "Mert Demir", initials: "MD", mentorId: "senior", invitation: "active", groupName: "İstikamet" },
    { id: "ayse", name: "Ayşe Yılmaz", initials: "AY", mentorId: "mentor", invitation: "active" },
    { id: "zeynep", name: "Zeynep Kaya", initials: "ZK", mentorId: "mentor", invitation: "active" },
    { id: "eren", name: "Eren Arslan", initials: "EA", mentorId: "mentor", invitation: "active" },
    { id: "emre", name: "Emre Demir", initials: "ED", mentorId: "mentor", invitation: "pending" },
    { id: "junior", name: "Elif Acar", initials: "EA", mentorId: "mentor", invitation: "active", groupName: "Ufuk" },
    { id: "deniz", name: "Deniz Ak", initials: "DA", mentorId: "junior", invitation: "active" },
  ],
  definitions: [
    { id: "reading", authorId: "mentor", creatorName: "Mert Demir", name: "Günlük okuma", description: "Her gün sakin bir okuma vakti", guide: "Dikkatini dağıtmadan en az on sayfa oku.", why: "Düzenli düşünme ve öğrenme için.", completionDefinition: "En az bir anlamlı okuma oturumu.", tips: "Aynı saat ve yeri seç.", mode: "quantitative", defaultTarget: 10, visibility: "shared" },
    { id: "focus", authorId: "mentor", name: "Tefekkür", description: "Günün kısa muhasebesi", guide: "Sessizce günü değerlendir.", why: "Niyeti ve yönü tazelemek için.", completionDefinition: "En az beş dakikalık odaklı değerlendirme.", tips: "Telefonu uzağa bırak.", mode: "binary", defaultTarget: null, visibility: "private" },
    { id: "walk", authorId: "senior", name: "Açık hava yürüyüşü", description: "Bedeni hareket ettir", guide: "Temponu koruyarak açık havada yürü.", why: "Beden ve zihin dengesini desteklemek için.", completionDefinition: "En az on dakika yürüyüş.", tips: "Kısa bir rota önceden belirle.", mode: "quantitative", defaultTarget: 20, visibility: "shared", sourceAuthor: "Selim Kaya" },
  ],
  assignments: [
    { id: "mentor-reading", definitionId: "reading", studentId: "mentor", assignedBy: "senior", target: 10, accent: "#55a7ff", icon: "book", order: 0, status: "active" },
    { id: "mentor-focus", definitionId: "focus", studentId: "mentor", assignedBy: "senior", target: null, accent: "#f164ef", icon: "focus", order: 1, status: "active" },
    ...["ayse", "zeynep", "eren", "junior", "deniz"].flatMap((studentId, index) => [
      { id: `${studentId}-reading`, definitionId: "reading", studentId, assignedBy: studentId === "deniz" ? "junior" : "mentor", target: 10, accent: "#55a7ff", icon: "book" as const, order: 0, status: "active" as const },
      { id: `${studentId}-focus`, definitionId: "focus", studentId, assignedBy: studentId === "deniz" ? "junior" : "mentor", target: null, accent: index % 2 ? "#3ed68b" : "#f164ef", icon: "focus" as const, order: 1, status: "active" as const },
    ]),
  ],
  completions: [
    ...["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-07", "2026-08-08"].map((date) => ({ assignmentId: "mentor-reading", date, amount: 12, retrospective: false, note: "" })),
    ...["2026-08-04", "2026-08-05", "2026-08-06", "2026-08-08"].map((date) => ({ assignmentId: "mentor-focus", date, amount: null, retrospective: false, note: "" })),
    ...["zeynep", "eren", "junior"].flatMap((id) => ["2026-08-06", "2026-08-07", "2026-08-08"].flatMap((date) => [
      { assignmentId: `${id}-reading`, date, amount: 10, retrospective: false, note: "" },
      { assignmentId: `${id}-focus`, date, amount: null, retrospective: false, note: "" },
    ])),
  ],
  attention: [{ id: "attention-ayse", studentId: "ayse", assignmentId: "ayse-reading", responsibleMentorId: "mentor", triggerDates: ["2026-08-07", "2026-08-08"], state: "open" }],
  reviews: [
    { mentorId: "mentor", date: "2026-08-07", reviewedAt: "2026-08-07T08:40:00+02:00" },
    { mentorId: "mentor", date: "2026-08-08", reviewedAt: "2026-08-08T09:15:00+02:00" },
  ],
  excuses: [],
  reminders: { studentEnabled: true, studentTime: "20:30", mentorEnabled: true, mentorTime: "21:00" },
};
