import test from 'node:test';
import assert from 'node:assert/strict';
import { StoryDirector } from '../src/systems/StoryDirector.js';
import { GardenSystem } from '../src/systems/GardenSystem.js';
import { GameState } from '../src/core/GameState.js';
import { EventBus } from '../src/core/EventBus.js';
import { EV } from '../src/core/events.js';
import { Inventory } from '../src/systems/Inventory.js';
import { STORY, DIALOGUES, HOTSPOTS } from '../src/content/index.js';
import { Yard } from '../src/world/locations/Yard.js';
function setup(saved) {
 const state=new GameState(); if(saved) state.restore(saved); else state.day=2;
 const bus=new EventBus(),inventory=new Inventory(state,bus),done=[];
 const story={paused:false,quest:{id:'farm-hoe'}};
 const garden=new GardenSystem({state,inventory,story,bus,vocab:{learn(){}},toasts:{show(){}},world:{get:()=>({setGardenState(){}})},time:state});
 bus.on(EV.FLAG,({name})=>done.push(name));return {state,inventory,story,garden,done};
}
test('second day teaches farming after shopping and before the letter; first day promises it',()=>{
 const q=STORY.chapters.find(c=>c.id==='d2-homework').quests.map(q=>q.id);
 assert.deepEqual(q.slice(2,8),['buy','farm-seeds','farm-hoe','farm-sow','farm-water','letter']);
 assert.ok(!STORY.chapters.find(c=>c.id==='d2-morning').quests.some(q=>q.id.startsWith('farm-')));
 assert.match(DIALOGUES.dede.nodes.d3.say,/Yarın/);assert.equal(HOTSPOTS['yard.myGarden'].use[0],'my-garden');
});
test('three seeds are granted only once and not on day one',()=>{
 const {garden,state,inventory}=setup();state.day=1;garden.giveSeeds();assert.equal(inventory.count('tohum'),0);
 state.day=2;garden.giveSeeds();garden.giveSeeds();assert.equal(inventory.count('tohum'),3);
});
test('hoe then sow three individual seeds then water; repeats cannot consume extra seeds',()=>{
 const {garden,state,inventory,story,done}=setup();assert.equal(garden.use(),false);garden.giveSeeds();
 story.quest.id='farm-sow';assert.equal(garden.use(),false);assert.equal(inventory.count('tohum'),3);
 story.quest.id='farm-hoe';assert.equal(garden.use(),true);assert.equal(garden.use(),false);
 story.quest.id='farm-water';assert.equal(garden.use(),false);
 story.quest.id='farm-sow';garden.use();garden.use();assert.equal(state.flags['farm-planted'],undefined);garden.use();assert.equal(inventory.count('tohum'),0);assert.equal(state.flags['farm-planted'],true);assert.equal(garden.use(),false);
 story.quest.id='farm-water';assert.equal(garden.use(),true);assert.equal(garden.use(),false);assert.equal(state.flags['farm-day'],2);
 assert.deepEqual(done.filter(n=>n!=='farm-v2'),['farm-hoed','farm-planted','farm-watered']);
});
test('partial planting survives saving and resuming without issuing extra seeds',()=>{
 const a=setup();a.garden.giveSeeds();a.garden.use();a.story.quest.id='farm-sow';a.garden.use();a.garden.use();
 const b=setup(a.state.snapshot());b.garden.giveSeeds();assert.equal(b.inventory.count('tohum'),1);b.story.quest.id='farm-sow';b.garden.use();assert.equal(b.state.flags['farm-planted'],true);assert.equal(b.inventory.count('tohum'),0);
});
test('paused story and missing inventory cannot advance planting',()=>{
 const a=setup();a.garden.giveSeeds();a.story.paused=true;assert.equal(a.garden.use(),false);a.story.paused=false;a.garden.use();a.story.quest.id='farm-sow';a.inventory.remove('tohum');assert.equal(a.garden.use(),false);
});
test('pre-farming save keeps the old morning quest; new saves do not migrate twice',()=>{
 for(const [old,next] of [[0,0],[1,1],[2,2]]){const s=new GameState();s.restore({v:1,storyRevision:2,chapter:5,quest:old});assert.equal(s.quest,next);const r=new GameState();r.restore(s.snapshot());assert.equal(r.quest,next);}
 const night=new GameState();night.restore({v:1,chapter:4,quest:3});assert.equal(night.quest,2);
});
test('nine world beds show independent soil, water, growth and mature crop varieties',()=>{
 const yard=new Yard(), group=()=>({visible:false}),tile=()=>({furrows:group(),wet:group(),seed:group(),sparkle:group(),plants:Object.fromEntries(['bean','tomato','pepper','carrot','corn'].map(id=>[id,{root:{visible:false,scale:{setScalar(n){this.n=n;}}},ripe:group()}]))});
 yard.farmVisual={tiles:Array.from({length:9},tile)};
 const f={'farm-v2':{plots:Array.from({length:9},()=>({hoed:false,crop:null,wateredAt:null}))}};
 f['farm-v2'].plots[0]={hoed:true,crop:'tomato',wateredAt:1000};
 f['farm-v2'].plots[1]={hoed:true,crop:'bean',wateredAt:null};
 yard.setGardenState(f,2,1000);assert.equal(yard.farmVisual.tiles[0].wet.visible,true);assert.equal(yard.farmVisual.tiles[0].plants.tomato.ripe.visible,false);assert.equal(yard.farmVisual.tiles[0].plants.tomato.root.visible,true);assert.equal(yard.farmVisual.tiles[1].seed.visible,true);assert.equal(yard.farmVisual.tiles[2].plants.bean.root.visible,false);
 yard.setGardenState(f,2,241000);assert.equal(yard.farmVisual.tiles[0].plants.tomato.ripe.visible,true);assert.equal(yard.farmVisual.tiles[0].plants.bean.root.visible,false);assert.equal(yard.farmVisual.tiles[0].plants.tomato.root.scale.n,1);assert.equal(yard.farmVisual.tiles[0].sparkle.visible,true);
});

test('real story advances through all four farming quests and unlocks the letter only after watering',()=>{
 const state=new GameState();state.day=2;state.chapter=STORY.chapters.findIndex(c=>c.id==='d2-homework');state.quest=3;
 const bus=new EventBus(),inventory=new Inventory(state,bus),toasts={show(){}},time={advance(){}};
 const story=new StoryDirector({story:STORY,state,bus,time,toasts});
 story.setContext({state,flag:k=>!!state.flags[k],has:k=>inventory.has(k)});
 const garden=new GardenSystem({state,inventory,story,bus,vocab:{learn(){}},toasts,world:{get:()=>({setGardenState(){}})},time});
 garden.giveSeeds();story.complete('farm-seeds');assert.equal(story.quest.id,'farm-hoe');
 garden.use();assert.equal(story.quest.id,'farm-sow');garden.use();garden.use();assert.equal(story.quest.id,'farm-sow');garden.use();assert.equal(story.quest.id,'farm-water');garden.use();assert.equal(story.quest.id,'letter');assert.equal(inventory.count('tohum'),0);
});

test('advanced players can complete the garden side quest without completing their main task',()=>{
 const state=new GameState();state.day=4;state.chapter=STORY.chapters.findIndex(c=>c.id==='d4-home');state.quest=0;
 const bus=new EventBus(),inventory=new Inventory(state,bus),toasts={show(){}},story=new StoryDirector({story:STORY,state,bus,time:{advance(){}},toasts});
 const before={chapter:state.chapter,quest:state.quest};
 const garden=new GardenSystem({state,inventory,story,bus,vocab:{learn(){}},toasts,world:{get:()=>({setGardenState(){}})},time:state});
 garden.giveSeeds();assert.equal(state.flags['farm-sidequest'],true);assert.equal(garden.sideObjective(),'Toprağı çapala');
 garden.use();garden.use();garden.use();garden.use();assert.equal(garden.sideObjective(),'Can suyu ver');garden.use();assert.equal(garden.sideObjective(),null);
 assert.equal(state.flags['farm-watered'],true);assert.equal(state.chapter,before.chapter);assert.equal(state.quest,before.quest);garden.giveSeeds();assert.equal(inventory.count('tohum'),0);
});
test('side quest resumes its own stage from an old, advanced story save',()=>{
 const a=setup();a.state.day=5;a.story.quest.id='letter';a.garden.giveSeeds();a.garden.use();a.garden.use();
 const b=setup(a.state.snapshot());b.story.quest.id='letter';assert.equal(b.garden.step,'farm-sow');assert.equal(b.inventory.count('tohum'),2);b.garden.use();b.garden.use();assert.equal(b.garden.step,'farm-water');
 b.story.paused=true;assert.equal(b.garden.sideObjective(),null);assert.equal(b.garden.use(),false);
});
test('grandpa offers old players the lesson and allows the original story conversation',()=>{
 const context={state:{day:4},q:'letter',flag:()=>false,has:()=>false,story:{paused:false}};
 assert.equal(DIALOGUES.dede.start(context),'farmOffer');const offer=DIALOGUES.dede.nodes.farmOffer;
 assert.equal(offer.options[1].next(context),'lt1');
 context.state.day=1;assert.notEqual(DIALOGUES.dede.start(context),'farmOffer');context.state.day=4;context.online=true;assert.notEqual(DIALOGUES.dede.start(context),'farmOffer');
 context.online=false;context.flag=()=>true;assert.notEqual(DIALOGUES.dede.start(context),'farmOffer');
});

function lesson(a) {
 a.garden.giveSeeds();
 for (const [phase,tool] of [['farm-hoe','hoe'],['farm-sow','sow'],['farm-water','water']]) {
  a.story.quest.id=phase;
  for(let i=0;i<3;i++)assert.equal(a.garden.act(i,tool),null);
 }
 a.story.quest.id='jacket2';
}
test('individual beds enforce tutorial order and unlock remaining six only after watering',()=>{
 const a=setup();a.garden.giveSeeds();
 assert.ok(a.garden.act(3,'hoe'));assert.ok(a.garden.act(0,'sow'));assert.equal(a.inventory.count('tohum'),3);
 a.garden.act(0,'hoe');assert.equal(a.state.flags['farm-hoed'],undefined);assert.ok(a.garden.act(0,'hoe'));
 a.garden.act(1,'hoe');a.garden.act(2,'hoe');assert.equal(a.state.flags['farm-hoed'],true);
 a.story.quest.id='farm-sow';assert.ok(a.garden.act(0,'sow','tomato'));assert.equal(a.inventory.count('tohum'),3);
 for(let i=0;i<3;i++)a.garden.act(i,'sow');a.story.quest.id='farm-water';
 a.garden.act(0,'water');a.garden.act(1,'water');assert.equal(a.state.flags['farm-watered'],undefined);assert.ok(a.garden.act(3,'hoe'));
 a.garden.act(2,'water');assert.equal(a.state.flags['farm-watered'],true);assert.equal(a.garden.act(3,'hoe'),null);
});
test('dry crops pause, watering starts clock, early/double harvest cannot grant rewards',()=>{
 const a=setup();let now=1000;a.garden.now=()=>now;lesson(a);
 assert.equal(a.garden.status(0).stage,'sprout');assert.ok(a.garden.act(0,'harvest'));assert.equal(a.garden.data.harvests,0);
 now+=60000;assert.equal(a.garden.status(0).stage,'leaf');now+=60000;assert.equal(a.garden.status(0).stage,'ready');
 assert.equal(a.garden.act(0,'harvest'),null);assert.equal(a.garden.data.basket.bean,2);assert.ok(a.garden.act(0,'harvest'));assert.equal(a.garden.data.harvests,1);
 assert.equal(a.garden.status(0).stage,'soil');assert.equal(a.garden.sell(),6);assert.equal(a.garden.sell(),0);
 assert.equal(a.garden.buy('tomato'),true);assert.equal(a.garden.data.coins,4);assert.equal(a.garden.seeds('tomato'),1);
 assert.equal(a.garden.act(0,'hoe'),null);assert.equal(a.garden.act(0,'sow','tomato'),null);now+=9999999;assert.equal(a.garden.status(0).stage,'dry');
 assert.equal(a.garden.act(0,'water'),null);now+=240000;assert.equal(a.garden.status(0).stage,'ready');
});
test('offline growth survives save, does not wither, never grants harvest until collected',()=>{
 const a=setup();a.garden.now=()=>1000;lesson(a);const saved=a.state.snapshot();
 const b=setup(saved);b.garden.now=()=>1000+86400000;assert.equal(b.garden.status(0).stage,'ready');assert.equal(b.garden.data.harvests,0);assert.equal(b.garden.basketValue,0);
 b.garden.now=()=>500;assert.equal(b.garden.status(0).progress,0);assert.ok(b.garden.act(0,'harvest'));
});
test('new economy cannot spend story money, overspend or consume seeds on invalid beds',()=>{
 const a=setup();lesson(a);const money=a.inventory.count('para');
 assert.equal(a.garden.buy('bean'),false);assert.equal(a.garden.buy('unknown'),false);assert.equal(a.garden.act(-1,'hoe'),'Bir ekim gözü seç.');assert.ok(a.garden.act(9,'sow'));
 assert.equal(a.inventory.count('para'),money);assert.equal(a.garden.data.coins,0);assert.equal(a.garden.seeds('bean'),0);
});

test('actual yard geometry keeps all nine dynamic beds and harvest varieties after static batching',async()=>{
 const THREE=await import('three');
 const {MeshFactory}=await import('../src/engine/MeshFactory.js');
 const {bakeStatic}=await import('../src/engine/StaticBatch.js');
 const yard=new Yard();
 const mf=new MeshFactory({tint(){},normal(){return null;},get(){return null;}});
 // The car's number plate uses a browser canvas; garden geometry needs no DOM.
 yard.build({mf,quality:'low',props:{create:(id,build)=>id==='prop.car'?new THREE.Group():build()}});
 bakeStatic(yard.group);
 assert.equal(yard.farmVisual.tiles.length,9);
 const plots=Array.from({length:9},(_,i)=>({hoed:true,crop:['bean','tomato','pepper','carrot','corn'][i%5],wateredAt:1000}));
 yard.setGardenState({'farm-v2':{plots}},2,601000);
 for(const [i,tile]of yard.farmVisual.tiles.entries()){
  assert.ok(tile.furrows.children.length);
  const id=plots[i].crop;assert.equal(tile.plants[id].ripe.visible,true);assert.ok(tile.plants[id].ripe.children.length);assert.ok(tile.plants[id].root.parent);
  assert.ok(Object.entries(tile.plants).filter(([kind])=>kind!==id).every(([,g])=>!g.root.visible&&!g.ripe.visible));
 }
});

test('revision three garden and letter saves migrate once without losing progress',()=>{
 for(const [chapter,quest,flags,expected]of [[5,2,{},1],[5,5,{},1],[7,3,{},3],[7,3,{'farm-watered':true},7],[7,4,{},8]]){
  const state=new GameState();state.restore({v:1,storyRevision:3,chapter,quest,flags});assert.equal(state.quest,expected);const again=new GameState();again.restore(state.snapshot());assert.equal(again.quest,expected);
 }
});
test('an old letter save resumes its incomplete lesson; a finished lesson is not repeated',()=>{
 for(const complete of [false,true]){
  const state=new GameState();state.restore({v:1,storyRevision:3,day:2,chapter:7,quest:3,flags:{'farm-seeds-given':true,'farm-hoed':true,'farm-sown':1,...(complete?{'farm-planted':true,'farm-watered':true}:{})},inventory:{tohum:2}});
  const bus=new EventBus(),inventory=new Inventory(state,bus),story=new StoryDirector({story:STORY,state,bus,time:{advance(){}},toasts:{show(){}}});story.setContext({state,flag:k=>!!state.flags[k],has:k=>inventory.has(k)});
  new GardenSystem({state,inventory,story,bus,vocab:{learn(){}},toasts:{show(){}},world:{get:()=>({setGardenState(){}})},time:state});bus.emit(EV.QUEST,{});
  assert.equal(story.quest.id,complete?'letter':'farm-sow');assert.equal(inventory.count('tohum'),2);
 }
});
