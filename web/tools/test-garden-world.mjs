import test from 'node:test';
import assert from 'node:assert/strict';
import { GardenInteractions } from '../src/systems/GardenInteractions.js';
import { GardenSystem } from '../src/systems/GardenSystem.js';
import { GameState } from '../src/core/GameState.js';
import { EventBus } from '../src/core/EventBus.js';
import { Inventory } from '../src/systems/Inventory.js';
import { GARDEN_PLOTS, GARDEN_TOOLS } from '../src/content/gardenLayout.js';
function setup(){
 const state=new GameState();state.day=2;const bus=new EventBus(),inventory=new Inventory(state,bus),story={paused:false,quest:{id:'farm-hoe'}},scene={setGardenState(){},highlightGardenPlot(){},markGardenPlot(){}};
 const world={current:{id:'yard'},get:()=>scene},toasts={show(){}},garden=new GardenSystem({state,inventory,story,bus,world,toasts,vocab:{learn(){}},time:state});garden.giveSeeds();
 let now=1000;const held=[],player={position:{x:0,z:0},holdGardenTool:tool=>held.push(tool)};
 const walk=new GardenInteractions({garden,world,player,toasts,now:()=>now});
 const at=point=>{Object.assign(player.position,point);return walk.find(player.position);};
 return {state,garden,walk,story,world,at,held,advance:()=>{now+=1000;}};
}
test('take the real hoe then work each nearby plot once; no menu or automatic multi-plot completion',()=>{
 const a=setup();assert.equal(a.at(GARDEN_PLOTS[0]),null);
 let action=a.at(GARDEN_TOOLS[0]);assert.equal(action.label,'Çapayı al');action.run();assert.equal(a.walk.tool,'hoe');assert.deepEqual(a.held,['hoe']);
 action=a.at(GARDEN_PLOTS[0]);assert.match(action.label,/Çapala · 1/);action.run();assert.equal(a.garden.data.plots[0].hoed,true);assert.equal(a.garden.data.plots[1].hoed,false);assert.equal(a.state.flags['farm-hoed'],undefined);
 assert.equal(a.walk.apply(1),false);a.advance();a.at(GARDEN_PLOTS[1]).run();a.advance();a.at(GARDEN_PLOTS[2]).run();assert.equal(a.state.flags['farm-hoed'],true);
});
test('after hoeing, take seeds and water in the same world using separate actions',()=>{
 const a=setup();a.walk.take('hoe');for(let i=0;i<3;i++){a.at(GARDEN_PLOTS[i]).run();a.advance();}a.story.quest.id='farm-sow';assert.equal(a.walk.selectSeed('tohum'),true);assert.equal(a.walk.tool,'sow');
 for(let i=0;i<3;i++){a.at(GARDEN_PLOTS[i]).run();a.advance();}assert.equal(a.state.flags['farm-planted'],true);a.story.quest.id='farm-water';a.at(GARDEN_TOOLS[1]).run();assert.equal(a.walk.tool,'water');
 for(let i=0;i<3;i++){a.at(GARDEN_PLOTS[i]).run();a.advance();}assert.equal(a.state.flags['farm-watered'],true);
});
test('remote plots cannot be changed, locked plots are not offered, leaving puts tools away',()=>{
 const a=setup();a.walk.take('hoe');assert.equal(a.walk.apply(8),false);assert.equal(a.at(GARDEN_PLOTS[8]),null);a.world.current.id='house';a.walk.update(0,0);assert.equal(a.walk.tool,null);assert.equal(a.held.at(-1),null);assert.equal(a.at(GARDEN_TOOLS[0]),null);
});
test('purchased seeds enter the inventory and harvest sale cannot overspend',()=>{
 const a=setup();a.state.flags['farm-watered']=true;a.story.quest.id='letter';assert.equal(a.garden.buy('tomato'),false);assert.equal(a.garden.seeds('tomato'),0);assert.equal(a.walk.tool,null);
 a.garden.data.coins=2;assert.equal(a.garden.buy('tomato'),true);assert.equal(a.walk.selectSeed('domates-tohumu'),true);assert.equal(a.garden.seeds('tomato'),1);assert.equal(a.garden.data.coins,0);assert.equal(a.walk.crop,'tomato');
 a.garden.data.basket={bean:2};a.at({x:13,z:4.15}).run();assert.equal(a.garden.data.coins,6);assert.equal(a.garden.basketValue,0);
});
test('guidance points to the needed tool, then the actual unfinished soil instead of the generic garden hotspot',()=>{
 const a=setup();assert.deepEqual(a.walk.target().point,{x:GARDEN_TOOLS[0].x,y:.85,z:GARDEN_TOOLS[0].z});assert.match(a.walk.objective(),/çapayı al/);
 a.walk.take('hoe');Object.assign(a.walk.player.position,GARDEN_PLOTS[0]);assert.equal(a.walk.target().plotIndex,0);assert.match(a.walk.objective(),/çapala \(0\/3\)/);
 a.walk.apply(0);assert.notEqual(a.walk.target().plotIndex,0);assert.match(a.walk.objective(),/1\/3/);
});
test('screenshot regression: sowing points to inventory, not old props or duplicate objectives',()=>{
 const a=setup();for(let i=0;i<3;i++)a.garden.data.plots[i].hoed=true;a.state.flags['farm-hoed']=true;a.state.flags['farm-sidequest']=true;a.story.quest.id='farm-sow';
 a.walk.tool='hoe';a.walk.update(0,0);assert.equal(a.walk.tool,null);assert.equal(a.at(GARDEN_TOOLS[0]),null);assert.equal(a.garden.sideObjective(),null);assert.match(a.walk.objective(),/Çantanı aç/);
 assert.equal(a.walk.target().ui,'inventory');assert.equal(a.walk.selectSeed('tohum'),true);assert.equal(a.walk.tool,'sow');assert.match(a.at(GARDEN_PLOTS[0]).label,/Tohum ek/);assert.equal(a.walk.target().plotIndex,0);
});
test('quest marker resolves the live garden point and routes to the yard when elsewhere',async()=>{
 const THREE=await import('three');const {QuestMarker}=await import('../src/systems/QuestMarker.js');const a=setup();
 const marker=new QuestMarker({scene:new THREE.Scene(),story:{target:()=>a.walk.target()},world:{current:{id:'yard'},exitTowards:()=>({pos:new THREE.Vector3(2,0,3),markerY:2})},player:a.walk.player});
 assert.equal(marker.resolve().x,GARDEN_TOOLS[0].x);assert.equal(marker.resolve().y,.85);a.walk.take('hoe');Object.assign(a.walk.player.position,GARDEN_PLOTS[0]);assert.equal(marker.resolve().z,GARDEN_PLOTS[0].z);assert.equal(marker.resolve().y,.65);
 marker.world.current.id='house';assert.equal(marker.resolve().x,2);assert.equal(marker.atDoor,true);
});

test('all crop seeds live in inventory and legacy seed stocks migrate only once',()=>{
 const a=setup();a.state.flags['farm-v2']={plots:Array.from({length:9},()=>({hoed:false,crop:null,wateredAt:null})),coins:4,basket:{},seeds:{tomato:3,pepper:2}};
 assert.equal(a.garden.seeds('tomato'),3);assert.equal(a.garden.inventory.count('domates-tohumu'),3);assert.equal(a.garden.inventory.count('biber-tohumu'),2);a.garden.data;a.garden.data;assert.equal(a.garden.inventory.count('domates-tohumu'),3);
 const b=setup();b.state.restore(a.state.snapshot());assert.equal(b.garden.seeds('tomato'),3);assert.equal(b.garden.seeds('pepper'),2);assert.equal(b.garden.inventory.count('tohum'),3);
});
test('selecting seeds consumes nothing until sowing, wrong stage and remote inventory selection are blocked',()=>{
 const a=setup();assert.equal(a.walk.selectSeed('tohum'),false);assert.equal(a.garden.seeds('bean'),3);a.story.quest.id='farm-sow';a.state.flags['farm-hoed']=true;a.garden.data.plots[0].hoed=true;
 assert.equal(a.walk.selectSeed('tohum'),true);assert.equal(a.garden.seeds('bean'),3);Object.assign(a.walk.player.position,GARDEN_PLOTS[0]);a.walk.apply(0);assert.equal(a.garden.seeds('bean'),2);
 a.world.current.id='house';assert.equal(a.walk.selectSeed('tohum'),false);a.walk.clearTool();assert.equal(a.walk.target().location,'yard');
});
test('harvest basket cannot be picked up before any watered crop is fully mature',()=>{
 const a=setup();a.state.flags['farm-watered']=true;a.story.quest.id='letter';let time=1000;a.garden.now=()=>time;
 assert.equal(a.at(GARDEN_TOOLS[2]),null);assert.equal(a.walk.take('harvest'),false);assert.equal(a.walk.tool,null);assert.deepEqual(a.held,[]);
 a.garden.data.plots[0]={hoed:true,crop:'bean',wateredAt:null};time+=999999;assert.equal(a.at(GARDEN_TOOLS[2]),null);
 a.garden.data.plots[0].wateredAt=time;time+=119999;assert.equal(a.at(GARDEN_TOOLS[2]),null);assert.equal(a.walk.take('harvest'),false);
 time++;const action=a.at(GARDEN_TOOLS[2]);assert.equal(action.label,'Hasat sepetini al');action.run();assert.equal(a.walk.tool,'harvest');assert.equal(a.held.at(-1),'harvest');
});
test('a stale basket action rechecks readiness and an already held basket can still be put back',()=>{
 const a=setup();a.state.flags['farm-watered']=true;a.story.quest.id='letter';a.garden.now=()=>200000;
 a.garden.data.plots[1]={hoed:true,crop:'bean',wateredAt:1000};const stale=a.at(GARDEN_TOOLS[2]);a.garden.act(1,'harvest');stale.run();assert.equal(a.walk.tool,null);
 a.garden.data.plots[2]={hoed:true,crop:'bean',wateredAt:1000};assert.equal(a.walk.take('harvest'),true);a.garden.act(2,'harvest');const putBack=a.at(GARDEN_TOOLS[2]);assert.equal(putBack.label,'Aracı yerine bırak');putBack.run();assert.equal(a.walk.tool,null);
});
