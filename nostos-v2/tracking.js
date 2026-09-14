(() => {
  'use strict';
  const ids = { meta: '1837727546891540', gtm: 'GTM-TX27DHHX', clarity: 'w8xvas3f1l', ga: 'G-KRLJ69613G' };
  // A separate key avoids treating the V1's forced consent as a visitor choice.
  const key = 'nostos_v2_consent';
  const environment = document.querySelector('meta[name="nostos-environment"]')?.getAttribute('content');
  const preview = environment !== 'production' || !['nostosprogram.com', 'www.nostosprogram.com'].includes(location.hostname);
  let consent = null, loaded = false, scheduled = false, gaLoaded = false;
  const purchases = new Set();
  let pendingPurchase = null;
  try { consent = JSON.parse(localStorage.getItem(key)); } catch (_) {}
  if (!consent || typeof consent.marketing !== 'boolean' || !Number.isFinite(Date.parse(consent.timestamp)) || Date.now() - Date.parse(consent.timestamp) > 180 * 86400000) consent = null;
  const allowed = () => consent?.marketing === true;
  const readStored = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const writeStored = (k, value) => { try { localStorage.setItem(k, value); } catch (_) {} };
  function script(src) {
    if (preview || document.querySelector(`script[src="${src}"]`)) return;
    const element = document.createElement('script'); element.async = true; element.src = src; document.head.appendChild(element);
  }
  function load() {
    if (!allowed() || loaded || preview) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    script(`https://www.googletagmanager.com/gtm.js?id=${ids.gtm}`);
    if (!window.fbq) {
      const queue = function () { queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments); };
      queue.queue = []; queue.push = queue; queue.loaded = true; queue.version = '2.0'; window.fbq = queue; window._fbq = queue;
    }
    window.fbq('init', ids.meta);
    window.fbq('track', 'PageView');
    script('https://connect.facebook.net/en_US/fbevents.js');
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    script(`https://www.clarity.ms/tag/${ids.clarity}`);
    if (pendingPurchase) sendPurchase(pendingPurchase);
  }
  function schedule() {
    if (!allowed() || scheduled || preview) return;
    scheduled = true;
    const run = () => { if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 800 }); else setTimeout(load, 100); };
    if (document.readyState === 'complete') run(); else window.addEventListener('load', run, { once: true });
  }
  function checkout(element) {
    if (!allowed() || preview) return;
    load();
    const label = element.textContent.trim();
    window.dataLayer.push({ event: 'cta_click', label, id: element.id || null, cta: element.id || 'hero-checkout' });
    window.fbq('track', 'InitiateCheckout', { value: 19, currency: 'EUR', content_name: 'Nostos 30 jours' });
    window.dataLayer.push({ event: 'initiate_checkout', label, value: 19, currency: 'EUR', cta: element.id || 'hero-checkout' });
  }
  function sendPurchase(order) {
    const purchaseKey = `nostos_purchase_${order.id}`;
    if (!allowed() || preview || purchases.has(order.id) || readStored(purchaseKey)) return;
    if (!loaded) { load(); return; }
    purchases.add(order.id);
    const payload = { value: order.value, currency: order.currency, transaction_id: order.id };
    window.fbq('track', 'Purchase', { value: order.value, currency: order.currency }, { eventID: order.id });
    window.dataLayer.push({ event: 'purchase', ...payload });
    // The V1 confirmation also used direct GA4, with the same transaction id for deduplication.
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    if (!gaLoaded) {
      gaLoaded = true;
      window.gtag('js', new Date()); window.gtag('config', ids.ga, { send_page_view: false });
      script(`https://www.googletagmanager.com/gtag/js?id=${ids.ga}`);
    }
    window.gtag('event', 'purchase', { ...payload, send_to: ids.ga });
    writeStored(purchaseKey, '1');
    pendingPurchase = null;
  }
  window.nostosTracking = {
    ids, preview,
    verifiedPurchase(order) {
      if (!order || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(order.id) || !Number.isFinite(order.value) || order.value < 0 || !/^[A-Z]{3}$/.test(order.currency)) return;
      pendingPurchase = order;
      sendPurchase(order);
    }
  };
  const panel = document.createElement('section');
  panel.className = 'consent-panel'; panel.hidden = !!consent; panel.setAttribute('aria-label', 'Préférences cookies');
  panel.innerHTML = '<p><strong>Tu nous aides à améliorer Nostos ?</strong>Avec ton accord, nous mesurons les visites et l’efficacité de nos publicités, et analysons la navigation pour améliorer le site. Tu peux changer d’avis à tout moment. <a href="politique-confidentialite.html">En savoir plus</a></p><div><button type="button" data-consent="yes">Accepter</button><button type="button" data-consent="no">Refuser</button></div>';
  document.body.appendChild(panel);
  function choose(marketing) {
    const revoke = loaded && !marketing;
    consent = { marketing, timestamp: new Date().toISOString() };
    writeStored(key, JSON.stringify(consent)); panel.hidden = true;
    document.documentElement.classList.remove('consent-visible');
    if (revoke) {
      window.fbq?.('consent', 'revoke');
      window.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      location.reload(); return;
    }
    schedule();
  }
  panel.querySelector('[data-consent="yes"]').addEventListener('click', () => choose(true));
  panel.querySelector('[data-consent="no"]').addEventListener('click', () => choose(false));
  if (!consent) document.documentElement.classList.add('consent-visible');
  document.querySelectorAll('#privacy-open, #openCookieSettings').forEach(button => button.addEventListener('click', () => { panel.hidden = false; document.documentElement.classList.add('consent-visible'); panel.querySelector('button').focus(); }));
  document.querySelectorAll('a[href^="https://buy.stripe.com/"]').forEach(element => element.addEventListener('click', () => checkout(element)));
  schedule();
})();
