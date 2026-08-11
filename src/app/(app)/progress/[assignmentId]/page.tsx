import { notFound } from "next/navigation";
import { z } from "zod";
import { AssignmentDetailScreen } from "@/components/screens/assignment-detail-screen";

export default async function Page({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  if (process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase" && !z.string().uuid().safeParse(assignmentId).success) notFound();
  return <AssignmentDetailScreen assignmentId={assignmentId} />;
}
