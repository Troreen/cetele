import { AuthCard } from "@/components/auth-card";
export default async function Page({ searchParams }: { searchParams: Promise<{ invitation?: string }> }) { const { invitation } = await searchParams; return <AuthCard mode="password" invitationId={invitation} />; }
