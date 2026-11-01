/* Open and concealed-hand riichi scoring. Pure functions shared by the UI and Node tests.
 * Standard options: aka-dora, counted yakuman, stacked single yakuman;
 * no kiriage, double yakuman, honba or deposits. Called sets and declared kans are included.
 */
(function(root){
'use strict';
const M=typeof module!=='undefined'&&module.exports?require('./hand.js'):root.RiichiHand;
const names={
 rinshan:["After a kan","Rinshan kaihō"],sankantsu:["Three quads","Sankantsu"],suukantsu:["Four quads","Sūkantsu"],riichi:["Ready hand","Rīchi"],double:["Double ready","Daburu rīchi"],ippatsu:["One shot","Ippatsu"],tsumo:["Concealed self-draw","Menzen tsumo"],lastDraw:["Last tile","Haitei"],lastDiscard:["Last tile","Hōtei"],chankan:["Robbing a kan","Chankan"],
 tanyao:["All simples","Tanyao"],pinfu:["All sequences","Pinfu"],iipeikou:["Identical sequences","Īpeikō"],ryanpeikou:["Two identical sequence pairs","Ryanpeikō"],chiitoitsu:["Seven pairs","Chītoitsu"],
 seat:["Seat wind","Yakuhai · jikaze"],round:["Round wind","Yakuhai · bakaze"],white:["White dragon","Yakuhai · haku"],green:["Green dragon","Yakuhai · hatsu"],red:["Red dragon","Yakuhai · chun"],
 sanshoku:["Mixed triple sequence","Sanshoku dōjun"],ittsu:["Pure straight","Ittsū"],toitoi:["All triplets","Toitoi"],sanankou:["Three concealed triplets","San'ankō"],doukou:["Mixed triple triplet","Sanshoku dōkō"],shousangen:["Little three dragons","Shōsangen"],honroutou:["All terminals and honors","Honrōtō"],chanta:["Mixed outside hand","Chanta"],junchan:["Pure outside hand","Junchan"],honitsu:["Half flush","Hon'itsu"],chinitsu:["Full flush","Chin'itsu"],
 kokushi:["Thirteen orphans","Kokushi musō"],suuankou:["Four concealed triplets","Sūankō"],daisangen:["Big three dragons","Daisangen"],shousuushi:["Little four winds","Shōsūshi"],daisuushi:["Big four winds","Daisūshi"],tsuuiisou:["All honors","Tsūīsō"],chinroutou:["All terminals","Chinrōtō"],ryuuiisou:["All green","Ryūīsō"],chuuren:["Nine gates","Chūren pōtō"],
 dora:["Bonus tiles","Dora"],ura:["Hidden bonus tiles","Ura-dora"],aka:["Red bonus tiles","Aka-dora"]
};
const terminal=i=>i<27&&(i%9===0||i%9===8), outside=i=>i>=27||terminal(i);
const id=t=>t[1]==='z'?27+Number(t[0])-1:'mps'.indexOf(t[1])*9+(t[0]==='0'?4:Number(t[0])-1);
const tile=i=>i>=27?(i-26)+'z':(i%9+1)+'mps'[Math.floor(i/9)];
const wind=s=>27+['East','South','West','North'].indexOf(s);
const ceil=n=>Math.ceil(n/100)*100;
function basePoints(han,fu,yakuman=0){if(yakuman)return {base:8000*yakuman,limit:yakuman>1?yakuman+' × Yakuman':'Yakuman'};if(han>=13)return {base:8000,limit:'Counted yakuman'};if(han>=11)return {base:6000,limit:'Sanbaiman'};if(han>=8)return {base:4000,limit:'Baiman'};if(han>=6)return {base:3000,limit:'Haneman'};const raw=fu*2**(han+2);return han>=5||raw>=2000?{base:2000,limit:'Mangan'}:{base:raw,limit:null}}
function payments(han,fu,dealer,win,yakuman=0){const b=basePoints(han,fu,yakuman);const ron=ceil(b.base*(dealer?6:4)),low=ceil(b.base),high=ceil(b.base*2);return {...b,ron,each:high,nonDealer:low,dealer:high,total:win==='ron'?ron:dealer?high*3:low*2+high}}
function decompositions(counts,fixed=[]){const results=[];function groups(c,acc,pair){const i=c.findIndex(n=>n);if(i<0){if(acc.length===4)results.push({pair,groups:acc});return}if(acc.length>=4)return;if(c[i]>=3){c[i]-=3;groups(c,[...acc,{type:'triplet',tile:i}],pair);c[i]+=3}if(i<27&&i%9<=6&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;groups(c,[...acc,{type:'sequence',tile:i}],pair);c[i]++;c[i+1]++;c[i+2]++}}
 for(let i=0;i<34;i++)if(counts[i]>=2){const c=[...counts];c[i]-=2;groups(c,[...fixed],i)}return results}
function successor(i){if(i<27)return Math.floor(i/9)*9+(i%9+1)%9;if(i<31)return 27+(i-27+1)%4;return 31+(i-31+1)%3}
function score(s){
 const fixed=M.fixedMelds(s),kans=fixed.filter(g=>g.type==='kan').length,required=14+kans;
 if(s.hand.filter(Boolean).length!==required||!s.hand.at(-1))return {status:'incomplete',message:'Add '+required+' tiles'+(kans?' including '+kans+' kan'+(kans===1?'':'s'):'')+'. The final slot is the winning tile.'};
 if(s.flags.includes('rinshan')&&(!kans||s.win!=='tsumo'))return {status:'unsupported',message:'After a kan requires a kan and a self-draw win.'};
 if(fixed.some(g=>g.indices.includes(s.hand.length-1)))return {status:'invalid',message:'The winning tile must be outside a declared set.'};
 const counts=Array(34).fill(0),ids=s.hand.map(id);ids.forEach(i=>counts[i]++);if(counts.some(n=>n>4))return {status:'invalid',message:'More than four copies of a tile.'};
 const closed=!fixed.some(g=>g.called),win=id(s.hand.at(-1)),tsumo=s.win==='tsumo',dealer=s.seat==='East',has=f=>s.flags.includes(f),ready=closed&&(has('riichi')||has('double')),all=fn=>ids.every(fn),suited=new Set(ids.filter(i=>i<27).map(i=>Math.floor(i/9))),honors=ids.some(i=>i>=27);
 const orphans=[0,8,9,17,18,26,27,28,29,30,31,32,33],kokushi=!fixed.length&&orphans.every(i=>counts[i]>=1)&&ids.every(outside),seven=!fixed.length&&counts.filter(n=>n===2).length===7;
 const free=[...counts];for(const g of fixed)for(const i of g.indices)free[id(s.hand[i])]--;
 const forms=decompositions(free,fixed);if(seven)forms.push({special:'seven',pair:null,groups:[]});if(kokushi)forms.push({special:'orphans',pair:null,groups:[]});
 if(!forms.length)return {status:'invalid',message:'No complete hand matches the declared sets. Use four sets and a pair, seven distinct pairs, or thirteen orphans.'};
 const candidates=[];
 for(const form of forms){const {groups,pair,special}=form;const placements=special?[{type:special,index:-1}]:[...(pair===win?[{type:'pair',index:-1}]:[]),...groups.flatMap((g,index)=>g.fixed?[]:g.type==='triplet'?(g.tile===win?[{type:'triplet',index}]:[]):(win>=g.tile&&win<=g.tile+2?[{type:'sequence',index}]:[]))];
 for(const place of placements){const yaku=[],yakuman=[],fuItems=[];const add=(key,han)=>yaku.push({key,han});const yak=key=>yakuman.push({key,han:0});
 const trips=groups.filter(g=>g.type!=='sequence'),seq=groups.filter(g=>g.type==='sequence'),tripIds=trips.map(g=>g.tile),concealed=trips.filter(g=>!g.called).length-(!tsumo&&place.type==='triplet'?1:0);
 if(special==='orphans')yak('kokushi');if(all(i=>i>=27))yak('tsuuiisou');if(all(terminal))yak('chinroutou');if(all(i=>[19,20,21,23,25,32].includes(i)))yak('ryuuiisou');
 if([31,32,33].every(i=>tripIds.includes(i)))yak('daisangen');const winds=tripIds.filter(i=>i>=27&&i<=30).length;if(winds===4)yak('daisuushi');else if(winds===3&&pair>=27&&pair<=30)yak('shousuushi');if(concealed===4)yak('suuankou');if(kans===4)yak('suukantsu');
 if(closed&&!kans&&suited.size===1&&!honors){const start=Math.floor(ids[0]/9)*9,base=[3,1,1,1,1,1,1,1,3];if(base.every((n,i)=>counts[start+i]>=n))yak('chuuren')}
 if(!yakuman.length){
 if(closed&&has('double'))add('double',2);else if(closed&&has('riichi'))add('riichi',1);if(has('ippatsu')&&ready&&!has('rinshan'))add('ippatsu',1);if(tsumo&&closed)add('tsumo',1);if(has('rinshan')&&tsumo&&kans)add('rinshan',1);if(kans===3)add('sankantsu',2);if(has('last'))add(tsumo?'lastDraw':'lastDiscard',1);if(has('chankan')&&!tsumo)add('chankan',1);
 if(all(i=>!outside(i)))add('tanyao',1);if(suited.size===1)add(honors?'honitsu':'chinitsu',honors?(closed?3:2):(closed?6:5));if(all(outside))add('honroutou',2);
 if(special==='seven'){add('chiitoitsu',2);fuItems.push({label:'Seven distinct pairs (fixed)',fu:25})}
 else if(!special){
 for(const [i,key] of [[31,'white'],[32,'green'],[33,'red'],[wind(s.seat),'seat'],[wind(s.round),'round']])if(tripIds.includes(i))add(key,1);
 let waitFu=place.type==='pair'?2:0,wait=place.type==='pair'?'Pair wait':place.type==='triplet'?'Triplet wait':'Two-sided wait';if(place.type==='sequence'){const start=groups[place.index].tile;if(win===start+1){waitFu=2;wait='Closed wait'}else if((start%9===0&&win===start+2)||(start%9===6&&win===start)){waitFu=2;wait='Edge wait'}}
 const pairFu=(pair>=31?2:0)+(pair===wind(s.seat)?2:0)+(pair===wind(s.round)?2:0),pinfu=closed&&seq.length===4&&pairFu===0&&waitFu===0&&place.type==='sequence';
 if(pinfu)add('pinfu',1);if(trips.length===4)add('toitoi',2);if(concealed>=3)add('sanankou',2);if(tripIds.filter(i=>i>=31).length===2&&pair>=31)add('shousangen',2);
 const repeated=new Map;seq.forEach(g=>repeated.set(g.tile,(repeated.get(g.tile)||0)+1));const pairs=[...repeated.values()].reduce((n,v)=>n+Math.floor(v/2),0);if(closed&&pairs>=2)add('ryanpeikou',3);else if(closed&&pairs===1)add('iipeikou',1);
 const seqIds=seq.map(g=>g.tile);if(Array.from({length:7},(_,i)=>i).some(n=>[n,n+9,n+18].every(i=>seqIds.includes(i))))add('sanshoku',closed?2:1);
 if([0,9,18].some(n=>[n,n+3,n+6].every(i=>seqIds.includes(i))))add('ittsu',closed?2:1);
 if(Array.from({length:9},(_,i)=>i).some(n=>[n,n+9,n+18].every(i=>tripIds.includes(i))))add('doukou',2);
 if(seq.length&&outside(pair)&&groups.every(g=>g.type!=='sequence'?outside(g.tile):g.tile%9===0||g.tile%9===6))add(honors?'chanta':'junchan',honors?(closed?2:1):(closed?3:2));
 fuItems.push({label:'Base',fu:20});if(!tsumo&&closed)fuItems.push({label:'Concealed discard win',fu:10});else if(tsumo&&!pinfu)fuItems.push({label:'Self-draw',fu:2});if(pairFu)fuItems.push({label:'Value pair',fu:pairFu});if(waitFu)fuItems.push({label:wait,fu:waitFu});groups.forEach((g,index)=>{if(g.type==='sequence')return;const opened=g.called||(!tsumo&&place.type==='triplet'&&place.index===index),value=(opened?2:4)*(outside(g.tile)?2:1)*(g.type==='kan'?4:1);fuItems.push({label:(g.called?'Called':opened?'Discard-completed':'Concealed')+' '+g.type+' '+tile(g.tile),fu:value})});
 }
 }
 if(!yakuman.length&&!closed&&!tsumo&&fuItems.reduce((n,v)=>n+v.fu,0)===20)fuItems.push({label:'Open hand minimum',fu:10});
 const qualifyingHan=yaku.reduce((n,v)=>n+v.han,0);
 if(!yakuman.length&&qualifyingHan){for(const [key,indicators] of [['dora',s.dora],['ura',ready?s.ura:[]]]){const n=indicators.filter(Boolean).reduce((sum,t)=>sum+counts[successor(id(t))],0);if(n)add(key,n)}const red=s.hand.filter(t=>t[0]==='0').length;if(red)add('aka',red)}
 const han=yaku.reduce((n,v)=>n+v.han,0),rawFu=fuItems.reduce((n,v)=>n+v.fu,0),fu=yakuman.length?0:special==='seven'?25:Math.ceil(rawFu/10)*10;
 const pay=payments(han,fu,dealer,s.win,yakuman.length);candidates.push({status:yakuman.length||qualifyingHan?'ok':'no-yaku',message:'This hand has no qualifying yaku. Bonus tiles alone cannot score.',yaku:yakuman.length?yakuman:yaku,han,fu,rawFu,fuItems,yakuman:yakuman.length,payment:pay,form,wait:place.type,qualifyingHan});
 }}
 candidates.sort((a,b)=>(b.status==='ok')-(a.status==='ok')||b.payment.total-a.payment.total||b.han-a.han||b.fu-a.fu);return {...candidates[0],alternatives:candidates.length,closed,kans,requiredIndicators:1+kans};
}
const api={score,payments,basePoints,decompositions,id,tile,names,successor};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RiichiScore=api;
})(typeof window==='undefined'?globalThis:window);
