import { CROPS } from './GardenSystem.js';
import { GARDEN_PLOTS, GARDEN_TOOLS, GARDEN_SEEDS } from '../content/gardenLayout.js';
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const VERBS = { hoe: 'Çapala', sow: 'Tohum ek', water: 'Sula', harvest: 'Hasat et' };

/** Gardening uses the same walk-up action button as the rest of the village. No overlay. */
export class GardenInteractions {
  constructor({garden,world,player,mf,modes,toasts,now=()=>performance.now()}) {
    Object.assign(this,{garden,world,player,mf,modes,toasts,now});
    this.tool=null;this.crop='bean';this.workingUntil=0;
  }
  get available(){return this.world.current?.id==='yard' && this.garden.unlocked && !this.garden.story.paused;}
  take(tool,crop='bean') {
    this.tool=tool;this.crop=crop;
    this.player.holdGardenTool?.(tool,crop);
    const text=tool==='hoe'?'Çapa elinde. Bir toprağın yanına git ve tek tek çapala.':tool==='sow'?`${CROPS[crop].name} tohumu elinde. Çapalanmış toprağın yanına git.`:tool==='water'?'Sulama kabı elinde. Ektiğin her göze can suyu ver.':'Sepet elinde. Olgunlaşmış ürünlerin yanına git.';
    this.toasts.show(text,'');
  }
  apply(index) {
    if(!this.available || !this.tool || this.now()<this.workingUntil || !GARDEN_PLOTS[index] || distance(this.player.position,GARDEN_PLOTS[index])>1.2)return false;
    const error=this.garden.act(index,this.tool,this.crop);
    if(error){this.toasts.show(error,'');return false;}
    this.workingUntil=this.now()+700;
    this.world.get('yard').markGardenPlot?.(index);
    if(this.tool==='harvest')this.toasts.show('Ürünleri sepete koydun. Satmak için boş kasanın yanına git.','');
    return true;
  }
  find(pos) {
    if(!this.available)return null;
    const choices=[];
    const offer=(point,label,run,priority=3,plotIndex=-1)=>{const d=distance(point,pos);if(d<=1.15)choices.push({label,dist:d,priority,run,plotIndex});};
    for(const p of GARDEN_TOOLS)offer(p,this.tool===p.tool?'Aracı yerine bırak':p.label,()=>{if(this.tool===p.tool){this.tool=null;this.player.holdGardenTool?.(null);}else this.take(p.tool);});
    for(const p of GARDEN_SEEDS){
      if(this.garden.learning&&p.crop!=='bean')continue;
      const stock=this.garden.seeds(p.crop),c=CROPS[p.crop];
      offer(p,stock?`${c.name} tohumunu al (${stock})`:`${c.name} tohumu al · ${c.price} bahçe parası`,()=>{
        if(!stock&&!this.garden.buy(p.crop)){this.toasts.show('Yeni tohum için önce hasadını sat.','');return;}
        this.take('sow',p.crop);
      });
    }
    const sale={x:13,z:4.15};
    offer(sale,this.garden.basketValue?`Ürünleri sat · +${this.garden.basketValue} bahçe parası`:`Boş kasa · ${this.garden.data.coins} bahçe parası`,()=>{
      const value=this.garden.sell();this.toasts.show(value?`Hasadını sattın! +${value} bahçe parası.`:'Hasat ettiklerini burada satabilirsin.','');
    });
    if(this.tool && this.now()>=this.workingUntil){
      GARDEN_PLOTS.forEach((p,i)=>{
        if(this.garden.learning&&i>=3)return;
        const plot=this.garden.data.plots[i],s=this.garden.status(i);
        const actionable=this.tool==='hoe'?!plot.hoed&&!plot.crop:this.tool==='sow'?plot.hoed&&!plot.crop:this.tool==='water'?plot.crop&&plot.wateredAt==null:s.stage==='ready';
        if(actionable)offer(p,`${VERBS[this.tool]} · ${i+1}. toprak`,()=>this.apply(i),4,i);
      });
    }
    choices.sort((a,b)=>b.priority-a.priority||a.dist-b.dist);
    const chosen=choices[0]??null;
    this.world.get('yard').highlightGardenPlot?.(chosen?.plotIndex ?? -1);
    return chosen;
  }
  update(_dt,t) {
    if(!this.available){this.player.gardenPose?.(t,false);if(this.tool){this.tool=null;this.player.holdGardenTool?.(null);}this.world.get('yard').highlightGardenPlot?.(-1);return;}
    const working=this.now()<this.workingUntil;
    this.player.gardenPose?.(t,working&&this.tool==='hoe');
    this.player.holdGardenTool?.(this.tool,this.crop,working);
  }
}
