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
    ('prompts.chat', 'https://prompts.chat/', [NSEEN, N('Open licence (CC0), no promise'), X('Sponsor block'), NSEEN, L0]),
    ('PromptBase', 'https://promptbase.com/', [NSEEN, X('Sells prompts'), X('Ad banner'), NSEEN, N('One ad link only')]),
    ('God of Prompt', 'https://godofprompt.ai/prompt-library', [NSEEN, X('Paid premium'), NS, NSEEN, L0]),
    ('Fabric', 'https://github.com/danielmiessler/Fabric', [NSEEN, N('Open licence (MIT), no promise'), NS, NSEEN, L0]),
    ('LangChain Hub', 'https://docs.langchain.com/langsmith/manage-prompts', [NSEEN, NS, NS, NSEEN, L0]),
    ('PromptHero', 'https://prompthero.com/', [NSEEN, X('Paid plans'), X('Referral ads'), NSEEN, L0]),
    ('FlowGPT', 'https://flowgpt.com/', [NSEEN, Q, Q, NSEEN, Q]),
    ('AIPRM', 'https://www.aiprm.com/', [NSEEN, X('Paid plans'), NS, NSEEN, L0]),
    ('Snack Prompt', 'https://snackprompt.com/', [NSEEN, NS, NS, NSEEN, L0]),
    ('Anthropic (Claude only)', 'https://code.claude.com/docs/en/prompt-library', [NSEEN, NS, NS, NSEEN, L0]),
    ('Google Vertex AI (Gemini only)', 'https://docs.cloud.google.com/vertex-ai/generative-ai/docs/prompt-gallery', [NSEEN, NS, NS, NSEEN, L0]),
    ('Microsoft Copilot (Copilot only)', 'https://adoption.microsoft.com/en-us/copilot/prompt-gallery/', [NSEEN, NS, NS, NSEEN, L0]),
    ('OpenAI Academy (ChatGPT only)', 'https://academy.openai.com/public/resources/chatgpt-for-any-role', [NSEEN, NS, NS, NSEEN, L0]),
]
COLS = ['Collects other galleries’ prompts every day', 'Promises free forever', 'Promises no ads', 'Tunes each prompt for your AI', 'Links the other galleries']

def _w(R, sub, pg):
    os.makedirs(os.path.join(R, sub), exist_ok=True)
    open(os.path.join(R, sub, 'index.html'), 'w').write(pg)

def _date(iso):
    try:
        d = datetime.datetime.strptime(iso[:10], '%Y-%m-%d')
        return d.strftime('%B ') + str(d.day) + d.strftime(', %Y')
    except Exception:
        return 'not yet'

def build(R, E, head, hdr, FOOT, TAIL, V):
    nav = [('/#bank', 'Our prompts'), ('/library/', 'Search all'), ('/build/', 'Build'), ('/why/', 'Why us')]
    try: crawl = json.load(open(os.path.join(R, 'library/crawl.json')))
    except Exception: crawl = {}
    try: log = json.load(open(os.path.join(R, 'library/changes.json')))
    except Exception: log = []
    src = crawl.get('sources', {})
    nopen = sum(s.get('count', 0) for s in src.values())
    last = _date(crawl.get('checked', ''))
    def cell(c):
        k, t = c
        return '<td class="%s">%s</td>' % (k, E(t))
    rows = ('<tr class="us"><th scope="row">claudebomb</th><td class="y">Yes, daily (the open ones)</td><td class="y">Yes</td><td class="y">Yes</td>'
            '<td class="n">Being added</td><td class="y">Yes, every one here</td></tr>\n')
    for name, url, cells in GALLERIES:
        rows += '<tr><th scope="row"><a href="%s">%s</a></th>%s</tr>\n' % (url, E(name), ''.join(cell(c) for c in cells))
    pg = head('Why claudebomb | claudebomb.com', 'One free place for every prompt, for every AI, updated every day. No ads, free forever. How claudebomb compares with every other prompt gallery.', 'https://claudebomb.com/why/')
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
  <p style="max-width:46rem">Every day we pull the openly licensed galleries (<a href="https://prompts.chat/">prompts.chat</a> and <a href="https://github.com/danielmiessler/Fabric">Fabric</a>) and record every prompt that was added, changed or removed. Last checked: %s. <a href="/library/changes/">See what changed</a>. Paid galleries are linked, never copied.</p>
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
  <p style="max-width:46rem">Our home server runs two NVIDIA RTX 5090s, the most powerful graphics card made for home PCs. About 4 in 1,000 Steam gamers have even one (<a href="https://www.digitalcitizen.life/steam-hardware-survey-october-2026-rtx-5070-steam-frame/">Steam survey, October 2026</a>). Most people with a machine like this play games on it or use it to make money. We are putting ours to work on prompts, starting with AI search and prompt testing, because we like doing this.</p>
  <h2 id="w6">6. Free forever, with no ads</h2>
  <p style="max-width:46rem">We promise claudebomb will stay 100%% free, with no ads, forever. We pay for the AI and the hardware ourselves. Our own prompts are free to use under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, so they stay free even if we are gone. Our aim is that nobody ever needs another prompt site.</p>
 </div>
</section>
<section class="sec" aria-labelledby="cmp-h">
 <div class="wrap">
  <h2 id="cmp-h">How claudebomb compares, as of %s</h2>
  <div class="cmpw" role="region" aria-labelledby="cmp-h" tabindex="0">
  <table class="cmp">
   <thead><tr><th scope="col">Gallery</th>%s</tr></thead>
   <tbody>
%s   </tbody>
  </table>
  </div>
  <p class="mut sm" style="max-width:46rem">We read each gallery's main page on %s. Yes means the site says or shows it. ✗ marks paid plans or ads we saw. Not stated means the site makes no such promise. None seen and Not seen mean we looked and did not find it. ? means the site would not load for us. Spot a mistake? Tell us with the HMR button below and we will fix it.</p>
  <div class="btns"><a class="btn cta" href="/library/">Search for your prompt now</a></div>
 </div>
</section>
</main>
''' % ('{:,}'.format(nopen), E(last), E(CHECKED), ''.join('<th scope="col">%s</th>' % E(c) for c in COLS), rows, E(CHECKED))
    pg += FOOT + TAIL % (V, '')
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

# Wikimedia's yearly donation records (Leo's Gmail, donate@wikimedia.org). Amounts only; no name, address or IDs.
WIKI_GIFTS = [('2021', 'August to December', 5, 22.50), ('2022', '10 months', 10, 45.00), ('2023', 'Every month', 12, 54.00),
              ('2024', 'Every month', 12, 54.00), ('2025', 'Every month', 12, 54.00)]

def build_wiki(R, E, head, hdr, FOOT, TAIL, V):
    nav = [('/#bank', 'Our prompts'), ('/library/', 'Search all'), ('/build/', 'Build'), ('/why/', 'Why us')]
    rows = ''.join('<tr><th scope="row">%s</th><td>%s</td><td>%d gifts of $4.50</td><td>$%.2f</td></tr>' % (y, E(w), n, t) for y, w, n, t in WIKI_GIFTS)
    tot = sum(t for _, _, _, t in WIKI_GIFTS); cnt = sum(n for _, _, n, _ in WIKI_GIFTS)
    pg = head('Have you heard of Wikipedia? | claudebomb.com', 'We think Wikipedia is a better version of us: free, ad-free and hugely useful. Here is how we support it, and how you can.', 'https://claudebomb.com/wikipedia/')
    pg += '<body id="top">\n<a class="skip" href="#give">Skip to the donate buttons</a>\n' + hdr(nav)
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <h1 id="h1" class="sm">Have you heard of Wikipedia?</h1>
  <p class="lead">We think <a href="https://www.wikipedia.org/">Wikipedia</a> is a better version of us.</p>
  <p style="max-width:46rem">It inspires us. Its work has added a huge amount to humanity's productivity, and it has kept all of it free. We have never had to pay to read it, never had to hand anything over, and never seen an ad on it. It's great, and we have been taking part.</p>
 </div>
</section>
<section class="sec" aria-labelledby="h2">
 <div class="wrap">
  <h2 id="h2">How we've been taking part</h2>
  <div class="cmpw" role="region" aria-labelledby="h2" tabindex="0"><table class="cmp" style="min-width:30rem">
   <thead><tr><th scope="col">Year</th><th scope="col">When</th><th scope="col">Gifts</th><th scope="col">Total</th></tr></thead>
   <tbody>%s<tr class="us"><th scope="row">Since 2021</th><td>Monthly</td><td>%d gifts</td><td><b>$%.2f</b></td></tr></tbody>
  </table></div>
  <p class="mut sm">From the yearly donation records the Wikimedia Foundation sent us for 2021 to 2025. Amounts in US dollars.</p>
 </div>
</section>
<section class="sec" aria-labelledby="give">
 <div class="wrap">
  <h2 id="give">Our ask</h2>
  <p style="max-width:46rem">If you're not already donating to Wikipedia, please donate to one of us.</p>
  <div class="btns"><a class="btn cta" href="https://donate.wikimedia.org/">Donate to Wikipedia</a><a class="btn ghost cta" href="#us">Donate to us</a></div>
  <p id="us" class="mut" style="max-width:46rem">Donating to us is coming soon. We are setting up a way to give where every dollar goes straight back to the cause, and we'll put it here. Until then, Wikipedia is a great choice.</p>
 </div>
</section>
</main>
''' % (rows, cnt, tot)
    pg += FOOT + TAIL % (V, '')
    _w(R, 'wikipedia', pg)
