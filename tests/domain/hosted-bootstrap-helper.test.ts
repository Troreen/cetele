import { describe, expect, it, vi } from "vitest";
// @ts-expect-error The executable helper is intentionally plain Node ESM.
import { ensureBootstrapUsers, loadPreparationConfig, parseEnvText, prepareIdentityEnv, redact, updateEnvText } from "../../scripts/prepare-hosted-verification.mjs";

const ROLE_NAMES = ["SUBJECT", "DIRECT", "SENIOR", "PEER", "OUTSIDER"];

function completeEnv() {
  const env: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_example",
    NEXT_PUBLIC_CETELE_DATA_ADAPTER: "local",
  };
  for (const role of ROLE_NAMES) {
    env[`CETELE_VERIFY_${role}_EMAIL`] = `${role.toLowerCase()}@example.invalid`;
    env[`CETELE_VERIFY_${role}_PASSWORD`] = `password-${role}`;
  }
  return env;
}

describe("hosted verification bootstrap helper", () => {
  it("parses dotenv quoting and appends only missing values without changing existing text", () => {
    const source = "# keep this comment\nEXISTING='literal # value'\nINLINE=value # comment\n";
    expect(parseEnvText(source)).toEqual({ EXISTING: "literal # value", INLINE: "value" });

    const updated = updateEnvText(source, { EXISTING: "literal # value", ADDED: "value with spaces" });
    expect(updated).toBe(`${source}\nADDED="value with spaces"\n`);
    expect(parseEnvText(updated).ADDED).toBe("value with spaces");
    expect(() => updateEnvText(source, { EXISTING: "replacement" })).toThrow("Refusing to overwrite EXISTING");
  });

  it("fills blank placeholder assignments in place while preserving comments and surrounding text", () => {
    const source = "# identities\nCETELE_VERIFY_SUBJECT_EMAIL= # generated here\nUNCHANGED=value\nCETELE_VERIFY_SUBJECT_PASSWORD=\n";

    expect(updateEnvText(source, {
      CETELE_VERIFY_SUBJECT_EMAIL: "subject@example.invalid",
      CETELE_VERIFY_SUBJECT_PASSWORD: "generated-password",
    })).toBe("# identities\nCETELE_VERIFY_SUBJECT_EMAIL= subject@example.invalid # generated here\nUNCHANGED=value\nCETELE_VERIFY_SUBJECT_PASSWORD=generated-password\n");
  });

  it("generates complete random pairs only for fully missing roles and rejects partial pairs", () => {
    const env = completeEnv();
    delete env.CETELE_VERIFY_SUBJECT_EMAIL;
    delete env.CETELE_VERIFY_SUBJECT_PASSWORD;
    let byte = 1;
    const generated = prepareIdentityEnv(env, (size: number) => Buffer.alloc(size, byte++));

    expect(generated.generatedRoles).toEqual(["subject"]);
    expect(generated.additions.CETELE_VERIFY_SUBJECT_EMAIL).toMatch(/^cetele-verify-subject-[0-9a-f]{16}@example\.invalid$/);
    expect(generated.additions.CETELE_VERIFY_SUBJECT_PASSWORD).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(generated.additions).not.toHaveProperty("CETELE_VERIFY_DIRECT_EMAIL");

    const partial = completeEnv();
    delete partial.CETELE_VERIFY_PEER_PASSWORD;
    expect(() => prepareIdentityEnv(partial)).toThrow("CETELE_VERIFY_PEER_EMAIL and CETELE_VERIFY_PEER_PASSWORD must both be present or both be missing");
  });

  it("fails closed for unsafe hosted configuration and a non-local adapter", () => {
    expect(() => loadPreparationConfig({ ...completeEnv(), NEXT_PUBLIC_SUPABASE_URL: "http://project-ref.supabase.co" })).toThrow("must use HTTPS");
    expect(() => loadPreparationConfig({ ...completeEnv(), SUPABASE_SECRET_KEY: "sb_publishable_nope" })).toThrow("service-role secret");
    expect(() => loadPreparationConfig({ ...completeEnv(), NEXT_PUBLIC_CETELE_DATA_ADAPTER: "supabase" })).toThrow("must remain local");
  });

  it("redacts configured values, emails, IDs, and token-shaped provider details", () => {
    const output = redact(
      "person@example.invalid 018f47ac-1234-7abc-8def-1234567890ab sb_secret_abc eyJabc.def.ghi password-value",
      ["password-value"],
    );
    expect(output).not.toContain("person@example.invalid");
    expect(output).not.toContain("018f47ac-1234-7abc-8def-1234567890ab");
    expect(output).not.toContain("sb_secret_abc");
    expect(output).not.toContain("eyJabc.def.ghi");
    expect(output).not.toContain("password-value");
  });

  it("creates only missing Senior and Outsider users and reuses exact existing emails", async () => {
    const env = completeEnv();
    const listUsers = vi.fn()
      .mockResolvedValueOnce({ data: { users: [{ email: env.CETELE_VERIFY_SENIOR_EMAIL }], nextPage: null }, error: null });
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: "provider-id" } }, error: null });
    const admin = { auth: { admin: { listUsers, createUser } } };

    await expect(ensureBootstrapUsers(admin, env)).resolves.toEqual({ created: 1, reused: 1 });
    expect(createUser).toHaveBeenCalledOnce();
    expect(createUser).toHaveBeenCalledWith({
      email: env.CETELE_VERIFY_OUTSIDER_EMAIL,
      password: env.CETELE_VERIFY_OUTSIDER_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Ağaç dışı kullanıcı" },
    });
  });
});
