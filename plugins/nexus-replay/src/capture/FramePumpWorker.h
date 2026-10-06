#pragma once

#include "capture/CaptureBorderState.h"
#include "capture/CapturePublisher.h"
#include "capture/SegmentLease.h"
#include "capture/ReplayBufferState.h"

#include <QObject>
#include <QElapsedTimer>
#include <QString>
#include <QThread>
#include <memory>

class ConfigManager;
class CaptureLocations;
class QImage;
class QTimer;
class ReplayExportTask;

// Auto-armed while a game is foreground (replay.auto, master switch in
// Settings → Replay). On start it captures the current foreground game window
// (gated by capture.mode, same as the screenshot path) via a free-threaded WGC
// Direct3D11CaptureFramePool. The MTA worker feeds rolling H.264 segments and,
// on HDR displays, exposes a tone-mapped BGRA8 frame for one-shot screenshots.
//
// All WinRT/D3D work runs on a dedicated MTA thread (FramePumpWorker): Qt's GUI
// thread is initialised as an STA, which is incompatible with RoInitialize(MTA) and
// the free-threaded frame pool. FramePumpService is the GUI-thread front-end.

// Runs on its own thread; owns all WGC/D3D state (opaque Pipeline, defined in the .cpp).
class FramePumpWorker : public QObject
{
    Q_OBJECT
public:
    explicit FramePumpWorker(QObject* parent = nullptr);
    ~FramePumpWorker() override;

public slots:
    void onThreadStarted();          // RoInitialize(MTA) on this worker thread
    void onThreadFinished();         // ensure stopped + RoUninitialize
    void startPump(quint64 generation, qulonglong hwnd, unsigned long pid, int encodeWidth, int encodeHeight,
                   int fps, int bitrateMbps, int segmentSeconds, int lengthSeconds,
                   const QString& gameName, const QString& executablePath,
                   bool audioEnabled,
                   bool hdrExperimentalEnabled = false,
                   CaptureBorder::SessionPolicy borderPolicy = CaptureBorder::SessionPolicy{}); // build pipeline + start polling/encoding
    void stopPump();                 // stop polling + tear down the pipeline
    void stopPumpForGeneration(quint64 generation);
    // chainId is the CaptureRequest id that started this save; it labels every
    // stage line. requestId stays the owners-table lease token.
    void saveReplayOnWorker(const QString& clipsBaseRoot, quint64 generation,
                            quint64 requestId, quint64 chainId);
    void captureScreenshotOnWorker(quint64 generation, quint64 requestId);
    void prepareForUpdate(quint64 generation);
    void cancelUpdatePreparation();

private slots:
    void poll();                     // one TryGetNextFrame tick

signals:
    void bufferStateChanged(quint64 generation, ReplayBufferState::State state, const QString& reason);
    // Honest capture-border verdict for the session just built (CaptureBorder::State),
    // with the diagnostic detail behind it. Never derived from the setter HRESULT alone.
    void borderStateChanged(quint64 generation, int state, const QString& detail);
    void restartRequested(quint64 generation, const QString& reason);
    // Fired the instant the ring is frozen (~1 s into the hold), before the
    // slower remux — thumbnailPath is a preview grabbed from the freshest
    // completed segment so the "saved" toast can show it right away.
    void clipSaving(const QString& gameName, const QString& thumbnailPath,
                    const QString& executablePath);
    void clipSaved(const QString& clipPath, const QString& gameName,
                   const QString& thumbnailPath, const QString& executablePath);
    void clipFailed(const QString& gameName, const QString& reason);
    void saveRequestFinished(quint64 requestId);
    void hdrScreenshotReady(quint64 generation, quint64 requestId, const QImage& image, const QString& gameName,
                            const QString& executablePath);
    void hdrScreenshotFailed(quint64 generation, quint64 requestId, const QString& reason);
    void exportBusyChanged(bool busy);
    void updateReady(quint64 generation);

private:
    friend class TestReplayThumbnail;
    struct Pipeline;                 // all WGC/D3D pointers + timer + fps state (.cpp)
    void teardown();                 // delete m_pipe (releases everything, reverse order)
    void finishExport();             // join before worker/apartment shutdown
    bool failStep(const char* step, long hr);
    void reportBufferState(ReplayBufferState::State state, const QString& reason = {});
    void checkReplayReadiness();     // low-frequency lifecycle check, outside poll()

    // startPump bring-up, one phase per step, in call order. Each reports its own
    // failure via failStep() and returns false; startPump owns the single
    // `delete pipe` cleanup, so no phase frees anything it did not create.
    bool createDevices(Pipeline* pipe);                        // D3D11 + WinRT bridge
    bool createCaptureItem(Pipeline* pipe, void* hwnd, int* outW, int* outH);
    void attachRecorder(Pipeline* pipe, unsigned long pid, int srcW, int srcH,
                        int encodeWidth, int encodeHeight, int fps, int bitrateMbps,
                        int segmentSeconds, int lengthSeconds, bool audioEnabled);
    bool createSession(Pipeline* pipe, void* hwnd, int srcW, int srcH,
                       bool hdrExperimentalEnabled,
                       const CaptureBorder::SessionPolicy& borderPolicy); // frame pool + session

    // saveReplayOnWorker stages, in call order.
    bool saveGuard(const QString& saveId);                     // preflight: pipe/ring/busy
    SegmentLease freezeRing(const QString& saveId);            // leased snapshot (empty = refused)
    static QString instantThumbnail(const QString& lastSegment, const QString& thumbPath,
                             const QString& saveId);
    void runExport(SegmentLease lease, const CapturePublisher::Reservation& reservation,
                   const QString& thumbPath,
                   const QString& game, const QString& exePath, const QString& saveId, quint64 requestId);

    Pipeline* m_pipe = nullptr;
    bool m_apartmentReady = false;
    quint64 m_pumpGeneration = 0;
    ReplayBufferState::State m_bufferState = ReplayBufferState::Stopped;
    bool m_exportBusy = false;       // one async clip export at a time
    std::unique_ptr<ReplayExportTask> m_exportTask;
    quint64 m_exportGeneration = 0;  // fences callbacks across export shutdown/replacement
    bool m_updatePreparing = false;
    quint64 m_updateGeneration = 0; // request may follow a GUI-side start rejection
    bool m_hdrScreenshotPending = false;
    quint64 m_hdrRequestId = 0;
};

