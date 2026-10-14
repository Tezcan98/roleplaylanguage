/**
 * Other ways the villagers open a conversation, so they don't say the same thing every time you
 * talk to them: added to their usual first line (`DIALOGUES[who].nodes[id].variants`), one picked
 * at random — never the one said last time (dialogue/DialogueController.js). Only where the answers
 * that follow fit every line. Written for a boy: "oğlum" / "Abi" become "kızım" / "Abla" for a girl.
 */
export const VARIANTS = {
  anne: { busy: [
    { say: 'Çamaşırları yıkadım, şimdi yemek yapıyorum. Akşama mercimek çorbası var!', en: "I've done the washing, now I'm cooking. There's lentil soup for dinner!" },
    { say: 'Bugün hava çok güzel oğlum. Biraz dışarıda oyna ama akşama geç kalma.', en: "The weather is lovely today, son. Play outside a little, but don't be late for dinner." },
    { say: 'Evi süpürdüm, şimdi biraz dinleneceğim. Sen de ellerini yıka oğlum.', en: "I've swept the house, now I'll rest a little. You go and wash your hands, son." },
  ] },
  baba: { idle: [
    { say: 'Bu araba eski ama sağlam. Dedemden kaldı!', en: "This car is old but sturdy. It was my grandfather's!" },
    { say: 'Motoru yağladım, şimdi tekerleklere bakıyorum.', en: "I've oiled the engine, now I'm checking the wheels." },
    { say: 'Akşam hep beraber çay içeriz, tamam mı?', en: "In the evening we'll all have tea together, okay?" },
  ] },
  elif: { eIdle: [
    { say: 'Bugün ip atlayalım mı?', en: 'Shall we skip rope today?' },
    { say: 'Teneffüste saklambaç oynayalım mı?', en: 'Shall we play hide-and-seek at break time?' },
    { say: 'Yarın meydanda buluşalım mı?', en: 'Shall we meet at the square tomorrow?' },
  ] },
  ogretmen: { tIdle: [
    { say: 'Akşam kitabından bir sayfa oku, olur mu?', en: 'Read a page of your book this evening, okay?' },
    { say: 'Bugünkü kelimeleri tekrar et, unutma!', en: "Go over today's words, don't forget!" },
    { say: 'Yarın derse zamanında gel, tamam mı?', en: 'Come to class on time tomorrow, okay?' },
  ] },
  manav: { idle: [
    { say: 'Bugün domatesler çok güzel, bahçeden yeni geldi!', en: 'The tomatoes are lovely today, fresh from the garden!' },
    { say: 'Gel bak, portakallar tatlı mı tatlı!', en: 'Come and see, the oranges are oh so sweet!' },
    { say: 'Elmalar kırmızı, armutlar sarı. Hangisini istersin?', en: 'The apples are red, the pears are yellow. Which do you want?' },
  ] },
  bakkal: { shop: [
    { say: 'Buyur evlat! Taze ekmek yeni geldi, sıcacık.', en: 'Go ahead, kid! Fresh bread just arrived, nice and warm.' },
    { say: 'Hoş geldin! Bugün süt de var, peynir de var.', en: "Welcome! Today there's milk and there's cheese too." },
    { say: 'Gel bakalım! Simitler bitmeden bir tane al.', en: 'Come on in! Get a simit before they run out.' },
  ] },
  kardes: { hello: [
    { say: 'Abi! Benimle top oynar mısın? Lütfen!', en: 'Big brother! Will you play ball with me? Please!' },
    { say: 'Abi, sıkıldım! Hadi bir oyun oynayalım!', en: "Big brother, I'm bored! Come on, let's play a game!" },
    { say: 'Abi! Bugün de oynayalım mı? Ben hazırım!', en: "Big brother! Shall we play today too? I'm ready!" },
  ] },
  huseyin: { h1: [
    { say: 'Selamünaleyküm evlat! Gel, şöyle otur. Çayın tadı sohbetle çıkar.', en: 'Peace be upon you, child! Come, sit here. Tea tastes best with a chat.' },
    { say: 'Selamünaleyküm! Okul nasıl gidiyor evlat? Bir çay iç, anlat bakalım.', en: "Peace be upon you! How's school going, child? Have a tea and tell us." },
    { say: 'Selamünaleyküm evlat! Bugün hava güzel, çay bahçesi de dolu.', en: 'Peace be upon you, child! The weather is nice today and the tea garden is full.' },
  ] },
  cayci: { c1: [
    { say: 'Buyur! Çaylar taze, tavşan kanı. Bir çay ister misin?', en: 'Here you are! The tea is fresh and deep red. Would you like a tea?' },
    { say: 'Hoş geldin! İnce belli bardakta bir çay ister misin?', en: 'Welcome! Would you like a tea in a tulip glass?' },
    { say: 'Çay demlendi, mis gibi kokuyor! Bir çay ister misin?', en: 'The tea has brewed, it smells wonderful! Would you like a tea?' },
  ] },
  kahveci: { c1: [
    { say: 'Buyur evlat! Gazoz soğuk, çay sıcak. Hangisini istersin?', en: 'Go ahead, kid! The lemonade is cold, the tea is hot. Which one would you like?' },
    { say: 'Hoş geldin! Amcalar tavla oynuyor. Sana ne getireyim, çay mı gazoz mu?', en: 'Welcome! The uncles are playing backgammon. What shall I bring you, tea or lemonade?' },
    { say: 'Gel evlat, otur! Ne içersin, çay mı gazoz mu?', en: 'Come, kid, sit down! What will you drink, tea or lemonade?' },
  ] },
  seyis: { s1: [
    { say: 'Selam evlat! Atlar bugün çok neşeli. Ata binmek ister misin?', en: 'Hello, kid! The horses are very cheerful today. Would you like to ride a horse?' },
    { say: 'Hoş geldin! Bu atları her sabah ben fırçalarım. Ata binmek ister misin?', en: 'Welcome! I brush these horses every morning. Would you like to ride a horse?' },
    { say: 'Gel evlat! Bugün tam binicilik havası. Ata binmek ister misin?', en: 'Come here, kid! Today is perfect weather for riding. Would you like to ride a horse?' },
  ] },
  ismail: { i1: [
    { say: 'Gel evlat! Dev satranç seni bekliyor. Beyaz mı olmak istersin, siyah mı? İstersen benimle de oynarsın.', en: 'Come here, kid! The giant chess board is waiting for you. Do you want to be white or black? If you like, you can play with me too.' },
    { say: 'Hoş geldin! Bugün kim kazanacak acaba? Beyaz mı olmak istersin, siyah mı? İstersen benimle de oynarsın.', en: 'Welcome! I wonder who will win today? Do you want to be white or black? If you like, you can play with me too.' },
  ] },
};

/** Put the variants on their nodes (content/index.js, before the texts are personalised). */
export function addVariants(dialogues) {
  for (const [who, nodes] of Object.entries(VARIANTS)) {
    for (const [id, list] of Object.entries(nodes)) {
      const node = dialogues[who]?.nodes?.[id];
      if (node) node.variants = list;
    }
  }
}
