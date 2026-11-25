#!/usr/bin/env python3
"""The claudebomb council (planned, not running yet).

For one prompt, gather every free public version we hold (ours plus the open
library), let one top model from each of four companies review them alone,
show each seat the others' reviews for one round of debate, then have a chair
merge the best version. The result and the whole debate go to
prompts/council/<id>.md for review before anything is published.

Only the Claude seat is written. The other seats need an API key with billing
from that company and an adapter written against its official SDK.

Usage: python3 tools/council.py <prompt-id> [--dry-run]
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
    (R / f'prompts/council/{pid}.md').write_text('\n'.join(md))
    print('wrote', f'prompts/council/{pid}.md')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    run(sys.argv[1], '--dry-run' in sys.argv)
