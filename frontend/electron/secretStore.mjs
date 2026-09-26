import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

export class SecretStore {
  constructor(userData, safeStorage) {
    this.file = join(userData, "steamgrid-secret.bin");
    this.safeStorage = safeStorage;
    this.lastCheck = "unknown";
  }

  available() { return this.safeStorage.isEncryptionAvailable(); }

  async read() {
    if (!this.available()) return "";
    try {
      const ciphertext = await readFile(this.file);
      return this.safeStorage.decryptString(ciphertext);
    } catch { return ""; }
  }

  async status() {
    return { configured: Boolean(await this.read()), storageAvailable: this.available(), lastCheck: this.lastCheck };
  }

  async save(value, validate) {
    const key = String(value || "").trim();
    if (!this.available()) throw new Error("Le stockage chiffré est indisponible sur cet appareil.");
    if (!key || key.length > 256 || /\s/.test(key)) throw new Error("Clé invalide.");
    const check = await validate(key);
    this.lastCheck = check;
    if (check === "invalid") return this.status();
    const encrypted = this.safeStorage.encryptString(key);
    const temporary = `${this.file}.${process.pid}.tmp`;
    await writeFile(temporary, encrypted);
    await rename(temporary, this.file);
    return this.status();
  }

  async clear() {
    if (!this.available()) throw new Error("Le stockage chiffré est indisponible sur cet appareil.");
    const temporary = `${this.file}.${process.pid}.tmp`;
    await writeFile(temporary, Buffer.alloc(0));
    await rename(temporary, this.file);
    this.lastCheck = "unknown";
    return this.status();
  }
}
