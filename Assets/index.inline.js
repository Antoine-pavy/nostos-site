        document.documentElement.classList.add('js-enhanced');

        const CONSENT_KEY = 'nostos_cookie_consent';
        const CONSENT_VERSION = 1;
        const CLARITY_ID = 'w8xvas3f1l';
        const GTM_ID = 'GTM-TX27DHHX';
        const META_PIXEL_ID = '1837727546891540';
        const FORCE_META_PIXEL_DEBUG = false;
        const FORCE_ALL_COOKIES = true;
        const COOKIE_BANNER_SUSPENDED = true;
        let consentState = null;
        let clarityLoaded = false;
        let gtmLoaded = false;
        let metaPixelLoaded = false;
        let marketingLoadScheduled = false;

        function readConsent() {
            if (FORCE_ALL_COOKIES) {
                return { necessary: true, marketing: true, timestamp: new Date().toISOString(), version: CONSENT_VERSION };
            }
            try {
                const raw = localStorage.getItem(CONSENT_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (parsed && parsed.version === CONSENT_VERSION && parsed.necessary === true && typeof parsed.marketing === 'boolean') {
                    return parsed;
                }
            } catch (e) {}
            return null;
        }

        function saveConsent(marketing) {
            if (FORCE_ALL_COOKIES) {
                const forced = { necessary: true, marketing: true, timestamp: new Date().toISOString(), version: CONSENT_VERSION };
                localStorage.setItem(CONSENT_KEY, JSON.stringify(forced));
                consentState = forced;
                applyConsent();
                hideBanner();
                return;
            }
            const consent = {
                necessary: true,
                marketing: marketing,
                timestamp: new Date().toISOString(),
                version: CONSENT_VERSION
            };
            localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
            consentState = consent;
            applyConsent();
            hideBanner();
        }

        function loadGTM() {
            if (gtmLoaded) return;
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
            const tag = document.createElement('script');
            tag.async = true;
            tag.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
            document.head.appendChild(tag);
            gtmLoaded = true;
        }

        function loadClarity() {
            if (clarityLoaded) return;
            window.clarity = window.clarity || function() {
                (window.clarity.q = window.clarity.q || []).push(arguments);
            };
            const tag = document.createElement('script');
            tag.async = true;
            tag.src = 'https://www.clarity.ms/tag/' + CLARITY_ID;
            document.head.appendChild(tag);
            clarityLoaded = true;
        }

        function loadMetaPixel() {
            if (metaPixelLoaded) return;
            !(function(f,b,e,v,n,t,s){
                if(f.fbq)return;
                n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;
                n.push=n;
                n.loaded=!0;
                n.version='2.0';
                n.queue=[];
                t=b.createElement(e);
                t.async=!0;
                t.src=v;
                s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s);
            })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
            window.fbq('init', META_PIXEL_ID);
            window.fbq('track', 'PageView');
            metaPixelLoaded = true;
        }

        function scheduleMarketingLoad() {
            if (marketingLoadScheduled) return;
            marketingLoadScheduled = true;
            const load = () => {
                loadClarity();
                loadGTM();
                loadMetaPixel();
            };
            const runAfterVisualLoad = () => {
                if ('requestIdleCallback' in window) {
                    window.requestIdleCallback(load, { timeout: 1200 });
                    return;
                }
                window.setTimeout(load, 500);
            };
            if (document.readyState === 'complete') {
                runAfterVisualLoad();
                return;
            }
            window.addEventListener('load', runAfterVisualLoad, { once: true });
        }

        function applyConsent() {
            if (consentState && consentState.marketing) {
                scheduleMarketingLoad();
            }
        }

        function showBanner(customize) {
            if (COOKIE_BANNER_SUSPENDED) return;
            const banner = document.getElementById('cookieBanner');
            const panel = document.getElementById('cookieCustomizePanel');
            const saveBtn = document.getElementById('saveCookies');
            if (customize) {
                panel.classList.remove('cookie-hidden');
                saveBtn.classList.remove('cookie-hidden');
            } else {
                panel.classList.add('cookie-hidden');
                saveBtn.classList.add('cookie-hidden');
            }
            banner.classList.remove('cookie-hidden');
        }

        function hideBanner() {
            document.getElementById('cookieBanner').classList.add('cookie-hidden');
        }

        function isMarketingAllowed() {
            if (FORCE_ALL_COOKIES) return true;
            return !!(consentState && consentState.marketing === true);
        }

        function trackInitiateCheckout(el) {
            if (!isMarketingAllowed()) return;
            const label = el.getAttribute('data-cta-label') || el.textContent.trim();
            const id = el.id || null;
            const value = Number(el.getAttribute('data-checkout-value') || '39');
            const currency = el.getAttribute('data-checkout-currency') || 'EUR';
            loadMetaPixel();
            if (typeof window.fbq === 'function') {
                window.fbq('track', 'InitiateCheckout', {
                    value,
                    currency,
                    content_name: 'Nostos 30 jours'
                });
            }
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'initiate_checkout',
                label,
                id,
                cta: el.getAttribute('data-cta'),
                value,
                currency
            });
        }

        document.getElementById('acceptAllCookies').addEventListener('click', () => saveConsent(true));
        document.getElementById('rejectAllCookies').addEventListener('click', () => saveConsent(false));
        document.getElementById('customizeCookies').addEventListener('click', () => showBanner(true));
        document.getElementById('saveCookies').addEventListener('click', () => {
            const marketing = document.getElementById('marketingToggle').checked;
            saveConsent(marketing);
        });
        const openCookieBtn = document.getElementById('openCookieSettings');
        if (COOKIE_BANNER_SUSPENDED) {
            openCookieBtn.style.display = 'none';
        } else {
            openCookieBtn.addEventListener('click', () => {
                const current = readConsent();
                document.getElementById('marketingToggle').checked = !!(current && current.marketing);
                showBanner(true);
            });
        }

        consentState = readConsent();
        if (FORCE_ALL_COOKIES) {
            applyConsent();
            showBanner(false);
        } else if (!consentState) {
            showBanner(false);
        } else {
            document.getElementById('marketingToggle').checked = !!consentState.marketing;
            applyConsent();
        }
        if (FORCE_META_PIXEL_DEBUG) {
            scheduleMarketingLoad();
        }

        // CTA click tracking (GTM dataLayer)
        document.querySelectorAll('[data-cta]').forEach((el) => {
            el.addEventListener('click', () => {
                if (!isMarketingAllowed()) return;
                const label = el.getAttribute('data-cta-label') || el.textContent.trim();
                const id = el.id || null;
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: 'cta_click', label, id, cta: el.getAttribute('data-cta') });
            });
        });

        document.querySelectorAll('[data-initiate-checkout="true"]').forEach((el) => {
            el.addEventListener('click', () => {
                trackInitiateCheckout(el);
            });
        });

        // Hero VSL lazy player
        const heroVslPlayer = document.getElementById('heroVslPlayer');
        const heroVslLaunchBtn = document.getElementById('heroVslLaunchBtn');
        const heroVslFrameSlot = document.getElementById('heroVslFrameSlot');
        const HERO_VSL_UNMUTED = heroVslPlayer ? heroVslPlayer.dataset.videoUnmuted : '';
        let heroVslLoaded = false;

        function mountHeroVsl(src) {
            if (!heroVslFrameSlot || !src) return;
            heroVslFrameSlot.hidden = false;
            heroVslFrameSlot.innerHTML = '<iframe id="heroVslIframe" src="' + src + '" title="Nostos VSL" loading="eager" class="hero-vsl-frame" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
            heroVslLoaded = true;
        }

        function launchHeroVsl() {
            if (heroVslLoaded) return;
            mountHeroVsl(HERO_VSL_UNMUTED);
            if (heroVslLaunchBtn) heroVslLaunchBtn.hidden = true;
        }

        if (heroVslLaunchBtn) heroVslLaunchBtn.addEventListener('click', launchHeroVsl);

        const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        function setupRevealGroup(selector, stepMs) {
            const nodes = Array.from(document.querySelectorAll(selector));
            nodes.forEach((node, index) => {
                node.classList.add('reveal-on-scroll');
                node.style.setProperty('--reveal-delay', `${index * stepMs}ms`);
            });
            return nodes;
        }

        const situationsRows = Array.from(document.querySelectorAll('.situations-row'));
        if (situationsRows.length) {
            situationsRows.forEach((row, index) => {
                row.style.setProperty('--situations-delay', `${index * 110}ms`);
            });
            if ('IntersectionObserver' in window && !reduceMotionQuery.matches) {
                const situationsObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    });
                }, {
                    threshold: 0.35,
                    rootMargin: '0px 0px -10% 0px'
                });
                situationsRows.forEach((row) => situationsObserver.observe(row));
            } else {
                situationsRows.forEach((row) => row.classList.add('is-visible'));
            }
        }

        const revealNodes = [
            ...setupRevealGroup('.about-how-item', 90),
            ...setupRevealGroup('.about-kpi-item', 85),
            ...setupRevealGroup('.impact-card', 95),
            ...setupRevealGroup('.faq-row-dark', 80),
            ...setupRevealGroup('.final-product-shot, .final-cta-title, [data-cta=\"final-cta\"]', 110),
            ...setupRevealGroup('.founder-reveal', 120)
        ];
        if (revealNodes.length) {
            if ('IntersectionObserver' in window && !reduceMotionQuery.matches) {
                const revealObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        entry.target.classList.add('is-revealed');
                        observer.unobserve(entry.target);
                    });
                }, {
                    threshold: 0.18,
                    rootMargin: '0px 0px -8% 0px'
                });
                revealNodes.forEach((node) => revealObserver.observe(node));
            } else {
                revealNodes.forEach((node) => node.classList.add('is-revealed'));
            }
        }

        const temoinStage = document.getElementById('temoinStage');
        const temoinCards = Array.from(document.querySelectorAll('[data-temoin-card]'));
        const temoinDesktop = [
            { x: 0, y: 0, r: 0, w: 430, h: 250, z: 50, o: 1 },
            { x: -150, y: 12, r: -5, w: 340, h: 200, z: 35, o: 0.92 },
            { x: 155, y: 14, r: 5, w: 340, h: 200, z: 34, o: 0.92 },
            { x: -245, y: 26, r: -8, w: 300, h: 175, z: 22, o: 0.82 },
            { x: 250, y: 28, r: 8, w: 300, h: 175, z: 21, o: 0.82 }
        ];
        const temoinMobile = [
            { x: 0, y: -4, r: 0, w: 270, h: 165, z: 50, o: 1 },
            { x: -58, y: 14, r: -5, w: 220, h: 135, z: 35, o: 0.9 },
            { x: 58, y: 14, r: 5, w: 220, h: 135, z: 34, o: 0.9 },
            { x: -88, y: 28, r: -8, w: 190, h: 115, z: 22, o: 0.78 },
            { x: 88, y: 28, r: 8, w: 190, h: 115, z: 21, o: 0.78 }
        ];
        let temoinLayoutMode = null;
        let temoinResizeScheduled = false;

        function applyTemoinLayout() {
            if (!temoinStage || temoinCards.length === 0) return;
            const isMobile = window.matchMedia('(max-width: 640px)').matches;
            const nextMode = isMobile ? 'mobile' : 'desktop';
            if (temoinLayoutMode === nextMode) return;
            temoinLayoutMode = nextMode;
            const layouts = isMobile ? temoinMobile : temoinDesktop;
            temoinCards.forEach((card, index) => {
                const layout = layouts[index];
                card.style.width = `${layout.w}px`;
                card.style.height = `${layout.h}px`;
                card.style.transform = `translate(calc(-50% + ${layout.x}px), calc(-50% + ${layout.y}px)) rotate(${layout.r}deg)`;
                card.style.zIndex = String(layout.z);
                card.style.opacity = String(layout.o);
            });
        }

        if (temoinStage && temoinCards.length) {
            const lightbox = document.getElementById('temoinLightbox');
            const lightboxImg = document.getElementById('temoinLightboxImg');
            const lightboxMedia = document.getElementById('temoinLightboxMedia');
            const btnClose = document.getElementById('temoinLightboxClose');
            const btnPrev = document.getElementById('temoinLightboxPrev');
            const btnNext = document.getElementById('temoinLightboxNext');
            const temoinItems = temoinCards.map((card) => {
                const img = card.querySelector('img');
                return { src: img ? img.src : '', alt: img ? img.alt : '' };
            });
            let currentTemoinIndex = 0;
            let touchStartX = 0;
            let touchStartY = 0;
            let touchDX = 0;
            let touchDY = 0;

            function showTemoinAt(index) {
                const total = temoinItems.length;
                currentTemoinIndex = (index + total) % total;
                const item = temoinItems[currentTemoinIndex];
                lightboxImg.src = item.src;
                lightboxImg.alt = item.alt;
            }

            function openTemoinLightbox(index) {
                showTemoinAt(index);
                lightbox.classList.add('is-open');
                lightbox.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            }

            function closeTemoinLightbox() {
                lightbox.classList.remove('is-open');
                lightbox.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
                lightboxMedia.style.transform = 'translateX(0)';
            }

            function goPrevTemoin() { showTemoinAt(currentTemoinIndex - 1); }
            function goNextTemoin() { showTemoinAt(currentTemoinIndex + 1); }

            temoinCards.forEach((card, index) => {
                card.addEventListener('click', () => openTemoinLightbox(index));
            });

            btnClose.addEventListener('click', closeTemoinLightbox);
            btnPrev.addEventListener('click', goPrevTemoin);
            btnNext.addEventListener('click', goNextTemoin);

            lightbox.addEventListener('click', (event) => {
                if (event.target === lightbox) closeTemoinLightbox();
            });

            document.addEventListener('keydown', (event) => {
                if (!lightbox.classList.contains('is-open')) return;
                if (event.key === 'Escape') closeTemoinLightbox();
                if (event.key === 'ArrowLeft') goPrevTemoin();
                if (event.key === 'ArrowRight') goNextTemoin();
            });

            lightboxMedia.addEventListener('touchstart', (event) => {
                const touch = event.changedTouches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                touchDX = 0;
                touchDY = 0;
            }, { passive: true });

            lightboxMedia.addEventListener('touchmove', (event) => {
                const touch = event.changedTouches[0];
                touchDX = touch.clientX - touchStartX;
                touchDY = touch.clientY - touchStartY;
                if (Math.abs(touchDX) > Math.abs(touchDY)) {
                    event.preventDefault();
                    const clamped = Math.max(-80, Math.min(80, touchDX));
                    lightboxMedia.style.transform = `translateX(${clamped}px)`;
                }
            }, { passive: false });

            lightboxMedia.addEventListener('touchend', () => {
                const absX = Math.abs(touchDX);
                const absY = Math.abs(touchDY);
                if (absX > 60 && absX > absY) {
                    if (touchDX > 0) goPrevTemoin();
                    else goNextTemoin();
                } else if (absY > 90 && absY > absX) {
                    closeTemoinLightbox();
                }
                lightboxMedia.style.transform = 'translateX(0)';
                touchDX = 0;
                touchDY = 0;
            }, { passive: true });

            applyTemoinLayout();
            window.addEventListener('resize', () => {
                if (temoinResizeScheduled) return;
                temoinResizeScheduled = true;
                window.requestAnimationFrame(() => {
                    temoinResizeScheduled = false;
                    temoinLayoutMode = null;
                    applyTemoinLayout();
                });
            });
        }
    
