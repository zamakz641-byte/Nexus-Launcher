// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include <QImage>
#include <QSaveFile>
#include <QDir>
#include <QFileInfo>
namespace ThumbnailService {
inline bool saveThumbnail(const QImage& image, const QString& path, const char* format) {
  if (!QDir().mkpath(QFileInfo(path).absolutePath())) return false;
  QSaveFile file(path);
  return file.open(QIODevice::WriteOnly) && image.save(&file, format) && file.commit();
}
}
