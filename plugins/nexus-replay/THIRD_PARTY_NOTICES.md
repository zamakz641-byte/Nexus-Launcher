# Third-party notices

Nexus Replay and its copied/modified GameHQ core are GPL-3.0-only. Copyright and
license notices are preserved in the source package. The immutable source origin
and changes are documented in `UPSTREAM.json` and `README.md`.

The downloadable package contains dynamically linked, replaceable Qt 6.8.3 Core
and Gui libraries under LGPL-3.0 and their applicable third-party licenses. It
contains MinGW-w64/GCC 13.1 runtime libraries with their upstream runtime exceptions.
No Qt Multimedia/FFmpeg runtime is included.

- Qt licensing: https://doc.qt.io/qt-6/licensing.html
- Exact Qt base source: https://download.qt.io/archive/qt/6.8/6.8.3/submodules/qtbase-everywhere-src-6.8.3.zip
- LGPL 3: https://www.gnu.org/licenses/lgpl-3.0.html
- GCC sources/license: https://gcc.gnu.org/releases/gcc-13.1.0/ and https://gcc.gnu.org/onlinedocs/libstdc++/manual/license.html
- MinGW-w64 sources/license: https://www.mingw-w64.org/about/

The release includes a corresponding Nexus Replay source package with the exact
engine source, modifications, build scripts, upstream notices and dependency
versions. These runtime libraries remain separate DLLs, replaceable by users.
