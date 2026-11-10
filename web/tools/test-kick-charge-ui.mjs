import test from 'node:test';
import assert from 'node:assert/strict';
import { ChargedKickButton } from '../src/ui/ChargedKickButton.js';
class Element extends EventTarget {
  constructor() {
    super(); this.attrs = {}; this.style = {}; this.children = []; this.hidden = false; this.dataset = {};
    const names = new Set(); this.classList = { add: (...xs) => xs.forEach(x => names.add(x)), remove: (...xs) => xs.forEach(x => names.delete(x)), toggle: (x, on) => on ? names.add(x) : names.delete(x) };
  }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(k, v) { this.attrs[k] = v; }
  getBoundingClientRect() { return { left: 200, bottom: 400, width: 90 }; }
  setPointerCapture(id) { this.capture = id; }
  hasPointerCapture(id) { return this.capture === id; }
  releasePointerCapture() { this.capture = null; }
}
function setup(t) {
  const names = ['document','addEventListener','requestAnimationFrame','cancelAnimationFrame','innerWidth','innerHeight'];
  const saved = Object.fromEntries(names.map(k => [k, Object.getOwnPropertyDescriptor(globalThis,k)]));
  const windowEvents = new EventTarget(), docEvents = new EventTarget(), frames = new Map(); let frameId = 0;
  globalThis.document = { hidden: false, createElement: () => new Element(), addEventListener: (...args) => docEvents.addEventListener(...args) };
  globalThis.addEventListener = (...args) => windowEvents.addEventListener(...args);
  globalThis.requestAnimationFrame = (cb) => { frames.set(++frameId, cb); return frameId; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  globalThis.innerWidth = 844; globalThis.innerHeight = 390;
  t.after(() => { for (const k of names) { if (saved[k]) Object.defineProperty(globalThis,k,saved[k]); else delete globalThis[k]; } });
  const fired = [], host = new Element(), anchor = new Element(); let now = 0, usable = true;
  const button = new ChargedKickButton(host, (power) => fired.push(power), anchor, { canUse: () => usable });
  button.charge.now = () => now; button.show(true);
  const event = (type, values = {}) => Object.assign(new Event(type, { cancelable: true }), values);
  const pointer = (type, id = 7) => button.root.dispatchEvent(event(type, { pointerId: id, pointerType: 'touch', button: 0 }));
  return { button, fired, pointer, event, windowEvents, docEvents, frames, setTime: v => { now = v; }, setUsable: v => { usable = v; } };
}
test('touch hold updates the bar; wrong finger does not release it; release kicks once', t => {
  const x = setup(t); x.pointer('pointerdown'); assert.equal(x.fired.length, 0);
  x.setTime(600); x.button.paint(); assert.equal(x.button.meter.attrs['aria-valuenow'], '50');
  x.pointer('pointerup', 8); assert.equal(x.fired.length, 0);
  x.pointer('pointerup'); assert.deepEqual(x.fired, [0.5]);
  x.pointer('lostpointercapture'); x.pointer('pointerup');
  x.button.root.dispatchEvent(x.event('click', { detail: 1 })); assert.equal(x.fired.length, 1);
});
test('cancel, focus loss, menus and hiding discard the held kick', t => {
  const x = setup(t);
  for (const stop of [() => x.pointer('pointercancel'), () => x.pointer('lostpointercapture'), () => x.windowEvents.dispatchEvent(new Event('blur')), () => x.button.show(false)]) {
    x.button.show(true); x.pointer('pointerdown'); x.setTime(1000); stop(); x.pointer('pointerup'); assert.equal(x.fired.length, 0);
  }
  x.button.show(true); x.pointer('pointerdown'); x.setUsable(false); x.pointer('pointerup'); assert.equal(x.fired.length, 0);
});
test('keyboard charge ignores autorepeat, releases once, and does not fire a synthesized click', t => {
  const x = setup(t), key = () => x.event('keydown', { code: 'KeyF', key: 'f', repeat: false });
  x.button.keyDown(key()); x.setTime(1200);
  x.button.keyDown(x.event('keydown', { code:'KeyF',key:'f',repeat:true }));
  assert.equal(x.button.power, 1); assert.equal(x.fired.length, 0);
  x.button.keyUp(x.event('keyup', { code:'KeyF',key:'f' }));
  x.button.root.dispatchEvent(x.event('click', { detail:0 }));
  assert.deepEqual(x.fired,[1]);
});
test('backgrounding while charging discards the kick', t => {
  const x = setup(t); x.pointer('pointerdown');
  document.hidden = true; x.docEvents.dispatchEvent(new Event('visibilitychange'));
  document.hidden = false; x.pointer('pointerup'); assert.deepEqual(x.fired,[]);
});

test('pitch taps select a receiver, follow them while moving, and ignore camera drags/pinches', async t => {
  const x = setup(t);
  const THREE = await import('three');
  const { PassAim } = await import('../src/systems/PassAim.js');
  const canvas = new Element(); canvas.getBoundingClientRect = () => ({ left:0,top:0,width:844,height:390 });
  const camera = new THREE.PerspectiveCamera(55, 844/390, 0.1, 100);
  camera.position.set(0,10,10); camera.lookAt(0,0,0); camera.updateMatrixWorld();
  const world = { current:{id:'village'}, scene:new THREE.Scene() };
  const friend = {position:{x:1,z:0}}; let valid = true;
  const aim = new PassAim({ canvas,camera,world,enabled:()=>true,inside:()=>true,selected:()=>friend,receiverAt:()=>friend,receiverValid:()=>valid });
  function event(type,id,xv=422,yv=195) {
    const e=x.event(type,{pointerId:id,pointerType:'touch',button:0,clientX:xv,clientY:yv});
    Object.defineProperty(e,'target',{value:canvas});return e;
  }
  const down=id=>canvas.dispatchEvent(event('pointerdown',id));
  const up=id=>x.windowEvents.dispatchEvent(event('pointerup',id));
  down(1);up(1); assert.equal(aim.target().receiver,friend);
  friend.position.x=8; assert.equal(aim.target().x,8);
  valid=false;assert.equal(aim.target().receiver,null);assert.ok(Math.abs(aim.target().x)<1e-6);
  aim.clear();down(2);x.windowEvents.dispatchEvent(event('pointermove',2,450));up(2);assert.equal(aim.target(),null);
  down(3);down(4);up(3);up(4);assert.equal(aim.target(),null);
  down(5);world.current={id:'schoolyard'};up(5);assert.equal(aim.target(),null);
});
