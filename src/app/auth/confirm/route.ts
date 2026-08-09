import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const invitationResult = z.string().uuid().safeParse(request.nextUrl.searchParams.get("invitation"));
  if (!invitationResult.success) return NextResponse.redirect(new URL("/sign-in?error=invite", request.url));
  const supabase = await createSupabaseServerClient();
  const result = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Doğrulama kodu eksik.") };
  if (result.error) return NextResponse.redirect(new URL("/sign-in?error=invite", request.url));
  const destination = new URL("/set-password", request.url);
  destination.searchParams.set("invitation", invitationResult.data);
  return NextResponse.redirect(destination);
}
