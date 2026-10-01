/**
 * Ahmet's Turkish textbook. Units are homework; pages are read pages, memory cards
 * (keyword method: a Turkish word linked to a similar-sounding English word and a funny
 * picture) or exercises that reuse the dialogue activities (choice, listen, order, speak).
 */
export const TEXTBOOK = {
  units: [
    {
      id: 'u1', title: 'Ünite 1: Ailem', titleEn: 'Unit 1: My family',
      pages: [
        {
          type: 'read', title: 'Ailem',
          lines: [
            ['Benim adım Ahmet.', 'My name is Ahmet.'],
            ['Ben on yaşındayım.', 'I am ten years old.'],
            ['Annemin adı Ayşe.', "My mother's name is Ayşe."],
            ['Babamın adı Mehmet.', "My father's name is Mehmet."],
            ['Dedemin adı Hüseyin.', "My grandfather's name is Hüseyin."],
            ['Biz köyde yaşıyoruz.', 'We live in a village.'],
          ],
          words: [['köy', 'village'], ['yaşamak', 'to live'], ['aile', 'family']],
        },
        {
          type: 'memory', title: 'Fil hafızası 🐘',
          cards: [
            { tr: 'süt', en: 'milk', sounds: '“suit”', picture: 'Takım elbise (suit) giymiş bir süt şişesi.', ar: { sounds: '«سوط»', picture: 'زجاجة حليب تلوّح بسوط.' } },
            { tr: 'kova', en: 'bucket', sounds: '“cover”', picture: 'Kovanın üstünde kocaman bir kapak (cover).', ar: { sounds: '«قهوة»', picture: 'دلو مملوء بالقهوة الساخنة.' } },
            { tr: 'kapı', en: 'door', sounds: '“copy”', picture: 'Fotokopi makinesi (copy) gibi kapı, açıldıkça kopyalar basıyor.', ar: { sounds: '«كاب»', picture: 'باب يلبس كاباً (قبعة) كبيراً.' } },
            { tr: 'kitap', en: 'book', sounds: '“kit up”', picture: 'Bir kitap, sırt çantasıyla yolculuğa hazırlanıyor (kit up).', ar: { sounds: '«كتاب»', picture: 'تقريباً نفس الكلمة! كتاب ← kitap.' } },
            { tr: 'ev', en: 'house', sounds: '“Eve”', picture: 'Eve adında bir kız evin kapısında el sallıyor.', ar: { sounds: '«أيوه»', picture: 'بيت يهزّ رأسه ويقول: أيوه!' } },
          ],
        },
        { type: 'exercise', title: 'Soru 1', activity: 'choice', say: 'Ahmet\'in annesinin adı ne?', en: "What is Ahmet's mother's name?", hint: 'Annemin adı …',
          options: [{ tr: 'Elif', en: '', wrong: true }, { tr: 'Ayşe', en: '' }, { tr: 'Zeynep', en: '', wrong: true }] },
        { type: 'exercise', title: 'Soru 2', activity: 'order', say: 'Cümleyi kur.', en: 'Build the sentence.', answer: 'Biz köyde yaşıyoruz.', answerEn: 'We live in a village.' },
        { type: 'exercise', title: 'Soru 3', activity: 'listen', say: 'Dedemin adı Hüseyin.', en: "My grandfather's name is Hüseyin.", prompt: 'Ne duydun?', speaker: 'dede',
          options: [{ tr: 'Babamın adı Hüseyin.', en: '', wrong: true }, { tr: 'Dedemin adı Hüseyin.', en: '' }, { tr: 'Dedemin adı Mehmet.', en: '', wrong: true }] },
        { type: 'exercise', title: 'Soru 4', activity: 'choice', say: 'Boşluğu doldur: “Ben on yaş___ım.”', en: 'Fill the gap: “I am ten years old.”', hint: 'yaşındayım = I am … years old',
          options: [{ tr: 'ında', en: '' }, { tr: 'da', en: '', wrong: true }, { tr: 'ın', en: '', wrong: true }] },
        { type: 'exercise', title: 'Soru 5', activity: 'speak', say: 'Sesli oku:', en: 'Read aloud:', expect: ['Benim adım Ahmet', 'Ben on yaşındayım'], show: 'Benim adım Ahmet. Ben on yaşındayım.' },
        { type: 'exercise', title: 'Soru 6', activity: 'choice', optionsAreMeanings: true, say: '“süt” ne demek?', en: 'What does “süt” mean?', hint: 'süt = milk',
          options: [{ tr: 'milk', en: '' }, { tr: 'suit', en: '', wrong: true }, { tr: 'water', en: '', wrong: true }] },
      ],
    },
    { id: 'u2', title: 'Ünite 2: Sayılar', titleEn: 'Unit 2: Numbers', locked: true, pages: [] },
    { id: 'u3', title: 'Ünite 3: Okulum', titleEn: 'Unit 3: My school', locked: true, pages: [] },
  ],
};
