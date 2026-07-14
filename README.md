# Enclave Order Web

Enclave Library Next için Cloudflare Workers üzerinde çalışan tanıtım sitesi, güvenli hesap girişi ve salt okunur oyun kütüphanesi.

## Yerel geliştirme

Gereksinim: Node.js 22 veya üzeri.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`.env.local` içine mevcut Supabase projesinin URL ve anon/publishable anahtarını gir. Bu dosya Git tarafından yok sayılır.

## Cloudflare Workers Builds

Cloudflare panelinde **Workers & Pages → Create → Import a repository** üzerinden GitHub deposunu bağla.

| Ayar | Değer |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy:built` |
| Preview deploy command | `npm run preview:upload` |

Cloudflare'da açılan Worker adının `wrangler.jsonc` içindeki `enclave-order` adıyla aynı olması gerekir.

### Çalışma zamanı değişkenleri

**Settings → Variables & Secrets** bölümüne aşağıdakileri ekle. Bunlar Build variables alanına değil, Worker'ın çalışma zamanı değişkenlerine eklenmelidir.

- `SUPABASE_URL`: Supabase proje URL'si
- `SUPABASE_PUBLISHABLE_KEY`: Supabase publishable anahtarı (`sb_publishable_...`). Eski projelerde `SUPABASE_ANON_KEY` de desteklenir.

Publishable/anon anahtarı düşük yetkilidir; erişim RLS ile sınırlandırılır. Yine de değeri kodda tutmak yerine Cloudflare değişkeni olarak tanımla. Hiçbir `.env` dosyasını, `sb_secret_...` anahtarını veya Supabase `service_role` anahtarını GitHub'a yükleme.

## Güvenlik kontrol listesi

- Supabase `enclave_sync_items` tablosunda RLS açık kalmalı.
- Web istemcisine service-role anahtarı verilmemeli.
- Cloudflare WAF Managed Rules ve Bot Fight Mode etkinleştirilmeli.
- `/api/auth/login` için Cloudflare rate limiting kuralı uygulanmalı.
- Üretim alan adı Supabase Auth site URL/redirect allowlist ayarlarına eklenmeli.
- Özel alan adı kullanılıyorsa her zaman HTTPS zorlanmalı.

## Elle doğrulama ve yayınlama

```powershell
npm run build
npm run deploy
```

Uygulama GitHub'a gönderildikten sonra `main` dalındaki her commit Cloudflare tarafından otomatik derlenip yayınlanır.
