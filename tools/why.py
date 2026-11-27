"""Builds /why/ (why claudebomb, with the comparison table) and /library/changes/ (daily crawl log).
Called from tools/build.py. Facts in the table were checked on the date in CHECKED; keep them honest."""
import datetime, json, os

CHECKED = 'November 25, 2026'
# cell codes: ('y', text) yes, ('x', text) red X, ('n', text) neutral, ('q', text) not checked
Y = lambda t='Yes': ('y', t)
X = lambda t: ('x', '✗ ' + t)
N = lambda t: ('n', t)
Q = ('q', '?')
NS, NSEEN = N('Not stated'), N('Not seen')
# columns: collects other galleries daily, promises free forever, promises no ads, tunes each prompt for your AI, links other galleries
L0 = N('None seen')
GALLERIES = [
    ('prompts.chat', 'https://prompts.chat/', [NSEEN, N('Open licence (CC0), no promise'), X('Sponsor block'), NSEEN, L0, Y()]),
    ('PromptBase', 'https://promptbase.com/', [NSEEN, X('Sells prompts'), X('Ad banner'), NSEEN, N('One ad link only'), Y()]),
    ('God of Prompt', 'https://godofprompt.ai/prompt-library', [NSEEN, X('Paid premium'), NS, NSEEN, L0, N('Account, saving not seen')]),
    ('Fabric', 'https://github.com/danielmiessler/Fabric', [NSEEN, N('Open licence (MIT), no promise'), NS, NSEEN, L0, N('No')]),
    ('LangChain Hub', 'https://docs.langchain.com/langsmith/manage-prompts', [NSEEN, NS, NS, NSEEN, L0, Y()]),
    ('PromptHero', 'https://prompthero.com/', [NSEEN, X('Paid plans'), X('Referral ads'), NSEEN, L0, Y()]),
    ('FlowGPT', 'https://flowgpt.com/', [NSEEN, Q, Q, NSEEN, Q, Y()]),
    ('AIPRM', 'https://www.aiprm.com/', [NSEEN, X('Paid plans'), NS, NSEEN, L0, X('Saving is paid')]),
    ('Snack Prompt', 'https://snackprompt.com/', [NSEEN, NS, NS, NSEEN, L0, Y()]),
    ('Anthropic (Claude only)', 'https://code.claude.com/docs/en/prompt-library', [NSEEN, NS, NS, NSEEN, L0, N('No')]),
    ('Google Vertex AI (Gemini only)', 'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/prompt-gallery', [NSEEN, NS, NS, NSEEN, L0, N('Cloud account, no saving seen')]),
    ('Microsoft Copilot (Copilot only)', 'https://adoption.microsoft.com/en-us/copilot/prompt-gallery/', [NSEEN, NS, NS, NSEEN, L0, Y()]),
    ('OpenAI Academy (ChatGPT only)', 'https://academy.openai.com/public/resources/chatgpt-for-any-role', [NSEEN, NS, NS, NSEEN, L0, NSEEN]),
]
COLS = ['Collects other galleries’ prompts every day', 'Promises free forever', 'Promises no ads', 'Tunes each prompt for your AI', 'Links the other galleries', 'Free login that saves your prompts']

def _w(R, sub, pg):
    os.makedirs(os.path.join(R, sub), exist_ok=True)
    open(os.path.join(R, sub, 'index.html'), 'w').write(pg)

def _date(iso):
    try:
        d = datetime.datetime.strptime(iso[:10], '%Y-%m-%d')
        return d.strftime('%B ') + str(d.day) + d.strftime(', %Y')
    except Exception:
        return 'not yet'

# Loads the setup text so the app buttons in section 7 can copy it.
PRELOAD = """<script>
(function(){var S='';if(window.CB&&CB.loadDash)CB.loadDash().then(function(t){S=t});window.CB_PROMPT=function(){return S}})();
</script>
"""

# our own column for the feature table: (feature name in the matrix or new, our value)
OURS = [
 ('Costs money','Never'),('Ads','Never'),('Sell prompts or creator earnings','Never'),('Promises never to cost money or have ads','yes'),
 ('Collects other galleries’ prompts every day','yes'),('Links every other gallery','yes'),
 ('Keyword search','yes'),('AI or semantic search','Being added'),('Category or topic browse','yes'),('Pick your AI or model per run','yes'),
 ('Tunes each prompt for your AI','Being added'),
 ('Variables or placeholders','yes'),('Interactive fill-in fields in the page','yes'),('Copy button','yes'),('Open or run in an AI with one click','yes'),
 ('"Why it works" or tips per prompt','yes'),('Votes, likes or ratings','yes'),('Sort popular or trending','Being added'),
 ('Save, favourites or collections','yes'),('Accounts','yes'),('Private prompts','yes'),('Prompt builder or generator','yes'),
 ('Public submission','yes'),('Voice input (speak instead of typing)','yes'),('Open data export or dataset','yes'),('Comments or reviews','no'),
 ('Version history','no'),('Public API','no'),
]
# rows that are not in gallery_features.json, in gallery order (see GALLERIES)
EXTRA = {
 'Costs money': ['no', 'Sells prompts', 'Paid premium', 'no', '?', 'Paid plans', '?', 'Paid plans', '?', '?', '?', '?', '?'],
 'Ads': ['Sponsors', 'yes', '?', 'no', '?', 'yes', '?', '?', '?', 'no', 'no', 'no', 'no'],
 'Promises never to cost money or have ads': ['no'] * 6 + ['?'] + ['no'] * 6,
 'Collects other galleries’ prompts every day': ['No reason to think so'] * 13,
 'Links every other gallery': ['no', 'One ad link only'] + ['no'] * 11,
 'Tunes each prompt for your AI': ['not seen'] * 13,
}
LABELS = {'Ads': 'Ads on the site', '"Why it works" or tips per prompt': 'Explains why each prompt works, with tips'}

def _feats(E):
    try: M = json.load(open(os.path.join(os.path.dirname(__file__), 'gallery_features.json')))
    except Exception: return ''
    names = [g[0] for g in GALLERIES]
    def c(v, us=False):
        v = (v or '?').strip(); lv = v.lower()
        if lv == 'yes': return '<td class="y">✓</td>'
        if lv == 'no': return '<td class="q">no</td>'
        if lv == 'not seen' or v == '?': return '<td class="q">?</td>'
        if lv == 'paid': return '<td class="x">Paid</td>'
        if us and lv == 'never': return '<td class="y">Never</td>'
        return '<td class="n">%s</td>' % E(v)
    body = ''
    for f, ours in OURS:
        theirs = EXTRA.get(f) or M['features'].get(f)
        label = LABELS.get(f, f)
        cells = ''.join(c(v).replace('<td', '<td data-g="%d"' % k, 1) for k, v in enumerate(theirs or ['?'] * len(names)))
        body += '<tr><th scope="row">%s</th>%s%s</tr>\n' % (E(label.replace('"', '')), c(ours, True), cells)
    short = ['prompts.chat', 'PromptBase', 'God of Prompt', 'Fabric', 'LangChain', 'PromptHero', 'FlowGPT', 'AIPRM', 'Snack', 'Anthropic', 'Vertex AI', 'Copilot', 'OpenAI']
    opts = ''.join('<option value="%d">%s</option>' % (k, E(g)) for k, g in enumerate(names))
    return ('<p class="cmppick"><label for="cmpg">On a phone, compare claudebomb with</label> <select id="cmpg">%s</select></p>\n'
            '<div class="cmpw" role="region" aria-labelledby="cmp-h" tabindex="0"><table class="cmp feat" id="feat" data-g="0"><thead><tr><th scope="col">Feature</th><th scope="col">claudebomb</th>%s</tr></thead><tbody>\n%s</tbody></table></div>\n'
            '<p class="mut sm" style="max-width:46rem">✓ means we saw it on the site on %s. ? means we did not see it, which is not proof it is missing. Being added means we are building it now. Spot a mistake? Tell us with the ELV8 button below and we will fix it.</p>\n'
            '<script>(function(){var s=document.getElementById(\'cmpg\'),t=document.getElementById(\'feat\');if(s&&t)s.addEventListener(\'change\',function(){t.setAttribute(\'data-g\',s.value)})})();</script>') % (
            opts, ''.join('<th scope="col" data-g="%d">%s</th>' % (k, E(x)) for k, x in enumerate(short)), body, E(M.get('checked', CHECKED)))

def build(R, E, head, hdr, FOOT, TAIL, V):
    nav = [('/#what', 'What is claudebomb'), ('/#bank', 'Our prompts'), ('/library/', 'Search all'), ('/build/', 'Build')]
    try: crawl = json.load(open(os.path.join(R, 'library/crawl.json')))
    except Exception: crawl = {}
    try: log = json.load(open(os.path.join(R, 'library/changes.json')))
    except Exception: log = []
    src = crawl.get('sources', {})
    nopen = sum(s.get('count', 0) for s in src.values())
    last = _date(crawl.get('checked', ''))
    pg = head('Why claudebomb | claudebomb.com', 'One free place for every prompt, for every AI, updated every day. How claudebomb compares with every other prompt gallery.', 'https://claudebomb.com/why/')
    pg += '<body id="top">\n<a class="skip" href="#cmp-h">Skip to the comparison</a>\n' + hdr(nav)
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <h1 id="h1">Why claudebomb</h1>
  <p class="lead">One free place for every prompt, for every AI. Here is why we built it, what we promise, and how it compares.</p>
  <div class="btns"><a class="btn cta" href="/library/">Search for your prompt now</a></div>
 </div>
</section>
<section class="sec" aria-labelledby="w1">
 <div class="wrap">
  <h2 id="w1">1. Everyone needs good prompts, and they are scattered</h2>
  <p style="max-width:46rem">A prompt decides how good an AI's answer is. The AI companies' own galleries cover only their own AI, and Anthropic has turned its prompt library into a guide. Everything else is spread over dozens of sites, each with its own slice.</p>
  <h2 id="w2">2. One best place, so you don't have to hunt</h2>
  <p style="max-width:46rem">One search covers our own prompts and %s free prompts from the open galleries. We also link every other gallery we know of, paid ones too, which none of the sites below does as far as we have seen. If a better prompt is somewhere else, we want you to find it.</p>
  <h2 id="w3">3. Updated every day</h2>
  <p style="max-width:46rem">Every day we pull the openly licensed galleries (<a href="https://prompts.chat/">prompts.chat</a> and <a href="https://github.com/danielmiessler/Fabric">Fabric</a>) and record every prompt that was added, changed or removed. Last checked: %s. <a href="/library/changes/">See what changed</a>. Paid galleries are linked, never copied. We also log the public changes and new versions of every other gallery on our <a href="/tracker/">gallery tracker</a>.</p>
  <h2 id="w4">4. The best AIs, working on your prompts</h2>
  <p style="max-width:46rem">We are adding the top model from each leading AI company, so they can check each other's work. We are also training models to write better prompts, and we will show the whole workflow here as it runs. These are being added now, and this page will say when each one is live.</p>
  <ol class="flow" aria-label="How a prompt gets better">
   <li><b>Collect</b>Every free version of a prompt, from every open gallery.<span class="st on">Running daily</span></li>
   <li><b>Debate</b>The top AI from four companies argue out one best version. <a href="/council/">The council</a>.<span class="st">Being added</span></li>
   <li><b>Tune</b>Each AI tunes the winner for itself, and the next one checks it.<span class="st">Being added</span></li>
   <li><b>Train</b>Our own models learn from every debate to write better prompts.<span class="st">Being added</span></li>
   <li><b>Publish</b>The best version, free, with the whole debate.<span class="st on">Live for our own prompts</span></li>
  </ol>
  <h2 id="w5">5. Serious hardware, given to this</h2>
  <p style="max-width:46rem">We are putting serious hardware to work on prompts, starting with AI search and prompt testing, because we like doing this. Fewer than one in a hundred thousand people have a machine like it. Most people with a machine like this use it to make money.</p>
  <h2 id="w6">6. Free forever, with no ads</h2>
  <p style="max-width:46rem">We promise claudebomb will stay 100%% free, with no ads, forever. We pay for the AI and the hardware ourselves. Our own prompts are free to use under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, so they stay free even if we are gone. Our aim is that nobody ever needs another prompt site.</p>
  <h2 id="w7">7. Why this can stay free</h2>
  <figure class="peak" aria-labelledby="peakc">
   <svg viewBox="0 0 600 220" role="img" aria-label="Prompt galleries climbing a mountain. The ones that must make money slip back; claudebomb stands at the peak.">
    <path d="M10 210 L300 30 L590 210 Z" fill="currentColor" opacity=".08"/>
    <path d="M10 210 L300 30 L590 210" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/>
    <g fill="currentColor" opacity=".45"><circle cx="90" cy="160" r="9"/><circle cx="150" cy="123" r="9"/><circle cx="205" cy="89" r="9"/><circle cx="440" cy="117" r="9"/><circle cx="500" cy="154" r="9"/></g>
    <g font-size="13" fill="currentColor" opacity=".75"><text x="40" y="190">Ads</text><text x="120" y="110">Paywalls</text><text x="455" y="100">Sponsors</text></g>
    <line x1="300" y1="30" x2="300" y2="2" stroke="currentColor" stroke-width="2"/>
    <path d="M300 2 L345 11 L300 20 Z" fill="#2fbf71"/>
    <circle cx="300" cy="30" r="11" fill="#2fbf71"/>
    <text x="318" y="44" font-size="15" font-weight="700" fill="currentColor">claudebomb</text>
   </svg>
   <figcaption id="peakc">In the past, a prompt gallery had to make money to stay on top, with ads, paywalls or sponsors. We already paid for our hardware and use AI every day anyway, so claudebomb is a side project we keep free for everyone, forever. We want to settle the best place for prompts once and for all, while we work on other problems.</figcaption>
  </figure>
  <h3 id="try-h">Try it in your AI now</h3>
  <div id="why-act" data-act="personal-dashboard" data-act-novote="1"></div>
  <p>And this page will still be here when you're done.</p>
  <div class="btns"><a class="btn ghost" href="https://elevat.ing">See what else we're up to</a></div>
 </div>
</section>
<section class="sec" aria-labelledby="cmp-h">
 <div class="wrap">
  <h2 id="cmp-h">Every feature, side by side, as of %s</h2>
  @@FEATS@@
  <p class="close"><b>You're already here. Just bookmark this page and create a free-forever login.</b></p>
  <div class="btns"><a class="btn cta" href="/library/">Search for your prompt now</a><a class="btn ghost cta" href="/my/">Create a free-forever login</a></div>
  <p class="mut sm" style="max-width:46rem">If you only operate from this device without logging in, your prompts stay in a browser that can be cleared of its data, and you’ll lose your data. When you’re logged in, your data will be saved in a secure place where you can control it.</p>
 </div>
</section>
</main>
''' % ('{:,}'.format(nopen), E(last), E(CHECKED))
    pg = pg.replace('@@FEATS@@', _feats(E))
    pg += FOOT + TAIL % (V, PRELOAD)
    _w(R, 'why', pg)

    # ---------- /library/changes/ ----------
    items = ''
    for e in log[:60]:
        for s in e.get('sources', []):
            def lst(k, label):
                L = s.get(k) or []
                if not L: return ''
                names = []
                for it in L[:40]:
                    if isinstance(it, dict):
                        names.append('<a href="/l/%s/%s/">%s</a>' % (s['short'], it['id'], E(it['title'])) if k != 'removed' else E(it['title']))
                    else:
                        names.append(E(it))
                more = ' and %d more' % (len(L) - 40) if len(L) > 40 else ''
                return '<p><b>%s %d:</b> %s%s</p>' % (label, len(L), ', '.join(names), more)
            items += '<li><h3>%s, %s</h3>%s%s%s</li>\n' % (E(_date(e.get('date', ''))), E(s.get('name', '')), lst('added', 'Added'), lst('changed', 'Changed'), lst('removed', 'Removed'))
    if not items:
        items = '<li><p>No changes since daily checks began. Last checked %s.</p></li>' % E(last)
    pg = head('What changed in the open galleries | claudebomb.com', 'Every day claudebomb pulls the openly licensed prompt galleries and records each prompt that was added, changed or removed.', 'https://claudebomb.com/library/changes/')
    pg += '<body id="top">\n<a class="skip" href="#log">Skip to the changes</a>\n' + hdr(nav)
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <h1 id="h1" class="sm">What changed</h1>
  <p class="lead">Every day we pull <a href="https://prompts.chat/">prompts.chat</a> and <a href="https://github.com/danielmiessler/Fabric">Fabric</a> and record each prompt that was added, changed or removed. Last checked: %s.</p>
 </div>
</section>
<section class="sec" aria-label="Change log">
 <div class="wrap"><ul class="list" id="log">%s</ul>
 <div class="btns"><a class="btn" href="/library/">Search every prompt</a><a class="btn ghost" href="/why/">Why claudebomb</a></div></div>
</section>
</main>
''' % (E(last), items)
    pg += FOOT + TAIL % (V, '')
    _w(R, 'library/changes', pg)

# The support page is support/index.html (kept by hand, not built here). The old donate and Wikipedia addresses land on it.
def _redirect(R, sub):
    _w(R, sub, '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
              '<title>Support us | claudebomb.com</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/support/">'
              '<link rel="canonical" href="https://claudebomb.com/support/"></head><body><p><a href="/support/">Go to the support page</a></p></body></html>\n')

def build_wiki(R, E, head, hdr, FOOT, TAIL, V):
    _redirect(R, 'wikipedia')

def build_tracker(R, E, head, hdr, FOOT, TAIL, V):
    nav = [('/#what', 'What is claudebomb'), ('/#bank', 'Our prompts'), ('/library/', 'Search all'), ('/build/', 'Build')]
    def load(p, d):
        try: return json.load(open(os.path.join(R, p)))
        except Exception: return d
    st = load('library/tracker.json', {'sites': {}}); log = load('library/tracker-log.json', []); finds = load('library/gallery-finds.json', [])
    rows = ''
    for s in sorted(st.get('sites', {}).values(), key=lambda x: x.get('name', '').lower()):
        if s.get('note'): now = s['note']
        elif s.get('release') or s.get('commit'):
            now = ('Latest release %s' % s['release'] if s.get('release') else 'No releases') + ('. Last code push %s' % _date(s['commit_date']) if s.get('commit_date') else '')
        else: now = 'Page loads%s' % (': "%s"' % s['title'] if s.get('title') else '')
        rows += '<tr><th scope="row"><a href="%s">%s</a></th><td>%s</td><td>%s</td></tr>\n' % (E(s['url']), E(s['name']), E(now), E(_date(s.get('checked', ''))))
    items = ''
    for e in log[:60]:
        for c in e['changes']:
            items += '<li><b>%s, <a href="%s">%s</a>:</b> %s</li>\n' % (E(_date(e['date'])), E(c['url']), E(c['name']), E(' '.join(c['what'])))
    fl = ''.join('<li><a href="%s">%s</a> <span class="mut">(%s, found %s)</span></li>\n' % (E(f['url']), E(f['name']), E(f['where']), E(_date(f['found']))) for f in finds[:40])
    pg = head('Prompt gallery tracker | claudebomb.com', 'A public daily log of what changes on every other prompt gallery: new versions, releases and page changes.', 'https://claudebomb.com/tracker/')
    pg += '<body id="top">\n<a class="skip" href="#t-h">Skip to the tracker</a>\n' + hdr(nav)
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <h1 id="h1">Prompt gallery tracker</h1>
  <p class="lead">Every day a plain script checks each prompt gallery we know of and logs what changed: new releases, code pushes, new page titles and headings. Every week another script looks for new galleries and adds them here. Last checked: %s.</p>
  <p class="mut" style="max-width:46rem">It reads each site's robots.txt first, makes one visit per site per day, and never copies anyone's prompts. Prompts from open galleries are in <a href="/library/">our library</a>, with <a href="/library/changes/">their daily changes</a>. How we compare: <a href="/why/">Why claudebomb</a>.</p>
 </div>
</section>
<section class="sec" aria-labelledby="t-h">
 <div class="wrap">
  <h2 id="t-h">Every gallery, today</h2>
  <div class="cmpw" role="region" aria-labelledby="t-h" tabindex="0"><table class="cmp"><thead><tr><th scope="col">Gallery</th><th scope="col">What we see</th><th scope="col">Checked</th></tr></thead><tbody>
%s</tbody></table></div>
  <h2 id="l-h">What changed</h2>
  <ul class="hist">%s</ul>
  <h2 id="f-h">New galleries found by our weekly search</h2>
  <ul class="hist">%s</ul>
 </div>
</section>
</main>
''' % (E(_date(st.get('checked', ''))) or 'not yet', rows or '<tr><td colspan="3">The first check runs tonight.</td></tr>\n',
       items or '<li>No changes logged yet. The first check records where every gallery stands.</li>', fl or '<li>The first weekly search has not run yet.</li>')
    # Page titles we quote can carry long dashes; the site uses none (M-1749).
    for d in (' \u2014 ', ' \u2013 '): pg = pg.replace(d, ', ')
    pg = pg.replace('\u2014', ', ').replace('\u2013', '-')
    pg += FOOT + TAIL % (V, '')
    _w(R, 'tracker', pg)


def build_donate(R, E, head, hdr, FOOT, TAIL, V):
    _redirect(R, 'donate')
