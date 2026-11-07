import test from 'node:test';
import assert from 'node:assert/strict';
import { GardenInteractions } from '../src/systems/GardenInteractions.js';
import { GardenSystem } from '../src/systems/GardenSystem.js';
import { GameState } from '../src/core/GameState.js';
import { EventBus } from '../src/core/EventBus.js';
import { Inventory } from '../src/systems/Inventory.js';
import { GARDEN_PLOTS, GARDEN_TOOLS, GARDEN_SEEDS } from '../src/content/gardenLayout.js';
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
 const a=setup();a.walk.take('hoe');for(let i=0;i<3;i++){a.at(GARDEN_PLOTS[i]).run();a.advance();}a.story.quest.id='farm-sow';a.at(GARDEN_SEEDS[0]).run();assert.equal(a.walk.tool,'sow');
 for(let i=0;i<3;i++){a.at(GARDEN_PLOTS[i]).run();a.advance();}assert.equal(a.state.flags['farm-planted'],true);a.story.quest.id='farm-water';a.at(GARDEN_TOOLS[1]).run();assert.equal(a.walk.tool,'water');
 for(let i=0;i<3;i++){a.at(GARDEN_PLOTS[i]).run();a.advance();}assert.equal(a.state.flags['farm-watered'],true);
});
test('remote plots cannot be changed, locked plots are not offered, leaving puts tools away',()=>{
 const a=setup();a.walk.take('hoe');assert.equal(a.walk.apply(8),false);assert.equal(a.at(GARDEN_PLOTS[8]),null);a.world.current.id='house';a.walk.update(0,0);assert.equal(a.walk.tool,null);assert.equal(a.held.at(-1),null);assert.equal(a.at(GARDEN_TOOLS[0]),null);
});
test('seed purchase and harvest sale stay in the world and cannot overspend',()=>{
 const a=setup();a.state.flags['farm-watered']=true;a.story.quest.id='letter';a.at(GARDEN_SEEDS[1]).run();assert.equal(a.garden.seeds('tomato'),0);assert.equal(a.walk.tool,null);
 a.garden.data.coins=2;a.at(GARDEN_SEEDS[1]).run();assert.equal(a.garden.seeds('tomato'),1);assert.equal(a.garden.data.coins,0);assert.equal(a.walk.crop,'tomato');
 a.garden.data.basket={bean:2};a.at({x:13,z:4.15}).run();assert.equal(a.garden.data.coins,6);assert.equal(a.garden.basketValue,0);
});
