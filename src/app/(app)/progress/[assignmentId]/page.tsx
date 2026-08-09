import { AssignmentDetailScreen } from "@/components/screens/assignment-detail-screen";
export default async function Page({ params }: { params: Promise<{ assignmentId: string }> }) { const { assignmentId } = await params; return <AssignmentDetailScreen assignmentId={assignmentId} />; }
