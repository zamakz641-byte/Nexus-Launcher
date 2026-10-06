// SPDX-License-Identifier: GPL-3.0-only
// Nexus Replay 0.1.0: standalone JSON-line capture engine. No QML, gallery or updater.
#include "capture/FramePumpWorker.h"
#include "capture/CapturePublisher.h"
#include "core/GameIdentity.h"
#include <QCoreApplication>
#include <QDir>
#include <QFileInfo>
#include <QImage>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QRegularExpression>
#include <QThread>
#include <QTimer>
#include <QSet>
#include <windows.h>
#include <tlhelp32.h>
#include <cstdio>
#include <thread>

static void output(const QJsonObject& value) {
  const QByteArray data = QJsonDocument(value).toJson(QJsonDocument::Compact) + '\n';
  std::fwrite(data.constData(), 1, size_t(data.size()), stdout); std::fflush(stdout);
}
static QString safeTitle(QString title) {
  title = GameIdentity::folderName(title.left(120));
  title.replace(QRegularExpression("[\\x00-\\x1f]"), "_");
  title.remove(QRegularExpression("[. ]+$"));
  if (title.isEmpty() || title == "." || title == ".." ||
      QRegularExpression("^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(?:\\.|$)", QRegularExpression::CaseInsensitiveOption).match(title).hasMatch()) return "Game";
  return title;
}
struct WindowSearch { QSet<DWORD>* pids; HWND window = nullptr; };
static BOOL CALLBACK findWindow(HWND window, LPARAM data) {
  auto* search = reinterpret_cast<WindowSearch*>(data); DWORD pid = 0;
  GetWindowThreadProcessId(window, &pid);
  if (search->pids->contains(pid) && IsWindowVisible(window) && !GetWindow(window, GW_OWNER)) { search->window = window; return FALSE; }
  return TRUE;
}
static void updateChildren(QSet<DWORD>& known) {
  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0); if (snapshot == INVALID_HANDLE_VALUE) return;
  PROCESSENTRY32W row{}; row.dwSize = sizeof(row); QList<QPair<DWORD,DWORD>> rows;
  if (Process32FirstW(snapshot, &row)) do { rows.append({row.th32ProcessID,row.th32ParentProcessID}); } while (Process32NextW(snapshot, &row));
  CloseHandle(snapshot); bool changed;
  do { changed = false; for (const auto& entry : rows) if (known.contains(entry.second) && !known.contains(entry.first)) { known.insert(entry.first); changed = true; } } while (changed);
}

int main(int argc, char** argv) {
  QCoreApplication app(argc, argv);
  app.setApplicationName("Nexus Replay"); app.setApplicationVersion("0.1.0");
  if (app.arguments().contains("--self-test")) {
    output({{"type","self-test"},{"ok",true},{"version","0.1.0"},{"protocol",1},{"license","GPL-3.0-only"}}); return 0;
  }
  const auto option = [&](const QString& name) { const int i=app.arguments().indexOf(name); return i>=0?app.arguments().value(i+1):QString(); };
  const QString data=option("--data"), captures=option("--captures");
  if (!QDir::isAbsolutePath(data) || !QDir::isAbsolutePath(captures) || !QDir().mkpath(data) || !QDir().mkpath(captures)) return 2;
  qputenv("NEXUS_REPLAY_DATA",data.toUtf8());
  qRegisterMetaType<ReplayBufferState::State>(); qRegisterMetaType<QImage>(); qRegisterMetaType<CaptureBorder::SessionPolicy>();
  QThread thread; FramePumpWorker worker; worker.moveToThread(&thread);
  QObject::connect(&thread,&QThread::started,&worker,&FramePumpWorker::onThreadStarted);
  QObject::connect(&thread,&QThread::finished,&worker,&FramePumpWorker::onThreadFinished);
  thread.start();
  quint64 generation=0, sequence=0; ReplayBufferState::State state=ReplayBufferState::Stopped;
  QString title, executable, saveRequest, screenshotRequest; QSet<DWORD> pids;
  HWND target=nullptr; int seconds=30, width=1280, height=720, fps=30, bitrate=6; bool audio=false;
  const auto error=[&](const QString& id,const QString& reason){output({{"type","error"},{"requestId",id},{"code",reason.left(160)}});};
  const auto start=[&]() {
    updateChildren(pids); HWND foreground=GetForegroundWindow(); DWORD pid=0;GetWindowThreadProcessId(foreground,&pid);
    WindowSearch search{&pids}; if (pids.contains(pid)&&IsWindowVisible(foreground)) search.window=foreground;else EnumWindows(findWindow,reinterpret_cast<LPARAM>(&search));
    if (!search.window || search.window==target) return;
    target=search.window;GetWindowThreadProcessId(target,&pid); const auto token=++generation;state=ReplayBufferState::Starting;
    QMetaObject::invokeMethod(&worker,[&,token,pid,window=target,name=title,path=executable,w=width,h=height,f=fps,b=bitrate,s=seconds,a=audio](){
      worker.startPump(token,reinterpret_cast<qulonglong>(window),pid,w,h,f,b,5,s,name,path,a,false,CaptureBorder::SessionPolicy(false));
    },Qt::QueuedConnection);
  };
  QTimer watcher;watcher.setInterval(500);QObject::connect(&watcher,&QTimer::timeout,&app,start);
  QObject::connect(&worker,&FramePumpWorker::bufferStateChanged,&app,[&](quint64 token,ReplayBufferState::State next,const QString& reason){if(token!=generation)return;state=next;output({{"type","buffer-state"},{"state",int(next)},{"reason",reason.left(160)}});});
  QObject::connect(&worker,&FramePumpWorker::restartRequested,&app,[&](quint64 token,const QString&){if(token==generation){target=nullptr;start();}});
  QObject::connect(&worker,&FramePumpWorker::clipSaved,&app,[&](const QString& file,const QString&,const QString&,const QString&){output({{"type","saved"},{"requestId",saveRequest},{"kind","clip"},{"file",file}});saveRequest.clear();});
  QObject::connect(&worker,&FramePumpWorker::clipFailed,&app,[&](const QString&,const QString&){if(!saveRequest.isEmpty())error(saveRequest,"replay-failed");saveRequest.clear();});
  QObject::connect(&worker,&FramePumpWorker::hdrScreenshotReady,&app,[&](quint64 token,quint64,const QImage& image,const QString& game,const QString&){
    if(token!=generation){error(screenshotRequest,"target-changed");screenshotRequest.clear();return;}
    const QString folder=captures+"/"+safeTitle(game)+"/Screenshots";QDir().mkpath(folder);
    const auto reservation=CapturePublisher::reserve(folder,"yyyy-MM-dd_HH-mm-ss-zzz",".png");
    if(reservation.isValid()&&image.save(reservation.pendingPath,"PNG")&&CapturePublisher::publish(reservation)) output({{"type","saved"},{"requestId",screenshotRequest},{"kind","image"},{"file",reservation.finalPath}});
    else {CapturePublisher::discard(reservation);error(screenshotRequest,"screenshot-failed");}screenshotRequest.clear();
  });
  QObject::connect(&worker,&FramePumpWorker::hdrScreenshotFailed,&app,[&](quint64,quint64,const QString&){if(!screenshotRequest.isEmpty())error(screenshotRequest,"screenshot-failed");screenshotRequest.clear();});
  const auto stop=[&](){watcher.stop();pids.clear();target=nullptr;state=ReplayBufferState::Stopped;QMetaObject::invokeMethod(&worker,&FramePumpWorker::stopPump,Qt::QueuedConnection);};
  const auto command=[&](const QJsonObject& message){
    const QString type=message.value("type").toString(),id=message.value("requestId").toString().left(100);
    if(type=="hello") {output({{"type","hello"},{"requestId",id},{"protocol",1},{"version","0.1.0"},{"capabilities",QJsonArray{"start-buffer","stop-buffer","save-replay","screenshot","status"}}});return;}
    if(type=="status") {output({{"type","status"},{"requestId",id},{"state",int(state)}});return;}
    if(type=="start-buffer") {
      const int pid=message.value("pid").toInt();if(pid<=0||!saveRequest.isEmpty()||!screenshotRequest.isEmpty()){error(id,"invalid-session");return;}
      stop();pids.insert(DWORD(pid));title=safeTitle(message.value("title").toString());executable=message.value("executable").toString().left(32768);
      seconds=message.value("seconds").toInt(30);if(!QList<int>{30,60,180,300}.contains(seconds))seconds=30;
      fps=message.value("fps").toInt(30)==60?60:30;width=message.value("width").toInt(1280)==1920?1920:1280;height=width==1920?1080:720;bitrate=width==1920?12:6;audio=message.value("audio").toBool(false);
      watcher.start();start();output({{"type","ack"},{"requestId",id},{"acceptedType",type}});return;
    }
    if(type=="stop-buffer") {stop();output({{"type","ack"},{"requestId",id},{"acceptedType",type}});return;}
    if(type=="save-replay"||type=="screenshot") {
      if(!ReplayBufferState::canSave(state)||!saveRequest.isEmpty()||!screenshotRequest.isEmpty()){error(id,"buffer-unavailable");return;}
      const auto token=generation,request=++sequence;
      if(type=="save-replay"){saveRequest=id;QMetaObject::invokeMethod(&worker,[&,token,request](){worker.saveReplayOnWorker(captures,token,request,request);},Qt::QueuedConnection);}
      else{screenshotRequest=id;QMetaObject::invokeMethod(&worker,[&,token,request](){worker.captureScreenshotOnWorker(token,request);},Qt::QueuedConnection);}return;
    }
    if(type=="shutdown") {stop();app.quit();return;}
    error(id,"unsupported-command");
  };
  std::thread input([&](){char part[4096];QByteArray buffer;while(std::fgets(part,sizeof(part),stdin)) {
    buffer.append(part);if(buffer.size()>65536){buffer.clear();QMetaObject::invokeMethod(&app,[&](){error("","invalid-frame");},Qt::QueuedConnection);continue;}
    if(!buffer.endsWith('\n'))continue;const auto document=QJsonDocument::fromJson(buffer);buffer.clear();
    if(!document.isObject())continue;const auto message=document.object();QMetaObject::invokeMethod(&app,[&,message](){command(message);},Qt::QueuedConnection);if(message.value("type")=="shutdown")return;
  }QMetaObject::invokeMethod(&app,&QCoreApplication::quit,Qt::QueuedConnection);});
  const int result=app.exec();input.join();watcher.stop();
  QMetaObject::invokeMethod(&worker,&FramePumpWorker::stopPump,Qt::BlockingQueuedConnection);thread.quit();thread.wait();return result;
}
