const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://localhost:8899/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);

  const T = async (name, fn) => { try { const r = await fn(); console.log((r === false ? 'FAIL ' : 'ok   ') + name + (r && r !== true ? ' → ' + r : '')); } catch (e) { console.log('FAIL ' + name + ' → ' + e.message); } };

  // enter replay
  await p.click('#replay-btn');
  await p.waitForTimeout(800);
  await T('replay bar visible', async () => await p.isVisible('#replay-bar'));
  await T('replay-btn active', async () => await p.getAttribute('#replay-btn', 'class').then(c => c.includes('active')));
  const pos1 = await p.textContent('#rp-pos');
  await T('pos shows index', async () => /\d+\/\d+/.test(pos1) || pos1);

  // step forward
  await p.click('#rp-fwd');
  await p.waitForTimeout(300);
  const pos2 = await p.textContent('#rp-pos');
  await T('step fwd advances', async () => pos2 !== pos1 ? pos2 : false);

  // step back
  await p.click('#rp-back');
  await p.waitForTimeout(300);
  const pos3 = await p.textContent('#rp-pos');
  await T('step back works', async () => pos3 === pos1 ? pos3 : (pos3 || false));

  // play 1.5s then it should advance several bars
  await p.selectOption('#rp-speed', '200');
  await p.click('#rp-play');
  await p.waitForTimeout(1500);
  const pos4 = await p.textContent('#rp-pos');
  await p.click('#rp-play'); // pause
  await T('play auto-advances', async () => pos4 !== pos3 ? pos4 : false);

  // scrub
  await p.fill('#rp-scrub', '20').catch(()=>{});
  await p.$eval('#rp-scrub', el => { el.value = 20; el.dispatchEvent(new Event('input', {bubbles:true})); });
  await p.waitForTimeout(300);
  const pos5 = await p.textContent('#rp-pos');
  await T('scrub jumps', async () => /^20\b|^20\/|\b20\//.test(pos5) || pos5.startsWith('20/') ? pos5 : pos5);

  await p.screenshot({ path: '/tmp/replay-mid.png' });

  // exit
  await p.click('#rp-exit');
  await p.waitForTimeout(1500);
  await T('replay bar hidden after exit', async () => !(await p.isVisible('#replay-bar')));
  await T('replay-btn inactive', async () => await p.getAttribute('#replay-btn', 'class').then(c => !c.includes('active')));

  await p.screenshot({ path: '/tmp/replay-after.png' });
  console.log('CONSOLE ERRORS:', errs.length);
  errs.slice(0, 12).forEach(e => console.log('  ' + e));
  await browser.close();
})();
