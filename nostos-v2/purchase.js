(() => {
  const sessionId = new URLSearchParams(location.search).get('session_id');
  const status = document.getElementById('statusText');
  const error = document.getElementById('errorBox');
  const fail = message => { status.textContent = 'Le paiement n’a pas pu être vérifié.'; error.textContent = message; error.classList.remove('hidden'); };
  if (!sessionId || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    fail('Ce lien ne contient pas de référence de paiement valide. Si tu viens de régler ton inscription, retrouve le lien de confirmation ou contacte-nous avant de renouveler ton achat.'); return;
  }
  fetch(`/.netlify/functions/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
    .then(async response => { const order = await response.json(); if (!response.ok || !order.ok || order.id !== sessionId || !Number.isFinite(order.amount_total) || order.amount_total < 0 || !/^[A-Z]{3}$/.test(order.currency)) throw new Error('Paiement non vérifié.'); return order; })
    .then(order => {
      status.classList.add('hidden'); document.getElementById('successBox').classList.remove('hidden');
      document.getElementById('purchaseDetails').textContent = `Montant payé : ${order.amount_total.toFixed(2)} ${order.currency}.`;
      window.nostosTracking.verifiedPurchase({ id: order.id, value: order.amount_total, currency: order.currency });
    })
    .catch(() => fail('Impossible de confirmer le paiement pour le moment. Contacte bonjour@nostosprogram.com si le paiement a été débité.'));
})();
