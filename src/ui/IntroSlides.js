import { el } from './dom.js';

/** First-launch introduction (Arabic first, with a short Turkish line), reachable again from the menu and help. */
const SLIDES = [
  { icon: '🏡', ar: 'أهلاً بك في بيت عائلة يلماز!', arText: 'تعلّم التركية وأنت تعيش مع العائلة في القرية: ساعد أمك، استمع لحكايات جدك، واذهب إلى المدرسة.', tr: 'Yılmaz ailesinin evine hoş geldin!' },
  { icon: '🕹️', ar: 'المشي والمهام', arText: 'امشِ بعصا التحكم أو مفاتيح WASD. اتبع السهم الذهبي، وعندما يظهر الزر الأصفر اضغطه (أو E).', tr: 'Yürü, oku takip et, sarı düğmeye bas.' },
  { icon: '💬', ar: 'الكلام', arText: 'الجملة بالتركية في الأعلى والترجمة العربية تحتها. اختر الجواب، أو اضغط 🎤 وقله بصوتك. 🔊 يقرأ لك الجملة.', tr: 'Cevabı seç ya da mikrofona bas ve söyle.' },
  { icon: '؟', ar: 'زر المساعدة', arText: 'زر «؟ مساعدة» في الزاوية يشرح لك بالعربية: ماذا تفعل الآن، ماذا في حقيبتك، وكيف تلعب.', tr: 'Köşedeki ؟ düğmesi her şeyi Arapça anlatır.' },
  { icon: '🌐', ar: 'ساحة القرية', arText: 'في الساحة تلتقي لاعبين حقيقيين. ما تقوله يظهر نصاً فوق رأسك. المحادثة الصوتية بين شخصين فقط وبعد موافقة الطرفين.', tr: 'Meydanda konuşmalar yazıyla görünür; sesli sohbet karşılıklı onayla.' },
  { icon: '🐘', ar: 'ذاكرة الفيل', arText: 'في كتاب المدرسة بطاقات تربط الكلمة التركية بكلمة عربية تشبهها في الصوت وصورة مضحكة. هكذا لا تنساها!', tr: 'Kelimeleri komik benzetmelerle hatırla.' },
];

export class IntroSlides {
  constructor(host, modes) {
    this.modes = modes;
    this.icon = el('div', { class: 'intro-icon' });
    this.title = el('h2', { class: 'ctitle rtl', attrs: { dir: 'rtl', lang: 'ar' } });
    this.text = el('p', { class: 'ctext rtl', attrs: { dir: 'rtl', lang: 'ar' } });
    this.tr = el('p', { class: 'cen', attrs: { lang: 'tr' } });
    this.dots = el('div', { class: 'intro-dots' });
    this.prev = el('button', { class: 'btn alt sm', text: '‹', attrs: { type: 'button', 'aria-label': 'السابق' } });
    this.next = el('button', { class: 'btn sm', attrs: { type: 'button' } });
    this.skip = el('button', { class: 'linkbtn', text: 'تخطٍّ · Geç', attrs: { type: 'button' } });
    this.root = el('div', { class: 'overlay dim intro' }, [el('div', { class: 'card' }, [
      this.icon, this.title, this.text, this.tr, this.dots, el('div', { class: 'row' }, [this.prev, this.next]), this.skip,
    ])]);
    host.append(this.root);
  }

  /** @returns {Promise<void>} when closed */
  show() {
    return new Promise((resolve) => {
      const pop = this.modes.push('overlay');
      let i = 0;
      const render = () => {
        const s = SLIDES[i];
        this.icon.textContent = s.icon;
        this.title.textContent = s.ar;
        this.text.textContent = s.arText;
        this.tr.textContent = s.tr;
        this.dots.replaceChildren(...SLIDES.map((_, k) => el('span', { class: k === i ? 'on' : '' })));
        this.prev.disabled = i === 0;
        this.next.textContent = i === SLIDES.length - 1 ? 'ابدأ · Başla' : 'التالي · Sonraki';
      };
      const done = () => { this.root.classList.remove('open'); pop(); resolve(); };
      this.prev.onclick = () => { if (i > 0) { i--; render(); } };
      this.next.onclick = () => { if (i < SLIDES.length - 1) { i++; render(); } else done(); };
      this.skip.onclick = done;
      render();
      this.root.classList.add('open');
    });
  }
}
