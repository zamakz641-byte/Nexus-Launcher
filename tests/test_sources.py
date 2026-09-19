from backend.sources import infer_manual_candidate


def test_split_fiction_nested_unreal_path_uses_game_root():
    c = infer_manual_candidate('/Games/Split Fiction/Engine/Binaries/Win64/SplitFiction-Win64-Shipping.exe')
    assert c['title'] == 'Split Fiction'
    assert c['installDir'].replace('\\', '/').endswith('/Games/Split Fiction')
    assert c['nameCandidates'][0] == 'Split Fiction'


def test_generic_game_exe_uses_meaningful_ancestor():
    c = infer_manual_candidate('/Games/Cyberpunk 2077/bin/x64/game.exe')
    assert c['title'] == 'Cyberpunk 2077'


def test_brand_casing_from_parent_is_preserved():
    c = infer_manual_candidate('/Games/eFootball/eFootball.exe')
    assert c['title'] == 'eFootball'


def test_short_internal_codename_loses_to_parent():
    c = infer_manual_candidate('/Games/Black Myth Wukong/b1.exe')
    assert c['title'] == 'Black Myth Wukong'


def test_short_ancestor_codename_loses_to_descriptive_game_folder():
    c = infer_manual_candidate("/Games/Assassin's Creed Shadows/ASC/Engine/Binaries/Win64/ASC-Win64-Shipping.exe")
    assert c['title'] == "Assassin's Creed Shadows"
    assert c['installDir'].replace('\\', '/').endswith("/Games/Assassin's Creed Shadows")
