const days = {
  0: { title: 'Jour 0 — Le voyage', image: 'assets/prev_mail1.png' },
  1: { title: 'Jour 1 — Le premier challenge', image: 'assets/prev_mail2.png' },
  21: { title: 'Jour 21 — Les habitudes', image: 'assets/prev_mail4.png' }
};
const stops = [...document.querySelectorAll('.stop')];
stops.forEach(button => button.addEventListener('click', () => {
  const content = days[button.dataset.day];
  stops.forEach(stop => { const selected = stop === button; stop.classList.toggle('active', selected); stop.setAttribute('aria-pressed', String(selected)); });
  document.getElementById('mail-image').src = content.image;
  document.getElementById('mail-image').alt = 'Email original : ' + content.title;
  document.getElementById('mail-caption').textContent = content.title;
  document.getElementById('mail-open').dataset.image = content.image;
  document.getElementById('mail-open').dataset.title = content.title;
}));
let returnFocus;
function openDialog(dialog) { returnFocus = document.activeElement; dialog.showModal(); document.body.style.overflow = 'hidden'; }
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  document.getElementById('dialog-image').src = button.dataset.image;
  document.getElementById('dialog-image').alt = button.dataset.title;
  document.getElementById('image-title').textContent = button.dataset.title;
  openDialog(document.getElementById('image-dialog'));
}));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; returnFocus?.focus(); });
});

document.getElementById('video-launch').addEventListener('click', () => {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://www.youtube-nocookie.com/embed/FHbX0dw4Or4?autoplay=1&rel=0';
  iframe.title = 'Présentation du programme Nostos';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  document.getElementById('video-launch').replaceWith(iframe);
  iframe.focus();
});
const floating = document.querySelector('.floating-cta');
let pastHero = false;
let atOffer = false;
function updateCta() { const visible = pastHero && !atOffer; floating.classList.toggle('visible', visible); floating.setAttribute('aria-hidden', String(!visible)); floating.tabIndex = visible ? 0 : -1; }
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => { pastHero = !entry.isIntersecting && entry.boundingClientRect.bottom < 0; updateCta(); }).observe(document.getElementById('depart'));
  new IntersectionObserver(([entry]) => { atOffer = entry.isIntersecting || entry.boundingClientRect.bottom < 0; updateCta(); }).observe(document.getElementById('offre'));
}

// A single normalized path follows the printed dots on the map.
const scrollScene = document.querySelector('.hero-scroll');
const hero = document.getElementById('depart');
const pawn = document.querySelector('.hero-pawn');
const route = document.getElementById('travel-path');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const routeLength = route.getTotalLength();
let framePending = false;
let lastProgress = -1;
function paintJourney() {
  framePending = false;
  const box = scrollScene.getBoundingClientRect();
  const distance = Math.max(1, scrollScene.offsetHeight - hero.offsetHeight);
  const progress = motionPreference.matches ? 0 : Math.min(1, Math.max(0, -box.top / distance));
  if (progress === lastProgress) return;
  lastProgress = progress;
  const point = route.getPointAtLength(progress * routeLength);
  pawn.style.left = `${point.x / 10}%`;
  pawn.style.top = `${point.y / 6}%`;
}
function queueJourney() { if (!framePending) { framePending = true; requestAnimationFrame(paintJourney); } }
function sizeJourney() {
  scrollScene.classList.toggle('motion-journey', !motionPreference.matches);
  scrollScene.style.setProperty('--hero-height', `${hero.offsetHeight}px`);
  scrollScene.style.setProperty('--pin-top', `${Math.min(0, innerHeight - hero.offsetHeight - 16)}px`);
  queueJourney();
}
addEventListener('scroll', queueJourney, { passive: true });
addEventListener('resize', sizeJourney);
motionPreference.addEventListener('change', sizeJourney);
new ResizeObserver(sizeJourney).observe(hero);
sizeJourney();

const reviews = [...document.querySelectorAll('.testimonial-card')];
let currentReview = 0;
function showReview(index) {
  currentReview = (index + reviews.length) % reviews.length;
  reviews.forEach((card, i) => {
    const order = (i - currentReview + reviews.length) % reviews.length;
    card.dataset.position = order;
    card.tabIndex = order === 0 ? 0 : -1;
    card.setAttribute('aria-hidden', String(order !== 0));
  });
  document.getElementById('review-count').textContent = `${currentReview + 1} / ${reviews.length}`;
}
document.getElementById('review-prev').addEventListener('click', () => showReview(currentReview - 1));
document.getElementById('review-next').addEventListener('click', () => showReview(currentReview + 1));
let touchStart = null;
const deck = document.querySelector('.testimonial-deck');
deck.addEventListener('touchstart', e => { touchStart = [e.touches[0].clientX, e.touches[0].clientY]; }, {passive:true});
deck.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart[0];
  const dy = e.changedTouches[0].clientY - touchStart[1];
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) showReview(currentReview + (dx < 0 ? 1 : -1));
  touchStart = null;
}, {passive:true});
showReview(0);

// Load the animated preview only as it approaches the viewport.
const previewVideo = document.getElementById('vsl-preview');
let previewVisible = false;
function updatePreview() {
  if (!previewVideo.isConnected || !previewVisible || document.hidden || motionPreference.matches) { previewVideo.pause(); return; }
  const source = previewVideo.querySelector('source');
  if (!source.src) { source.src = source.dataset.src; previewVideo.load(); }
  previewVideo.muted = true;
  previewVideo.play().catch(() => {});
}
new IntersectionObserver(([entry]) => { previewVisible = entry.isIntersecting; updatePreview(); }, { threshold: 0.1 }).observe(previewVideo);
document.addEventListener('visibilitychange', updatePreview);
motionPreference.addEventListener('change', updatePreview);
