export type ExtensionCapability = "catalog" | "direct-download" | "torrent-import" | "library-scan";

export interface LibraryExtension {
  id: string;
  name: string;
  description: string;
  capability: ExtensionCapability;
  status: "active" | "available";
  trust: "official" | "user-authorized";
}

export const libraryExtensions: LibraryExtension[] = [
  { id: "local-library", name: "Bibliothèque locale", description: "Analyse les dossiers choisis et détecte les exécutables.", capability: "library-scan", status: "active", trust: "user-authorized" },
  { id: "steam-catalog", name: "Steam officiel", description: "Recherche, métadonnées et liens vers les fiches du magasin.", capability: "catalog", status: "active", trust: "official" },
  { id: "direct-url", name: "Lien direct autorisé", description: "Prévu pour les fichiers HTTPS fournis par un éditeur ou un projet open source.", capability: "direct-download", status: "available", trust: "user-authorized" },
  { id: "torrent-file", name: "Torrent autorisé", description: "Prévu pour importer un .torrent ou magnet dont vous possédez les droits.", capability: "torrent-import", status: "available", trust: "user-authorized" },
];
