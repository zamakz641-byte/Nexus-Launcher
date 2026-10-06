// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include <QString>
#include <QDir>
namespace Paths {
inline QString replayCacheDir() { return QDir::cleanPath(qEnvironmentVariable("NEXUS_REPLAY_DATA") + "/buffer"); }
inline QString thumbnailsDir() { return QDir::cleanPath(qEnvironmentVariable("NEXUS_REPLAY_DATA") + "/thumbnails"); }
}
