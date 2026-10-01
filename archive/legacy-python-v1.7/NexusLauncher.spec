# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

webview_data = collect_data_files('webview')
webview_hidden = [m for m in collect_submodules('webview') if not any(x in m for x in ('.qt', '.gtk', '.cef'))]

a = Analysis(
    ['nexus_launcher.py'],
    pathex=[],
    binaries=[],
    datas=[('dist', 'dist')] + webview_data,
    hiddenimports=webview_hidden,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'cefpython3'],
    noarchive=False,
    optimize=1,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='NexusLauncher',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
)
