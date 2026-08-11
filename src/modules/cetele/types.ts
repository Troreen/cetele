export type Theme = "dark" | "light";
export type HabitMode = "binary" | "quantitative";
export type AttentionState = "open" | "followed-up" | "invalidated";

export type HabitDefinition = {
  id: string;
  authorId: string;
  name: string;
  description: string;
  guide: string;
  why: string;
  completionDefinition: string;
  tips: string;
  mode: HabitMode;
  defaultTarget: number | null;
  visibility: "private" | "shared";
  sourceAuthor?: string;
  creatorName?: string;
};

export type Assignment = {
  id: string;
  definitionId: string;
  studentId: string;
  assignedBy: string;
  startedOn: string;
  endedOn: string | null;
  target: number | null;
  accent: string;
  icon: "book" | "heart" | "walk" | "focus";
  order: number;
  status: "active" | "ended";
};

export type Completion = {
  assignmentId: string;
  date: string;
  amount: number | null;
  retrospective: boolean;
  note: string;
};

export type Person = {
  id: string;
  name: string;
  initials: string;
  mentorId: string | null;
  invitation: "active" | "pending";
  invitationExpiresAt?: string;
  groupName?: string;
};

export type AttentionItem = {
  id: string;
  studentId: string;
  assignmentId: string;
  contributingAssignmentIds?: string[];
  responsibleMentorId: string;
  triggerDates: [string, string];
  state: AttentionState;
  followedUpBy?: string;
  followedUpAt?: string;
  privateNote?: string;
};

export type Review = { mentorId: string; date: string; reviewedAt: string };
export type Excuse = { studentId: string; assignmentId: string | null; date: string; note: string; grantedBy: string };
export type HabitReminder = { enabled: boolean; time: string };
export type ReminderPreferences = { habits: Record<string, HabitReminder>; mentorEnabled: boolean; mentorTime: string };
export type ViewPreferences = { showMonthLabels: boolean; showDayLabels: boolean };

export type CeteleState = {
  version: 1;
  today: string;
  currentUserId: string;
  theme: Theme;
  viewPreferences: ViewPreferences;
  people: Person[];
  definitions: HabitDefinition[];
  assignments: Assignment[];
  completions: Completion[];
  attention: AttentionItem[];
  reviews: Review[];
  excuses: Excuse[];
  reminders: ReminderPreferences;
};
