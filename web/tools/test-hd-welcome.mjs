import test from 'node:test';
import assert from 'node:assert/strict';
import { CreditWallet, HD_WELCOME_MS } from '../src/services/monetization/CreditWallet.js';
import { CONFIG } from '../src/config/remote.js';
import { SHOP, outfitOn, migrateWallet } from '../src/content/shop.js';
const settings = (wallet) => {const data=wallet?{wallet:structuredClone(wallet)}:{};return {get:(key,fallback)=>data[key]??fallback,set:(key,value)=>{data[key]=structuredClone(value);}};};
const create=s=>new CreditWallet({settings:s,bus:{emit(){}},start:100});
test('new player starts with unchanged credits and receives HD automatically for thirty days',()=>{
 const before=Date.now(),s=settings(),w=create(s);assert.equal(w.balance,100);assert.equal(w.adFree,false);assert.equal(w.owns('hd'),true);assert.equal(w.bought('hd'),false);assert.equal(outfitOn(w),'casual');assert.ok(w.trialLeft('hd')>=HD_WELCOME_MS-1000);assert.ok(w.data.trials.hd>=before+HD_WELCOME_MS);
});
test('existing player gets one HD trial without changing credits or ad-free purchase',()=>{
 const s=settings({credits:17,adFree:true,owned:[],equipped:{}}),w=create(s),until=w.data.trials.hd;
 assert.equal(w.balance,17);assert.equal(w.adFree,true);w.trySpend(2);const again=create(s);assert.equal(again.balance,15);assert.equal(again.data.trials.hd,until);
});
test('HD expires after thirty days and a permanent purchase survives expiry',()=>{
 const s=settings(),w=create(s);w.data.trials.hd=Date.now()-1;assert.equal(w.equipped('hd'),null);assert.equal(w.owns('hd'),false);assert.equal(outfitOn(w),null);
 assert.equal(w.buy(SHOP.find(i=>i.id==='hd')),true);assert.equal(w.bought('hd'),true);w.data.trials.hd=Date.now()-1;assert.equal(w.equipped('hd'),'hd');assert.equal(outfitOn(w),'casual');
});
test('existing HD purchases remain permanent and are enabled without a charge',()=>{
 const w=create(settings({credits:700,owned:['hd'],equipped:{}}));assert.equal(w.balance,700);assert.equal(w.bought('hd'),true);assert.equal(w.equipped('hd'),'hd');assert.equal(w.data.trials?.hd,undefined);
});
test('ad-free now costs 300 credits; ads and standard starting credits remain enabled',()=>{
 assert.equal(CONFIG.prices.adFree,300);assert.equal(SHOP.find(i=>i.id==='adFree').price,300);assert.equal(CONFIG.rewards.startCredits,100);assert.equal(CONFIG.ads.betweenDays,true);
 const w=create(settings());assert.equal(w.buy(SHOP.find(i=>i.id==='adFree')),false);w.add(200);assert.equal(w.buy(SHOP.find(i=>i.id==='adFree')),true);assert.equal(w.balance,0);assert.equal(w.adFree,true);
});

test('legacy paid outfits keep HD, but buying clothes during the welcome trial does not make HD permanent',()=>{
 const legacy=create(settings({credits:80,owned:['hd-sport'],equipped:{body:'hd-sport'}}));assert.equal(legacy.bought('hd'),true);assert.equal(legacy.balance,80);
 const s=settings(),w=create(s);w.buy(SHOP.find(i=>i.id==='hd-sport'));const reloaded=create(s);migrateWallet(reloaded);assert.equal(reloaded.bought('hd'),false);reloaded.data.trials.hd=Date.now()-1;assert.equal(outfitOn(reloaded),null);
});
