# Enclave Auth e-posta şablonları

Supabase Authentication → Emails → Templates alanında kullanılacak şablonlar:

- Confirm signup subject: `Enclave hesabını doğrula`
- Reset password subject: `Enclave parolanı güvenle yenile`

Her iki HTML şablonu da Supabase'in `{{ .ConfirmationURL }}` değişkenini kullanır. E-posta değiştirme şablonu özelleştirilmez ve web sitesinde e-posta değiştirme özelliği bulunmaz.
