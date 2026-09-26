import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function pickWindowsGamePath(kind) {
  if (process.platform !== "win32") throw new Error("Le sélecteur de fichiers Windows n’est pas disponible.");
  const folder = kind === "collection" || kind === "game";
  const script = folder
    ? `Add-Type -AssemblyName System.Windows.Forms
$picker = New-Object System.Windows.Forms.FolderBrowserDialog
$picker.Description = '${kind === "collection" ? "Choisir une collection de jeux" : "Choisir le dossier du jeu"}'
$picker.ShowNewFolderButton = $false
if ($picker.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($picker.SelectedPath) }`
    : `Add-Type -AssemblyName System.Windows.Forms
$picker = New-Object System.Windows.Forms.OpenFileDialog
$picker.Title = 'Ajouter un jeu'
$picker.Filter = 'Jeux Windows (*.exe)|*.exe'
$picker.CheckFileExists = $true
$picker.Multiselect = $false
if ($picker.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($picker.FileName) }`;
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-STA", "-EncodedCommand", encoded], { windowsHide: true, timeout: 600_000, maxBuffer: 8192 });
  return stdout.trim() || null;
}
