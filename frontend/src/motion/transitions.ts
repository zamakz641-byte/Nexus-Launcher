export const primaryRoutes = ["/", "/library", "/search", "/captures", "/settings", "/downloads"] as const;

export const premiumEase = [0.22, 1, 0.36, 1] as const;

export function routeIndex(pathname: string): number {
  const route = pathname.startsWith("/game/") ? "/library" : pathname;
  const index = primaryRoutes.indexOf(route as (typeof primaryRoutes)[number]);
  return index < 0 ? 0 : index;
}

export function routeDirection(previousPath: string, nextPath: string, explicitDirection?: number): -1 | 1 {
  if (explicitDirection === -1 || explicitDirection === 1) return explicitDirection;
  return routeIndex(nextPath) < routeIndex(previousPath) ? -1 : 1;
}

export const routeVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 28, scale: 0.992 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -20, scale: 0.996 }),
};
