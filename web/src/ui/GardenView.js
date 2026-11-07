import { el, ICONS } from './dom.js';
import { CROPS } from '../systems/GardenSystem.js';
import { bedArt, cropArt, toolArt } from './GardenArt.js';

const TOOLS = { hoe: 'Çapala', sow: 'Tohum ek', water: 'Sula', harvest: 'Hasat et' };
const PHASES = ['farm-hoe', 'farm-sow', 'farm-water'];
const HINTS = {
  'farm-hoe': 'Dede: Önce öndeki üç gözün toprağını çapayla gevşet.',
  'farm-sow': 'Dede: Şimdi hazırladığın her göze bir fasulye tohumu ek.',
  'farm-water': 'Dede: Üçüne de can suyu ver. Sonra büyümelerini bekleyeceğiz.',
};
const LABELS = { soil: 'Çapalanmamış toprak', hoed: 'Ekime hazır', dry: 'Su bekliyor', sprout: 'Filizleniyor', leaf: 'Büyüyor', ready: 'Hasada hazır' };
export class GardenView {
  constructor(host, { modes, garden }) {
    Object.assign(this, { modes, garden });
    this.tool = 'hoe'; this.crop = 'bean'; this.lastPhase = null;
    this.purse = el('span', { class: 'garden-purse' });
    this.summary = el('span', { class: 'garden-summary' });
    this.hint = el('div', { class: 'garden-hint', attrs: { role: 'status', 'aria-live': 'polite' } });
    this.lesson = el('div', { class: 'garden-lesson' });
    this.beds = Array.from({length:9}, (_,i) => el('button', {
      class: 'garden-bed', attrs: { type:'button' },
      on: { click: e => { if (e.detail === 0) this.apply(i); } },
    }));
    this.grid = el('div', { class: 'garden-grid', attrs: { role:'group', 'aria-label':'Dokuz gözlü ekim alanı' }, on: {
      pointerdown: e => {
        if (e.button !== 0) return;
        const i = this.beds.indexOf(e.target.closest('.garden-bed'));
        if (i < 0) return;
        e.preventDefault(); this.dragged = new Set([i]); this.grid.setPointerCapture(e.pointerId); this.apply(i);
      },
      pointermove: e => {
        if (!this.dragged) return;
        const i = this.beds.indexOf(document.elementFromPoint(e.clientX,e.clientY)?.closest('.garden-bed'));
        if (i >= 0 && !this.dragged.has(i)) { this.dragged.add(i); this.apply(i); }
      },
      pointerup: () => { this.dragged = null; }, pointercancel: () => { this.dragged = null; },
      lostpointercapture: () => { this.dragged = null; },
    } }, this.beds);
    this.toolButtons = Object.entries(TOOLS).map(([id,label]) => el('button', { class:'garden-tool', attrs:{type:'button'}, on:{click:()=>{this.tool=id; this.message=null;this.render();}} }, [el('span',{html:toolArt(id)}), el('b',{text:label})]));
    this.cards = Object.entries(CROPS).map(([id,c]) => {
      const count = el('span',{class:'garden-seed-count'});
      const pick = el('button',{class:'garden-crop-pick',attrs:{type:'button'},on:{click:()=>{if(this.garden.learning&&id!=='bean')return;this.crop=id;this.tool='sow';this.message=null;this.render();}}},[
        el('span',{class:'garden-crop-art',html:cropArt(id)}),el('span',{},[el('b',{text:c.name}),el('small',{text:`${c.minutes} dk · hasat ${c.yield*c.value} ◉`}),count]),
      ]);
      const buy = el('button',{class:'garden-buy',attrs:{type:'button','aria-label':`${c.name} tohumu al, ${c.price} bahçe parası`},on:{click:()=>{this.garden.buy(id);}}},[`+1 · ${c.price} ◉`]);
      return { id,count,pick,buy,root:el('div',{class:'garden-crop'},[pick,buy]) };
    });
    this.sell = el('button',{class:'garden-sell',attrs:{type:'button'},on:{click:()=>{const n=this.garden.sell();if(n){this.message=`Sepet satıldı. +${n} bahçe parası!`;this.render();}}}});
    this.basket = el('div',{class:'garden-basket'});
    this.closeButton = el('button',{class:'garden-close',html:ICONS.close,attrs:{type:'button','aria-label':'Bahçeyi kapat'},on:{click:()=>this.close()}});
    this.root = el('div',{class:'overlay garden-overlay',on:{keydown:e=>this.keydown(e)}},[
      el('section',{class:'garden-window',attrs:{role:'dialog','aria-modal':'true','aria-label':'Benim bahçem'}},[
        el('header',{class:'garden-header'},[el('div',{},[el('small',{text:'DEDEMİN EMANETİ'}),el('h2',{text:'Benim bahçem'})]),this.summary,this.purse,this.closeButton]),
        this.lesson,
        el('div',{class:'garden-body'},[
          el('div',{class:'garden-field'},[el('div',{class:'garden-field-sign',text:'EMEK VER, YEŞERSİN'}),this.grid,el('div',{class:'garden-field-note',text:'Dokun veya aynı araçla gözlerin üzerinde sürükle.'})]),
          el('aside',{class:'garden-sidebar'},[el('h3',{text:'Tohumluk'}),...this.cards.map(c=>c.root),el('div',{class:'garden-harvest-box'},[el('b',{text:'Hasat sepeti'}),this.basket,this.sell]),el('small',{class:'garden-time-note',text:'Sulanınca büyür. Sen yokken de gelişir; ürünlerin solmaz. Bahçe parası yalnızca bu bahçede kullanılır.'})]),
        ]),
        el('footer',{class:'garden-footer'},[el('div',{class:'garden-tools',attrs:{role:'group','aria-label':'Bahçe araçları'}},this.toolButtons),this.hint]),
      ]),
    ]);
    host.append(this.root);
    garden.onChange(()=>{if(this.isOpen)this.render();});
  }
  get isOpen(){return this.root.classList.contains('open');}
  open(){
    if(this.isOpen)return;
    this.previousFocus=document.activeElement;this.pop=this.modes.push('overlay');this.root.classList.add('open');
    this.message=null;this.render();this.closeButton.focus();
    this.timer=setInterval(()=>{this.garden.refresh();},1000);
  }
  close(){this.root.classList.remove('open');clearInterval(this.timer);this.dragged=null;this.pop?.();this.pop=null;this.previousFocus?.focus?.();}
  keydown(e){
    if(e.key==='Escape'){e.preventDefault();this.close();}
    if(e.key!=='Tab')return;
    const a=[...this.root.querySelectorAll('button:not(:disabled)')],first=a[0],last=a.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  apply(i){
    const before=this.garden.step, tool=this.tool, error=this.garden.act(i,tool,this.crop);
    this.message=error??(before!==this.garden.step ? HINTS[this.garden.step]??'Dede: Ellerine sağlık! Artık dokuz göz de senin. Büyüyünce sepetle hasat edebilirsin.' : ({hoe:'Toprak havalandı. Bir adım daha!',sow:'Tohum toprakla buluştu. Şimdi su bekliyor.',water:'Can suyu verildi. Büyüme başladı!',harvest:'Taptaze ürünler sepetinde!'}[tool]));
    if(!error){const b=this.beds[i];b.classList.remove('garden-action');void b.offsetWidth;b.classList.add('garden-action');}
    this.render();
  }
  render(){
    const g=this.garden,d=g.data,phase=g.step, learning=g.learning;
    if(phase!==this.lastPhase){
      this.lastPhase=phase;
      if(learning&&PHASES.includes(phase)){this.tool={ 'farm-hoe':'hoe','farm-sow':'sow','farm-water':'water' }[phase];this.crop='bean';}
    }
    this.root.dataset.tool=this.tool;
    this.purse.textContent=`◉ ${d.coins} bahçe parası`;
    const ready=d.plots.filter((_,i)=>g.status(i).stage==='ready').length;
    this.summary.textContent=ready?`${ready} göz hasada hazır`:`${d.harvests} kez hasat ettin`;
    const phaseIndex=PHASES.indexOf(phase);
    this.lesson.hidden=!learning;
    this.lesson.textContent=`Dedenin ekim dersi · ${Math.max(1,phaseIndex+1)}/3  —  ${phase==='farm-hoe'?`${d.plots.slice(0,3).filter(p=>p.hoed).length}/3 göz çapalandı`:phase==='farm-sow'?`${this.garden.state.flags['farm-sown']??0}/3 tohum ekildi`:`${d.plots.slice(0,3).filter(p=>p.wateredAt!=null).length}/3 göz sulandı`}`;
    this.beds.forEach((b,i)=>{
      const p=d.plots[i],s=g.status(i),locked=learning&&i>=3;
      const seconds=Math.ceil(s.remaining/1000),timer=s.remaining?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'';
      const signature=`${p.hoed}/${p.crop}/${p.wateredAt}/${s.stage}/${locked}`;
      if(b.dataset.signature!==signature){
        b.dataset.signature=signature;
        b.replaceChildren(el('span',{class:'garden-bed-art',html:bedArt(p,s,i)}),el('span',{class:'garden-bed-label'}),el('span',{class:'garden-bed-progress'},[el('span')]));
      }
      b.disabled=locked;b.classList.toggle('ready',s.stage==='ready');b.classList.toggle('locked',locked);
      const label=locked?'Dersten sonra açılır':`${s.stage==='soil'||s.stage==='hoed'?'':CROPS[p.crop].name+' · '}${LABELS[s.stage]}${timer?' '+timer:''}`;
      b.setAttribute('aria-label',`${i+1}. göz: ${label}`);
      b.querySelector('.garden-bed-label').textContent=label;
      const progress=b.querySelector('.garden-bed-progress');progress.hidden=!s.remaining;progress.firstChild.style.width=`${s.progress*100}%`;
    });
    this.toolButtons.forEach((b,i)=>{const id=Object.keys(TOOLS)[i];b.classList.toggle('selected',this.tool===id);b.setAttribute('aria-pressed',String(this.tool===id));b.disabled=learning&&id!==({ 'farm-hoe':'hoe','farm-sow':'sow','farm-water':'water' }[phase]);});
    this.cards.forEach(c=>{c.count.textContent=`${g.seeds(c.id)} tohum`;c.pick.classList.toggle('selected',this.crop===c.id);c.pick.setAttribute('aria-pressed',String(this.crop===c.id));c.pick.disabled=learning;c.buy.disabled=learning||d.coins<CROPS[c.id].price;});
    this.basket.textContent=Object.entries(d.basket).filter(([,n])=>n).map(([id,n])=>`${n} ${CROPS[id].name.toLocaleLowerCase('tr')}`).join(' · ')||'Hasat ettiklerin burada birikir.';
    this.sell.disabled=!g.basketValue;this.sell.textContent=g.basketValue?`Sepeti sat · +${g.basketValue} ◉`:'Sepet henüz boş';
    const hint=this.message??HINTS[phase]??(ready?'Olgun ürünleri sepetle topla. Sonra toprağı yeniden hazırlayabilirsin.':`${TOOLS[this.tool]} aracını seçtin. ${this.tool==='sow'?CROPS[this.crop].name+' ekmek için hazır toprağa dokun.':'İşlem yapmak için bir göze dokun.'}`);
    if(this.hint.textContent!==hint)this.hint.textContent=hint;
  }
}
