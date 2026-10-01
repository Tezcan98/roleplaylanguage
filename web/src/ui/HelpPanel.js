import { el } from './dom.js';
import { gloss } from '../i18n/Gloss.js';

/**
 * The "؟ مساعدة" button in the corner: explains in Arabic what to do right now (quest),
 * what is in the bag and how to play — for players who don't know any Turkish yet.
 */
export class HelpPanel {
  constructor(host, { modes, getState, onIntro, onWords }) {
    Object.assign(this, { modes, getState, onIntro, onWords });
    this.button = el('button', { class: 'help-btn', html: '؟<span>مساعدة</span>', attrs: { type: 'button', 'aria-label': 'مساعدة · Yardım' }, on: { click: () => this.open() } });
    this.body = el('div', { class: 'help-body rtl', attrs: { dir: 'rtl', lang: 'ar' } });
    this.root = el('div', { class: 'overlay dim', on: { click: (e) => { if (e.target === this.root) this.close(); } } }, [
      el('div', { class: 'bookin help-panel' }, [
        el('h2', { attrs: { dir: 'rtl' } }, [el('span', { text: 'مساعدة · Yardım' }), el('button', { class: 'iconbtn', text: '✕', attrs: { type: 'button', 'aria-label': 'إغلاق' }, on: { click: () => this.close() } })]),
        this.body,
      ]),
    ]);
    host.append(this.button, this.root);
  }

  set visible(v) { this.button.hidden = !v; }

  open() {
    const s = this.getState();
    const section = (title, ...children) => el('section', {}, [el('h3', { text: title }), ...children]);
    const p = (text, cls) => el('p', { class: cls, text });
    const tr = (text) => el('p', { class: 'tr-line', attrs: { dir: 'ltr', lang: 'tr' }, text });

    this.body.replaceChildren(
      section('🎯 مهمتك الآن',
        ...(s.quest ? [p(gloss(s.quest.en), 'big-ar'), tr(`${s.quest.title}: ${s.quest.text}`)] : [p('لا توجد مهمة الآن. تجوّل وتحدث مع الجميع!')]),
        p('اتبع السهم الذهبي ⬇️ فوق الشخص أو الباب. عندما تقترب يظهر زر أصفر في الأسفل: اضغطه (أو مفتاح E).')),
      section('🎒 الحقيبة',
        ...(s.bag.length ? s.bag.map(([trName, ar]) => el('p', {}, [el('b', { text: ar }), el('span', { class: 'tr-inline', attrs: { dir: 'ltr' }, text: ` · ${trName}` })])) : [p('الحقيبة فارغة.')])),
      section('🗣️ الكلام',
        p('الجملة التركية في الأعلى، والترجمة العربية تحتها. اختر جوابك بالضغط عليه (أو بالأرقام 1-4).'),
        p('🎤 عندما يظهر الميكروفون: اضغطه وقل الجملة بالتركية. 🔊 يقرأ لك الجملة.'),
        p('🧩 «كوِّن الجملة»: اضغط الكلمات بالترتيب الصحيح.')),
      section('🕹️ التحكم',
        p('المشي: عصا التحكم في الزاوية أو مفاتيح WASD / الأسهم.'),
        p('«Defter» = دفتر الكلمات التي تعلمتها · «Çanta» = الحقيبة · «Kitap» = كتاب المدرسة.')),
      section('🌐 ساحة القرية (مع لاعبين آخرين)',
        p('في الساحة يظهر كلامك نصاً فوق رأسك: اضغط «Bas, konuş» أو مفتاح T وتكلّم.'),
        p('المحادثة الصوتية تكون بين شخصين فقط وبموافقة الطرفين. كن لطيفاً مع الجميع.')),
      el('div', { class: 'row help-actions' }, [
        el('button', { class: 'btn alt sm', text: `📖 الكلمات (${s.words})`, attrs: { type: 'button' }, on: { click: () => { this.close(); this.onWords(); } } }),
        el('button', { class: 'btn sm', text: '▶ المقدمة', attrs: { type: 'button' }, on: { click: () => { this.close(); this.onIntro(); } } }),
      ]),
    );
    if (!this.pop) this.pop = this.modes.push('overlay');
    this.root.classList.add('open');
  }

  close() { this.root.classList.remove('open'); this.pop?.(); this.pop = null; }
}
