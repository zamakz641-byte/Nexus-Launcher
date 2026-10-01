from pathlib import Path
p=Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC\backend\main.py")
s=p.read_text(encoding='utf-8')
old="""    hasFooter: !!footer, footerDisplay: footerStyle ? footerStyle.display : '',
    footerVisibility: footerStyle ? footerStyle.visibility : '',
    footerRect: footerRect ? [footerRect.left, footerRect.top, footerRect.width, footerRect.height] : []
"""
new="""    hasFooter: !!footer, footerDisplay: footerStyle ? footerStyle.display : '',
    footerVisibility: footerStyle ? footerStyle.visibility : '',
    footerOpacity: footerStyle ? footerStyle.opacity : '',
    footerPosition: footerStyle ? footerStyle.position : '',
    footerZ: footerStyle ? footerStyle.zIndex : '',
    footerBg: footerStyle ? footerStyle.backgroundColor : '',
    footerColor: footerStyle ? footerStyle.color : '',
    footerHTML: footer ? footer.innerText.slice(0, 160) : '',
    footerRect: footerRect ? [footerRect.left, footerRect.top, footerRect.width, footerRect.height] : []
"""
if old not in s: raise SystemExit('probe block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('extended footer probe')
