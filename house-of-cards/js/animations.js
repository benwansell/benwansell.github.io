// animations.js - CSS class toggling, animation sequencing
var Animations = (function() {
    'use strict';

    var queue = [];
    var running = false;

    function add(fn, delay) {
        queue.push({ fn: fn, delay: delay || 0 });
        if (!running) processQueue();
    }

    function processQueue() {
        if (queue.length === 0) {
            running = false;
            return;
        }
        running = true;
        var item = queue.shift();
        item.fn();
        setTimeout(processQueue, item.delay);
    }

    function cardPlay(cardEl, callback) {
        if (!cardEl) { if (callback) callback(); return; }
        cardEl.classList.add('card-playing');
        setTimeout(function() {
            cardEl.classList.add('card-played');
            setTimeout(function() {
                if (callback) callback();
            }, 300);
        }, 200);
    }

    function damageFlash(targetEl) {
        if (!targetEl) return;
        targetEl.classList.add('damage-flash');
        setTimeout(function() {
            targetEl.classList.remove('damage-flash');
        }, 400);
    }

    function floatingNumber(container, amount, type) {
        if (!container) return;
        var el = document.createElement('div');
        el.className = 'floating-number ' + (type || 'damage');
        el.textContent = (type === 'heal' ? '+' : '-') + amount;
        container.appendChild(el);
        setTimeout(function() {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1000);
    }

    function enemyLunge(enemyEl) {
        if (!enemyEl) return;
        enemyEl.classList.add('enemy-lunge');
        setTimeout(function() {
            enemyEl.classList.remove('enemy-lunge');
        }, 500);
    }

    function cardDrawIn(cardEl) {
        if (!cardEl) return;
        cardEl.classList.add('card-draw-in');
        setTimeout(function() {
            cardEl.classList.remove('card-draw-in');
        }, 400);
    }

    function screenTransition(callback) {
        var wipe = document.getElementById('screen-wipe');
        if (!wipe) { if (callback) callback(); return; }
        wipe.classList.add('active');
        setTimeout(function() {
            if (callback) callback();
            setTimeout(function() {
                wipe.classList.remove('active');
            }, 300);
        }, 400);
    }

    function shakeElement(el) {
        if (!el) return;
        el.classList.add('shake');
        setTimeout(function() {
            el.classList.remove('shake');
        }, 500);
    }

    function pulseElement(el) {
        if (!el) return;
        el.classList.add('pulse');
        setTimeout(function() {
            el.classList.remove('pulse');
        }, 600);
    }

    return {
        add: add,
        cardPlay: cardPlay,
        damageFlash: damageFlash,
        floatingNumber: floatingNumber,
        enemyLunge: enemyLunge,
        cardDrawIn: cardDrawIn,
        screenTransition: screenTransition,
        shakeElement: shakeElement,
        pulseElement: pulseElement
    };
})();
