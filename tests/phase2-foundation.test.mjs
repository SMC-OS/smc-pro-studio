import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("local auth requires at least eight characters and email confirmation", async () => {
  const config = await read("supabase/config.toml");
  assert.match(config, /minimum_password_length = 8/);
  assert.match(config, /enable_confirmations = true/);
  assert.doesNotMatch(config, /maximum_password_length\s*=\s*12/);
});

test("professional categories cannot grant staff roles", async () => {
  const migration = await read("supabase/migrations/20260818194558_identity_profiles_roles.sql");
  assert.match(migration, /create table public\.user_roles/);
  assert.match(migration, /revoke all on public\.user_roles from anon, authenticated/);
  assert.match(migration, /values \(new\.id, 'user', 'Automatically assigned base user role'\)/);
  assert.doesNotMatch(migration, /professional_category[\s\S]{0,100}(admin|owner|moderator)/);
});

test("owner update policies use both USING and WITH CHECK", async () => {
  const identity = await read("supabase/migrations/20260818194558_identity_profiles_roles.sql");
  const deletion = await read("supabase/migrations/20260818194611_visibility_account_deletion.sql");
  assert.match(identity, /create policy profiles_owner_update[\s\S]*?using[\s\S]*?with check/i);
  assert.match(identity, /create policy professional_profiles_owner_update[\s\S]*?using[\s\S]*?with check/i);
  assert.match(deletion, /create policy account_deletion_owner_cancel_request[\s\S]*?using[\s\S]*?with check/i);
});

test("private project storage remains fail closed until project membership exists", async () => {
  const storage = await read("supabase/migrations/20260818194625_storage_foundations.sql");
  assert.match(storage, /'private-project-media', 'private-project-media', false/);
  assert.doesNotMatch(storage, /create policy[\s\S]{0,100}bucket_id = 'private-project-media'/i);
});

test("OAuth providers are disabled by default and secrets are server-only", async () => {
  const env = await read(".env.example");
  assert.match(env, /VITE_SUPABASE_OAUTH_GOOGLE_ENABLED="false"/);
  assert.match(env, /VITE_SUPABASE_OAUTH_APPLE_ENABLED="false"/);
  assert.match(env, /VITE_SUPABASE_OAUTH_FACEBOOK_ENABLED="false"/);
  assert.match(env, /SUPABASE_SECRET_KEY=/);
  assert.doesNotMatch(env, /VITE_SUPABASE_SECRET_KEY/);
});
