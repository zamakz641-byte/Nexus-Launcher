# Nexus Sound Pack Extensions (.nxsfx)

A `.nxsfx` file is a ZIP archive containing `extension.json` at its root plus the referenced audio files.

Nexus validates every pack before installation. A pack is rejected if any mandatory cue is missing, a path escapes the archive, an audio format is unsupported, or the package is too large.

Mandatory cues: `focus`, `confirm`, `back`, `launch`, `success`, `toggle`, `hover`, `wake`, `sleep`, `startup`.

Supported audio: WAV, OGG, MP3 and M4A.

## Console sound packs

Nexus does **not** redistribute PlayStation, Xbox or Nintendo proprietary UI sounds. A user may import a local pack only when they have the rights to use those files. The official Nexus catalog only lists redistributable packs.

The repository catalog is `extensions/catalog.json`. Nexus project releases should only advertise sound packs whose license permits redistribution.
