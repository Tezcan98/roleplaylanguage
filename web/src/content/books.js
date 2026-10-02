/**
 * The open library's shelf: Turkish classics retold as short, simple summaries (A1–A2), a
 * page at a time, each page with its meaning. Borrow one from Aslan Bey's shelf, sit on a
 * bench and read (systems/Library.js).
 */
export const BOOKS = [
  {
    id: 'kasagi', title: 'Kaşağı', author: 'Ömer Seyfettin', en: 'The Curry Comb', color: 0x8E2B1E,
    words: [['kaşağı', 'curry comb (for horses)'], ['yalan', 'lie'], ['pişman olmak', 'to regret']],
    pages: [
      { tr: 'Bir çocuk ve küçük kardeşi Vehbi bir çiftlikte yaşıyor. Babaları İstanbul’dan atlar için yeni bir kaşağı getiriyor. Kaşağı çok güzel ve parlak.', en: 'A boy and his little brother Vehbi live on a farm. Their father brings a new curry comb for the horses from Istanbul. It is very beautiful and shiny.' },
      { tr: 'Çocuk gizlice kaşağıyı alıyor ve atı tımarlamak istiyor. Ama kaşağı taşa çarpıyor ve kırılıyor. Çocuk çok korkuyor.', en: 'The boy secretly takes the comb and wants to groom the horse. But the comb hits a stone and breaks. The boy is very scared.' },
      { tr: 'Ninesine yalan söylüyor: “Kaşağıyı Vehbi kırdı.” Babası Vehbi’ye kızıyor ve onu cezalandırıyor. Vehbi ağlıyor: “Ben kırmadım!”', en: 'He lies to his grandmother: “Vehbi broke the comb.” Their father gets angry with Vehbi and punishes him. Vehbi cries: “I didn’t break it!”' },
      { tr: 'Bir süre sonra Vehbi hastalanıyor ve ölüyor. Çocuk büyüyor ama bu yalanı hiç unutmuyor. Kardeşinin mezarında ağlıyor: “Kaşağıyı ben kırdım!”', en: 'Some time later Vehbi falls ill and dies. The boy grows up but never forgets this lie. He cries at his brother’s grave: “I broke the comb!”' },
      { tr: 'Bu hikâye bize şunu öğretir: Yalan küçük görünür ama insanın kalbinde hep kalır. Doğruyu söylemek cesarettir.', en: 'This story teaches us: a lie looks small, but it stays in your heart forever. Telling the truth takes courage.' },
    ],
  },
  {
    id: 'kaftan', title: 'Pembe İncili Kaftan', author: 'Ömer Seyfettin', en: 'The Pink Pearl Kaftan', color: 0xD46A8C,
    words: [['elçi', 'envoy, ambassador'], ['kaftan', 'kaftan (a long robe)'], ['gururlu', 'proud']],
    pages: [
      { tr: 'Kanuni Sultan Süleyman zamanında Cevri Çelebi adında fakir ama gururlu bir adam vardı. Padişah onu elçi olarak Avrupa’da bir krala gönderdi.', en: 'In the time of Suleiman the Magnificent there was a poor but proud man called Cevri Çelebi. The sultan sent him as an envoy to a king in Europe.' },
      { tr: 'Cevri Çelebi’nin güzel bir kaftanı yoktu. Ona pembe incilerle süslü, çok değerli bir kaftan verdiler.', en: 'Cevri Çelebi had no fine kaftan. They gave him a very precious kaftan decorated with pink pearls.' },
      { tr: 'Kral, Türk elçisini küçük düşürmek istedi. Sarayda elçiye sandalye vermedi. Herkes oturuyordu, elçi ayakta kalacaktı.', en: 'The king wanted to humiliate the Turkish envoy. In the palace he gave him no chair. Everyone was sitting; the envoy was to stay standing.' },
      { tr: 'Cevri Çelebi hiç düşünmedi. İncili kaftanını çıkardı, yere serdi ve üstüne oturdu. Herkes şaşırdı.', en: 'Cevri Çelebi did not hesitate. He took off his pearl kaftan, spread it on the floor and sat on it. Everyone was astonished.' },
      { tr: 'Görüşme bitince kaftanı yerde bıraktı. “Kaftanınızı unuttunuz!” dediler. Cevri Çelebi şöyle cevap verdi: “Osmanlı elçileri oturdukları yeri yanlarında götürmez!”', en: 'When the meeting was over he left the kaftan on the floor. “You forgot your kaftan!” they said. Cevri Çelebi answered: “Ottoman envoys do not take away what they sat on!”' },
    ],
  },
  {
    id: 'dumrul', title: 'Deli Dumrul', author: 'Dede Korkut Hikâyeleri', en: 'Dumrul the Mad (Book of Dede Korkut)', color: 0x2F6FDB,
    words: [['köprü', 'bridge'], ['can', 'life, soul'], ['dua etmek', 'to pray']],
    pages: [
      { tr: 'Eskiden Deli Dumrul adında güçlü ve kibirli bir adam vardı. Kuru bir derenin üstüne köprü yaptırdı. Geçenden otuz üç akçe, geçmeyenden kırk akçe alırdı.', en: 'Long ago there was a strong and arrogant man called Dumrul the Mad. He built a bridge over a dry stream. He took thirty-three coins from those who crossed, and forty from those who did not.' },
      { tr: 'Bir gün genç bir yiğit öldü. Dumrul sordu: “Onun canını kim aldı?” “Azrail aldı” dediler. Dumrul, “Azrail’le savaşacağım!” dedi.', en: 'One day a brave young man died. Dumrul asked: “Who took his life?” “Azrael took it,” they said. Dumrul said: “I will fight Azrael!”' },
      { tr: 'Azrail geldi. Dumrul’un gücü yetmedi, hastalandı. Allah’a yalvardı. Allah dedi ki: “Senin yerine bir can bulursan, seni bırakırım.”', en: 'Azrael came. Dumrul’s strength was not enough; he fell ill. He begged God. God said: “If you find a life to give in your place, I will let you go.”' },
      { tr: 'Dumrul önce babasına, sonra annesine gitti. İkisi de canını vermedi. Sonra karısına gitti. Karısı: “Canım sana feda olsun” dedi.', en: 'Dumrul went first to his father, then to his mother. Neither would give their life. Then he went to his wife. His wife said: “Let my life be given for you.”' },
      { tr: 'Dumrul çok duygulandı ve dua etti: “Allah’ım, ya ikimizin canını al, ya ikimizi bağışla.” Allah duayı kabul etti ve ikisine de uzun bir ömür verdi.', en: 'Dumrul was deeply moved and prayed: “My God, take both our lives or spare us both.” God accepted the prayer and gave them both a long life.' },
    ],
  },
  {
    id: 'keloglan', title: 'Keloğlan ile Dev', author: 'Türk halk masalı', en: 'Keloğlan and the Giant (Turkish folk tale)', color: 0x3E8E4A,
    words: [['dev', 'giant'], ['orman', 'forest'], ['akıl', 'cleverness, mind']],
    pages: [
      { tr: 'Keloğlan annesiyle küçük bir evde yaşardı. Çok fakirdi. Bir gün odun toplamak için ormana gitti.', en: 'Keloğlan lived with his mother in a small house. He was very poor. One day he went to the forest to gather wood.' },
      { tr: 'Ormanda kocaman bir dev çıktı. “Seni yiyeceğim!” dedi. Keloğlan korktu ama hemen bir plan yaptı.', en: 'A huge giant appeared in the forest. “I will eat you!” he said. Keloğlan was afraid, but he quickly made a plan.' },
      { tr: 'Cebinden bir parça peynir çıkardı. “Bak, ben taşı sıkınca suyu çıkar!” dedi ve peyniri sıktı. Dev peyniri taş sandı.', en: 'He took a piece of cheese out of his pocket. “Look, when I squeeze a stone, water comes out!” he said, and squeezed the cheese. The giant thought the cheese was a stone.' },
      { tr: 'Dev çok korktu: “Bu çocuk benden de güçlü!” dedi. Keloğlan’a bir kese altın verdi ve ormandan kaçtı.', en: 'The giant was very afraid: “This boy is even stronger than me!” he said. He gave Keloğlan a bag of gold and ran away from the forest.' },
      { tr: 'Keloğlan altınlarla eve döndü ve annesiyle mutlu yaşadı. Akıl, güçten büyüktür.', en: 'Keloğlan went home with the gold and lived happily with his mother. Cleverness is greater than strength.' },
    ],
  },
  {
    id: 'kazan', title: 'Kazan Doğurdu', author: 'Nasreddin Hoca fıkrası', en: 'The Cauldron Gave Birth (a Nasreddin Hodja story)', color: 0xE0B04A,
    words: [['kazan', 'cauldron, big pot'], ['ödünç almak', 'to borrow'], ['komşu', 'neighbour']],
    pages: [
      { tr: 'Nasreddin Hoca bir gün komşusundan büyük bir kazan ödünç aldı.', en: 'One day Nasreddin Hodja borrowed a big cauldron from his neighbour.' },
      { tr: 'Birkaç gün sonra kazanı geri getirdi. İçinde küçük bir tencere vardı. “Kazanın doğurdu” dedi. Komşu çok sevindi ve tencereyi aldı.', en: 'A few days later he brought the cauldron back. There was a small pot inside it. “Your cauldron gave birth,” he said. The neighbour was very pleased and took the pot.' },
      { tr: 'Bir süre sonra Hoca kazanı yine ödünç aldı. Ama bu sefer geri getirmedi.', en: 'Some time later the Hodja borrowed the cauldron again. But this time he did not bring it back.' },
      { tr: 'Komşu kapıya geldi: “Kazanım nerede?” Hoca üzgün bir yüzle: “Kazanın öldü” dedi.', en: 'The neighbour came to the door: “Where is my cauldron?” With a sad face the Hodja said: “Your cauldron died.”' },
      { tr: 'Komşu kızdı: “Kazan ölür mü hiç?” Hoca cevap verdi: “Doğurduğuna inandın da öldüğüne neden inanmıyorsun?”', en: 'The neighbour got angry: “Can a cauldron die?” The Hodja answered: “You believed it gave birth, so why don’t you believe it died?”' },
    ],
  },
];
