# Siber Akademi

Ortaokul öğrencileri için siber güvenlik görevleri, özgün SVG rozetler ve avatarlar, XP ödülleri ve ortak keşif sıralaması.

## Çalıştırma

Node.js 24 kullanılır. `npm install` ve `npm start` komutlarıyla açılır. Yerelde kayıtlar SQLite'a yazılır. `npm test` oyun ve sunucu doğrulamalarını çalıştırır.

## Render

Web Service / Node / Free, build: `npm install --omit=dev`, start: `npm start`, health check: `/health`.

`DATABASE_URL` değişkenine aynı bölgedeki PostgreSQL veritabanının iç bağlantı adresi eklenmelidir. Render'da geçici diske kayıt yapılmaz. Şema ilk başlangıçta otomatik oluşturulur. Ücretsiz Render PostgreSQL veritabanının 30 günlük süresi vardır; süre dolmadan veriler taşınmalı veya plan yükseltilmelidir.

## Oyuncu kimliği

İlk ziyarette güvenli, HttpOnly bir cihaz çerezi oluşturulur. Öğrenci kullanıcı adını ve avatarını seçer; e-posta, gerçek ad veya ChatGPT hesabı gerekmez. Bu sürümde kimlik kullanılan tarayıcıya bağlıdır. Çerezlerin silinmesi ya da farklı cihaz kullanılması yeni bir keşif kimliği açar. Kullanıcı adı tek başına giriş anahtarı değildir; başka birinin adıyla hesabına erişilemez.

XP ve görev sonuçları sunucuda hesaplanır. Aynı ödül tekrar puan kazandırmaz. Ortak sıralama sadece kullanıcı adı, avatar, puan ve tamamlanan görev sayısını gösterir. Mevcut görev içeriği ve prototipin görsel tasarımı korunur.
