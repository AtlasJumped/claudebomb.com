"""Builds the open library (/library/, /l/<source>/<id>/) and the council page (/council/).
Called from tools/build.py with that file's page helpers. Sources: library/sources/*.json (made by tools/import_library.py)."""
import json, os, re, math
from collections import Counter
STOPW = set('a an and are as at be by can for from how i in into is it its me my of on or our so that the this to was what when which who will with you your act want need help make prompt prompts use using user also each any all not but have has should would could must only then than them they their there these those about more most such very just like one two first output input give provide write create based following ensure include including make sure please'.split())
def words(t): return [w for w in re.findall(r'[a-z][a-z0-9]+', t.lower()) if len(w) > 3 and w not in STOPW]

def build(R, E, head, hdr, FOOT, TAIL, V, twopane, ours=()):
    S = [json.load(open(os.path.join(R, 'library/sources', f))) for f in ('prompts-chat.json', 'fabric.json')]
    total = sum(len(s['prompts']) for s in S)
    index = []
    texts = []
    nav = [('/#bank', 'Our prompts'), ('/library/', 'Open library'), ('/council/', 'Council'), ('/#ask', 'Ask for one')]
    for s in S:
        sh = s['short']
        src_url = s['repo'] + '/blob/' + s['commit'] + '/' + s['file'] if s.get('file') else None
        for p in s['prompts']:
            url = '/l/%s/%s/' % (sh, p['id'])
            ex = ' '.join(p['text'].split())[:150]
            index.append([url, p['title'], sh, ex, 1 if p.get('dev') else 0]); texts.append(p['text'])
            if sh == 'pc':
                who = (' Contributed by %s.' % E(p['contributor'])) if p.get('contributor') else ''
                credit = 'From <a href="%s">prompts.chat</a>.%s Public domain under <a href="%s">CC0 1.0</a>, copied from <a href="%s">this saved version of its prompt list</a>.' % (s['home'], who, s['licence_url'], src_url)
                orig = s['home']; note = ''
            else:
                purl = '%s/tree/%s/data/patterns/%s' % (s['repo'], s['commit'], p['name'])
                credit = 'From <a href="%s">Fabric</a> by Daniel Miessler and contributors, under the <a href="/library/LICENSE-fabric.txt">MIT licence</a>. Copied from <a href="%s">this saved version of the pattern</a>.' % (s['home'], purl)
                orig = purl
                note = '<p class="mut">Fabric patterns are instructions. Paste this into your AI, then paste the text you want it to work on.</p>'
            desc = ex[:155]
            pg = head('%s | Open library | claudebomb.com' % p['title'], desc, 'https://claudebomb.com' + url)
            pg += '<body id="top">\n<a class="skip" href="#prompt">Skip to the prompt</a>\n' + hdr(nav)
            pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <p class="eyebrow"><a class="tag" href="/library/">Open library</a></p>
  <h1 class="sm" id="h1">%s</h1>
  <p class="saves">%s</p>
  <div class="btns"><button class="btn" type="button" data-copyl data-copym>Copy prompt</button><a class="btn ghost" href="#mine">Make it yours</a><a class="btn ghost" href="%s">Open the source</a></div>
 </div>
</section>
<section class="sec bank" id="prompt" aria-labelledby="pr-h">
 <div class="wrap">
  <h2 id="pr-h">The prompt</h2>
  %s<pre id="pt">%s</pre>
  <h3 id="mine">Make it yours, by voice or by typing</h3>
  <p class="mut">Anything you write here is added at the end of the prompt when you copy it. It stays on this device.</p>
  <div id="cz"></div>
  <div class="btns"><button class="btn" type="button" data-copyl data-copym>Copy prompt</button><button class="btn ghost" type="button" data-save>Save to My prompts</button></div>
  <p class="mut">Not reviewed by <a href="/council/">the council</a> yet. Read a prompt before you paste it.</p>
 </div>
</section>
<section class="sec share" id="improve" aria-labelledby="imp-h">
 <div class="wrap">
  <h2 id="imp-h">Improve this prompt</h2>
  <p class="lead">No account needed. Paste your version on the left. On the right, just talk about it: what it does better and which pitfalls it fixes.</p>
  <div class="btns"><button class="btn ghost" type="button" id="startfrom">Start from this prompt</button></div>
  %s
  <p class="mut">Improvements are published under CC BY 4.0. Do not paste anything private.</p>
 </div>
</section>
</main>
''' % (E(p['title']), credit, orig, note, E(p['text']),
       twopane('imp', 'Your version of this prompt', 'Paste your version here, or press Start from this prompt.', 'Talk about it', 'What does your version do better? Which pitfalls does it fix?'))
            pg += FOOT
            js = '''<script>
(function(){var C=window.CB,T=document.getElementById('pt').textContent,K='%s',TI=%s;
var CZ=C.custom(document.getElementById('cz'),{id:'l-'+K});function full(){return T.replace(/\\s+$/,'')+CZ.text()}
Array.prototype.forEach.call(document.querySelectorAll('[data-copyl]'),function(b){b.addEventListener('click',function(){C.copyText(full()).then(C.copied)})});
Array.prototype.forEach.call(document.querySelectorAll('[data-save]'),function(b){b.addEventListener('click',function(){C.save({id:'l-'+K,title:TI,url:'/l/'+K+'/',text:full()});C.toast('Saved to My prompts on this device.')})});
var ip=document.getElementById('imp-p'),it=document.getElementById('imp-t');C.keep(ip,'cb-imp-p-'+K);C.keep(it,'cb-imp-t-'+K);
document.getElementById('startfrom').addEventListener('click',function(){ip.value=T;ip.dispatchEvent(new Event('input'));ip.focus()});
C.submitPair(document.getElementById('imp-sub'),{kind:'prompt improvement',empty:'Paste your version, or talk about it, first.',text:function(){var a=ip.value.trim(),b=it.value.trim();if(!a&&!b)return'';return'Improvement for library prompt: '+TI+' (https://claudebomb.com/l/'+K+'/)\\n\\nWhat they said:\\n'+(b||'(nothing)')+'\\n\\nTheir version:\\n'+(a||'(none pasted)')},details:function(){return{library:K}},onSent:function(){ip.value=it.value='';C.ls('cb-imp-p-'+K,null);C.ls('cb-imp-t-'+K,null)}});
})();
</script>
''' % (sh + '/' + p['id'], json.dumps(p['title']).replace('</', '<\\/'))
            pg += TAIL % (V, js)
            d = os.path.join(R, 'l', sh, p['id']); os.makedirs(d, exist_ok=True)
            open(os.path.join(d, 'index.html'), 'w').write(pg)
    for o in ours:
        index.insert(0, [o['page'], o['title'], 'cb', o['summary'][:150], 0]); texts.insert(0, o['summary'] + ' ' + o.get('text', ''))
    df = Counter(); bags = []
    for t in texts:
        c = Counter(words(t)); bags.append(c); df.update(c.keys())
    N = len(texts)
    for row, c, o in zip(index, bags, [None] * len(index)):
        top = sorted(c, key=lambda w: -c[w] * math.log(N / (1 + df[w])))[:10]
        row.append(' '.join(top))
    cats = {o['page']: o['category'] for o in ours}
    for row in index:
        if row[0] in cats: row.append(cats[row[0]])
    json.dump(index, open(os.path.join(R, 'library/index.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(R, 'library/LICENSE-fabric.txt'), 'w').write(S[1]['notice'])
    open(os.path.join(R, 'library/LICENSE-prompts-chat.txt'), 'w').write('Prompts from prompts.chat (https://prompts.chat) are dedicated to the public domain under CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/\n')
    n_pc, n_fb = len(S[0]['prompts']), len(S[1]['prompts'])

    # ---------- /library/ ----------
    pg = head('Open library: %s free prompts | claudebomb.com' % format(total, ','), 'Search %s free, openly licensed prompts from prompts.chat and Fabric, credited to their sources, and improve any of them with no account.' % format(total, ','), 'https://claudebomb.com/library/')
    pg += '<body id="top">\n<a class="skip" href="#lib">Skip to the prompts</a>\n' + hdr(nav)
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <p class="eyebrow"><span class="no">Free</span> Openly licensed, credited</p>
  <h1 id="h1">Search every prompt</h1>
  <p class="lead">%s free prompts from other open galleries, in one place: %s from <a href="%s">prompts.chat</a> (public domain) and %s from <a href="%s">Fabric</a> (MIT licence). Each page credits its source. You can improve any of them with no account.</p>
  <form class="find" role="search" onsubmit="return false">
   <div><label for="q">Search the library</label><input id="q" type="search" placeholder="Try: interview, excel, summary, travel" autocomplete="off"></div>
   <div><label for="src">Source</label><select id="src"><option value="">All sources</option><option value="cb">claudebomb</option><option value="pc">prompts.chat</option><option value="fb">Fabric</option><option value="dev">For developers</option></select></div>
   <p class="count" id="count" aria-live="polite">Loading the library...</p>
  </form>
 </div>
</section>
<section class="sec bank" id="lib" aria-labelledby="lib-h">
 <div class="wrap">
  <h2 id="lib-h" class="sr">Results</h2>
  <ul class="libl" id="list"></ul>
  <div class="btns"><button class="btn ghost" type="button" id="more" hidden>Show more</button></div>
  <p class="buildit" id="buildit" hidden><a href="/build/">Don't see your prompt? Build it here</a>, or <a href="/#ask">ask us for it</a>.</p>
  <p class="mut">These prompts have not been through <a href="/council/">the council</a> yet. Our own long prompts, with pitfalls and feature switches, are on the <a href="/#bank">home page</a>. We only copy free, openly licensed prompts. Paid galleries are linked from the home page, never copied.</p>
 </div>
</section>
</main>
''' % (format(total, ','), format(n_pc, ','), S[0]['home'], n_fb, S[1]['home'])
    pg += FOOT
    js = '''<script>
(function(){var C=window.CB,q=document.getElementById('q'),src=document.getElementById('src'),list=document.getElementById('list'),count=document.getElementById('count'),more=document.getElementById('more'),bi=document.getElementById('buildit'),IX=null,ALL=[],hits=[],shown=0,N={cb:'claudebomb',pc:'prompts.chat',fb:'Fabric'};
function row(r){var li=C.el('li'),a=C.el('a',null,r.title);a.href=r.url;li.appendChild(a);li.appendChild(C.el('span','tag',N[r.src]));li.appendChild(C.el('p','mut',r.excerpt+(r.excerpt.length>=150?'...':'')));return li}
function page(n){var end=Math.min(shown+n,hits.length);for(var i=shown;i<end;i++)list.appendChild(row(hits[i]));shown=end;more.hidden=shown>=hits.length;more.textContent=shown<=3&&hits.length>shown?'Show all '+hits.length.toLocaleString()+' results':'Show more'}
function keep(r,s){return !(s==='dev'?!r.dev:(s&&r.src!==s))}
function run(){var t=q.value.trim(),s=src.value;
 if(!t)hits=ALL.filter(function(r){return keep(r,s)});
 list.textContent='';shown=0;var k=0;
 if(t){var res=C.search(IX,t).filter(function(x){return keep(x.r,s)});hits=res.map(function(x){return x.r});k=C.shortPick(res)}
 page(t?Math.max(k,1):50);
 count.textContent=t?(hits.length?(k===1?'Best match':'Best matches')+' for "'+t+'", out of '+hits.length.toLocaleString():'No prompt for "'+t+'" yet'):hits.length.toLocaleString()+' prompts';
 bi.hidden=!t;var a=bi.querySelector('a');a.href='/build/?q='+encodeURIComponent(t);
 try{var u=new URL(location.href);t?u.searchParams.set('q',t):u.searchParams.delete('q');s?u.searchParams.set('src',s):u.searchParams.delete('src');history.replaceState(null,'',u)}catch(e){}}
try{var sp=new URLSearchParams(location.search);if(sp.get('q'))q.value=sp.get('q');if(sp.get('src'))src.value=sp.get('src')}catch(e){}
fetch('/library/index.json?v=%s').then(function(r){return r.json()}).then(function(d){ALL=d.map(function(x){return{url:x[0],title:x[1],src:x[2],excerpt:x[3],dev:x[4],kw:x[5],cat:x[6]||''}});IX=C.prep(ALL);run()},function(){count.textContent='The library could not load. Reload the page to try again.'});
var lt=0;q.addEventListener('input',function(){clearTimeout(lt);lt=setTimeout(run,150)});src.addEventListener('change',run);more.addEventListener('click',function(){page(50)});
})();
</script>
''' % V
    pg += TAIL % (V, js)
    open(os.path.join(R, 'library/index.html'), 'w').write(pg)

    # ---------- /council/ ----------
    STEPS = [
        ('Gather every free version', 'Collect every public, openly licensed version of a prompt: ours, the open library, and improvements people send in. Paid prompts are never used.'),
        ('Four seats review alone', 'The most capable model from Anthropic (Claude), OpenAI (ChatGPT), Google (Gemini), and xAI (Grok) each read every version on its own and list its strengths, pitfalls, and what is missing.'),
        ('They debate', 'Each seat reads the other three reviews and answers them: where it agrees, where it disagrees, and why.'),
        ('One merged version', 'A chair writes the best version from the debate. The seats vote, and any disagreement is written down.'),
        ('Published in the open', 'The new version goes on the prompt page with the full debate, as a new entry in its public history. Your improvements go into the next round.'),
    ]
    steps = ''.join('<li><b>%s.</b> %s</li>' % (E(t), E(s)) for t, s in STEPS)
    pg = head('The council | claudebomb.com', 'How claudebomb plans to merge the best version of every prompt: the most capable AI from four companies review every free version, debate, and publish one best version in the open.', 'https://claudebomb.com/council/')
    pg += '<body id="top">\n<a class="skip" href="#how">Skip to how it works</a>\n' + hdr(nav)
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <p class="eyebrow"><span class="no">Planned</span> Not running yet</p>
  <h1 id="h1">The council: four top AIs, one best prompt</h1>
  <p class="lead">Many sites post the same prompts, and none of them checks which version is best. The council will: the most capable model from four AI companies reads every free version of a prompt, they argue it out, and one best version is published here for free, with the whole debate.</p>
 </div>
</section>
<section class="sec bank" id="how" aria-labelledby="how-h">
 <div class="wrap">
  <h2 id="how-h">How it will work</h2>
  <ol class="cl">%s</ol>
  <h3>Where it stands today</h3>
  <p>The council has not reviewed any prompt yet. The program that runs it is open on <a href="https://github.com/AtlasJumped/claudebomb.com/blob/main/tools/council.py">GitHub</a>. When a prompt has been through the council, its page will say so and link the debate.</p>
  <h3>The rules it follows</h3>
  <ul>
   <li>Only free, openly licensed prompts go in, with credit to where they came from.</li>
   <li>Every seat sees the same versions and the same instructions.</li>
   <li>The debate is published in full, including where the seats disagreed.</li>
   <li>People still have the last word: anyone can send an improvement, and it goes into the next round.</li>
  </ul>
  <div class="btns"><a class="btn" href="/library/">Browse the open library</a><a class="btn ghost" href="/#bank">Our prompts</a></div>
 </div>
</section>
</main>
''' % steps
    pg += FOOT + TAIL % (V, '')
    os.makedirs(os.path.join(R, 'council'), exist_ok=True)
    open(os.path.join(R, 'council/index.html'), 'w').write(pg)
    return total
