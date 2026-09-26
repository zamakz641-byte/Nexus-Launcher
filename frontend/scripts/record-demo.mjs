import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputDir = resolve(root, "artifacts", "demo");
const rawDir = resolve(outputDir, "raw");
const outputPath = resolve(outputDir, "Nexus-Launcher-V2-Demo.webm");
mkdirSync(rawDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--disable-gpu", "--hide-scrollbars"],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  locale: "fr-FR",
  reducedMotion: "no-preference",
  recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
});

const page = await context.newPage();
page.setDefaultTimeout(12_000);
await page.addInitScript(() => localStorage.removeItem("nexus.onboarding.complete.v1"));

const wait = (milliseconds) => page.waitForTimeout(milliseconds);

async function chapter(kicker, title, duration = 1700) {
  await page.evaluate(({ kicker, title, duration }) => new Promise((resolveChapter) => {
    document.getElementById("nexus-demo-chapter")?.remove();
    const card = document.createElement("div");
    card.id = "nexus-demo-chapter";
    card.innerHTML = `<small>${kicker}</small><strong>${title}</strong><i></i>`;
    Object.assign(card.style, {
      position: "fixed", zIndex: "99999", left: "5.3vw", bottom: "5.4vh",
      display: "grid", gap: "7px", minWidth: "340px", padding: "18px 22px 19px",
      color: "#f3f0e9", background: "rgba(4,9,14,.82)", borderLeft: "3px solid #9fd5ff",
      boxShadow: "0 22px 70px rgba(0,0,0,.46)", backdropFilter: "blur(18px)",
      fontFamily: "Segoe UI, Arial, sans-serif", pointerEvents: "none",
    });
    const small = card.querySelector("small");
    const strong = card.querySelector("strong");
    const line = card.querySelector("i");
    Object.assign(small.style, { color: "#9fd5ff", fontSize: "11px", fontWeight: "750", letterSpacing: ".25em" });
    Object.assign(strong.style, { fontSize: "27px", fontWeight: "400", letterSpacing: ".01em" });
    Object.assign(line.style, { width: "100%", height: "1px", marginTop: "5px", background: "linear-gradient(90deg,#9fd5ff,transparent)" });
    document.body.append(card);
    card.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
    window.setTimeout(() => {
      const animation = card.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-6px)" }], { duration: 280, easing: "ease-in", fill: "forwards" });
      animation.finished.then(() => { card.remove(); resolveChapter(); });
    }, duration);
  }), { kicker, title, duration });
}

await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.locator(".onboarding").waitFor();
await chapter("NEXUS LAUNCHER V2", "Démonstration produit", 2200);
await wait(900);

await page.getByRole("button", { name: "Continuer" }).click();
await wait(1700);
await page.getByRole("button", { name: "Continuer" }).click();
await wait(1700);
await page.getByRole("button", { name: "Entrer dans Nexus" }).click();
await page.locator(".onboarding").waitFor({ state: "detached" });
await page.getByRole("heading", { name: "ASTRA VEIL" }).waitFor();

await chapter("01 — ACCUEIL", "Une bibliothèque cinématique");
await wait(1300);
await page.keyboard.press("ArrowRight");
await page.getByRole("heading", { name: "EMBERFALL" }).waitFor();
await wait(1350);
await page.keyboard.press("ArrowRight");
await page.getByRole("heading", { name: "NOVA TIDE" }).waitFor();
await wait(1350);
await page.keyboard.press("ArrowLeft");
await page.keyboard.press("ArrowLeft");
await page.getByRole("heading", { name: "ASTRA VEIL" }).waitFor();
await wait(950);

await page.getByRole("button", { name: "Plus d’options" }).click();
await page.locator(".game-detail-screen").waitFor();
await chapter("02 — FICHE JEU", "Tout comprendre avant de jouer");
await wait(1700);
await page.getByRole("button", { name: "Médias" }).click();
await wait(1000);
await page.locator(".game-detail__media").click();
await page.locator(".trailer-dialog").waitFor();
await chapter("03 — NEXUS CINEMA", "Trailers intégrés et immersifs", 1500);
await wait(1900);
await page.getByRole("button", { name: "Mettre en pause" }).click();
await wait(650);
await page.getByRole("button", { name: "Lire" }).click();
await wait(1200);
await page.getByRole("button", { name: "Fermer" }).click();
await page.getByRole("button", { name: "Succès" }).click();
await wait(1500);

await page.getByRole("link", { name: "Bibliothèque" }).click();
await page.getByRole("heading", { name: "Bibliothèque" }).waitFor();
await chapter("04 — BIBLIOTHÈQUE", "Tous les mondes, une seule collection");
await page.locator(".library-entry").nth(2).hover();
await wait(1700);

await page.getByRole("link", { name: "Recherche" }).click();
await page.getByRole("heading", { name: "Recherche" }).waitFor();
await chapter("05 — RECHERCHE", "Retrouver un jeu instantanément", 1300);
await page.getByPlaceholder("Titre, genre ou action…").fill("nova");
await page.getByRole("button", { name: /NOVA TIDE/ }).waitFor();
await wait(1700);

await page.getByRole("button", { name: "Paramètres" }).click();
await page.getByRole("heading", { name: "Paramètres" }).waitFor();
await chapter("06 — CENTRE DE CONTRÔLE", "Une expérience entièrement configurable");
await page.locator(".settings-nav").getByRole("button", { name: "Bibliothèques" }).click();
await wait(1600);
await page.locator(".settings-nav").getByRole("button", { name: "Métadonnées" }).click();
await wait(1900);
await page.locator(".settings-nav").getByRole("button", { name: "Médias & trailers" }).click();
await wait(1600);
await page.locator(".settings-nav").getByRole("button", { name: "Interface" }).click();
await page.getByRole("button", { name: "Solaris" }).click();
await wait(1700);
await page.getByRole("button", { name: "Obsidienne" }).click();
await wait(900);

await page.getByRole("link", { name: "Accueil", exact: true }).click();
await page.getByRole("heading", { name: "ASTRA VEIL" }).waitFor();
await chapter("NEXUS", "Votre univers. Un seul passage.", 2600);
await wait(700);

const video = page.video();
await context.close();
if (!video) throw new Error("La capture vidéo Playwright n'a pas été créée.");
await video.saveAs(outputPath);
await browser.close();
console.log(outputPath);
