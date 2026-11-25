# Oyunlaştırma tasarım notları

Kaynak: Selay Arkün Kocadere, **BTÖ 422 Eğitsel Bilgisayar Oyunları Tasarımı – Eğitsel Oyunlaştırma**, kullanıcının sağladığı 32 sayfalık ders sunumu. Kaynak PDF ve ekran görüntüleri bu depoya kopyalanmamıştır. Örneklerdeki her aracın birebir kullanılması yerine, aynı işlevler 5–6. sınıf Bilişim Teknolojileri ve Yazılım dersinin güvenli internet ve dijital vatandaşlık konusuna uyarlanmıştır.

| PDF'deki ilke / bileşen | Projedeki karşılığı |
| --- | --- |
| Ana hedef ve küçük alt hedefler (s.32) | Her adada açık öğrenme hedefi; Becerilerim ekranında altı beceri ve eksik kararlar. |
| Hikâye, adalar, kazanımlar (s.15–21, 28) | Sis Bulutu anlatısı; 0, 2, 4 ve 6 adada ustalıkla açılan dört hikâye bölümü; altı ışık parçası ve Ortak Kalkan. |
| Oyuncu türleri ve farklı yollar (s.29–32) | İz Sürücü, Ustalık Avcısı, Takım Yoldaşı ve Kendime Rakibim tercihleri. Tercih bir kişilik testi değildir; değiştirilebilir; ipucunun açık gelmesini ve tercih edilen destek ekranına erişimi etkiler. Ada sırası bütün tercihlerde aynıdır. |
| Ulaşılabilir, giderek ilerleyen görevler (s.27,32) | İpucu Avı → Karar Ver → Uygula aşamaları; ardından becerileri birleştiren altı yeni final durumu. |
| Başlangıç desteği ve gelişme fırsatı (s.27,32) | Puanı etkilemeyen isteğe bağlı ısınma turu, her soruda ipucu, açıklamalı dönüt ve tekrar keşif. Isınma, puanlı turdaki kayıtlı noktayı silmez. |
| İçerik açma (s.27–28) | Yeni hikâye bölümleri ve koleksiyon eşyaları ustalıkla açılır; final altı adanın güncel ustalığını gerektirir. Her ada, önceki bütün adalar tamamlandıktan sonra açılır. Kilit, ısınma turları ve kaydedilmiş eski oturumlar için de sunucuda denetlenir. |
| Puan, seviye, statü ve lider tablosu (s.19–21,26–30) | Sunucuda hesaplanan XP, seviyeler, ortak kaşifler ligi; kişisel beceri ilerlemesi ayrıca gösterilir. |
| Koleksiyon ve alışveriş (s.21,27–28) | Sekiz kozmetik eşya. Her yeni doğru karar 5, her yeni ada rozeti 20 ışık taşı sağlar. Satın alma XP harcatmaz; eşyalar cevap doğruluğunu veya zorluğu etkilemez. Rastgele ödül ve gerçek para yoktur. |
| Takım, işbirliği ve hediye (s.28,30) | İsteğe bağlı, kodla katılınan en fazla sekiz kişilik takımlar; en az iki üyeyle toplam 15 öğrenilmiş karar hedefi; tek seferlik 20 taş ödülü; sahip olunan eşyayı takım arkadaşına devretme. |
| Hediye edilen mentor rozeti (s.28) | Takım arkadaşının teşekkürüyle alınan Yol Gösterici unvanı. Teşekkür, öğretmen tarafından doğrulanmış akademik başarı olarak sunulmaz; XP vermez ve aynı kişiye günde bir kez gönderilir. |
| Bölüm sonu canavarı / final (s.21) | Sis Bulutu finali: 6 yeni bütünleştirici soru, en az 5 doğru, Kalkan Muhafızı unvanı ve hesap başına bir kez +90 XP. Yanlış final cevapları puan düşürmez. |
| Görünür ilerleme ve dönüt (s.26–27,32) | Işık parçaları, beceri çubukları, anlık açıklama, konfeti, kazanım ve eksik karar listeleri. |

## Önceki gereksinimlerle uyum

Kullanıcının önceki isteği olan puanlı turda yanlış cevap için −10 XP korunmuştur. Sunumdaki destekleyici başlangıç ilkesi için isteğe bağlı puansız ısınma sunulur; puan sıfırın altına düşmez ve aynı soru için günde bir kez kesilir. Kullanıcı adı, avatar, geçmiş XP, rozet ve soru ödülleri korunur. Final ve koleksiyon harcamaları sunucuda doğrulanır; istemcinin gönderdiği puan veya bakiye dikkate alınmaz.

Takımda gerçek ad veya iletişim bilgisi istenmez. Açık sohbet ve dış mesajlaşma yerine yapılandırılmış teşekkür, ortak hedef ve hediye akışları kullanılır. Öğrenci oturum anahtarları ekip yanıtlarında paylaşılmaz. Hediye aktarımı işlem bütünlüğüyle yapılır; aynı işlem tekrar gönderildiğinde çift aktarım oluşmaz.

## Ekran düzeni

Profil, eski karşılama sayfasını yeniden kullanmaz. Masaüstünde ekran yüksekliğine göre başlık, profil formu ve sıfırlama alanı ayrı satırlara yerleşir. Maceram penceresi Hikâyem, Koleksiyon, Takımım, Becerilerim ve Final sekmelerinden oluşur. Koleksiyon ve takım üyeleri sayfalanır. Küçük ekranlarda veya büyütülmüş yazılarda içeriği kesmek yerine kaydırma kullanılabilir.
