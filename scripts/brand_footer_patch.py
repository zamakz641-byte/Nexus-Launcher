from pathlib import Path
root = Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC")
app = root/'src/App.tsx'
s = app.read_text(encoding='utf-8')
s = s.replace("<ConsoleFooter show={settings.controllerHints} language={settings.language} />", "<ConsoleFooter show={settings.controllerHints} activeView={activeView} language={settings.language} />")
app.write_text(s, encoding='utf-8')
side = root/'src/components/Sidebar.tsx'
s = side.read_text(encoding='utf-8')
s = s.replace('className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_28px_rgba(0,0,0,.28)]"', 'className="nexus-brand-mark relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_28px_rgba(0,0,0,.28)]"')
s = s.replace('src="/branding/nexus.png"', 'src="/branding/nexus-mark.svg"')
s = s.replace('className="h-7 w-7 object-contain drop-shadow-[0_0_12px_rgba(125,211,252,.25)]"', 'className="h-8 w-8 object-contain drop-shadow-[0_0_14px_rgba(125,211,252,.3)]"')
s = s.replace('<div>\n          <div className="text-[13px] font-black tracking-[0.38em] text-white">NEXUS</div>', '<div className="nexus-brand-copy">\n          <div className="text-[13px] font-black tracking-[0.38em] text-white">NEXUS</div>')
side.write_text(s, encoding='utf-8')
print('App + Sidebar patched')
