// Set a same-origin MP4 path or an HTTPS MP4 URL when the film is ready.
// For YouTube, set youtubeId to the 11-character video ID instead.
const trailer = { mp4: '/assets/kyoho-pv-japan-36s.mp4', portrait: '/assets/kyoho-pv-japan-36s-portrait.mp4', youtubeId: '', poster: '/assets/kyoho-pv-japan-cover.jpg', portraitPoster: '/assets/kyoho-pv-japan-cover-portrait.jpg' };
const container = document.getElementById('video-container');
if (trailer.mp4 || /^[\w-]{11}$/.test(trailer.youtubeId)) {
  if (trailer.mp4) {
    const video = document.createElement('video');
    video.controls = false; video.playsInline = true; video.preload = 'none';
    const portrait = trailer.portrait && window.matchMedia('(max-width: 700px)').matches;
    video.poster = portrait ? trailer.portraitPoster : trailer.poster;
    const videoUrl = portrait ? trailer.portrait : trailer.mp4;
    if (portrait) video.classList.add('portrait');
    video.setAttribute('aria-label', '巨歩 KYOHO 公式PV');
    const playButton = document.createElement('button');
    playButton.className = 'button film-play'; playButton.textContent = '▶ PVを再生';
    const status = document.createElement('p'); status.className = 'small';
    status.setAttribute('role', 'status');
    let blobUrl;
    playButton.addEventListener('click', async () => {
      playButton.disabled = true; status.textContent = '映像を読み込んでいます…';
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error('Video download failed');
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        video.src = blobUrl; video.controls = true;
        playButton.hidden = true; status.textContent = '';
        try { await video.play(); }
        catch { status.textContent = '動画の再生ボタンを押してください。'; }
      } catch {
        status.textContent = '映像を読み込めませんでした。もう一度お試しください。';
        playButton.disabled = false;
      }
    });
    window.addEventListener('pagehide', () => { video.pause(); });
    container.append(video, playButton, status);
  } else {
    const button = document.createElement('button'); button.className = 'button';
    button.textContent = '▶ PVを再生（YouTube）';
    button.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${trailer.youtubeId}?autoplay=1`;
      iframe.title = '巨歩 KYOHO 公式PV'; iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true; container.replaceChildren(iframe);
    }); container.append(button);
  }
  document.getElementById('film').hidden = false;
  document.getElementById('trailer-link').hidden = false;
}
