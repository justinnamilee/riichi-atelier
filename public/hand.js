/* Hand editing and set detection, shared by UI and scoring tests. */
(function(root){
'use strict';
const valid=t=>typeof t==='string'&&/^(?:[0-9][mps]|[1-7]z)$/.test(t);
const id=t=>t[1]==='z'?27+Number(t[0])-1:'mps'.indexOf(t[1])*9+(t[0]==='0'?4:Number(t[0])-1);
const canonical=t=>t&&t[0]==='0'?'5'+t[1]:t;
// Four-copy groups are inferred from the whole hand, never token boundaries.
function fourCopies(hand){const map=new Map;hand.forEach((t,i)=>{if(t){const n=id(t);if(!map.has(n))map.set(n,[]);map.get(n).push(i)}});return [...map].filter(([,a])=>a.length===4).map(([tile,indices])=>({type:'kan',tile,indices,key:'kan:'+tile}))}
function quads(hand,split=[],forced=[],calls=[]){
 const candidates=fourCopies(hand).filter(g=>!split.includes(g.tile)),counts=Array(34).fill(0);hand.filter(Boolean).forEach(t=>counts[id(t)]++);
 if(!candidates.length)return [];
 // Find the fewest loose tiles after at most four sets and one pair.
 const memo=new Map;
 function loose(c,sets,pair){const i=c.findIndex(Boolean);if(i<0)return 0;const key=c.join('')+':'+sets+':'+pair;if(memo.has(key))return memo.get(key);c[i]--;let best=1+loose(c,sets,pair);c[i]++;
  const take=(tiles,nextSets,nextPair)=>{for(const n of tiles)c[n]--;best=Math.min(best,loose(c,nextSets,nextPair));for(const n of tiles)c[n]++};
  if(!pair&&c[i]>=2)take([i,i],sets,true);if(sets<4){if(c[i]>=3)take([i,i,i],sets+1,pair);if(i<27&&i%9<7&&c[i+1]&&c[i+2])take([i,i+1,i+2],sets+1,pair)}memo.set(key,best);return best;
 }
 let best=null;
 for(let mask=0;mask<(1<<candidates.length);mask++){const chosen=candidates.filter((g,i)=>mask&(1<<i));if(forced.some(n=>candidates.some(g=>g.tile===n)&&!chosen.some(g=>g.tile===n)))continue;const c=counts.slice();chosen.forEach(g=>c[g.tile]-=4);let fixed=0;for(const call of calls){const [type,raw]=call.split(':');const n=Number(raw);if(type==='kan'||type==='triplet'&&chosen.some(g=>g.tile===n))continue;for(const tile of type==='sequence'?[n,n+1,n+2]:[n,n,n])c[tile]--;fixed++}if(c.some(n=>n<0)||chosen.length+fixed>4)continue;const count=hand.filter(Boolean).length;if(count>14+chosen.length)continue;const value=loose(c,chosen.length+fixed,false)*100+chosen.length;if(!best||value<best.value)best={value,chosen}}
 return best?best.chosen:candidates.filter(g=>forced.includes(g.tile));
}
function kans(s){const forced=[...(s.kans||[]),...(s.calls||[]).filter(k=>k.startsWith('kan:')).map(k=>Number(k.split(':')[1]))];return quads(s.hand,s.split,forced,s.calls||[])}
function groups(s){
 const result=kans(s),used=new Set(result.flatMap(g=>g.indices)),calls=new Set(s.calls||[]),last=s.hand.length-1;
 result.forEach(g=>g.called=calls.has(g.key)||calls.has('triplet:'+g.tile+':0'));
 const counts=new Map;
 function take(type,tile,key){const tiles=type==='sequence'?[tile,tile+1,tile+2]:[tile,tile,tile],indices=[],local=new Set(used);for(const n of tiles){const i=s.hand.findIndex((t,i)=>i!==last&&t&&!local.has(i)&&id(t)===n);if(i<0)return false;indices.push(i);local.add(i)}indices.forEach(i=>used.add(i));const prefix=type+':'+tile;let ordinal=counts.get(prefix)||0;if(key){ordinal=Number(key.split(':')[2]);counts.set(prefix,Math.max(counts.get(prefix)||0,ordinal+1))}else counts.set(prefix,ordinal+1);result.push({type,tile,indices,key:key||prefix+':'+ordinal,called:!!key});return true}
 // Retain explicit calls before detecting other possible arrangements.
 for(const key of calls){const [type,n]=key.split(':');if(['sequence','triplet'].includes(type))take(type,Number(n),key)}
 for(let n=0;n<34;n++)while(take('triplet',n,null)){}
 for(let n=0;n<27;n++)if(n%9<=6)while(take('sequence',n,null)){}
 return result;
}
function normalize(s){
 s.calls=Array.isArray(s.calls)?s.calls:[];
 const detectedKans=kans(s),size=14+detectedKans.length;
 if(s.hand.length!==size){const old=s.hand;let winner=old.at(-1);const body=old.slice(0,-1),winnerInKan=winner&&detectedKans.some(g=>g.tile===id(winner));while(body.length&&!body.at(-1))body.pop();if(winnerInKan)body.push(winner);while(body.length>size-1&&body.includes(null))body.splice(body.lastIndexOf(null),1);if(!winner&&body.length===size)winner=body.pop();if(body.length>size-1)throw Error('Remove an extra tile before changing this kan.');s.hand=[...body,...Array(size-1-body.length).fill(null),winnerInKan?null:winner]}
 s.calls=s.calls.map(key=>{if(!key.startsWith('kan:'))return key;const n=Number(key.split(':')[1]),count=s.hand.filter(t=>t&&id(t)===n).length;return count===3?'triplet:'+n+':0':key});
 if(!detectedKans.length)s.flags=s.flags.filter(f=>f!=='rinshan');
 const detected=groups(s);s.calls=detected.filter(g=>g.called).map(g=>g.key);
 if(detected.some(g=>g.called)){s.flags=s.flags.filter(f=>!['riichi','double','ippatsu'].includes(f));s.ura.fill(null)}
 if(!s.split?.length)delete s.split;if(!s.kans?.length)delete s.kans;
 return s;
}
function fixedMelds(s){return groups(s).filter(g=>g.type==='kan'||g.called).map(g=>({...g,fixed:true}))}
// Indicators are paired columns. Sparse entries and extra indicators from other
// players' kans extend both rows, while hidden indicators only apply with riichi.
function indicatorRequirements(s){
 const ready=(s.flags.includes('riichi')||s.flags.includes('double'))&&!groups(s).some(g=>g.called);
 const occupied=row=>row.findLastIndex(Boolean)+1;
 const required=Math.min(5,Math.max(1+kans(s).length,occupied(s.dora),ready?occupied(s.ura):0));
 const missing=row=>Array.from({length:required},(_,i)=>i).filter(i=>!row[i]);
 return {required,dora:missing(s.dora),ura:ready?missing(s.ura):[]};
}
const shortcutZone=key=>({v:'winner',d:'dora',u:'ura',h:'hand',w:'seat',r:'round'})[String(key).toLowerCase()]||null;
function parseEntry(text){const value=text.replace(/\s/g,''),tokens=[];let cursor=0;while(cursor<value.length){const rest=value.slice(cursor);const mode=rest.match(/^([kK])([0-9][mps]|[1-7]z)/);if(mode){cursor+=mode[0].length;tokens.push({kan:id(mode[2]),enabled:mode[1]==='k',end:cursor});continue}const declared=rest.match(/^n\(((?:[0-9]+[mps]|[1-7]+z)+)\)/i);if(declared){cursor+=declared[0].length;tokens.push({declare:parse(declared[1]),end:cursor});continue}if(value[cursor]==='_'){tokens.push({skip:true,end:++cursor});continue}const zone=shortcutZone(value[cursor]);if(zone){tokens.push({zone,end:++cursor});continue}const action={o:'sort',q:'clear'}[value[cursor].toLowerCase()];if(action){tokens.push({action,end:++cursor});continue}const condition=value.slice(cursor).match(/^[1-8]+[cC]/);if(condition){cursor+=condition[0].length;tokens.push({conditions:[...condition[0].slice(0,-1)].map(Number),...(condition[0].endsWith('C')?{remove:true}:{}),end:cursor});continue}if(value[cursor]==='C'){tokens.push({conditions:[],remove:true,end:++cursor});continue}const match=value.slice(cursor).match(/^(n)?((?:[0-9]+[mps]|[1-7]+z))/i);if(match){cursor+=match[0].length;tokens.push({tiles:parse(match[2]),...(match[1]?{called:true}:{}),end:cursor});continue}if(/^(?:n?[0-9]*|[kK][0-9]*|n\([^)]*)$/i.test(value.slice(cursor)))return {value,tokens,pending:value.slice(cursor)};throw Error('Use tile codes, n before called sets, c/C for conditions, o to sort, or q to clear.')}return {value,tokens,pending:''}}
function calledParts(tiles){const counts=Array(34).fill(0);tiles.forEach(t=>counts[id(t)]++);const result=[];function split(){const i=counts.findIndex(Boolean);if(i<0)return true;for(const size of [4,3])if(counts[i]>=size){counts[i]-=size;result.push({type:size===4?'kan':'triplet',tile:i});if(split())return true;result.pop();counts[i]+=size}if(i<27&&i%9<=6&&counts[i+1]&&counts[i+2]){counts[i]--;counts[i+1]--;counts[i+2]--;result.push({type:'sequence',tile:i});if(split())return true;result.pop();counts[i]++;counts[i+1]++;counts[i+2]++}return false}if(!tiles.length||!split())throw Error('n must prefix complete sequences, triplets, or quads.');return result}
function appendCalled(s,tiles,selected=null){const parts=calledParts(tiles);s.split=s.split||[];for(const part of parts){if(part.type!=="kan"&&tiles.filter(t=>id(t)===part.tile).length===4&&!s.split.includes(part.tile))s.split.push(part.tile)}for(const part of parts)if(part.type==='kan'){s.kans=[...new Set([...(s.kans||[]),part.tile])];s.split=(s.split||[]).filter(n=>n!==part.tile)}append(s,tiles,selected);const available=groups(s).filter(g=>!g.called);for(const part of parts){const g=available.findLast(g=>g.type===part.type&&g.tile===part.tile);if(!g)throw Error('Called sets must be complete and separate from the winning tile.');s.calls.push(g.key);available.splice(available.indexOf(g),1)}normalize(s);return s}
const conditionFlags={3:'riichi',4:'double',5:'ippatsu',6:'last',7:'rinshan',8:'chankan'};
function applyConditions(s,codes){if(!codes.length||codes.some(n=>!Number.isInteger(n)||n<1||n>8))throw Error('Condition codes are 1–8 followed by c.');const requested=[...new Set(codes)],firstWin=requested.find(n=>n===1||n===2),event=requested.find(n=>n>=6),ready=requested.find(n=>n===3||n===4),set=new Set(s.flags),ignored=[];if(firstWin)s.win=firstWin===1?'ron':'tsumo';else if(event===7||event===8)s.win=event===7?'tsumo':'ron';if(ready){if(groups(s).some(g=>g.called))throw Error('A called hand cannot declare ready.');set.delete('riichi');set.delete('double');set.add(conditionFlags[ready])}if(event){for(const f of ['last','rinshan','chankan'])set.delete(f);if(event===7&&s.win!=='tsumo'||event===8&&s.win!=='ron')ignored.push(event);else{if(event===7&&!kans(s).length)throw Error('Condition 7 requires a kan.');set.add(conditionFlags[event])}}if(requested.includes(5)){if(!set.has('riichi')&&!set.has('double'))throw Error('Condition 5 requires ready or double ready.');if(set.has('rinshan'))ignored.push(5);else set.add('ippatsu')}if(s.win==='ron')set.delete('rinshan');else set.delete('chankan');if(set.has('rinshan'))set.delete('ippatsu');if(!set.has('riichi')&&!set.has('double')){set.delete('ippatsu');s.ura.fill(null)}s.flags=[...set];normalize(s);return {ignored:[...new Set([...ignored,...requested.filter(n=>(n===1||n===2)&&n!==firstWin||(n===3||n===4)&&n!==ready||n>=6&&n!==event)])]}}
function removeConditions(s,codes=[]){if(codes.some(n=>!Number.isInteger(n)||n<1||n>8))throw Error('Condition codes are 1–8 followed by C.');const requested=[...new Set(codes)],firstWin=requested.find(n=>n===1||n===2);if(!requested.length){s.flags=[];s.ura.fill(null)}else{s.flags=s.flags.filter(f=>!requested.some(n=>conditionFlags[n]===f));if(firstWin===1&&s.win==='ron')s.win='tsumo';else if(firstWin===2&&s.win==='tsumo')s.win='ron';if(s.win==='ron')s.flags=s.flags.filter(f=>f!=='rinshan');else s.flags=s.flags.filter(f=>f!=='chankan');if(!s.flags.some(f=>['riichi','double'].includes(f))){s.flags=s.flags.filter(f=>f!=='ippatsu');s.ura.fill(null)}}normalize(s);return {ignored:requested.filter(n=>(n===1||n===2)&&n!==firstWin)}}
function serializeSetup(s){return JSON.stringify({riichi:1,hand:s.hand,dora:s.dora,ura:s.ura,seat:s.seat,round:s.round,win:s.win,flags:s.flags,calls:s.calls||[],split:s.split||[],kans:s.kans||[]})}
function deserializeSetup(text){let v;try{v=JSON.parse(text)}catch{throw Error('The copied setup is not valid JSON.')}if(!v||v.riichi!==1)throw Error('This is not a supported riichi setup.');const s={hand:v.hand,dora:v.dora,ura:v.ura,seat:v.seat,round:v.round,win:v.win,flags:v.flags,calls:v.calls,split:v.split||[],kans:v.kans||[]};if(!Array.isArray(s.kans)||s.kans.some(n=>!Number.isInteger(n)||n<0||n>33)||!Array.isArray(s.split)||s.split.some(n=>!Number.isInteger(n)||n<0||n>33)||new Set(s.split).size!==s.split.length)throw Error("Invalid split groups.");for(const [zone,min,max] of [['hand',14,18],['dora',5,5],['ura',5,5]])if(!Array.isArray(s[zone])||s[zone].length<min||s[zone].length>max||s[zone].some(t=>t!==null&&!valid(t)))throw Error('Invalid '+zone+' tiles in setup.');if(!['ron','tsumo'].includes(s.win)||!['East','South','West','North'].includes(s.seat)||!['East','South','West','North'].includes(s.round)||!Array.isArray(s.flags)||s.flags.some(f=>!Object.values(conditionFlags).includes(f))||new Set(s.flags).size!==s.flags.length||!Array.isArray(s.calls)||s.calls.some(c=>typeof c!=='string'||!/^(?:kan:\d+|(?:sequence|triplet):\d+:\d+)$/.test(c))||new Set(s.calls).size!==s.calls.length)throw Error('Invalid conditions or called sets in setup.');const all=[...s.hand,...s.dora,...s.ura].filter(Boolean);for(const t of all){if(all.filter(x=>canonical(x)===canonical(t)).length>4||t[0]==='0'&&all.filter(x=>x===t).length>1)throw Error('Tile limits exceeded in setup.')}if(s.hand.length!==14+kans(s).length)throw Error('The setup tile count does not match its kans.');const flags=JSON.stringify(s.flags),calls=JSON.stringify(s.calls);normalize(s);if(flags!==JSON.stringify(s.flags)||calls!==JSON.stringify(s.calls))throw Error('Incompatible conditions or called sets in setup.');if(s.flags.includes('riichi')&&s.flags.includes('double')||s.flags.includes('ippatsu')&&!s.flags.some(f=>['riichi','double'].includes(f))||s.flags.includes('rinshan')&&s.win!=='tsumo'||s.flags.includes('chankan')&&s.win!=='ron'||s.flags.filter(f=>['last','rinshan','chankan'].includes(f)).length>1)throw Error('Incompatible win conditions in setup.');if(!s.split?.length)delete s.split;if(!s.kans?.length)delete s.kans;return s}
function parse(text){const value=text.toLowerCase().replace(/\s/g,'');if(!/^(?:[0-9]+[mps]|[1-7]+z)+$/.test(value))throw Error('Use tile notation such as 1230m or 11z.');const tiles=[...value.matchAll(/([0-9]+)([mpsz])/g)].flatMap(m=>[...m[1]].map(n=>n+m[2]));if(tiles.length>18)throw Error('At most 18 physical tiles are possible with four kans.');return tiles}
function nextEmpty(s,start=0){for(let i=Math.max(0,start);i<s.hand.length;i++)if(!s.hand[i])return i;return s.hand.findIndex(t=>!t)}
function append(s,tiles,selected=null){
 let cursor=selected;
 for(const t of tiles){if(!valid(t))throw Error('Invalid tile.');normalize(s);let i=cursor===null?nextEmpty(s):cursor;if(i<0){if(s.hand.length>=18)throw Error('The hand is full.');i=s.hand.length;s.hand.push(t)}else{if(i>=s.hand.length)throw Error('The hand is full.');s.hand[i]=t;}normalize(s);cursor=nextEmpty(s,i+1);if(cursor<0)cursor=null}
 if(!s.split?.length)delete s.split;if(!s.kans?.length)delete s.kans;
 return s;
}
function setKan(s,tile,enabled){s.kans=(s.kans||[]).filter(n=>n!==tile);if(enabled)s.kans.push(tile);s.split=s.split||[];s.split=s.split.filter(n=>n!==tile);if(!enabled)s.split.push(tile);s.calls=s.calls.filter(k=>k!=="kan:"+tile&&k!=="triplet:"+tile+":0");normalize(s);return s}
function blank(){return {hand:Array(14).fill(null),dora:Array(5).fill(null),ura:Array(5).fill(null),flags:[],calls:[],win:'ron',seat:'East',round:'East'}}
function tileCode(tiles){let out='',digits='',suit='';const flush=()=>{if(digits)out+=digits+suit;digits=''};for(const t of tiles){if(!t){flush();suit='';out+='_';continue}if(t[1]!==suit){flush();suit=t[1]}digits+=t[0]}flush();return out}
function exportCommands(s){
 const commands=['q'],active=new Set(kans(s).map(g=>g.tile));
 const modes=new Set([...fourCopies(s.hand).map(g=>g.tile),...(s.split||[]),...(s.kans||[])]);
 for(const n of [...modes].sort((a,b)=>a-b))commands.push(((s.kans||[]).includes(n)||active.has(n)?'k':'K')+tileFromId(n));
 const body=s.hand.slice(0,-1);while(body.length&&!body.at(-1))body.pop();if(body.length)commands.push('h'+tileCode(body));if(s.hand.at(-1))commands.push('v'+s.hand.at(-1));
 for(const g of groups(s).filter(g=>g.called))commands.push('n('+tileCode(g.indices.map(i=>s.hand[i]))+')');
 commands.push('w'+(winds.indexOf(s.seat)+1)+'z','r'+(winds.indexOf(s.round)+1)+'z');
 const conditions=[s.win==='tsumo'?2:1,...Object.entries(conditionFlags).filter(([,f])=>s.flags.includes(f)).map(([n])=>Number(n))];commands.push(conditions.join('')+'c');
 for(const zone of ['dora','ura']){const row=s[zone].slice();while(row.length&&!row.at(-1))row.pop();if(row.length)commands.push((zone==='dora'?'d':'u')+tileCode(row))}
 commands.push('h');return commands.join(' ');
}
const winds=['East','South','West','North'];
const tileFromId=n=>n<27?(n%9+1)+'mps'[Math.floor(n/9)]:(n-26)+'z';
function declareCalled(s,tiles){for(const part of calledParts(tiles)){let key;if(part.type==='kan'){setKan(s,part.tile,true);key='kan:'+part.tile}else{let ordinal=0;while(s.calls.includes(part.type+':'+part.tile+':'+ordinal))ordinal++;key=part.type+':'+part.tile+':'+ordinal}s.calls.push(key);if(!groups(s).some(g=>g.key===key&&g.called))throw Error('Called sets must be complete and separate from the winning tile.')}normalize(s)}
function checkTiles(s){const tiles=[...s.hand,...s.dora,...s.ura].filter(Boolean);for(const t of tiles)if(!valid(t)||tiles.filter(x=>id(x)===id(t)).length>4||t[0]==='0'&&tiles.filter(x=>x===t).length>1)throw Error('Tile limits exceeded in setup.')}
// A shared transactional interpreter for paste, quick entry, and tests.
function applyCommands(original,text,selected=null){
 const parsed=parseEntry(text);let s=structuredClone(original),target=selected?{...selected}:null;
 for(const token of parsed.tokens){
  if(token.action==='clear'){s=blank();target=null;continue}
  if(token.action==='sort'){const winner=s.hand.at(-1),body=s.hand.slice(0,-1).filter(Boolean).sort((a,b)=>id(a)-id(b)||a.localeCompare(b));s.hand=[...body,...Array(s.hand.length-1-body.length).fill(null),winner];target=null;continue}
  if(token.kan!==undefined){setKan(s,token.kan,token.enabled);continue}
  if(token.declare){declareCalled(s,token.declare);continue}
  if(token.conditions){(token.remove?removeConditions:applyConditions)(s,token.conditions);continue}
  if(token.zone){if(token.zone==='ura'&&!s.flags.some(f=>['riichi','double'].includes(f)))throw Error('Enable ready hand for hidden indicators.');target={zone:token.zone,index:['seat','round','winner'].includes(token.zone)?0:Math.max(0,s[token.zone].findIndex(t=>!t))};continue}
  const beforeKans=kans(s).length;const dest=target||{zone:'hand',index:nextEmpty(s)};
  if(token.skip){if(!['hand','dora','ura'].includes(dest.zone)||dest.index<0||dest.index>=s[dest.zone].length)throw Error('No empty slot to skip.');target={zone:dest.zone,index:dest.index+1};continue}
  if(['seat','round'].includes(dest.zone)){if(token.called||token.tiles.length!==1||!/^([1-4])z$/.test(token.tiles[0]))throw Error('Choose one wind tile.');s[dest.zone]=winds[Number(token.tiles[0][0])-1];continue}
  if(dest.zone==='winner'){if(token.called||token.tiles.length!==1)throw Error('Choose one winning tile.');s.hand[s.hand.length-1]=token.tiles[0];normalize(s);continue}
  if(token.called&&dest.zone!=='hand')throw Error('Called entry only applies to the hand.');
  if(dest.zone==='hand'){
   (token.called?appendCalled:append)(s,token.tiles,dest.index>=0?dest.index:null);
   if(target){const index=nextEmpty(s,dest.index+token.tiles.length);target=index>=0?{zone:'hand',index}:null}
  }else{if(dest.zone==='ura'&&!s.flags.some(f=>['riichi','double'].includes(f)))throw Error('Enable ready hand for hidden indicators.');let i=dest.index;for(const t of token.tiles){if(i<0||i>=5)throw Error('No empty indicator slots.');s[dest.zone][i]=t;i++}target={zone:dest.zone,index:i}}
  if(kans(s).length>beforeKans)s.flags=s.flags.filter(f=>f!=='ippatsu');checkTiles(s);
 }
 normalize(s);checkTiles(s);return {state:s,target,remaining:parsed.pending,complete:!parsed.pending};
}
function importCommands(text){const result=applyCommands(blank(),text);if(!result.complete)throw Error('Finish the code with m, p, s, or z.');return result.state}
const api={blank,exportCommands,importCommands,applyCommands,fourCopies,kans,setKan,removeConditions,calledParts,appendCalled,applyConditions,conditionFlags,serializeSetup,deserializeSetup,shortcutZone,parseEntry,indicatorRequirements,valid,id,canonical,quads,groups,normalize,fixedMelds,parse,nextEmpty,append};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RiichiHand=api;
})(typeof window==='undefined'?globalThis:window);
