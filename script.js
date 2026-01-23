document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-trigger');
    const mainNav = document.getElementById('main-nav');
    const rim = document.getElementById('rim-image');

    menuBtn.onclick = () => {
        menuBtn.classList.toggle('active');
        mainNav.classList.toggle('active');
    };

    document.querySelectorAll('.main-nav a').forEach(link => {
        link.onclick = () => {
            menuBtn.classList.remove('active');
            mainNav.classList.remove('active');
        };
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    window.onscroll = () => {
        if (rim) rim.style.transform = `rotate(${window.pageYOffset / 2}deg)`;
    };

    document.querySelectorAll('.event-card').forEach(card => {
        card.onclick = () => card.classList.toggle('is-flipped');
    });
});