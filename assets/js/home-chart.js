// Front-page charts. One list of slides feeds two views:
//   1. the carousel below the fold: interactive scatter plots (from the Lab) and figures from published papers;
//   2. the splash: the same slides, redrawn quiet (one series, no axes, no tooltips) behind the name, cycling slowly.
// Each data slide loads its JSON from assets/data/ the first time it is needed.
(function () {
    var fig = document.getElementById('chart-carousel');
    if (!fig) return;
    var NS = 'http://www.w3.org/2000/svg';
    var DATA = '/assets/data/';
    var MAIN = '';
    var W = 560, H = 360, M = { top: 14, right: 18, bottom: 44, left: 50 };

    var pct = function (v) { return v + '%'; };
    var money = function (v) { return v >= 1e6 ? '£' + (v / 1e6) + 'm' : '£' + (v / 1e3) + 'k'; };
    var NATION = { England: '#df3062', Wales: '#d98a1c', Scotland: '#2f6fb3' };

    var IMG = '/assets/img/figures/';
    var SLIDES = [
        {
            src: 'green-renters.json',
            title: 'Renters and the Greens',
            sub: 'Green vote share in the 2026 English local elections, by share of households renting privately. Each dot is a ward where the Greens stood.',
            note: 'Sources: 2026 local election results; 2021 Census. 2,379 wards with a Green candidate.',
            link: [MAIN + '/le2026/', 'Explore the 2026 local elections'],
            x: [0, 80], xTicks: [0, 20, 40, 60, 80], xFmt: pct, xLabel: 'Households renting privately (2021)',
            y: [0, 75], yTicks: [0, 25, 50, 75], yFmt: pct, yLabel: 'Green vote, 2026',
            color: function () { return '#02a95b'; },
            radius: 2.4,
            trend: [6, 78],
            callout: function (f) { return ['Each 10 points more private renters:', 'about ' + (f.slope * 10).toFixed(1) + ' points more Green']; },
            calloutAt: [2, 70],
            tip: function (d) { return '<b>' + d[0] + '</b>' + d[1] + '% private renters &middot; Green ' + d[2] + '%'; }
        },
        {
            src: 'education-reform.json',
            title: 'The education divide',
            sub: 'Reform UK vote share at the 2024 general election, by share of residents with a degree. Each dot is a constituency in England and Wales.',
            note: 'Sources: 2024 general election results; 2021 Census. Seats Reform did not contest are excluded.',
            link: [MAIN + '/constituency-map/', 'Explore the constituency map'],
            x: [15, 70], xTicks: [20, 30, 40, 50, 60, 70], xFmt: pct, xLabel: 'Residents with a degree (2021)',
            y: [0, 50], yTicks: [0, 10, 20, 30, 40, 50], yFmt: pct, yLabel: 'Reform UK vote, 2024',
            color: function () { return '#15487e'; },
            trend: [18, 66],
            callout: function (f) { return ['Each 10 points more graduates:', 'about ' + Math.abs(f.slope * 10).toFixed(1) + ' points less Reform']; },
            calloutAt: [46.5, 36],
            tip: function (d) { return '<b>' + d[0] + '</b>' + d[1] + '% graduates &middot; Reform ' + d[2] + '%'; }
        },
        {
            img: IMG + 'social-distancing-workplace.jpg',
            wash: IMG + 'social-distancing-wash.webp',
            alt: 'Scatter plot of change in workplace activity from baseline, March to August 2020, with the lockdown and reopening dates marked, for Remain-voting (yellow) and Leave-voting (blue) local authorities. Activity collapses at full lockdown and recovers only partly through the summer, more so in Leave-voting areas.',
            title: 'Workplace activity through lockdown',
            sub: 'Change in workplace activity from baseline, March to August 2020, with the lockdown and reopening dates marked. Yellow dots are Remain-voting local authorities, blue are Leave-voting.',
            note: 'From \u2018Social Distancing, Politics, and Wealth\u2019, with Asl\u0131 Cansunar and Mads Elkj\u00e6r, West European Politics (2021).',
            link: ['https://doi.org/10.1080/01402382.2021.1917154', 'Read the paper']
        },
        {
            img: IMG + 'inheritance-tax-rates.jpg',
            wash: IMG + 'inheritance-tax-wash.webp',
            alt: 'Line chart of marginal inheritance tax rates from 1945 to 2019 in 18 advanced democracies, for estates worth 1, 5, 10, 50, 100 and 1000 times GDP per capita. Rates on the largest estates peak near 38 per cent around 1970 and fall to about 20 per cent by 2019.',
            title: 'The fall of inheritance taxes',
            sub: 'Marginal inheritance tax rates by size of estate, as a multiple of GDP per capita, averaged across 18 advanced democracies, 1945\u20132019.',
            note: 'From \u2018Why is it so Hard to Counteract Wealth Inequality? Evidence from the United Kingdom\u2019, with Laure Bokobza, Asl\u0131 Cansunar, Mads Elkj\u00e6r, Matthias Haslberger and Jacob Nyrup, World Politics (2025).',
            link: ['https://ora.ox.ac.uk/objects/uuid:f3aea392-6325-486e-b4cd-31e9579654e7', 'Read the paper']
        },
        {
            src: 'council-tax.json',
            title: 'Council tax hits cheaper homes harder',
            sub: 'Council tax on a typical home as a share of its value, by local authority, against the median house price (log scale).',
            note: 'England from VOA tax-base data; Wales and Scotland modelled. Northern Ireland, which uses a different system, is excluded.',
            link: [MAIN + '/property-tax/', 'Explore the property tax calculator'],
            x: [120000, 1250000], xLog: true, xTicks: [150000, 250000, 500000, 1000000], xFmt: money, xLabel: 'Median house price (log scale)',
            y: [0, 1.25], yTicks: [0, 0.25, 0.5, 0.75, 1, 1.25], yFmt: function (v) { return v + '%'; }, yLabel: 'Tax as % of home value',
            color: function (d) { return NATION[d[3]] || '#888'; },
            trend: [125000, 1200000],
            legend: NATION,
            left: 62,
            labels: ['Burnley', 'Kensington and Chelsea'],
            tip: function (d) { return '<b>' + d[0] + '</b>Median home ' + money(d[1]).replace('k', ',000') + ' &middot; tax ' + d[2] + '% of value'; }
        }
    ];

    var titleEl = fig.querySelector('.chart-title');
    var subEl = fig.querySelector('.chart-sub');
    var noteEl = fig.querySelector('.chart-note');
    var frame = fig.querySelector('.chart-frame');
    var tip = fig.querySelector('.chart-tip');
    var counter = fig.querySelector('.chart-count');
    var dotsNav = fig.querySelector('.chart-dotsnav');
    var current = 0;

    SLIDES.forEach(function (s, i) {
        var svg;
        if (s.img) {
            svg = document.createElement('img');
            svg.src = s.img;
            svg.alt = s.alt;
            svg.className = 'chart-img';
            svg.loading = i === 0 ? 'eager' : 'lazy';
            s.drawn = true;
        } else {
            svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
            svg.setAttribute('class', 'chart-svg');
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', s.title + '. ' + s.sub);
        }
        svg.style.display = i === 0 ? '' : 'none';
        frame.insertBefore(svg, tip);
        s.svg = svg;
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Chart ' + (i + 1) + ': ' + s.title);
        b.addEventListener('click', function () { go(i); });
        dotsNav.appendChild(b);
    });

    function go(i) {
        current = (i + SLIDES.length) % SLIDES.length;
        var s = SLIDES[current];
        SLIDES.forEach(function (t, j) { t.svg.style.display = j === current ? '' : 'none'; });
        [].forEach.call(dotsNav.children, function (b, j) {
            if (j === current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
        });
        titleEl.textContent = s.title;
        subEl.textContent = s.sub;
        noteEl.innerHTML = s.note + ' <a href="' + s.link[0] + '">' + s.link[1] + ' &rarr;</a>';
        counter.textContent = (current + 1) + ' / ' + SLIDES.length;
        tip.hidden = true;
        if (!s.drawn) {
            s.drawn = true;
            load(s).then(function (data) { draw(s, data); })
                .catch(function () { s.drawn = false; });
        }
    }

    // JSON is fetched once per slide and shared by the carousel and the splash.
    function load(s) {
        if (!s.data) s.data = fetch(DATA + s.src).then(function (r) { return r.json(); });
        return s.data;
    }

    fig.querySelector('.chart-prev').addEventListener('click', function () { go(current - 1); });
    fig.querySelector('.chart-next').addEventListener('click', function () { go(current + 1); });
    fig.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') go(current - 1);
        if (e.key === 'ArrowRight') go(current + 1);
    });

    function draw(s, data) {
        var svg = s.svg;
        var M = { top: 14, right: 18, bottom: 44, left: s.left || 50 };
        var lx = function (v) { return s.xLog ? Math.log10(v) : v; };
        var x = function (v) { return M.left + (lx(v) - lx(s.x[0])) / (lx(s.x[1]) - lx(s.x[0])) * (W - M.left - M.right); };
        var y = function (v) { return H - M.bottom - (v - s.y[0]) / (s.y[1] - s.y[0]) * (H - M.top - M.bottom); };
        function el(name, attrs, parent) {
            var n = document.createElementNS(NS, name);
            for (var k in attrs) n.setAttribute(k, attrs[k]);
            (parent || svg).appendChild(n);
            return n;
        }
        function text(str, attrs, parent) { var t = el('text', attrs, parent); t.textContent = str; return t; }

        var grid = el('g', { class: 'chart-grid' });
        s.yTicks.forEach(function (v) {
            el('line', { x1: M.left, x2: W - M.right, y1: y(v), y2: y(v) }, grid);
            text(s.yFmt(v), { x: M.left - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'chart-tick' });
        });
        s.xTicks.forEach(function (v) {
            text(s.xFmt(v), { x: x(v), y: H - M.bottom + 18, 'text-anchor': 'middle', class: 'chart-tick' });
        });
        text(s.xLabel, { x: (M.left + W - M.right) / 2, y: H - 6, 'text-anchor': 'middle', class: 'chart-axis' });
        text(s.yLabel, { x: 0, y: 0, transform: 'translate(12,' + (M.top + (H - M.top - M.bottom) / 2) + ') rotate(-90)', 'text-anchor': 'middle', class: 'chart-axis' });

        var dots = el('g', { class: 'chart-dots' });
        var pts = data.rows.map(function (d) {
            var px = x(d[1]), py = y(d[2]);
            var c = el('circle', { cx: px, cy: py, r: s.radius || 3.1, fill: s.color(d) }, dots);
            return { d: d, c: c, px: px, py: py };
        });

        var f = data.fit;
        if (s.trend) {
            var t0 = s.trend[0], t1 = s.trend[1];
            el('line', { class: 'chart-trend', x1: x(t0), y1: y(f.intercept + f.slope * lx(t0)), x2: x(t1), y2: y(f.intercept + f.slope * lx(t1)) });
        }
        if (s.callout) {
            var lines = s.callout(f);
            text(lines[0], { x: x(s.calloutAt[0]), y: y(s.calloutAt[1]), class: 'chart-note-svg' });
            text(lines[1], { x: x(s.calloutAt[0]), y: y(s.calloutAt[1]) + 15, class: 'chart-note-svg' });
        }
        if (s.labels) {
            pts.filter(function (p) { return s.labels.indexOf(p.d[0]) !== -1; }).forEach(function (p) {
                p.c.classList.add('is-labelled');
                var right = p.px < W / 2;
                text(p.d[0], { x: p.px + (right ? 9 : -9), y: p.py + (right ? -6 : -8), 'text-anchor': right ? 'start' : 'end', class: 'chart-note-svg' });
            });
        }
        if (s.legend) {
            var lg = el('g', { class: 'chart-legend' }), lx0 = W - M.right - 250;
            Object.keys(s.legend).forEach(function (k, i) {
                el('circle', { cx: lx0 + i * 88, cy: M.top + 6, r: 5, fill: s.legend[k] }, lg);
                text(k, { x: lx0 + i * 88 + 9, y: M.top + 10, class: 'chart-tick' }, lg);
            });
        }

        var hot = null;
        function show(evt) {
            var box = svg.getBoundingClientRect();
            var mx = (evt.clientX - box.left) * (W / box.width), my = (evt.clientY - box.top) * (H / box.height);
            var best = null, bd = 400;
            pts.forEach(function (p) {
                var dd = (p.px - mx) * (p.px - mx) + (p.py - my) * (p.py - my);
                if (dd < bd) { bd = dd; best = p; }
            });
            if (hot && hot !== best) hot.c.classList.remove('is-hot');
            if (!best) { tip.hidden = true; hot = null; return; }
            hot = best; best.c.classList.add('is-hot');
            tip.innerHTML = s.tip(best.d);
            tip.hidden = false;
            tip.style.left = Math.min(Math.max(best.px / W * box.width, 100), box.width - 100) + 'px';
            tip.style.top = best.py / H * box.height + 'px';
        }
        svg.addEventListener('pointermove', show);
        svg.addEventListener('pointerdown', show);
        svg.addEventListener('pointerleave', function () {
            tip.hidden = true;
            if (hot) hot.c.classList.remove('is-hot');
            hot = null;
        });
    }

    // ---------- Splash: the same slides, quiet ----------
    var bg = document.getElementById('splash-bg');
    if (bg) (function () {
        var QW = 960, QH = 720, PAD = { l: 36, r: 24, t: 90, b: 90 };
        var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var cap = document.querySelector('.splash-cap');
        var capTitle = cap.querySelector('.splash-cap-title');
        var capLink = cap.querySelector('.splash-cap-link');
        var pauseBtn = cap.querySelector('.splash-pause');
        var dotsEl = cap.querySelector('.splash-dots');
        var layers = [], now = -1, timer = null, paused = still;

        function drawQuiet(s, data, svg) {
            var lx = function (v) { return s.xLog ? Math.log10(v) : v; };
            var x = function (v) { return PAD.l + (lx(v) - lx(s.x[0])) / (lx(s.x[1]) - lx(s.x[0])) * (QW - PAD.l - PAD.r); };
            var y = function (v) { return QH - PAD.b - (v - s.y[0]) / (s.y[1] - s.y[0]) * (QH - PAD.t - PAD.b); };
            var g = document.createElementNS(NS, 'g');
            g.setAttribute('class', 'q-dots');
            data.rows.forEach(function (d) {
                var c = document.createElementNS(NS, 'circle');
                c.setAttribute('cx', x(d[1]).toFixed(1));
                c.setAttribute('cy', y(d[2]).toFixed(1));
                c.setAttribute('r', s.quietR || 5);
                g.appendChild(c);
            });
            svg.appendChild(g);
            if (s.trend) {
                var f = data.fit, t0 = s.trend[0], t1 = s.trend[1];
                var x1 = x(t0), y1 = y(f.intercept + f.slope * lx(t0)), x2 = x(t1), y2 = y(f.intercept + f.slope * lx(t1));
                var ln = document.createElementNS(NS, 'line');
                ln.setAttribute('class', 'q-trend');
                ln.setAttribute('x1', x1); ln.setAttribute('y1', y1); ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
                ln.style.setProperty('--len', Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
                svg.appendChild(ln);
            }
        }

        SLIDES.forEach(function (s, i) {
            var layer = document.createElement('div');
            layer.className = 'splash-slide';
            if (s.wash) {
                var im = document.createElement('img');
                im.alt = '';
                im.decoding = 'async';
                im.src = s.wash;
                layer.appendChild(im);
            } else {
                s.quiet = document.createElementNS(NS, 'svg');
                s.quiet.setAttribute('viewBox', '0 0 ' + QW + ' ' + QH);
                s.quiet.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
                layer.appendChild(s.quiet);
            }
            bg.appendChild(layer);
            layers.push(layer);
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', 'Background figure ' + (i + 1) + ': ' + s.title);
            b.addEventListener('click', function () { show(i); if (!paused) start(); });
            dotsEl.appendChild(b);
        });

        function ready(i) {
            var s = SLIDES[i];
            if (s.quietDrawn || s.wash) return;
            s.quietDrawn = true;
            load(s).then(function (data) { drawQuiet(s, data, s.quiet); }).catch(function () { s.quietDrawn = false; });
        }

        function show(i) {
            i = (i + SLIDES.length) % SLIDES.length;
            ready(i);
            ready((i + 1) % SLIDES.length);
            if (now >= 0) layers[now].classList.remove('is-active');
            layers[i].classList.add('is-active');
            now = i;
            capTitle.textContent = SLIDES[i].title;
            [].forEach.call(dotsEl.children, function (b, j) {
                if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
            });
        }

        function start() {
            clearInterval(timer);
            timer = paused ? null : setInterval(function () { show(now + 1); }, 8000);
        }

        pauseBtn.addEventListener('click', function () {
            paused = !paused;
            pauseBtn.setAttribute('aria-label', (paused ? 'Play' : 'Pause') + ' the background figures');
            pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
            start();
        });
        // "See the figure" jumps to the same slide in the carousel below.
        capLink.addEventListener('click', function () { go(now); });

        pauseBtn.setAttribute('aria-label', (paused ? 'Play' : 'Pause') + ' the background figures');
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        cap.hidden = false;
        show(0);
        start();
    })();

    go(0);
})();
