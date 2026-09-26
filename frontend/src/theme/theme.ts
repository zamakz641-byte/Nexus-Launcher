import { z } from "zod";
import type { ThemeId } from "../types";

const themeSchema = z.object({ id: z.enum(["obsidienne", "solaris"]), label: z.string(), documentClass: z.string() });
export type ThemeDefinition = z.infer<typeof themeSchema>;

export const themes: Record<ThemeId, ThemeDefinition> = {
  obsidienne: themeSchema.parse({ id: "obsidienne", label: "Obsidienne", documentClass: "theme-obsidienne" }),
  solaris: themeSchema.parse({ id: "solaris", label: "Solaris", documentClass: "theme-solaris" }),
};
