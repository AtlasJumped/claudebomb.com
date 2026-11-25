"""Imports openly licensed prompts into library/sources/*.json.
Usage: python3 tools/import_library.py <prompts.chat clone> <fabric clone>
Only free, openly licensed sources: prompts.chat prompts (CC0 1.0) and Fabric patterns (MIT).
Paid or all-rights-reserved galleries are linked from the site, never copied."""
import csv, json, os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
csv.field_size_limit(10 ** 9)
PC, FB = sys.argv[1], sys.argv[2]
def sha(d): return subprocess.check_output(['git', '-C', d, 'rev-parse', 'HEAD']).decode().strip()
def slug(s):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return (s[:70].rstrip('-')) or 'prompt'
# prompts we leave out: ones written to get around an AI's safety rules, or to make sexual or shock content
SKIP_TITLES = {'unconstrained ai model dan', 'subvert', 'human', 'general, model agnostic system prompt (unaligned model compatible)'}
SKIP_RE = re.compile(r'(do anything now|\bnsfw\b|erotic|sexual deviance|porn)', re.I)
out, used, skipped = [], set(), []
for row in csv.DictReader(open(os.path.join(PC, 'prompts.csv'), encoding='utf-8')):
    t, txt = row['act'].strip(), row['prompt'].strip()
    if not t or not txt: continue
    if t.lower() in SKIP_TITLES or SKIP_RE.search(t) or SKIP_RE.search(txt): skipped.append(t); continue
    s = slug(t); b = s; n = 2
    while s in used: s = '%s-%d' % (b, n); n += 1
    used.add(s)
    out.append(dict(id=s, title=t, text=txt, contributor=row.get('contributor', '').strip(),
                    dev=row.get('for_devs', '').upper() == 'TRUE', kind=row.get('type', 'TEXT')))
pc = dict(source='prompts.chat', short='pc', licence='CC0 1.0 (public domain)', licence_url='https://creativecommons.org/publicdomain/zero/1.0/',
          home='https://prompts.chat', repo='https://github.com/f/prompts.chat', commit=sha(PC), file='prompts.csv', prompts=out, skipped=skipped)
json.dump(pc, open(os.path.join(R, 'library/sources/prompts-chat.json'), 'w'), ensure_ascii=False)
fb_out = []
pd = os.path.join(FB, 'data/patterns')
for name in sorted(os.listdir(pd)):
    f = os.path.join(pd, name, 'system.md')
    if not os.path.isfile(f): continue
    txt = open(f, encoding='utf-8').read().strip()
    if not txt: continue
    fb_out.append(dict(id=slug(name.replace('_', '-')), name=name, title=name.replace('_', ' ').capitalize(), text=txt))
fb = dict(source='Fabric', short='fb', licence='MIT', licence_url='https://opensource.org/license/mit',
          home='https://github.com/danielmiessler/fabric', repo='https://github.com/danielmiessler/fabric', commit=sha(FB), prompts=fb_out,
          notice=open(os.path.join(FB, 'LICENSE'), encoding='utf-8').read())
json.dump(fb, open(os.path.join(R, 'library/sources/fabric.json'), 'w'), ensure_ascii=False)
print('prompts.chat:', len(out), 'kept,', len(skipped), 'left out:', skipped)
print('Fabric:', len(fb_out))
