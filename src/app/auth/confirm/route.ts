import { randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
const cookieNames = {
  token: "cetele-confirm-token",
  type: "cetele-confirm-type",
  kind: "cetele-confirm-kind",
  csrf: "cetele-confirm-csrf",
} as const;

function escapeAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function sameSecret(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function clearConfirmationCookies(response: NextResponse) {
  for (const name of Object.values(cookieNames)) response.cookies.delete(name);
  return response;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const kind = request.nextUrl.searchParams.get("kind") === "access_code" ? "access_code" : "mentorship_invitation";
  if (tokenHash && (type === "invite" || type === "recovery")) {
    const response = NextResponse.redirect(new URL("/auth/confirm", request.url), 303);
    const options = { httpOnly: true, sameSite: "strict" as const, secure: request.nextUrl.protocol === "https:", path: "/auth/confirm", maxAge: 600 };
    response.cookies.set(cookieNames.token, tokenHash, options);
    response.cookies.set(cookieNames.type, type, options);
    response.cookies.set(cookieNames.kind, kind, options);
    response.cookies.set(cookieNames.csrf, randomBytes(32).toString("base64url"), options);
    return response;
  }

  const csrf = request.cookies.get(cookieNames.csrf)?.value ?? "";
  const storedType = request.cookies.get(cookieNames.type)?.value;
  if (!csrf || (storedType !== "invite" && storedType !== "recovery") || !request.cookies.get(cookieNames.token)?.value) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  const title = storedType === "recovery" ? "Parola yenilemeyi aç" : "Hesap kurulumunu aç";
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{font-family:system-ui;background:#111;color:#f7f5ef;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:32rem;padding:2rem;border:1px solid #444;border-radius:1rem;background:#1b1b1b}button{font:inherit;font-weight:700;padding:.8rem 1rem;border:0;border-radius:.6rem;background:#d9ff70;color:#111}</style></head><body><main class="card"><h1>${title}</h1><p>Bağlantıyı sen açtıysan devam et. Bu ayrı adım, e-posta güvenlik tarayıcılarının tek kullanımlık doğrulamayı tüketmesini önler.</p><form method="post" action="/auth/confirm"><input type="hidden" name="csrf" value="${escapeAttribute(csrf)}"><button type="submit">Doğrula ve devam et</button></form></main></body></html>`;
  return new NextResponse(html, { status: 200, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const submittedCsrf = String(form.get("csrf") ?? "");
  const storedCsrf = request.cookies.get(cookieNames.csrf)?.value ?? "";
  const origin = request.headers.get("origin");
  const tokenHash = request.cookies.get(cookieNames.token)?.value ?? "";
  const type = request.cookies.get(cookieNames.type)?.value;
  const kind = request.cookies.get(cookieNames.kind)?.value === "access_code" ? "access_code" : "mentorship_invitation";
  if (origin !== request.nextUrl.origin || !submittedCsrf || !storedCsrf || !sameSecret(submittedCsrf, storedCsrf)
    || !tokenHash || (type !== "invite" && type !== "recovery")) {
    return clearConfirmationCookies(NextResponse.redirect(new URL("/sign-in", request.url), 303));
  }
  const { error } = await (await createSupabaseServerClient()).auth.verifyOtp({ token_hash: tokenHash, type });
  const destination = error ? "/sign-in" : type === "recovery" ? "/account/reset-password" : `/account/setup?kind=${kind}`;
  return clearConfirmationCookies(NextResponse.redirect(new URL(destination, request.url), 303));
}
