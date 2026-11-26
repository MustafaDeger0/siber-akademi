# Siber Akademi

5–6. sınıf Bilişim Teknolojileri ve Yazılım dersi için güvenli internet ve dijital vatandaşlık macerası. İlk prototip 5–7. sınıf düzeyine yönelikti; yenilenen dil ve görsel tasarım 5–6. sınıfa odaklanır.

6 ada, her adada 5 karar ve toplam 30 senaryo bulunur: Mesaj Feneri, Parola Kalesi, Gizlilik Bahçesi, Dostluk Köprüsü, Bilgi Gözlemevi ve Oyun Limanı. Her ada çizimle temsil edilir; bölge penceresi, duraklar, örnek ekran, açıklamalı geri bildirim, rozet ve seviye ödülleri bulunur. Telefonlarda alt gezinme menüsü kullanılır.

Sekiz farklı SVG yol arkadaşı ve her beceri için farklı şekilli koleksiyon madalyaları vardır. Eski avatar kimlikleri korunur. Doğru cevap ortada konfeti ve gerçek XP değişimiyle kutlanır; yanlış cevapta güvenli karar ve açıklaması gösterilir. Sonuç ekranı doğru cevapta 5,5 saniye, yanlışta 8,5 saniye sonra sonraki soruya geçer. Okuma için otomatik geçiş duraklatılabilir veya elle devam edilebilir. Ekran kapatılırsa zamanlayıcı iptal edilir.

Yanlış cevapta XP kesilmez. Yanlış cevap da turu ilerletir; tekrar gönderilen istek puanı veya adımı değiştirmez. Eksik kararlar tekrar keşfedilecek olarak kaydedilir. Yeni ada madalyası ve bitirme ödülü, adadaki bütün kararlar öğrenildiğinde verilir; geçmişte kazanılmış madalyalar geri alınmaz.

Önceki oyuncuların kullanıcı adı, XP, rozet ve kazanılmış soru ödülleri korunur. Önceden tamamlanan üç soruluk adalara ikişer yeni soru eklenir; eski ödüller tekrar verilmez. Yeni sürümde soruların tamamı `public/worlds.mjs` üzerinden sunucu ile paylaşılır.

## Çalıştırma

Node.js 24 kullanılır. `npm install` ve `npm start` komutlarıyla açılır. Yerelde kayıtlar SQLite'a yazılır. `npm test` oyun ve sunucu doğrulamalarını çalıştırır.

## Render

Web Service / Node / Free, build: `npm install --omit=dev`, start: `npm start`, health check: `/health`.

`DATABASE_URL` değişkenine aynı bölgedeki PostgreSQL veritabanının iç bağlantı adresi eklenmelidir. Render'da geçici diske kayıt yapılmaz. Şema ilk başlangıçta otomatik oluşturulur. Ücretsiz Render PostgreSQL veritabanının 30 günlük süresi vardır; süre dolmadan veriler taşınmalı veya plan yükseltilmelidir.

## Oyuncu kimliği

İlk ziyarette güvenli, HttpOnly bir cihaz çerezi oluşturulur. Öğrenci kullanıcı adını ve avatarını seçer; e-posta, gerçek ad veya ChatGPT hesabı gerekmez. Bu sürümde kimlik kullanılan tarayıcıya bağlıdır. Çerezlerin silinmesi ya da farklı cihaz kullanılması yeni bir keşif kimliği açar. Kullanıcı adı tek başına giriş anahtarı değildir; başka birinin adıyla hesabına erişilemez.

XP ve görev sonuçları sunucuda hesaplanır. Aynı ödül tekrar puan kazandırmaz. Ortak sıralama sadece kullanıcı adı, avatar, puan ve tamamlanan görev sayısını gösterir. Mevcut görev içeriği ve prototipin görsel tasarımı korunur.


## Devam etme ve sıfırlama

Her adanın oturumu ayrı saklanır. Devam et, kayıtlı sıradaki soruyu açar ve öğrenilmiş soruları atlar; önceki sürümlerde kazanılan soru kayıtları da dikkate alınır. Baştan tekrar keşfet tüm soruları yeniden açar; kazanılan XP yeniden verilmez. Tamamlanmış bir turdaki yanlışlar, sonraki keşifte öncelik kazanır.

Kaşif kartım → İlerlememi sıfırla, açık bir onaydan sonra yalnızca o tarayıcıya ait oyuncunun XP, rozet ve tüm ilerlemesini sıfırlar. Takma ad ve avatar korunur. Eski tur kimlikleri geçersiz olur.

## Yönetici paneli

/yonetim adresi takma ad arama ve değiştirme ekranıdır. Render servisinde SIBER_ADMIN_PASSWORD ortam değişkeni en az 16 karakterli güçlü bir şifre olarak ayarlanır; değeri kaynak koduna yazılmaz. Bu değişken Blueprint dışında servis üzerinde tutulur; Blueprint'te tanımlı olmayan mevcut değişkenler korunur. Şifre yoksa yönetim API'si kapalıdır. Yerelde de aynı değişken kullanılabilir.

Giriş oturumu HttpOnly, üretimde Secure ve SameSite=Strict çereziyle 8 saat sürer. Başarısız girişler sınırlıdır. Öğrenci oturum anahtarları yönetici listesinde paylaşılmaz; sunucuya özel referans kullanılır. Ad değişikliği puan, avatar ve ilerlemeye dokunmaz. Şifre değişimi veya yeniden dağıtım yönetici oturumlarını kapatır. Yönetici şifresini yalnızca yönetim girişinde kullanın.


## Yeni macera özellikleri

Maceram düğmesi hikâye, keşif yolu, koleksiyon, takım, beceri ilerlemesi ve final ekranlarını açar. Tasarımın kaynak PDF ile eşleştirmesi [GAMIFICATION.md](GAMIFICATION.md) dosyasındadır. Mevcut oyuncuların XP ve rozetleri korunur; geçmiş kazanımlar ışık taşı bakiyesinde dikkate alınır. Final ayrıca bir kez 90 XP kazandırır.

`npm test` sunucu, oyun, yetkilendirme, final ve hediye aktarımının testlerini çalıştırır. Playwright ve Chrome bulunan bir geliştirme ortamında `node tests/ui-smoke.mjs` arayüz akışlarını bellek içi veritabanıyla kontrol eder; canlı oyuncu verisine bağlanmaz. Gerekirse ilk argümanda Playwright modülünün dosya URL'si verilebilir. Görseller geçici klasöre yazılır; çıktı klasörü `UI_OUTPUT_DIR` ile seçilebilir.

Yönetici oyuncu listesinde öğrenilen karar, tekrar gereken karar ve son final puanı da görünür.


## Sıralı öğrenme ve etkinlikler

Adalar 1–6 sırasında açılır. Beş kararı öğrenip adanın turunu tamamlamak bir sonraki adayı açar. Açılmış bir ada tekrar oynanırken hata yapmak geçmiş açılmayı geri almaz. Eski XP ve rozetler korunur; eski üç soruluk tamamlamalar, yeni beş sorunun öğrenilmesi yerine geçmez.

İlk adada temel ipucu tanıma vardır. Sonraki adalar çoklu seçim, sıralama, eşleştirme ve doğru/yanlış etkinlikleriyle bilgileri birleştirmeyi gerektirir. Yeni etkinlik yanıtları istemcinin puanına güvenmeden sunucuda değerlendirilir. Yanlış cevap açıklamasında otomatik geçiş başlangıçta durur; öğrenci hazır olunca devam eder.

## Öğrenme atölyesi

Maceram → Becerilerim ekranı, son yanıtlara göre destek önerisi ve zamanlı hatırlama planını gösterir. Uygula sekmesinde hesap ayarları ve kanıt işaretleme simülasyonları vardır. Takımım ortak görevinde üyelerin ayrı parçaları çözmesi ve birleşen planı onaylaması gerekir. Bu etkinlikler XP kazandırmaz veya düşürmez. Yönetim panelindeki öğrenme gözlemi alanı, öğrenciye geri bildirim iletir. Ayrıntılar GAMIFICATION.md dosyasındadır.

## Karşılama ve ana sayfa

İlk ziyaret karşılama sayfasıyla başlar. Üç adımlık tanıtım hikâyeyi, oynama biçimini ve altı ana bölümü açıklar; ardından kaşif kartı oluşturulabilir. Kayıtlı kaşifler ana sayfada ilerlemelerini ve bütün bölüm bağlantılarını görür. Devam düğmesi ada özetini açar; sorular ayrıca başlatılır. Sayfayı yenilemek otomatik soru başlatmaz. Ana sayfaya sol menüden veya başlıktaki ev düğmesinden dönülür.

## Görsel etkinlikler

Ada sorularında görsel üzerinde alan seçme, karar kartlarını sınıflandırma ve üç kareli hikâyeler bulunur. Önceki bütün doğru yanıt indeksleri, soru ödül anahtarları ve ada ilerlemesi korunur. Uygula bölümüne her ada için bir görsel görev eklendi; toplam sekiz uygulama dört kartlık sayfalarda gösterilir. Görevler ilgili ada tamamlandıktan sonra açılır ve XP değiştirmez.

Görseller uygulamanın mevcut çizim diliyle SVG olarak hazırlanır; fotoğraf, telefon ve mağaza örnekleri gerçek kişisel bilgi veya ödeme kullanmaz. Alanlar hem görseldeki numaralardan hem metin listesinden seçilebilir. Görseldeki yazının metin karşılığı açılabilir; sınıflandırma kartları klavye oklarıyla kullanılabilir.

`UI_CHROME_PATH` değişkeni, tarayıcı testlerinde standart Chrome yerine bir Chromium yürütülebilir dosyası seçmek için kullanılabilir.
