// Mobile menu toggle
(function () {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        var header = document.querySelector('.site-header');
        if (header) header.classList.toggle('has-menu', open);
    });
})();

// Splash page: the header starts transparent over the splash and turns solid once it scrolls away
(function () {
    var splash = document.querySelector('.splash');
    var header = document.querySelector('.site-header');
    if (!splash || !header || !('IntersectionObserver' in window)) {
        if (header) header.classList.add('is-solid');
        return;
    }
    var offset = header.offsetHeight || 84;
    new IntersectionObserver(function (entries) {
        header.classList.toggle('is-solid', !entries[0].isIntersecting);
    }, { rootMargin: '-' + offset + 'px 0px 0px 0px', threshold: 0 }).observe(splash);
})();

// Home page slideshow
(function () {
    var show = document.querySelector('.slideshow');
    if (!show) return;
    var slides = show.querySelectorAll('img');
    var dots = document.querySelectorAll('.slide-dots button');
    var current = 0;
    var timer;

    function go(i) {
        slides[current].classList.remove('is-active');
        dots[current].removeAttribute('aria-current');
        current = (i + slides.length) % slides.length;
        slides[current].classList.add('is-active');
        dots[current].setAttribute('aria-current', 'true');
    }

    function restart() {
        clearInterval(timer);
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            timer = setInterval(function () { go(current + 1); }, 6000);
        }
    }

    show.querySelector('.prev').addEventListener('click', function () { go(current - 1); restart(); });
    show.querySelector('.next').addEventListener('click', function () { go(current + 1); restart(); });
    dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { go(i); restart(); });
    });
    restart();
})();
