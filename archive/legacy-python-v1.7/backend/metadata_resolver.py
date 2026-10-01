from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable


@dataclass(frozen=True)
class MetadataSource:
    """Normalized data produced by one provider.

    The library provider (Steam/Epic/GOG/manual) answers *where the game comes
    from and how to launch it*. Metadata providers answer *what the game is*.
    Keeping those jobs separate lets an Epic game use IGDB text, SteamGridDB
    artwork and a Steam trailer without pretending the game came from Steam.
    """

    name: str
    values: dict[str, Any]
    confidence: float = 1.0


class MetadataResolver:
    """Field-by-field resolver inspired by Playnite's provider pipeline."""

    TEXT_FIELDS = (
        "title",
        "description",
        "developer",
        "publisher",
        "genres",
        "releaseYear",
    )

    # Each field has its own priority.  This is deliberately not one giant
    # global provider order: the best description source is not necessarily the
    # best artwork source.  Media fields are selected by GameEnricher using the
    # same principle.
    DEFAULT_FIELD_ORDER = {
        "title": ("igdb", "steam"),
        "description": ("igdb", "steam"),
        "developer": ("igdb", "steam"),
        "publisher": ("igdb", "steam"),
        "genres": ("igdb", "steam"),
        "releaseYear": ("igdb", "steam"),
    }

    STEAM_FIELD_ORDER = {
        "title": ("steam", "igdb"),
        "description": ("steam", "igdb"),
        "developer": ("steam", "igdb"),
        "publisher": ("steam", "igdb"),
        "genres": ("steam", "igdb"),
        "releaseYear": ("steam", "igdb"),
    }

    def __init__(self, library_source: str):
        self.library_source = (library_source or "manual").lower()

    @staticmethod
    def _meaningful(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, (list, tuple, dict, set)):
            return bool(value)
        if isinstance(value, (int, float)):
            return value != 0
        return True

    def order_for(self, field: str) -> tuple[str, ...]:
        table = self.STEAM_FIELD_ORDER if self.library_source == "steam" else self.DEFAULT_FIELD_ORDER
        return tuple(table.get(field, ("igdb", "steam")))

    def merge(self, game: dict[str, Any], sources: Iterable[MetadataSource]) -> dict[str, Any]:
        result = dict(game)
        candidates = {source.name: source for source in sources}
        provenance = dict(result.get("metadataSources") or {})
        confidence = dict(result.get("metadataConfidence") or {})

        # The library supplied title is an identity key and is intentionally
        # preserved for known stores. Manual imports may receive a canonical
        # provider title because filenames like "game.exe" are often useless.
        preserve_library_title = self.library_source in {"steam", "epic", "gog", "xbox", "ea", "ubisoft"}

        for field in self.TEXT_FIELDS:
            if field == "title" and preserve_library_title and self._meaningful(result.get("title")):
                provenance.setdefault("title", f"library:{self.library_source}")
                confidence.setdefault("title", 1.0)
                continue

            for source_name in self.order_for(field):
                source = candidates.get(source_name)
                if source is None:
                    continue
                value = source.values.get(field)
                if not self._meaningful(value):
                    continue
                result[field] = value
                provenance[field] = source_name
                confidence[field] = round(max(0.0, min(1.0, float(source.confidence))), 3)
                break

        result["metadataSources"] = provenance
        result["metadataConfidence"] = confidence
        return result

    @staticmethod
    def choose_media(
        field: str,
        candidates: dict[str, str],
        library_source: str,
    ) -> tuple[str, str]:
        """Return ``(provider, url)`` using per-media priorities.

        * Cover: community portrait art usually looks best in a launcher.
        * Hero: prefer an official store hero when a high-confidence Steam
          cross-ID exists, then SteamGridDB, then IGDB.
        * Logo: SteamGridDB is purpose-built for transparent logos.
        * Icon: origin/store first, then SteamGridDB.
        """
        source = (library_source or "manual").lower()
        if field == "coverImage":
            order = ("steamgriddb", "igdb", "steam")
        elif field == "heroImage":
            order = ("steam", "steamgriddb", "igdb") if source == "steam" else ("steamgriddb", "steam", "igdb")
        elif field == "logoUrl":
            order = ("steamgriddb", "steam")
        elif field == "iconUrl":
            order = ("origin", "steam", "steamgriddb")
        else:
            order = ("steamgriddb", "steam", "igdb")

        for provider in order:
            url = str(candidates.get(provider) or "").strip()
            if url:
                return provider, url
        return "", ""

    @staticmethod
    def choose_trailer(
        candidates: dict[str, dict[str, Any]],
        library_source: str,
    ) -> tuple[str, dict[str, Any]]:
        """Return ``(provider, trailer)`` using trailer-specific priorities.

        Direct store videos are preferred because Nexus can cache them locally.
        IGDB is used as a cross-store fallback through its YouTube video IDs;
        those are streamed in-app instead of being downloaded.  Keeping the
        trailer resolver separate mirrors the field-by-field metadata pipeline.
        """
        source = (library_source or "manual").lower()
        if source == "steam":
            order = ("steam", "epic", "igdb", "youtube")
        elif source == "epic":
            order = ("epic", "steam", "igdb", "youtube")
        else:
            order = ("steam", "epic", "igdb", "youtube")

        for provider in order:
            item = candidates.get(provider) or {}
            if not isinstance(item, dict):
                continue
            if str(item.get("url") or item.get("embedUrl") or "").strip():
                return provider, item
        return "", {}
