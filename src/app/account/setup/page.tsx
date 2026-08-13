import { AccountSetup } from "@/components/account-setup";
export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  return <AccountSetup mentorship={kind !== "access_code"} />;
}
