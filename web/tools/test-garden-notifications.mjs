import test from 'node:test';
import assert from 'node:assert/strict';
import { GardenNotifications, gardenNotificationPlan, WATER_DELAY } from '../src/platform/GardenNotifications.js';
const NOW = 1700000000000;
const crop = (overrides={}) => ({crop:'bean',plantedAt:NOW,wateredAt:null,...overrides});
function harness(permission='granted'){
 const calls={scheduled:[],cancelled:[],requests:0,warnings:[]};
 let pending=[];
 const plugin={
  async checkPermissions(){return {display:permission};},
  async requestPermissions(){calls.requests++;return {display:permission};},
  async getPending(){return {notifications:structuredClone(pending)};},
  async schedule({notifications}){calls.scheduled.push(...notifications);pending.push(...structuredClone(notifications));},
  async cancel({notifications}){calls.cancelled.push(...notifications);pending=pending.filter(n=>!notifications.some(x=>x.id===n.id));},
 };
 const notifier=new GardenNotifications({plugin,now:()=>NOW,warn:(...args)=>calls.warnings.push(args)});
 return {notifier,calls,plugin,get pending(){return pending;},setPermission(v){permission=v;}};
}
test('nine independent beds produce water and crop-specific harvest reminders',()=>{
 const plots=Array.from({length:9},()=>({crop:null}));
 plots[0]=crop();plots[4]=crop({crop:'tomato',wateredAt:NOW});plots[8]=crop({crop:'pepper',wateredAt:NOW});
 const plan=gardenNotificationPlan(plots,NOW);assert.equal(plan.length,3);
 const water=plan.find(n=>n.extra.kind==='water');assert.equal(+water.schedule.at,NOW+WATER_DELAY);assert.deepEqual(water.extra.plots,[0]);
 const harvest=plan.filter(n=>n.extra.kind==='harvest');assert.deepEqual(harvest.map(n=>+n.schedule.at),[NOW+240000,NOW+360000]);
 assert.match(harvest[0].body,/5\. gözdeki domates/);assert.match(harvest[1].body,/9\. gözdeki biber/);
});
test('nearby maturities are grouped and never announced before the last plant is ready',()=>{
 const plan=gardenNotificationPlan([crop({wateredAt:NOW}),crop({wateredAt:NOW+1000}),crop({wateredAt:NOW+2000})],NOW);
 assert.equal(plan.length,1);assert.equal(+plan[0].schedule.at,NOW+122000);assert.deepEqual(plan[0].extra.plots,[0,1,2]);
});
test('past reminders, empty beds and malformed dates cannot be reissued',()=>{
 assert.deepEqual(gardenNotificationPlan([{},crop({wateredAt:NOW-999999}),crop({plantedAt:NOW-WATER_DELAY}),crop({plantedAt:NaN}),crop({crop:'unknown'}),crop({wateredAt:NaN})],NOW),[]);
});
test('unchanged sync preserves existing alarms instead of issuing duplicate notifications',async()=>{
 const h=harness(),plots=[crop({wateredAt:NOW})];await h.notifier.sync({plots});await h.notifier.sync({plots});
 assert.equal(h.calls.scheduled.length,1);assert.equal(h.calls.cancelled.length,0);assert.equal(h.calls.requests,0);
});
test('watering cancels water alert, schedules harvest; harvesting cancels harvest without touching daily reminder',async()=>{
 const h=harness();await h.plugin.schedule({notifications:[{id:7001,body:'daily',schedule:{at:new Date(NOW+86400000)}}]});
 await h.notifier.sync({plots:[crop()]});assert.equal(h.pending.length,2);
 await h.notifier.sync({plots:[crop({wateredAt:NOW})]});assert.ok(h.calls.cancelled.some(n=>n.id===7210));assert.equal(h.pending.length,2);
 await h.notifier.sync({plots:[]});assert.deepEqual(h.pending.map(n=>n.id),[7001]);assert.equal(h.calls.warnings.length,0);
});
test('permission denial is respected and permission is not asked on startup',async()=>{
 const h=harness('prompt');await h.notifier.sync({plots:[crop()]});assert.equal(h.calls.requests,0);
 await h.notifier.sync({plots:[crop()],ask:true});await h.notifier.sync({plots:[crop()],ask:true});assert.equal(h.calls.requests,1);assert.equal(h.calls.scheduled.length,0);
 h.setPermission('granted');await h.notifier.sync({plots:[crop()]});assert.equal(h.calls.scheduled.length,1);
 const denied=harness('denied');await denied.notifier.sync({plots:[crop()],ask:true});assert.equal(denied.calls.requests,0);
});
test('serialized changes leave no stale reminders after rapid planting, watering and harvesting',async()=>{
 const h=harness();await Promise.all([h.notifier.sync({plots:[crop()]}),h.notifier.sync({plots:[crop({wateredAt:NOW})]}),h.notifier.sync({plots:[]})]);
 assert.deepEqual(h.pending,[]);assert.equal(h.calls.warnings.length,0);
});
test('plugin errors are caught and the next update can recover',async()=>{
 const h=harness(),original=h.plugin.getPending;h.plugin.getPending=async()=>{throw Error('offline native bridge');};
 await h.notifier.sync({plots:[crop()]});assert.equal(h.calls.warnings.length,1);
 h.plugin.getPending=original;await h.notifier.sync({plots:[crop()]});assert.equal(h.pending.length,1);
});
