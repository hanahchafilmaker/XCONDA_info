/* Replaces the supplied pages' Cloudflare-wrapped viewer with a small local viewer. */
(() => {
  const dialog = document.querySelector('.zoom[role="dialog"]');
  const image = dialog?.querySelector('img');
  const close = dialog?.querySelector('button');
  if (!dialog || !image || !close) return;

  const hint = document.querySelector('.xconda-manual-nav')?.getAttribute('data-zoom-label') || '';
  let lastImage = null;
  const open = (source) => {
    lastImage = source;
    image.src = source.src;
    image.alt = source.alt;
    dialog.hidden = false;
    close.focus();
  };
  const shut = () => {
    dialog.hidden = true;
    image.removeAttribute('src');
    lastImage?.focus();
  };

  document.querySelectorAll('.image-plate img').forEach((source) => {
    source.setAttribute('tabindex', '0');
    source.setAttribute('role', 'button');
    if (hint) source.setAttribute('aria-label', `${source.alt} — ${hint}`);
    source.addEventListener('click', () => open(source));
    source.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(source);
      }
    });
  });
  close.addEventListener('click', shut);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) shut(); });
  document.addEventListener('keydown', (event) => {
    if (dialog.hidden) return;
    if (event.key === 'Escape') shut();
    // The dialog has only one interactive control: keep keyboard focus inside it.
    if (event.key === 'Tab') {
      event.preventDefault();
      close.focus();
    }
  });
})();
