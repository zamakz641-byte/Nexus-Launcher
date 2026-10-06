import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {execFileSync} from 'node:child_process';
const upstream=resolve(process.argv[2]||'artifacts/research/GameHQ');
const destination=resolve(import.meta.dirname,'../../plugins/nexus-replay');
const revision='d42bff9df9201744154a2990d68e2b13b07031b1';
if(execFileSync('git',['-C',upstream,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==revision)throw Error('Upstream revision mismatch');
const files=['capture/AudioCapture.cpp','capture/AudioCapture.h','capture/CaptureBorderState.cpp','capture/CaptureBorderState.h','capture/CapturePublisher.cpp','capture/CapturePublisher.h','capture/CaptureUtil.h','capture/HdrCapabilities.cpp','capture/HdrCapabilities.h','capture/ReplayBufferState.cpp','capture/ReplayBufferState.h','capture/ReplayExporter.cpp','capture/ReplayExporter.h','capture/ReplayExportTask.h','capture/SegmentLease.cpp','capture/SegmentLease.h','capture/SegmentRecorder.cpp','capture/SegmentRecorder.h','capture/wgc_shims.h','capture/wasapi_shims.h','capture/hdr/GpuToneMapper.cpp','capture/hdr/GpuToneMapper.h','capture/hdr/HdrStateResolver.h','capture/hdr/HdrToneMapMath.cpp','capture/hdr/HdrToneMapMath.h','core/GameIdentity.cpp','core/GameIdentity.h'];
for(const file of files){const target=join(destination,'src',file);await mkdir(dirname(target),{recursive:true});await copyFile(join(upstream,'src',file),target);}
await copyFile(join(upstream,'LICENSE'),join(destination,'LICENSE'));
let header=await readFile(join(upstream,'src/capture/FramePumpService.h'),'utf8');
header=header.slice(0,header.indexOf('// GUI-thread owner:'));
header=header.replace(/^#include "(?:capture\/(?:CaptureRequest|ReplayBufferOwners)\.h|games\/GameDetector\.h)"\r?\n/gm,'');
await writeFile(join(destination,'src/capture/FramePumpWorker.h'),header);
let worker=await readFile(join(upstream,'src/capture/FramePumpService.cpp'),'utf8');
worker=worker.slice(0,worker.indexOf('// ===========================================================================\n//  FramePumpService — GUI-thread front-end'));
// Upstream uses LF; refuse a failed split rather than silently vendor its UI.
if(worker.includes('FramePumpService::FramePumpService'))throw Error('Unexpected upstream worker boundary');
worker=worker.replace('"capture/FramePumpService.h"','"capture/FramePumpWorker.h"').replace(/^#include "(?:config\/(?:ConfigKeys|CaptureLocations|ConfigManager)\.h|games\/GameDetector\.h)"\r?\n/gm,'');
// The same safe BGRA readback also serves SDR screenshots in the headless engine.
worker=worker.replace('if (!m_pipe || !m_pipe->hdrToneMapActive)', 'if (!m_pipe)').replace('if (!skipFrame && m_pipe->hdrToneMapActive)', 'if (!skipFrame)');
await writeFile(join(destination,'src/capture/FramePumpWorker.cpp'),worker.replace('Paths::thumbnailsDir(),','QFileInfo(reservation.finalPath).absolutePath(),'));
await writeFile(join(destination,'UPSTREAM.json'),JSON.stringify({project:'GameHQ',repository:'https://github.com/UnderFusion/GameHQ',version:'0.7.9',commit:revision,license:'GPL-3.0-only',files},null,2)+'\n');
console.log(`Vendored ${files.length} unchanged files and the derived worker. GPL source stays separate from the host.`);
