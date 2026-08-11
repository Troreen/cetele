import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROLES = ["subject", "direct", "senior", "peer", "outsider"];
const BOOTSTRAP_USERS = {
  senior: "Üst mentor",
  outsider: "Ağaç dışı kullanıcı",
};

function parseValue(raw, lineNumber) {
  const value = raw.trim();
  if (value.startsWith('"')) {
    try { return JSON.parse(value); }
    catch { throw new Error(`Invalid double-quoted value on .env.local line ${lineNumber}.`); }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'")) throw new Error(`Invalid single-quoted value on .env.local line ${lineNumber}.`);
    return value.slice(1, -1);
  }
  return value.replace(/(?:^|\s+)#.*$/, "").trim();
}

export function parseEnvText(text) {
  const env = {};
  for (const [index, line] of String(text).split(/\r?\n/).entries()) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) throw new Error(`Unsupported .env.local syntax on line ${index + 1}.`);
    const [, name, raw] = match;
    if (Object.hasOwn(env, name)) throw new Error(`Duplicate ${name} in .env.local.`);
    env[name] = parseValue(raw, index + 1);
  }
  return env;
}

function serializeValue(value) {
  return /^[A-Za-z0-9@._:/-]+$/.test(value) ? value : JSON.stringify(value);
}

export function updateEnvText(text, additions) {
  const existing = parseEnvText(text);
  const replacements = new Map();
  const appended = [];
  for (const [name, value] of Object.entries(additions)) {
    if (Object.hasOwn(existing, name)) {
      if (existing[name] === value) continue;
      if (existing[name] !== "") throw new Error(`Refusing to overwrite ${name} in .env.local.`);
      replacements.set(name, value);
      continue;
    }
    appended.push(`${name}=${serializeValue(value)}`);
  }
  let updated = String(text).replace(/^([ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*)(.*)$/gm, (line, prefix, name, raw) => {
    if (!replacements.has(name)) return line;
    const comment = raw.trimStart().startsWith("#") ? ` ${raw.trimStart()}` : "";
    return `${prefix}${serializeValue(replacements.get(name))}${comment}`;
  });
  if (!appended.length) return updated;
  const separator = updated.endsWith("\n") || updated.endsWith("\r") ? "\n" : "\n\n";
  updated = `${updated}${separator}${appended.join("\n")}\n`;
  return updated;
}

function identityNames(role) {
  const prefix = `CETELE_VERIFY_${role.toUpperCase()}`;
  return { emailName: `${prefix}_EMAIL`, passwordName: `${prefix}_PASSWORD` };
}

export function prepareIdentityEnv(env, random = randomBytes) {
  const additions = {};
  const generatedRoles = [];
  const adapter = env.NEXT_PUBLIC_CETELE_DATA_ADAPTER?.trim();
  if (adapter && adapter !== "local") throw new Error("NEXT_PUBLIC_CETELE_DATA_ADAPTER must remain local while preparing hosted verification.");
  if (!adapter) additions.NEXT_PUBLIC_CETELE_DATA_ADAPTER = "local";

  for (const role of ROLES) {
    const { emailName, passwordName } = identityNames(role);
    const hasEmail = Boolean(env[emailName]?.trim());
    const hasPassword = Boolean(env[passwordName]);
    if (hasEmail !== hasPassword) throw new Error(`${emailName} and ${passwordName} must both be present or both be missing.`);
    if (hasEmail) continue;
    additions[emailName] = `cetele-verify-${role}-${random(8).toString("hex")}@example.invalid`;
    additions[passwordName] = random(24).toString("base64url");
    generatedRoles.push(role);
  }
  return { additions, generatedRoles };
}

function assertServiceRoleSecret(secret) {
  if (secret.startsWith("sb_secret_") && secret.length > "sb_secret_".length) return;
  if (secret.split(".").length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(secret.split(".")[1], "base64url").toString("utf8"));
      if (payload.role === "service_role") return;
    } catch { /* handled by the generic failure below */ }
  }
  throw new Error("SUPABASE_SECRET_KEY must contain a service-role secret key.");
}

export function loadPreparationConfig(env) {
  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = env.SUPABASE_SECRET_KEY?.trim();
  if (!rawUrl) throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  if (!secret) throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY");
  let url;
  try { url = new URL(rawUrl); }
  catch { throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS project URL."); }
  if (url.protocol !== "https:") throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS.");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must contain only the HTTPS project origin.");
  }
  assertServiceRoleSecret(secret);
  if (env.NEXT_PUBLIC_CETELE_DATA_ADAPTER?.trim() !== "local") {
    throw new Error("NEXT_PUBLIC_CETELE_DATA_ADAPTER must remain local while preparing hosted verification.");
  }

  const identities = {};
  for (const role of ROLES) {
    const { emailName, passwordName } = identityNames(role);
    const email = env[emailName]?.trim().toLowerCase();
    const password = env[passwordName];
    if (!email || !password) throw new Error(`Missing hosted verification credential pair: ${role}.`);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error(`${emailName} must be an email address.`);
    if (password.length < 16) throw new Error(`${passwordName} must contain at least 16 characters.`);
    identities[role] = { email, password };
  }
  if (new Set(Object.values(identities).map(({ email }) => email)).size !== ROLES.length) {
    throw new Error("Each hosted verification identity must use a distinct email address.");
  }
  return { url: url.origin, secret, identities };
}

export function redact(value, secrets = []) {
  let output = String(value ?? "");
  for (const secret of [...secrets].filter((item) => item && item.length >= 8).sort((a, b) => b.length - a.length)) {
    output = output.split(secret).join("[REDACTED]");
  }
  return output
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[REDACTED_ID]")
    .replace(/\b(?:sb_(?:secret|publishable)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[REDACTED_TOKEN]")
    .replace(/(bearer\s+)[A-Za-z0-9._~-]+/gi, "$1[REDACTED_TOKEN]");
}

async function existingEmails(admin) {
  const emails = new Set();
  let page = 1;
  do {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) if (user.email) emails.add(user.email.trim().toLowerCase());
    page = data.nextPage;
  } while (page);
  return emails;
}

export async function ensureBootstrapUsers(admin, envOrIdentities) {
  const identities = envOrIdentities.senior
    ? envOrIdentities
    : Object.fromEntries(ROLES.map((role) => {
      const { emailName, passwordName } = identityNames(role);
      return [role, { email: envOrIdentities[emailName].trim().toLowerCase(), password: envOrIdentities[passwordName] }];
    }));
  const emails = await existingEmails(admin);
  let created = 0;
  let reused = 0;
  for (const [role, name] of Object.entries(BOOTSTRAP_USERS)) {
    const identity = identities[role];
    if (emails.has(identity.email)) {
      reused += 1;
      continue;
    }
    const { error } = await admin.auth.admin.createUser({
      email: identity.email,
      password: identity.password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw new Error(`Could not create ${role} bootstrap user: ${error.message}`);
    emails.add(identity.email);
    created += 1;
  }
  return { created, reused };
}

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  let source;
  try { source = await readFile(envPath, "utf8"); }
  catch (error) {
    if (error?.code === "ENOENT") throw new Error("Missing .env.local. Copy .env.example first and add the hosted project URL and secret.");
    throw error;
  }
  const parsed = parseEnvText(source);
  const { additions, generatedRoles } = prepareIdentityEnv(parsed);
  const env = { ...parsed, ...additions };
  const config = loadPreparationConfig(env);
  const updated = updateEnvText(source, additions);
  if (updated !== source) await writeFile(envPath, updated, "utf8");
  const secrets = [config.secret, ...Object.values(config.identities).flatMap(({ email, password }) => [email, password])];
  try {
    const admin = createClient(config.url, config.secret, { auth: { autoRefreshToken: false, persistSession: false } });
    const result = await ensureBootstrapUsers(admin, config.identities);
    console.log(`Hosted verification preparation complete: generated ${generatedRoles.length} credential pair(s), created ${result.created} bootstrap user(s), reused ${result.reused}.`);
  } catch (error) {
    throw new Error(redact(error instanceof Error ? error.message : error, secrets));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) {
    console.error(redact(error instanceof Error ? error.message : error));
    process.exitCode = 1;
  }
}
