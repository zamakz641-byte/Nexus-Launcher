export type Locale = "fr" | "en";
export type ThemeId = "obsidienne" | "solaris";
export type GameId = string;

export interface LocalizedText {
  fr: string;
  en: string;
}

export interface Game {
  id: GameId;
  legacyId?: string;
  title: string;
  description: LocalizedText;
  genre: LocalizedText;
  metadata: string[];
  artwork: string;
  heroArtwork?: string;
  artworkFallbacks?: string[];
  heroArtworkFallbacks?: string[];
  logoArtwork?: string;
  metadataProvider?: string;
  installed: boolean;
  source: "Steam" | "Epic Games" | "GOG" | "Local";
  developer: string;
  publisher: string;
  releaseDate: string;
  ageRating: string;
  playtimeHours: number;
  lastPlayedAt?: string;
  lastPlayed: LocalizedText;
  version: string;
  installSize: string;
  achievementProgress: { unlocked: number; total: number };
  rating: number;
  trailer: { title: LocalizedText; duration: string; url?: string };
  features: LocalizedText[];
  executablePath?: string;
  libraryPath?: string;
  discovered?: boolean;
}

export interface SystemInfo {
  profileName: string;
  libraryRoot: string;
  providers: {
    local: boolean;
    steamStore: boolean;
    steamGridDb: boolean;
  };
}
