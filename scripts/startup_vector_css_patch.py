from pathlib import Path
import re
p = Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC\index.html")
s = p.read_text(encoding='utf-8')
pattern = re.compile(r"\n      \.nexus-boot-logo \{.*?\n      \}\n", re.S)
replacement = r'''
      .nexus-boot-symbol {
        width: 80px;
        height: 80px;
        overflow: visible;
        filter: drop-shadow(0 0 22px rgba(76,196,255,.14));
      }
      .nexus-boot-hex, .nexus-boot-orbit, .nexus-boot-n, .nexus-boot-pillars {
        vector-effect: non-scaling-stroke;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .nexus-boot-hex { stroke: #83dcff; stroke-width: 7; stroke-dasharray: 610; stroke-dashoffset: 610; }
      .nexus-boot-orbit { stroke: rgba(89,203,247,.56); stroke-width: 3; stroke-dasharray: 460; stroke-dashoffset: 460; }
      .nexus-boot-n { stroke: #58cafa; stroke-width: 17; stroke-dasharray: 330; stroke-dashoffset: 330; }
      .nexus-boot-pillars { stroke: rgba(235,250,255,.92); stroke-width: 5; stroke-dasharray: 210; stroke-dashoffset: 210; }
      .nexus-boot-node { fill: #f3cc63; opacity: 0; transform-origin: 128px 128px; transform: scale(.1); }
      .nexus-boot-mark-flare {
        position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; border-radius: 99px;
        transform: translate(-50%,-50%) scale(.2); opacity: 0; background: #fff6c8;
        box-shadow: 0 0 24px 8px rgba(243,204,99,.28), 0 0 48px 18px rgba(72,196,246,.12);
      }
'''
s, n = pattern.subn('\n'+replacement+'\n', s, count=1)
if n != 1: raise SystemExit(f'logo css replacement failed: {n}')
# inject element animation rules after mark pseudo animation section
needle = "      html.nexus-boot-live .nexus-boot-mark-wrap::after {\n        animation: nexusBootMark 1750ms cubic-bezier(.16,1,.3,1) 320ms forwards;\n      }\n"
insert = needle + """      html.nexus-boot-live .nexus-boot-hex { animation: nexusBootDraw .82s .12s cubic-bezier(.16,1,.3,1) forwards; }\n      html.nexus-boot-live .nexus-boot-orbit { animation: nexusBootDraw .72s .30s cubic-bezier(.16,1,.3,1) forwards; }\n      html.nexus-boot-live .nexus-boot-n { animation: nexusBootDraw .62s .54s cubic-bezier(.16,1,.3,1) forwards; }\n      html.nexus-boot-live .nexus-boot-pillars { animation: nexusBootDraw .46s .72s cubic-bezier(.16,1,.3,1) forwards; }\n      html.nexus-boot-live .nexus-boot-node { animation: nexusBootNode .42s 1.04s cubic-bezier(.16,1,.3,1) forwards; }\n      html.nexus-boot-live .nexus-boot-mark-flare { animation: nexusBootFlare .56s 1.00s cubic-bezier(.16,1,.3,1) both; }\n      html.nexus-boot-live .nexus-boot-wordmark { animation: nexusBootWord .52s 1.02s cubic-bezier(.16,1,.3,1) both; }\n      html.nexus-boot-live .nexus-boot-tagline { animation: nexusBootWord .46s 1.24s cubic-bezier(.16,1,.3,1) both; }\n"""
if needle not in s: raise SystemExit('animation needle not found')
s = s.replace(needle, insert, 1)
# append keyframes before reduced motion
needle2 = "      @media (prefers-reduced-motion: reduce) {"
keys = """      @keyframes nexusBootDraw { to { stroke-dashoffset: 0; } }\n      @keyframes nexusBootNode { 0% { opacity: 0; transform: scale(.1); } 72% { opacity: 1; transform: scale(1.35); } 100% { opacity: 1; transform: scale(1); } }\n      @keyframes nexusBootFlare { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.15); } 45% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%,-50%) scale(7); } }\n      @keyframes nexusBootWord { from { opacity: 0; transform: translateY(6px); letter-spacing: .56em; } to { opacity: 1; transform: translateY(0); } }\n\n"""
if needle2 not in s: raise SystemExit('reduced motion marker not found')
s = s.replace(needle2, keys + needle2, 1)
# wordmark/tagline begin hidden so their own animation matters
s = s.replace('      .nexus-boot-wordmark {\n        margin-top: 18px;', '      .nexus-boot-wordmark {\n        margin-top: 18px;\n        opacity: 0;')
s = s.replace('      .nexus-boot-tagline {\n        margin-top: 9px;', '      .nexus-boot-tagline {\n        margin-top: 9px;\n        opacity: 0;')
p.write_text(s, encoding='utf-8')
print('startup vector animation CSS patched')
