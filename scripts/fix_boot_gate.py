from pathlib import Path

root = Path(__file__).resolve().parents[1]
native = root / 'src' / 'services' / 'native.ts'
text = native.read_text(encoding='utf-8')
old = """  if (snapshot) {\n    window.__nexusBootStatus?.('Connexion au pont natif…');\n    await waitForNative(14000);\n    return snapshot;\n  }\n"""
new = """  if (snapshot) {\n    // The local HTTP snapshot is enough to render a complete first frame.\n    // Do not keep the whole UI hidden while pywebview finishes injecting its bridge.\n    // Native actions already call nativeApi(), which retries the bridge on demand.\n    window.__nexusBootStatus?.('Préparation de la bibliothèque…');\n    void waitForNative(14000).catch(() => undefined);\n    return snapshot;\n  }\n"""
if old not in text:
    raise SystemExit('snapshot gate block not found')
native.write_text(text.replace(old, new, 1), encoding='utf-8')

main = root / 'backend' / 'main.py'
text = main.read_text(encoding='utf-8')
text = text.replace('time.sleep(2.0)', 'time.sleep(6.5)', 1)
old_js = """                        window.evaluate_js(r'''(() => {\n  const html = document.documentElement;\n  html.classList.add('nexus-app-visible');\n  html.classList.remove('nexus-app-underlay', 'nexus-boot-handoff');\n  html.dataset.nexusBoot = 'complete';\n  document.getElementById('nexus-boot')?.remove();\n  const root = document.getElementById('root');\n  if (root) { root.style.visibility = 'visible'; root.style.opacity = '1'; }\n})()''')\n"""
new_js = """                        window.evaluate_js(r'''(() => {\n  if (typeof window.__nexusBootForceReveal === 'function') {\n    window.__nexusBootForceReveal();\n    return;\n  }\n  const html = document.documentElement;\n  html.classList.add('nexus-app-visible');\n  html.dataset.nexusBoot = 'complete';\n  document.getElementById('nexus-boot')?.remove();\n})()''')\n"""
if old_js not in text:
    raise SystemExit('self-heal js block not found')
main.write_text(text.replace(old_js, new_js, 1), encoding='utf-8')
print('boot gate fixed')
