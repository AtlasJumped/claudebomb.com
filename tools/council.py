#!/usr/bin/env python3
"""The claudebomb council (planned, not running yet).

Setup (once, then monthly): each seat writes how it is best prompted, from its
maker's guide, and the other seats critique it. Saved to
prompts/council/profiles.json, so every seat knows the others' strengths and
weaknesses. Measured results from real runs are added over time.

Round 1, for everyone: gather every free public version of one prompt (ours
plus the open library), let each seat review them alone, debate once, and have
a chair merge one best version that works in any AI.

Round 2, per model: each seat tunes the round 1 version for its own model,
using its profile. Another seat checks that nothing from round 1 was lost.
These versions are what "Copy for <your AI>" will copy.

Everything goes to prompts/council/<id>.md for review before it is published.

Only the Claude seat is written. The other seats need an API key with billing
from that company and an adapter written against its official SDK.

Usage: python3 tools/council.py <prompt-id> [--dry-run]
       python3 tools/council.py --profiles [--dry-run]
Keys are read from the environment (GitHub Actions secrets or the Tower).
Never paste a key into a file or a chat.
"""
import json, os, sys, pathlib, datetime

R = pathlib.Path(__file__).resolve().parent.parent

REVIEW = """You sit on a council of AI models from four companies. Below are every
free public version we have of one prompt. Judge them for one purpose: getting
the best result for an ordinary person who pastes the prompt into any chat AI.
Give: 1) the strongest parts of each version, 2) their weaknesses and risks,
3) your own best version, in full, 4) one line on why it beats the others."""

DEBATE = """Here are the other seats' reviews. Point out where you now agree,
where you still disagree and why, and give your final best version in full."""

PROFILE = """Your maker publishes a prompting guide: {guide}. From that guide and
what you know of yourself, write how a prompt should be written to get your
best work, then your real strengths and weaknesses compared with other top
models. Short lines. Only claims you would stand behind; say "not sure" where
you are not. Return JSON: {{"prompting": [...], "strengths": [...], "weaknesses": [...]}}"""

CRITIQUE = """Another council seat wrote this profile of itself. Say which lines
you disagree with and why, in short lines. Return JSON: {{"disagree": [...]}}"""

TUNE = """Here is the council's best version of a prompt, written to work in any AI.
Tune it for {name}, using this profile of how {name} works best:
{profile}
Keep every instruction, step and rule. Change only form and wording.
Output only the tuned prompt."""

CHECK = """Compare the original prompt with the tuned version. List anything the
tuned version lost or changed in meaning. If nothing, answer exactly: OK"""

CHAIR = """You chair the council. Merge the seats' final versions into one best
prompt. Keep only what at least two seats support or what clearly helps the
reader. Then list each seat's vote (keep / change) and any dissent, in a line
each. Output the prompt first, then the votes and dissent."""


def versions(pid):
    out = []
    data = json.load(open(R / 'prompts/prompts.json'))
    for p in data.get('prompts', data) if isinstance(data, dict) else data:
        if p.get('id') == pid:
            out.append(('claudebomb', p.get('prompt') or p.get('text', '')))
    # Matching open-library versions are picked by hand for now and listed in
    # prompts/council/<id>.sources.json as [["source", "url-or-title", "text"], ...].
    extra = R / f'prompts/council/{pid}.sources.json'
    if extra.exists():
        out += [(s, t) for s, _u, t in json.load(open(extra))]
    return out


class ClaudeSeat:
    name = 'Claude'
    key = 'ANTHROPIC_API_KEY'

    def ask(self, text):
        import anthropic  # official Anthropic SDK
        client = anthropic.Anthropic()
        msg = client.beta.messages.create(
            model='claude-fable-5-2',
            max_tokens=16000,
            betas=['server-side-fallback-2026-07-01'],
            fallbacks=[{'model': 'claude-opus-4-8'}],
            output_config={'effort': 'high'},
            messages=[{'role': 'user', 'content': text}],
        )
        if msg.stop_reason == 'refusal':
            return '(Claude declined this prompt.)'
        return ''.join(b.text for b in msg.content if b.type == 'text')


class PendingSeat:
    def __init__(self, name, key):
        self.name, self.key = name, key

    def ask(self, text):
        raise NotImplementedError(
            f'{self.name} seat needs {self.key} and an adapter written against '
            f"that company's official SDK.")


SEATS = [ClaudeSeat(), PendingSeat('GPT', 'OPENAI_API_KEY'),
         PendingSeat('Grok', 'XAI_API_KEY'), PendingSeat('Gemini', 'GEMINI_API_KEY')]


def profiles(dry=False):
    p = json.loads((R / 'prompts/council/profiles.json').read_text())
    ready = [s for s in SEATS if os.environ.get(s.key) and not isinstance(s, PendingSeat)]
    if dry or len(ready) < 4:
        print('Not running: profiles need all four seats.'); return
    for s in ready:
        own = json.loads(s.ask(PROFILE.format(guide=p['seats'][s.name]['guide'])))
        p['seats'][s.name].update(own)
        notes = [f'{o.name}: {d}' for o in ready if o is not s
                 for d in json.loads(o.ask(CRITIQUE + '\n\n' + json.dumps(own)))['disagree']]
        p['seats'][s.name]['disputed'] = notes
    (R / 'prompts/council/profiles.json').write_text(json.dumps(p, indent=1))


def tune(merged, ready):
    p = json.loads((R / 'prompts/council/profiles.json').read_text())['seats']
    out = {}
    for i, s in enumerate(ready):
        t = s.ask(TUNE.format(name=s.name, profile=json.dumps(p[s.name])) + '\n\n' + merged)
        checker = ready[(i + 1) % len(ready)]
        out[s.name] = (t, checker.name, checker.ask(CHECK + '\n\nOriginal:\n' + merged + '\n\nTuned:\n' + t))
    return out


def run(pid, dry=False):
    vs = versions(pid)
    if not vs:
        sys.exit(f'no prompt with id {pid}')
    block = '\n\n'.join(f'--- Version from {s} ---\n{t}' for s, t in vs)
    ready = [s for s in SEATS if os.environ.get(s.key) and not isinstance(s, PendingSeat)]
    missing = [s for s in SEATS if s not in ready]
    print(f'{len(vs)} versions; seats ready: {[s.name for s in ready]}; '
          f'missing: {[(s.name, s.key) for s in missing]}')
    if dry or len(ready) < 4:
        print('Not running: the council needs all four seats.')
        return
    first = {s.name: s.ask(REVIEW + '\n\n' + block) for s in ready}
    others = lambda n: '\n\n'.join(f'--- {k} ---\n{v}' for k, v in first.items() if k != n)
    final = {s.name: s.ask(REVIEW + '\n\n' + block + '\n\nYour first review:\n' + first[s.name]
                           + '\n\n' + DEBATE + '\n\n' + others(s.name)) for s in ready}
    merged = ClaudeSeat().ask(CHAIR + '\n\n' + '\n\n'.join(f'--- {k} ---\n{v}' for k, v in final.items()))
    day = datetime.date.today().isoformat()
    md = [f'# Council review: {pid} ({day})', '', '## Best version', '', merged, '', '## Round 1']
    md += [f'### {k}\n\n{v}\n' for k, v in first.items()] + ['## Round 2']
    md += [f'### {k}\n\n{v}\n' for k, v in final.items()]
    md += ['## Versions tuned for each AI']
    for k, (t, who, chk) in tune(merged, ready).items():
        md += [f'### {k}\n\n{t}\n\nChecked by {who}: {chk}\n']
    (R / f'prompts/council/{pid}.md').write_text('\n'.join(md))
    print('wrote', f'prompts/council/{pid}.md')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == '--profiles':
        profiles('--dry-run' in sys.argv)
    else:
        run(sys.argv[1], '--dry-run' in sys.argv)
