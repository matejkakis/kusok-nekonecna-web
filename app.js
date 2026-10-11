/* Kúsok Nekonečna — skripty (košík, okná, hra, obloha) */
(function () {
    'use strict';
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const body = document.body;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // mobil: plátna kreslíme v nižšom rozlíšení a pri 30 snímkach za sekundu, aby animácie nesekali
    const lite = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
    const DPR_MAX = lite ? 1.5 : 2, FRAME_MS = lite ? 33 : 0;
    const store = {
        get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} }
    };
    const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ── Navigácia ── */
    const nav = $('#nav'), toggle = $('#nav-toggle'), menu = $('#mobile-menu');
    // Menu sa otvára ako štrbina kupoly hvezdárne
    $$('#mobile-menu .mm-link').forEach((a, i) => a.style.setProperty('--i', i));
    let menuT = 0;
    function closeMenu() {
        if (menu.hidden) return;
        toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu'; body.classList.remove('modal-open');
        clearTimeout(menuT); menu.classList.remove('is-opening');
        if (reduced) { menu.hidden = true; return; }
        menu.classList.add('is-closing');
        menuT = setTimeout(() => { menu.hidden = true; menu.classList.remove('is-closing'); }, 340);
    }
    toggle.addEventListener('click', () => {
        if (!menu.hidden && !menu.classList.contains('is-closing')) { closeMenu(); return; }
        clearTimeout(menuT); menu.classList.remove('is-closing');
        menu.hidden = false; void menu.offsetWidth; menu.classList.add('is-opening');
        toggle.setAttribute('aria-expanded', 'true'); toggle.textContent = 'Zavrieť'; body.classList.add('modal-open');
    });
    // Posun na sekciu: pristane sa na jej nadpise tesne pod hlavičkou. Ak sa počas posúvania niečo
    // načíta a stránka sa posunie (fotky, mapa), cieľ sa po dobehnutí ešte raz dorovná.
    function goTo(target) {
        // sekcia si môže určiť, kde sa má pristáť (napr. okno hry), inak sa pristane na nadpise
        const head = (target.dataset.land && target.querySelector(target.dataset.land)) || target.querySelector('h2') || target;
        const gap = Number(target.dataset.gap || 22);
        const y = () => Math.max(0, head.getBoundingClientRect().top + window.scrollY - (nav.offsetHeight || 64) - gap);
        window.scrollTo({ top: y(), behavior: reduced ? 'auto' : 'smooth' });
        let tries = 0, last = -1, still = 0;
        const check = () => {
            if (++tries > 120) return;                       // najviac asi 2 sekundy
            const cur = window.scrollY;
            if (Math.abs(cur - last) < 1) still++; else still = 0;
            last = cur;
            if (still >= 6) { const t = y(); if (Math.abs(t - cur) > 3) { window.scrollTo({ top: t, behavior: 'auto' }); still = 0; } else return; }
            requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
    }
    window.goTo = goTo;
    // aj odkazy v hornom menu a inde na stránke
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]'); if (!a || a.closest('#mobile-menu')) return;
        const id = a.getAttribute('href'); if (id.length < 2 || id.startsWith('#obraz-')) return;
        if (id === '#zaostri' && window.openGame) { e.preventDefault(); window.openGame(); return; }
        let t = document.getElementById(id.slice(1)); if (!t) return;
        const pnl = t.closest('.ob-panel'); if (pnl) { window.showObTab?.(pnl.id); t = document.getElementById('obloha'); }
        if (!t.matches('section, .part')) return;
        e.preventDefault(); goTo(t);
        try { history.replaceState(null, '', id); } catch (_) {}
    });
    // ťuknutie: položka sa rozsvieti, ostatné zhasnú, potom sa menu zavrie a stránka sa posunie
    $$('#mobile-menu a').forEach(a => a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        let target = $(href);
        if (!target) { closeMenu(); return; }
        e.preventDefault();
        if (menu.classList.contains('picking')) return;
        const pnl = target.closest('.ob-panel');
        const go = () => {
            menu.classList.remove('picking'); a.classList.remove('is-picked'); closeMenu();
            if (href === '#zaostri' && window.openGame) { window.openGame(); return; }
            if (pnl) { window.showObTab?.(pnl.id); target = $('#obloha'); }
            goTo(target);
        };
        if (reduced) { go(); return; }
        menu.classList.add('picking'); a.classList.add('is-picked');
        setTimeout(go, 520);
    }));

    let ticking = false;
    function onScroll() {
        ticking = false;
        const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
        nav.classList.toggle('is-solid', y > window.innerHeight * 0.6);
        document.documentElement.style.setProperty('--fs', max > 0 ? (y / max).toFixed(4) : 0);
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    const spyLinks = $$('.nav-links a, .focus-scale a[href^="#"], #mobile-menu .mm-link');
    const spy = new IntersectionObserver((entries) => entries.forEach(en => {
        if (en.isIntersecting) spyLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(s => spy.observe(s));
    // tlačidlo späť hore sa ukáže až po dvoch obrazovkách
    // na mobile tlačidlo hore nezakrýva Hviezdopis, kým sa v ňom listuje
    { const st = $('#nb-stage'); if (st && 'IntersectionObserver' in window) new IntersectionObserver((en) => { document.body.classList.toggle('nb-in-view', en[0].isIntersecting); }, { threshold: .35 }).observe(st); }
    { const tt = $('#to-top'); let on = false;
      const upd = () => { const v = window.scrollY > innerHeight * 2; if (v !== on) { on = v; tt.classList.toggle('show', v); } };
      window.addEventListener('scroll', upd, { passive: true }); upd(); }

    /* ── Zaostrenie pri príchode (nadpisy aj fotky v galérii) ── */
    const fpObs = new IntersectionObserver((entries) => entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-sharp'); fpObs.unobserve(en.target); }
    }), { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    // fotka sa zaostruje až keď je načítaná, inak by sa zaostril prázdny rámik a fotka by potom len „skočila“
    $$('.fp').forEach(el => {
        if (reduced) return el.classList.add('is-sharp');
        if (el.tagName === 'IMG' && !(el.complete && el.naturalWidth)) el.addEventListener('load', () => fpObs.observe(el), { once: true });
        else fpObs.observe(el);
    });

    /* ── Fotky: načítajú sa vopred (asi dve obrazovky pred vami) a objavia sa plynulým prelínaním ── */
    {
        const imgs = $$('img[loading="lazy"]');
        imgs.forEach(im => {
            if (im.classList.contains('fp') || (im.complete && im.naturalWidth)) return;
            im.classList.add('lz');
            const done = () => im.decode ? im.decode().catch(() => {}).then(() => im.classList.add('ld')) : im.classList.add('ld');
            im.addEventListener('load', done, { once: true }); im.addEventListener('error', () => im.classList.add('ld'), { once: true });
        });
        if ('IntersectionObserver' in window) {
            // vodorovné galérie: keď sa priblíži rad, načítajú sa všetky jeho fotky naraz
            const pre = new IntersectionObserver((en) => en.forEach(e => {
                if (!e.isIntersecting) return; pre.unobserve(e.target);
                (e.target.tagName === 'IMG' ? [e.target] : $$('img[loading="lazy"]', e.target)).forEach(im => { im.loading = 'eager'; });
            }), { rootMargin: '200% 0px 200% 0px' });
            imgs.forEach(im => { const row = im.closest('.g-track, .walls'); if (!row) pre.observe(im); });
            $$('.g-track, .walls').forEach(r => pre.observe(r));
        }
    }

    /* ── Galéria: prirodzený pomer fotiek, „ako dlho letelo svetlo“ pri prechode ── */
    const grid = $('#g-grid');
    $$('.g-item').forEach(it => {
        it.style.setProperty('--ar', (it.dataset.w / it.dataset.h).toFixed(3));
        const k = it.dataset.lyk || 'Svetlo k nám letelo';
        const v = it.dataset.light === 'zatiaľ nikdy' ? '' : it.dataset.light;
        $('.g-img', it).insertAdjacentHTML('beforeend', `<span class="g-ly" aria-hidden="true"><small>${esc(k)}</small>${v ? `<b>${esc(v)}</b>` : ''}</span>`);
    });
    // Mobil: všetky fotky v jednom rade majú rovnakú výšku (podľa najširšej), aby pod nižšími nezostávalo prázdne miesto
    function rowHeights() {
        const vw = window.innerWidth;
        $$('.g-track').forEach(tr => {
            if (vw > 700) { tr.style.removeProperty('--gh'); return; }
            const ars = $$('.g-item', tr).filter(it => !it.hidden).map(it => it.dataset.w / it.dataset.h);
            if (!ars.length) return;
            const gh = Math.min(window.innerHeight * .52, vw * 1.08), fit = Math.min(...ars.map(ar => vw * .9 / ar));
            tr.style.setProperty('--gh', Math.round(Math.max(260, Math.min(gh, fit))) + 'px');
        });
    }
    rowHeights();
    { let lw = window.innerWidth; window.addEventListener('resize', () => { if (window.innerWidth !== lw) { lw = window.innerWidth; rowHeights(); } }, { passive: true }); }
    // kategórie sa jemne objavia, raz
    if (!reduced) {
        const rvObs = new IntersectionObserver((entries) => entries.forEach(en => {
            if (en.isIntersecting) { en.target.classList.add('in'); rvObs.unobserve(en.target); }
        }), { threshold: 0.1 });
        $$('.g-cat').forEach(el => { el.classList.add('rv'); rvObs.observe(el); });
    }
    // karusely: šípky posúvajú o kúsok menej ako šírku, na koncoch zhasnú
    $$('.g-cat').forEach(cat => {
        const track = $('.g-track', cat), prev = $('.g-prev', cat), next = $('.g-next', cat);
        if (!prev) return;
        const sync = () => {
            prev.disabled = track.scrollLeft < 8;
            next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
        };
        const step = (dir) => track.scrollBy({ left: dir * Math.max(track.clientWidth * 0.8, 240), behavior: reduced ? 'auto' : 'smooth' });
        prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
        let st = 0; track.addEventListener('scroll', () => { cancelAnimationFrame(st); st = requestAnimationFrame(sync); }, { passive: true });
        window.addEventListener('resize', sync, { passive: true });
        sync();
    });

    /* ── Zvuk vesmíru (stiahne sa až po kliknutí) ── */
    const audio = $('#bg-audio'), soundBtn = $('#sound-btn');
    soundBtn.addEventListener('click', () => {
        if (audio.paused) { audio.play().then(() => soundBtn.setAttribute('aria-pressed', 'true')).catch(() => {}); }
        else { audio.pause(); soundBtn.setAttribute('aria-pressed', 'false'); }
    });

    /* ── Ceny tlače ── */
    const PRICES = {
        standard: { A3: 45, A2: 75, A1: 105, A0: 155 },   // Foto papier, Fine Art, Plátno
        premium:  { A2: 125, A1: 175, A0: 250 }           // PVC, Hliník
    };
    const MATERIALS = [
        { group: 'Časopriestor (štandard)', items: [['paper', 'Foto papier'], ['fineart', 'Fine Art'], ['canvas', 'Plátno']] },
        { group: 'Hviezdny prach (prémium)', items: [['pvc', 'PVC tabuľa, bez rámu'], ['alu', 'Hliník Dibond, bez rámu']] }
    ];

    /* ── NASTAVENIA, ktoré si upravíte sami ──
       XMAS_DEADLINE: posledný deň objednávky, aby obraz prišiel do Vianoc (pri dodaní 7 až 14 dní). Po tomto dni sa pruh skryje.
       PAY_LINKS: platobné odkazy zo Stripe (Payment Links) podľa sumy na úhradu v eurách. Ak suma objednávky
       alebo poukazu sedí s niektorým odkazom, po odoslaní sa ukáže tlačidlo „Zaplatiť kartou“. Inak ostáva platba podľa e-mailu.
       Príklad: const PAY_LINKS = { 45: 'https://buy.stripe.com/abc123', 75: 'https://buy.stripe.com/def456', 50: 'https://buy.stripe.com/ghi789' }; */
    const XMAS_DEADLINE = '2026-12-10';
    const XMAS_BAND_FROM = '2026-11-15';   // od tohto dňa sa pod úvodom ukáže vianočný pás (náhľad: pridajte ?vianoce do adresy)
    const PAY_LINKS = {};

    /* ── Termín na Vianoce ── */
    {
        const end = new Date(XMAS_DEADLINE + 'T23:59:59'), now = new Date();
        const show = now <= end && now >= new Date(end.getFullYear(), 9, 1);
        const dTxt = end.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' }).replace(/\s/g, '\u00a0');
        const left = Math.ceil((end - now) / 864e5);
        $$('[data-xmas]').forEach(el => {
            if (!show) return;
            el.innerHTML = `Obraz pod stromček: objednajte do <b>${esc(dTxt)}</b>${left <= 21 ? `, zostáva ${left} ${left === 1 ? 'deň' : left < 5 ? 'dni' : 'dní'}` : ''}.`;
            el.hidden = false;
        });
        window.__xmas = show ? dTxt : '';
        const band = $('[data-xmas-band]');
        if (band && show && (now >= new Date(XMAS_BAND_FROM + 'T00:00:00') || new URLSearchParams(location.search).has('vianoce'))) {
            $('.xb-t', band).innerHTML = `Pod stromček: objednajte do <b>${esc(dTxt)}</b>${left <= 21 ? `, zostáva ${left} ${left === 1 ? 'deň' : left < 5 ? 'dni' : 'dní'}` : ''}.`;
            band.hidden = false;
        }
    }

    /* ── Zľava z hry: prepíše ceny v galérii aj v detaile obrazu ── */
    let disc = Number(store.get('astroPerc')) || 0;
    const after = (n) => Math.round(n * (1 - disc / 100));
    function applyDiscount(code, animate) {
        if (!disc) return;
        const box = $('#g-discount'), strip = $('#zaostri');
        if (strip) {   // pásik s hrou ostáva, po výhre ukazuje aktívny kód
            strip.classList.add('is-won');
            $('.gs-h', strip).textContent = `Zľava ${disc} % je aktívna`;
            $('.gs-s', strip).innerHTML = `Kód <b>${esc(code)}</b>. Ceny nižšie sú už po zľave.`;
            $('.gs-btn', strip).textContent = 'Pozrieť hru';
            box.hidden = true;
        } else {
            box.innerHTML = `Kód <b>${esc(code)}</b> je aktívny. Ceny nižšie sú už po ${disc} % zľave.`;
            box.hidden = false;
        }
        $$('.g-price').forEach((el, i) => {
            const base = Number(el.dataset.base);
            el.innerHTML = `<span class="g-old">${base} €</span>od ${after(base)} €`;
            el.style.setProperty('--sd', (0.25 + (i % 6) * 0.08).toFixed(2) + 's');
        });
        const gal = $('#galeria');
        if (!animate || reduced) { gal.classList.add('disc-on'); return; }
        // ceny sa preškrtnú, keď sa návštevník do galérie dostane
        const o = new IntersectionObserver((en) => { if (en[0].isIntersecting) { gal.classList.add('disc-on'); o.disconnect(); } }, { threshold: .15 });
        o.observe(gal);
    }

    /* ── Okno ── */
    const modal = $('#modal'), panel = $('#modal-panel'), mImg = $('#modal-img'), mInfo = $('#modal-info');
    let cycle = null, lastFocus = null;

    function showModal(withImage) {
        panel.classList.toggle('no-img', !withImage);
        mImg.hidden = !withImage;
        if (!modal.classList.contains('open')) lastFocus = document.activeElement;
        modal.classList.add('open'); body.classList.add('modal-open');
        mInfo.scrollTop = 0; panel.scrollTop = 0;
        setTimeout(() => $('.modal-close', modal).focus(), 50);
    }
    function closePanel() {
        if (cycle) { clearInterval(cycle); cycle = null; }
        const gn = document.querySelector('.focus-game'), gh = document.getElementById('game-holder');
        if (gn && gh && gn.parentElement !== gh) gh.appendChild(gn);   // hra sa vráti na svoje miesto
        modal.classList.remove('open'); body.classList.remove('modal-open');
        lastFocus?.focus?.({ preventScroll: true });
        try { if (location.hash.startsWith('#obraz-')) history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    }
    window.closePanel = closePanel;
    modal.addEventListener('click', (e) => { if (e.target === modal) closePanel(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePanel(); closeMenu(); } });

    const webpOK = (() => { try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { return false; } })();
    const pic = (u) => webpOK ? u.replace(/\.jpg$/, '.webp') : u;
    function setImages(src, title, thumb) {
        if (cycle) { clearInterval(cycle); cycle = null; }
        mImg.classList.remove('is-cover');
        const list = src.split(',').map(pic);
        // náhľad z galérie (už je v pamäti) hneď ako jemne rozostrený podklad, veľká fotka sa nad ním plynulo objaví po načítaní
        mImg.innerHTML = `${thumb ? `<img class="mi-lo" src="${esc(thumb)}" alt="" aria-hidden="true" onload="this.classList.add('in')">` : ''}<img class="mi" src="${esc(list[0])}" alt="${esc(title)}">`;
        const big = $('img.mi', mImg);
        const show = () => requestAnimationFrame(() => big.classList.add('in'));
        if (big.complete && big.naturalWidth) show();
        else big.addEventListener('load', () => (big.decode ? big.decode().catch(() => {}) : Promise.resolve()).then(show), { once: true });
        big.addEventListener('error', show, { once: true });
        if (list.length > 1 && !reduced) {
            let i = 0;
            cycle = setInterval(() => {
                const img = $('img.mi', mImg); if (!img) return;
                img.style.opacity = 0;
                setTimeout(() => { i = (i + 1) % list.length; img.src = list[i]; img.style.opacity = 1; }, 300);
            }, 2800);
        }
    }

    let yState = null;      // posledný výsledok z „Hviezda vášho roku“ (pre kartu a rezerváciu)
    const AFTER = {};       // čo sa spustí po otvorení panelu
    const PANELS = {
        starcard: () => `
            <h2 id="modal-title">Darčeková karta</h2>
            <p class="modal-sub">Hviezda vášho roku na papieri</p>
            <div class="field"><label for="card-who">Pre koho je karta (nepovinné)</label><input id="card-who" type="text" maxlength="28" placeholder="napríklad Jana" autocomplete="off"></div>
            <canvas class="card-cv" id="card-cv" width="1748" height="1240" role="img" aria-label="Náhľad darčekovej karty"></canvas>
            <div class="card-act"><button class="btn btn-star" type="button" id="card-print">Vytlačiť</button><button class="btn btn-ghost" type="button" id="card-save">Stiahnuť obrázok</button></div>
            <p class="modal-desc">Formát A6 na šírku. Vytlačíte ju doma, v tlačiarni, alebo ju pošlete v správe.</p>`,
        starshoot: () => {
            const st = yState; if (!st) return '<h2 id="modal-title">Fotenie s hviezdou</h2>';
            const body = `Dobrý deň, mám záujem o fotenie s mojou hviezdou ${st.name} (${st.k}).${st.plan ? `\nNavrhovaný termín: ${st.plan.date}, od ${st.plan.from}.` : ''}\nTyp fotenia: rande pod hviezdami / osobný portrét (nehodiace sa prečiarknite).\nĎakujem.`;
            return `
            <h2 id="modal-title">Fotenie s hviezdou ${esc(st.name)}</h2>
            <p class="modal-sub">${esc(st.con)}</p>
            ${st.plan ? `<p class="modal-desc">Najbližší vhodný večer je <b>${esc(st.plan.date)}</b>. Hviezda bude na oblohe od ${esc(st.plan.from)} ${esc(st.plan.to)}, hľadajte ju ${esc(st.plan.dir)}. Mesiac nebude rušiť.</p>` : ''}
            <dl class="pricing">
                <div><dt>Rande pod hviezdami</dt><dd>150 €</dd><p class="note">Fotenie pre páry.</p></div>
                <div><dt>Osobný portrét</dt><dd>100 €</dd><p class="note">Portrét jedného človeka.</p></div>
            </dl>
            <p class="modal-desc">Pokúsim sa vás odfotiť tak, aby bola hviezda v zábere. Presný termín potvrdíme podľa počasia. Ak bude zamračené, presunieme sa na ďalší nov.</p>
            <a class="btn btn-star" href="mailto:matejkakis@gmail.com?subject=${encodeURIComponent('Fotenie s hviezdou ' + st.name)}&body=${encodeURIComponent(body)}">Napísať e-mail s predvyplnenou správou</a>
            <a class="btn btn-ghost" href="tel:+421950592956">Zavolať 0950 592 956</a>`;
        },
        contact: () => `
            <h2 id="modal-title">Kontakt</h2>
            <p class="modal-desc">Odpovedám zvyčajne do 24 hodín.</p>
            <dl class="pricing">
                <div><dt>Telefón</dt><dd><a href="tel:+421950592956">0950 592 956</a></dd></div>
                <div><dt>E-mail</dt><dd><a href="mailto:matejkakis@gmail.com">matejkakis@gmail.com</a></dd></div>
                <div><dt>Instagram</dt><dd><a href="https://www.instagram.com/donor.astro" target="_blank" rel="noopener">donor.astro</a></dd></div>
            </dl>`,
        mentoring: () => `
            <h2 id="modal-title">Mentoring</h2>
            <p class="modal-sub">Staňte sa lovcom hviezd</p>
            <dl class="pricing">
                <div><dt>Štart</dt><dd>99 €</dd><p class="note">Základy, výber techniky, nastavenie fotoaparátu a prvé spracovanie. Pre začiatočníkov.</p></div>
                <div><dt>Masterclass</dt><dd>249 €</dd><p class="note">Snímanie so sledovaním oblohy, kalibrácia, skladanie a spracovanie v PixInsight a Photoshope.</p></div>
            </dl>
            <p class="modal-desc">Skrátim vám cestu, na ktorú som sám potreboval roky.</p>
            <button class="btn btn-star" type="button" onclick="openPanel('contact')">Mám záujem</button>`,
        zakazka: () => `
            <h2 id="modal-title">Vesmír na mieru</h2>
            <p class="modal-sub">Architektúra pod hviezdami</p>
            <dl class="pricing">
                <div><dt>Chata alebo dom</dt><dd>od 150 €</dd><p class="note">Vaša nehnuteľnosť s Mliečnou cestou nad ňou.</p></div>
                <div><dt>Hotel alebo podnik</dt><dd>od 350 €</dd><p class="note">Sada nočných exteriérových fotiek pre web a reklamu.</p></div>
            </dl>
            <button class="btn btn-star" type="button" onclick="openPanel('contact')">Nezáväzne dohodnúť</button>`,
        portret: () => `
            <h2 id="modal-title">Vesmír, osobne</h2>
            <p class="modal-sub">Vy a vesmír</p>
            <dl class="pricing">
                <div><dt>Rande pod hviezdami</dt><dd>150 €</dd><p class="note">Fotenie pre páry.</p></div>
                <div><dt>Osobný portrét</dt><dd>100 €</dd><p class="note">Portrét jedného človeka pod hviezdami.</p></div>
            </dl>
            <p class="modal-desc">Termín určí počasie a fáza Mesiaca.</p>
            <button class="btn btn-star" type="button" onclick="openPanel('contact')">Rezervovať termín</button>`,
        voucher: () => `
            <h2 id="modal-title">Darčekový poukaz</h2>
            <p class="modal-sub">Darujte vesmír</p>
            <form id="v-form" class="order-form" action="https://formspree.io/f/mnnellqk" method="POST">
                <input type="hidden" name="objednavka" id="v-details">
                <div class="field"><span class="v-lab" id="v-lab">Čo darujete</span>
                    <div class="v-types" role="radiogroup" aria-labelledby="v-lab">
                        <button type="button" role="radio" class="mat-c" data-t="obraz" aria-checked="true"><b>Obraz</b><small>Obdarovaný si vyberie z galérie</small><span>od 50 €</span></button>
                        <button type="button" role="radio" class="mat-c" data-t="rande" aria-checked="false"><b>Rande pod hviezdami</b><small>Fotenie pre páry</small><span>150 €</span></button>
                        <button type="button" role="radio" class="mat-c" data-t="portret" aria-checked="false"><b>Osobný portrét</b><small>Portrét jedného človeka pod hviezdami</small><span>100 €</span></button>
                    </div></div>
                <div class="field" id="v-sum-f"><label for="v-sum">Hodnota poukazu</label><select id="v-sum"><option value="50">50 €</option><option value="100">100 €</option><option value="150">150 €</option><option value="200">200 €</option></select></div>
                <div class="field"><label for="v-pre">Pre koho (nepovinné)</label><input id="v-pre" type="text" maxlength="28" autocomplete="off"></div>
                <div class="field"><label for="v-od">Od koho (nepovinné)</label><input id="v-od" type="text" maxlength="28" autocomplete="off"></div>
                <div class="field"><label for="v-msg">Krátky odkaz na poukaze (nepovinné)</label><textarea id="v-msg" rows="2" maxlength="110"></textarea></div>
                <canvas class="card-cv" id="v-cv" width="1748" height="1240" role="img" aria-label="Náhľad poukazu"></canvas>
                <p class="meta" id="v-meta" style="margin:0">Takto bude poukaz vyzerať. Kód doplním po úhrade a pošlem vám ho ako obrázok na tlač alebo do správy.</p>
                <div class="card-act" id="v-act" hidden><button class="btn btn-star" type="button" id="v-print">Vytlačiť</button><button class="btn btn-ghost" type="button" id="v-save">Stiahnuť obrázok</button></div>
                <div class="os" id="v-order" style="display:flex">
                    <div class="field"><label for="v-name">Vaše meno a priezvisko</label><input id="v-name" type="text" name="meno" autocomplete="name" required></div>
                    <div class="field"><label for="v-mail">E-mail</label><input id="v-mail" type="email" name="email" autocomplete="email" required></div>
                    <div class="field"><label for="v-tel">Telefón</label><input id="v-tel" type="tel" name="telefon" autocomplete="tel" required></div>
                    <label class="check"><input type="checkbox" required> ${LEGAL_OK}</label>
                    <button class="btn btn-star" type="submit">Objednať poukaz s povinnosťou platby</button>
                    <p class="meta" id="v-err" style="margin:0" role="alert" hidden></p>
                </div>
            </form>`,
        materials: () => `
            <h2 id="modal-title">Materiály</h2>
            <div class="materials">
                <h3>Časopriestor (štandard)</h3>
                <ul>
                    <li><b>Foto papier:</b> saténový polomatný povrch, živé farby, ekonomická voľba. Ideálne do klasických rámov.</li>
                    <li><b>Fine Art:</b> múzejná kvalita, 100 % bavlna, hlboká čierna a textúra. Životnosť cez 100 rokov.</li>
                    <li><b>Plátno:</b> klasický vzhľad maľby, napnuté na drevenom ráme.</li>
                </ul>
                <h3>Hviezdny prach (prémium)</h3>
                <ul>
                    <li><b>PVC tabuľa:</b> ľahká, odolná, moderný bezrámový vzhľad.</li>
                    <li><b>Hliník (Dibond):</b> extrémna ostrosť, odolnosť a jemný kovový odlesk. Obraz akoby plával na stene.</li>
                </ul>
            </div>
            <button class="btn btn-ghost" type="button" onclick="${lastProduct ? 'reopenProduct()' : 'closePanel()'}">${lastProduct ? 'Späť na obraz' : 'Zavrieť'}</button>`
    };

    // služby, ktoré majú v okne vlastnú fotku
    const PANEL_IMG = { zakazka: { src: 'assets/img/velke/zakazka-obloha.jpg', alt: 'Mliečna cesta nad zalesneným kopcom, nad chatou z fotky', cover: true } };
    window.openPanel = (type, opts = {}) => {
        if (!PANELS[type]) return;
        if (cycle) { clearInterval(cycle); cycle = null; }
        mImg.innerHTML = '';
        mInfo.innerHTML = PANELS[type](opts);
        const pi = PANEL_IMG[type];
        if (pi) setImages(pi.src, pi.alt);
        mImg.classList.toggle('is-cover', !!(pi && pi.cover));
        showModal(!!pi);
        if (AFTER[type]) AFTER[type](opts);
    };
    window.openStarCard = () => { if (yState) openPanel('starcard'); };
    window.openStarShoot = () => { if (yState) openPanel('starshoot'); };

    /* ── Darčeková karta: kreslí sa na plátno, tlačí sa a sťahuje ako obrázok ── */
    let logoImg = null;
    const loadLogo = () => new Promise(res => {
        if (logoImg) return res(logoImg);
        const im = new Image(); im.onload = () => res(logoImg = im); im.onerror = () => res(null); im.src = 'assets/img/donor-astro.png';
    });
    async function drawCard(cv, st, who, logo) {
        try { await Promise.all(['500 100px Fraunces', 'italic 400 40px Fraunces', '400 36px "Instrument Sans"', '600 30px "Instrument Sans"'].map(f => document.fonts.load(f))); } catch (e) {}
        const W = 1748, H = 1240, c = cv.getContext('2d');
        cv.width = W; cv.height = H;
        const bg = c.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#080A18'); bg.addColorStop(.55, '#120E2E'); bg.addColorStop(1, '#1D1450');
        c.fillStyle = bg; c.fillRect(0, 0, W, H);
        const neb = c.createRadialGradient(W * .78, H * .38, 20, W * .78, H * .38, 620);
        neb.addColorStop(0, 'rgba(141,107,255,.38)'); neb.addColorStop(.55, 'rgba(91,63,224,.14)'); neb.addColorStop(1, 'rgba(91,63,224,0)');
        c.fillStyle = neb; c.fillRect(0, 0, W, H);
        // hviezdy na pozadí: rovnaký rok dá vždy rovnakú oblohu
        let seed = (st.Y * 9301 + 49297) % 233280; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
        for (let i = 0; i < 320; i++) {
            const x = rnd() * W, y = rnd() * H, r = rnd() * 1.7 + .3;
            c.fillStyle = `rgba(236,234,228,${(.2 + rnd() * .6).toFixed(2)})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        }
        // „vaša“ hviezda
        const sx = W * .8, sy = H * .4;
        const gl = c.createRadialGradient(sx, sy, 0, sx, sy, 230);
        gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(.08, 'rgba(255,248,230,.95)'); gl.addColorStop(.25, 'rgba(184,164,255,.45)'); gl.addColorStop(1, 'rgba(141,107,255,0)');
        c.fillStyle = gl; c.fillRect(sx - 240, sy - 240, 480, 480);
        c.save(); c.translate(sx, sy); c.fillStyle = 'rgba(255,255,255,.85)';
        for (const [w, h] of [[3, 190], [190, 3]]) c.fillRect(-w / 2, -h / 2, w, h);
        c.restore();
        // rámik
        c.strokeStyle = 'rgba(184,164,255,.38)'; c.lineWidth = 3; c.strokeRect(52, 52, W - 104, H - 104);
        c.strokeStyle = 'rgba(232,182,90,.5)'; c.lineWidth = 1.5; c.strokeRect(66, 66, W - 132, H - 132);
        // text
        const X = 130, MAXW = 980; let y = 190;
        c.textBaseline = 'alphabetic'; c.fillStyle = '#B8A4FF'; c.font = '600 38px "Instrument Sans", sans-serif'; c.fillText(st.k, X, y);
        if (who) { y += 72; c.fillStyle = '#F2CA7E'; c.font = 'italic 400 46px Fraunces, Georgia, serif'; c.fillText('Pre ' + who, X, y); }
        y += 170;
        let fs = 160; c.fillStyle = '#ECEAE4';
        do { c.font = `500 ${fs}px Fraunces, Georgia, serif`; fs -= 6; } while (c.measureText(st.name).width > MAXW && fs > 60);
        c.fillText(st.name, X, y);
        y += 62; c.fillStyle = '#A5A8B8'; c.font = '400 42px "Instrument Sans", sans-serif'; c.fillText(st.con, X, y);
        y += 112; c.fillStyle = '#ECEAE4'; c.font = '400 49px "Instrument Sans", sans-serif';
        const words = st.txt.split(' '); let line = '';
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (c.measureText(t).width > MAXW && line) { c.fillText(line, X, y); y += 72; line = w; } else line = t;
        }
        if (line) c.fillText(line, X, y);
        // pätička
        c.fillStyle = '#A5A8B8'; c.font = '400 34px "Instrument Sans", sans-serif'; c.fillText('Kúsok Nekonečna  ·  kusoknekonecna.eu', X, H - 120);
        if (logo) { const lw = 300, lh = lw * (logo.naturalHeight / logo.naturalWidth); c.drawImage(logo, W - 130 - lw, H - 100 - lh, lw, lh); }
    }
    AFTER.starcard = async () => {
        const cv = $('#card-cv'), inp = $('#card-who'), st = yState; if (!cv || !st) return;
        const logo = await loadLogo(); let timer;
        const render = () => drawCard(cv, st, inp.value.trim(), logo);
        await render();
        inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 180); });
        const url = () => { try { return cv.toDataURL('image/png'); } catch (e) { return ''; } };
        $('#card-save').addEventListener('click', async () => {
            let u = url(); if (!u) { await drawCard(cv, st, inp.value.trim(), null); u = url(); }
            if (!u) return;
            const slug = (inp.value.trim() || st.name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const a = document.createElement('a'); a.href = u; a.download = `hviezda-${slug}-${st.Y}.png`; document.body.appendChild(a); a.click(); a.remove();
        });
        $('#card-print').addEventListener('click', async () => {
            let u = url(); if (!u) { await drawCard(cv, st, inp.value.trim(), null); u = url(); }
            if (!u) return;
            const im = document.createElement('img'); im.className = 'card-print'; im.alt = ''; im.src = u; body.appendChild(im);
            const clean = () => { im.remove(); window.removeEventListener('afterprint', clean); };
            window.addEventListener('afterprint', clean);
            im.decode?.().catch(() => {}).then(() => window.print());
        });
    };

    /* ── Odoslanie formulára bez opustenia stránky (Formspree vracia JSON) ── */
    async function sendForm(form) {
        try {
            const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
            return r.ok ? true : false;
        } catch (e) { return null; }     // sieť alebo CORS: nech to skúsi klasické odoslanie
    }
    // Prihlásenie e-mailu do MailerLite (skupina Hviezdopis). Odpoveď sa nedá prečítať (iná doména), preto sa na ňu nečaká.
    const ML_URL = 'https://assets.mailerlite.com/jsonp/2701803/forms/200975325896639532/subscribe';
    function mlSubscribe(email) {
        if (!email) return;
        const fd = new FormData(); fd.append('fields[email]', email); fd.append('ml-submit', '1'); fd.append('anticsrf', 'true');
        try { fetch(ML_URL, { method: 'POST', body: fd, mode: 'no-cors', keepalive: true }).catch(() => {}); } catch (e) {}
    }
    // Číslo objednávky: dátum a štyri znaky, napr. KN-261008-7QX2
    function orderNo() {
        const d = new Date(), p = (n) => String(n).padStart(2, '0');
        const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let r = ''; for (let i = 0; i < 4; i++) r += abc[Math.floor(Math.random() * abc.length)];
        return `KN-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${r}`;
    }
    function setOrder(form, no, subject) {
        const put = (name, v) => { let x = form.querySelector(`input[name="${name}"]`); if (!x) { x = document.createElement('input'); x.type = 'hidden'; x.name = name; form.prepend(x); } x.value = v; };
        put('cislo_objednavky', no); put('_subject', subject);
    }
    const LEGAL_OK = 'Oboznámil(a) som sa s <a href="obchodne-podmienky/" target="_blank" rel="noopener">obchodnými podmienkami</a> a <a href="ochrana-osobnych-udajov/" target="_blank" rel="noopener">spracúvaním osobných údajov</a>.';
    function thanks(title, text, amount, email, info) {
        const link = amount && PAY_LINKS[amount];
        const pay = link ? `<a class="btn btn-star" href="${esc(link)}${email ? `?prefilled_email=${encodeURIComponent(email)}` : ''}" target="_blank" rel="noopener">Zaplatiť kartou teraz (${amount} €)</a><p class="meta">Platba prebehne cez zabezpečenú bránu Stripe. Ak radšej prevodom, stačí počkať na e-mail.</p>` : '';
        const box = info ? `<div class="ty-box"><p class="ty-no">Číslo objednávky <b>${esc(info.no)}</b></p><ul>${info.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul><p class="ty-sum"><span>Spolu</span><b>${info.total} €</b></p></div>` : '';
        mInfo.innerHTML = `<h2 id="modal-title">${esc(title)}</h2><p class="modal-desc">${esc(text)}</p>${box}${pay}<button class="btn ${pay ? 'btn-ghost' : 'btn-star'}" type="button" onclick="closePanel()">Zavrieť</button>`;
        mInfo.scrollTop = 0; $('.modal-close', modal)?.focus();
    }

    /* ── Poukaz: náhľad sa kreslí na plátno, rovnako ako darčeková karta ── */
    const V_TYPES = { obraz: ['Obraz', 'na obraz z galérie Kúsok Nekonečna'], rande: ['Rande pod hviezdami', 'fotenie pre páry pod nočnou oblohou'], portret: ['Osobný portrét', 'portrét jedného človeka pod hviezdami'] };
    async function drawVoucher(cv, v, logo) {
        try { await Promise.all(['500 100px Fraunces', 'italic 400 40px Fraunces', '400 36px "Instrument Sans"', '600 30px "Instrument Sans"'].map(f => document.fonts.load(f))); } catch (e) {}
        const W = 1748, H = 1240, c = cv.getContext('2d'); cv.width = W; cv.height = H;
        const bg = c.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#080A18'); bg.addColorStop(.55, '#140F33'); bg.addColorStop(1, '#25175E'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
        const neb = c.createRadialGradient(W * .8, H * .36, 20, W * .8, H * .36, 640); neb.addColorStop(0, 'rgba(141,107,255,.4)'); neb.addColorStop(.55, 'rgba(91,63,224,.14)'); neb.addColorStop(1, 'rgba(91,63,224,0)'); c.fillStyle = neb; c.fillRect(0, 0, W, H);
        let seed = ((v.pre + v.od + v.typ).length * 7919 + 4801) % 233280; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
        for (let i = 0; i < 300; i++) { const x = rnd() * W, y = rnd() * H, r = rnd() * 1.7 + .3; c.fillStyle = `rgba(236,234,228,${(.2 + rnd() * .6).toFixed(2)})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
        // pásik meteoru
        const mg = c.createLinearGradient(W * .56, H * .12, W * .9, H * .3); mg.addColorStop(0, 'rgba(255,255,255,0)'); mg.addColorStop(1, 'rgba(255,255,255,.9)');
        c.strokeStyle = mg; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(W * .56, H * .12); c.lineTo(W * .9, H * .3); c.stroke();
        c.fillStyle = '#fff'; c.shadowColor = '#B8A4FF'; c.shadowBlur = 24; c.beginPath(); c.arc(W * .9, H * .3, 7, 0, 7); c.fill(); c.shadowBlur = 0;
        c.strokeStyle = 'rgba(184,164,255,.38)'; c.lineWidth = 3; c.strokeRect(52, 52, W - 104, H - 104); c.strokeStyle = 'rgba(232,182,90,.5)'; c.lineWidth = 1.5; c.strokeRect(66, 66, W - 132, H - 132);
        const X = 130, MAXW = 1180; let y = 190;
        c.fillStyle = '#B8A4FF'; c.font = '600 38px "Instrument Sans", sans-serif'; c.fillText('Darčekový poukaz', X, y);
        y += 190; const big = v.typ === 'obraz' ? `${v.sum} €` : V_TYPES[v.typ][0];
        let fs = 190; c.fillStyle = v.typ === 'obraz' ? '#F2CA7E' : '#ECEAE4';
        do { c.font = `500 ${fs}px Fraunces, Georgia, serif`; fs -= 8; } while (c.measureText(big).width > MAXW && fs > 70);
        c.fillText(big, X, y);
        y += 68; c.fillStyle = '#A5A8B8'; c.font = '400 42px "Instrument Sans", sans-serif'; c.fillText(V_TYPES[v.typ][1], X, y);
        // Venovanie ako krátky list: komu, odkaz v úvodzovkách a podpis vpravo, oddelené vzduchom aj tenkou linkou
        if (v.pre || v.msg || v.od) {
            const BW = 1040;                                   // užší stĺpec = príjemnejšia dĺžka riadku
            y += 70; c.strokeStyle = 'rgba(232,182,90,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(X, y); c.lineTo(X + 120, y); c.stroke();
            if (v.pre) { y += 92; c.fillStyle = '#F2CA7E'; c.font = 'italic 400 60px Fraunces, Georgia, serif'; c.fillText('Pre ' + v.pre, X, y); }
            if (v.msg) {
                c.font = '400 40px "Instrument Sans", sans-serif'; c.fillStyle = 'rgba(236,234,228,.92)';
                // zalomenie po slovách; príliš dlhé slovo sa rozdelí, nech nevybehne z poukazu
                const lines = []; let line = '';
                const push = (wd) => { const t = line ? line + ' ' + wd : wd; if (c.measureText(t).width <= BW) { line = t; return; }
                    if (line) { lines.push(line); line = ''; }
                    while (c.measureText(wd).width > BW) { let k = wd.length; while (k > 1 && c.measureText(wd.slice(0, k)).width > BW) k--; lines.push(wd.slice(0, k)); wd = wd.slice(k); }
                    line = wd; };
                ('„' + v.msg + '“').split(' ').forEach(push); if (line) lines.push(line);
                const shown = lines.slice(0, 3); if (lines.length > 3) shown[2] = shown[2].replace(/.{0,2}$/, '…');
                y += v.pre ? 74 : 92; shown.forEach((l, i) => { c.fillText(l, X, y + i * 58); }); y += (shown.length - 1) * 58;
            }
            if (v.od) { y += 84; c.fillStyle = '#B8A4FF'; c.font = 'italic 400 46px Fraunces, Georgia, serif'; c.textAlign = 'right'; c.fillText('Od ' + v.od, X + BW, y); c.textAlign = 'left'; }
        }
        c.fillStyle = '#A5A8B8'; c.font = '400 34px "Instrument Sans", sans-serif';
        c.fillText(`Kód poukazu: ${v.kod || 'doplním po úhrade'}`, X, H - 160); c.fillText('kusoknekonecna.eu  ·  0950 592 956', X, H - 112);
        if (logo) { const lw = 300, lh = lw * (logo.naturalHeight / logo.naturalWidth); c.drawImage(logo, W - 130 - lw, H - 100 - lh, lw, lh); }
    }
    AFTER.voucher = async () => {
        const form = $('#v-form'), cv = $('#v-cv'); if (!form) return;
        const q = new URLSearchParams(location.search), staff = q.has('kod');
        const st = { typ: V_TYPES[q.get('typ')] ? q.get('typ') : 'obraz', sum: ['50', '100', '150', '200'].includes(q.get('suma')) ? q.get('suma') : '50', pre: (q.get('pre') || '').slice(0, 28), od: (q.get('od') || '').slice(0, 28), msg: (q.get('sprava') || '').slice(0, 110), kod: (q.get('kod') || '').slice(0, 24) };
        $('#v-pre').value = st.pre; $('#v-od').value = st.od; $('#v-msg').value = st.msg; $('#v-sum').value = st.sum;
        const logo = await loadLogo(); let timer;
        const types = $$('.v-types .mat-c');
        const draw = () => { st.pre = $('#v-pre').value.trim(); st.od = $('#v-od').value.trim(); st.msg = $('#v-msg').value.trim().replace(/\s+/g, ' '); st.sum = $('#v-sum').value;
            types.forEach(b => b.setAttribute('aria-checked', String(b.dataset.t === st.typ))); $('#v-sum-f').hidden = st.typ !== 'obraz'; return drawVoucher(cv, st, logo); };
        types.forEach(b => b.addEventListener('click', () => { st.typ = b.dataset.t; draw(); }));
        ['#v-pre', '#v-od', '#v-msg'].forEach(id => $(id).addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(draw, 180); }));
        $('#v-sum').addEventListener('change', draw);
        await draw();
        if (staff) {   // režim prípravy hotového poukazu s kódom
            $('#v-order').hidden = true; $('#v-order').style.display = 'none'; $('#v-act').hidden = false; $('#v-meta').textContent = 'Poukaz s kódom je pripravený na tlač alebo uloženie.';
            const url = () => { try { return cv.toDataURL('image/png'); } catch (e) { return ''; } };
            $('#v-save').addEventListener('click', async () => { let u = url(); if (!u) { await drawVoucher(cv, st, null); u = url(); } if (!u) return; const a = document.createElement('a'); a.href = u; a.download = `poukaz-${st.kod || 'kusok-nekonecna'}.png`; document.body.appendChild(a); a.click(); a.remove(); });
            $('#v-print').addEventListener('click', async () => { let u = url(); if (!u) { await drawVoucher(cv, st, null); u = url(); } if (!u) return; const im = document.createElement('img'); im.className = 'card-print'; im.alt = ''; im.src = u; body.appendChild(im); const clean = () => { im.remove(); window.removeEventListener('afterprint', clean); }; window.addEventListener('afterprint', clean); im.decode?.().catch(() => {}).then(() => window.print()); });
            return;
        }
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const what = st.typ === 'obraz' ? `Obraz, hodnota ${st.sum} €` : `${V_TYPES[st.typ][0]}, ${st.typ === 'rande' ? 150 : 100} €`;
            const no = orderNo(); setOrder(form, no, `Poukaz ${no} (Kúsok Nekonečna)`);
            const link = `${location.origin === 'null' ? 'https://www.kusoknekonecna.eu' : location.origin}${location.pathname}?poukaz=1&typ=${st.typ}&suma=${st.sum}&pre=${encodeURIComponent(st.pre)}&od=${encodeURIComponent(st.od)}&sprava=${encodeURIComponent(st.msg)}&kod=`;
            $('#v-details').value = `OBJEDNÁVKA POUKAZU ${no}:\n${what}\nPre: ${st.pre || '-'}\nOd: ${st.od || '-'}\nOdkaz: ${st.msg || '-'}\n\nPoukaz s kódom vytvoríte tak, že za posledné "kod=" v odkaze doplníte kód:\n${link}`;
            const btn = $('#v-order button[type=submit]'); btn.disabled = true; btn.textContent = 'Odosielam…'; $('#v-err').hidden = true;
            const ok = await sendForm(form);
            const vDue = st.typ === 'obraz' ? Number(st.sum) : st.typ === 'rande' ? 150 : 100;
            if (ok === true) thanks('Ďakujem', PAY_LINKS[vDue] ? 'Objednávku poukazu som prijal. Môžete ho hneď zaplatiť kartou, alebo vám do 24 hodín pošlem údaje na prevod. Po úhrade dostanete hotový poukaz s kódom.' : 'Objednávku poukazu som prijal. Do 24 hodín vám pošlem e-mail s platobnými údajmi. Po úhrade dostanete hotový poukaz s kódom.', vDue, $('#v-mail').value, { no, lines: [`Darčekový poukaz: ${what}`], total: vDue });
            else if (ok === null) form.submit();
            else { btn.disabled = false; btn.textContent = 'Objednať poukaz s povinnosťou platby'; $('#v-err').textContent = 'Odoslanie sa nepodarilo. Skúste to znova, alebo zavolajte na 0950 592 956.'; $('#v-err').hidden = false; }
        });
    };
    // odkaz s pripraveným poukazom (?poukaz=1&kod=...) otvorí poukaz hneď po načítaní
    if (new URLSearchParams(location.search).has('poukaz')) window.addEventListener('load', () => setTimeout(() => openPanel('voucher'), 400));

    /* ── Detail obrazu ── */
    let lastProduct = null;
    function openProduct(p) {
        lastProduct = p;
        const small = window.matchMedia('(max-width: 700px)').matches && !p.src.includes(',') && p.thumb;
        setImages(small ? p.thumb : p.src, p.title, p.thumb);
        const opts = MATERIALS.map(g => `<optgroup label="${g.group}">${g.items.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</optgroup>`).join('');
        mInfo.innerHTML = `
            <h2 id="modal-title">${esc(p.title)}</h2>
            <p class="modal-desc">${p.desc}</p>
            <p class="p-links"><button class="link-btn share-btn" type="button" id="share-btn">Zdieľať tento obraz</button>${p.ig ? `<a class="ig-link" href="${esc(p.ig)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>Pozrieť na Instagrame</a>` : ''}</p>
            ${p.light ? `<div class="lightbox"><span class="lb-k">${esc(p.lyk || 'Svetlo k nám letelo')}${p.light !== 'zatiaľ nikdy' ? ` <b>${esc(p.light)}</b>` : ''}</span><span class="lb-t">${esc(p.fact || '')}</span></div>` : ''}
            <section class="step" aria-labelledby="st1"><h3 class="step-h" id="st1"><i>1</i>Materiál</h3>
                <div id="mat-cards"></div>
                <select id="mat-select" class="visually-hidden" tabindex="-1" aria-hidden="true">${opts}</select>
                <button class="link-btn" type="button" onclick="openPanel('materials')">Rozdiely medzi materiálmi</button></section>
            <section class="step" aria-labelledby="st2"><h3 class="step-h" id="st2"><i>2</i>Veľkosť</h3>
                <div class="size-grid" id="size-cards" role="radiogroup" aria-label="Veľkosť"></div>
                ${window.__xmas ? `<p class="xmas xmas-sm">Pod stromček: objednajte do <b>${esc(window.__xmas)}</b>. Doručenie 7 až 14 dní.</p>` : ''}
                <select id="size-select" class="visually-hidden" tabindex="-1" aria-hidden="true"></select></section>
            <section class="step" aria-labelledby="st3"><h3 class="step-h" id="st3"><i>3</i>Na vašej stene</h3>
            <div class="wall-bar">
                <div class="wall-tabs" role="tablist"><button type="button" role="tab" id="tab-room" aria-selected="true">Izba</button><label role="tab" id="tab-own" for="mw-file" aria-selected="false" tabindex="0">Vaša stena</label></div></div>
            <div class="wall" id="wall" data-scene="sofa">
                <svg class="wall-scene scene-komoda" viewBox="0 0 170 170" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <radialGradient id="kw" cx="30%" cy="15%" r="95%"><stop offset="0" stop-color="#ECE6DC"/><stop offset=".65" stop-color="#D3CBBE"/><stop offset="1" stop-color="#BDB3A4"/></radialGradient>
                        <linearGradient id="kb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A6446"/><stop offset="1" stop-color="#6B4B33"/></linearGradient>
                        <linearGradient id="ks" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EBDD"/><stop offset="1" stop-color="#DCCBB2"/></linearGradient>
                        <radialGradient id="kl" cx="50%" cy="10%" r="70%"><stop offset="0" stop-color="rgba(255,226,170,.55)"/><stop offset="1" stop-color="rgba(255,226,170,0)"/></radialGradient>
                    </defs>
                    <rect width="170" height="164" fill="url(#kw)"/>
                    <ellipse cx="128" cy="40" rx="34" ry="30" fill="url(#kl)"/>
                    <rect y="162" width="170" height="8" fill="#5A4231"/><rect y="159" width="170" height="3.5" fill="#E9E3D9"/>
                    <ellipse cx="85" cy="163" rx="64" ry="2.2" fill="rgba(0,0,0,.25)"/>
                    <path d="M33 142 L30 162 M137 142 L140 162" stroke="#3B2A1E" stroke-width="2.2" stroke-linecap="round"/>
                    <rect x="25" y="88.5" width="120" height="54" rx="1.5" fill="url(#kb)"/>
                    <rect x="24" y="86.5" width="122" height="3.2" rx="1" fill="#9A7253"/>
                    <path d="M65 92v47M105 92v47" stroke="rgba(0,0,0,.22)" stroke-width=".5"/>
                    <path d="M61 113v8M69 113v8M101 113v8M109 113v8" stroke="#D9C2A0" stroke-width=".9" stroke-linecap="round"/>
                    <path d="M126 86.5 l4 -3 h8 l4 3 Z" fill="#2F2A26"/><path d="M134 83.5 V58" stroke="#2F2A26" stroke-width="1"/>
                    <path d="M121 58 L147 58 L142 44 L126 44 Z" fill="url(#ks)"/>
                    <path d="M40 86.5 c-3 -2 -3 -12 0 -14 h7 c3 2 3 12 0 14 Z" fill="#5E7268"/>
                    <path d="M43.5 73 C42 62 37 55 33 50 M43.5 73 C45 63 49 58 53 52 M43.5 73 C43 60 44 52 45 45" stroke="#4E5B4C" stroke-width=".7" fill="none"/>
                </svg>
                <svg class="wall-scene scene-sofa" viewBox="7 4 226 226" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <radialGradient id="wl" cx="78%" cy="18%" r="85%"><stop offset="0" stop-color="#E9E2D6"/><stop offset=".6" stop-color="#CFC6B8"/><stop offset="1" stop-color="#B3A998"/></radialGradient>
                        <linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A5C45"/><stop offset="1" stop-color="#4E3A2C"/></linearGradient>
                        <linearGradient id="sf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E6A6B"/><stop offset="1" stop-color="#46504F"/></linearGradient>
                        <linearGradient id="cu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6F7C7C"/><stop offset="1" stop-color="#566262"/></linearGradient>
                    </defs>
                    <rect x="-12" y="-24" width="264" height="246" fill="url(#wl)"/>
                    <rect x="-12" y="220" width="264" height="20" fill="url(#fl)"/>
                    <rect x="-12" y="216" width="264" height="5" fill="#E7E1D7"/>
                    <ellipse cx="120" cy="223" rx="104" ry="4" fill="rgba(0,0,0,.28)"/>
                    <rect x="30" y="210" width="4" height="10" rx="1" fill="#2E2219"/><rect x="206" y="210" width="4" height="10" rx="1" fill="#2E2219"/>
                    <rect x="22" y="184" width="196" height="28" rx="4" fill="url(#sf)"/>
                    <rect x="32" y="140" width="176" height="48" rx="8" fill="url(#sf)"/>
                    <rect x="36" y="145" width="54" height="40" rx="7" fill="url(#cu)"/><rect x="93" y="145" width="54" height="40" rx="7" fill="url(#cu)"/><rect x="150" y="145" width="54" height="40" rx="7" fill="url(#cu)"/>
                    <rect x="36" y="180" width="168" height="14" rx="5" fill="#6A7676"/>
                    <path d="M92 180v14M148 180v14" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>
                    <rect x="16" y="166" width="22" height="46" rx="7" fill="#525D5D"/><rect x="202" y="166" width="22" height="46" rx="7" fill="#525D5D"/>
                    <rect x="152" y="160" width="26" height="22" rx="6" fill="#B58A5A" transform="rotate(-8 165 171)"/>
                </svg>
                <div class="wall-print" id="wall-print" style="background-image:url('${esc(p.thumb)}')"></div>
                <span class="wall-cap" id="wall-cap"></span>
            </div>
            <div class="mywall" id="mywall" hidden>
                <div class="mw-stage" id="mw-stage"><img id="mw-img" alt="Vaša stena">
                    <div class="mw-print" id="mw-print" style="background-image:url('${esc(p.thumb)}')" aria-label="Obraz, dá sa posúvať"></div>
                    <div class="mw-line" id="mw-line"><span id="mw-len"></span></div>
                    <button type="button" class="mw-h" data-h="1" aria-label="Začiatok čiary"></button><button type="button" class="mw-h" data-h="2" aria-label="Koniec čiary"></button>
                </div>
                <div class="mw-tools">
                    <label class="mw-cm">Fialová čiara meria <input id="mw-cm" type="number" min="10" max="2000" inputmode="numeric"> cm</label>
                    <p class="mw-hint">Natiahnite čiaru cez niečo, čoho šírku poznáte, napríklad pohovku alebo dvere. Obraz potiahnite tam, kde má visieť. Fotka zostáva len vo vašom zariadení.</p>
                    <label class="link-btn mw-new">Vybrať inú fotku<input type="file" accept="image/*" id="mw-file2" class="visually-hidden" tabindex="-1"></label>
                </div>
            </div>
            <div class="wall-sizes" id="wall-sizes" role="radiogroup" aria-label="Veľkosť obrazu na stene"></div>
            <input type="file" accept="image/*" id="mw-file" class="visually-hidden" tabindex="-1">
            </section>
            <div class="buy-bar" id="buy-bar">
                <div class="buy-sum"><span class="buy-what" id="buy-what"></span><span class="price-now" id="price-now"></span></div>
                <button class="btn btn-star" type="button" id="add-btn">Vložiť do košíka</button>
            </div>`;
        const mat = $('#mat-select'), size = $('#size-select'), priceNow = $('#price-now');
        const MAT_NOTE = {
            paper: 'Saténový polomatný povrch, živé farby', fineart: 'Múzejná bavlna, hlboká čierna',
            canvas: 'Ako maľba, napnuté na drevenom ráme', pvc: 'Ľahká tabuľa, moderný bezrámový vzhľad', alu: 'Extrémna ostrosť, obraz akoby plával na stene'
        };
        const isPrem = (v) => v === 'pvc' || v === 'alu';
        const fromPrice = (v) => Math.min(...Object.values(isPrem(v) ? PRICES.premium : PRICES.standard));
        $('#mat-cards').innerHTML = MATERIALS.map(g => `<div class="mat-grp"><p class="mat-gl">${g.group}</p><div class="mat-row" role="radiogroup" aria-label="${g.group}">${g.items.map(([v, l]) =>
            `<button type="button" role="radio" class="mat-c" data-v="${v}" aria-checked="false"><b>${l}</b><small>${MAT_NOTE[v]}</small><span>od ${fromPrice(v)} €</span></button>`).join('')}</div></div>`).join('');
        $$('.mat-c').forEach(b => b.addEventListener('click', () => { mat.value = b.dataset.v; fill(); }));
        function fill() {
            const list = isPrem(mat.value) ? PRICES.premium : PRICES.standard;
            const keep = size.value;
            size.innerHTML = Object.entries(list).map(([s, pr]) => `<option value="${s}" data-price="${pr}">${s}, ${pr} €</option>`).join('');
            if ([...size.options].some(o => o.value === keep)) size.value = keep;
            $('#size-cards').innerHTML = Object.entries(list).map(([s, pr]) => {
                const [a, b] = dimOf(s);
                return `<button type="button" role="radio" class="size-c" data-v="${s}" aria-checked="false"><b>${s}</b><small>${cmTxt(a)} × ${cmTxt(b)} cm</small><span>${disc ? `<s>${pr} €</s> ${after(pr)} €` : `${pr} €`}</span></button>`;
            }).join('');
            $('#wall-sizes').innerHTML = Object.keys(list).map(s => {
                const [a, b] = dimOf(s);
                return `<button type="button" role="radio" class="ws-c" data-v="${s}" aria-checked="false"><b>${s}</b><small>${cmTxt(a)} × ${cmTxt(b)}</small></button>`;
            }).join('');
            $$('.size-c, .ws-c').forEach(b => b.addEventListener('click', () => { size.value = b.dataset.v; show(); }));
            show();
        }
        // Rozmery tlače v cm (ISO A). Scéna má 240 × 240 cm: podlaha 20 cm, pohovka 200 cm, obraz visí 13 cm nad ňou.
        const DIM = { A3: [29.7, 42], A2: [42, 59.4], A1: [59.4, 84.1], A0: [84.1, 118.9] };
        const portrait = Number(p.h) >= Number(p.w);
        const cmTxt = (n) => String(n).replace('.', ',');
        const dimOf = (sz) => { const [a, b] = DIM[sz] || DIM.A2; return portrait ? [a, b] : [b, a]; };
        const printCm = () => dimOf(size.value);
        // Dve izby v pevnej mierke: menšie formáty nad komodou (120 cm), väčšie nad pohovkou (200 cm)
        const SCENES = {
            komoda: { V: 170, floorY: 162, hang: 93, label: 'nad komodou (120 cm)' },
            sofa:   { V: 226, floorY: 216, hang: 90, label: 'nad pohovkou (200 cm)' }
        };
        function drawWall() {
            const pr = $('#wall-print'); if (!pr) return;
            const [w, h] = printCm();
            const key = 'sofa', sc = SCENES[key];   // jedna izba v pevnej mierke, aby bol rozdiel medzi formátmi vidno
            $('#wall').dataset.scene = key;
            pr.style.width = (w / sc.V * 100).toFixed(2) + '%';
            pr.style.height = (h / sc.V * 100).toFixed(2) + '%';
            pr.style.left = ((sc.V / 2 - w / 2) / sc.V * 100).toFixed(2) + '%';
            pr.style.bottom = ((sc.V - (sc.floorY - sc.hang)) / sc.V * 100).toFixed(2) + '%';
            // rám podľa materiálu: papier v tenkom ráme (2 cm), plátno na hlbokom ráme, PVC a hliník bez rámu
            const m = mat.value, framed = m === 'paper' || m === 'fineart';
            pr.className = 'wall-print ' + (framed ? 'm-frame' : m === 'canvas' ? 'm-canvas' : m === 'alu' ? 'm-alu' : 'm-flat');
            pr.style.borderWidth = framed ? (2 / sc.V * 100).toFixed(2) + 'cqi' : '0';
            $('#wall-cap').textContent = `${size.value}: ${cmTxt(w)} × ${cmTxt(h)} cm, ${sc.label}`;
            drawMine();
        }

        /* Vaša stena: vlastná fotka, mierka podľa čiary cez známy predmet */
        const mw = $('#mywall'), stage = $('#mw-stage'), mImgEl = $('#mw-img'), mPrint = $('#mw-print'), mLine = $('#mw-line'), cmIn = $('#mw-cm');
        const tabRoom = $('#tab-room'), tabOwn = $('#tab-own'), wallEl = $('#wall');
        function setMode(own) {
            tabRoom.setAttribute('aria-selected', String(!own)); tabOwn.setAttribute('aria-selected', String(own));
            wallEl.hidden = own; mw.hidden = !own;
            if (own) requestAnimationFrame(drawMine);
        }
        function loadFile(f) {
            if (!f || !f.type.startsWith('image/')) return;
            if (myWall.url) URL.revokeObjectURL(myWall.url);
            myWall.url = URL.createObjectURL(f);
            mImgEl.onload = () => { setMode(true); };
            mImgEl.src = myWall.url;
        }
        $('#mw-file').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
        $('#mw-file2').addEventListener('change', (e) => { loadFile(e.target.files[0]); e.target.value = ''; });
        tabRoom.addEventListener('click', () => setMode(false));
        tabOwn.addEventListener('click', (e) => { if (myWall.url) { e.preventDefault(); setMode(true); } });
        tabOwn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tabOwn.click(); } });
        cmIn.value = myWall.cm;
        cmIn.addEventListener('input', () => { const v = Number(cmIn.value); if (v >= 10) { myWall.cm = v; drawMine(); } });
        function drawMine() {
            if (!mw || mw.hidden || !stage.clientWidth) return;
            const W = stage.clientWidth, H = stage.clientHeight, R = myWall.r;
            const x1 = R[0] * W, y1 = R[1] * H, x2 = R[2] * W, y2 = R[3] * H;
            const len = Math.hypot(x2 - x1, y2 - y1), pxcm = len / myWall.cm;
            mLine.style.left = x1 + 'px'; mLine.style.top = y1 + 'px'; mLine.style.width = len + 'px';
            mLine.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
            $('#mw-len').textContent = `${myWall.cm} cm`;
            $$('.mw-h', stage).forEach(hd => { const i = hd.dataset.h === '1' ? 0 : 2; hd.style.left = R[i] * W + 'px'; hd.style.top = R[i + 1] * H + 'px'; });
            const [w, h] = printCm();
            mPrint.style.width = w * pxcm + 'px'; mPrint.style.height = h * pxcm + 'px';
            mPrint.style.left = myWall.p[0] * W + 'px'; mPrint.style.top = myWall.p[1] * H + 'px';
        }
        // ťahanie úchytov čiary aj obrazu
        function drag(el, onMove) {
            el.addEventListener('pointerdown', (e) => {
                e.preventDefault(); el.setPointerCapture(e.pointerId);
                const r = stage.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
                const start = onMove(null);
                const mv = (ev) => onMove(start, (ev.clientX - sx) / r.width, (ev.clientY - sy) / r.height);
                const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
                el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
            });
        }
        const clamp01 = (v) => Math.max(0, Math.min(1, v));
        $$('.mw-h', stage).forEach(hd => {
            const i = hd.dataset.h === '1' ? 0 : 2;
            drag(hd, (st, dx, dy) => { if (!st) return [myWall.r[i], myWall.r[i + 1]]; myWall.r[i] = clamp01(st[0] + dx); myWall.r[i + 1] = clamp01(st[1] + dy); drawMine(); });
        });
        drag(mPrint, (st, dx, dy) => { if (!st) return [...myWall.p]; myWall.p = [clamp01(st[0] + dx), clamp01(st[1] + dy)]; drawMine(); });
        if (myWall.url) { mImgEl.src = myWall.url; }
        function show() {
            const pr = Number(size.selectedOptions[0].dataset.price);
            priceNow.innerHTML = disc ? `${after(pr)} € <s>${pr} €</s><small>Ušetríte ${pr - after(pr)} € ${/^HVIEZDOPIS/.test(store.get('astroCode') || '') ? 'zľavou z Hviezdopisu' : 'zľavou z hry'}</small>` : `${pr} €`;
            $$('.mat-c').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === mat.value)));
            $$('.size-c, .ws-c').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === size.value)));
            const [w, h] = printCm();
            $('#buy-what').textContent = `${mat.selectedOptions[0].textContent}, ${size.value} (${cmTxt(w)} × ${cmTxt(h)} cm)`;
            drawWall();
        }
        fill();
        $('#add-btn').addEventListener('click', () => {
            cart.push({ title: p.title, material: mat.selectedOptions[0].textContent, size: size.value, price: Number(size.selectedOptions[0].dataset.price) });
            const from = $('#add-btn').getBoundingClientRect();
            closePanel();
            flyToCart(from, () => { saveCart(); toast(`${p.title} je v košíku.`); });
        });
        $('#share-btn').addEventListener('click', async () => {
            const url = `${SITE}obraz/${p.slug}/`;
            try { if (navigator.share) { await navigator.share({ title: `${p.title} | Kúsok Nekonečna`, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
            try { await navigator.clipboard.writeText(url); toast('Odkaz na obraz je skopírovaný.'); }
            catch (e) { window.prompt('Skopírujte odkaz na obraz:', url); }
        });
        showModal(true);
        try { history.replaceState(null, '', '#obraz-' + p.slug); } catch (_) {}
        requestAnimationFrame(drawWall);
    }
    const myWall = { url: '', cm: 200, r: [0.2, 0.8, 0.8, 0.8], p: [0.5, 0.38] };   // pamätá sa medzi obrazmi
    window.addEventListener('resize', () => { const st = $('#mw-stage'); if (st && !$('#mywall').hidden) { const e = new Event('input'); $('#mw-cm')?.dispatchEvent(e); } }, { passive: true });
    window.reopenProduct = () => lastProduct && openProduct(lastProduct);
    const SITE = 'https://www.kusoknekonecna.eu/';
    const slugify = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    $$('.g-item').forEach(btn => { btn.dataset.slug = slugify(btn.dataset.title); });
    function openFromHash() {
        const m = location.hash.match(/^#obraz-(.+)$/); if (!m) return;
        const it = $$('.g-item').find(b => b.dataset.slug === decodeURIComponent(m[1])); if (it) it.click();
    }
    window.addEventListener('hashchange', openFromHash);
    window.addEventListener('load', () => setTimeout(openFromHash, 350));
    $$('.g-item').forEach(btn => btn.addEventListener('click', () => openProduct({ slug: btn.dataset.slug, title: btn.dataset.title, desc: btn.dataset.desc, src: btn.dataset.src, thumb: $('img', btn).currentSrc || $('img', btn).getAttribute('src'), w: btn.dataset.w, h: btn.dataset.h, light: btn.dataset.light, lyk: btn.dataset.lyk, fact: btn.dataset.fact, ig: btn.dataset.ig })));

    /* ── Meteor do košíka ── */
    function flyToCart(from, done) {
        const cartBtn = $('.cart-btn');
        const to = cartBtn.getBoundingClientRect();
        if (reduced || !to.width) { done(); return; }
        const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2;
        const x2 = to.left + to.width / 2, y2 = to.top + to.height / 2;
        // oblúk: meteor vyletí nahor a padá do košíka
        const x1 = x0 + (x2 - x0) * 0.25, y1 = Math.min(y0, y2) - 160;
        const m = document.createElement('div'); m.className = 'meteor'; m.innerHTML = '<i></i><b></b>'; body.appendChild(m);
        const tail = $('i', m), T = 820, t0 = performance.now();
        const pt = (t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * x1 + t * t * x2, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * y1 + t * t * y2];
        (function fr(now) {
            const k = Math.min(1, (now - t0) / T), t = k * k * (1.6 - 0.6 * k);   // zrýchľuje ako pri páde
            const [x, y] = pt(t), [xa, ya] = pt(Math.max(0, t - 0.03));
            m.style.transform = `translate(${x}px, ${y}px)`;
            tail.style.transform = `rotate(${Math.atan2(y - ya, x - xa)}rad) scaleX(${(0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, k * 1.2))).toFixed(2)})`;
            if (k < 1) { requestAnimationFrame(fr); return; }
            m.remove();
            cartBtn.classList.remove('hit'); void cartBtn.offsetWidth; cartBtn.classList.add('hit');
            for (let i = 0; i < 10; i++) {
                const sp = document.createElement('span'); sp.className = 'cart-burst';
                const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 22;
                sp.style.left = x2 + 'px'; sp.style.top = y2 + 'px';
                sp.style.setProperty('--bx', Math.cos(a) * r + 'px'); sp.style.setProperty('--by', Math.sin(a) * r + 'px');
                body.appendChild(sp); setTimeout(() => sp.remove(), 650);
            }
            done();
        })(t0);
    }

    /* ── Košík ── */
    const SHIP = 5;        // poštovné za celú objednávku (poukaz je elektronický, bez poštovného)
    const GIFT_WRAP = 4;   // darčekové balenie so stuhou, raz za objednávku
    let cart = [];
    try { cart = JSON.parse(sessionStorage.getItem('kn-cart') || '[]'); } catch (_) { cart = []; }
    function saveCart() {
        try { sessionStorage.setItem('kn-cart', JSON.stringify(cart)); } catch (_) {}
        const c = $('#cart-count'); c.textContent = cart.length; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    }
    $('#cart-count').textContent = cart.length;

    const toastEl = $('#toast'); let toastT = null;
    function toast(msg) { $('#toast-text').textContent = msg; toastEl.classList.add('visible'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('visible'), 4000); }

    window.removeFromCart = (i) => { cart.splice(i, 1); saveCart(); openCart(); };
    window.openCart = () => {
        toastEl.classList.remove('visible');
        if (cycle) { clearInterval(cycle); cycle = null; }
        mImg.innerHTML = '';
        if (!cart.length) {
            mInfo.innerHTML = `<h2 id="modal-title">Košík</h2><p class="modal-desc">Košík je zatiaľ prázdny. Vyberte si obraz v galérii.</p>
                <a class="btn btn-star" href="#galeria" onclick="closePanel()">Prejsť do galérie</a>`;
            showModal(false); return;
        }
        // Zľava z hry platí len na obrazy, poštovné sa platí raz za objednávku
        const isNb = (it) => it.kind === 'nb';
        const art = cart.filter(it => !isNb(it)).reduce((a, b) => a + b.price, 0);
        const nbSum = cart.filter(isNb).reduce((a, b) => a + b.price, 0);
        const nbCount = cart.filter(isNb).reduce((a, b) => a + nbQty(b), 0), nbOff = nbBundle(nbCount);
        const code = art ? store.get('astroCode') : null, perc = store.get('astroPerc');
        const artPay = code ? after(art) : art, saved = art - artPay;
        const linePrice = (it) => (code && !isNb(it)) ? after(it.price) : it.price;
        // darček: kartička s venovaním zadarmo, balenie so stuhou za príplatok (raz za objednávku)
        const g = { on: cart.some(it => it.gift), wrap: cart.some(it => it.wrap), ded: (cart.find(it => it.ded) || {}).ded || '' };
        const calc = () => { const extra = g.on && g.wrap ? GIFT_WRAP : 0; return { extra, total: art + nbSum - nbOff + SHIP + extra, pay: artPay + nbSum - nbOff + SHIP + extra }; };
        const sumHtml = () => { const c = calc(); return `${art ? `<div><span>Obrazy</span><span>${art} €</span></div>` : ''}${code ? `<div class="sum-save"><span>Zľava ${esc(code)} (${esc(perc)} %)</span><span>−${saved} €</span></div>` : ''}${nbSum ? `<div><span>Hviezdopis</span><span>${nbSum} €</span></div>` : ''}${nbOff ? `<div class="sum-save"><span>Zľava za ďalší Hviezdopis</span><span>−${nbOff} €</span></div>` : ''}${c.extra ? `<div><span>Darčekové balenie</span><span>${GIFT_WRAP} €</span></div>` : ''}<div><span>Poštovné</span><span>${SHIP} €</span></div>
            <div class="sum-total"><span>${code ? 'K úhrade' : 'Spolu'}</span><span>${c.pay} €</span></div>`; };
        const renderSums = () => $$('.sum-rows[data-sum]', mInfo).forEach(x => { x.innerHTML = sumHtml(); });
        const giftTxt = () => g.on ? `Darček${g.wrap ? ', darčekové balenie' : ''}${g.ded ? `, venovanie: „${g.ded}“` : ', bez venovania'}` : '';
        mInfo.innerHTML = `
            <h2 id="modal-title">Košík</h2>
            <ol class="steps" aria-label="Postup objednávky"><li class="is-cur" data-s="1">Košík</li><li data-s="2">Doručenie</li><li data-s="3">Zhrnutie</li></ol>
            <form action="https://formspree.io/f/mnnellqk" method="POST" id="order-form" class="order-form">
                <input type="hidden" name="_subject" class="f-subj" value="Objednávka (Kúsok Nekonečna)">
                <input type="hidden" name="cislo_objednavky" class="f-no">
                <input type="hidden" name="objednavka" id="order-details">
                <section class="os" data-s="1">
                    <ul class="cart-list">${cart.map((it, i) => `<li><div>${esc(it.title)}<small>${esc(it.material)}, ${esc(it.size)}</small></div>
                        <div style="text-align:right">${(code && !isNb(it)) ? `<s class="cl-old">${it.price} €</s> ${after(it.price)} €` : `${it.price} €`}<br><button class="cart-remove" type="button" onclick="removeFromCart(${i})">Odstrániť</button></div></li>`).join('')}</ul>
                    <div class="gift-opt">
                        <label class="check"><input type="checkbox" id="o-gift"${g.on ? ' checked' : ''}> Je to darček</label>
                        <div class="gift-more" id="o-gift-f"${g.on ? '' : ' hidden'}>
                            <div class="field"><label for="o-ded">Venovanie na kartičku <span class="opt">(nepovinné)</span></label><textarea id="o-ded" rows="2" maxlength="240" placeholder="Napríklad: Pre Janku, nech má doma kúsok nekonečna.">${esc(g.ded)}</textarea></div>
                            <label class="check"><input type="checkbox" id="o-wrap"${g.wrap ? ' checked' : ''}> Darčekové balenie: papier so stuhou (+${GIFT_WRAP} €)</label>
                            <p class="meta" style="margin:0">Kartičku s venovaním priložím ku každému darčeku. Cenu v balíku nenájdete.</p>
                        </div>
                    </div>
                    <div class="sum-rows" data-sum></div>
                    ${window.__xmas ? `<p class="xmas xmas-sm">Pod stromček: objednajte do <b>${esc(window.__xmas)}</b>. Doručenie 7 až 14 dní.</p>` : ''}
                    <div class="cs-act"><a class="link-btn" href="#galeria" onclick="closePanel()">Pridať ďalší obraz</a><button class="btn btn-star" type="button" data-go="2">Pokračovať k doručeniu</button></div>
                </section>
                <section class="os" data-s="2" hidden>
                    <div class="field"><label for="o-name">Meno a priezvisko</label><input id="o-name" type="text" name="meno" autocomplete="name" required></div>
                    <div class="field"><label for="o-mail">E-mail</label><input id="o-mail" type="email" name="email" autocomplete="email" required></div>
                    <div class="field"><label for="o-tel">Telefón</label><input id="o-tel" type="tel" name="telefon" autocomplete="tel" required></div>
                    <div class="field"><label for="o-adr">Adresa doručenia</label><textarea id="o-adr" name="adresa" rows="3" autocomplete="street-address" required></textarea></div>
                    <div class="cs-act"><button class="btn btn-ghost" type="button" data-go="1">Späť</button><button class="btn btn-star" type="button" data-go="3">Pokračovať na zhrnutie</button></div>
                </section>
                <section class="os" data-s="3" hidden>
                    <p class="cs-k">Objednávka <button class="link-btn" type="button" data-go="1">Upraviť</button></p>
                    <ul class="cart-list" id="sum-items"></ul>
                    <p class="sum-gift" id="sum-gift" hidden></p>
                    <div class="sum-rows" data-sum></div>
                    <p class="cs-k">Doručenie <button class="link-btn" type="button" data-go="2">Upraviť</button></p>
                    <p class="sum-addr" id="sum-addr"></p>
                    <label class="check"><input type="checkbox" required> ${LEGAL_OK}</label>
                    <button class="btn btn-star" type="submit">Odoslať objednávku s povinnosťou platby</button>
                    <p class="meta" style="margin:0">Po odoslaní uvidíte číslo objednávky a do 24 hodín vám príde e-mail s platobnými údajmi.</p>
                </section>
            </form>`;
        const form = $('#order-form');
        renderSums();
        const gUpd = () => { g.on = $('#o-gift').checked; g.wrap = $('#o-wrap').checked; g.ded = $('#o-ded').value.trim(); $('#o-gift-f').hidden = !g.on; renderSums(); };
        ['#o-gift', '#o-wrap'].forEach(id => $(id).addEventListener('change', gUpd));
        $('#o-ded').addEventListener('input', () => { g.ded = $('#o-ded').value.trim(); });
        const goStep = (n) => {
            $$('.os', form).forEach(x => { x.hidden = x.dataset.s !== String(n); });
            $$('.steps li', mInfo).forEach(li => { const k = Number(li.dataset.s); li.classList.toggle('is-cur', k === n); li.classList.toggle('is-done', k < n); });
            mInfo.scrollTop = 0; panel.scrollTop = 0;
            const first = $('.os:not([hidden]) input, .os:not([hidden]) textarea', form) || $('.os:not([hidden]) .btn-star', form); first?.focus({ preventScroll: true });
        };
        $$('[data-go]', form).forEach(btn => btn.addEventListener('click', () => {
            const n = Number(btn.dataset.go);
            if (n === 3) {
                const f = $$('#o-name,#o-mail,#o-tel,#o-adr', form).find(x => !x.checkValidity());
                if (f) { goStep(2); f.reportValidity(); return; }
                $('#sum-items').innerHTML = cart.map(it => `<li><div>${esc(it.title)}<small>${esc(it.material)}, ${esc(it.size)}</small></div><div style="text-align:right">${linePrice(it)} €</div></li>`).join('');
                $('#sum-gift').hidden = !g.on; $('#sum-gift').textContent = giftTxt();
                $('#sum-addr').innerHTML = `${esc($('#o-name').value)}<br>${esc($('#o-mail').value)}, ${esc($('#o-tel').value)}<br>${esc($('#o-adr').value).replace(/\n/g, '<br>')}`;
            }
            goStep(n);
        }));
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const c = calc(), no = orderNo();
            let d = `OBJEDNÁVKA ${no}:\n`;
            cart.forEach(it => { d += `- ${it.title} (${it.material}, ${it.size}) - ${it.price} €\n`; });
            if (nbOff) d += `- Zľava za ďalší Hviezdopis - −${nbOff} €\n`;
            if (c.extra) d += `- Darčekové balenie - ${GIFT_WRAP} €\n`;
            d += `- Poštovné - ${SHIP} €\n`;
            if (g.on) d += `\n${giftTxt()}\n`;
            d += `\nSPOLU: ${c.total} €`;
            if (code) d += `\nPO ZĽAVE: ${c.pay} €\n\nUPLATNENÁ ZĽAVA: Kód ${code} (${perc} %), len na obrazy`;
            $('#order-details').value = d;
            setOrder(form, no, `Objednávka ${no} (Kúsok Nekonečna)`);
            const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Odosielam…';
            const ok = await sendForm(form);
            const due = c.pay, mail = $('#o-mail').value;
            const lines = cart.map(it => `${it.title}, ${it.material}, ${it.size}: ${linePrice(it)} €`);
            if (nbOff) lines.push(`Zľava za ďalší Hviezdopis: −${nbOff} €`);
            if (c.extra) lines.push(`Darčekové balenie: ${GIFT_WRAP} €`);
            lines.push(`Poštovné: ${SHIP} €`);
            if (ok === true) { cart = []; saveCart(); thanks('Ďakujem', PAY_LINKS[due] ? 'Objednávku som prijal. Môžete ju hneď zaplatiť kartou, alebo vám do 24 hodín pošlem e-mail s údajmi na prevod.' : 'Objednávku som prijal. Do 24 hodín vám pošlem e-mail s platobnými údajmi. Pri platbe uveďte číslo objednávky.', due, mail, { no, lines, total: due }); }
            else if (ok === null) { try { sessionStorage.removeItem('kn-cart'); } catch (_) {} form.submit(); }
            else { btn.disabled = false; btn.textContent = 'Odoslať objednávku s povinnosťou platby'; let er = $('#o-err'); if (!er) { er = document.createElement('p'); er.id = 'o-err'; er.className = 'meta'; er.setAttribute('role', 'alert'); btn.after(er); } er.textContent = 'Odoslanie sa nepodarilo. Skúste to znova, alebo zavolajte na 0950 592 956.'; }
        });
        showModal(false);
    };

    /* ── Hra: Zaostrite na nekonečno ── */
    const img = $('#focus-image'), slider = $('#focus-slider'), msg = $('#game-msg'), eye = $('#eyepiece'), box = $('#code-box');
    const pics = ['galeriahlbokyvesmir1', 'galeriahlbokyvesmir2', 'galeriahlbokyvesmir3'];
    img.src = pic(`assets/img/nahlady/${pics[Math.floor(Math.random() * pics.length)]}.jpg`);
    // Skutočná ostrosť je kúsok vedľa značky ∞, ako na reálnom objektíve
    const target = 56 + Math.floor(Math.random() * 13);
    const ring = () => slider.style.setProperty('--v', slider.value);
    function setWin(code, perc, fresh) {
        img.style.filter = 'blur(0)'; slider.value = target; ring(); slider.disabled = true; eye.classList.add('sharp');
        msg.textContent = 'Zaostrené!'; msg.classList.add('win');
        $('#code-text').textContent = `Získavate ${perc} % zľavu. V galérii sú ceny už prepočítané.`;
        $('#discount-code').textContent = code; box.classList.add('visible');
        disc = Number(perc); applyDiscount(code, fresh);
    }
    {   // kód z vytlačeného Hviezdopisu: kusoknekonecna.eu/hviezdopis15 → ?kod=HVIEZDOPIS15
        const BOOK_CODES = { HVIEZDOPIS15: 15 };
        const q = new URLSearchParams(location.search).get('kod'), k = q && q.trim().toUpperCase();
        if (k && BOOK_CODES[k] && BOOK_CODES[k] >= (Number(store.get('astroPerc')) || 0)) { store.set('astroCode', k); store.set('astroPerc', BOOK_CODES[k]); }
        if (q) history.replaceState(null, '', location.pathname + location.hash);
    }
    const savedCode = store.get('astroCode');
    if (savedCode) setWin(savedCode, store.get('astroPerc'), false);
    else {
        const update = () => {
            ring();
            const d = Math.abs(slider.value - target);
            img.style.filter = `blur(${(d / 2.6).toFixed(1)}px)`;
            eye.classList.toggle('sharp', d < 3);
            if (d < 2) {
                const perc = [5, 10, 15, 20, 25][Math.floor(Math.random() * 5)];
                const code = `NEKONECNO${perc}`;
                store.set('astroCode', code); store.set('astroPerc', perc);
                setWin(code, perc, true);
            } else if (d < 6) msg.textContent = 'Takmer. Ešte jemnejšie.';
            else if (d < 16) msg.textContent = 'Hmlovina sa vynára…';
            else msg.textContent = 'Hmlovina je zatiaľ rozmazaná.';
        };
        slider.addEventListener('input', update); update();
    }

    // pomalé približovanie úvodnej fotky stojí, keď úvod nie je vidno
    { const hz = $('.hero'); if (hz && 'IntersectionObserver' in window) new IntersectionObserver((en) => hz.classList.toggle('is-off', !en[0].isIntersecting)).observe(hz); }

    /* ── Hra v okne: pásik nad galériou ju otvorí ── */
    {
        const gn = $('.focus-game');
        window.openGame = () => {
            if (!gn) return;
            if (cycle) { clearInterval(cycle); cycle = null; }
            mImg.innerHTML = ''; mInfo.innerHTML = '';
            mInfo.appendChild(gn);
            showModal(false);
        };
    }

    /* ── Nočná obloha: záložky ── */
    {
        const tabs = $$('.ob-tabs [role="tab"]');
        window.showObTab = (pid) => {
            tabs.forEach(t => {
                const on = t.getAttribute('aria-controls') === pid;
                t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
                const pn = document.getElementById(t.getAttribute('aria-controls')); if (pn) pn.hidden = !on;
            });
            requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));   // mapa a grafy si prepočítajú veľkosť
        };
        tabs.forEach((t, i) => {
            t.addEventListener('click', () => window.showObTab(t.getAttribute('aria-controls')));
            t.addEventListener('keydown', (e) => {
                const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return;
                e.preventDefault(); const n = tabs[(i + k + tabs.length) % tabs.length]; n.focus(); n.click();
            });
        });
        // odkaz zvonka (napr. /#hviezda alebo /#kalendar z pripomienky) otvorí správnu záložku
        const h = location.hash && document.getElementById(location.hash.slice(1));
        const pnl = h && h.closest && h.closest('.ob-panel');
        if (pnl) { window.showObTab(pnl.id); window.addEventListener('load', () => setTimeout(() => goTo($('#obloha')), 300)); }
    }

    /* ── Úvod: stopy hviezd okolo Polárky (ako pri dlhej expozícii) ── */
    const cv = $('#trails'), hero = $('.hero');
    if (cv && !reduced) {
        const ctx = cv.getContext('2d');
        let W = 0, H = 0, dpr = 1, stars = [], pole = { x: 0, y: 0 }, t0 = performance.now() + 700, visible = true, raf = 0;
        function setup() {
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // tenké stopy netreba v plnom rozlíšení
            W = cv.clientWidth; H = cv.clientHeight;
            cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            pole = { x: W * 0.78, y: H * 0.16 };
            const R = Math.hypot(Math.max(pole.x, W - pole.x), Math.max(pole.y, H - pole.y));
            const n = Math.round(Math.min(lite ? 120 : 260, W * H / (lite ? 7000 : 5200)));
            stars = Array.from({ length: n }, () => ({ r: Math.sqrt(Math.random()) * R, a: Math.random() * Math.PI * 2, s: Math.random() ** 2 * 1.4 + .3, w: Math.random() < .12 ? 1 : 0 }));
        }
        let lastF = 0;
        function frame(now) {
            raf = 0;
            if (!visible) return;
            if (body.classList.contains('modal-open')) { setTimeout(() => { if (!raf) raf = requestAnimationFrame(frame); }, 300); return; }   // za otvoreným oknom nekreslíme
            if (FRAME_MS && now - lastF < FRAME_MS) { raf = requestAnimationFrame(frame); return; }
            lastF = now;
            const el = Math.max(0, (now - t0) / 1000);
            const trail = Math.min(0.42, 0.02 + el * 0.035);          // stopa sa predlžuje ako pri expozícii
            const rot = el * 0.012;
            ctx.clearRect(0, 0, W, H);
            ctx.lineCap = 'round';
            for (const st of stars) {
                const a1 = st.a + rot, a0 = a1 - trail;
                const g = st.w ? 'rgba(242,202,126,' : 'rgba(236,234,228,';
                ctx.strokeStyle = g + (0.18 + st.s * 0.3).toFixed(2) + ')';
                ctx.lineWidth = st.s;
                ctx.beginPath(); ctx.arc(pole.x, pole.y, st.r, a0, a1); ctx.stroke();
            }
            raf = requestAnimationFrame(frame);
        }
        setup();
        new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(hero);
        let rz = 0, lastW = window.innerWidth; window.addEventListener('resize', () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(setup, 200); }, { passive: true });
        raf = requestAnimationFrame(frame);
    }

    /* ── Nočná obloha: dnešná fáza Mesiaca a najbližší nov a spln ── */
    const SYN = 29.530588853;
    const ref = Date.UTC(2000, 0, 6, 18, 14) / 864e5;
    const age = (((Date.now() / 864e5 - ref) % SYN) + SYN) % SYN;
    const f = age / SYN;
    const illum = (1 - Math.cos(2 * Math.PI * f)) / 2;
    const names = [[1.85, 'Nov'], [5.54, 'Dorastajúci kosák'], [9.23, 'Prvá štvrť'], [12.92, 'Dorastajúci Mesiac'], [16.61, 'Spln'], [20.3, 'Ubúdajúci Mesiac'], [23.99, 'Posledná štvrť'], [27.68, 'Ubúdajúci kosák'], [99, 'Nov']];
    const phase = names.find(([d]) => age < d)[1];
    // Presný čas novu a splnu (Meeus, presnosť na minúty)
    const rad = (d) => d * Math.PI / 180, dsin = (d) => Math.sin(rad(d));
    function truePhase(k, ph) {
        k += ph;
        const t = k / 1236.85, t2 = t * t, t3 = t2 * t;
        let jd = 2415020.75933 + SYN * k + 0.0001178 * t2 - 0.000000155 * t3 + 0.00033 * dsin(166.56 + 132.87 * t - 0.009173 * t2);
        const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
        const mp = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
        const fl = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
        jd += (0.1734 - 0.000393 * t) * dsin(m) + 0.0021 * dsin(2 * m) - 0.4068 * dsin(mp) + 0.0161 * dsin(2 * mp) - 0.0004 * dsin(3 * mp)
            + 0.0104 * dsin(2 * fl) - 0.0051 * dsin(m + mp) - 0.0074 * dsin(m - mp) + 0.0004 * dsin(2 * fl + m) - 0.0004 * dsin(2 * fl - m)
            - 0.0006 * dsin(2 * fl + mp) + 0.0010 * dsin(2 * fl - mp) + 0.0005 * dsin(m + 2 * mp);
        return (jd - 2440587.5) * 864e5;          // ms od 1970
    }
    function nextPhase(ph) {
        const now = Date.now(), d = new Date();
        let k = Math.floor((d.getFullYear() + d.getMonth() / 12 - 1900) * 12.3685) - 2;
        for (let i = 0; i < 6; i++, k++) { const t = truePhase(k, ph); if (t > now - 12 * 36e5) return t; }
        return now;
    }
    const dayStart = (t) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
    function when(t) {
        const days = Math.round((dayStart(t) - dayStart(Date.now())) / 864e5);
        const date = new Date(t).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' });
        const rel = days <= 0 ? 'dnes v noci' : days === 1 ? 'zajtra' : days < 5 ? `o ${days} dni` : `o ${days} dní`;
        return `${date}<small>${rel}</small>`;
    }
    const tNew = nextPhase(0), tFull = nextPhase(0.5);
    $('#next-new').innerHTML = when(tNew);
    $('#next-full').innerHTML = when(tFull);
    // pripomienka novu do kalendára (celodenná udalosť v deň novu)
    {
        const d = new Date(tNew), d2 = new Date(tNew + 864e5);
        const ymd = (x) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`;
        const title = 'Nov Mesiaca: tmavá obloha', det = 'Najtmavšia obloha mesiaca, ideálna na Mliečnu cestu a fotenie pod hviezdami. https://www.kusoknekonecna.eu/#obloha';
        $('#cal-google').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${ymd(d)}/${ymd(d2)}&details=${encodeURIComponent(det)}`;
        const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kusok Nekonecna//SK', 'BEGIN:VEVENT', `UID:nov-${ymd(d)}@kusoknekonecna.eu`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
            `DTSTART;VALUE=DATE:${ymd(d)}`, `DTEND;VALUE=DATE:${ymd(d2)}`, `SUMMARY:${title}`, `DESCRIPTION:${det}`, 'BEGIN:VALARM', 'TRIGGER:-PT12H', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
        $('#cal-ics').href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    }
    const month = new Date().getMonth() + 1;
    const events = { 1: 'Začiatkom januára padajú Kvadrantidy.', 4: 'Okolo 22. apríla padajú Lyridy.', 8: 'V auguste vrcholia Perzeidy.', 10: 'V októbri padajú Orionidy, prach z Halleyho kométy. Vrchol býva okolo 21. októbra.', 11: 'V novembri padajú Leonidy.', 12: 'V decembri prichádzajú Geminidy, najbohatší roj roka.' };
    const tip = illum < 0.3 ? 'Obloha je tmavá, ideálne na hlboký vesmír a Mliečnu cestu.' : illum > 0.7 ? 'Jasný Mesiac prežiari hmloviny. Dobrý čas na Mesiac a krajinu.' : 'Mesiac čiastočne presvetľuje oblohu.';
    $('#sky-phase').textContent = phase;
    $('#sky-note').textContent = [`Mesiac je osvetlený na ${Math.round(illum * 100)} %.`, tip, events[month]].filter(Boolean).join(' ');
    // Kresba Mesiaca: osvetlená časť s morami, tienistá strana slabo presvitá
    const r = 46, cx = 50, cy = 50, rx = Math.abs(Math.cos(2 * Math.PI * f)) * r;
    const waxing = f < 0.5, crescent = Math.cos(2 * Math.PI * f) > 0;
    const outer = waxing ? `A ${r} ${r} 0 0 1 ${cx} ${cy + r}` : `A ${r} ${r} 0 0 0 ${cx} ${cy + r}`;
    const inner = `A ${rx.toFixed(2)} ${r} 0 0 ${waxing === crescent ? 0 : 1} ${cx} ${cy - r}`;
    const maria = [[38, 34, 11, 8], [56, 30, 9, 7], [62, 46, 8, 10], [44, 52, 12, 7], [33, 62, 7, 6], [58, 66, 6, 5], [70, 34, 5, 6]]
        .map(([x, y, a, b]) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="#8E8A80" opacity=".38"/>`).join('');
    $('#moon').innerHTML = `<svg viewBox="0 0 100 100"><defs>
        <radialGradient id="mg" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#FBF8F0"/><stop offset=".7" stop-color="#DCD7CC"/><stop offset="1" stop-color="#B9B3A6"/></radialGradient>
        <radialGradient id="md" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#1A1F36"/><stop offset="1" stop-color="#10142A"/></radialGradient>
        <clipPath id="lit"><path d="M ${cx} ${cy - r} ${outer} ${inner} Z"/></clipPath></defs>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#md)" stroke="rgba(236,234,228,.18)" stroke-width=".6"/>
        <g clip-path="url(#lit)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#mg)"/>${maria}<circle cx="44" cy="76" r="2.4" fill="#F7F4EC"/><circle cx="44" cy="76" r="5" fill="none" stroke="#fff" stroke-opacity=".25"/></g></svg>`;
    $('.moon-wrap').style.setProperty('--lit', illum.toFixed(2));

    /* ── Hviezdne nebo cez celú stránku: tri vrstvy hĺbky, trblietanie, padajúce hviezdy ── */
    const sky = $('#sky');
    if (sky) {
        const c = sky.getContext('2d');
        let W = 0, H = 0, dpr = 1, stars = [], meteors = [], nextMeteor = 0, raf = 0, lastY = window.scrollY;
        function build() {
            dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
            W = sky.clientWidth || window.innerWidth; H = sky.clientHeight || window.innerHeight;
            sky.width = W * dpr; sky.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
            const n = Math.round(Math.min(lite ? 170 : 340, W * H / (lite ? 5200 : 4200)));
            stars = Array.from({ length: n }, () => {
                const z = Math.random();                       // hĺbka: 0 ďaleko, 1 blízko
                return { x: Math.random() * W, y: Math.random() * H * 1.2, z, r: .3 + z * 1.2, tw: Math.random() * Math.PI * 2, sp: .6 + Math.random() * 1.6,
                         col: Math.random() < .12 ? '200,185,255' : Math.random() < .08 ? '255,222,170' : '236,234,228' };
            });
        }
        function meteor(now) {
            const fromLeft = Math.random() < .5;
            meteors.push({ x: fromLeft ? Math.random() * W * .5 : W * .5 + Math.random() * W * .5, y: Math.random() * H * .35,
                           vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 4), vy: 2.4 + Math.random() * 2, life: 0, max: 50 + Math.random() * 30 });
            nextMeteor = now + 6000 + Math.random() * 9000;
        }
        let lastD = 0;
        function draw(now) {
            raf = 0;
            if (!reduced && body.classList.contains('modal-open')) { setTimeout(() => { if (!raf) raf = requestAnimationFrame(draw); }, 300); return; }
            if (FRAME_MS && !reduced && now - lastD < FRAME_MS) { raf = requestAnimationFrame(draw); return; }
            lastD = now;
            const sc = window.scrollY, dy = sc - lastY; lastY = sc;
            c.clearRect(0, 0, W, H);
            for (const s of stars) {
                s.y -= dy * (0.04 + s.z * 0.22);                // parallaxa: bližšie hviezdy sa posúvajú rýchlejšie
                if (s.y < -5) s.y += H * 1.2; else if (s.y > H * 1.2) s.y -= H * 1.2;
                const a = reduced ? .7 : .45 + .55 * (0.5 + 0.5 * Math.sin(now / 1000 * s.sp + s.tw));
                c.fillStyle = `rgba(${s.col},${(a * (.35 + s.z * .65)).toFixed(3)})`;
                c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.283); c.fill();
            }
            if (!reduced) {
                if (!nextMeteor) nextMeteor = now + 2500;
                if (now > nextMeteor) meteor(now);
                meteors = meteors.filter(m => m.life < m.max);
                for (const m of meteors) {
                    const st = FRAME_MS ? 2 : 1; m.life += st; m.x += m.vx * st; m.y += m.vy * st;
                    const k = 1 - m.life / m.max, len = 14;
                    const g = c.createLinearGradient(m.x, m.y, m.x - m.vx * len, m.y - m.vy * len);
                    g.addColorStop(0, `rgba(255,255,255,${.9 * k})`); g.addColorStop(.3, `rgba(184,164,255,${.5 * k})`); g.addColorStop(1, 'rgba(184,164,255,0)');
                    c.strokeStyle = g; c.lineWidth = 1.6; c.lineCap = 'round';
                    c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x - m.vx * len, m.y - m.vy * len); c.stroke();
                }
                raf = requestAnimationFrame(draw);
            }
        }
        build(); raf = requestAnimationFrame(draw);
        let rb = 0, lastSW = window.innerWidth; window.addEventListener('resize', () => { if (window.innerWidth === lastSW) return; lastSW = window.innerWidth; clearTimeout(rb); rb = setTimeout(build, 200); }, { passive: true });
        if (reduced) window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(draw); }, { passive: true });
        document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf && !reduced) raf = requestAnimationFrame(draw); });
    }

    /* ── Súhvezdia sa nakreslia, keď sa objavia ── */
    // Súhvezdie sa orezáva na svoje hviezdy, aby ležalo presne za nadpisom
    $$('.const svg').forEach(svg => {
        try {
            const b = svg.getBBox(), p = 4;
            if (b.width && b.height) svg.setAttribute('viewBox', `${(b.x - p).toFixed(1)} ${(b.y - p).toFixed(1)} ${(b.width + 2 * p).toFixed(1)} ${(b.height + 2 * p).toFixed(1)}`);
        } catch (_) {}
    });
    const cObs = new IntersectionObserver((en) => en.forEach(e => { if (e.isIntersecting) { e.target.classList.add('drawn'); cObs.unobserve(e.target); } }), { threshold: .6 });
    $$('.const').forEach(el => reduced ? el.classList.add('drawn') : cObs.observe(el));

    /* ── Vedeli ste? Každý fakt vedie k fotke, ktorej sa týka ── */
    const FACTS = [
        ['Vodík', 'farbí hmloviny do červena', 'Svieti na vlnovej dĺžke 656 nanometrov. Bežný fotoaparát toto svetlo takmer celé odfiltruje, preto fotím upraveným, ktorý ho prepustí.', { title: 'Hmlovina Tulipán' }],
        ['15°', 'za hodinu', 'O toľko sa otočí nočná obloha. Montáž ďalekohľadu sa preto počas snímania otáča presne opačne, inak by sa z hviezd stali čiarky ako v úvode tejto stránky.', { title: 'Galaxia M101' }],
        ['6,5', 'metra', 'Taký priemer má zrkadlo Webbovho vesmírneho teleskopu. Môj ďalekohľad je oproti nemu drobec, a aj tak dovidí ku galaxii, z ktorej svetlo letí 21 miliónov rokov.', { title: 'Galaxia M101', label: 'Pozrieť galaxiu M101' }],
        ['500', 'sekúnd', 'Toľko letí svetlo zo Slnka k Zemi. Slnko na oblohe vidíte vždy také, aké bolo pred ôsmimi minútami a dvadsiatimi sekundami.', { title: 'Polárna žiara' }],
        ['2,5', 'milióna rokov', 'Toľko letí k nám svetlo z galaxie Andromeda. Je to najvzdialenejší objekt, ktorý uvidíte voľným okom.', { title: 'Galaxia M101', label: 'Pozrieť inú galaxiu: M101' }],
        ['100 000', 'rokov', 'Tak dlho by svetlu trvalo preletieť našu Mliečnu cestu naprieč. Je v nej 100 až 400 miliárd hviezd.', { title: 'Stráž si svoje svetlo', label: 'Pozrieť Mliečnu cestu' }],
        ['300+', 'snímok v jednom obraze', 'Toľko záberov som poskladal do jedného obrazu Mesiaca. Čím viac záberov, tým menej šumu a viac detailov.', { title: 'Mesiac v detailoch' }],
        ['2010', 'prvý park tmavej oblohy', 'V tomto roku vznikol Park tmavej oblohy Poloniny, prvý na Slovensku. Mliečnu cestu tam uvidíte voľným okom.', { f: 'krajinky', label: 'Pozrieť nočné krajinky' }],
        ['7 500', 'rokov', 'Toľko letí svetlo z Dvojitej hviezdokopy v Perzeovi. Keď vyrazilo, na území dnešného Slovenska sa usádzali prví roľníci.', { title: 'Dvojitá hviezdokopa v Perzeovi' }]
    ];
    const fc = $('#fact-card');
    if (fc) {
        let fi = 0, ft = 0;
        const num = $('#fact-num'), unit = $('#fact-unit'), txt = $('#fact-txt'), idx = $('#fact-i'), bar = $('#fact-bar'), link = $('#fact-link');
        const show = (i) => {
            fi = (i + FACTS.length) % FACTS.length;
            const [n, u, t, l] = FACTS[fi];
            num.textContent = n; unit.textContent = u; txt.textContent = t; idx.textContent = `${fi + 1} / ${FACTS.length}`;
            link.hidden = !l;
            if (l) link.textContent = l.label || `Pozrieť fotku: ${l.title}`;
            fc.classList.remove('swap'); void fc.offsetWidth; fc.classList.add('swap');
            clearTimeout(ft);
            bar.classList.remove('run'); void bar.offsetWidth;
            if (!reduced) { bar.classList.add('run'); ft = setTimeout(() => show(fi + 1), 9000); }
        };
        link.addEventListener('click', () => {
            const l = FACTS[fi][3]; if (!l) return;
            clearTimeout(ft); bar.classList.remove('run');
            if (l.f) { $(`#g-${l.f}`).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); return; }
            const it = $$('.g-item').find(b => b.dataset.title === l.title);
            if (it) it.click();
        });
        // pri interakcii stop, nech text neutečie spod prsta
        const pause = () => { clearTimeout(ft); bar.classList.remove('run'); };
        fc.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pause(); });
        const resume = () => { if (reduced) return; clearTimeout(ft); bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); ft = setTimeout(() => show(fi + 1), 9000); };
        fc.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && seen) resume(); });
        $('#fact-prev').addEventListener('click', () => show(fi - 1));
        $('#fact-next').addEventListener('click', () => show(fi + 1));
        // točí sa len vtedy, keď je karta na obrazovke; prvý fakt sa ukáže až pri príchode
        let seen = false;
        const fo = new IntersectionObserver((en) => {
            if (en[0].isIntersecting) { if (seen) resume(); else { show(0); seen = true; } } else pause();
        }, { threshold: .5 });
        fo.observe(fc);
    }

    /* ── Hviezda vášho roku: svetlo, ktoré vyrazilo v roku, na ktorom vám záleží ── */
    const STARS = [
        ['Sírius', 'Veľký pes', 8.6, 'zima'], ['Epsilon Eridani', 'Eridanus', 10.5, 'zima'], ['Procyon', 'Malý pes', 11.5, 'zima'], ['Tau Ceti', 'Veľryba', 11.9, 'jeseň'],
        ['Altair', 'Orol', 16.7, 'leto'], ['Alsafi', 'Drak', 18.8, 'rok'], ['Eta Cassiopeiae', 'Kasiopeja', 19.4, 'rok'], ['Xi Bootis', 'Pastier', 21.9, 'jar'], ['Vega', 'Lýra', 25.0, 'leto'],
        ['Fomalhaut', 'Južná ryba', 25.1, 'jeseň'], ['Chi Draconis', 'Drak', 26.3, 'rok'], ['Chara', 'Poľovné psy', 27.6, 'jar'], ['Alula Australis', 'Veľká medvedica', 28.7, 'jar'],
        ['Beta Comae', 'Vlasy Bereniky', 29.9, 'jar'], ['Pollux', 'Blíženci', 33.8, 'zima'], ['Zeta Herculis', 'Herkules', 35.0, 'leto'], ['Zavijava', 'Panna', 35.6, 'jar'],
        ['Denebola', 'Lev', 35.9, 'jar'], ['Arktúr', 'Pastier', 36.7, 'jar'], ['Muphrid', 'Pastier', 37.2, 'jar'], ['Porrima', 'Panna', 38.1, 'jar'],
        ['Deneb Algedi', 'Kozorožec', 38.7, 'jeseň'], ['Capella', 'Povozník', 42.9, 'zima'], ['Alshain', 'Orol', 44.7, 'leto'], ['Errai', 'Cefeus', 45.0, 'rok'],
        ['Rasalhague', 'Hadonos', 48.6, 'leto'], ['Alderamin', 'Cefeus', 49.0, 'rok'], ['Castor', 'Blíženci', 51.0, 'zima'], ['Caph', 'Kasiopeja', 54.7, 'rok'],
        ['Zosma', 'Lev', 58.4, 'jar'], ['Sheratan', 'Baran', 59.6, 'jeseň'], ['Wasat', 'Blíženci', 60.5, 'zima'], ['Aldebaran', 'Býk', 65.3, 'zima'],
        ['Hamal', 'Baran', 65.8, 'jeseň'], ['Aljanah', 'Labuť', 72.7, 'leto'], ['Unukalhai', 'Had', 74.0, 'leto'], ['Alphecca', 'Severná koruna', 75.0, 'leto'],
        ['Zubenelgenubi', 'Váhy', 76.0, 'leto'], ['Regulus', 'Lev', 79.3, 'jar'], ['Merak', 'Veľký voz', 79.7, 'rok'], ['Megrez', 'Veľký voz', 80.5, 'rok'],
        ['Cebalrai', 'Hadonos', 81.8, 'leto'], ['Alioth', 'Veľký voz', 82.6, 'rok'], ['Mizar', 'Veľký voz', 82.9, 'rok'], ['Phecda', 'Veľký voz', 83.2, 'rok'],
        ['Algol', 'Perzeus', 90.0, 'jeseň'], ['Diphda', 'Veľryba', 96.3, 'jeseň'], ['Alpheratz', 'Andromeda', 97.0, 'jeseň'], ['Ruchbah', 'Kasiopeja', 99.4, 'rok'],
        ['Alkaid', 'Veľký voz', 104, 'rok'], ['Vindemiatrix', 'Panna', 109, 'jar'], ['Alhena', 'Blíženci', 109, 'zima'], ['Dubhe', 'Veľký voz', 123, 'rok'], ['Algieba', 'Lev', 130, 'jar']
    ];
    // Poloha hviezd na oblohe (rektascenzia v hodinách, deklinácia v stupňoch, J2000)
    const RADEC = {
        'Sírius': [6.752, -16.72], 'Epsilon Eridani': [3.549, -9.46], 'Procyon': [7.655, 5.22], 'Tau Ceti': [1.734, -15.94], 'Altair': [19.846, 8.87],
        'Alsafi': [19.541, 69.66], 'Eta Cassiopeiae': [0.818, 57.82], 'Xi Bootis': [14.857, 19.10], 'Vega': [18.616, 38.78], 'Fomalhaut': [22.961, -29.62],
        'Chi Draconis': [18.351, 72.73], 'Chara': [12.562, 41.36], 'Alula Australis': [11.303, 31.53], 'Beta Comae': [13.198, 27.88], 'Pollux': [7.755, 28.03],
        'Zeta Herculis': [16.688, 31.60], 'Zavijava': [11.845, 1.76], 'Denebola': [11.818, 14.57], 'Arktúr': [14.261, 19.18], 'Muphrid': [13.911, 18.40],
        'Porrima': [12.694, -1.45], 'Deneb Algedi': [21.784, -16.13], 'Capella': [5.278, 46.00], 'Alshain': [19.922, 6.41], 'Errai': [23.656, 77.63],
        'Rasalhague': [17.582, 12.56], 'Alderamin': [21.310, 62.59], 'Castor': [7.577, 31.89], 'Caph': [0.153, 59.15], 'Zosma': [11.235, 20.52],
        'Sheratan': [1.911, 20.81], 'Wasat': [7.335, 21.98], 'Aldebaran': [4.599, 16.51], 'Hamal': [2.120, 23.46], 'Aljanah': [20.770, 33.97],
        'Unukalhai': [15.738, 6.43], 'Alphecca': [15.578, 26.71], 'Zubenelgenubi': [14.848, -16.04], 'Regulus': [10.140, 11.97], 'Merak': [11.031, 56.38],
        'Megrez': [12.257, 57.03], 'Cebalrai': [17.725, 4.57], 'Alioth': [12.900, 55.96], 'Mizar': [13.399, 54.93], 'Phecda': [11.897, 53.69],
        'Algol': [3.136, 40.96], 'Diphda': [0.727, -17.99], 'Alpheratz': [0.140, 29.09], 'Ruchbah': [1.430, 60.24], 'Alkaid': [13.792, 49.31],
        'Vindemiatrix': [13.036, 10.96], 'Alhena': [6.629, 16.40], 'Dubhe': [11.062, 61.75], 'Algieba': [10.333, 19.84]
    };
    // Obloha nad stredom Slovenska
    const LAT = 48.7, LON = 19.5, D2R = Math.PI / 180;
    function altAz(raH, decD, t) {
        const d = t / 864e5 - 10957.5;                                    // dni od J2000
        const lst = ((18.697374558 + 24.06570982441908 * d) * 15 + LON) % 360;
        const H = (lst - raH * 15) * D2R, dec = decD * D2R, la = LAT * D2R;
        const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H));
        const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) / D2R + 180;
        return [alt / D2R, (az + 360) % 360];
    }
    function sunAlt(t) {
        const n = t / 864e5 - 10957.5;
        const L = (280.46 + 0.9856474 * n) * D2R, g = (357.528 + 0.9856003 * n) * D2R;
        const lam = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R, eps = (23.439 - 4e-7 * n) * D2R;
        const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / D2R / 15;
        return altAz((ra + 24) % 24, Math.asin(Math.sin(eps) * Math.sin(lam)) / D2R, t)[0];
    }
    // jedna noc: od poludnia UTC daného dňa do rána, krok 10 minút
    // evening = true: len do polnoci (miestneho času), vhodné na fotenie s hosťami
    const localHour = (t) => Number(new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Bratislava' }));
    function night(rd, day, sunMax, starMin, spanH = 20, evening = false) {
        const t0 = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12);
        let from = 0, to = 0, best = null, end = t0 + spanH * 36e5;
        if (evening) { for (let t = t0 + 36e5; t < end; t += 6e5) if (localHour(t) === 0) { end = t; break; } }
        for (let t = t0; t < end; t += 6e5) {
            if (sunAlt(t) > sunMax) continue;
            const [a, z] = altAz(rd[0], rd[1], t);
            if (a < starMin) continue;
            if (!from) from = t; to = t;
            if (!best || a > best[0]) best = [a, z, t];
        }
        return { from, to, hours: from ? (to - from) / 36e5 : 0, best };
    }
    const hm = (t) => new Date(t).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' });
    const DIRS = ['na severe', 'na severovýchode', 'na východe', 'na juhovýchode', 'na juhu', 'na juhozápade', 'na západe', 'na severozápade'];
    const dir = (az) => DIRS[Math.round(az / 45) % 8];
    const MON = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
    const MON_L = ['januári', 'februári', 'marci', 'apríli', 'máji', 'júni', 'júli', 'auguste', 'septembri', 'októbri', 'novembri', 'decembri'];
    function skyFor(name) {
        const rd = RADEC[name]; if (!rd) return null;
        const today = new Date();
        // dnes v noci (hviezda vyššie ako 10°, Slnko pod −12°)
        const tn = night(rd, today, -12, 10);
        let tonight;
        if (tn.hours >= 0.5) {
            const [ba, bz, bt] = tn.best, alt = `${Math.round(ba)}° nad obzorom`;
            tonight = `Od ${hm(tn.from)} do ${hm(tn.to)}. ` + (bt - tn.from < 12e5
                ? `Po zotmení bude ${dir(bz)}, ${alt}, potom klesá.`
                : tn.to - bt < 12e5
                    ? `Postupne stúpa, pred svitaním bude ${dir(bz)}, ${alt}.`
                    : `Najvyššie bude okolo ${hm(bt)} ${dir(bz)}, ${alt}.`);
        } else {
            let back = '';
            for (let i = 1; i <= 12; i++) {
                const d = new Date(today.getFullYear(), today.getMonth() + i, 15);
                if (night(rd, d, -12, 15).hours >= 1.5) { back = MON_L[d.getMonth()]; break; }
            }
            tonight = `Teraz je na oblohe blízko Slnka a v noci ju neuvidíte.${back ? ` Na nočnú oblohu sa vráti v ${back}.` : ''}`;
        }
        // najlepšie mesiace: od zotmenia do 2.–3. hodiny rannej aspoň 1,5 hodiny vyššie ako 20°
        const ok = MON.map((_, m) => night(rd, new Date(today.getFullYear(), m, 15), -12, 20, 13).hours >= 1.5);
        let best;
        if (ok.every(Boolean)) best = 'Celý rok, nad Slovenskom nikdy nezapadá.';
        else if (!ok.some(Boolean)) best = 'Vychádza len nízko nad obzor, hľadajte ju na tmavom mieste s výhľadom na juh.';
        else {
            const start = ok.findIndex((v, i) => v && !ok[(i + 11) % 12]);
            let end = start; while (ok[(end + 1) % 12] && (end + 1) % 12 !== start) end = (end + 1) % 12;
            best = start === end ? `${MON[start][0].toUpperCase() + MON[start].slice(1)}.` : `${MON[start][0].toUpperCase() + MON[start].slice(1)} až ${MON[end]}.`;
        }
        // najbližší nov, keď je hviezda aspoň 1,5 hodiny na tmavej oblohe
        let plan = '', planInfo = null;
        let k = Math.floor((today.getFullYear() + today.getMonth() / 12 - 1900) * 12.3685) - 1;
        for (let i = 0; i < 16 && !plan; i++, k++) {
            const tNm = truePhase(k, 0); if (tNm < Date.now() - 864e5) continue;
            const day = new Date(tNm), n = night(rd, day, -15, 10, 20, true);
            if (n.hours >= 1) {
                const date = day.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' });
                const to = localHour(n.to) === 23 ? 'do polnoci' : 'do ' + hm(n.to);
                plan = `Najbližší nov, keď bude ${name} na tmavej oblohe: ${date}. Hviezda bude na oblohe od ${hm(n.from)} ${to}, hľadajte ju ${dir(n.best[1])}. Mesiac nebude rušiť.`;
                planInfo = { date, from: hm(n.from), to, dir: dir(n.best[1]) };
            }
        }
        return { tonight, best, plan, planInfo };
    }
    const SEASON = { zima: 'Najkrajšie ju uvidíte za zimných večerov.', jar: 'Najkrajšie ju uvidíte za jarných večerov.', leto: 'Najkrajšie ju uvidíte za letných nocí.', 'jeseň': 'Najkrajšie ju uvidíte za jesenných večerov.', rok: 'Nad Slovenskom nikdy nezapadá, uvidíte ju v každú jasnú noc.' };
    // Časová os: známe jasné hviezdy, z ktorých svetlo z vášho roku dorazí neskôr
    const TL = [['Sírius', 'Veľký pes', 8.6], ['Procyon', 'Malý pes', 11.5], ['Altair', 'Orol', 16.7], ['Vega', 'Lýra', 25.0], ['Pollux', 'Blíženci', 33.8], ['Arktúr', 'Pastier', 36.7],
        ['Capella', 'Povozník', 42.9], ['Castor', 'Blíženci', 51.0], ['Aldebaran', 'Býk', 65.3], ['Regulus', 'Lev', 79.3], ['Mizar', 'Veľký voz', 82.9], ['Alkaid', 'Veľký voz', 104]];
    const OCC = {
        birth:   { when: 'v roku, keď ste sa narodili', whenD: 'práve v čase, keď ste sa narodili', pred: 'vaším narodením', po: 'vašom narodení', near: (k) => `vašimi ${k}. narodeninami`, nearPo: (k) => `vašich ${k}. narodeninách`, ann: (n) => `na vaše ${n}. narodeniny`, k: 'Rok narodenia', kd: 'Narodenie' },
        wedding: { when: 'v roku, keď ste sa vzali', whenD: 'práve v čase, keď ste sa vzali', pred: 'vašou svadbou', po: 'vašej svadbe', near: (k) => k === 25 ? 'striebornou svadbou' : k === 50 ? 'zlatou svadbou' : `${k}. výročím svadby`, nearPo: (k) => k === 25 ? 'striebornej svadbe' : k === 50 ? 'zlatej svadbe' : `${k}. výročí svadby`, ann: (n) => n === 25 ? 'na striebornú svadbu' : n === 50 ? 'na zlatú svadbu' : `na ${n}. výročie svadby`, k: 'Rok svadby', kd: 'Svadba' },
        other:   { when: 'vo vašom roku', whenD: 'práve vo vašom dni', pred: 'vaším dňom', po: 'vašom dni', near: (k) => `${k}. výročím vášho dňa`, nearPo: (k) => `${k}. výročí vášho dňa`, ann: (n) => `${n} rokov po vašom dni`, k: 'Váš rok', kd: 'Váš deň' }
    };
    const yForm = $('#year-form');
    if (yForm) {
        const yIn = $('#year-input'), out = $('#year-out');
        let ylUrls = [];
        let occ = 'birth';
        const nowY = () => { const d = new Date(); return d.getFullYear() + d.getMonth() / 12; };
        yIn.max = new Date().getFullYear();
        $$('.year-occ .chip').forEach(c => c.addEventListener('click', () => {
            occ = c.dataset.o;
            $$('.year-occ .chip').forEach(x => { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', String(x === c)); });
            if (!out.hidden) yForm.requestSubmit();
        }));
        const roky = (n) => n === 1 ? 'rok' : n < 5 ? 'roky' : 'rokov';
        const ly = (d) => Number.isInteger(d) ? `${d} svetelných rokov` : `${String(d).replace('.', ',')} svetelného roka`;
        const YR = 365.2422 * 864e5;
        const MON_LOC = ['januári', 'februári', 'marci', 'apríli', 'máji', 'júni', 'júli', 'auguste', 'septembri', 'októbri', 'novembri', 'decembri'];
        const MON_NOM = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
        const inMonth = (t) => { const d = new Date(t); return `v ${MON_LOC[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
        const plural = (n, a, b, c) => n === 1 ? a : n < 5 ? b : c;
        // ako dlho: týždne, mesiace alebo roky, podľa veľkosti
        const span = (days) => { days = Math.abs(days);
            if (days < 56) { const w = Math.max(1, Math.round(days / 7)); return `${w} ${plural(w, 'týždeň', 'týždne', 'týždňov')}`; }
            if (days < 730) { const m = Math.round(days / 30.44); return `${m} ${plural(m, 'mesiac', 'mesiace', 'mesiacov')}`; }
            const y = Math.round(days / 365.25); return `${y} ${roky(y)}`; };
        // vzdialenosti hviezd poznáme s presnosťou asi na 1 % (vzdialenejšie a dvojhviezdy horšie), z toho je rozptyl dátumu príchodu svetla
        const uncDays = (dist) => dist * 365.25 * (dist > 50 ? 0.02 : 0.01);
        const dIn = $('#year-day'), mIn = $('#year-month'), yErr = $('#year-err');
        yForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const Y = Math.round(Number(yIn.value)), now = new Date().getFullYear(), o = OCC[occ];
            const M = Number(mIn.value) || 0, D = Number(dIn.value) || 0;
            const fail = (msg, el) => { yErr.textContent = msg; yErr.hidden = false; el.focus(); };
            yErr.hidden = true;
            if (!Y || Y < 1890 || Y > now) return fail('Zadajte rok medzi 1890 a ' + now + '.', yIn);
            if (D && !M) return fail('K dňu doplňte aj mesiac.', mIn);
            if (D && (D < 1 || D > new Date(Date.UTC(Y, M, 0)).getUTCDate())) return fail('Tento deň v zadanom mesiaci neexistuje.', dIn);
            const prec = D ? 'day' : M ? 'month' : 'year';
            const t0 = prec === 'day' ? Date.UTC(Y, M - 1, D, 12) : prec === 'month' ? Date.UTC(Y, M - 1, 15, 12) : Date.UTC(Y, 6, 1, 12);
            if (t0 > Date.now()) return fail('Dátum je v budúcnosti. Svetlo z neho ešte nevyrazilo.', D ? dIn : mIn);
            const label = prec === 'day' ? new Date(t0).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
                : prec === 'month' ? `${MON_NOM[M - 1]} ${Y}` : String(Y);
            const kTxt = prec === 'year' ? `${o.k} ${Y}` : `${o.kd} ${label}`;
            const age = (Date.now() - t0) / YR;
            let today = '';
            $('#year-k').textContent = kTxt;
            if (age < 8) {
                // časová kapsula: svetlo z tohto dňa ešte letí
                const arr = t0 + 8.6 * YR;
                $('#year-name').textContent = 'Svetlo je ešte na ceste';
                $('#year-txt').textContent = `Žiadna hviezda viditeľná zo Slovenska nie je tak blízko, aby jej svetlo z tohto ${prec === 'year' ? 'roku' : 'dňa'} už doletelo. Ako prvé dorazí svetlo zo Síria, ${prec === 'year' ? `v roku ${Math.round(Y + 8.6)}` : inMonth(arr)}. Vtedy sa pozrite na Sírius a uvidíte svetlo, ktoré vyrazilo ${prec === 'year' ? o.when : o.whenD.replace('práve ', '')}.`;
                var skyStar = 'Sírius';
                $('#year-con').textContent = 'Súhvezdie Veľký pes';
            } else {
                const star = STARS.reduce((b, s) => Math.abs(s[2] - age) < Math.abs(b[2] - age) ? s : b);
                $('#year-name').textContent = star[0]; today = star[0];
                if (prec === 'year') {
                    const dep = Math.round(new Date().getFullYear() + new Date().getMonth() / 12 - star[2] - 0.5), diff = dep - Y;
                    $('#year-txt').textContent = diff === 0
                        ? `Svetlo, ktoré dnes vidíte z hviezdy ${star[0]}, vyrazilo na cestu ${o.when}. Je od nás ${ly(star[2])}.`
                        : `Svetlo, ktoré dnes vidíte z hviezdy ${star[0]}, vyrazilo na cestu v roku ${dep}, len ${Math.abs(diff)} ${roky(Math.abs(diff))} ${diff < 0 ? 'pred vaším rokom' : 'po vašom roku'}. Je od nás ${ly(star[2])}.`;
                } else {
                    const dep = Date.now() - star[2] * YR, diffD = (dep - t0) / 864e5, unc = uncDays(star[2]);
                    $('#year-txt').textContent = Math.abs(diffD) <= unc
                        ? `Svetlo, ktoré dnes vidíte z hviezdy ${star[0]}, vyrazilo na cestu ${o.whenD}. Je od nás ${ly(star[2])}.`
                        : `Svetlo, ktoré dnes vidíte z hviezdy ${star[0]}, vyrazilo na cestu ${inMonth(dep)}, asi ${span(diffD)} ${diffD < 0 ? `pred ${o.pred}` : `po ${o.po}`}. Je od nás ${ly(star[2])}.`;
                }
                var skyStar = star[0];
                $('#year-con').textContent = `Súhvezdie ${star[1]}`;
            }
            const sk = skyFor(skyStar);
            yState = { Y, k: kTxt, name: $('#year-name').textContent, con: $('#year-con').textContent, txt: $('#year-txt').textContent, plan: sk && sk.planInfo };
            if (sk) {
                $('#year-tonight').textContent = sk.tonight;
                $('#year-best').textContent = sk.best;
                $('#year-plan-t').textContent = sk.plan;
                $('#year-plan').hidden = !sk.plan;
            }
            // ďalšie hviezdy, z ktorých svetlo z vášho dňa ešte letí
            const fut = TL.filter(t => t0 + t[2] * YR > Date.now() && t[0] !== today).slice(0, 4);
            $('#year-tl-k').textContent = fut.length ? `Kedy k vám dorazí svetlo z ${prec === 'year' ? `roku ${Y}` : prec === 'month' ? `mesiaca ${label}` : `dňa ${label}`}` : '';
            ylUrls.forEach(u => URL.revokeObjectURL(u)); ylUrls = [];
            const ymd = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`; };
            $('#year-list').innerHTML = fut.map(t => {
                const arrT = t0 + t[2] * YR, arrY = new Date(arrT).getUTCFullYear(), n = Math.round(t[2]);
                const done = Math.max(0, Math.min(100, (Date.now() - t0) / (t[2] * YR) * 100));
                const when = prec === 'year' ? String(Math.round(Y + t[2])) : `${MON_NOM[new Date(arrT).getUTCMonth()]} ${arrY}`;
                const pm = '';
                // pri dátume: ak svetlo nedorazí blízko výročia, povieme o koľko pred ním alebo po ňom
                let annTxt = o.ann(n);
                if (prec !== 'year') {
                    const k = Math.max(1, Math.round((arrT - t0) / YR)), an = Date.UTC(new Date(t0).getUTCFullYear() + k, new Date(t0).getUTCMonth(), new Date(t0).getUTCDate(), 12);
                    const off = (arrT - an) / 864e5;
                    annTxt = Math.abs(off) <= Math.max(uncDays(t[2]), 45) ? o.ann(k) : `asi ${span(off)} ${off < 0 ? `pred ${o.near(k)}` : `po ${o.nearPo(k)}`}`;
                }
                const title = `Svetlo z hviezdy ${t[0]}: ${prec === 'year' ? o.ann(n) : annTxt}`;
                const det = `Okolo tohto dňa k nám dorazí svetlo, ktoré z hviezdy ${t[0]} (súhvezdie ${t[1]}) vyrazilo ${prec === 'year' ? `v roku ${Y}` : `${label}`}. Večer sa na ňu pozrite. https://www.kusoknekonecna.eu/#hviezda`;
                const day = prec === 'year' ? Date.UTC(Math.round(Y + t[2]), 6, 1) : arrT;
                const d1 = ymd(day), d2 = ymd(day + 864e5);
                const g = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${d1}/${d2}&details=${encodeURIComponent(det)}`;
                const ie = (x) => x.replace(/([\\;,])/g, '\\$1');
                const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kusok Nekonecna//SK', 'BEGIN:VEVENT', `UID:hviezda-${esc(t[0]).replace(/\W+/g, '')}-${d1}@kusoknekonecna.eu`,
                    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${d1}`, `DTEND;VALUE=DATE:${d2}`, `SUMMARY:${ie(title)}`, `DESCRIPTION:${ie(det)}`,
                    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${ie(title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
                const u = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); ylUrls.push(u);
                return `<li><div class="yl-top"><b>${esc(t[0])}</b><span class="yl-y">${esc(when)}</span></div>
                    <div class="yl-bar" aria-hidden="true"><i style="--w:${done.toFixed(1)}%"></i></div>
                    <p class="yl-sub">${esc(annTxt)}${esc(pm)}, svetlo prešlo ${Math.round(done)} % cesty</p>
                    <p class="sky-cal">Pripomenúť: <a href="${g}" target="_blank" rel="noopener">Google</a> <a href="${u}" download="svetlo-${d1}.ics">iný kalendár</a></p></li>`;
            }).join('');
            out.hidden = false; out.classList.remove('show'); void out.offsetWidth; out.classList.add('show');
        });
    }

    /* ── Mapa oblohy: čo je dnes nad vami ── */
    const mapCv = $('#sky-map');
    if (mapCv) {
        const RAD = Math.PI / 180, SPAN = 72, STEPMS = 6e5, S = 1000;
        const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
        const mixc = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
        const rgb = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
        let SK = null, tStart = 0, tSel = 0, objs = [], pick = null, playT = 0, raf = 0;
        const mSlider = $('#map-t'), pop = $('#map-pop'), mainEl = $('.map-main');
        const brMin = (t) => { const p = new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Bratislava' }).split(':'); return Number(p[0]) * 60 + Number(p[1]); };
        const fmtT = (t) => new Date(t).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bratislava' });
        const fmtD = (t) => { const d = new Date(t).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Bratislava' }); return d.charAt(0).toUpperCase() + d.slice(1); };
        function nightStart(now) { const m = brMin(now), delta = m < 360 ? m + 360 : m - 1080; return Math.floor((now - delta * 6e4) / 6e4) * 6e4; }
        const sunRD = (t) => {
            const n = t / 864e5 - 10957.5, L = (280.46 + 0.9856474 * n) * RAD, g = (357.528 + 0.9856003 * n) * RAD;
            const lam = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD, eps = (23.439 - 4e-7 * n) * RAD;
            return [((Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / RAD / 15) + 24) % 24, Math.asin(Math.sin(eps) * Math.sin(lam)) / RAD];
        };
        // Mesiac: skrátený Meeus (overené voči efemeridám, odchýlka do 0,05°)
        function moonRD(t) {
            const T = (t / 864e5 - 10957.5) / 36525, sn = Math.sin;
            const L = 218.3164477 + 481267.88123421 * T, D = (297.8501921 + 445267.1114034 * T) * RAD, M = (357.5291092 + 35999.0502909 * T) * RAD,
                Mp = (134.9633964 + 477198.8675055 * T) * RAD, F = (93.272095 + 483202.0175233 * T) * RAD, E = 1 - 0.002516 * T;
            const sl = 6288774 * sn(Mp) + 1274027 * sn(2 * D - Mp) + 658314 * sn(2 * D) + 213618 * sn(2 * Mp) - 185116 * E * sn(M) - 114332 * sn(2 * F) + 58793 * sn(2 * D - 2 * Mp)
                + 57066 * E * sn(2 * D - M - Mp) + 53322 * sn(2 * D + Mp) + 45758 * E * sn(2 * D - M) - 40923 * E * sn(M - Mp) - 34720 * sn(D) - 30383 * E * sn(M + Mp) + 15327 * sn(2 * D - 2 * F)
                - 12528 * sn(Mp + 2 * F) + 10980 * sn(Mp - 2 * F) + 10675 * sn(4 * D - Mp) + 10034 * sn(3 * Mp) + 8548 * sn(4 * D - 2 * Mp);
            const sb = 5128122 * sn(F) + 280602 * sn(Mp + F) + 277693 * sn(Mp - F) + 173237 * sn(2 * D - F) + 55413 * sn(2 * D - Mp + F) + 46271 * sn(2 * D - Mp - F)
                + 32573 * sn(2 * D + F) + 17198 * sn(2 * Mp + F) + 9266 * sn(2 * D + Mp - F) + 8822 * sn(2 * Mp - F);
            const lon = (L + sl / 1e6) * RAD, lat = sb / 1e6 * RAD, eps = (23.439291 - 0.0130042 * T) * RAD;
            const ra = Math.atan2(sn(lon) * Math.cos(eps) - Math.tan(lat) * sn(eps), Math.cos(lon));
            return [((ra / RAD / 15) % 24 + 24) % 24, Math.asin(sn(lat) * Math.cos(eps) + Math.cos(lat) * sn(eps) * sn(lon)) / RAD];
        }
        function planetRD(name, t) {
            const P = SK.planets, arr = P.d[name]; if (!arr) return null;
            const f = (t - P.t0) / P.step; if (f < 0 || f > P.n - 1) return null;
            const i = Math.floor(f), k = f - i, j = Math.min(P.n - 1, i + 1);
            const ra = arr[i * 3] + (arr[j * 3] - arr[i * 3]) * k, dec = arr[i * 3 + 1] + (arr[j * 3 + 1] - arr[i * 3 + 1]) * k;
            return [((ra % 24) + 24) % 24, dec, arr[i * 3 + 2]];
        }
        // galaktická rovina: body (ra, dec) pre b = 0
        const GAL = []; { const aG = 192.85948 * RAD, dG = 27.12825 * RAD, lN = 122.93192 * RAD;
            for (let l = 0; l <= 360; l += 3) { const x = lN - l * RAD; GAL.push([((aG + Math.atan2(Math.sin(x), -Math.sin(dG) * Math.cos(x))) / RAD / 15 + 24) % 24, Math.asin(Math.cos(dG) * Math.cos(x)) / RAD]); } }
        const SKL = { Venuša: ['#ffeab5', 'Venuša'], Jupiter: ['#f6dcb4', 'Jupiter'], Mars: ['#ff8f66', 'Mars'], Saturn: ['#ead59b', 'Saturn'], 'Merkúr': ['#d9d9d9', 'Merkúr'] };

        function moonDisc(c, x, y, r, phase, ang) {
            const lit = (1 - Math.cos(phase * 2 * Math.PI)) / 2, k = 1 - 2 * lit;
            c.save(); c.translate(x, y); c.rotate(ang);
            const gl = c.createRadialGradient(0, 0, r * .8, 0, 0, r * 3.2); gl.addColorStop(0, 'rgba(255,248,225,.35)'); gl.addColorStop(1, 'rgba(255,248,225,0)');
            c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 3.2, 0, 7); c.fill();
            c.fillStyle = '#2a2d3d'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
            // osvetlená strana vždy smeruje k Slnku (os +x), terminátor je polelipsa
            c.fillStyle = '#fff6df'; c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
            const rx = Math.abs(k) * r;
            if (k > 0) c.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, true); else c.ellipse(0, 0, rx, r, 0, Math.PI / 2, Math.PI * 1.5, false);
            c.fill(); c.restore();
        }

        function frame(t) {
            if (!SK) return;
            const css = mapCv.clientWidth || 560, dpr = Math.min(2, window.devicePixelRatio || 1), u = S / css;
            if (mapCv.width !== Math.round(css * dpr)) mapCv.width = mapCv.height = Math.round(css * dpr);
            const c = mapCv.getContext('2d'); c.setTransform(mapCv.width / S, 0, 0, mapCv.width / S, 0, 0); c.clearRect(0, 0, S, S);
            const cx = S / 2, cy = S / 2, R = S / 2 - (css < 520 ? 26 : 40) * u;
            const proj = (alt, az) => { const r = R * (90 - alt) / 90; return [cx - r * Math.sin(az * RAD), cy - r * Math.cos(az * RAD)]; };
            const sa = sunAlt(t), tw = clamp((sa + 18) / 18), dayk = clamp((sa + 2) / 10), dark = 1 - tw;
            objs = [];
            // nebo
            c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.clip();
            const zen = mixc(mixc([3, 4, 12], [22, 38, 88], tw ** 1.4), [58, 104, 170], dayk), hor = mixc(mixc([12, 16, 46], [66, 76, 138], tw), [150, 182, 214], dayk);
            const bg = c.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, rgb(zen)); bg.addColorStop(.7, rgb(mixc(zen, hor, .45))); bg.addColorStop(1, rgb(hor));
            c.fillStyle = bg; c.fillRect(0, 0, S, S);
            // Mliečna cesta
            if (dark > .35) {
                const pts = GAL.map(([ra, dec]) => altAz(ra, dec, t)), seg = [];
                c.lineCap = 'round'; c.lineJoin = 'round';
                if ('filter' in c) c.filter = `blur(${16 * u}px)`;
                c.strokeStyle = `rgba(176,168,255,${(.13 * dark).toFixed(3)})`; c.lineWidth = 62 * u;
                let open = false; c.beginPath();
                pts.forEach(([a, z]) => { if (a < -4) { open = false; return; } const [x, y] = proj(a, z); if (!open) { c.moveTo(x, y); open = true; } else c.lineTo(x, y); });
                c.stroke();
                if ('filter' in c) c.filter = 'none';
            }
            // pomocná sieť
            c.strokeStyle = 'rgba(236,234,228,.07)'; c.lineWidth = 1 * u; c.setLineDash([4 * u, 6 * u]);
            [30, 60].forEach(a => { c.beginPath(); c.arc(cx, cy, R * (90 - a) / 90, 0, 7); c.stroke(); });
            c.setLineDash([]); c.beginPath(); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.stroke();
            const starA = (mag) => clamp(((-sa) - 1 - Math.max(0, mag + 1.5) * 1.6) / 9);
            const lab = []; const out = (x, y, w, h) => [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].some(([a, b]) => Math.hypot(a - cx, b - cy) > R - 6 * u);
            const hit = (x, y, w, h) => out(x, y, w, h) || lab.some(b => x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1]);
            const small = css < 520;
            const place = (txt, x, y, col, size = 13, italic = false, dx = 8) => {
                c.font = `${italic ? 'italic ' : ''}${size * u}px "Instrument Sans", sans-serif`;
                const w = c.measureText(txt).width, h = size * u * 1.1;
                for (const [ox, oy] of [[dx * u, -4 * u], [-w - dx * u, -4 * u], [dx * u, 14 * u], [-w - dx * u, 14 * u]]) {
                    if (!hit(x + ox, y + oy - h, w, h)) { lab.push([x + ox, y + oy - h, w, h]); c.fillStyle = col; c.fillText(txt, x + ox, y + oy); return; }
                }
            };
            // hviezdy (polohy), obrazce
            const pos = {}; SK.stars.forEach(s => { const [a, z] = altAz(s[1], s[2], t); pos[s[0]] = [a, z]; });
            c.lineWidth = 1.2 * u;
            SK.lines.forEach(([nm, segs]) => {
                c.strokeStyle = `rgba(184,164,255,${(.34 * (1 - dayk)).toFixed(3)})`; let sx = 0, sy = 0, n = 0;
                segs.forEach(([a, b]) => { const A = pos[a], B = pos[b]; if (!A || !B || A[0] < 0 || B[0] < 0) return; const [x1, y1] = proj(...A), [x2, y2] = proj(...B); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); sx += x1 + x2; sy += y1 + y2; n += 2; });
                if (n >= 6 && dayk < .5 && !small) { const x = sx / n, y = sy / n; c.font = `italic ${12.5 * u}px "Instrument Sans", sans-serif`; const w = c.measureText(nm).width; lab.push([x - w / 2, y - 14 * u, w, 16 * u]); c.fillStyle = `rgba(184,164,255,${(.6 * dark + .1).toFixed(2)})`; c.fillText(nm, x - w / 2, y + 22 * u); }
            });
            // hviezdy
            SK.stars.slice().sort((a, b) => b[3] - a[3]).forEach(s => {
                const [a, z] = pos[s[0]]; if (a < -.5) return;
                const [x, y] = proj(a, z), al = starA(s[3]) * clamp(.55 + a / 14, .55, 1); if (al <= .02) return;
                const r = (0.9 + (3.8 - s[3]) * 0.95) * u * .8;
                if (s[3] < 1.6) { const g = c.createRadialGradient(x, y, 0, x, y, r * 4.5); g.addColorStop(0, `rgba(210,205,255,${(.5 * al).toFixed(2)})`); g.addColorStop(1, 'rgba(210,205,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 4.5, 0, 7); c.fill(); }
                c.fillStyle = `rgba(250,248,255,${al.toFixed(2)})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
                objs.push({ x, y, hr: Math.max(r + 8 * u, 14 * u), name: s[0], kind: 'Hviezda', alt: a, az: z, mag: s[3] });
            });
            // popisy najjasnejších hviezd
            SK.stars.filter(s => s[3] < (small ? .8 : 1.45) || (!small && s[0] === 'Polárka')).sort((a, b) => a[3] - b[3]).forEach(s => {
                const [a, z] = pos[s[0]]; if (a < 4 || starA(s[3]) < .35) return; const [x, y] = proj(a, z);
                place(s[0], x, y, `rgba(236,234,228,${(.75 * clamp(starA(s[3]) * 1.2)).toFixed(2)})`, 12.5);
            });
            // objekty z mojich snímok a známe objekty
            SK.dso.forEach(d => {
                const [a, z] = altAz(d[1], d[2], t); d.alt = a; d.az = z; if (a < 0) return;
                const [x, y] = proj(a, z), mine = d[3] === 1, fade = clamp(1 - dayk * 1.2);
                if (mine) {
                    const g = c.createRadialGradient(x, y, 0, x, y, 24 * u); g.addColorStop(0, `rgba(141,107,255,${(.55 * fade).toFixed(2)})`); g.addColorStop(1, 'rgba(141,107,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 24 * u, 0, 7); c.fill();
                    c.strokeStyle = `rgba(200,184,255,${fade.toFixed(2)})`; c.lineWidth = 1.8 * u; c.beginPath(); c.arc(x, y, 8 * u, 0, 7); c.stroke();
                    c.fillStyle = `rgba(232,182,90,${fade.toFixed(2)})`; c.beginPath(); c.arc(x, y, 2.2 * u, 0, 7); c.fill();
                    place(small ? ({ 'Dvojitá hviezdokopa v Perzeovi': 'Perzeus', 'Hmlovina Tulipán': 'Tulipán', 'Hmlovina Jaskyňa': 'Jaskyňa', 'Galaxia M101': 'M101' }[d[0]] || d[0]) : d[0], x, y, `rgba(226,216,255,${fade.toFixed(2)})`, small ? 12.5 : 13.5, false, 13);
                } else {
                    c.strokeStyle = `rgba(165,168,184,${(.8 * fade).toFixed(2)})`; c.lineWidth = 1.2 * u; c.beginPath(); c.arc(x, y, 5 * u, 0, 7); c.stroke();
                    if (!small) place(d[0].split(' v ')[0], x, y, `rgba(165,168,184,${(.9 * fade).toFixed(2)})`, 12, true, 10);
                }
                objs.push({ x, y, hr: 20 * u, name: d[0], kind: mine ? 'Moja snímka' : 'Objekt hlbokého vesmíru', alt: a, az: z, mine });
            });
            // planéty
            const planets = [];
            ['Merkúr', 'Venuša', 'Mars', 'Jupiter', 'Saturn'].forEach(n => {
                const p = planetRD(n, t); if (!p) return; const [a, z] = altAz(p[0], p[1], t); planets.push({ n, a, z, mag: p[2] }); if (a < 0) return;
                const [x, y] = proj(a, z), r = clamp(2.6 + (2.2 - p[2]) * .9, 2.2, 6.5) * u, col = SKL[n][0], al = clamp(1 - dayk * 1.1);
                const g = c.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.globalAlpha = al; c.beginPath(); c.arc(x, y, r * 4, 0, 7); c.fill();
                c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.globalAlpha = 1;
                place(n, x, y, `rgba(255,243,214,${(.9 * al).toFixed(2)})`, 13, false, 10);
                objs.push({ x, y, hr: 16 * u, name: n, kind: 'Planéta', alt: a, az: z });
            });
            // Slnko a Mesiac
            const [sra, sdec] = sunRD(t), [sAlt, sAz] = altAz(sra, sdec, t), [mra, mdec] = moonRD(t);
            let [mAlt, mAz] = altAz(mra, mdec, t); mAlt -= 0.95 * Math.cos(mAlt * RAD);   // paralaxa
            const sp = proj(sAlt, sAz);
            if (sAlt > -3) { const g = c.createRadialGradient(sp[0], sp[1], 0, sp[0], sp[1], 60 * u); g.addColorStop(0, 'rgba(255,236,170,.95)'); g.addColorStop(.25, 'rgba(255,214,120,.5)'); g.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(sp[0], sp[1], 60 * u, 0, 7); c.fill(); place('Slnko', sp[0], sp[1], '#ffe9b0', 13, false, 14); objs.push({ x: sp[0], y: sp[1], hr: 22 * u, name: 'Slnko', kind: 'Slnko', alt: sAlt, az: sAz }); }
            const dA = ((mra - sra) * 15 + 360) % 360, el = Math.acos(clamp(Math.sin(mdec * RAD) * Math.sin(sdec * RAD) + Math.cos(mdec * RAD) * Math.cos(sdec * RAD) * Math.cos(dA * RAD), -1, 1)) / RAD;
            const phase = dA < 180 ? el / 360 : 1 - el / 360, illumP = Math.round((1 - Math.cos(el * RAD)) / 2 * 100);
            const mp = proj(mAlt, mAz);
            if (mAlt > -.5) {
                const ang = Math.atan2(sp[1] - mp[1], sp[0] - mp[0]);
                moonDisc(c, mp[0], mp[1], 11 * u, phase, ang); place('Mesiac', mp[0], mp[1], '#fff3d0', 13, false, 18);
                objs.push({ x: mp[0], y: mp[1], hr: 20 * u, name: 'Mesiac', kind: `Mesiac, osvetlený na ${illumP} %`, alt: mAlt, az: mAz });
            }
            c.restore();
            // obzor a svetové strany
            c.strokeStyle = 'rgba(184,164,255,.55)'; c.lineWidth = 2 * u; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
            c.font = `600 ${15 * u}px "Instrument Sans", sans-serif`; c.fillStyle = '#cfc6ff'; c.textAlign = 'center'; c.textBaseline = 'middle';
            [['S', cx, cy - R - 17 * u], ['J', cx, cy + R + 17 * u], ['V', cx - R - 17 * u, cy], ['Z', cx + R + 17 * u, cy]].forEach(([l, x, y]) => c.fillText(l, x, y));
            c.textAlign = 'start'; c.textBaseline = 'alphabetic';
            // zvýraznenie vybraného objektu
            if (pick) { const o = objs.find(q => q.name === pick); if (o) { c.strokeStyle = '#fff'; c.lineWidth = 1.5 * u; c.beginPath(); c.arc(o.x, o.y, 15 * u, 0, 7); c.stroke(); } }
            return { sa, planets, mAlt, mAz, illumP, phase };
        }

        const findDso = (n) => SK.dso.find(d => d[0] === n);
        function updateSide(t, info) {
            const sa = info.sa;
            // ráno (Slnko stúpa) sa obloha vyjasňuje, večer stmieva
            const rising = sunAlt(t + 6e5) > sa;
            const phaseTxt = sa > -0.8 ? 'Slnko je nad obzorom, hviezdy nevidno.'
                : sa > -6 ? (rising ? 'Svitá, hviezdy miznú.' : 'Súmrak, vidno len najjasnejšie hviezdy.')
                : sa > -12 ? (rising ? 'Obloha sa vyjasňuje, slabšie hviezdy už miznú.' : 'Stmieva sa, pribúdajú hviezdy.')
                : sa > -18 ? (rising ? 'Blíži sa svitanie, tma už nie je úplná.' : 'Skoro úplná tma.')
                : 'Úplná tma, vidno aj Mliečnu cestu.';
            $('#map-when').innerHTML = `<b>${esc(fmtD(t))}, ${esc(fmtT(t))}</b><br>${phaseTxt}`;
            $$('#map-list li').forEach(li => {
                const d = findDso(li.dataset.n); if (!d) return; const [a, z] = altAz(d[1], d[2], t);
                let txt;
                if (a > 3) txt = `${Math.round(a)}° nad obzorom, ${dir(z)}`;
                else { let up = 0; for (let k = 1; k <= 144; k++) { const tt = t + k * 6e5; if (altAz(d[1], d[2], tt)[0] > 3) { up = tt; break; } } txt = up ? `Pod obzorom, vyjde o ${fmtT(up)}` : 'Pod obzorom'; }
                $('.ml-s', li).textContent = txt; li.classList.toggle('is-up', a > 3);
            });
            // vždy rovnaký zoznam (Mesiac a všetky planéty), aby sa pri posúvaní času nemenila výška a mapa neposkakovala
            const rows = [[`Mesiac, ${info.illumP} %`, info.mAlt > 0 ? `${Math.round(info.mAlt)}° nad obzorom, ${dir(info.mAz)}` : 'Pod obzorom', info.mAlt > 0]];
            info.planets.forEach(p => rows.push([p.n, p.a > 3 ? `${Math.round(p.a)}° nad obzorom, ${dir(p.z)}` : 'Pod obzorom', p.a > 3]));
            $('#map-list2').innerHTML = rows.map(r => `<li class="${r[2] ? 'is-up' : 'is-down'}"><span class="ml-n">${esc(r[0])}</span><span class="ml-s">${esc(r[1])}</span></li>`).join('');
        }
        function render() {
            raf = 0; const t = tStart + Number(mSlider.value) * STEPMS; tSel = t;
            const info = frame(t); if (!info) return; updateSide(t, info);
            $('#map-now').hidden = !(Date.now() >= tStart && Date.now() <= tStart + SPAN * STEPMS);
            if (pick) showPop(pick, true);
        }
        const queue = () => { if (!raf) raf = requestAnimationFrame(render); };
        function showPop(name, keep) {
            const o = objs.find(q => q.name === name); if (!o) { pop.hidden = true; return; }
            const css = mapCv.clientWidth, sc = css / S, mine = o.mine, g = mine ? $$('.g-item').find(b => b.dataset.title === name) : null;
            pop.innerHTML = `<b>${esc(o.name)}</b><span>${esc(o.kind)}</span><span>${Math.round(o.alt)}° nad obzorom, ${dir(o.az)}</span>${g ? '<button type="button" class="btn btn-star" id="map-open">Pozrieť obraz</button>' : ''}`;
            pop.hidden = false; const pw = pop.offsetWidth, ph = pop.offsetHeight;
            pop.style.left = clamp(o.x * sc - pw / 2, 4, css - pw - 4) + 'px'; pop.style.top = clamp(o.y * sc + 18, 4, css - ph - 4) + 'px';
            if (g) $('#map-open').addEventListener('click', () => g.click());
        }
        function at(ev) {
            const r = mapCv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * S, y = (ev.clientY - r.top) / r.height * S;
            let best = null, bd = 1e9; objs.forEach(o => { const d = Math.hypot(o.x - x, o.y - y); if (d < o.hr && d - (o.mine ? 8 : 0) < bd) { bd = d - (o.mine ? 8 : 0); best = o; } }); return best;
        }
        mapCv.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const o = at(e); mapCv.style.cursor = o ? 'pointer' : 'default'; });
        mapCv.addEventListener('click', (e) => { const o = at(e); pick = o ? o.name : null; if (o) showPop(o.name); else pop.hidden = true; queue(); });
        // posun času zruší vybraný objekt, ktorý by inak putoval po oblohe s ním
        const unpick = () => { pick = null; pop.hidden = true; };
        mSlider.addEventListener('input', () => { stopPlay(); unpick(); queue(); });
        $('#map-now').addEventListener('click', () => { stopPlay(); unpick(); mSlider.value = clamp(Math.round((Date.now() - tStart) / STEPMS), 0, SPAN); queue(); });
        const playBtn = $('#map-play');
        function stopPlay() { if (playT) { clearInterval(playT); playT = 0; playBtn.textContent = 'Prehrať noc'; } }
        playBtn.addEventListener('click', () => {
            if (playT) { stopPlay(); return; }
            unpick();
            if (Number(mSlider.value) >= SPAN) mSlider.value = 0;
            playBtn.textContent = 'Zastaviť';
            playT = setInterval(() => { const v = Number(mSlider.value) + 1; if (v > SPAN) { stopPlay(); return; } mSlider.value = v; queue(); }, 90);
        });
        window.addEventListener('resize', queue, { passive: true });

        function init() {
            const now = Date.now(); tStart = nightStart(now);
            const inNight = now >= tStart && now <= tStart + SPAN * STEPMS;
            mSlider.max = SPAN; mSlider.value = inNight ? Math.round((now - tStart) / STEPMS) : 24;
            $('#map-t0').textContent = fmtT(tStart); $('#map-t1').textContent = fmtT(tStart + SPAN * STEPMS);
            const list = $('#map-list');
            list.innerHTML = SK.dso.filter(d => d[3] === 1).map(d => {
                const has = $$('.g-item').some(b => b.dataset.title === d[0]);
                return `<li data-n="${esc(d[0])}"><span class="ml-n">${esc(d[0])}</span><span class="ml-s"></span>${has ? `<button type="button" class="ml-go" data-n="${esc(d[0])}" aria-label="Pozrieť obraz: ${esc(d[0])}">Obraz</button>` : ''}</li>`;
            }).join('');
            $$('.ml-go', list).forEach(b => b.addEventListener('click', () => $$('.g-item').find(g => g.dataset.title === b.dataset.n)?.click()));
            $$('li', list).forEach(li => li.addEventListener('mouseenter', () => { pick = li.dataset.n; queue(); }));
            list.addEventListener('mouseleave', () => { pick = null; pop.hidden = true; queue(); });
            render();
        }

        /* ── Hviezdny kalendár: nov, spln, meteorické roje a planéty na 12 mesiacov ── */
        const illumAt = (t) => { const [sra, sdec] = sunRD(t), [mra, mdec] = moonRD(t);
            const el = Math.acos(clamp(Math.sin(mdec * RAD) * Math.sin(sdec * RAD) + Math.cos(mdec * RAD) * Math.cos(sdec * RAD) * Math.cos(((mra - sra) * 15) * RAD), -1, 1)) / RAD;
            return Math.round((1 - Math.cos(el * RAD)) / 2 * 100); };
        const SHOWERS = [
            { n: 'Kvadrantidy', m: 1, d: 3, z: 'Pastier', r: 'Krátky vrchol, v dobrých rokoch aj okolo 100 meteorov za hodinu.' },
            { n: 'Lyridy', m: 4, d: 22, z: 'Lýra', r: 'Pokojný roj, zvyčajne okolo 20 meteorov za hodinu.' },
            { n: 'Perzeidy', m: 8, d: 12, z: 'Perzeus', r: 'Najobľúbenejší roj leta, až okolo 100 meteorov za hodinu.' },
            { n: 'Orionidy', m: 10, d: 21, z: 'Orión', r: 'Prach z Halleyho kométy, okolo 20 meteorov za hodinu.' },
            { n: 'Leonidy', m: 11, d: 17, z: 'Lev', r: 'Rýchle meteory, okolo 15 za hodinu.' },
            { n: 'Geminidy', m: 12, d: 13, z: 'Blíženci', r: 'Najbohatší roj roka, až okolo 150 meteorov za hodinu.' }
        ];
        const calList = $('#cal-list'), calMore = $('#cal-more'); let calFilter = 'all', calUrl = '', calOpen = false;
        const ymdS = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const MON_S = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];
        function calEvents() {
            const now = Date.now(), end = now + 366 * 864e5, ev = [];
            // nov a spln z už existujúcich výpočtov
            let k = Math.floor(((new Date()).getFullYear() + (new Date()).getMonth() / 12 - 1900) * 12.3685) - 2;
            for (let i = 0; i < 18; i++, k++) [[0, 'new'], [.5, 'full']].forEach(([ph, kind]) => {
                const t = truePhase(k, ph); if (t < now - 864e5 || t > end) return;
                ev.push({ t, kind: 'moon', ph: kind, name: kind === 'new' ? 'Nov Mesiaca' : 'Spln Mesiaca',
                    note: kind === 'new' ? 'Najtmavšia obloha mesiaca, ideálna na Mliečnu cestu a hlboký vesmír.' : 'Jasný Mesiac prežiari hmloviny. Dobrý čas na fotenie Mesiaca a krajiny.' });
            });
            // meteorické roje, rušenie Mesiacom vo vrcholnú noc
            [new Date().getFullYear(), new Date().getFullYear() + 1].forEach(y => SHOWERS.forEach(s => {
                const t = Date.UTC(y, s.m - 1, s.d, 11); if (t < now - 864e5 || t > end) return;
                const il = illumAt(t + 12 * 36e5), q = il < 25 ? 'Mesiac ruší málo' : il < 60 ? 'Mesiac čiastočne ruší' : 'Jasný Mesiac prežiari slabšie meteory';
                ev.push({ t, kind: 'meteor', name: s.n, note: `Vrcholná noc. ${q} (${il} %). ${s.r}`, q: il < 25 ? 2 : il < 60 ? 1 : 0 });
            }));
            // planéty
            if (SK && SK.events) SK.events.forEach(([ds, pn, ty, deg]) => {
                const t = Date.parse(ds + 'T12:00:00Z'); if (t < now - 864e5 || t > end) return;
                if (ty === 'opp') ev.push({ t, kind: 'planet', name: `${pn} v opozícii`, note: 'Planéta je oproti Slnku, je celú noc na oblohe a najlepšie sa pozoruje.' });
                else ev.push({ t, kind: 'planet', name: `Venuša najďalej od Slnka`, note: ty === 'elong-v' ? `Uhlová vzdialenosť ${String(deg).replace('.', ',')}°, Venuša je dobre vidieť večer po západe Slnka.` : `Uhlová vzdialenosť ${String(deg).replace('.', ',')}°, Venuša je dobre vidieť ráno pred východom Slnka.` });
            });
            return ev.sort((a, b) => a.t - b.t);
        }
        function renderCal() {
            if (!calList) return;
            const all = calEvents(), shown = all.filter(e => calFilter === 'all' || e.kind === calFilter);
            // najprv len najbližšie tri mesiace, zvyšok roka na tlačidlo (zoznam nemá vlastné posúvanie, nech sa v ňom stránka „nezasekne“)
            const cut = Date.now() + 92 * 864e5, list = calOpen ? shown : shown.filter(e => e.t < cut), rest = shown.length - list.length;
            if (calMore) { calMore.hidden = !calOpen && !rest; calMore.textContent = calOpen ? 'Zobraziť menej' : `Zobraziť celý rok (ešte ${rest})`; calMore.setAttribute('aria-expanded', String(calOpen)); }
            let cur = '', html = '';
            list.forEach(e => {
                const d = new Date(e.t), mk = `${d.getFullYear()}-${d.getMonth()}`;
                if (mk !== cur) { cur = mk; html += `<li class="cal-m">${MON[d.getMonth()]} ${d.getFullYear()}</li>`; }
                const nd = new Date(e.t + 864e5), title = `${e.name}`, det = `${e.note} https://www.kusoknekonecna.eu/#kalendar`;
                const g = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${ymdS(d)}/${ymdS(nd)}&details=${encodeURIComponent(det)}`;
                const dayTxt = new Date(e.t).toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Bratislava' });
                const wd = new Date(e.t).toLocaleDateString('sk-SK', { weekday: 'short', timeZone: 'Europe/Bratislava' });
                html += `<li class="cal-r cal-${e.kind}${e.q === 2 ? ' is-good' : ''}"><div class="cal-d"><b>${esc(dayTxt)}</b><span>${esc(wd)}</span></div>
                    <div class="cal-t"><b>${esc(e.name)}</b><span>${esc(e.note)}</span></div>
                    <a class="cal-a" href="${g}" target="_blank" rel="noopener" aria-label="Pripomenúť do Google kalendára: ${esc(e.name)}">Pripomenúť</a></li>`;
            });
            calList.innerHTML = html || '<li class="cal-m">Pre tento výber zatiaľ nič nie je.</li>';
            if (calUrl) URL.revokeObjectURL(calUrl);
            const fold = (l) => l.length > 70 ? l.match(/.{1,70}/g).join('\r\n ') : l, ie = (x) => x.replace(/([\;,])/g, '\\$1');
            const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kusok Nekonecna//SK'];
            shown.forEach((e, i) => { const d = new Date(e.t), nd = new Date(e.t + 864e5);
                lines.push('BEGIN:VEVENT', `UID:kal-${ymdS(d)}-${i}@kusoknekonecna.eu`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${ymdS(d)}`, `DTEND;VALUE=DATE:${ymdS(nd)}`, fold(`SUMMARY:${ie(e.name)}`), fold(`DESCRIPTION:${ie(e.note)}`), 'END:VEVENT'); });
            lines.push('END:VCALENDAR');
            calUrl = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
            $('#cal-all-ics').href = calUrl; $('#cal-all').hidden = !shown.length;
        }
        calMore?.addEventListener('click', () => { const wasOpen = calOpen; calOpen = !calOpen; renderCal(); if (wasOpen) $('#kalendar').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
        $$('.cal-filter .chip').forEach(c => c.addEventListener('click', () => { calFilter = c.dataset.f; $$('.cal-filter .chip').forEach(x => { x.classList.toggle('is-on', x === c); x.setAttribute('aria-pressed', String(x === c)); }); renderCal(); }));
        renderCal();

        // údaje sa načítajú, keď sa návštevník priblíži k mape
        let loading = false;
        const load = () => {
            if (loading || SK) return; loading = true;
            const sc = document.createElement('script'); sc.src = 'skydata.js';
            sc.onload = () => { SK = window.SKYDATA; init(); renderCal(); };
            sc.onerror = () => { $('#map-when').textContent = 'Mapu sa nepodarilo načítať. Skúste stránku obnoviť.'; };
            document.head.appendChild(sc);
        };
        if ('IntersectionObserver' in window) { const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '600px 0px' }); io.observe($('#mapa')); } else load();
    }

    /* ── Hviezdopis 2027: ukážka mesačnej dvojstrany a predobjednávka ──
       NOTEBOOK: ceny a termíny si upravte podľa ponuky tlačiarne. */
    const NOTEBOOK = { price: 34, early: 29, ltd: 54, ltdEarly: 49, earlyTo: '2026-11-15', ship: 'v prvom decembrovom týždni', year: 2027,
        ltdTotal: 25,      // číslovaná edícia s obrazom: počet kusov
        ltdLeft: null,     // koľko kusov ešte zostáva (prepíšte ručne, napr. 18); null = počítadlo sa neukazuje
        bundle: 5,         // druhý a každý ďalší Hviezdopis o toľko € lacnejší
        goal: 10,          // koľko predobjednávok treba, aby sa tlač oplatila
        orders: 0 };       // koľko predobjednávok už je (prepíšte ručne pri každej novej)
    const nbQty = (it) => it.qty || Number((/(\d+) ks/.exec(it.size || '') || [])[1] || 1);
    const nbBundle = (n) => n > 1 ? NOTEBOOK.bundle * (n - 1) : 0;
    const skDays = (n) => n === 1 ? '1 deň' : n < 5 ? `${n} dni` : `${n} dní`;
    const nbEarly = () => new Date() <= new Date(NOTEBOOK.earlyTo + 'T23:59:59');
    {
        const tabs = $('#nb-months');
        if (tabs) {
            const MONTHS = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];
            const MON_G = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
            // fotka mesiaca a krátka ľudská poznámka na okraj
            // fotka mesiaca a krátka poznámka o tom, čo je v tom mesiaci na oblohe zvláštne
            const M = [
                ['Pár galaxií', 'V januári sa stmieva už o pol piatej, takže na hviezdy netreba čakať dlho. Stačí sa poriadne teplo obliecť.'],
                ['Galaxia M101', 'Zimná obloha má najviac jasných hviezd z celého roka. Orión, Sírius a Plejády uvidíte aj z mesta.'],
                ['Mineral Moon', 'Deň a noc sú v marci rovnako dlhé. Zimné súhvezdia sa večer pomaly strácajú na západe.'],
                ['Starfall', 'Jarná obloha nemá veľa jasných hviezd, zato je na nej veľa galaxií.'],
                ['Polárna žiara', 'Noci sa skracujú a tma prichádza až po desiatej. Polárna žiara sa dá zo Slovenska vidieť len výnimočne, v máji 2024 to vyšlo.'],
                ['Star Catcher', 'Najkratšie noci roka. Úplná tma takmer nenastane, obloha na severe zostáva svetlá aj okolo polnoci.'],
                ['Antitéza', 'Mliečna cesta je najlepšie vidieť v lete, nízko nad južným obzorom. Treba na to miesto bez pouličných svetiel.'],
                ['Stráž si svoje svetlo', 'Perzeidy sú najznámejší roj padajúcich hviezd. Stačí deka, tmavé miesto a trochu trpezlivosti.'],
                ['Spln Mesiaca', 'Noci sú už dlhšie a ešte teplé. Najpríjemnejší čas na prvý celý večer pod hviezdami.'],
                ['Hmlovina Jaskyňa', 'Stmieva sa skoro a noci sú dlhé. Keď je jasno, október patrí k najlepším mesiacom na hviezdy.'],
                ['Hmlovina Tulipán', 'V novembri býva často hmla a zamračené. Keď sa však vyjasní, obloha je veľmi čistá.'],
                ['Bublina', 'Najdlhšie noci roka a Geminidy, najbohatší roj padajúcich hviezd.']
            ];
            // padajúce hviezdy: názov, deň vrcholu, ľudský popis
            const SHOW = { 1: ['Kvadrantidy', 3, 'najviac pred svitaním'], 4: ['Lyridy', 22, 'menej výrazné'], 5: ['Eta Akvaridy', 6, 'najviac pred svitaním'], 8: ['Perzeidy', 12, 'najznámejšie'], 10: ['Orionidy', 21, 'drobné úlomky Halleyho kométy'], 11: ['Leonidy', 17, 'veľmi rýchle'], 12: ['Geminidy', 14, 'najbohatšie v roku'] };
            const Y = NOTEBOOK.year;
            const TZ = 'Europe/Bratislava';
            const dayKey = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ });          // 2027-10-21
            const hm = (t) => new Date(t).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
            const ageAt = (t) => ((((t / 864e5) - ref) % SYN) + SYN) % SYN;
            function moonSvg(t, cls = '') {
                const age = ageAt(t), k = Math.cos(2 * Math.PI * age / SYN), r = 10, rx = Math.abs(k) * r, wax = age < SYN / 2;
                const d = wax ? `M0,-${r} A${r},${r} 0 0 1 0,${r} A${rx},${r} 0 0 ${k > 0 ? 0 : 1} 0,-${r}Z` : `M0,-${r} A${r},${r} 0 0 0 0,${r} A${rx},${r} 0 0 ${k > 0 ? 1 : 0} 0,-${r}Z`;
                return `<svg class="nb-ms ${cls}" viewBox="-12 -12 24 24" aria-hidden="true"><circle r="${r}" class="d"/><path d="${d}" class="l"/></svg>`;
            }
            // čas, keď Slnko klesne pod obzor (alebo pod daný uhol) v daný deň
            function sunBelow(day, deg) {
                let lo = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12), hi = lo + 10 * 36e5;
                if (sunAlt(hi) > deg) return null;
                for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (sunAlt(mid) > deg) lo = mid; else hi = mid; }
                return hi;
            }
            function phasesIn(m) {
                const out = [], start = Date.UTC(Y, m, 1) - 2 * 36e5, end = Date.UTC(Y, m + 1, 1) - 2 * 36e5;
                let k = Math.floor((Y + m / 12 - 1900) * 12.3685) - 2;
                for (let i = 0; i < 4; i++, k++) [['nov', 0], ['prvá štvrť', .25], ['spln', .5], ['posledná štvrť', .75]].forEach(([n, ph]) => { const t = truePhase(k, ph); if (t >= start && t < end) out.push({ t, n, ph }); });
                return out.sort((a, b) => a.t - b.t);
            }
            const dmTxt = (t) => { const d = new Date(new Date(t).toLocaleString('en-US', { timeZone: TZ })); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
            const dmLong = (t) => { const d = new Date(new Date(t).toLocaleString('en-US', { timeZone: TZ })); return `${d.getDate()}. ${MON_G[d.getMonth()]}`; };
            tabs.innerHTML = MONTHS.map((n, i) => `<button type="button" role="tab" aria-selected="false" data-m="${i}">${n.slice(0, 3)}</button>`).join('');
            let cur = new Date().getMonth(), view = 'cover';
            // fotka mesiaca sa nikdy neoreže: výška sa prispôsobí jej pomeru strán, na výšku stojí na tmavom podklade
            // fotka mesiaca vyplní celú stranu (priblíži sa, neotáča sa); FOCUS = ktorá časť fotky ostane pri širokých záberoch
            // fotky, ktoré sú zatiaľ len v Hviezdopise (Mineral Moon je otočený o 90° a orezaný bez loga, Mesiac ostáva celý)
            const NB_EXTRA = {
                'Mineral Moon': { big: 'assets/img/hviezdopis/mineral-moon.webp', small: 'assets/img/hviezdopis/mineral-moon-sm.webp', meta: 'Spln 3. 3. 2026. Pár desiatok fotografií a nenápadná šedá sa zmení na explóziu farieb.' },
                'Bublina': { big: 'assets/img/hviezdopis/bublina.webp', small: 'assets/img/hviezdopis/bublina-sm.webp', meta: 'NGC 7635, súhvezdie Kasiopeja' }
            };
            const FOCUS = { 'Dvojitá hviezdokopa v Perzeovi': '30% 50%', 'Spln Mesiaca': '64% 50%', 'Pár galaxií': '50% 55%', 'Star Catcher': '33% 50%', 'Hmlovina Tulipán': '33% 50%', 'Hmlovina Jaskyňa': '40% 50%' };
            // fotka sa ukáže hneď (náhľad z galérie je už načítaný), ostrá veľká verzia ju potichu nahradí
            // dve vrstvy: spodná = náhľad z galérie (už načítaný, ukáže sa hneď), horná = ostrá veľká verzia,
            // ktorá sa prelíne až keď je dekódovaná; pri prepnutí mesiaca tak nikdy neblikne čierna plocha
            const setImg = (im, big, small, pos) => {
                const lo = $('#nb-img-lo'), want = big || small || '';
                if (im.dataset.want === want) return;
                im.dataset.want = want; [lo, im].forEach(x => { x.style.objectPosition = pos || '50% 50%'; });
                im.classList.remove('in');
                if (small && lo) lo.src = small;
                if (!big) return;
                const pre = new Image(); pre.src = big;
                (pre.decode ? pre.decode() : Promise.resolve()).catch(() => {}).then(() => { if (im.dataset.want !== want) return; im.src = big; requestAnimationFrame(() => { if (im.dataset.want === want) im.classList.add('in'); }); });
            };
            const bigOf = (title) => { const it = $$('.g-item').find(b => b.dataset.title === title); return it ? (it.dataset.src || '').split(',')[0].trim().replace(/\.jpg(\?|$)/, '.webp$1') : ''; };
            function render(anim = 'flip') {
                const m = cur;
                $$('button', tabs).forEach(b => b.setAttribute('aria-selected', String(Number(b.dataset.m) === m)));
                const [title, whim] = M[m], it = $$('.g-item').find(b => b.dataset.title === title);
                const ex = NB_EXTRA[title];
                const src = ex ? ex.small : it ? ($('img', it).currentSrc || pic($('img', it).getAttribute('src'))) : '';
                const big = ex ? ex.big : it ? (it.dataset.src || '').split(',')[0].trim().replace(/\.jpg(\?|$)/, '.webp$1') : '';   // veľká verzia, fotka je priblížená na celú stranu
                const ph = phasesIn(m), nm = ph.find(x => x.ph === 0), fm = ph.find(x => x.ph === .5), sh = SHOW[m + 1];
                const darkFrom = nm ? nm.t - 3 * 864e5 : 0, darkTo = nm ? nm.t + 3 * 864e5 : 0;
                
                if (view === 'month') {
                    setImg($('#nb-img'), big, src, FOCUS[title]); $('#nb-img').alt = title; $('.nb-photo').classList.toggle('fit-contain', !!(ex && ex.fit === 'contain'));
                    const meta = ex ? ex.meta : it ? ($('.g-meta', it)?.textContent || '') : '';
                    $('#nb-cap').innerHTML = `<b>${esc(title)}</b>${meta ? `<span>${esc(meta)}</span>` : ''}`;
                    const sky = [];
                    if (sh) sky.push(`<b>Padajúce hviezdy</b> ${sh[0]}, ${sh[1]}. ${MON_G[m]}`);
                    if (fm) sky.push(`<b>Spln</b> ${dmLong(fm.t)}. Mesiac svieti celú noc, slabšie hviezdy vtedy nevidno.`);
                    $('#nb-sky').innerHTML = sky.map(x => `<li>${x}</li>`).join('');
                    $('#nb-whim').textContent = whim;
                    $('#nb-month').innerHTML = `${MONTHS[m]} <span>${Y}</span>`;
                    // mesačný kalendár od pondelka
                    const first = new Date(Date.UTC(Y, m, 1)), lead = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(Y, m + 1, 0)).getUTCDate();
                    const phByDay = {}; ph.forEach(p => { phByDay[dayKey(p.t)] = p; });
                    let html = `<p class="nb-cal-t">${MONTHS[m]}</p>` + ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(d => `<span class="nb-dh">${d}</span>`).join('');
                    for (let i = 0; i < lead; i++) html += '<span class="nb-d is-empty"></span>';
                    const cells = lead + days; 
                    for (let d = 1; d <= days; d++) {
                        const t = Date.UTC(Y, m, d, 20), key = `${Y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, p = phByDay[key];
                        const dark = nm && t >= darkFrom - 864e5 / 2 && t <= darkTo + 864e5 / 2, star = sh && sh[1] === d;
                        const icon = p && (p.ph === 0 || p.ph === .5) ? `<i class="nb-moon ${p.ph === 0 ? 'm-new' : 'm-full'}" title="${p.n}"></i>` : '';
                        html += `<span class="nb-d${dark ? ' is-dark' : ''}"><b>${d}</b>${icon}${star ? '<em title="padajúce hviezdy">✦</em>' : ''}</span>`;
                    }
                    for (let i = cells; i < Math.ceil(cells / 7) * 7; i++) html += '<span class="nb-d is-empty"></span>';
                    $('#nb-cal').innerHTML = html; $('#nb-cal').style.setProperty('--rows', Math.ceil(cells / 7));
                }
                if (view === 'week') {
                    // týždeň, v ktorom je nov: najtmavšie noci mesiaca
                    const anchor = nm ? new Date(nm.t) : new Date(Date.UTC(Y, m, 8));
                    const a0 = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
                    // window.__nbMon (časová značka pondelka) použije generátor tlačovej verzie na ľubovoľný týždeň roka
                    const OV = window.__nbMon != null;
                    const mon = OV ? new Date(window.__nbMon) : new Date(a0.getTime() - ((a0.getUTCDay() + 6) % 7) * 864e5);
                    const inWk = (t) => t >= mon.getTime() && t < mon.getTime() + 7 * 864e5;
                    const phW = OV ? [m - 1, m, m + 1].flatMap(phasesIn) : ph;
                    const nmW = OV ? phW.find(x => x.ph === 0 && inWk(x.t)) : nm, fmW = OV ? phW.find(x => x.ph === .5 && inWk(x.t)) : fm;
                    const shDay = (day) => { const q = SHOW[day.getUTCMonth() + 1]; return q && q[1] === day.getUTCDate() ? q : null; };
                    const NAMES = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
                    const row = (i) => {
                        const day = new Date(mon.getTime() + i * 864e5), tEve = day.getTime() + 20 * 36e5, ss = sunBelow(day, -0.83), st = sunBelow(day, -12);
                        const key = dayKey(tEve), p = phW.find(x => dayKey(x.t) === key), showStar = OV ? !!shDay(day) : (sh && day.getUTCMonth() === m && day.getUTCDate() === sh[1]);
                        const note = p ? (p.ph === 0 ? 'Nov' : p.ph === .5 ? 'Spln' : p.n.charAt(0).toUpperCase() + p.n.slice(1)) : showStar ? 'Padajúce hviezdy' : '';
                        return `<li><div class="nb-dh2"><b>${NAMES[i]}</b><span class="nb-dd">${day.getUTCDate()}. ${day.getUTCMonth() + 1}.</span>${note ? `<em>${esc(note)}</em>` : ''}<span class="nb-dsun">západ ${ss ? hm(ss) : '-'}${st ? `<i class="nb-sep"></i>tma ${hm(st)}` : ''}</span>${moonSvg(tEve)}</div><div class="nb-dn"></div></li>`;
                    };
                    $('#nb-days-l').innerHTML = [0, 1, 2, 3].map(row).join('');
                    $('#nb-days-r').innerHTML = [4, 5, 6].map(row).join('') + '<li class="nb-memo"><p class="nb-memo-st" aria-hidden="true">* * *</p><div class="nb-dh2"><b>Poznámky</b></div><div class="nb-dn"></div></li>';
                    const sun = new Date(mon.getTime() + 6 * 864e5);
                    // číslo týždňa podľa ISO (pondelok až nedeľa, 1. týždeň obsahuje prvý štvrtok roka)
                    const thu = new Date(mon.getTime() + 3 * 864e5), y1 = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
                    const wn = Math.ceil(((thu - y1) / 864e5 + 1) / 7);
                    $('#nb-wk').innerHTML = `${wn}. Týždeň <span>${mon.getUTCDate()}. ${mon.getUTCMonth() + 1}. až ${sun.getUTCDate()}. ${sun.getUTCMonth() + 1}. ${OV ? sun.getUTCFullYear() : Y}</span>`;
                    const inWeek = (t) => t >= mon.getTime() && t < mon.getTime() + 7 * 864e5;
                    // krátka vecná poznámka z toho, čo sa v týždni naozaj deje
                    const DN = ['nedeľu', 'pondelok', 'utorok', 'stredu', 'štvrtok', 'piatok', 'sobotu'];
                    const onDay = (t) => { const d = new Date(new Date(t).toLocaleString('en-US', { timeZone: TZ })); return `v ${DN[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`; };
                    const parts = [];
                    if (nmW && inWeek(nmW.t)) parts.push(`Nov je ${onDay(nmW.t)} Mesiac v noci nesvieti, takže je to najlepší týždeň na hviezdy. Stačí odísť kúsok od pouličných svetiel.`);
                    else if (fmW && inWeek(fmW.t)) parts.push(`Spln je ${onDay(fmW.t)} Mesiac svieti celú noc a slabšie hviezdy prekryje. Zato je krásne vidno krajinu.`);
                    else { const fr = ageAt(mon.getTime() + 3 * 864e5) < SYN / 2; parts.push(fr ? 'Mesiac dorastá a večer je na oblohe stále dlhšie. Najtmavšie je až po jeho západe.' : 'Mesiac ubúda a vychádza stále neskôr v noci. Večery sú tmavé, hodia sa na hviezdy.'); }
                    if (OV) { for (let i = 0; i < 7; i++) { const dd = new Date(mon.getTime() + i * 864e5), q = shDay(dd); if (q) parts.push(`Okolo ${q[1]}. ${MON_G[dd.getUTCMonth()]} padá najviac hviezd (${q[0]}).`); } }
                    else if (sh) { const pk = Date.UTC(Y, m, sh[1], 12); if (inWeek(pk)) parts.push(`Okolo ${sh[1]}. ${MON_G[m]} padá najviac hviezd (${sh[0]}).`); }
                    const tip = parts.join(' ');
                    $('#nb-tip').textContent = tip;
                }
                const v = $(`.nb-view[data-view="${view}"]`); v.classList.remove('flip', 'go-next', 'go-prev'); void v.offsetWidth; v.classList.add(anim); if (view === 'week') requestAnimationFrame(fitWeek);
            }
            // týždeň: počet riadkov na deň tak, aby 4 dni vľavo a 3 dni vpravo vyplnili stranu a deliace čiary sedeli na linkách
            function fitWeek() {
                const v = $('.nb-view[data-view="week"]'); if (!v || v.hidden) return;
                const L = $('#nb-days-l li'), dl = $('#nb-days-l'), dr = $('#nb-days-r'); if (!dl || !dr) return;
                const lpx = Math.round(dl.closest('.nb-page').clientWidth * .052); if (!lpx) return; v.style.setProperty('--L', lpx + 'px');   // celé pixely: linky aj deliace čiary sedia presne na sebe
                const memo = $('.nb-memo', dr);
                const n = Math.max(4, Math.min(Math.floor((dl.clientHeight - 2) / (4 * lpx)), Math.floor((dr.clientHeight - 2 - 3 * lpx) / (3 * lpx))));
                v.style.setProperty('--n', n);
                // poznámky k týždňu: zvyšok pravej strany, celé riadky (oddelené od nedele, dni majú všetky rovnako riadkov)
                if (memo) memo.style.height = Math.max(2, Math.floor((dr.clientHeight - 3 * n * lpx - 1) / lpx)) * lpx + 'px';
            }
            window.addEventListener('resize', () => requestAnimationFrame(fitWeek));
            window.__nbRender = (v, m) => { if (m != null) cur = m; if (v && v !== view) setView(v); else render(); };
            function setView(nv) {
                view = nv;
                $$('.nb-views button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === nv)));
                $$('.nb-view').forEach(x => { x.hidden = x.dataset.view !== nv; });
                tabs.classList.toggle('is-off', nv === 'notes' || nv === 'cover');
                const swp = $('#nb-swipe'); if (swp) { swp.hidden = nv === 'cover'; const nx = $('.nb-next', swp); if (nx) nx.hidden = nv !== 'month'; $$('i', swp).forEach((d, k) => d.classList.toggle('on', k === 0)); }
                $$('.nb-book').forEach(bk => { bk.scrollLeft = 0; });
                render();
            }
            $$('button', tabs).forEach(b => b.addEventListener('click', () => { cur = Number(b.dataset.m); render(); }));
            $$('.nb-views button').forEach(b => b.addEventListener('click', () => setView(b.dataset.v)));
            // mobil: bodky pod zápisníkom ukazujú, či je zobrazená ľavá alebo pravá strana
            const sw = $('#nb-swipe');
            $$('.nb-book').forEach(bk => bk.addEventListener('scroll', () => {
                const right = bk.scrollLeft > (bk.scrollWidth - bk.clientWidth) / 2;
                $$('i', sw).forEach((d, k) => d.classList.toggle('on', k === (right ? 1 : 0)));
            }, { passive: true }));
            const mbook = $('.nb-view[data-view="month"]');
            if (mbook) {
                let tx = null, ty = 0, sl0 = 0;
                mbook.addEventListener('touchstart', (e) => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; sl0 = mbook.scrollLeft; }, { passive: true });
                mbook.addEventListener('touchend', (e) => {
                    if (tx === null) return; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
                    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
                    const max = mbook.scrollWidth - mbook.clientWidth; if (max < 8) return;   // na počítači sú obe strany vedľa seba
                    if (dx < 0 && sl0 >= max - 8 && cur < 11) { cur++; mbook.scrollTo({ left: 0, behavior: 'instant' }); render('go-next'); }
                    else if (dx > 0 && sl0 <= 8 && cur > 0) { cur--; mbook.scrollTo({ left: max, behavior: 'instant' }); render('go-prev'); }
                }, { passive: true });
            }
            setView('cover');
            // obálka: potiahnutie doľava zápisník otvorí (ako keď otáčate dosku) a ukáže január
            const book3d = $('.nb-book3d');
            if (book3d) {
                let x0 = null, y0 = 0, opening = false;
                const openBook = () => {
                    if (opening) return; opening = true;
                    book3d.classList.add('is-opening');
                    setTimeout(() => { book3d.classList.remove('is-opening'); opening = false; cur = 0; setView('month'); }, reduced ? 0 : 500);
                };
                let pre0 = false; const preJan = () => { if (pre0) return; pre0 = true; const b = bigOf(M[0][0]); if (b) new Image().src = b; };
                new IntersectionObserver((en, ob) => { if (en.some(x => x.isIntersecting)) { preJan(); ob.disconnect(); } }, { rootMargin: '300px' }).observe(book3d);
                book3d.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; preJan(); });
                book3d.addEventListener('pointerup', (e) => {
                    if (x0 === null) return;
                    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
                    if (dx < -40 && Math.abs(dx) > Math.abs(dy) * 1.2) openBook();
                });
                book3d.addEventListener('pointercancel', () => { x0 = null; });
                book3d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBook(); } });
            }
            {   // ukazovateľ ako v hre: koľko predobjednávok chýba do tlače
                const bar = $('#nb-goal-bar'), G = NOTEBOOK.goal, n = Math.max(0, NOTEBOOK.orders | 0), done = n >= G;
                if (bar) {
                    bar.innerHTML = Array.from({ length: G }, (_, i) => `<i style="--i:${i}"${i < n ? ' class="on"' : ''}></i>`).join('');
                    bar.setAttribute('aria-valuemax', G); bar.setAttribute('aria-valuenow', Math.min(n, G));
                    $('#nb-goal-n').textContent = done ? `${n} objednávok` : `${n} z ${G}`;
                    const box = $('#nb-goal'); box.classList.toggle('is-done', done);
                    if (done) $('#nb-goal-t').textContent = `Je to tu, Hviezdopis ide do tlače. Ďalšie objednávky beriem, kým nebude vypredaná edícia ${NOTEBOOK.ltdTotal} kusov.`;
                    else if (G - n <= 3 && n) $('#nb-goal-t').textContent = `Do tlače chýba${G - n === 1 ? '' : 'jú'} už len ${G - n === 1 ? 'jedna objednávka' : `${G - n} objednávky`}.`;
                    new IntersectionObserver((en, ob) => { if (en.some(x => x.isIntersecting)) { box.classList.add('is-in'); ob.disconnect(); } }, { threshold: .6 }).observe(box);
                }
            }
            const early = nbEarly(), dTo = new Date(NOTEBOOK.earlyTo + 'T12:00:00').toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' });
            {   // odpočet do konca predobjednávkovej ceny (v dňoch, bez tikajúcich sekúnd)
                const end = new Date(NOTEBOOK.earlyTo + 'T23:59:59'), left = Math.ceil((end - new Date()) / 864e5), dl = $('#nb-deal');
                if (dl) { dl.hidden = !early; if (early) dl.innerHTML = left <= 1 ? `Predobjednávková cena platí <b>už len dnes</b>.` : `Predobjednávková cena platí ešte <b>${skDays(left)}</b>, do ${esc(dTo)}.`; }
                const lt = $('#nb-ltd'); if (lt) lt.textContent = NOTEBOOK.ltdLeft != null ? `Zostáva ${NOTEBOOK.ltdLeft} z ${NOTEBOOK.ltdTotal} číslovaných kusov` : `Limitovaná edícia, ${NOTEBOOK.ltdTotal} číslovaných kusov`;
            }
            $('#nb-p1').textContent = `${NOTEBOOK.price} €`; $('#nb-p2').textContent = `${NOTEBOOK.ltd} €`;
            $('#nb-early1').textContent = `${NOTEBOOK.early} €`;
            $('#nb-early1').parentElement.hidden = !early;
            $('#nb-early2').textContent = `${NOTEBOOK.ltdEarly} €`; $('#nb-early2').parentElement.hidden = !early;
            $('#nb-note').textContent = (early ? `Zápisníky odosielam ${NOTEBOOK.ship}, stihnú Vianoce.` : `Zápisníky odosielam ${NOTEBOOK.ship}.`) + ` Poštovné ${SHIP} €, s obrazom v jednom balíku len raz.`;
        }
    }
    PANELS.notebook = (o = {}) => {
        const e = nbEarly(), p1 = e ? NOTEBOOK.early : NOTEBOOK.price, p2 = e ? NOTEBOOK.ltdEarly : NOTEBOOK.ltd;
        const photos = $$('.g-item').map(b => b.dataset.title);
        const inCart = cart.some(it => it.kind !== 'nb');
        return `
            <h2 id="modal-title">Hviezdopis ${NOTEBOOK.year}</h2>
            <p class="modal-sub">${o.gift ? 'Darček na celý rok' : `Predobjednávka${e ? ' so zľavou' : ''}`}</p>
            <form id="nb-form" class="order-form" action="https://formspree.io/f/mnnellqk" method="POST">
                <input type="hidden" name="_subject" value="Predobjednávka: Hviezdopis ${NOTEBOOK.year}">
                <input type="hidden" name="objednavka" id="nb-details">
                <div class="field"><span class="v-lab" id="nb-lab">Edícia</span>
                    <div class="v-types" role="radiogroup" aria-labelledby="nb-lab">
                        <button type="button" role="radio" class="mat-c" data-e="std" aria-checked="true"><b>Zápisník</b><small>Diár na rok ${NOTEBOOK.year} s 12 mojimi fotkami</small><span>${p1} €</span></button>
                        <button type="button" role="radio" class="mat-c" data-e="ltd" aria-checked="false"><b>Edícia s obrazom</b><small>Podpísaný zápisník a tlač A4, ${NOTEBOOK.ltdTotal} číslovaných kusov</small><span>${p2} €</span></button>
                    </div></div>
                <div class="field" id="nb-photo-f" hidden><label for="nb-photo">Fotka na tlač A4</label><select id="nb-photo">${photos.map(t => `<option>${esc(t)}</option>`).join('')}</select></div>
                <div class="field"><label for="nb-qty">Počet kusov</label><select id="nb-qty">${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join('')}</select><p class="meta nb-qhint">Druhý a každý ďalší kus o ${NOTEBOOK.bundle} € lacnejší. Jeden pre vás, jeden ako darček.</p></div>
                <label class="check"><input type="checkbox" id="nb-gift"${o.gift ? ' checked' : ''}> Je to darček</label>
                <div class="field" id="nb-ded-f"${o.gift ? '' : ' hidden'}><label for="nb-ded">Venovanie na kartičku <span class="opt">(nepovinné)</span></label><textarea id="nb-ded" rows="2" maxlength="240" placeholder="Napríklad: Pre Janku, nech je rok 2027 plný jasných nocí."></textarea><label class="check" style="margin-top:10px"><input type="checkbox" id="nb-wrap"> Darčekové balenie: papier so stuhou (+${GIFT_WRAP} €)</label><p class="meta" style="margin:6px 0 0">Kartičku s venovaním priložím ku každému darčeku. Cenu v balíku nenájdete.</p></div>
                <div class="sum-rows nb-rows"><div><span>Zápisník</span><span id="nb-sub">${p1} €</span></div><div class="sum-save" id="nb-off-row" hidden><span>Zľava za ďalší kus</span><span id="nb-off"></span></div><div id="nb-wrap-row" hidden><span>Darčekové balenie</span><span>${GIFT_WRAP} €</span></div><div><span>Poštovné</span><span>${SHIP} €</span></div>
                    <div class="sum-total"><span>Spolu</span><span id="nb-sum">${p1 + SHIP} €</span></div></div>
                <div class="nb-cartbox">
                    <p class="meta" style="margin:0">${inCart ? 'V košíku už máte obraz. Vložte zápisník k nemu a poštovné zaplatíte len raz.' : 'Chcete k zápisníku aj obraz? Vložte ho do košíka a poštovné zaplatíte len raz.'}</p>
                    <button class="btn ${inCart ? 'btn-star' : 'btn-ghost'}" type="button" id="nb-tocart">Vložiť do košíka</button>
                </div>
                <p class="cs-k nb-or">Alebo predobjednajte priamo</p>
                <div class="field"><label for="nb-name">Meno a priezvisko</label><input id="nb-name" type="text" name="meno" autocomplete="name" required></div>
                <div class="field"><label for="nb-mail">E-mail</label><input id="nb-mail" type="email" name="email" autocomplete="email" required></div>
                <div class="field"><label for="nb-adr">Adresa doručenia</label><textarea id="nb-adr" name="adresa" rows="3" autocomplete="street-address" required></textarea></div>
                <label class="check"><input type="checkbox" required> ${LEGAL_OK}</label>
                <button class="btn btn-star" type="submit">Predobjednať s povinnosťou platby</button>
                <p class="meta" style="margin:0">Zápisníky odosielam ${esc(NOTEBOOK.ship)}. Platobné údaje vám pošlem e-mailom. Ak sa do ${esc(new Date(NOTEBOOK.earlyTo + 'T12:00:00').toLocaleDateString('sk-SK', { day: 'numeric', month: 'long' }))} nenazbiera ${NOTEBOOK.goal} predobjednávok, vrátim vám celú sumu.</p>
                <p class="meta" id="nb-err" style="margin:0" role="alert" hidden></p>
            </form>`;
    };
    AFTER.notebook = () => {
        const form = $('#nb-form'); if (!form) return;
        const e = nbEarly(), price = { std: e ? NOTEBOOK.early : NOTEBOOK.price, ltd: e ? NOTEBOOK.ltdEarly : NOTEBOOK.ltd };
        let ed = 'std';
        const qty = () => Number($('#nb-qty').value);
        const full = () => price[ed] * qty(), off = () => nbBundle(qty()), sub = () => full() - off();
        const edName = () => ed === 'ltd' ? `Edícia s obrazom (tlač A4: ${$('#nb-photo').value})` : 'Zápisník';
        const isGift = () => $('#nb-gift').checked, isWrap = () => isGift() && $('#nb-wrap').checked;
        const wrapCost = () => isWrap() ? GIFT_WRAP : 0;
        const giftNote = () => isGift() ? `Darček${isWrap() ? ', darčekové balenie' : ''}${$('#nb-ded').value.trim() ? `, venovanie: „${$('#nb-ded').value.trim()}“` : ', bez venovania'}` : '';
        const upd = () => {
            $$('.v-types .mat-c', form).forEach(b => b.setAttribute('aria-checked', String(b.dataset.e === ed)));
            $('#nb-photo-f').hidden = ed !== 'ltd';
            $('#nb-sub').textContent = `${full()} €`; $('#nb-off-row').hidden = !off(); $('#nb-off').textContent = `−${off()} €`; $('#nb-sum').textContent = `${sub() + SHIP + wrapCost()} €`;
            $('#nb-wrap-row').hidden = !isWrap();
        };
        $$('.v-types .mat-c', form).forEach(b => b.addEventListener('click', () => { ed = b.dataset.e; upd(); }));
        $('#nb-qty').addEventListener('change', upd);
        $('#nb-gift').addEventListener('change', () => { $('#nb-ded-f').hidden = !$('#nb-gift').checked; upd(); });
        $('#nb-wrap').addEventListener('change', upd);
        upd();
        $('#nb-tocart').addEventListener('click', (ev) => {
            cart.push({ kind: 'nb', title: `Hviezdopis ${NOTEBOOK.year}`, material: edName() + (e ? ', predobjednávka' : ''), size: `A5, ${qty()} ks`, qty: qty(), price: full(), gift: isGift(), wrap: isWrap(), ded: isGift() ? $('#nb-ded').value.trim() : '' });
            const from = ev.currentTarget.getBoundingClientRect();
            flyToCart(from, () => { saveCart(); toast(`Hviezdopis ${NOTEBOOK.year} je v košíku.`); });
            closePanel();
        });
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const total = sub() + SHIP + wrapCost(), no = orderNo();
            const g = giftNote();
            $('#nb-details').value = `PREDOBJEDNÁVKA HVIEZDOPISU ${NOTEBOOK.year}, ${no}:\nEdícia: ${edName()}\nPočet: ${qty()}\nCena za kus: ${price[ed]} €${e ? ' (predobjednávka)' : ''}${off() ? `\nZľava za ďalší kus: −${off()} €` : ''}${g ? `\n${g}` : ''}${wrapCost() ? `\nDarčekové balenie: ${GIFT_WRAP} €` : ''}\nPoštovné: ${SHIP} €\nSPOLU: ${total} €`;
            setOrder(form, no, `Predobjednávka ${no}: Hviezdopis ${NOTEBOOK.year}`);
            const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Odosielam…';
            const ok = await sendForm(form);
            const lines = [`Hviezdopis ${NOTEBOOK.year}, ${edName()}, ${qty()} ks: ${full()} €`].concat(off() ? [`Zľava za ďalší kus: −${off()} €`] : []).concat(wrapCost() ? [`Darčekové balenie: ${GIFT_WRAP} €`] : [], [`Poštovné: ${SHIP} €`]);
            if (ok === true) thanks('Ďakujem', 'Predobjednávku som prijal. Do 24 hodín vám pošlem e-mail s platobnými údajmi a termínom odoslania. Pri platbe uveďte číslo objednávky.', total, $('#nb-mail').value, { no, lines, total });
            else if (ok === null) form.submit();
            else { btn.disabled = false; btn.textContent = 'Predobjednať s povinnosťou platby'; $('#nb-err').textContent = 'Odoslanie sa nepodarilo. Skúste to znova, alebo zavolajte na 0950 592 956.'; $('#nb-err').hidden = false; }
        });
    };
    $$('[data-nb-ship]').forEach(x => { x.textContent = NOTEBOOK.ship; });
    $('#nb-share')?.addEventListener('click', async () => {
        const url = `${SITE}hviezdopis/`;
        try { if (navigator.share) { await navigator.share({ title: `Hviezdopis ${NOTEBOOK.year} | Kúsok Nekonečna`, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
        try { await navigator.clipboard.writeText(url); toast('Odkaz na Hviezdopis je skopírovaný.'); } catch (_) { window.prompt("Skopírujte odkaz na Hviezdopis:", url); }
    });

    /* ── Január zadarmo: e-mail sa uloží (Formspree, neskôr Brevo) a PDF sa hneď stiahne ── */
    {
        const lf = $('#nb-lead'), PDF = 'assets/hviezdopis-2027-januar-ukazka.pdf';
        const dl = () => { const a = document.createElement('a'); a.href = PDF; a.download = 'Hviezdopis-2027-januar.pdf'; document.body.appendChild(a); a.click(); a.remove(); };
        lf?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = $('button[type=submit]', lf), okEl = $('#nb-lead-ok');
            btn.disabled = true; btn.textContent = 'Chystám…';
            mlSubscribe($('#nb-lead-mail').value.trim());
            await sendForm(lf);   // aj keď sa e-mail neuloží, ukážku dostane
            dl();
            btn.disabled = false; btn.textContent = 'Stiahnuť január';
            okEl.innerHTML = `Január sa sťahuje. Ak sa nestiahol, <a href="${PDF}" download>kliknite sem</a>.`; okEl.hidden = false; lf.reset();
        });
    }

    /* ── Upozornenie e-mailom pred novom ── */
    {
        const nf = $('#notify-form');
        nf?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = $('button[type=submit]', nf), okEl = $('#notify-ok');
            btn.disabled = true; btn.textContent = 'Prihlasujem…';
            mlSubscribe($('#notify-mail').value.trim());
            const ok = await sendForm(nf);
            if (ok === null) { nf.submit(); return; }
            btn.disabled = false; btn.textContent = 'Prihlásiť sa';
            okEl.textContent = ok ? 'Hotovo. Prvý e-mail príde pred najbližším novom.' : 'Prihlásenie sa nepodarilo. Skúste to znova o chvíľu.';
            okEl.hidden = false; if (ok) nf.reset();
        });
    }

    /* ── Zákazníci: sekcia sa ukáže, až keď je v zozname aspoň jedna skutočná recenzia ──
       Príklad záznamu:
       { text: 'Obraz je krásny, na stene vyzerá ešte lepšie.', name: 'Jana K.', what: 'Hmlovina Tulipán, A2', stars: 5, photo: 'assets/img/zakaznici/jana.jpg' }
       Fotka aj hviezdičky sú nepovinné. Nič nevymýšľajte, vkladajte len skutočné odozvy. */
    const REVIEWS = [];
    {
        const sec = $('#recenzie'), grid = $('#rev-grid');
        if (sec && REVIEWS.length) {
            grid.innerHTML = REVIEWS.map(r => `<figure class="rev">${r.photo ? `<img src="${esc(r.photo)}" alt="Obraz u zákazníka: ${esc(r.what || '')}" loading="lazy">` : ''}
                <blockquote>${r.stars ? `<span class="rev-st" role="img" aria-label="${Number(r.stars)} z 5 hviezdičiek">${'★'.repeat(Math.max(0, Math.min(5, Number(r.stars))))}</span>` : ''}<p>${esc(r.text)}</p></blockquote>
                <figcaption><b>${esc(r.name)}</b>${r.what ? `<span>${esc(r.what)}</span>` : ''}</figcaption></figure>`).join('');
            sec.hidden = false;
        }
    }

    /* ── Úvod: striedajúce sa slová nad nadpisom („Objednajte si svoj“ Kúsok Nekonečna…) ──
       Slovo sa rozostrí a nové zaostrí, ako pri ostrení objektívu. Beží len keď je úvod na obrazovke. */
    {
        const rot = $('#hero-rot'), WORDS = ['Objednajte si svoj', 'Naučte sa zachytiť', 'Darujte blízkym'];
        if (rot) {
            let i = 0, timer = 0, visible = true;
            const next = () => {
                if (document.hidden || !visible) return;
                rot.classList.add('out');
                setTimeout(() => { i = (i + 1) % WORDS.length; rot.textContent = WORDS[i]; rot.classList.remove('out'); }, reduced ? 250 : 550);
            };
            const start = () => { if (!timer) timer = setInterval(next, 3600); };
            new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(rot);
            setTimeout(start, 1800);   // prvá zmena až po úvodnej animácii
        }
    }

    /* ── Jemné svetlo za kurzorom (len myš): pomaly dobieha, bez iskier ── */
    if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const glow = document.createElement('div'); glow.className = 'cursor-glow'; glow.setAttribute('aria-hidden', 'true'); body.appendChild(glow);
        let tx = -999, ty = -999, x = -999, y = -999, raf = 0;
        const step = () => {
            x += (tx - x) * .12; y += (ty - y) * .12;
            glow.style.setProperty('--cx', x.toFixed(1) + 'px'); glow.style.setProperty('--cy', y.toFixed(1) + 'px');
            raf = (Math.abs(tx - x) + Math.abs(ty - y) > .5) ? requestAnimationFrame(step) : 0;
        };
        window.addEventListener('pointermove', (e) => {
            tx = e.clientX; ty = e.clientY;
            if (x < -900) { x = tx; y = ty; }
            if (!raf) raf = requestAnimationFrame(step);
        }, { passive: true });
        document.addEventListener('pointerleave', () => glow.classList.add('off'));
        document.addEventListener('pointerenter', () => glow.classList.remove('off'));
    }
})();
