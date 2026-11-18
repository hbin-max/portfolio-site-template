const artwork = document.querySelector('.reveal');

if (artwork) {
  const toggle = artwork.querySelector('button');

  artwork.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const bounds = artwork.getBoundingClientRect();
    artwork.style.setProperty('--x', `${event.clientX - bounds.left}px`);
    artwork.style.setProperty('--y', `${event.clientY - bounds.top}px`);
    artwork.classList.add('is-tracking');
  });

  artwork.addEventListener('pointerleave', () => artwork.classList.remove('is-tracking'));

  toggle.addEventListener('click', () => {
    const full = artwork.classList.toggle('is-full');
    toggle.setAttribute('aria-pressed', String(full));
  });
}
