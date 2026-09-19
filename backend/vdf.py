from __future__ import annotations

import re
from typing import Any

_TOKEN = re.compile(r'"((?:\\.|[^"\\])*)"|([{}])', re.S)


def _unescape(value: str) -> str:
    return value.replace('\\\\', '\\').replace('\\"', '"')


def parse_vdf(text: str) -> dict[str, Any]:
    """Parse Valve's simple KeyValues/VDF format into nested dictionaries.

    Comments and bare tokens are intentionally ignored; Steam library/app manifests
    use quoted keys/values for the fields Nexus needs.
    """
    tokens: list[str] = []
    for match in _TOKEN.finditer(text):
        if match.group(1) is not None:
            tokens.append(_unescape(match.group(1)))
        else:
            tokens.append(match.group(2))

    root: dict[str, Any] = {}
    stack: list[dict[str, Any]] = [root]
    pending_key: str | None = None
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token == '}':
            if len(stack) > 1:
                stack.pop()
            pending_key = None
            i += 1
            continue
        if token == '{':
            if pending_key is not None:
                child: dict[str, Any] = {}
                stack[-1][pending_key] = child
                stack.append(child)
                pending_key = None
            i += 1
            continue

        if pending_key is None:
            pending_key = token
        else:
            # If the next token is an opening brace, keep the key pending.
            if i + 1 < len(tokens) and tokens[i + 1] == '{':
                # current token is actually a new key after a malformed sequence.
                stack[-1][pending_key] = token
                pending_key = None
            else:
                stack[-1][pending_key] = token
                pending_key = None
        i += 1

    return root


def get_root(payload: dict[str, Any]) -> dict[str, Any]:
    if len(payload) == 1:
        only = next(iter(payload.values()))
        if isinstance(only, dict):
            return only
    return payload
