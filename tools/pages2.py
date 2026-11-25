"""Builds /build/ (prompt builder) and /my/ (My prompts). Called from tools/build.py."""
import os

def _w(R, sub, pg):
    os.makedirs(os.path.join(R, sub), exist_ok=True)
    open(os.path.join(R, sub, 'index.html'), 'w').write(pg)

def build(R, E, head, hdr, FOOT, TAIL, V, microw):
    nav = [('/#bank', 'Our prompts'), ('/library/', 'Search all'), ('/build/', 'Build'), ('/my/', 'My prompts')]
    def fld(i, label, ph, rows=3):
        return ('<div class="fld"><label for="%s">%s</label><textarea id="%s" rows="%d" placeholder="%s"></textarea>%s</div>'
                % (i, label, i, rows, E(ph), microw(i, i + '-st')))
    # ---------- /build/ ----------
    pg = head('Build a prompt | claudebomb.com', 'Build a prompt for any AI by voice or by typing: say what you want, add rules like "if this, do that", and copy a prompt that works the first time.', 'https://claudebomb.com/build/')
    pg += '<body id="top">\n<a class="skip" href="#goal">Skip to the builder</a>\n' + hdr(nav)
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <h1 id="h1">Build a prompt</h1>
  <p class="lead">Didn't find the prompt you wanted? Say what you need, by voice or by typing. The prompt on the right updates as you go. Copy it into your AI, save it, or send it to us and we'll add it to the bank for everyone.</p>
 </div>
</section>
<section class="sec" aria-label="Prompt builder">
 <div class="wrap two">
  <div>
   %s
   %s
   %s
   %s
   %s
   <h2 class="h3">Rules: if this, then that</h2>
   <p class="mut">Optional. For example: if the answer needs a number I didn't give, then ask me for it.</p>
   <div id="rules"></div>
   <div class="btns"><button class="btn ghost" type="button" id="addrule">Add a rule</button><button class="btn ghost" type="button" id="clearb">Start over</button></div>
  </div>
  <div>
   <h2 class="h3">Your prompt</h2>
   <pre id="out" aria-live="polite"></pre>
   <div class="btns"><button class="btn" type="button" id="copyb" data-copym>Copy prompt</button><button class="btn ghost" type="button" id="saveb">Save to My prompts</button></div>
   <p class="mut">Want it sharper? Paste it into our <a href="/p/prompt-improver/">prompt improver</a>.</p>
   <h2 class="h3">Send it to us</h2>
   <p class="mut">We'll polish it and add it to the bank, free for everyone, with credit to you if you leave your email.</p>
   <div id="sendb"></div>
  </div>
 </div>
</section>
</main>
''' % (fld('goal', 'What do you want the AI to do?', 'Example: plan a week of dinners for a family of four, under $100', 3),
       fld('ctx', 'What should it know?', 'Who it is for, what you have tried, anything it would get wrong without being told'),
       fld('shape', 'What should you get back?', 'Example: a table with one row per day, then a shopping list', 2),
       fld('tone', 'Tone', 'Example: plain and friendly, no jargon', 1),
       fld('never', 'Anything it must never do?', 'Example: never suggest pork', 2))
    pg += FOOT
    js = r'''<script>
(function(){var C=window.CB,d=document,F=['goal','ctx','shape','tone','never'],out=d.getElementById('out'),rules=d.getElementById('rules'),RK='cb-build-rules';
function v(i){return d.getElementById(i).value.trim()}
function getRules(){return Array.prototype.map.call(rules.querySelectorAll('.rule'),function(r){var a=r.querySelectorAll('input');return[a[0].value.trim(),a[1].value.trim()]})}
function saveRules(){C.ls(RK,JSON.stringify(getRules()))}
function addRule(a,b){var r=C.el('div','rule'),n=rules.children.length+1;
 r.innerHTML='<label>If <input type="text" aria-label="If, rule '+n+'" placeholder="this happens"></label><label>then <input type="text" aria-label="Then, rule '+n+'" placeholder="do this"></label>';
 var x=C.el('button','btn ghost sm','Remove');x.type='button';x.addEventListener('click',function(){r.remove();saveRules();draw()});r.appendChild(x);
 var ins=r.querySelectorAll('input');ins[0].value=a||'';ins[1].value=b||'';Array.prototype.forEach.call(ins,function(i){i.addEventListener('input',function(){saveRules();draw()})});rules.appendChild(r)}
function text(){var g=v('goal');if(!g)return '';var t='I need your help with this: '+g+'\n\nBefore you start, ask me up to 3 short questions if anything important is missing. If nothing is missing, start right away.';
 if(v('ctx'))t+='\n\nWhat you should know:\n'+v('ctx');
 t+='\n\nWhat I want back:\n'+(v('shape')||'A clear, finished result I can use as it is.');
 if(v('tone'))t+='\n\nTone: '+v('tone');
 t+='\n\nRules:\n- If you are not sure about a fact, say so instead of guessing.\n- Keep to what I asked. If you think something else would help, mention it at the end in one line.';
 if(v('never'))t+='\n- Never: '+v('never');
 var rs=getRules().filter(function(r){return r[0]&&r[1]});if(rs.length)t+='\n\nFollow these exactly:\n'+rs.map(function(r){return '- If '+r[0]+', then '+r[1]+'.'}).join('\n');
 t+='\n\nWhen you finish, check your answer against everything above and fix anything that does not match.';return t}
function draw(){var t=text();out.textContent=t||'Start with the first box: what do you want the AI to do?'}
F.forEach(function(i){var ta=d.getElementById(i);C.keep(ta,'cb-build-'+i);ta.addEventListener('input',draw)});
try{var q=new URLSearchParams(location.search).get('q');if(q&&!v('goal')){d.getElementById('goal').value=q;C.ls('cb-build-goal',q)}}catch(e){}
var saved=[];try{saved=JSON.parse(C.ls(RK)||'[]')}catch(e){}saved.forEach(function(r){addRule(r[0],r[1])});
d.getElementById('addrule').addEventListener('click',function(){addRule();rules.lastChild.querySelector('input').focus()});
d.getElementById('clearb').addEventListener('click',function(){F.forEach(function(i){d.getElementById(i).value='';C.ls('cb-build-'+i,null)});rules.textContent='';C.ls(RK,null);draw();C.toast('Cleared.')});
d.getElementById('copyb').addEventListener('click',function(){var t=text();if(!t){C.toast('Say what you want the AI to do first.');return}C.copyText(t).then(C.copied)});
d.getElementById('saveb').addEventListener('click',function(){var t=text();if(!t){C.toast('Say what you want the AI to do first.');return}C.save({id:'built',title:v('goal').slice(0,80),url:'/build/',text:t});C.toast('Saved to My prompts on this device.')});
C.submitPair(d.getElementById('sendb'),{kind:'prompt request',empty:'Say what you want the AI to do first.',text:text,details:function(){return{source:'claudebomb builder',model:C.model()||''}}});
draw()})();
</script>
'''
    pg += TAIL % (V, js)
    _w(R, 'build', pg)

    # ---------- /my/ ----------
    pg = head('My prompts | claudebomb.com', 'The prompts you saved on claudebomb.com, ready to edit and copy. Free, no ads, forever.', 'https://claudebomb.com/my/')
    pg += '<body id="top">\n<a class="skip" href="#mylist">Skip to your prompts</a>\n' + hdr(nav)
    pg += '''<main>
<section class="sec hero" aria-labelledby="h1">
 <div class="wrap">
  <h1 id="h1">My prompts</h1>
  <p class="lead">Prompts you save show up here, with your changes. Edit them, copy them for your AI, or delete them.</p>
 </div>
</section>
<section class="sec" aria-label="Saved prompts">
 <div class="wrap">
  <p class="count" id="mycount"></p>
  <ul class="myl" id="mylist"></ul>
  <div class="empty" id="myempty" hidden><p>Nothing saved yet.</p><div class="btns"><a class="btn" href="/library/">Find a prompt</a><a class="btn ghost" href="/build/">Build a prompt</a></div></div>
 </div>
</section>
<section class="sec" aria-labelledby="acct">
 <div class="wrap">
  <h2 id="acct">Your account</h2>
  <div id="acctbox"><p>Sign in is coming soon. Until then, what you save stays in this browser on this device, and nobody else can see it.</p></div>
  <h3>What happens to what you save</h3>
  <p>On this device, your prompts stay in this browser. Clearing your browser data deletes them.</p>
  <p>Once you have an account, we keep your saved prompts so they follow you to any device. We also read saved prompts together, with everyone's, to find changes that make a shared prompt better for everyone. If one of your changes makes it into a shared prompt, we credit you in that prompt's history under the name you choose, or not at all if you leave it blank. You can turn this off for your account.</p>
  <p>No ads, ever. We never sell what you save. Don't save passwords or private details in a prompt.</p>
 </div>
</section>
</main>
'''
    pg += FOOT
    js = r'''<script>
(function(){var C=window.CB,d=document,list=d.getElementById('mylist'),cnt=d.getElementById('mycount'),emp=d.getElementById('myempty');
function fmt(s){try{return new Date(s).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}catch(e){return ''}}
function draw(){var L=C.mine();list.textContent='';emp.hidden=L.length>0;cnt.textContent=L.length?(L.length===1?'1 saved prompt':L.length+' saved prompts'):'';
 L.forEach(function(it){var li=C.el('li'),h=C.el('h3');var a=C.el('a',null,it.title||'Untitled prompt');a.href=it.url||'#';h.appendChild(a);li.appendChild(h);
  li.appendChild(C.el('p','mut','Saved '+fmt(it.saved)+(it.edited?', edited '+fmt(it.edited):'')));
  var ta=C.el('textarea','inp');ta.rows=8;ta.value=it.text||'';ta.setAttribute('aria-label','Prompt text: '+(it.title||'Untitled prompt'));li.appendChild(ta);
  var t=0;ta.addEventListener('input',function(){clearTimeout(t);t=setTimeout(function(){var M=C.mine();M.forEach(function(m){if(m.key===it.key){m.text=ta.value;m.edited=new Date().toISOString()}});C.saveMine(M)},400)});
  var bs=C.el('div','btns'),cp=C.el('button','btn','Copy prompt'),del=C.el('button','btn ghost','Delete');cp.type=del.type='button';cp.setAttribute('data-copym','');
  cp.addEventListener('click',function(){C.copyText(ta.value).then(C.copied)});
  var arm=0;del.addEventListener('click',function(){if(!arm){arm=1;del.textContent='Tap again to delete "'+(it.title||'this prompt').slice(0,40)+'"';setTimeout(function(){arm=0;del.textContent='Delete'},4000);return}
   C.saveMine(C.mine().filter(function(m){return m.key!==it.key}));draw();C.toast('Deleted.')});
  bs.appendChild(cp);bs.appendChild(del);li.appendChild(bs);list.appendChild(li)});
 if(C.relabel)C.relabel()}
draw();window.addEventListener('cb-my-synced',draw);
if(window.CBAccount&&window.CBAccount.mount)window.CBAccount.mount(d.getElementById('acctbox'));
})();
</script>
'''
    pg += TAIL % (V, js)
    _w(R, 'my', pg)
