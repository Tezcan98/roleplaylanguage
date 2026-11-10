import { GARDEN_TEXT } from '../ui/gardenText.js';
import { CROPS, seedCrop } from './GardenSystem.js';
import { GARDEN_PLOTS, GARDEN_TOOLS, gardenDistance, GARDEN_RELEASE_DISTANCE } from '../content/gardenLayout.js';
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const BAG_INSTRUCTION = { tr: 'Çantanı aç → fasulye tohumunu seç', en: 'Open your bag and select the bean seeds.' };
const VERBS = { hoe: 'Çapala', sow: 'Tohum ek', water: 'Sula', harvest: 'Hasat et' };

/** Gardening uses the same walk-up action button as the rest of the village. No overlay. */
export class GardenInteractions {
  constructor({garden,world,player,mf,modes,toasts,onToolChange=()=>{},onInventoryHint=()=>{},now=()=>performance.now()}) {
    Object.assign(this,{garden,world,player,mf,modes,toasts,onToolChange,onInventoryHint,now});
    this.tool=null;this.crop='bean';this.workingUntil=0;this.ripe=new Set();this.ripeSeen=false;this.ripeCheck=0;
  }
  get available(){return this.world.current?.id==='yard' && this.garden.unlocked && !this.garden.story.paused;}
  get nearGarden(){return this.world.current?.id==='yard' && gardenDistance(this.player.position)<=GARDEN_RELEASE_DISTANCE;}
  get requiredTool(){return this.garden.learning ? {'farm-hoe':'hoe','farm-sow':'sow','farm-water':'water'}[this.garden.step] ?? null : null;}
  clearTool(){this.tool=null;this.player.holdGardenTool?.(null);this.onToolChange();}
  usablePlot(i,tool=this.tool){
    if(this.garden.learning&&i>=3)return false;
    const p=this.garden.data.plots[i];
    return tool==='hoe'?!p.hoed&&!p.crop:tool==='sow'?p.hoed&&!p.crop:tool==='water'?p.crop&&p.wateredAt==null:tool==='harvest'&&this.garden.status(i).stage==='ready';
  }
  target(){
    const tool=this.requiredTool;
    if(!tool)return null;
    if(this.tool!==tool){
      if(tool==='sow')return this.nearGarden?{ui:'inventory',label:'Çantandaki fasulye tohumu'}:{location:'yard',point:{...GARDEN_PLOTS[0],y:.65},label:'Bahçe'};
      const p=GARDEN_TOOLS.find(p=>p.tool===tool);
      return {location:'yard',point:{x:p.x,y:.85,z:p.z},label:tool==='sow'?'Fasulye tohumu':p.label};
    }
    const i=GARDEN_PLOTS.map((p,i)=>({i,d:distance(p,this.player.position)})).filter(p=>this.usablePlot(p.i,tool)).sort((a,b)=>a.d-b.d)[0]?.i;
    return i==null?null:{location:'yard',point:{...GARDEN_PLOTS[i],y:.65},label:`${i+1}. toprak`,plotIndex:i};
  }
  objective(){
    const tool=this.requiredTool;
    if(!tool)return null;
    if(!this.nearGarden)return 'Bahçeye git';
    if(this.tool!==tool)return tool==='hoe'?'Bahçenin yanındaki çapayı al':tool==='sow'?BAG_INSTRUCTION.tr:'Sulama kabını al';
    const done=this.garden.data.plots.slice(0,3).filter(p=>tool==='hoe'?p.hoed:tool==='sow'?p.crop:p.wateredAt!=null).length;
    return `${tool==='hoe'?'İşaretli toprağı çapala':tool==='sow'?'İşaretli toprağa tohum ek':'İşaretli toprağı sula'} (${done}/3)`;
  }
  objectiveEn(){
    const tool=this.requiredTool;
    if(!tool)return null;
    if(!this.nearGarden)return GARDEN_TEXT.yard.en;
    if(this.tool!==tool)return tool==='sow'?BAG_INSTRUCTION.en:GARDEN_TEXT[tool].en;
    return GARDEN_TEXT[{hoe:'workHoe',sow:'workSow',water:'workWater'}[tool]].en;
  }
  canSelectSeed(kind){
    const crop=seedCrop(kind);
    return this.available && this.nearGarden && !!crop && this.garden.seeds(crop)>0 && (!this.requiredTool||this.requiredTool==='sow') && (!this.garden.learning||crop==='bean');
  }
  selectSeed(kind){
    if(!this.canSelectSeed(kind))return false;
    this.take('sow',seedCrop(kind));return true;
  }
  take(tool,crop='bean') {
    if(!['hoe','sow','water'].includes(tool))return false;
    this.tool=tool;this.crop=crop;
    this.player.holdGardenTool?.(tool,crop);
    this.onToolChange();
    const text=tool==='hoe'?'Çapa elinde. Bir toprağın yanına git ve tek tek çapala.':tool==='sow'?`${CROPS[crop].name} tohumu elinde. Çapalanmış toprağın yanına git.`:'Sulama kabı elinde. Ektiğin her göze can suyu ver.';
    this.toasts.show(text,GARDEN_TEXT[{hoe:'workHoe',sow:'workSow',water:'workWater'}[tool]].en);
    return true;
  }
  apply(index,action=this.tool) {
    if(!this.available || !action || this.now()<this.workingUntil || !GARDEN_PLOTS[index] || distance(this.player.position,GARDEN_PLOTS[index])>1.2)return false;
    const grown=this.garden.data.plots[index].crop;
    const error=this.garden.act(index,action,this.crop);
    if(error){this.toasts.show(error,'');return false;}
    this.workingUntil=this.now()+700;
    this.world.get('yard').markGardenPlot?.(index,action,Number.parseInt((CROPS[grown]?.color??'#e35f40').slice(1),16));
    if(action==='harvest'){
      if(this.tool)this.clearTool();
      this.toasts.show('Hasat edildi! Ürün çantana girdi. İstersen sakla, istersen kasada sat.','Harvested! It is in your bag. Keep it, or sell it at the crate.');
    }
    return true;
  }
  find(pos) {
    if(!this.available)return null;
    const choices=[];
    const offer=(point,label,run,priority=3,plotIndex=-1)=>{const d=distance(point,pos);if(d<=1.15)choices.push({label,dist:d,priority,run,plotIndex});};
    for(const p of GARDEN_TOOLS.filter(p=>!this.requiredTool||p.tool===this.requiredTool))offer(p,this.tool===p.tool?'Aracı yerine bırak':p.label,()=>{if(this.tool===p.tool){this.clearTool();}else this.take(p.tool);});
    const sale={x:13,z:4.15};
    if(!this.garden.learning)offer(sale,this.garden.basketValue?`Ürünleri sat · +${this.garden.basketValue} bahçe parası`:`Ürünleri satabilirsin · ${this.garden.data.coins} bahçe parası`,()=>{
      const value=this.garden.sell();this.toasts.show(value?`Hasadını sattın! +${value} bahçe parası.`:'Hasat ettiklerini burada satabilirsin.','');
    });
    if(this.tool && (!this.requiredTool||this.tool===this.requiredTool) && this.now()>=this.workingUntil){
      GARDEN_PLOTS.forEach((p,i)=>{
        if(this.garden.learning&&i>=3)return;
        const actionable=this.usablePlot(i);
        if(actionable)offer(p,`${VERBS[this.tool]} · ${i+1}. toprak`,()=>this.apply(i),4,i);
      });
    }
    if(!this.garden.learning&&this.now()>=this.workingUntil){
      GARDEN_PLOTS.forEach((p,i)=>{
        if(this.garden.status(i).stage==='ready')offer(p,`Hasat et · ${i+1}. toprak`,()=>this.apply(i,'harvest'),5,i);
      });
    }
    choices.sort((a,b)=>b.priority-a.priority||a.dist-b.dist);
    const chosen=choices[0]??null;
    this.world.get('yard').highlightGardenPlot?.(this.target()?.plotIndex ?? chosen?.plotIndex ?? -1);
    return chosen;
  }
  /** A bed ripens while you are in the garden: say so once (not in the first lesson). */
  #noticeRipe(){
    if(this.garden.learning||this.now()<this.ripeCheck)return;
    this.ripeCheck=this.now()+1000;
    const ready=new Set(GARDEN_PLOTS.map((_,i)=>i).filter(i=>this.garden.status(i).stage==='ready'));
    if([...ready].some(i=>!this.ripe.has(i))&&this.ripeSeen)this.toasts.show('Bir ürün olgunlaştı! Hasat zamanı.','A crop is ripe! Time to harvest.');
    this.ripe=ready;this.ripeSeen=true;
  }
  update(_dt,t) {
    this.onInventoryHint(this.available&&this.nearGarden&&this.requiredTool==='sow'&&this.tool!=='sow');
    if(!this.available){this.player.gardenPose?.(t,false);if(this.tool){this.clearTool();}this.world.get('yard').highlightGardenPlot?.(-1);return;}
    if(this.tool&&!this.nearGarden){this.clearTool();this.workingUntil=0;}
    if(this.requiredTool&&this.tool&&this.tool!==this.requiredTool)this.clearTool();
    this.#noticeRipe();
    const working=this.now()<this.workingUntil;
    this.player.gardenPose?.(t,working&&this.tool==='hoe');
    this.player.holdGardenTool?.(this.tool,this.crop,working);
  }
}
