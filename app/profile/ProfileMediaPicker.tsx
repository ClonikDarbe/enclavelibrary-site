"use client";

import { useEffect, useRef, useState } from "react";

export default function ProfileMediaPicker({ avatar, banner, username }: { avatar: string; banner: string; username: string }) {
  const [avatarPreview, setAvatarPreview] = useState(avatar);
  const [bannerPreview, setBannerPreview] = useState(banner);
  const generatedUrls = useRef<string[]>([]);

  useEffect(() => () => generatedUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function preview(file: File | undefined, setter: (value: string) => void) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    generatedUrls.current.push(url);
    setter(url);
  }

  return <div className="profile-media-editor">
    <div className="profile-media-title"><div><span>GÖRSEL KİMLİK</span><b>Profilini kişiselleştir</b></div><small>Görseller yalnızca senin hesabına kaydedilir.</small></div>
    <label className="profile-banner-picker" style={bannerPreview ? { backgroundImage: `linear-gradient(180deg,rgba(4,5,11,.08),rgba(4,5,11,.72)),url(${bannerPreview})` } : undefined}>
      <input name="bannerFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => preview(event.target.files?.[0], setBannerPreview)} />
      <span><i aria-hidden="true">＋</i><b>{bannerPreview ? "Kapak görselini değiştir" : "Kapak görseli ekle"}</b><small>JPG, PNG veya WEBP • En fazla 6 MB</small></span>
    </label>
    <label className="profile-avatar-picker">
      <input name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => preview(event.target.files?.[0], setAvatarPreview)} />
      <span>{avatarPreview ? <img src={avatarPreview} alt={`${username} profil önizlemesi`} /> : initials(username)}</span>
      <div><b>Profil fotoğrafı</b><small>Kare görsel önerilir • En fazla 3 MB</small></div><em>Dosya seç</em>
    </label>
  </div>;
}

function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr") || "O"; }
