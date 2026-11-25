export const paths=[
 {id:'explorer',name:'İz Sürücü',icon:'map',description:'Açılan adada ipuçları kendiliğinden açılsın.'},
 {id:'achiever',name:'Ustalık Avcısı',icon:'badge',description:'Becerilerini incele, eksik kararlarını güçlendir.'},
 {id:'social',name:'Takım Yoldaşı',icon:'kindness',description:'Birlikte düşün, arkadaşına destek ol.'},
 {id:'challenger',name:'Kendime Rakibim',icon:'league',description:'Kendi ilerlemeni izle, istersen lige göz at.'}
];
export const chapters=[
 {at:0,title:'Sönen fenerlerin sırrı',text:'Sis Bulutu, Keşif Adaları’nın güvenli yollarını gizledi. Piksel’le altı ışık parçasını bul; her parça öğrendiğin bir dijital beceriyle parlıyor.'},
 {at:2,title:'İlk ışıklar geri döndü',text:'İki ada yeniden parlıyor! Sis her zaman açıkça görünmüyor. Şimdi birden fazla ipucunu birlikte düşünmeyi dene.'},
 {at:4,title:'Kalkanın şekilleniyor',text:'Dört ışık birleşti. Arkadaşına bir ipucunu anlatmak da öğrenmenin parçası. Son adalarda bildiklerini yeni durumlarda uygula.'},
 {at:6,title:'Sis Bulutu ile son karşılaşma',text:'Altı ışık tamamlandı! Finalde karışık durumları çözerek adaların Ortak Kalkanı’nı çalıştır. Takılırsan ipucuna bakıp yeniden deneyebilirsin.'}
];
export const items=[
 {id:'compass',name:'Merak Pusulası',emoji:'🧭',cost:15,unlock:0,description:'Yeni yollar arayan kaşifin simgesi.',color:'#e1b867'},
 {id:'lantern',name:'İpucu Feneri',emoji:'🏮',cost:20,unlock:1,description:'Mesajlardaki küçük ayrıntıları hatırlatır.',color:'#edaa73'},
 {id:'key',name:'Ay Anahtarı',emoji:'🗝️',cost:25,unlock:2,description:'Hesabının anahtarı yalnızca sende.',color:'#a59add'},
 {id:'seed',name:'Gizlilik Tohumu',emoji:'🌱',cost:25,unlock:2,description:'Paylaştıkça değil, özen gösterdikçe büyür.',color:'#7cb99c'},
 {id:'boat',name:'Bulut Yelkenlisi',emoji:'⛵',cost:35,unlock:3,description:'Dijital denizlerde kendi rotanı çiz.',color:'#7eb4ca'},
 {id:'telescope',name:'Yıldız Dürbünü',emoji:'🔭',cost:40,unlock:4,description:'İlk gördüğünle yetinme; kaynağı araştır.',color:'#8faad4'},
 {id:'crown',name:'Dostluk Tacı',emoji:'👑',cost:45,unlock:5,description:'Birlikte öğrenen ekibin renkli hatırası.',color:'#e1b867'},
 {id:'shield',name:'Işık Kalkanı',emoji:'🛡️',cost:50,unlock:6,description:'Altı becerinin birleştiği özel koleksiyon parçası.',color:'#71bca2'}
];
export const objectives={
 message:'Acele ettiren mesajın ipuçlarını bul; göndereni bağımsız bir kanaldan doğrula.',
 account:'Parola ve doğrulama kodunu koru; ortak cihazdan güvenle çık.',
 privacy:'Görseldeki kişisel bilgiyi fark et; izin ve görünürlük ayarını amacına göre seç.',
 kindness:'Kırıcı davranışa destek vermeden karşılık ver; gerektiğinde güvenilir yetişkine başvur.',
 truth:'Bir bilginin kaynağını, tarihini ve başka güvenilir kaynakları kontrol et.',
 gaming:'Oyun içi ödül, alışveriş ve arkadaşlık tekliflerinde güvenli karar ver.'
};
const q=(title,from,text,ask,options,correct,why,hint)=>({title,kind:'notice',from,text,ask,options,correct,why,hint});
export const finalQuestions=[
 q('Arkadaşının hesabı mı, bir tuzak mı?','Ekip sohbeti','Tanıdığın bir arkadaşının hesabı sana “Yarışa girmek için parolanı ve telefona gelen kodu bu adrese yaz; 2 dakikan var!” diyor.','Hem arkadaşını hem hesabını koruyan yol hangisi?', ['Arkadaşımı tanıdığım için kodu yazarım','Bağlantıyı açmadan arkadaşımı başka kanaldan doğrular; parola ve kodumu paylaşmam','Önce kodu yazar, sonra arkadaşımı ararım'],1,'Tanıdık bir hesabın adı güvence değildir. Süre baskısını fark et; bağımsız kanaldan doğrula ve hesap bilgilerini paylaşma.','Burada hem mesajın güvenilirliği hem de hesabının anahtarları söz konusu.'),
 q('Takım fotoğrafındaki ayrıntı','Oyun takımı','Yeni çevrimiçi takımın bir fotoğraf istiyor. Arkadaşın da fotoğrafta; arka planda okul kartınız ve ev adresi etiketi görünüyor.','Güvenli ve saygılı karar hangisi?',['Etiketi kapatıp arkadaşıma sormadan paylaşırım','Takım istediği için olduğu gibi paylaşırım','Arkadaşımdan izin ister; kişisel bilgilerin görünmediği bir görsel seçerim'],2,'Hem fotoğraftaki kişinin izni hem de arka plandaki bilgiler önemlidir. Takıma katılmak bunları paylaşmayı gerektirmez.','Kimin izni gerekiyor? Görselde hangi bilgiler okunuyor?'),
 q('Çok paylaşılan ücretsiz ödül','Popüler gönderi','“Bu eklentiyi kur, ücretsiz oyun parası kazan!” gönderisi çok beğenilmiş. Kaynak belirsiz; eklenti bütün sitelerde verilerine erişmek istiyor.','İlk kararın ne olur?',['Beğeni sayısına güvenmeden kaynağı ve izinleri inceler, kurmadan önce güvenilir yetişkinden destek alırım','Arkadaşlarım da beğendiği için kurarım','Önce kurar, işe yaramazsa silerim'],0,'Popülerlik güvenilirlik kanıtı değildir. Kurulumdan önce kaynağı ve istenen erişimi sorgula.','Beğeni sayısı ile güvenilirlik aynı şey mi? İzin neden gerekli?'),
 q('Kırıcı paylaşım yayılıyor','Sınıf grubu','Bir arkadaşın hakkında eski bir fotoğrafla alay ediliyor. Fotoğrafın doğru olduğunu bilmiyorsun. Başkaları da paylaşmanı istiyor.','Hangi yol arkadaşını korur?',['Doğru mu diye başka gruplara yollarım','Paylaşmam; arkadaşımı destekler, gerekli kanıdı özel tutup öğretmenimden yardım isterim','Herkes paylaştığı için ben de paylaşırım'],1,'Şüpheli veya kırıcı içeriği yaymak zararı büyütebilir. Destek ver ve güvendiğin yetişkinden yardım al; kanıtı herkese dağıtma.','Hem bilginin doğruluğunu hem arkadaşının güvenliğini düşün.'),
 q('Ortak bilgisayarda alışveriş','Okul bilgisayarı','Oyunun mağazasında indirim görüyorsun. Ortak bilgisayarda açık kalmış hesabın kayıtlı ödeme bilgileri var.','En güvenli yol hangisi?',['İndirim bitmeden kayıtlı kartla satın alırım','Ödeme sayfasını küçültüp teneffüse çıkarım','Satın almadan velime danışır, ortak cihazda hesabımdan çıkış yaparım'],2,'Satın alma kararı için veli desteği al. Ortak cihazdaki açık hesabı kapat; indirim baskısıyla ödeme yapma.','Para harcama kararı ile oturum güvenliğini birlikte düşün.'),
 q('Destek ekibi senden ne istiyor?','Oyundaki özel mesaj','Bir oyuncu “Ben görevliyim, hesabını kurtarayım; ekranını paylaş, kodu da bana oku” diyor. Uygulamada ise resmî destek bölümü var.','Hesabın için ne yaparsın?',['Ekranımı ve kodumu paylaşmam; uygulamanın resmî destek kanalını güvenilir yetişkinle kullanırım','Görevli olduğunu söylediği için kodu okurum','Sadece ekranımı paylaşırım; kodu kendim girerim'],0,'Unvan söylemek kimliği kanıtlamaz. Kod ve ekran bilgileri hesabını açığa çıkarabilir. Resmî kanaldan yardım al.','Kimin gerçekten görevli olduğunu hangi kanaldan doğrulayabilirsin?')
];
