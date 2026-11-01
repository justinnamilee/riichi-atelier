/* Initial appearance uses browser-local time; explicit choices always win. */
(function(root){
'use strict';
function chooseTheme(saved,now,timeZone){
 if(saved==='dark'||saved==='light')return saved;
 if(!timeZone||!(now instanceof Date)||!Number.isFinite(now.getTime()))return 'dark';
 try{const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone,hour:'numeric',hourCycle:'h23'}).format(now));return hour>=7&&hour<18?'light':'dark'}catch{return 'dark'}
}
const api={chooseTheme};if(typeof module!=='undefined'&&module.exports){module.exports=api;return}
root.RiichiPreferences=api;
let saved=null,timeZone=null;try{saved=localStorage.getItem('riichi-theme')}catch{}try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone}catch{}
document.documentElement.dataset.theme=chooseTheme(saved,new Date(),timeZone);
})(typeof window==='undefined'?globalThis:window);
