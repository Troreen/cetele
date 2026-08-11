import type { CeteleState } from "./types";

export const fixtureState: CeteleState = {
  version: 1,
  today: "2026-08-09",
  currentUserId: "mentor",
  theme: "dark",
  viewPreferences: { showMonthLabels: true, showDayLabels: true },
  people: [
    { id: "senior", name: "Üst Mentor", initials: "ÜM", mentorId: null, invitation: "active", groupName: "Ana kol" },
    { id: "mentor", name: "Tarik", initials: "T", mentorId: "senior", invitation: "active", groupName: "Tarik" },
    { id: "ayse", name: "Yunus", initials: "Y", mentorId: "mentor", invitation: "active", groupName: "Yunus" },
    { id: "zeynep", name: "Yusuf", initials: "Y", mentorId: "mentor", invitation: "active", groupName: "Yusuf" },
    { id: "eren", name: "Bera", initials: "B", mentorId: "mentor", invitation: "active", groupName: "Bera" },
    { id: "junior", name: "Ilyas", initials: "I", mentorId: "ayse", invitation: "active" },
    { id: "deniz", name: "Okan", initials: "O", mentorId: "ayse", invitation: "active" },
    { id: "emre", name: "Akif", initials: "A", mentorId: "ayse", invitation: "active" },
    { id: "mustafa", name: "Mustafa", initials: "M", mentorId: "ayse", invitation: "active" },
    { id: "eyup", name: "Eyup", initials: "E", mentorId: "ayse", invitation: "active" },
    { id: "aslan", name: "Aslan", initials: "A", mentorId: "ayse", invitation: "active" },
    { id: "yusuf-ahmet", name: "Yusuf Ahmet", initials: "YA", mentorId: "zeynep", invitation: "active" },
    { id: "yusuf-ismail", name: "Yusuf Ismail", initials: "YI", mentorId: "zeynep", invitation: "active" },
    { id: "selim", name: "Selim", initials: "S", mentorId: "zeynep", invitation: "active" },
    { id: "berat", name: "Berat", initials: "B", mentorId: "zeynep", invitation: "active" },
    { id: "emin", name: "Emin", initials: "E", mentorId: "eren", invitation: "active" },
    { id: "murat", name: "Murat", initials: "M", mentorId: "eren", invitation: "active" },
    { id: "batuhan", name: "Batuhan", initials: "B", mentorId: "eren", invitation: "active" },
  ],
  definitions: [
    { id: "reading", authorId: "mentor", creatorName: "Tarik", name: "Günlük okuma", description: "Her gün sakin bir okuma vakti", guide: "Dikkatini dağıtmadan en az on sayfa oku.", why: "Düzenli düşünme ve öğrenme için.", completionDefinition: "En az bir anlamlı okuma oturumu.", tips: "Aynı saat ve yeri seç.", mode: "quantitative", defaultTarget: 10, visibility: "shared" },
    { id: "focus", authorId: "mentor", name: "Tefekkür", description: "Günün kısa muhasebesi", guide: "Sessizce günü değerlendir.", why: "Niyeti ve yönü tazelemek için.", completionDefinition: "En az beş dakikalık odaklı değerlendirme.", tips: "Telefonu uzağa bırak.", mode: "binary", defaultTarget: null, visibility: "private" },
    { id: "walk", authorId: "senior", name: "Açık hava yürüyüşü", description: "Bedeni hareket ettir", guide: "Temponu koruyarak açık havada yürü.", why: "Beden ve zihin dengesini desteklemek için.", completionDefinition: "En az on dakika yürüyüş.", tips: "Kısa bir rota önceden belirle.", mode: "quantitative", defaultTarget: 20, visibility: "shared", sourceAuthor: "Üst Mentor" },
  ],
  assignments: [
    { id: "mentor-reading", definitionId: "reading", studentId: "mentor", assignedBy: "senior", startedOn: "2026-08-03", endedOn: null, target: 10, accent: "#55a7ff", icon: "book", order: 0, status: "active" },
    { id: "mentor-focus", definitionId: "focus", studentId: "mentor", assignedBy: "senior", startedOn: "2026-08-03", endedOn: null, target: null, accent: "#f164ef", icon: "focus", order: 1, status: "active" },
    ...[
      ["ayse", "mentor"], ["zeynep", "mentor"], ["eren", "mentor"],
      ["junior", "ayse"], ["deniz", "ayse"], ["emre", "ayse"], ["mustafa", "ayse"], ["eyup", "ayse"], ["aslan", "ayse"],
      ["yusuf-ahmet", "zeynep"], ["yusuf-ismail", "zeynep"], ["selim", "zeynep"], ["berat", "zeynep"],
      ["emin", "eren"], ["murat", "eren"], ["batuhan", "eren"],
    ].flatMap(([studentId, assignedBy], index) => [
      { id: `${studentId}-reading`, definitionId: "reading", studentId, assignedBy, startedOn: "2026-08-03", endedOn: null, target: 10, accent: "#55a7ff", icon: "book" as const, order: 0, status: "active" as const },
      { id: `${studentId}-focus`, definitionId: "focus", studentId, assignedBy, startedOn: "2026-08-03", endedOn: null, target: null, accent: index % 2 ? "#3ed68b" : "#f164ef", icon: "focus" as const, order: 1, status: "active" as const },
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
    { mentorId: "ayse", date: "2026-08-08", reviewedAt: "2026-08-08T09:25:00+02:00" },
    { mentorId: "zeynep", date: "2026-08-08", reviewedAt: "2026-08-08T09:35:00+02:00" },
    { mentorId: "eren", date: "2026-08-08", reviewedAt: "2026-08-08T09:45:00+02:00" },
  ],
  excuses: [],
  reminders: {
    habits: {
      "mentor-reading": { enabled: true, time: "20:30" },
      "mentor-focus": { enabled: true, time: "20:30" },
    },
    mentorEnabled: true,
    mentorTime: "21:00",
  },
};
