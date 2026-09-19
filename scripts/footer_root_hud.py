from pathlib import Path
p=Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC\src\App.tsx")
s=p.read_text(encoding='utf-8')
line="        <ConsoleFooter show={settings.controllerHints} activeView={activeView} language={settings.language} />\n"
if line not in s: raise SystemExit('footer line not found')
s=s.replace(line,'',1)
marker="      </main>\n\n      <LaunchOverlay"
if marker not in s: raise SystemExit('main marker not found')
s=s.replace(marker,"      </main>\n      <ConsoleFooter show={settings.controllerHints} activeView={activeView} language={settings.language} />\n\n      <LaunchOverlay",1)
p.write_text(s,encoding='utf-8')

f=Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC\src\components\ConsoleFooter.tsx")
t=f.read_text(encoding='utf-8').replace('pointer-events-none absolute bottom-3 left-4 right-6 z-[90]','pointer-events-none fixed bottom-3 left-[218px] right-6 z-[90]')
f.write_text(t,encoding='utf-8')

css=Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC\src\index.css")
c=css.read_text(encoding='utf-8')
c=c.replace('  left: 1rem !important;\n  right: 1.5rem !important;', '  left: 218px !important;\n  right: 1.5rem !important;',1)
c=c.replace('@media (max-width: 1180px) {\n  #nexus-console-footer { left: 1rem !important; }\n}', '@media (max-width: 1180px) {\n  #nexus-console-footer { left: 204px !important; }\n}',1)
css.write_text(c,encoding='utf-8')
print('footer promoted to root HUD layer')
