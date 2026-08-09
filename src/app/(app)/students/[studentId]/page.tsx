import { StudentDetailScreen } from "@/components/screens/student-detail-screen";
export default async function Page({ params }: { params: Promise<{ studentId: string }> }) { const { studentId } = await params; return <StudentDetailScreen studentId={studentId} />; }
