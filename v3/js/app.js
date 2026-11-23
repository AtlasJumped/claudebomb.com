(function(){
'use strict';
var d=document,$=function(s,r){return (r||d).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var store={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
/* banner */
var banner=$('#banner');
if(banner){
  if(store.get('cb-banner')==='1')banner.classList.add('gone');
  var bb=$('[data-dismiss-banner]',banner);
  if(bb)bb.addEventListener('click',function(){banner.classList.add('gone');store.set('cb-banner','1')});
}
/* reveal on scroll (blur and fade) */
var rv=$$('.reveal');
if('IntersectionObserver' in window&&!reduce){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
  rv.forEach(function(el){io.observe(el)});
}else rv.forEach(function(el){el.classList.add('in')});
/* tabs */
$$('.tabs').forEach(function(tl){
  var tabs=$$('[role=tab]',tl);
  function sel(t,focus){
    tabs.forEach(function(x){var on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;var p=d.getElementById(x.getAttribute('aria-controls'));if(p){p.hidden=!on;if(on){p.classList.remove('in');void p.offsetWidth;p.classList.add('in')}}});
    if(focus)t.focus();
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){sel(t)});
    t.addEventListener('keydown',function(e){
      var n=null;
      if(e.key==='ArrowRight'||e.key==='ArrowDown')n=tabs[(i+1)%tabs.length];
      if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=tabs[(i-1+tabs.length)%tabs.length];
      if(e.key==='Home')n=tabs[0];if(e.key==='End')n=tabs[tabs.length-1];
      if(n){e.preventDefault();sel(n,true)}
    });
  });
});
/* menu */
var mb=$('.menubtn');
function setMenu(o){d.body.classList.toggle('menu-open',o);if(mb){mb.setAttribute('aria-expanded',o);mb.textContent=o?'Close':'Menu'}}
if(mb){
  mb.setAttribute('aria-expanded','false');mb.setAttribute('aria-controls','nav');
  mb.addEventListener('click',function(){setMenu(!d.body.classList.contains('menu-open'))});
  $$('#nav a').forEach(function(a){a.addEventListener('click',function(){setMenu(false)})});
  d.addEventListener('keydown',function(e){if(e.key==='Escape')setMenu(false)});
}
/* sound: soft generated pad, off by default */
var sb=$('.sound'),ac=null,master=null,oscs=[];
function soundOn(){
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  if(!ac){
    ac=new AC();master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
    [196,293.66,392,493.88].forEach(function(f,i){
      var o=ac.createOscillator(),g=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain();
      o.type='sine';o.frequency.value=f;g.gain.value=.25/(i+1);
      l.frequency.value=.07+i*.05;lg.gain.value=.12;l.connect(lg);lg.connect(g.gain);
      o.connect(g);g.connect(master);o.start();l.start();oscs.push(o,l);
    });
  }
  ac.resume();master.gain.cancelScheduledValues(ac.currentTime);master.gain.linearRampToValueAtTime(.18,ac.currentTime+1.5);return true;
}
function soundOff(){if(!ac)return;master.gain.cancelScheduledValues(ac.currentTime);master.gain.linearRampToValueAtTime(0,ac.currentTime+.6);setTimeout(function(){if(sb.getAttribute('aria-pressed')==='false')ac.suspend()},700)}
if(sb)sb.addEventListener('click',function(){
  var on=sb.getAttribute('aria-pressed')!=='true';
  if(on&&!soundOn())return;
  if(!on)soundOff();
  sb.setAttribute('aria-pressed',on);sb.setAttribute('aria-label',on?'Sound on. Turn sound off':'Sound off. Turn sound on');
});
/* microphone dictation, only where the browser supports it */
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
$$('.mic').forEach(function(m){
  var ta=$('textarea',m.parentNode),note=$('.micnote'),rec=null;
  m.addEventListener('click',function(){
    if(!SR){if(note)note.textContent='This browser cannot dictate here. Record with any app you have, then paste the text.';return}
    if(rec){rec.stop();return}
    rec=new SR();rec.continuous=true;rec.interimResults=false;rec.lang=navigator.language||'en-US';
    var base=ta.value?ta.value.replace(/\s*$/,' '):'';
    rec.onresult=function(e){var t='';for(var i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;ta.value=base+t};
    rec.onerror=function(e){if(note)note.textContent=e.error==='not-allowed'?'Microphone access was blocked. Record with any app you have, then paste the text.':'Dictation stopped. You can try again or paste text.'};
    rec.onend=function(){rec=null;m.setAttribute('aria-pressed','false');m.setAttribute('aria-label','Dictate with microphone')};
    try{rec.start();m.setAttribute('aria-pressed','true');m.setAttribute('aria-label','Stop dictation');if(note)note.textContent='Listening. Press the microphone again to stop.'}catch(x){rec=null}
  });
});
/* mailto forms: nothing is sent anywhere */
$$('form[data-mailto]').forEach(function(f){
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var lines=[];
    $$('[data-label]',f).forEach(function(el){
      var v=el.type==='checkbox'?(el.checked?'Yes':'No'):el.value.trim();
      if(v)lines.push(el.getAttribute('data-label')+': '+v);
    });
    var url='mailto:leo@universemodel.ai?subject='+encodeURIComponent(f.getAttribute('data-subject')||'claudebomb.com')+'&body='+encodeURIComponent(lines.join('\n\n'));
    var dlg=f.closest('dialog');if(dlg&&dlg.open)dlg.close();
    store.set('cb-pop','1');
    window.location.href=url;
  });
});
/* subscribe pop-up: once, after about 5 minutes on the site */
var pop=$('#pop');
if(pop&&typeof pop.showModal==='function'&&store.get('cb-pop')!=='1'){
  var wait=/[?&]popup=now/.test(location.search)?1500:300000;
  var shown=false;
  setTimeout(function(){
    if(shown||store.get('cb-pop')==='1')return;shown=true;
    try{pop.showModal()}catch(e){return}
    store.set('cb-pop','1');
  },wait);
  $$('[data-close]',pop).forEach(function(b){b.addEventListener('click',function(){pop.close()})});
  pop.addEventListener('click',function(e){if(e.target===pop)pop.close()});
}
})();
