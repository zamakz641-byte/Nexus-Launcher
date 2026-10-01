from pathlib import Path
import re
p = Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC\index.html")
s = p.read_text(encoding='utf-8')
s = s.replace('const MINIMUM_VISIBLE_MS = 4600;', 'const MINIMUM_VISIBLE_MS = 2600;')
s = s.replace('const POST_READY_SETTLE_MS = 760;', 'const POST_READY_SETTLE_MS = 360;')
s = s.replace('const UNDERLAY_PAINT_MS = 560;', 'const UNDERLAY_PAINT_MS = 300;')
s = s.replace('const EXIT_MS = 660;', 'const EXIT_MS = 460;')
old = '<div class="nexus-boot-mark-wrap"><img class="nexus-boot-logo" src="/branding/nexus.png" alt="" draggable="false" /></div>'
new = '''<div class="nexus-boot-mark-wrap" aria-hidden="true">
          <svg class="nexus-boot-symbol" viewBox="0 0 256 256" fill="none">
            <path class="nexus-boot-hex" d="M128 18 220 71v114l-92 53-92-53V71l92-53Z"/>
            <circle class="nexus-boot-orbit" cx="128" cy="128" r="72"/>
            <path class="nexus-boot-n" d="M75 177V82l53 46 53-46v95"/>
            <path class="nexus-boot-pillars" d="M75 82v95M181 82v95"/>
            <circle class="nexus-boot-node" cx="128" cy="128" r="8"/>
          </svg>
          <span class="nexus-boot-mark-flare"></span>
        </div>'''
if old not in s:
    raise SystemExit('boot mark markup not found')
s = s.replace(old, new)
s = s.replace('animation: nexusBootCenter 980ms cubic-bezier(.16,1,.3,1) 90ms forwards;', 'animation: nexusBootCenter 720ms cubic-bezier(.16,1,.3,1) 80ms forwards;')
s = s.replace('animation: nexusBootGrid 2500ms cubic-bezier(.16,1,.3,1) 120ms forwards;', 'animation: nexusBootGrid 1900ms cubic-bezier(.16,1,.3,1) 80ms forwards;')
s = s.replace('animation: nexusBootRingC 3200ms cubic-bezier(.16,1,.3,1) 240ms forwards;', 'animation: nexusBootRingC 2200ms cubic-bezier(.16,1,.3,1) 170ms forwards;')
p.write_text(s, encoding='utf-8')
print('startup timing + markup patched')
