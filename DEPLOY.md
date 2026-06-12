# Fiyat Gurusu — Deploy Rehberi

## Mimari

| Parça | Servis | Ne işe yarar |
|-------|--------|--------------|
| Frontend | **Vercel** | Site, tek oyunculu, çok oyunculu arayüzü |
| MP sunucu | **Railway** | Socket.io odaları, canlı oyun |

---

## Adım 1 — GitHub (bir kez)

Repo zaten oluşturulduysa atla.

```bash
cd fiyat-gurusu
git init
git add .
git commit -m "Initial deploy"
gh repo create fiyat-gurusu --public --source=. --push
```

---

## Adım 2 — Railway (çok oyunculu sunucu)

1. [railway.app](https://railway.app) → GitHub ile giriş
2. **New Project** → **Deploy from GitHub repo** → `fiyat-gurusu` seç
3. Ayarlar (**Settings**):
   - **Root Directory:** boş bırak (repo kökü)
   - `railway.toml` otomatik `npm run start:mp` çalıştırır
4. **Networking** → **Generate Domain** → URL al (örn. `fiyat-gurusu-mp-production.up.railway.app`)
5. **Variables** ekle (Vercel URL'ini aldıktan sonra):
   ```
   MP_CORS_ORIGIN=https://SENIN-APP.vercel.app
   ```

Bu URL'yi kopyala → Adım 3'te kullanacaksın.

---

## Adım 3 — Vercel (site)

1. [vercel.com](https://vercel.com) → GitHub ile giriş
2. **Add New Project** → `fiyat-gurusu` import
3. **Root Directory:** `fiyat-gurusu` değilse repo kökü zaten doğru
4. **Environment Variables:**
   ```
   NEXT_PUBLIC_MP_URL=https://fiyat-gurusu-mp-production.up.railway.app
   ```
   (Railway'den aldığın gerçek URL)
5. **Deploy**

---

## Adım 4 — CORS'u tamamla

Vercel deploy bittikten sonra gerçek site URL'ini al (örn. `https://fiyat-gurusu.vercel.app`).

Railway → Variables → güncelle:
```
MP_CORS_ORIGIN=https://fiyat-gurusu.vercel.app
```

Railway otomatik yeniden deploy eder.

---

## Adım 5 — Test

1. Vercel linkini aç → takma ad gir
2. **Çok Oyunculu** → Oda oluştur
3. İkinci telefon/tarayıcıda davet linki ile katıl
4. Oyunu başlat

Bağlantı hatası alırsan:
- `NEXT_PUBLIC_MP_URL` doğru mu?
- Railway servisi çalışıyor mu? (Logs sekmesi)
- `MP_CORS_ORIGIN` Vercel URL ile eşleşiyor mu?

---

## Yerel geliştirme

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:mp
```

`.env.local` (isteğe bağlı):
```
NEXT_PUBLIC_MP_URL=http://127.0.0.1:3001
```
