import test from 'node:test';
import assert from 'node:assert/strict';
import { LessonController } from '../src/systems/LessonController.js';
import { ClassroomSession, LocalClassroomSession } from '../src/services/multiplayer/ClassroomSession.js';
import { CharacterVoices } from '../src/services/speech/CharacterVoices.js';
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function setup(){
 const spoken=[],room={anchors:new Map([['seat4',{x:0,z:0}]]),group:{children:[]},writeBoard(){}};
 class Session extends ClassroomSession{
  readyCalls=0;nextCalls=0;
  join(){this.emit('question',{index:0,total:1,q:'Kaç yaşındasın?',turnStudentId:'elif',botAnswers:['On yaşındayım.']});}
  ready(){this.readyCalls++;}next(){this.nextCalls++;}
 }
 const session=new Session();
 const controller=new LessonController({lessons:{l1:{id:'l1',title:'Ders',questions:[]}},bots:[],world:{get:()=>room},travel:{go:(_id,_spawn,cb)=>cb?.()},player:{place(){},sit(){},position:{z:0}},cast:{get:()=>({name:'Elif'})},camera:{setFixed(){}},modes:{push:()=>()=>{}},state:{flags:{}},tts:{speak:(text,{speaker})=>new Promise(resolve=>spoken.push({text,speaker,resolve})),cancel(){}},labels:{bubble(){}},view:{openLesson(){},question(){},status_(){},answer(){}},sessionFactory:()=>session});
 controller.enter('l1');return {controller,session,spoken};
}
test('classmate waits for teacher audio, and next question waits for the full answer',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {controller,session,spoken}=setup();await flush();
 t.mock.timers.tick(20000);await flush();assert.equal(spoken.length,1);assert.equal(session.readyCalls,0);
 spoken[0].resolve();await flush();t.mock.timers.tick(650);await flush();assert.equal(session.readyCalls,1);
 session.emit('answer',{studentId:'elif',text:'On yaşındayım.',correct:true});await flush();t.mock.timers.tick(650);await flush();assert.equal(spoken[1].speaker,'elif');
 t.mock.timers.tick(20000);await flush();assert.equal(session.nextCalls,0);controller.replay();assert.equal(spoken.length,2);
 spoken[1].resolve();await flush();t.mock.timers.tick(1300);await flush();assert.equal(session.nextCalls,1);
});
test('wrong classmate answer finishes before correction, then correction finishes before moving on',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const {session,spoken}=setup();await flush();spoken[0].resolve();await flush();t.mock.timers.tick(650);await flush();
 session.emit('answer',{studentId:'elif',text:'Yirmi yaşındayım.',correct:false});await flush();t.mock.timers.tick(650);await flush();
 t.mock.timers.tick(9999);await flush();assert.equal(spoken.length,2);
 spoken[1].resolve();await flush();t.mock.timers.tick(850);await flush();assert.equal(spoken[2].speaker,'ogretmen');assert.match(spoken[2].text,/Doğrusu/);
 t.mock.timers.tick(9999);await flush();assert.equal(session.nextCalls,0);spoken[2].resolve();await flush();t.mock.timers.tick(1300);await flush();assert.equal(session.nextCalls,1);
});
test('local bots never start their answer timer until the teacher marks that question ready',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const q={q:'Soru',botAnswers:['Evet'],botWrong:['Hayır']};
 const s=new LocalClassroomSession({lesson:{questions:[q,q]},bots:[{id:'elif',name:'Elif',skill:1}]});let answers=0;s.on('answer',()=>answers++);await s.join({id:'ahmet',name:'Ahmet'});s.next();
 t.mock.timers.tick(10000);assert.equal(answers,0);s.ready(0);t.mock.timers.tick(10000);assert.equal(answers,0);s.ready(1);s.ready(1);t.mock.timers.tick(4000);assert.equal(answers,1);s.leave();
});
test('a stale server voice failure cannot start fallback over the newer speaker',async()=>{
 const reject=[],fallback=[];
 const tts=new CharacterVoices({server:{supported:true,cancel(){},speak:()=>new Promise((_r,j)=>reject.push(j))},neural:{supported:false,cancel(){}},fallback:{cancel(){},speak:text=>{fallback.push(text);}},voices:{default:{id:'voice'}}});
 const old=tts.speak('Eski soru');const current=tts.speak('Yeni soru');reject[0](Error('late failure'));await old;assert.deepEqual(fallback,[]);reject[1](Error('current failure'));await current;assert.deepEqual(fallback,['Yeni soru']);
});
test('interrupting shared voice playback resolves the previous wait instead of leaving the lesson stuck',async()=>{
 globalThis.Audio=class{paused=true;play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
 const {playVoice,stopVoice,voiceAudio}=await import('../src/services/speech/voiceAudio.js');
 let ended=0;const first=playVoice('/first.wav').then(()=>ended++);const second=playVoice('/second.wav').then(()=>ended++);await first;assert.equal(ended,1);voiceAudio().onended();await second;assert.equal(ended,2);
 const third=playVoice('/third.wav');stopVoice();await third;
 delete globalThis.Audio;
});
