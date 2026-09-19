from pathlib import Path
root=Path(r"C:\Users\USER\Downloads\Compressed\NexusLauncher_v1.6.7_STARTUP_SFX_SYNC")
svg=root/'public/branding/nexus-mark.svg'
svg.write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
  <defs>
    <linearGradient id="edge" x1="38" y1="28" x2="221" y2="228" gradientUnits="userSpaceOnUse">
      <stop stop-color="#EAF8FF"/><stop offset=".44" stop-color="#78D9FF"/><stop offset="1" stop-color="#2AAEEA"/>
    </linearGradient>
    <linearGradient id="n" x1="76" y1="78" x2="182" y2="180" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F5FCFF"/><stop offset=".42" stop-color="#85DFFF"/><stop offset="1" stop-color="#42BFF1"/>
    </linearGradient>
  </defs>
  <path d="M128 18 220 71v114l-92 53-92-53V71l92-53Z" stroke="url(#edge)" stroke-width="7" stroke-linejoin="round"/>
  <circle cx="128" cy="128" r="72" stroke="#59CBF7" stroke-width="3" stroke-opacity=".38"/>
  <path d="M78 178V78L178 178V78" stroke="url(#n)" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M78 178V78M178 178V78" stroke="#F3FBFF" stroke-width="4" stroke-linecap="round" stroke-opacity=".72"/>
  <circle cx="128" cy="128" r="7" fill="#F3CC63"/>
</svg>''', encoding='utf-8')

p=root/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('d="M75 177V82l53 46 53-46v95"','d="M78 178V78L178 178V78"')
s=s.replace('d="M75 82v95M181 82v95"','d="M78 178V78M178 178V78"')
p.write_text(s, encoding='utf-8')
print('Nexus N logo corrected in SVG and startup')
