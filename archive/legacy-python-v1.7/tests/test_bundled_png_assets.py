from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UI_DIR = ROOT / 'public' / 'icons' / 'ui'
PAD_DIR = ROOT / 'public' / 'icons' / 'controller'

UI = [
    'Activity','AlertTriangle','BarChart3','Calendar','CheckCircle2','Clock','Compass','Database','Film',
    'FolderKanban','FolderOpen','FolderPlus','Gamepad2','Gauge','Globe','HardDrive','HardDriveDownload',
    'Heart','Home','Info','KeyRound','Layers3','LayoutGrid','List','LoaderCircle','Lock','Monitor','Palette',
    'Pencil','Play','Plus','Power','RefreshCw','RotateCcw','Save','ScanSearch','Search','Settings','ShieldAlert',
    'ShieldCheck','SlidersHorizontal','Sparkles','Square','Star','Swords','Timer','Trash2','Trophy','User','Users',
    'Volume2','VolumeX','X','Zap',
]
PAD = [
    'ps/cross.png','ps/circle.png','ps/square.png','ps/triangle.png','ps/l1.png','ps/r1.png',
    'xbox/a.png','xbox/b.png','xbox/x.png','xbox/y.png','xbox/lb.png','xbox/rb.png',
    'switch/a.png','switch/b.png','switch/x.png','switch/y.png',
]


def valid_png(path: Path) -> bool:
    return path.is_file() and path.stat().st_size >= 180 and path.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'


def test_release_contains_every_required_png():
    missing = [str(UI_DIR / f'{name}.png') for name in UI if not valid_png(UI_DIR / f'{name}.png')]
    missing += [str(PAD_DIR / rel) for rel in PAD if not valid_png(PAD_DIR / rel)]
    assert not missing, '\n'.join(missing)


def test_runtime_asset_check_has_no_remote_dependency():
    text = (ROOT / 'scripts' / 'fetch_ui_assets.py').read_text(encoding='utf-8')
    assert 'requests.get' not in text
    assert 'raw.githubusercontent.com' not in text
    assert 'PROMPT_ROOT' not in text
    assert 'MATERIAL_ROOT' not in text
