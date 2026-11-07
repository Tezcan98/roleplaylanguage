import test from 'node:test';
import assert from 'node:assert/strict';
import { InterstitialFrequency } from '../src/services/monetization/InterstitialFrequency.js';
const settings=()=>{const d={};return {get:(k,f)=>d[k]??f,set:(k,v)=>{d[k]=v;}};};
test('all interstitial opportunities share a half-frequency cadence',()=>{
 const cadence=new InterstitialFrequency({settings:settings(),every:2});assert.deepEqual(Array.from({length:6},()=>cadence.take()),[false,true,false,true,false,true]);
});
test('reopening preserves the cadence rather than skipping the first ad on every launch',()=>{
 const s=settings();assert.equal(new InterstitialFrequency({settings:s}).take(),false);assert.equal(new InterstitialFrequency({settings:s}).take(),true);
});
test('configuration can restore the original cadence and corrupt saved counters recover',()=>{
 const s=settings();s.set('interstitialOpportunities','bad');const c=new InterstitialFrequency({settings:s,every:1});assert.equal(c.take(),true);assert.equal(c.take(),true);
});
