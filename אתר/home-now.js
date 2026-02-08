(() => {
  const el = document.getElementById('homeNow');
  if (!el) return;

  const pad2 = (n) => String(n).padStart(2, '0');

  const formatNow = (d) => {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());

    return `${day}/${month}/${year} ${hh}:${mm}:${ss}`;
  };

  const render = () => {
    el.textContent = formatNow(new Date());
  };

  render();
  setInterval(render, 1000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });
})();
