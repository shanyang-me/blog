#!/usr/bin/env python3
"""Builds the prompt appendix include from the experiment folder, with paths and class names neutralised.

Usage: python3 tools/build_prompts.py <experiment-dir>
Writes _includes/prompts-agent-built-game-assets.html.
"""
import html
import json
import re
import sys
from pathlib import Path

EXP = Path(sys.argv[1]).expanduser()
OUT = Path(__file__).resolve().parent.parent / '_includes' / 'prompts-agent-built-game-assets.html'

# Private names and paths live in an untracked local file so the public repo never lists them.
PRIVATE = json.loads((Path(__file__).resolve().parent / 'private.local.json').read_text())
SUBS = [(re.compile(pattern), repl) for pattern, repl in PRIVATE['renames']]
BANNED = re.compile('|'.join(re.escape(w) for w in PRIVATE['banned']), re.I)


def clean(text: str) -> str:
    for pattern, repl in SUBS:
        text = pattern.sub(repl, text)
    scan = text
    for phrase in PRIVATE['allow']:
        scan = re.sub(re.escape(phrase), ' ' * len(phrase), scan, flags=re.I)
    hit = BANNED.search(scan)
    if hit:
        raise SystemExit(f'unsanitised text left: {text[max(0, hit.start() - 60):hit.end() + 60]!r}')
    return text.strip()


def block(title: str, note: str, text: str) -> str:
    note_html = f'<p>{html.escape(note)}</p>' if note else ''
    return (f'<details><summary>{html.escape(title)}</summary>{note_html}'
            f'<pre><code>{html.escape(clean(text))}</code></pre></details>')


def main() -> None:
    video = json.loads((EXP / 'out' / 'video-input.json').read_text())
    turntable = video['prompt']
    settings = ', '.join(f'{k} {v}' for k, v in video.items() if k != 'prompt')
    blender = (EXP / 'blender_prompt.md').read_text()
    text_ref = 'There is no reference video for this arm: work from the text only.'
    video_ref = re.search(r'^Reference: .*$', (EXP / 'arm-video' / 'PROMPT.md').read_text(), re.M)
    if not video_ref:
        raise SystemExit('could not find the REFERENCE line in arm-video/PROMPT.md')
    unreal = (EXP / 'unreal' / 'PROMPT.md').read_text() + '\n\n---- second run (art pass) ----\n\n' + \
        (EXP / 'unreal' / 'PROMPT-art.md').read_text()

    blocks = [
        block('Creature description (shared by every route)', '', (EXP / 'creature.txt').read_text()),
        block('Turntable video (Kling v4 on fal)', f'Settings: {settings}.', turntable),
        block('Blender modelling, rigging and animation (both arms)',
              'The two arms differ only in the REFERENCE line. Text-only arm: "' + text_ref
              + '" Video arm: "' + video_ref.group(0) + '"', blender),
        block('Playable three.js game', '', (EXP / 'game' / 'PROMPT.md').read_text()),
        block('First-person rifle and arms', '', (EXP / 'arm-rifle' / 'PROMPT.md').read_text()),
        block('Rigging the Tripo mesh', '', (EXP / 'arm-tripo' / 'PROMPT.md').read_text()),
        block('Unreal Engine 5 arena (greybox run, then art pass)', '', unreal),
        block('Sci-fi level kit (Blender)', '', (EXP / 'arm-level' / 'PROMPT.md').read_text()),
        block('Boss creature (Blender)', '', (EXP / 'arm-boss' / 'PROMPT.md').read_text()),
    ]
    intro = ('<p>Every prompt below is the one the headless runs received, verbatim except that local paths '
             'are shown as <code>&lt;workdir&gt;</code> and two C++ class names lightly renamed. All runs used '
             '<code>claude -p --model claude-fable-5-2</code>.</p>')
    OUT.write_text('{% raw %}\n' + intro + '\n' + '\n'.join(blocks) + '\n{% endraw %}\n')
    print(f'wrote {OUT} ({len(blocks)} blocks)')


if __name__ == '__main__':
    main()
