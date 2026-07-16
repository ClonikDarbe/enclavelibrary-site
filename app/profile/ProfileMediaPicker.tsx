"use client";

import { useEffect, useRef, useState } from "react";

export default function ProfileMediaPicker({ avatar, banner, username }: { avatar: string; banner: string; username: string }) {
  const [avatarPreview, setAvatarPreview] = useState(avatar);
  const [bannerPreview, setBannerPreview] = useState(banner);
  const [cropSource, setCropSource] = useState<{ file: File; url: string } | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [cropError, setCropError] = useState("");
  const generatedUrls = useRef<string[]>([]);
  const avatarInput = useRef<HTMLInputElement>(null);
  const cropCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => () => generatedUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    if (!cropSource || !cropCanvas.current) return;
    const image = new Image();
    image.onload = () => drawSquareCrop(cropCanvas.current!, image, cropZoom, cropX, cropY);
    image.src = cropSource.url;
    return () => { image.onload = null; };
  }, [cropSource, cropZoom, cropX, cropY]);

  function previewBanner(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    generatedUrls.current.push(url);
    setBannerPreview(url);
  }

  function selectAvatar(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setCropError("JPG, PNG veya WEBP formatında bir görsel seç."); return; }
    if (file.size > 20 * 1024 * 1024) { setCropError("Seçtiğin görsel 20 MB sınırını aşıyor."); return; }
    const url = URL.createObjectURL(file);
    generatedUrls.current.push(url);
    setCropError(""); setCropZoom(1); setCropX(50); setCropY(50); setCropSource({ file, url });
  }

  function cancelCrop() {
    if (avatarInput.current) avatarInput.current.value = "";
    setCropSource(null); setCropError("");
  }

  function applyCrop() {
    const canvas = cropCanvas.current;
    if (!canvas || !cropSource || !avatarInput.current) return;
    canvas.toBlob((blob) => {
      if (!blob) { setCropError("Görsel hazırlanamadı. Başka bir dosya dene."); return; }
      const baseName = cropSource.file.name.replace(/\.[^.]+$/, "") || "avatar";
      const cropped = new File([blob], `${baseName}-enclave.webp`, { type: "image/webp", lastModified: Date.now() });
      const transfer = new DataTransfer(); transfer.items.add(cropped); avatarInput.current!.files = transfer.files;
      const url = URL.createObjectURL(blob); generatedUrls.current.push(url); setAvatarPreview(url); setCropSource(null); setCropError("");
    }, "image/webp", 0.9);
  }

  return <div className="profile-media-editor">
    <div className="profile-media-title"><div><span>GÖRSEL KİMLİK</span><b>Profilini kişiselleştir</b></div><small>Görseller yalnızca senin hesabına kaydedilir.</small></div>
    <label className="profile-banner-picker" style={bannerPreview ? { backgroundImage: `linear-gradient(180deg,rgba(4,5,11,.08),rgba(4,5,11,.72)),url(${bannerPreview})` } : undefined}>
      <input name="bannerFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => previewBanner(event.target.files?.[0])} />
      <span><i aria-hidden="true">＋</i><b>{bannerPreview ? "Kapak görselini değiştir" : "Kapak görseli ekle"}</b><small>JPG, PNG veya WEBP • En fazla 6 MB</small></span>
    </label>
    <label className="profile-avatar-picker">
      <input ref={avatarInput} name="avatarFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectAvatar(event.target.files?.[0])} />
      <span>{avatarPreview ? <img src={avatarPreview} alt={`${username} profil önizlemesi`} /> : initials(username)}</span>
      <div><b>Profil fotoğrafı</b><small>Kare görsel önerilir • En fazla 3 MB</small></div><em>Dosya seç</em>
    </label>
    {cropSource && <div className="avatar-crop-backdrop" role="presentation">
      <section className="avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
        <div className="avatar-crop-heading"><div><span>PROFİL FOTOĞRAFI</span><h3 id="avatar-crop-title">Kare kırpmayı ayarla</h3></div><button type="button" onClick={cancelCrop} aria-label="Kırpma penceresini kapat">×</button></div>
        <div className="avatar-crop-stage"><canvas ref={cropCanvas} width="512" height="512" aria-label="Kırpılmış profil fotoğrafı önizlemesi" /></div>
        <div className="avatar-crop-controls">
          <label><span>Yakınlaştır</span><input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} /></label>
          <label><span>Yatay konum</span><input type="range" min="0" max="100" value={cropX} onChange={(event) => setCropX(Number(event.target.value))} /></label>
          <label><span>Dikey konum</span><input type="range" min="0" max="100" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} /></label>
        </div>
        {cropError && <p className="avatar-crop-error">{cropError}</p>}
        <div className="avatar-crop-actions"><button type="button" onClick={cancelCrop}>Vazgeç</button><button type="button" onClick={applyCrop}>Kırpmayı kullan</button></div>
      </section>
    </div>}
    {!cropSource && cropError && <p className="avatar-crop-error inline">{cropError}</p>}
  </div>;
}

function drawSquareCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, zoom: number, positionX: number, positionY: number) {
  const context = canvas.getContext("2d"); if (!context) return;
  const cropSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
  const sourceX = Math.max(0, image.naturalWidth - cropSize) * (positionX / 100);
  const sourceY = Math.max(0, image.naturalHeight - cropSize) * (positionY / 100);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, canvas.width, canvas.height);
}

function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr") || "O"; }
