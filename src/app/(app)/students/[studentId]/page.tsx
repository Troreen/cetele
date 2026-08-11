import { notFound } from "next/navigation";
import { z } from "zod";
import { StudentDetailScreen } from "@/components/screens/student-detail-screen";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER === "supabase" && !z.string().uuid().safeParse(studentId).success) notFound();
  return <StudentDetailScreen studentId={studentId} />;
}
