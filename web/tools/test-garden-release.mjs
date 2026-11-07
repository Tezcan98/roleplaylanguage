import test from 'node:test';
import assert from 'node:assert/strict';
import { GardenReleaseIntro, GARDEN_RELEASE } from '../src/ui/GardenReleaseIntro.js';
test('release is offered once and acknowledged independently of game progress or OTA hash',()=>{
 const data={},shown=[];const settings={get:(key,fallback)=>data[key]??fallback,set:(key,value)=>{data[key]=value;}};
 const cards={show:(card,done)=>shown.push({card,done})};
 const intro=new GardenReleaseIntro({cards,settings});assert.equal(intro.showIfNeeded(),true);assert.equal(intro.showIfNeeded(),false);assert.equal(shown.length,1);assert.equal(data[GARDEN_RELEASE],undefined);
 assert.match(shown[0].card.text,/9 ayrı/);assert.match(shown[0].card.text,/İkinci gün/);assert.match(shown[0].card.text,/ilerlediysen/);assert.match(shown[0].card.illustration,/<svg/);
 shown[0].done();assert.equal(data[GARDEN_RELEASE],true);assert.equal(intro.showIfNeeded(),false);
 const reloaded=new GardenReleaseIntro({cards,settings});assert.equal(reloaded.showIfNeeded(),false);assert.equal(shown.length,1);
});
test('unacknowledged announcement remains available at the next launch',()=>{
 const settings={get:()=>false,set(){}};let shown=0;const cards={show(){shown++;}};
 new GardenReleaseIntro({cards,settings}).showIfNeeded();new GardenReleaseIntro({cards,settings}).showIfNeeded();assert.equal(shown,2);
});
