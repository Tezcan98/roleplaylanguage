import test from 'node:test';
import assert from 'node:assert/strict';
import { TextbookController } from '../src/systems/TextbookController.js';
import { ModeStack } from '../src/core/ModeStack.js';
const tick = () => new Promise(r => setImmediate(r));
function setup(requestSkip, canSkip = () => true) {
  const flags = {}, progress = [], solved = [], calls = [];
  const modes = new ModeStack(); modes.setBase('play');
  const view = { open(){}, close(){}, frame(){}, read(){}, units(){}, exercise(){return {};}, offerSkip(fn){this.skipAction=fn;}, skipBusy(){}, enableNext(){}, done(){}, showHint(){} };
  const c = new TextbookController({book:{units:[{id:'u1',title:'Test',titleEn:'Test',pages:[{type:'read'},{type:'exercise',activity:'choice'},{type:'exercise',activity:'choice'}]}]},view,
    activities:{create(){return {mount(){return new Promise(r=>solved.push(r));},destroy(){}};}},
    tts:{cancel(){}},vocab:{learn(){}},state:{flags},modes,toasts:{show(){}},canSkip,requestSkip,
    effects:{run(es){calls.push(...es);for(const e of es) if(e.startsWith('flag:')) flags[e.slice(5)]=true;}}});
  c.onProgress = k => progress.push(k);c.open('u1');
  return {c,flags,progress,solved,calls,modes,view};
}
test('one rewarded ad skips the entire homework, including from a reading page',async()=>{
 let ads=0;const {c,flags,progress,calls,view,modes}=setup(async()=>{ads++;return true;});
 assert.equal(typeof view.skipAction,'function');await c.skip();assert.equal(flags['tb-u1-skipped'],true);assert.equal(flags['homework-u1'],true);
 assert.equal(flags['tb-u1-1'],undefined);assert.equal(flags['tb-u1-2'],undefined);assert.deepEqual(progress,['unit_skipped']);assert.equal(c.unit,null);assert.equal(modes.top,'play');
 c.open('u1');await c.skip();assert.equal(ads,1);assert.equal(calls.filter(x=>x==='flag:homework-u1').length,1);
});
test('dismissal or ad failure does not complete the homework',async()=>{
 for(const request of [async()=>false,async()=>{throw Error('no fill');}]){const {c,flags,progress}=setup(request);await c.skip();assert.deepEqual(flags,{});assert.deepEqual(progress,[]);assert.equal(c.page,0);}
});
test('double taps request one ad; navigation is blocked until response',async()=>{
 let resolve,n=0;const {c,flags}=setup(()=>{n++;return new Promise(r=>resolve=r);});const pending=c.skip();await c.skip();c.next();c.prev();c.close();c.open('u1');assert.equal(n,1);assert.equal(c.page,0);resolve(true);await pending;assert.equal(flags['homework-u1'],true);assert.equal(c.unit,null);
});
test('late activity result after whole-unit skip does not count as solved',async()=>{
 const {c,solved,flags,progress}=setup(async()=>true);c.next();await c.skip();solved[0]();await tick();assert.equal(flags['tb-u1-1'],undefined);assert.deepEqual(progress,['unit_skipped']);
});
test('skipping remaining homework preserves previously correct answers',async()=>{
 const {c,solved,flags,progress}=setup(async()=>true);c.next();solved[0]();await tick();await c.skip();assert.equal(flags['homework-u1'],true);assert.equal(flags['tb-u1-1'],true);assert.equal(flags['tb-u1-2'],undefined);assert.deepEqual(progress,['solved','unit_skipped']);
});
test('normal completion does not require any ads',async()=>{
 let ads=0;const {c,solved,flags,view}=setup(async()=>{ads++;return true;});c.next();solved[0]();await tick();c.next();solved[1]();await tick();assert.equal(flags['homework-u1'],true);assert.equal(flags['tb-u1-skipped'],undefined);assert.equal(view.skipAction,null);assert.equal(ads,0);
});
test('skip unavailable on providers without rewarded ads',async()=>{
 let n=0;const {c,flags}=setup(async()=>{n++;return true;},()=>false);await c.skip();assert.equal(n,0);assert.deepEqual(flags,{});
});
