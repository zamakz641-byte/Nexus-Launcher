import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SecretStore } from "../electron/secretStore.mjs";

const fakeEncryption = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(value.split("").reverse().join("")),
  decryptString: (value) => value.toString().split("").reverse().join(""),
};

test("only encrypted bytes persist and status never exposes the secret", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-secret-"));
  const store = new SecretStore(profile, fakeEncryption);
  const key = "dummy-private-value";
  const status = await store.save(key, async () => "valid");
  assert.equal(status.configured, true);
  assert.equal(JSON.stringify(status).includes(key), false);
  assert.equal((await readFile(store.file)).includes(key), false);
  const reopened = new SecretStore(profile, fakeEncryption);
  assert.equal(await reopened.read(), key);
  assert.equal((await reopened.clear()).configured, false);
});

test("invalid values and missing encryption cannot be stored", async () => {
  const profile = await mkdtemp(join(tmpdir(), "nexus-secret-"));
  const store = new SecretStore(profile, fakeEncryption);
  assert.equal((await store.save("dummy", async () => "invalid")).configured, false);
  await assert.rejects(store.save("", async () => "valid"), /invalide/);
  const unavailable = new SecretStore(profile, { isEncryptionAvailable: () => false });
  await assert.rejects(unavailable.save("dummy", async () => "valid"), /indisponible/);
  assert.equal((await unavailable.status()).storageAvailable, false);
});
