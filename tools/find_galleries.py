"""Weekly search for new prompt galleries. Plain script, no AI.
Looks at GitHub (popular prompt-library projects) and Hacker News (stories about prompt libraries from the last 8 days).
New finds go into tools/watch.json, so the daily tracker starts checking them, and into library/gallery-finds.json for the tracker page."""
import datetime, json, os, time, urllib.parse, urllib.request

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = 'claudebomb-tracker/1.0 (+https://claudebomb.com/tracker/)'
WATCH = os.path.join(R, 'tools/watch.json')
FINDS = os.path.join(R, 'library/gallery-finds.json')
SKIP = ('prompt-injection', 'jailbreak', 'leak')

def get(url):
    h = {'User-Agent': UA, 'Accept': 'application/json'}
    if 'api.github.com' in url and os.environ.get('GITHUB_TOKEN'):
        h['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=25) as r:
        return json.loads(r.read().decode())

def norm(u):
    p = urllib.parse.urlsplit(u)
    return (p.netloc.lower().replace('www.', '') + p.path.rstrip('/').lower())

def main():
    today = datetime.date.today()
    watch = json.load(open(WATCH))
    try: finds = json.load(open(FINDS))
    except Exception: finds = []
    known = {norm(w['url']) for w in watch} | {norm(f['url']) for f in finds}
    new = []
    for q in ['"prompt library" stars:>300', '"prompt gallery" stars:>100', '"awesome prompts" stars:>1000', 'topic:prompt-library stars:>200']:
        try:
            j = get('https://api.github.com/search/repositories?' + urllib.parse.urlencode({'q': q, 'sort': 'stars', 'per_page': 20}))
        except Exception as e:
            print('github search failed:', q, e); continue
        for it in j.get('items', []):
            u = it['html_url']; d = (it.get('description') or '')[:160]
            if norm(u) in known or any(s in (u + d).lower() for s in SKIP) or it.get('archived'): continue
            known.add(norm(u))
            new.append({'name': it['full_name'], 'url': u, 'why': '%s stars on GitHub. %s' % (format(it['stargazers_count'], ','), d), 'found': today.isoformat(), 'where': 'GitHub'})
        time.sleep(3)
    since = int(time.time()) - 8 * 86400
    for q in ['prompt library', 'prompt gallery', 'prompts directory']:
        try:
            j = get('https://hn.algolia.com/api/v1/search_by_date?' + urllib.parse.urlencode({'query': q, 'tags': 'story', 'numericFilters': 'created_at_i>%d,points>10' % since}))
        except Exception as e:
            print('hn search failed:', q, e); continue
        for h in j.get('hits', []):
            u = h.get('url') or ''
            if not u.startswith('http') or norm(u) in known: continue
            known.add(norm(u))
            new.append({'name': (h.get('title') or u)[:80], 'url': u, 'why': '%s points on Hacker News.' % h.get('points'), 'found': today.isoformat(), 'where': 'Hacker News'})
    new = new[:15]
    for f in new:
        watch.append({'name': f['name'], 'url': f['url'], 'added_by': 'weekly search, ' + f['found']})
    json.dump(watch, open(WATCH, 'w'), indent=1, ensure_ascii=False)
    json.dump((new + finds)[:500], open(FINDS, 'w'), indent=1, ensure_ascii=False)
    print('found', len(new), 'new galleries')

if __name__ == '__main__':
    main()
