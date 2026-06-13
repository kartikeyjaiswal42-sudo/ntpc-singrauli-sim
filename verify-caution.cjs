// Playwright verification of CautionTrading Delta-style terminal (run from ntpc-singrauli-sim/)
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));

  await page.goto("http://localhost:8899", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "/tmp/ct-1-main.png" });

  // stats strip populated?
  const stats = await page.locator("#stats .stat").count();
  const obSells = await page.locator("#ob-sells .ob-row").count();
  const obBuys = await page.locator("#ob-buys .ob-row").count();
  const trades = await page.locator("#trades .ob-row").count();
  const price = await page.locator("#q-price").innerText();
  console.log(`stats blocks: ${stats}, ob sells: ${obSells}, ob buys: ${obBuys}, trades: ${trades}, price: ${price}`);

  // ===== realtime websocket checks =====
  await page.waitForTimeout(3000);
  const srcNote = await page.locator("#src-note").innerText();
  console.log("src note:", srcNote, srcNote.includes("realtime") ? "(websocket LIVE)" : "(POLLING fallback!)");

  // measure update speed over 8s: price ticks, trade rows, order book repaints
  const speed = await page.evaluate(() => new Promise(res => {
    let price = 0, trades = 0, ob = 0;
    let lp = document.getElementById("q-price").innerText;
    let lt = document.getElementById("trades").innerText;
    let lo = document.getElementById("ob-sells").innerText;
    const iv = setInterval(() => {
      const p = document.getElementById("q-price").innerText;
      const t = document.getElementById("trades").innerText;
      const o = document.getElementById("ob-sells").innerText;
      if (p !== lp) { price++; lp = p; }
      if (t !== lt) { trades++; lt = t; }
      if (o !== lo) { ob++; lo = o; }
    }, 150);
    setTimeout(() => { clearInterval(iv); res({ price, trades, ob }); }, 8000);
  }));
  console.log(`updates in 8s — price: ${speed.price}, trades: ${speed.trades}, orderbook: ${speed.ob}`);

  // funding countdown ticking?
  const cd1 = await page.locator("#fund-cd").innerText().catch(() => "n/a");
  await page.waitForTimeout(2100);
  const cd2 = await page.locator("#fund-cd").innerText().catch(() => "n/a");
  console.log(`funding countdown: ${cd1} → ${cd2} (ticking: ${cd1 !== cd2})`);

  // buy/sell buttons live?
  const bbVisible = await page.locator("#bb-box").isVisible();
  const bbBuy = bbVisible ? await page.locator("#bb-buy b").innerText() : "—";
  console.log(`buy/sell box visible: ${bbVisible}, buy price: ${bbBuy}`);

  // ===== ƒ Indicators (studies) =====
  const indBtnTxt = await page.locator("#ind-btn").innerText();
  console.log("indicators button:", indBtnTxt, "(default EMA 200 + RSI 14 expected)");
  await page.click("#ind-btn");
  await page.waitForTimeout(500);
  let indRows = await page.locator("#ind-active .ind-row").count();
  console.log("active studies in modal:", indRows);
  await page.fill("#ind-search", "macd");
  await page.waitForTimeout(300);
  await page.locator('#ind-add-list .ip-item[data-add="macd"]').click();
  await page.waitForTimeout(2500);
  indRows = await page.locator("#ind-active .ind-row").count();
  console.log("after adding MACD:", indRows, "| button:", await page.locator("#ind-btn").innerText());
  await page.screenshot({ path: "/tmp/ct-8-indicators.png" });
  // remove MACD again
  await page.locator('#ind-active [data-rm="2"]').click();
  await page.waitForTimeout(1500);
  console.log("after removing MACD:", await page.locator("#ind-active .ind-row").count());
  await page.locator("#ind-modal [data-close]").click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/ct-9-chart-studies.png" });

  // symbol modal
  await page.click("#symbol-btn");
  await page.waitForTimeout(1500);
  const symRows = await page.locator(".sym-row").count();
  console.log("symbol rows (delta):", symRows);
  await page.screenshot({ path: "/tmp/ct-2-symbols.png" });

  // NSE tab
  await page.click('#exch-tabs .pill[data-exch="nse"]');
  await page.waitForTimeout(800);
  const nseRows = await page.locator(".sym-row").count();
  console.log("symbol rows (nse):", nseRows);
  await page.screenshot({ path: "/tmp/ct-3-nse.png" });

  // pick NIFTY → chart should switch, side panels show note
  await page.locator('.sym-row[data-sym="NSE:NIFTY"]').first().click();
  await page.waitForTimeout(4000);
  const sideNoteVisible = await page.locator("#side-note").isVisible();
  const sbName = await page.locator("#sb-name").innerText();
  console.log("after NIFTY click — symbol btn:", sbName, "| side note visible:", sideNoteVisible);
  await page.screenshot({ path: "/tmp/ct-4-nifty.png" });

  // back to BTCUSD
  await page.click("#symbol-btn");
  await page.waitForTimeout(600);
  await page.click('#exch-tabs .pill[data-exch="delta"]');
  await page.waitForTimeout(800);
  await page.locator('.sym-row[data-sym="BTCUSD"]').first().click();
  await page.waitForTimeout(3000);

  // create-alert dialog + live preview
  await page.click("#btn-new");
  await page.waitForTimeout(2500);
  const preview = await page.locator("#preview").innerText();
  console.log("alert preview:", preview.replace(/\n/g, " | "));
  await page.screenshot({ path: "/tmp/ct-5-dialog.png" });

  // save a guaranteed-to-fire alert (price > 1 on 1m, fires immediately)
  await page.locator("#ip-left .ipicker-btn").click();
  await page.waitForTimeout(300);
  await page.locator('#ip-left .ip-item[data-k="price"]').click();
  await page.waitForTimeout(300);
  await page.selectOption("#f-op", "gt");
  await page.fill("#f-right-value", "1");
  await page.fill("#f-message", "PLAYWRIGHT TEST ALERT");
  await page.waitForTimeout(1200);
  await page.click("#btn-save");
  await page.waitForTimeout(3500);
  const alarmVisible = await page.locator("#alarm").isVisible();
  console.log("alarm overlay visible:", alarmVisible);
  await page.screenshot({ path: "/tmp/ct-6-alarm.png" });
  if (alarmVisible) await page.click("#alarm-stop");
  await page.waitForTimeout(500);

  // alerts table has the row; click it to plot
  const alertRows = await page.locator(".arow").count();
  console.log("alert rows:", alertRows);

  // triggered log tab
  await page.click('.btab[data-tab="log"]');
  await page.waitForTimeout(500);
  const fired = await page.locator("#fired-list .fcard").count();
  console.log("fired log cards:", fired);
  await page.screenshot({ path: "/tmp/ct-7-log.png" });

  // delete test alert
  await page.click('.btab[data-tab="alerts"]');
  await page.waitForTimeout(400);
  page.once("dialog", d => d.accept());
  const row = page.locator(".arow", { hasText: "PLAYWRIGHT" }).first();
  if (await row.count() === 0) {
    // fall back: delete the last row (the just-created one)
    await page.locator('.arow [data-act="del"]').last().click();
  } else {
    await row.locator('[data-act="del"]').click();
  }
  await page.waitForTimeout(1000);
  console.log("alert rows after delete:", await page.locator(".arow").count());

  // =====================================================================
  // ===== NEW: TradingView overhaul feature checks ======================
  // =====================================================================
  console.log("\n----- TradingView overhaul features -----");
  await page.waitForTimeout(1500);

  // -- left drawing rail present --
  const railTools = await page.locator("#rail .rtool[data-tool]").count();
  const railExtras = await page.locator("#r-magnet, #r-lock, #r-eye, #r-trash").count();
  console.log(`drawing rail: ${railTools} tools + ${railExtras} toggles`);

  // -- draw a trend line on the chart, confirm it persists in state --
  await page.locator('#rail .rtool[data-tool="trend"]').click();
  const ca = await page.locator("#chart-area").boundingBox();
  // keep inside the top (main price) pane — lower region is the RSI indicator pane
  const x1 = ca.x + ca.width * 0.35, y1 = ca.y + ca.height * 0.40;
  const x2 = ca.x + ca.width * 0.65, y2 = ca.y + ca.height * 0.22;
  await page.mouse.move(x1, y1); await page.mouse.down();
  await page.mouse.move((x1 + x2) / 2, (y1 + y2) / 2); await page.mouse.move(x2, y2);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const cntDraws = () => page.evaluate(() => { try { const d = JSON.parse(localStorage.getItem("ct_drawings_v1") || "{}"); return Object.values(d).reduce((n, a) => n + (a ? a.length : 0), 0); } catch { return -1; } });
  console.log("drawing created (trend line) — total stored drawings:", await cntDraws());
  await page.screenshot({ path: "/tmp/ct-10-drawing.png" });

  // -- undo / redo --
  await page.locator("#btn-undo").click(); await page.waitForTimeout(400);
  const afterUndo = await cntDraws();
  await page.locator("#btn-redo").click(); await page.waitForTimeout(400);
  const afterRedo = await cntDraws();
  console.log(`undo → ${afterUndo}, redo → ${afterRedo}`);
  page.once("dialog", d => d.accept());
  await page.locator("#r-trash").click().catch(() => {});
  await page.waitForTimeout(400);
  await page.locator('#rail .rtool[data-tool="cursor"]').click();

  // -- chart-type switcher --
  await page.locator("#ctype-btn").click(); await page.waitForTimeout(300);
  const ctypeItems = await page.locator("#ctype-menu .dd-item").count();
  await page.locator('#ctype-menu .dd-item[data-ctype="line"]').click();
  await page.waitForTimeout(2500);
  console.log(`chart-type menu: ${ctypeItems} types; switched to Line, btn:`, (await page.locator("#ctype-btn").innerText()).replace(/\n/g, " "));
  await page.screenshot({ path: "/tmp/ct-11-line.png" });
  await page.locator("#ctype-btn").click(); await page.waitForTimeout(250);
  await page.locator('#ctype-menu .dd-item[data-ctype="heikin"]').click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/ct-12-heikin.png" });
  await page.locator("#ctype-btn").click(); await page.waitForTimeout(250);
  await page.locator('#ctype-menu .dd-item[data-ctype="candles"]').click();
  await page.waitForTimeout(2000);

  // -- price-mode tabs: Mark / Funding / Depth --
  await page.locator('.mtab[data-mode="mark"]').click(); await page.waitForTimeout(2800);
  console.log("→ Mark Price active:", await page.locator('.mtab[data-mode="mark"]').evaluate(e => e.classList.contains("active")));
  await page.screenshot({ path: "/tmp/ct-13-mark.png" });
  await page.locator('.mtab[data-mode="funding"]').click(); await page.waitForTimeout(2800);
  console.log("→ Funding active:", await page.locator('.mtab[data-mode="funding"]').evaluate(e => e.classList.contains("active")));
  await page.screenshot({ path: "/tmp/ct-14-funding.png" });
  await page.locator('.mtab[data-mode="depth"]').click(); await page.waitForTimeout(2000);
  console.log("→ Depth — pane visible:", await page.locator("#depth-pane").isVisible().catch(() => false));
  await page.screenshot({ path: "/tmp/ct-15-depth.png" });
  await page.locator('.mtab[data-mode="traded"]').click(); await page.waitForTimeout(2500);

  // -- range presets --
  const rangePills = await page.locator("#range-pills .rpill").count();
  if (rangePills) {
    await page.locator("#range-pills .rpill", { hasText: "1M" }).first().click();
    await page.waitForTimeout(3000);
    console.log(`range presets: ${rangePills} pills; clicked 1M ok`);
  } else console.log("range presets: NONE rendered!");
  await page.screenshot({ path: "/tmp/ct-16-range.png" });

  // -- scale toggles --
  await page.locator("#scale-log").click(); await page.waitForTimeout(800);
  await page.locator("#scale-pct").click(); await page.waitForTimeout(800);
  await page.locator("#scale-auto").click(); await page.waitForTimeout(800);
  console.log("scale toggles (log/%/auto) clicked ok");

  // -- order book grouping + view modes --
  await page.locator('.stab[data-side="ob"]').click().catch(() => {});
  await page.waitForTimeout(500);
  const groupOpts = await page.locator("#ob-group option").count();
  await page.locator("#obv-bids").click(); await page.waitForTimeout(500);
  await page.locator("#obv-asks").click(); await page.waitForTimeout(500);
  await page.locator("#obv-both").click(); await page.waitForTimeout(500);
  console.log(`order book: ${groupOpts} grouping options; bids/asks/both ok`);
  await page.screenshot({ path: "/tmp/ct-17-orderbook.png" });

  // -- watchlist + detail pane --
  await page.locator('.stab[data-side="wl"]').click();
  await page.waitForTimeout(2500);
  const wlRows = await page.locator("#wl-rows .wl-row").count();
  console.log("watchlist rows:", wlRows);
  if (wlRows) { await page.locator("#wl-rows .wl-row").first().click(); await page.waitForTimeout(2500); }
  console.log("watchlist detail visible:", await page.locator("#wl-detail").isVisible().catch(() => false));
  await page.screenshot({ path: "/tmp/ct-18-watchlist.png" });
  await page.locator('.stab[data-side="ob"]').click();

  // -- contract details modal --
  await page.locator("#btn-contract").click();
  await page.waitForTimeout(2500);
  const cModalVis = await page.locator("#contract-modal").isVisible().catch(() => false);
  const cRows = await page.locator("#contract-body tr").count();
  console.log("contract details modal visible:", cModalVis, "| rows:", cRows);
  await page.screenshot({ path: "/tmp/ct-19-contract.png" });
  await page.locator("#contract-modal [data-close]").click().catch(() => {});
  await page.waitForTimeout(400);

  // -- live IST clock ticking --
  const clk1 = await page.locator("#tv-clock").innerText().catch(() => "n/a");
  await page.waitForTimeout(1200);
  const clk2 = await page.locator("#tv-clock").innerText().catch(() => "n/a");
  console.log(`tv clock: ${clk1} → ${clk2} (ticking: ${clk1 !== clk2})`);

  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/ct-20-final.png" });

  console.log("\nconsole errors:", errors.length ? errors : "NONE");
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
