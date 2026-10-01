/**
 * Fatma Nine (grandma) sits on the sedir at home. Every visit she gives a different piece of
 * advice (nasihat) on Islam and good character, then checks with a short question that it
 * was understood. After all of them she starts again from a different one each day.
 */
const ADVICE = [
  { id: 'selam', say: 'Kuzum, birini görünce önce sen selam ver. Peygamberimiz selamı yaymamızı söyledi.', en: 'My dear, when you see someone, greet them first. Our Prophet told us to spread the greeting of peace.',
    words: [['selam vermek', 'to greet (say salaam)'], ['yaymak', 'to spread'], ['önce', 'first']],
    q: 'Nine ne yapmamızı söylüyor?', qEn: 'What does grandma tell us to do?', right: ['Önce selam vermemizi.', 'To greet first.'], wrong: [['Hiç konuşmamamızı.', 'Not to talk at all.'], ['Bağırmamızı.', 'To shout.']] },
  { id: 'dogruluk', say: 'Yalan söyleme, evladım. Doğru sözlü insanı Allah da sever, insanlar da.', en: 'Do not lie, my child. Allah loves a truthful person, and so do people.',
    words: [['yalan', 'lie'], ['doğru sözlü', 'truthful'], ['sevmek', 'to love']],
    q: 'Allah kimi sever?', qEn: 'Whom does Allah love?', right: ['Doğru sözlü insanı.', 'The truthful person.'], wrong: [['Yalan söyleyeni.', 'The one who lies.'], ['Çok uyuyanı.', 'The one who sleeps a lot.']] },
  { id: 'saygi', say: 'Büyüklerine saygı, küçüklerine sevgi göster. Annenin babanın sözünü dinle.', en: 'Show respect to your elders and love to the young. Listen to your mother and father.',
    words: [['saygı', 'respect'], ['sevgi', 'love'], ['söz dinlemek', 'to obey, to listen to']],
    q: 'Büyüklerimize ne göstermeliyiz?', qEn: 'What should we show our elders?', right: ['Saygı.', 'Respect.'], wrong: [['Öfke.', 'Anger.'], ['Hiçbir şey.', 'Nothing.']] },
  { id: 'besmele', say: 'Yemeğe “Bismillah” diyerek başla, bitince “Elhamdülillah” de. Nimete şükret.', en: 'Start eating by saying “Bismillah”, and say “Alhamdulillah” when you finish. Be thankful for the blessing.',
    words: [['nimet', 'blessing (food, gifts from God)'], ['şükretmek', 'to give thanks to God'], ['başlamak', 'to begin']],
    q: 'Yemek bitince ne deriz?', qEn: 'What do we say when the meal is over?', right: ['Elhamdülillah.', 'Alhamdulillah.'], wrong: [['Günaydın.', 'Good morning.'], ['Hoşça kal.', 'Goodbye.']] },
  { id: 'israf', say: 'Ekmeği yere atma, suyu boşa akıtma. İsraf etmek günahtır.', en: 'Do not throw bread on the ground, do not let water run for nothing. Wasting is a sin.',
    words: [['israf', 'waste'], ['boşa', 'for nothing, in vain'], ['günah', 'sin']],
    q: 'Suyu nasıl kullanmalıyız?', qEn: 'How should we use water?', right: ['Boşa akıtmadan.', 'Without letting it run for nothing.'], wrong: [['Hep açık bırakarak.', 'Always leaving it on.'], ['Yere dökerek.', 'Pouring it on the floor.']] },
  { id: 'komsu', say: 'Komşun açken tok yatma. Güzel bir yemek yaptıysak komşuya da bir tabak götürürüz.', en: 'Do not go to bed full while your neighbour is hungry. If we cook something nice, we take a plate to the neighbour too.',
    words: [['komşu', 'neighbour'], ['aç', 'hungry'], ['tok', 'full']],
    q: 'Güzel bir yemek yapınca ne yaparız?', qEn: 'What do we do when we cook a nice meal?', right: ['Komşuya da bir tabak götürürüz.', 'We take a plate to the neighbour too.'], wrong: [['Hepsini saklarız.', 'We hide all of it.'], ['Çöpe atarız.', 'We throw it away.']] },
  { id: 'temizlik', say: 'Temizlik imandandır. Ellerini yıka, dişlerini fırçala, odanı topla.', en: 'Cleanliness is part of faith. Wash your hands, brush your teeth, tidy your room.',
    words: [['temizlik', 'cleanliness'], ['iman', 'faith'], ['fırçalamak', 'to brush']],
    q: 'Temizlik neyin parçasıdır?', qEn: 'Cleanliness is part of what?', right: ['İmanın.', 'Of faith.'], wrong: [['Oyunun.', 'Of the game.'], ['Uykunun.', 'Of sleep.']] },
  { id: 'sabir', say: 'Bir şey istediğin gibi olmazsa sabret, hemen kızma. Sabrın sonu selamettir.', en: "If something doesn't go the way you want, be patient and don't get angry right away. Patience ends in well-being.",
    words: [['sabır', 'patience'], ['sabretmek', 'to be patient'], ['kızmak', 'to get angry']],
    q: 'İşler istediğimiz gibi gitmezse ne yapmalıyız?', qEn: "What should we do when things don't go our way?", right: ['Sabretmeliyiz.', 'We should be patient.'], wrong: [['Bağırmalıyız.', 'We should shout.'], ['Ağlayıp kaçmalıyız.', 'We should cry and run away.']] },
  { id: 'iyilik', say: 'Kim yardım isterse elinden geldiğince yardım et. İyilik yap, denize at; balık bilmezse Halık bilir.', en: "Help whoever asks for help as much as you can. Do good and throw it into the sea; if the fish don't know, the Creator does.",
    words: [['iyilik', 'kindness, a good deed'], ['yardım etmek', 'to help'], ['Halık', 'the Creator (Allah)']],
    q: 'Yaptığımız iyiliği kim bilir?', qEn: 'Who knows the good we do?', right: ['Allah bilir.', 'Allah knows.'], wrong: [['Kimse bilmez.', 'Nobody knows.'], ['Sadece balıklar.', 'Only the fish.']] },
  { id: 'hayvan', say: 'Kediye, kuşa su ver. Hayvanlara eziyet etme; onlar da Allah’ın emanetidir.', en: 'Give water to the cat and the birds. Do not hurt animals; they too are entrusted to us by Allah.',
    words: [['şefkat', 'compassion'], ['eziyet etmek', 'to torment, to hurt'], ['emanet', 'something entrusted to you']],
    q: 'Hayvanlara nasıl davranmalıyız?', qEn: 'How should we treat animals?', right: ['Şefkatle.', 'With compassion.'], wrong: [['Onları kovalayarak.', 'By chasing them.'], ['Su vermeyerek.', 'By giving them no water.']] },
  { id: 'namaz', say: 'Namaz dinin direğidir. Vakti gelince ertelemeden kıl.', en: 'Prayer is the pillar of the religion. When its time comes, pray without putting it off.',
    words: [['direk', 'pillar'], ['vakit', 'time (of prayer)'], ['ertelemek', 'to put off']],
    q: 'Namaz vakti gelince ne yaparız?', qEn: 'What do we do when prayer time comes?', right: ['Ertelemeden kılarız.', 'We pray without putting it off.'], wrong: [['Unuturuz.', 'We forget it.'], ['Yarına bırakırız.', 'We leave it for tomorrow.']] },
  { id: 'anne', say: 'Cennet annelerin ayakları altındadır. Annene “öf” bile deme, onun duasını al.', en: "Paradise lies at the feet of mothers. Don't even say “ugh” to your mother; earn her prayers.",
    words: [['cennet', 'paradise'], ['ayak', 'foot'], ['dua', 'prayer, blessing']],
    q: 'Cennet nerededir?', qEn: 'Where is paradise?', right: ['Annelerin ayakları altında.', 'At the feet of mothers.'], wrong: [['Okulun bahçesinde.', 'In the schoolyard.'], ['Köy meydanında.', 'In the village square.']] },
  { id: 'odunc', say: 'Bir şeyi ödünç alırsan sağlam ve zamanında geri ver. Emanete sahip çık.', en: 'If you borrow something, give it back unbroken and on time. Look after what is entrusted to you.',
    words: [['ödünç almak', 'to borrow'], ['sağlam', 'unbroken, intact'], ['zamanında', 'on time']],
    q: 'Ödünç aldığımız şeyi nasıl geri veririz?', qEn: 'How do we give back what we borrowed?', right: ['Sağlam ve zamanında.', 'Unbroken and on time.'], wrong: [['Kırık ve geç.', 'Broken and late.'], ['Hiç geri vermeyiz.', 'We never give it back.']] },
  { id: 'tatlidil', say: 'Tatlı dil yılanı deliğinden çıkarır. Kimseyi kırma, güzel konuş.', en: 'A sweet tongue draws the snake out of its hole. Do not hurt anyone; speak kindly.',
    words: [['tatlı dil', 'kind words (sweet tongue)'], ['yılan', 'snake'], ['kırmak', 'to hurt (someone), to break']],
    q: 'Nasıl konuşmalıyız?', qEn: 'How should we speak?', right: ['Güzel ve tatlı.', 'Kindly and sweetly.'], wrong: [['Kaba ve kırıcı.', 'Rudely and hurtfully.'], ['Hep bağırarak.', 'Always shouting.']] },
  { id: 'tebessum', say: 'Kardeşine gülümsemen bile sadakadır. Güler yüzlü ol, kuzum.', en: 'Even smiling at your brother or sister is charity. Be cheerful, my dear.',
    words: [['gülümsemek', 'to smile'], ['sadaka', 'charity'], ['güler yüzlü', 'cheerful, smiling']],
    q: 'Gülümsemek ne sayılır?', qEn: 'What does smiling count as?', right: ['Sadaka.', 'Charity.'], wrong: [['Ayıp.', 'Rude.'], ['Günah.', 'A sin.']] },
  { id: 'ilim', say: 'Beşikten mezara kadar ilim öğren. Türkçe öğrenmen de güzel bir ilim!', en: 'Seek knowledge from the cradle to the grave. Learning Turkish is good knowledge too!',
    words: [['ilim', 'knowledge'], ['beşik', 'cradle'], ['öğrenmek', 'to learn']],
    q: 'Ne zamana kadar öğreniriz?', qEn: 'Until when do we learn?', right: ['Ömür boyu, beşikten mezara.', 'All our life, from the cradle to the grave.'], wrong: [['Sadece okulda.', 'Only at school.'], ['On yaşına kadar.', 'Until the age of ten.']] },
  { id: 'soz', say: 'Söz verdiysen tut. Sözünde durmayan insana kimse güvenmez.', en: 'If you made a promise, keep it. Nobody trusts a person who does not keep their word.',
    words: [['söz vermek', 'to promise'], ['sözünde durmak', 'to keep your word'], ['güvenmek', 'to trust']],
    q: 'Söz verince ne yaparız?', qEn: 'What do we do once we promise?', right: ['Sözümüzü tutarız.', 'We keep our word.'], wrong: [['Hemen unuturuz.', 'We forget it at once.'], ['Başkasına yaptırırız.', 'We make someone else do it.']] },
  { id: 'hak', say: 'Başkasının hakkını yeme. Kimsenin malını izinsiz alma; kul hakkı çok ağırdır.', en: "Don't take what is someone else's due. Never take anyone's things without permission; the rights of others weigh heavily.",
    words: [['hak', 'right, what is due'], ['izinsiz', 'without permission'], ['ağır', 'heavy']],
    q: 'Başkasının eşyasını nasıl alırız?', qEn: "How may we take someone else's things?", right: ['Sadece izin alarak.', 'Only by asking permission.'], wrong: [['Gizlice.', 'Secretly.'], ['İstediğimiz zaman.', 'Whenever we want.']] },
];

const ENDINGS = [
  ['Aferin kuzum. Allah razı olsun.', 'Well done, my dear. May Allah be pleased with you.'],
  ['Maşallah, ne güzel anladın!', 'Mashallah, you understood it so well!'],
  ['Bunu hiç unutma, olur mu?', 'Never forget this, all right?'],
];

/** Next advice not heard yet; once all are heard, a different one each game hour. */
function nextAdvice(ctx) {
  if (!ctx.flag('met-nine')) return 'hello';
  const fresh = ADVICE.find((a) => !ctx.flag(`nasihat-${a.id}`));
  if (fresh) return fresh.id;
  const s = ctx.state ?? { day: 1, minutes: 0 };
  return ADVICE[(s.day * 24 + Math.floor(s.minutes / 60)) % ADVICE.length].id;
}

function adviceNodes() {
  const nodes = {
    hello: { say: 'Hoş geldin kuzum! Ben senin ninenim. Gel otur yanıma, sana her gün bir nasihat vereyim.', en: "Welcome, my dear! I'm your grandma. Come sit by me; I'll give you a piece of advice every day.",
      words: [['nine', 'grandma'], ['nasihat', 'advice (on how to live well)'], ['kuzum', 'my dear (lit. my lamb)']],
      options: [{ tr: 'Tamam nine, dinliyorum.', en: "All right grandma, I'm listening.", next: ADVICE[0].id, do: ['flag:met-nine'] }] },
  };
  ADVICE.forEach((a, i) => {
    const [endTr, endEn] = ENDINGS[i % ENDINGS.length];
    nodes[a.id] = { say: a.say, en: a.en, words: a.words, options: [{ tr: 'Anladım nine.', en: 'I understand, grandma.', next: `${a.id}.q` }] };
    const opts = [{ tr: a.right[0], en: a.right[1], next: `${a.id}.end` }, ...a.wrong.map(([tr, en]) => ({ tr, en, wrong: true }))];
    nodes[`${a.id}.q`] = { say: a.q, en: a.qEn, hint: a.say, options: [opts[1], opts[0], opts[2]].filter(Boolean) };
    nodes[`${a.id}.end`] = { say: endTr, en: endEn, options: [{ tr: 'Amin. Teşekkür ederim nine.', en: 'Amen. Thank you, grandma.', do: [`flag:nasihat-${a.id}`] }] };
  });
  return nodes;
}

export const NINE_ADVICE = ADVICE;

export default {
  id: 'nine',
  npcs: {
    nine: {
      name: 'Fatma Nine', short: 'Nine', role: 'nine · grandma',
      look: { shirt: 0x8C6E9E, skirt: 0x4E3B5C, pants: 0x4E3B5C, skin: 0xE9B98F, headscarf: 0xF3EFE8, glasses: true, scale: 0.9 },
      face: '<svg width="52" height="52" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#D8C4E8"/><path d="M12 50q0-30 20-32q20 2 20 32z" fill="#F3EFE8"/><circle cx="32" cy="37" r="14" fill="#E9B98F"/><path d="M17 33q4-13 15-13t15 13q-6-6-15-6t-15 6z" fill="#F3EFE8"/><circle cx="26" cy="37" r="4" fill="none" stroke="#1B2440" stroke-width="1.6"/><circle cx="38" cy="37" r="4" fill="none" stroke="#1B2440" stroke-width="1.6"/><circle cx="26" cy="37" r="1.3" fill="#1B2440"/><circle cx="38" cy="37" r="1.3" fill="#1B2440"/><path d="M27 45q5 3 10 0" stroke="#9B6570" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    },
  },
  voices: { nine: { id: 'tr_TR-fettah-medium', pitch: 0.95 } },
  // on the middle of the sedir all day; asleep on the first night
  castAll: { nine: ['house', 'sedirM', 'sitBench'] },
  cast: { 'd1-night': { nine: null } },
  dialogues: { nine: { start: nextAdvice, nodes: adviceNodes() } },
};
