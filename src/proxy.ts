import { type NextRequest, NextResponse } from "next/server";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_CETELE_DATA_ADAPTER !== "supabase") {
    return NextResponse.next();
  }
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/",
    "/today/:path*",
    "/progress/:path*",
    "/students/:path*",
    "/attention/:path*",
    "/library/:path*",
    "/network/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/account/setup/:path*",
    "/account/reset-password/:path*",
    "/account/recover-deletion/:path*",
  ],
};
