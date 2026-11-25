"""Records what changed in the open galleries since the last daily crawl.
Usage: python3 tools/crawl_changes.py <dir holding the previous library/sources/*.json>
Run after tools/import_library.py. Writes library/crawl.json (last check) and adds
an entry to library/changes.json when any prompt was added, changed or removed."""
import datetime, hashlib, json, os, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = sys.argv[1]
FILES = [('prompts-chat.json', 'pc'), ('fabric.json', 'fb')]
def load(p):
    try: return json.load(open(p, encoding='utf-8'))
    except Exception: return {'prompts': []}
def h(t): return hashlib.sha1(t.encode('utf-8')).hexdigest()
now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
crawl = {'checked': now, 'sources': {}}
entry = {'date': now, 'sources': []}
for f, short in FILES:
    old, new = load(os.path.join(OLD, f)), load(os.path.join(R, 'library/sources', f))
    o = {p['id']: h(p['text']) for p in old.get('prompts', [])}
    n = {p['id']: (h(p['text']), p['title']) for p in new.get('prompts', [])}
    added = [{'id': i, 'title': n[i][1]} for i in n if i not in o]
    changed = [{'id': i, 'title': n[i][1]} for i in n if i in o and o[i] != n[i][0]]
    removed = [i for i in o if i not in n]
    crawl['sources'][short] = {'name': new.get('source'), 'commit': new.get('commit'), 'count': len(n), 'repo': new.get('repo')}
    if added or changed or removed:
        entry['sources'].append({'short': short, 'name': new.get('source'), 'from_commit': old.get('commit'), 'to_commit': new.get('commit'),
                                 'added': added, 'changed': changed, 'removed': removed,
                                 'review': 'waiting: Claude review starts once an API key is set'})
json.dump(crawl, open(os.path.join(R, 'library/crawl.json'), 'w'), ensure_ascii=False, indent=1)
cp = os.path.join(R, 'library/changes.json')
log = load(cp) if os.path.exists(cp) else []
if isinstance(log, dict): log = []
if entry['sources']:
    log.insert(0, entry)
    json.dump(log[:365], open(cp, 'w'), ensure_ascii=False, indent=1)
elif not os.path.exists(cp):
    json.dump([], open(cp, 'w'))
for s in entry['sources']:
    print('%s: %d added, %d changed, %d removed' % (s['name'], len(s['added']), len(s['changed']), len(s['removed'])))
if not entry['sources']: print('No changes.')
