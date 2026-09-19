// Papers page: sort by date or by topic, and filter by topic.
// Each entry is a <p class="pub" data-kind data-year data-topics="primary secondary">.
// Without JavaScript the page simply shows the original date-ordered sections.
(function () {
    var list = document.querySelector('.pub-list');
    if (!list) return;
    var items = [].slice.call(list.querySelectorAll('p.pub'));
    if (!items.length) return;

    var TOPICS = [
        ['housing', 'Housing & wealth'],
        ['democracy', 'Democracy & inequality'],
        ['populism', 'Populism & elections'],
        ['education', 'Education & skills'],
        ['tax', 'Taxation & public policy'],
        ['profession', 'The profession']
    ];
    var KINDS = [
        ['article', 'Published Papers', 'Article'],
        ['chapter', 'Chapters in Edited Volumes', 'Chapter'],
        ['review', 'Under Review', 'Under review'],
        ['working', 'Working Papers', 'Working paper']
    ];
    var kindLabel = {};
    KINDS.forEach(function (k) { kindLabel[k[0]] = k[2]; });

    var data = items.map(function (el, i) {
        var badge = document.createElement('span');
        badge.className = 'pub-kind';
        badge.textContent = kindLabel[el.dataset.kind];
        el.insertBefore(badge, el.firstChild);
        return { el: el, order: i, kind: el.dataset.kind, year: +el.dataset.year, topics: el.dataset.topics.split(' ') };
    });

    // Everything before the "Past Working Papers" heading is replaced by the dynamic view.
    var past = [].slice.call(list.querySelectorAll('h2.section-label')).filter(function (h) {
        return /Past Working Papers/.test(h.textContent);
    })[0];
    var stopAt = past ? past.previousElementSibling && past.previousElementSibling.tagName === 'HR' ? past.previousElementSibling : past : null;
    while (list.firstChild && list.firstChild !== stopAt) list.removeChild(list.firstChild);

    var controls = document.createElement('div');
    controls.className = 'pub-controls';
    controls.innerHTML =
        '<div class="pub-ctl" role="group" aria-label="Order papers"><span class="pub-ctl-label">Order</span>' +
        '<button type="button" data-mode="date" aria-pressed="true">By date</button>' +
        '<button type="button" data-mode="topic" aria-pressed="false">By topic</button></div>' +
        '<div class="pub-ctl" role="group" aria-label="Filter by topic"><span class="pub-ctl-label">Topic</span>' +
        '<button type="button" data-topic="all" aria-pressed="true">All <span>' + data.length + '</span></button>' +
        TOPICS.map(function (t) {
            var n = data.filter(function (d) { return d.topics.indexOf(t[0]) !== -1; }).length;
            return '<button type="button" data-topic="' + t[0] + '" aria-pressed="false">' + t[1] + ' <span>' + n + '</span></button>';
        }).join('') + '</div>';
    var view = document.createElement('div');
    view.className = 'pub-view';
    list.insertBefore(controls, stopAt);
    list.insertBefore(view, stopAt);

    var state = { mode: 'date', topic: 'all' };
    try {
        var saved = JSON.parse(sessionStorage.getItem('papers-view') || 'null');
        if (saved) state = saved;
    } catch (e) {}

    function byYear(a, b) { return b.year - a.year || a.order - b.order; }
    function heading(text, n) {
        var h = document.createElement('h2');
        h.className = 'section-label';
        h.innerHTML = text + (n != null ? ' <span class="pub-count">' + n + '</span>' : '');
        return h;
    }

    function render() {
        view.innerHTML = '';
        view.classList.toggle('by-topic', state.mode === 'topic');
        var chosen = data.filter(function (d) { return state.topic === 'all' || d.topics.indexOf(state.topic) !== -1; });
        var groups = [];
        if (state.mode === 'date') {
            KINDS.forEach(function (k) {
                groups.push([k[1], chosen.filter(function (d) { return d.kind === k[0]; }).sort(byYear)]);
            });
        } else {
            TOPICS.forEach(function (t) {
                if (state.topic !== 'all' && state.topic !== t[0]) return;
                groups.push([t[1], chosen.filter(function (d) {
                    return state.topic === 'all' ? d.topics[0] === t[0] : true;
                }).sort(byYear), true]);
            });
        }
        var first = true;
        groups.forEach(function (g) {
            if (!g[1].length) return;
            if (!first) view.appendChild(document.createElement('hr'));
            first = false;
            view.appendChild(heading(g[0], g[2] ? g[1].length : null));
            g[1].forEach(function (d) { view.appendChild(d.el); });
        });
        if (first) view.innerHTML = '<p>No papers match this topic.</p>';
        [].forEach.call(controls.querySelectorAll('button'), function (b) {
            var on = b.dataset.mode ? b.dataset.mode === state.mode : b.dataset.topic === state.topic;
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        try { sessionStorage.setItem('papers-view', JSON.stringify(state)); } catch (e) {}
    }

    controls.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.mode) state.mode = b.dataset.mode;
        if (b.dataset.topic) state.topic = b.dataset.topic;
        render();
    });
    render();
})();
