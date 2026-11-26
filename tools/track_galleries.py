"""Daily check of other prompt galleries' public pages. Plain script, no AI.
Polite: reads robots.txt first, one request per site per run, runs once a day.
Records only page status, title, headings and, for GitHub projects, the latest release and commit.
It never copies anyone's prompts. Writes library/tracker.json (current state) and library/tracker-log.json (changes)."""
import datetime, hashlib, html, json, os, re, sys, urllib.parse, urllib.request, urllib.robotparser

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = 'claudebomb-tracker/1.0 (+https://claudebomb.com/tracker/)'
WATCH = os.path.join(R, 'tools/watch.json')
STATE = os.path.join(R, 'library/tracker.json')
LOG = os.path.join(R, 'library/tracker-log.json')

def get(url, accept='text/html'):
    h = {'User-Agent': UA, 'Accept': accept}
    if 'api.github.com' in url and os.environ.get('GITHUB_TOKEN'):
        h['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.status, r.read(2_000_000).decode('utf-8', 'replace')

def allowed(url):
    p = urllib.parse.urlsplit(url)
    rp = urllib.robotparser.RobotFileParser()
    try:
        st, txt = get('%s://%s/robots.txt' % (p.scheme, p.netloc), 'text/plain')
        rp.parse(txt.splitlines())
    except urllib.error.HTTPError as e:
        if e.code in (401, 403): return False
        return True  # no robots.txt means no rules
    except Exception:
        return True
    return rp.can_fetch(UA, url)

def clean(t):
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()[:160]

def page_facts(url):
    st, body = get(url)
    body = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', body)
    m = re.search(r'(?is)<title[^>]*>(.*?)</title>', body)
    d = re.search(r'(?is)<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)', body)
    heads = [clean(x) for x in re.findall(r'(?is)<h[12][^>]*>(.*?)</h[12]>', body)]
    heads = [h for h in heads if h][:40]
    return {'status': st, 'title': clean(m.group(1)) if m else '', 'description': clean(d.group(1)) if d else '', 'headings': heads,
            'sig': hashlib.sha1('\n'.join(heads).encode()).hexdigest()[:12]}

def github_facts(url):
    p = urllib.parse.urlsplit(url).path.strip('/').split('/')
    repo = '/'.join(p[:2])
    out = {}
    try:
        _, t = get('https://api.github.com/repos/%s/releases/latest' % repo, 'application/vnd.github+json')
        j = json.loads(t); out['release'] = j.get('tag_name', ''); out['release_date'] = (j.get('published_at') or '')[:10]
    except Exception:
        out['release'] = ''
    try:
        _, t = get('https://api.github.com/repos/%s/commits?per_page=1' % repo, 'application/vnd.github+json')
        j = json.loads(t)[0]; out['commit'] = j['sha'][:7]; out['commit_date'] = j['commit']['committer']['date'][:10]
    except Exception:
        pass
    return out

def main():
    today = datetime.date.today().isoformat()
    watch = json.load(open(WATCH))
    try: state = json.load(open(STATE))
    except Exception: state = {'sites': {}}
    try: log = json.load(open(LOG))
    except Exception: log = []
    entry = {'date': today, 'changes': []}
    for w in watch:
        name, url = w['name'], w['url']
        old = state['sites'].get(url, {})
        new = {'name': name, 'url': url, 'checked': today, 'added_by': w.get('added_by', 'us')}
        try:
            if not allowed(url):
                new['note'] = 'robots.txt asks us not to check this page, so we do not.'
            elif 'github.com/' in url:
                new.update(github_facts(url))
            else:
                new.update(page_facts(url))
        except Exception as e:
            new['note'] = 'Could not load today (%s).' % (getattr(e, 'code', None) or type(e).__name__)
        ch = []
        if old:
            if new.get('release') and new.get('release') != old.get('release'):
                ch.append('New release: %s (was %s)' % (new['release'], old.get('release') or 'none'))
            if new.get('commit') and new.get('commit') != old.get('commit'):
                ch.append('New code pushed (%s)' % new.get('commit_date', ''))
            if new.get('title') and old.get('title') and new['title'] != old['title']:
                ch.append('Page title changed: "%s" to "%s"' % (old['title'], new['title']))
            if new.get('sig') and old.get('sig') and new['sig'] != old['sig']:
                a = [h for h in new.get('headings', []) if h not in old.get('headings', [])][:5]
                r = [h for h in old.get('headings', []) if h not in new.get('headings', [])][:5]
                ch.append('Main headings changed.' + (' New: ' + '; '.join(a) + '.' if a else '') + (' Gone: ' + '; '.join(r) + '.' if r else ''))
            if bool(new.get('note')) != bool(old.get('note')):
                ch.append(new.get('note') or 'Loads again.')
        else:
            ch.append('Started tracking.')
        if ch:
            entry['changes'].append({'name': name, 'url': url, 'what': ch})
        state['sites'][url] = new
    state['checked'] = today
    json.dump(state, open(STATE, 'w'), indent=1, ensure_ascii=False)
    if entry['changes']:
        log = [entry] + [e for e in log if e.get('date') != today]
        json.dump(log[:365], open(LOG, 'w'), indent=1, ensure_ascii=False)
    print('tracked', len(watch), 'sites;', len(entry['changes']), 'changed')

if __name__ == '__main__':
    main()
