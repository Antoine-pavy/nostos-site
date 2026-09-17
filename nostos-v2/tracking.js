(() => {
  'use strict';
  const ids = { meta: '1837727546891540', gtm: 'GTM-TX27DHHX', clarity: 'w8xvas3f1l', ga: 'G-KRLJ69613G' };
  const key = 'nostos_v2_consent';
  const environment = document.querySelector('meta[name="nostos-environment"]')?.getAttribute('content');
  const preview = environment !== 'production' || !['nostosprogram.com', 'www.nostosprogram.com'].includes(location.hostname);
  let consent = null, analyticsLoaded = false, marketingLoaded = false, scheduled = false;
  const analyticsPurchases = new Set(), marketingPurchases = new Set();
  let pendingPurchase = null;
  try { consent = JSON.parse(localStorage.getItem(key)); } catch (_) {}
  if (!consent || typeof consent.marketing !== 'boolean' || !Number.isFinite(Date.parse(consent.timestamp)) || Date.now() - Date.parse(consent.timestamp) > 180 * 86400000) consent = null;
  const marketingAllowed = () => consent?.marketing === true;
  const readStored = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const writeStored = (k, value) => { try { localStorage.setItem(k, value); } catch (_) {} };
  function script(src) {
    if (preview || document.querySelector(`script[src="${src}"]`)) return;
    const element = document.createElement('script'); element.async = true; element.src = src; document.head.appendChild(element);
  }
  function prepareDataLayer() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  }
  function loadAnalytics() {
    if (analyticsLoaded || preview) return;
    analyticsLoaded = true;
    prepareDataLayer();
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: marketingAllowed() ? 'granted' : 'denied',
      ad_user_data: marketingAllowed() ? 'granted' : 'denied',
      ad_personalization: marketingAllowed() ? 'granted' : 'denied',
      wait_for_update: 500
    });
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    script(`https://www.googletagmanager.com/gtm.js?id=${ids.gtm}`);
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    script(`https://www.clarity.ms/tag/${ids.clarity}`);
    if (pendingPurchase) sendPurchase(pendingPurchase);
  }
  function loadMarketing() {
    if (!marketingAllowed() || marketingLoaded || preview) return;
    marketingLoaded = true;
    prepareDataLayer();
    window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
    if (!window.fbq) {
      const queue = function () { queue.callMethod ? queue.callMethod.apply(queue, arguments) : queue.queue.push(arguments); };
      queue.queue = []; queue.push = queue; queue.loaded = true; queue.version = '2.0'; window.fbq = queue; window._fbq = queue;
    }
    window.fbq('init', ids.meta);
    window.fbq('track', 'PageView');
    script('https://connect.facebook.net/en_US/fbevents.js');
    if (pendingPurchase) sendPurchase(pendingPurchase);
  }
  function load() { loadAnalytics(); loadMarketing(); }
  function schedule() {
    if (scheduled || preview) return;
    scheduled = true;
    const run = () => { if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 800 }); else setTimeout(load, 100); };
    if (document.readyState === 'complete') run(); else window.addEventListener('load', run, { once: true });
  }
  function checkout(element) {
    if (preview) return;
    loadAnalytics();
    const label = element.textContent.trim();
    window.dataLayer.push({ event: 'cta_click', label, id: element.id || null, cta: element.id || 'hero-checkout' });
    window.dataLayer.push({ event: 'initiate_checkout', label, value: 39, currency: 'EUR', cta: element.id || 'hero-checkout' });
    if (marketingAllowed()) {
      loadMarketing();
      window.fbq('track', 'InitiateCheckout', { value: 39, currency: 'EUR', content_name: 'Nostos 30 jours' });
    }
  }
  function sendPurchase(order) {
    if (preview) return;
    loadAnalytics();
    const payload = { value: order.value, currency: order.currency, transaction_id: order.id };
    const analyticsKey = `nostos_purchase_analytics_${order.id}`;
    if (!analyticsPurchases.has(order.id) && !readStored(analyticsKey)) {
      analyticsPurchases.add(order.id);
      window.dataLayer.push({ event: 'purchase', ...payload });
      window.gtag('event', 'purchase', { ...payload, send_to: ids.ga });
      writeStored(analyticsKey, '1');
    }
    const marketingKey = `nostos_purchase_marketing_${order.id}`;
    if (marketingAllowed() && !marketingPurchases.has(order.id) && !readStored(marketingKey)) {
      loadMarketing();
      marketingPurchases.add(order.id);
      window.fbq('track', 'Purchase', { value: order.value, currency: order.currency }, { eventID: order.id });
      writeStored(marketingKey, '1');
      pendingPurchase = null;
    }
  }
  window.nostosTracking = {
    ids, preview,
    marketingConsent() { return marketingAllowed(); },
    verifiedPurchase(order) {
      if (!order || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(order.id) || !Number.isFinite(order.value) || order.value < 0 || !/^[A-Z]{3}$/.test(order.currency)) return;
      pendingPurchase = order;
      sendPurchase(order);
    }
  };
  const panel = document.createElement('section');
  panel.className = 'consent-panel'; panel.hidden = !!consent; panel.setAttribute('aria-label', 'Préférences cookies');
  panel.innerHTML = '<div class="consent-summary" data-consent-summary><p><strong>Tu nous aides à améliorer Nostos ?</strong>La mesure d’audience est nécessaire pour comprendre et améliorer le site. Avec ton accord, Meta peut aussi mesurer l’efficacité de nos publicités. Tu peux changer d’avis à tout moment. <a href="politique-confidentialite.html">En savoir plus</a></p><div class="consent-actions"><button type="button" class="consent-accept" data-consent="yes">Accepter</button><button type="button" class="consent-text-action" data-consent="settings">Paramétrer</button></div></div><div class="consent-settings" data-consent-settings hidden><p><strong>Paramètres des cookies</strong>Choisis si tu souhaites autoriser les cookies marketing.</p><div class="consent-option"><span><b>Mesure d’audience</b><small>Analytics et Clarity nous aident à améliorer le site.</small></span><em>Obligatoire</em></div><label class="consent-option consent-option-toggle"><span><b>Marketing</b><small>Permet à Meta de mesurer les publicités et les conversions.</small></span><input type="checkbox" data-consent-marketing aria-label="Autoriser les cookies marketing"></label><div class="consent-actions"><button type="button" class="consent-accept" data-consent="save">Enregistrer mes choix</button><button type="button" class="consent-text-action" data-consent="back">Retour</button></div></div>';
  document.body.appendChild(panel);
  const summary = panel.querySelector('[data-consent-summary]');
  const settings = panel.querySelector('[data-consent-settings]');
  const marketingToggle = panel.querySelector('[data-consent-marketing]');
  function showSummary() { summary.hidden = false; settings.hidden = true; }
  function showSettings() { marketingToggle.checked = marketingAllowed(); summary.hidden = true; settings.hidden = false; marketingToggle.focus(); }
  function choose(marketing) {
    const revoke = marketingLoaded && !marketing;
    consent = { marketing, timestamp: new Date().toISOString() };
    writeStored(key, JSON.stringify(consent)); panel.hidden = true; showSummary();
    document.documentElement.classList.remove('consent-visible');
    prepareDataLayer();
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied'
    });
    if (revoke) {
      window.fbq?.('consent', 'revoke');
      location.reload(); return;
    }
    loadMarketing();
    if (pendingPurchase) sendPurchase(pendingPurchase);
  }
  panel.querySelector('[data-consent="yes"]').addEventListener('click', () => choose(true));
  panel.querySelector('[data-consent="settings"]').addEventListener('click', showSettings);
  panel.querySelector('[data-consent="save"]').addEventListener('click', () => choose(marketingToggle.checked));
  panel.querySelector('[data-consent="back"]').addEventListener('click', () => { showSummary(); panel.querySelector('[data-consent="settings"]').focus(); });
  if (!consent) document.documentElement.classList.add('consent-visible');
  document.querySelectorAll('#privacy-open, #openCookieSettings').forEach(button => button.addEventListener('click', () => { panel.hidden = false; showSettings(); document.documentElement.classList.add('consent-visible'); }));
  function marketingContext() {
    if (!marketingAllowed()) return { marketing_consent: false };
    const cookie = name => document.cookie.split('; ').find(value => value.startsWith(`${name}=`))?.slice(name.length + 1) || '';
    return {
      marketing_consent: true,
      fbp: cookie('_fbp').slice(0, 200),
      fbc: cookie('_fbc').slice(0, 200),
      event_source_url: location.href.slice(0, 500)
    };
  }
  async function beginServerCheckout(element, event) {
    if (element.dataset.checkoutLoading || typeof fetch !== 'function') return;
    event?.preventDefault();
    element.dataset.checkoutLoading = 'true';
    element.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...marketingContext(), cta: element.id || 'landing-checkout' })
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error('Checkout unavailable');
      location.assign(data.url);
    } catch (_) {
      // Preserve the existing Stripe payment link if the server is temporarily unavailable.
      location.assign(element.href);
    } finally {
      element.dataset.checkoutLoading = '';
      element.removeAttribute('aria-busy');
    }
  }
  document.querySelectorAll('a[href^="https://buy.stripe.com/"]').forEach(element => element.addEventListener('click', event => {
    checkout(element);
    if (element.dataset?.checkout === 'true') beginServerCheckout(element, event);
  }));
  schedule();
})();
