"""Builds claudebomb.com: index.html and one page per prompt at /p/<id>/.
Run from the repo root: python3 tools/build.py
Prompt texts live in prompts/prompts.json; page content (pitfalls, features) in tools/meta.py."""
import json, html, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from meta import META
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = html.escape
P = json.load(open(os.path.join(R, 'prompts/prompts.json')))
P = [p for p in P if p['id'] != 'personal-dashboard']
DASH = dict(id='personal-dashboard', category='Dashboards', title='Personal dashboard (flagship)',
            summary='Audits your AI setup, sets things up from your instructions, and builds one calm page for your day.',
            saves='Our flagship, and the bar for this site. Free forever.', text='', load=True,
            paths=['setup/claude-setup-guide.md', 'dashboard/claudebomb-dashboard.md'])
ALL = [DASH] + P
for p in ALL:
    m = META[p['id']]
    p['does'] = m['does']; p['fields'] = m.get('fields', []); p['pitfalls'] = [dict(pitfall=a, fix=b) for a, b in m['pitfalls']]; p['features'] = m['features']
    p['page'] = '/p/%s/' % p['id']
    p.setdefault('paths', ['prompts/%s.md' % p['id']])
SHARED = [
    dict(name='Short replies', want='Keep each reply short, under 150 words, unless I ask for more.', dont='Give full, detailed replies.'),
    dict(name='Plain words', want='I am new to this. Use plain words and explain any term the first time.', dont='I know this area well. Skip the basics.'),
    dict(name='I will talk, not type', want='I will often answer by voice. Forgive typos and filler, and ask if you cannot tell what I meant.'),
    dict(name='Tables', want='Use tables when you compare things.', dont='Do not use tables. I read on a phone.'),
    dict(name='One question at a time', want='Ask me one question at a time.', dont='Put all your questions in one message so I can answer them together.'),
    dict(name='Say where facts come from', want='When you state a fact, say where it comes from, or say plainly that you are not sure.'),
]
# the open data file keeps everything except the dashboard text, which lives in its own two files
json.dump(P, open(os.path.join(R, 'prompts/prompts.json'), 'w'), indent=1, ensure_ascii=False)
json.dump(dict(shared=SHARED, dashboard={k: v for k, v in DASH.items() if k != 'text'}), open(os.path.join(R, 'prompts/features.json'), 'w'), indent=1, ensure_ascii=False)
FAV = open(os.path.join(R, 'tools/favicon.html')).read().strip()
LOGO = '<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="14" cy="19" r="10" fill="#151515"/><rect x="18" y="6.5" width="6" height="5" rx="1.2" transform="rotate(40 21 9)" fill="#151515"/><path d="M23.5 6.5c2-2.5 4 .5 5.5-2.5" fill="none" stroke="#ff5a36" stroke-width="2" stroke-linecap="round"/></svg>'
MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>'
V = '5'
# Keep whatever dock version is live (another job bumps it in the built pages).
import re as _re
DOCKV = (_re.search(r'hmr-dock\.js\?v=([0-9.]+)', open(os.path.join(R, 'index.html')).read()) or [0, '6.6.1'])[1]

def head(title, desc, url):
    return ('<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
            '<title>%s</title>\n<meta name="description" content="%s">\n<meta property="og:title" content="%s">\n<meta property="og:description" content="%s">\n'
            '<meta property="og:url" content="%s">\n<meta property="og:type" content="website">\n<meta property="og:image" content="https://claudebomb.com/og.png">\n'
            '<meta name="twitter:card" content="summary_large_image">\n<meta name="theme-color" content="#fff6e0">\n<link rel="canonical" href="%s">\n%s\n'
            '<link rel="stylesheet" href="/assets/cb.css?v=%s">\n</head>\n') % (E(title), E(desc), E(title), E(desc), url, url, FAV, V)

def hdr(nav, home='/'):
    links = ''.join('<a href="%s">%s</a>' % (h, E(t)) for h, t in nav)
    return ('<header class="hdr">\n <a class="logo" href="%s" aria-label="claudebomb.com, home">%sclaudebomb</a>\n <nav class="nav" aria-label="Main">%s</nav>\n</header>\n'
            '<div class="promise"><div class="wrap"><b>100%% free, no ads, forever.</b><a href="/my/">My prompts</a><a href="/build/">Build a prompt</a><button class="chip" type="button" id="aichip">Which AI do you use?</button></div></div>\n') % (home, LOGO, links)

FOOT = '''<footer class="foot">
 <div class="wrap">
  <h2>claudebomb</h2>
  <p class="mut">A prompt so big it needs its own website. Our own prompts are free to use, share, and change under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>: credit claudebomb.com. Prompts in the <a href="/library/">open library</a> keep their own licence, shown on each page. Source and every change on <a href="https://github.com/AtlasJumped/claudebomb.com">GitHub</a>.</p>
  <p class="mut">Part of the <a href="https://hmrfamily.life">HMR family</a> of websites. Personal dashboard: <a href="https://personaldash.life">personaldash.life</a>. Work dashboard: <a href="https://workdash.life">workdash.life</a>.</p>
  <p class="mut">Prompts give general help, not legal, medical, or financial advice. Read a prompt before you paste it, and check what your AI does.</p>
 </div>
</footer>
<div class="toast" id="toast" role="status"></div>
'''
TAIL = ('<script src="/assets/cb.js?v=%s"></script>\n<script src="/assets/cb-config.js?v=1"></script>\n<script src="/assets/cb2.js?v=1"></script>\n<script src="/assets/cb-account.js?v=1"></script>\n%s<script src="/v6/funsies.js?v=1" defer></script>\n'
        '<script src="/hmr-dock.js?v=' + DOCKV + '" data-site="claudebomb.com" defer></script>\n</body></html>\n')

def microw(ta, st):
    return '<div class="microw"><button class="mic" type="button" data-mic="%s" data-st="%s">%s</button><p class="st" id="%s" role="status" aria-live="polite">Tap the microphone and talk, or type.</p></div>' % (ta, st, MIC, st)

def twopane(pfx, left_label, left_ph, right_label, right_ph):
    return ('<div class="pane2">\n <div class="pane"><label class="lbl" for="%s-p">%s</label><textarea class="ta" id="%s-p" placeholder="%s"></textarea></div>\n'
            ' <div class="pane"><label class="lbl" for="%s-t">%s</label><textarea class="ta talk" id="%s-t" placeholder="%s"></textarea>%s</div>\n</div>\n<div id="%s-sub"></div>\n') % (
        pfx, E(left_label), pfx, E(left_ph), pfx, E(right_label), pfx, E(right_ph), microw(pfx + '-t', pfx + '-st'), pfx)

# ---------------- index ----------------
cats = ['Dashboards']
for p in P:
    if p['category'] not in cats: cats.append(p['category'])
opts = ''.join('<option value="%s">%s</option>' % (E(c), E(c)) for c in cats)
cards = [dict(id=p['id'], category=p['category'], title=p['title'], summary=p['summary'], saves=p['saves'], page=p['page'],
              words=0 if p.get('load') else len(p['text'].split()), hay=(p['title'] + ' ' + p['summary'] + ' ' + p['category'] + ' ' + p['does'] + ' ' + p.get('text', '')).lower(),
              text=p.get('text', ''), load=bool(p.get('load'))) for p in ALL]
data = json.dumps(cards, ensure_ascii=False).replace('</', '<\\/')
STEPS = [
    ('Search', 'Type what you need.', '<div class="mock">plan a balcony garden</div><p><b>0 prompts.</b> Nobody has built this one yet.</p>'),
    ('Ask by voice', 'No prompt yet? Press the microphone and say what you want.', '<div class="mock">"A planner that asks about sun, space, and budget, then gives me a planting calendar."</div><p>Request sent.</p>'),
    ('Someone builds it', 'Anyone can write a version and share it, for free.', '<div class="mockcard"><b>Balcony garden planner</b><br>Asks about sun, space, budget, and climate, then builds a planting and watering calendar. 380 words.</div>'),
    ('Everyone improves it', 'Each prompt page takes improvements: paste your version and say why it is better.', '<div class="mockcard"><b>Improvement</b><br>"Adds a watering schedule for hot weeks. Fixes the pitfall where it suggested plants that need full sun."</div>'),
    ('History stays open', 'Every change is saved, with who made it and what they added.', '<div class="mockcard">Version 3: watering schedule for hot weeks<br>Version 2: asks about pets and kids<br>Version 1: first version</div>'),
]
steps_btns = ''.join('<li><button type="button" data-step="%d"%s>%d. %s</button></li>' % (i, ' aria-current="step"' if i == 0 else '', i + 1, E(t)) for i, (t, _, _) in enumerate(STEPS))
steps_json = json.dumps([dict(t=t, s=s, m=m) for t, s, m in STEPS]).replace('</', '<\\/')

idx = head('claudebomb.com | A prompt so big it needs its own website',
           'claudebomb is a free, open-source prompt bank for every AI. Search for a prompt that is already built, ask for one by voice, copy it in one click, and help make every prompt better. CC BY 4.0.',
           'https://claudebomb.com/')
idx += '<body id="top">\n<a class="skip" href="#bank">Skip to the prompts</a>\n'
idx += hdr([('#bank', 'Prompts'), ('/library/', 'Open library'), ('#ask', 'Ask for one'), ('#share', 'Share yours'), ('#others', 'Other galleries'), ('/council/', 'Council')], '#top')
idx += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <p class="eyebrow"><span class="no">Free</span> Open source. For every AI.</p>
  <h1 id="h1">A prompt so big it needs its own website</h1>
  <p class="lead">Prompting is now a skill, and a great prompt can be copied and pasted. When a few people do the hard work and share it, everyone else gets the time back. Search for a prompt that is already built, ask for one that is not, and help make them all better.</p>
  <form class="find" role="search" onsubmit="return false">
   <div><label for="q">Search prompts</label><input id="q" type="search" placeholder="Try: scam, tutor, contract, family" autocomplete="off"></div>
   <div><label for="cat">Type of prompt</label><select id="cat"><option value="">All types</option>''' + opts + '''</select></div>
   <p class="count" id="count" aria-live="polite"></p>
   <div class="best" id="best" hidden aria-live="polite"></div>
   <p class="others-top">Other prompt galleries: <a href="https://prompts.chat">prompts.chat</a>, <a href="https://github.com/danielmiessler/fabric">Fabric</a>, <a href="https://docs.langchain.com/langsmith/manage-prompts">LangChain Prompt Hub</a>, <a href="https://godofprompt.ai/prompt-library">God of Prompt</a>, <a href="https://promptbase.com">PromptBase</a>, <a href="https://code.claude.com/docs/en/prompt-library">Claude Code</a>, <a href="https://docs.cloud.google.com/vertex-ai/generative-ai/docs/prompt-gallery">Google</a>. <a href="#others">How they compare</a>.</p>
  </form>
 </div>
</section>

<section class="sec bank" id="bank" aria-labelledby="bank-h">
 <div class="wrap">
  <p class="eyebrow"><span class="no">1</span> The bank</p>
  <h2 id="bank-h">Prompts that do real work</h2>
  <p class="lead mut">Each one would take a person hours to write well. Open a prompt to see what it does, the pitfalls it avoids, and to switch features on or off before you copy it.</p>
  <div class="grid" id="grid"></div>
  <div class="empty" id="none" hidden><p><b>No prompt for that yet.</b> Ask for it, and say what you want it to do.</p><div class="btns"><a class="btn" href="#ask" id="none-ask">Ask for this prompt</a></div></div>
 </div>
</section>

<section class="sec ask" id="ask" aria-labelledby="ask-h">
 <div class="wrap">
  <p class="eyebrow"><span class="no">2</span> Ask for one</p>
  <h2 id="ask-h">Can't find it? Ask for it</h2>
  <p class="lead">Press the microphone and describe the prompt you wish existed: what it should do, every feature you want, and who it is for. Talk as long as you like.</p>
  <div class="pane" style="max-width:52rem">
   <label class="lbl" for="ask-t">The prompt I want</label>
   <textarea class="ta talk" id="ask-t" placeholder="For example: a prompt that plans a balcony garden. It should ask about sun, space, and budget, and give me a planting calendar."></textarea>
   ''' + microw('ask-t', 'ask-st') + '''
   <div id="ask-sub"></div>
  </div>
 </div>
</section>

<section class="sec flag" id="flagship" aria-labelledby="flag-h">
 <div class="wrap">
  <p class="eyebrow"><span class="no">3</span> The bar</p>
  <h2 id="flag-h">What one prompt can do</h2>
  <p class="lead">We built a personal dashboard prompt and made it free for everyone. It is the bar for this site. We want everyone to build free tools like this, and everyone to help make them better.</p>
  <div class="duo">
   <article class="card hl">
    <span class="tag">Available now, free forever</span>
    <h3><a href="/p/personal-dashboard/">Personal dashboard</a></h3>
    <p>Paste it into your AI assistant. Within minutes it audits your setup and suggests fixes, sets things up from your instructions, and builds one calm page for your day: a ranked to-do list, your inbox with drafted replies, your calendar, and the people who matter.</p>
    <div class="btns"><button class="btn" type="button" data-copy="personal-dashboard">Copy it</button><a class="btn ghost" href="/p/personal-dashboard/">Open its page</a></div>
   </article>
   <article class="card">
    <span class="tag warm">Planned, mid to late 2027</span>
    <h3>Work dashboard</h3>
    <p>The next step: the same idea for your work, where you and your employer each control what crosses between your personal and work dashboards. It is not built yet. We are building it with you.</p>
    <div class="btns"><a class="btn ghost" href="https://workdash.life">Open workdash.life</a></div>
   </article>
  </div>
 </div>
</section>

<section class="sec share" id="share" aria-labelledby="share-h">
 <div class="wrap">
  <p class="eyebrow"><span class="no">4</span> Share yours</p>
  <h2 id="share-h">Share the best prompt you have</h2>
  <p class="lead">Paste it on the left. On the right, just talk about it: what it does, why it is great, the pitfalls it avoids, anything else.</p>
  ''' + twopane('share', 'Your prompt', 'Paste your prompt here.', 'Talk about it', 'What does it do? Why is it great? What pitfalls does it avoid?') + '''
  <p class="mut">Shared prompts are published under CC BY 4.0 so anyone can use them. Do not paste anything private.</p>
 </div>
</section>

<section class="sec others" id="others" aria-labelledby="others-h">
 <div class="wrap">
  <p class="eyebrow"><span class="no">5</span> Other galleries</p>
  <h2 id="others-h">One of many prompt galleries, all linked here</h2>
  <p class="lead">claudebomb is one prompt gallery among many, so here is every one we know of. Use them all. What we add, as far as we could find in November 2026: every gallery linked in one place, and you can improve any prompt right on its page with no account and no GitHub, with every change kept in public.</p>
  <div class="gal">
   <article><h3><a href="https://prompts.chat">prompts.chat</a></h3><p>Free. About 3,000 prompts, public domain. With an account you can add prompts and propose changes, and it keeps versions.</p><p class="mut">All but 13 are in our open library, with credit. We left out jailbreak and sexual prompts.</p></article>
   <article><h3><a href="https://github.com/danielmiessler/fabric">Fabric</a></h3><p>Free, MIT licence. About 270 prompts for a command-line tool. Changes go through GitHub.</p><p class="mut">All of them are in our open library, with credit.</p></article>
   <article><h3><a href="https://docs.langchain.com/langsmith/manage-prompts">LangChain Prompt Hub</a></h3><p>Free to browse. Prompts are saved as versions. Built for developers.</p><p class="mut">Linked, not copied.</p></article>
   <article><h3><a href="https://godofprompt.ai/prompt-library">God of Prompt</a></h3><p>Free to browse and copy, with paid bundles. Its terms do not allow its prompts in another library.</p><p class="mut">Linked, not copied.</p></article>
   <article><h3><a href="https://promptbase.com">PromptBase</a></h3><p>A marketplace where you buy prompts one at a time.</p><p class="mut">Linked, not copied.</p></article>
   <article><h3><a href="https://platform.claude.com/docs/en/resources/prompt-library">Anthropic's prompting guide</a></h3><p>Anthropic's prompt library is now a guide on how to prompt Claude.</p><p class="mut">Worth reading before you write your own.</p></article>
   <article><h3><a href="https://code.claude.com/docs/en/prompt-library">Claude Code prompt library</a></h3><p>Short prompts for coding with Claude Code.</p><p class="mut">Linked, not copied.</p></article>
   <article><h3><a href="https://docs.cloud.google.com/vertex-ai/generative-ai/docs/prompt-gallery">Google's prompt gallery</a></h3><p>Sample prompts with example answers from Gemini. Trying them needs a Google Cloud account.</p><p class="mut">Linked, not copied.</p></article>
  </div>
  <h3>Coming next: the council</h3>
  <p style="max-width:46rem">Many galleries post the same prompts, and nobody checks which version is best. We plan to have the most capable AI from four companies read every free version of a prompt, debate it, and publish one best version here, with the whole debate. It is not running yet. <a href="/council/">How the council will work</a>.</p>
  <div class="btns"><a class="btn" href="/library/">Browse the open library</a><a class="btn ghost" href="/council/">The council</a></div>
 </div>
</section>

<section class="sec vision" id="vision" aria-labelledby="vision-h">
 <div class="wrap">
  <p class="eyebrow"><span class="no">6</span> Vision</p>
  <h2 id="vision-h">2036: everyone's prompt bank</h2>
  <p class="lead">Picture 2036. Humanity has a free, public prompt bank that everyone owns and everyone upgrades. When you have something complicated to ask an AI, this is the first place you go.</p>
  <p style="max-width:46rem">One-sentence requests will keep getting easier. A specific workflow will still do better. "Make me a dashboard" gets you a dashboard. A long prompt gets you the exact dashboard, with the features and tools you want. That gap is why this site will stay useful.</p>
  <h3>How it works, step by step</h3>
  <div class="demo">
   <ol class="steps" id="steps">''' + steps_btns + '''</ol>
   <div class="screen" id="screen" aria-live="polite"></div>
  </div>
  <div class="btns"><button class="btn ghost" type="button" id="play" aria-pressed="true">Pause the demo</button></div>
  <p class="demo-note">The garden planner is an example to show the process. Prompt pages, requests, improvements, and open history all work today.</p>
 </div>
</section>

<section class="sec why" id="why" aria-labelledby="why-h">
 <div class="wrap">
  <p class="eyebrow"><span class="no">7</span> Why this exists</p>
  <h2 id="why-h">Our hypothesis</h2>
  <p class="lead">Communication you can customize is what gets people to adopt AI. Most people type a short question and stop there. A great prompt shows the AI who you are, what you want, and how to check its own work.</p>
  <p>claudebomb is a free, open, clearly licensed bank of long prompts for everyone, improved in the open. Every prompt here follows the same bar: a clear goal, the context the AI needs, numbered steps, the shape of the answer, honesty rules (say when unsure, never invent sources), and what the AI must ask you before acting.</p>
  <div class="btns"><a class="btn" href="https://github.com/AtlasJumped/claudebomb.com/commits/main/prompts">Every change, on GitHub</a><a class="btn ghost" href="/prompts/prompts.json">All prompts as one file</a></div>
 </div>
</section>
</main>
''' + FOOT
idx_js = '''<script id="prompt-data" type="application/json">''' + data + '''</script>
<script>
(function(){
var C=window.CB,P=JSON.parse(document.getElementById('prompt-data').textContent);
var grid=document.getElementById('grid'),q=document.getElementById('q'),cat=document.getElementById('cat'),count=document.getElementById('count'),none=document.getElementById('none');
function byId(id){for(var i=0;i<P.length;i++)if(P[i].id===id)return P[i]}
function doCopy(id){var p=byId(id);if(!p)return;if(p.load)C.loadDash().then(function(t){return C.copyText(t)}).then(C.copied,function(){C.toast('We could not load the text. Try again in a moment.')});else C.copyText(p.text).then(C.copied)}
function el(t,c,x){return C.el(t,c,x)}
function render(){
 var term=q.value.trim().toLowerCase(),c=cat.value,n=0;grid.textContent='';
 P.forEach(function(p){
  if(c&&p.category!==c)return;
  if(term){var w=term.split(/\\s+/);for(var i=0;i<w.length;i++)if(p.hay.indexOf(w[i])<0)return}
  n++;var a=el('article','card');a.id='p-'+p.id;
  a.appendChild(el('span','tag',p.category));
  var h=el('h3'),l=el('a',null,p.title);l.href=p.page;h.appendChild(l);a.appendChild(h);
  a.appendChild(el('p',null,p.summary));a.appendChild(el('p','saves',p.saves));
  var mn=C.model&&C.model(),b=el('div','btns'),cb=el('button','btn',mn&&mn!=='other'?'Copy for '+C.modelName(mn):'Copy prompt');cb.setAttribute('data-copym','');cb.type='button';cb.setAttribute('data-copy',p.id);cb.setAttribute('aria-label','Copy prompt: '+p.title);
  var op=el('a','btn ghost','Open');op.href=p.page;op.setAttribute('aria-label','Open the page for: '+p.title);b.appendChild(cb);b.appendChild(op);a.appendChild(b);
  a.appendChild(el('p','meta',(p.words?p.words+' words. ':'')+'Works with Claude, ChatGPT, Gemini, and other assistants.'));
  grid.appendChild(a);
 });
 none.hidden=n>0||!!term;
 count.textContent=n+(n===1?' prompt':' prompts')+(c?' in '+c:'')+(term?' matching "'+q.value.trim()+'"':'');
 try{var u=new URL(location.href);term?u.searchParams.set('q',q.value.trim()):u.searchParams.delete('q');c?u.searchParams.set('type',c):u.searchParams.delete('type');history.replaceState(null,'',u)}catch(e){}
}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-copy]');if(t)doCopy(t.getAttribute('data-copy'))});
try{var sp=new URLSearchParams(location.search);if(sp.get('q'))q.value=sp.get('q');if(sp.get('type'))cat.value=sp.get('type')}catch(e){}
q.addEventListener('input',render);cat.addEventListener('change',render);render();
var best=document.getElementById('best'),IX=null,loading=0,lt=0;
function bestRow(r){var li=C.el('li'),a=C.el('a',null,r.title);a.href=r.url;li.appendChild(a);li.appendChild(C.el('span','tag',r.src==='cb'?'claudebomb':r.src==='pc'?'prompts.chat':'Fabric'));li.appendChild(C.el('p','mut',r.excerpt));return li}
function findBest(){var t=q.value.trim();if(!t){best.hidden=true;return}
 if(!IX){if(!loading){loading=1;best.hidden=false;best.textContent='Searching every prompt...';fetch('/library/index.json?v=5').then(function(r){return r.json()}).then(function(d){IX=C.prep(d.map(function(x){return{url:x[0],title:x[1],src:x[2],excerpt:x[3],dev:x[4],kw:x[5],cat:x[6]||''}}));findBest()},function(){best.hidden=true})}return}
 var res=C.search(IX,t),k=C.shortPick(res);best.textContent='';best.hidden=false;
 if(k){best.appendChild(C.el('h3',null,k===1?'Best match':'Best matches'));var ol=C.el('ol');res.slice(0,k).forEach(function(x){ol.appendChild(bestRow(x.r))});best.appendChild(ol);
  if(res.length>k){var m=C.el('a',null,'See all '+res.length.toLocaleString()+' results');m.href='/library/?q='+encodeURIComponent(t);var pm=C.el('p','sm');pm.appendChild(m);best.appendChild(pm)}}
 else best.appendChild(C.el('h3',null,'No prompt for that yet, here or anywhere we searched.'));
 var bp=C.el('p','buildit'),ba=C.el('a',null,"Don't see your prompt? Build it here");ba.href='/build/?q='+encodeURIComponent(t);bp.appendChild(ba);bp.appendChild(document.createTextNode(' or '));var aa=C.el('a',null,'ask us for it');aa.href='#ask';aa.addEventListener('click',function(){var at=document.getElementById('ask-t');if(!at.value)at.value='A prompt for: '+t+'. '});bp.appendChild(aa);bp.appendChild(document.createTextNode('.'));best.appendChild(bp)}
q.addEventListener('input',function(){clearTimeout(lt);lt=setTimeout(findBest,200)});findBest();
// ask for a prompt
var at=document.getElementById('ask-t');C.keep(at,'cb-ask');
document.getElementById('none-ask').addEventListener('click',function(){var v=q.value.trim();if(v&&!at.value)at.value='A prompt for: '+v+'. ';setTimeout(function(){at.focus()},300)});
C.submitPair(document.getElementById('ask-sub'),{kind:'prompt request',text:function(){var t=at.value.trim();return t?'Prompt request on claudebomb.com\\n\\n'+t+(q.value.trim()?'\\n\\nThey searched for: '+q.value.trim():''):''},details:function(){return{page:'claudebomb.com/#ask',search:q.value.trim()}},onSent:function(){at.value='';C.ls('cb-ask',null)}});
// share a prompt
var sp1=document.getElementById('share-p'),st1=document.getElementById('share-t');C.keep(sp1,'cb-share-p');C.keep(st1,'cb-share-t');
C.submitPair(document.getElementById('share-sub'),{kind:'prompt share',empty:'Paste your prompt, or talk about it, first.',text:function(){var a=sp1.value.trim(),b=st1.value.trim();if(!a&&!b)return'';return'Shared prompt on claudebomb.com\\n\\nWhat they said:\\n'+(b||'(nothing)')+'\\n\\nTheir prompt:\\n'+(a||'(none pasted)')},details:function(){return{page:'claudebomb.com/#share'}},onSent:function(){sp1.value=st1.value='';C.ls('cb-share-p',null);C.ls('cb-share-t',null)}});
// vision demo
var S=''' + steps_json + ''',scr=document.getElementById('screen'),bs=document.querySelectorAll('#steps button'),play=document.getElementById('play'),cur=0,timer=0,on=!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
function show(i){cur=i;for(var k=0;k<bs.length;k++){if(k===i)bs[k].setAttribute('aria-current','step');else bs[k].removeAttribute('aria-current')}scr.innerHTML='<p class="eyebrow"><span class="no">'+(i+1)+'</span> '+S[i].t+'</p><p><b>'+S[i].s+'</b></p>'+S[i].m}
function tick(){clearTimeout(timer);if(on)timer=setTimeout(function(){show((cur+1)%S.length);tick()},3800)}
function setOn(v){on=v;play.textContent=v?'Pause the demo':'Play the demo';play.setAttribute('aria-pressed',v?'true':'false');tick()}
Array.prototype.forEach.call(bs,function(b){b.addEventListener('click',function(){show(+b.getAttribute('data-step'));setOn(false)})});
play.addEventListener('click',function(){setOn(!on)});show(0);setOn(on);
})();
</script>
'''
idx += TAIL % (V, idx_js)
open(os.path.join(R, 'index.html'), 'w').write(idx)

# ---------------- one page per prompt ----------------
def feat_rows(feats, pfx):
    out = []
    for i, f in enumerate(feats):
        nm = '%s%d' % (pfx, i)
        opts = [('want', 'Yes'), ('', 'Either')] + ([('dont', 'No')] if f.get('dont') else [])
        seg = ''.join('<label><input type="radio" name="%s" value="%s"%s><span>%s</span></label>' % (nm, v, ' checked' if v == '' else '', t) for v, t in opts)
        tip = f['want'] + ((' / No: ' + f['dont']) if f.get('dont') else '')
        out.append('<div class="feat" role="radiogroup" aria-label="%s"><span class="fn" title="%s">%s</span><span class="seg">%s</span></div>' % (E(f['name']), E(tip), E(f['name']), seg))
    return '\n'.join(out)

for p in ALL:
    pid = p['id']; feats = p['features'] + SHARED
    pits = ''.join('<div class="pit"><div><b>Common pitfall</b>%s</div><div><b>How this prompt handles it</b>%s</div></div>' % (E(x['pitfall']), E(x['fix'])) for x in p['pitfalls'])
    src = ('<a href="https://github.com/AtlasJumped/claudebomb.com/blob/main/%s">%s</a>' % (p['paths'][0], 'the setup guide') +
           ' and <a href="https://github.com/AtlasJumped/claudebomb.com/blob/main/%s">the dashboard instructions</a>' % p['paths'][1]) if p.get('load') else '<a href="https://github.com/AtlasJumped/claudebomb.com/blob/main/%s">its file</a>' % p['paths'][0]
    pg = head('%s | claudebomb.com' % p['title'], p['summary'], 'https://claudebomb.com' + p['page'])
    pg += '<body id="top">\n<a class="skip" href="#prompt">Skip to the prompt</a>\n'
    pg += hdr([('/#bank', 'All prompts'), ('#prompt', 'The prompt'), ('#improve', 'Improve it'), ('#history', 'History'), ('/#ask', 'Ask for one')])
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <p class="eyebrow"><a class="tag" href="/?type=%s#bank">%s</a></p>
  <h1 class="sm" id="h1">%s</h1>
  <p class="lead">%s</p>
  <p class="saves">%s</p>
  <div class="btns"><button class="btn" type="button" data-copyv data-copym>Copy prompt</button><a class="btn ghost" href="#prompt">Make it yours</a></div>
  <p class="st" id="vinfo"></p>
 </div>
</section>

<section class="sec flag" aria-labelledby="does-h">
 <div class="wrap">
  <h2 id="does-h">What it does</h2>
  <p class="lead">%s</p>
  <h3>Common pitfalls, and how this prompt handles them</h3>
  <div class="pits">%s</div>
 </div>
</section>

<section class="sec bank" id="prompt" aria-labelledby="pr-h">
 <div class="wrap">
  <h2 id="pr-h">Make it yours</h2>
  <p class="lead mut">Pick the features you do and don't want. Yes adds that instruction, No asks for the opposite, Either leaves it out. Your choices go at the end of the prompt and win over anything above them.</p>
  <div class="feats">%s</div>
  <p class="adj" id="adj"></p>
  <h3>Fill it in, by voice or by typing</h3>
  <p class="mut">Everything you write here is added at the end of the prompt. Tap a microphone and just talk. It stays on this device.</p>
  <div id="cz"></div>
  <div class="btns"><button class="btn" type="button" data-copyv data-copym>Copy prompt</button><button class="btn ghost" type="button" data-save>Save to My prompts</button><button class="btn ghost" type="button" id="clearf">Clear my choices</button></div>
  <p class="mut sm">One version works with every AI today. Versions tuned for each AI will come from <a href="/council/">the council</a>.</p>
  <details id="read"><summary>Read it first, and edit it as much as you want</summary>
   <p class="mut">Change anything below. Your edits stay on this device only. Copy prompt copies your version, plus the features you picked.</p>
   <label class="sr" for="ed">The prompt text</label>
   <textarea class="ta big" id="ed" spellcheck="false">%s</textarea>
   <div class="btns"><button class="btn" type="button" data-copyv data-copym>Copy prompt</button><button class="btn ghost" type="button" id="hide">Hide it</button><button class="btn ghost" type="button" id="reset">Undo my edits</button></div>
  </details>
 </div>
</section>

<section class="sec share" id="improve" aria-labelledby="imp-h">
 <div class="wrap">
  <h2 id="imp-h">Improve this prompt</h2>
  <p class="lead">Paste your version on the left. On the right, just talk about it: what it does well, the pitfalls it fixes, anything else. We read every one and fold the best into the next version.</p>
  <div class="btns"><button class="btn ghost" type="button" id="startfrom">Start from this prompt</button></div>
  %s
  <p class="mut">Improvements are published under CC BY 4.0. If you add your email, we can credit you in the history. Do not paste anything private.</p>
 </div>
</section>

<section class="sec why" id="history" aria-labelledby="hist-h">
 <div class="wrap">
  <h2 id="hist-h">Version history</h2>
  <p class="lead">Every change to this prompt is public: when it changed, who changed it, and what they added. Read the full text in %s.</p>
  <ul class="hist" id="hist"><li>Loading the history...</li></ul>
  <p class="mut" id="contrib"></p>
 </div>
</section>
</main>
''' % (E(p['category']), E(p['category']), E(p['title']), E(p['summary']), E(p['saves']), E(p['does']), pits,
       feat_rows(feats, 'f'), E(p.get('text', '') if not p.get('load') else 'Loading the text...'),
       twopane('imp', 'Your version of this prompt', 'Paste your version here, or press Start from this prompt.', 'Talk about it', 'What does your version do well? Which pitfalls does it fix? Anything else.'), src)
    pg += FOOT
    js = '''<script id="pdata" type="application/json">%s</script>
<script>
(function(){
var C=window.CB,D=JSON.parse(document.getElementById('pdata').textContent),ed=document.getElementById('ed'),ORIG=D.text,KEY='cb-ed-'+D.id,KF='cb-f-'+D.id;
function feats(){var out=[];D.feats.forEach(function(f,i){var r=document.querySelector('input[name="f'+i+'"]:checked');var v=r?r.value:'';if(v==='want')out.push(f.want);else if(v==='dont'&&f.dont)out.push(f.dont)});return out}
var CZ=C.custom(document.getElementById('cz'),{id:D.id,fields:D.fields});CZ.on(function(){info()});
function version(){var a=feats(),t=ed.value.replace(/\\s+$/,'');var v=a.length?t+'\\n\\n---\\n\\nMy adjustments. These win over anything above where they differ:\\n- '+a.join('\\n- ')+'\\n':t+'\\n';return v.replace(/\\s+$/,'')+CZ.text()+(CZ.count()?'':'\\n')}
function info(){var a=feats(),edited=ed.value!==ORIG&&ORIG;var s=[];if(a.length)s.push(a.length+(a.length===1?' feature':' features')+' picked');if(edited)s.push('your edits');if(CZ.count())s.push('your details');document.getElementById('adj').textContent=a.length?'Added at the end: '+a.join(' '):'No features picked. The prompt copies as written.';document.getElementById('vinfo').textContent=s.length?'Copy prompt includes '+s.join(' and ')+'.':''}
function saveF(){var o={};D.feats.forEach(function(f,i){var r=document.querySelector('input[name="f'+i+'"]:checked');if(r&&r.value)o[i]=r.value});C.ls(KF,JSON.stringify(o))}
try{var o=JSON.parse(C.ls(KF)||'{}');Object.keys(o).forEach(function(i){var r=document.querySelector('input[name="f'+i+'"][value="'+o[i]+'"]');if(r)r.checked=true})}catch(e){}
document.querySelector('.feats').addEventListener('change',function(){saveF();info()});
Array.prototype.forEach.call(document.querySelectorAll('[data-save]'),function(b){b.addEventListener('click',function(){if(!ORIG){C.toast('The text is still loading.');return}C.save({id:D.id,title:D.title,url:'/p/'+D.id+'/',text:version()});C.toast('Saved to My prompts on this device.')})});
document.getElementById('clearf').addEventListener('click',function(){CZ.clear();Array.prototype.forEach.call(document.querySelectorAll('.feats input[value=""]'),function(r){r.checked=true});C.ls(KF,null);info()});
function ready(){var s=C.ls(KEY);if(s)ed.value=s;info()}
if(D.load){ed.value='Loading the text...';C.loadDash().then(function(t){ORIG=t;ed.value=t;ready()},function(){ed.value='We could not load the text. Reload the page to try again.'})}else ready();
ed.addEventListener('input',function(){if(ORIG&&ed.value!==ORIG)C.ls(KEY,ed.value);else C.ls(KEY,null);info()});
function doCopy(){if(!ORIG){C.toast('The text is still loading. Try again in a moment.');return}C.copyText(version()).then(C.copied)}
Array.prototype.forEach.call(document.querySelectorAll('[data-copyv]'),function(b){b.addEventListener('click',doCopy)});
var rd=document.getElementById('read');document.getElementById('hide').addEventListener('click',function(){rd.open=false;rd.scrollIntoView({block:'nearest'})});
document.getElementById('reset').addEventListener('click',function(){if(ORIG){ed.value=ORIG;C.ls(KEY,null);info();C.toast('Back to the original text.')}});
if(location.hash==='#prompt')rd.open=true;
Array.prototype.forEach.call(document.querySelectorAll('a[href="#prompt"]'),function(a){a.addEventListener('click',function(){rd.open=true})});
// improve
var ip=document.getElementById('imp-p'),it=document.getElementById('imp-t');C.keep(ip,'cb-imp-p-'+D.id);C.keep(it,'cb-imp-t-'+D.id);
document.getElementById('startfrom').addEventListener('click',function(){if(!ORIG)return;if(ip.value.trim()&&!confirmSwap())return;ip.value=version();ip.dispatchEvent(new Event('input'));ip.focus()});
function confirmSwap(){C.toast('Your pasted text was replaced with this prompt.');return true}
C.submitPair(document.getElementById('imp-sub'),{kind:'prompt improvement',empty:'Paste your version, or talk about it, first.',text:function(){var a=ip.value.trim(),b=it.value.trim();if(!a&&!b)return'';return'Improvement for: '+D.title+' (https://claudebomb.com/p/'+D.id+'/)\\n\\nWhat they said:\\n'+(b||'(nothing)')+'\\n\\nTheir version:\\n'+(a||'(none pasted)')},details:function(){return{prompt:D.id}},onSent:function(){ip.value=it.value='';C.ls('cb-imp-p-'+D.id,null);C.ls('cb-imp-t-'+D.id,null)}});
// history from GitHub
var hl=document.getElementById('hist'),HK='cb-hist-'+D.id;
function draw(list){hl.textContent='';if(!list.length){hl.appendChild(C.el('li',null,'No history yet.'));return}var who={};list.forEach(function(c){who[c.who]=1;var li=C.el('li'),a=C.el('a',null,c.msg);a.href=c.url;li.appendChild(C.el('div','when',c.date+', by '+c.who));li.appendChild(a);hl.appendChild(li)});document.getElementById('contrib').textContent='Contributors so far: '+Object.keys(who).join(', ')+'.'}
function fail(){hl.textContent='';var li=C.el('li'),a=C.el('a',null,'See every change on GitHub');a.href='https://github.com/AtlasJumped/claudebomb.com/commits/main/'+D.paths[0];li.appendChild(C.el('span',null,'The history could not load right now. '));li.appendChild(a);hl.appendChild(li)}
try{var c=JSON.parse(sessionStorage.getItem(HK)||'null');if(c){draw(c)}}catch(e){c=null}
if(!c)Promise.all(D.paths.map(function(pa){return fetch('https://api.github.com/repos/AtlasJumped/claudebomb.com/commits?per_page=30&path='+encodeURIComponent(pa)).then(function(r){if(!r.ok)throw 0;return r.json()})})).then(function(rs){var seen={},list=[];rs.forEach(function(r){r.forEach(function(x){if(seen[x.sha])return;seen[x.sha]=1;var n=(x.author&&x.author.login)||(x.commit.author&&x.commit.author.name)||'unknown';list.push({t:x.commit.author.date,date:new Date(x.commit.author.date).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}),who:n,msg:x.commit.message.split('\\n')[0],url:x.html_url})})});list.sort(function(a,b){return a.t<b.t?1:-1});try{sessionStorage.setItem(HK,JSON.stringify(list))}catch(e){}draw(list)}).catch(fail);
})();
</script>
''' % json.dumps(dict(id=pid, title=p['title'], text=p.get('text', ''), load=bool(p.get('load')), paths=p['paths'], feats=feats, fields=p['fields']), ensure_ascii=False).replace('</', '<\\/')
    pg += TAIL % (V, js)
    os.makedirs(os.path.join(R, 'p', pid), exist_ok=True)
    open(os.path.join(R, 'p', pid, 'index.html'), 'w').write(pg)

from library import build as build_library
LIBN = build_library(R, E, head, hdr, FOOT, TAIL, V, twopane, ours=[dict(page=p['page'], title=p['title'], summary=p['summary'], category=p['category'], text=p.get('text', '')) for p in ALL])
print('library prompts:', LIBN)
from pages2 import build as build_pages2
build_pages2(R, E, head, hdr, FOOT, TAIL, V, microw)

bad = []
for root, _, fs in os.walk(R):
    if '.git' in root: continue
    for f in fs:
        if f.endswith(('.html', '.js', '.css', '.json')) and ('/p/' in os.path.join(root, f) or f in ('index.html', 'cb.js', 'cb.css', 'prompts.json', 'features.json')) and root.startswith((R + '/p', R + '/assets', R + '/prompts')) or os.path.join(root, f) == os.path.join(R, 'index.html'):
            s = open(os.path.join(root, f)).read()
            if '—' in s or '–' in s: bad.append(os.path.join(root, f))
print('built', len(ALL), 'prompt pages; dashes in:', bad)
