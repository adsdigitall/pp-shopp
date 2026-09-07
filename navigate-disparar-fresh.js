const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/disparar", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);
// Fresh snapshot
const snap = await page.snapshotForAI({ track: "garimpalinks-disparar-fresh", timeout: 15000 });
console.log("FRESH SNAPSHOT:");
console.log(snap.full);
// Now click Continuar using role
await page.getByRole("button", { name: "Continuar" }).click({ timeout: 10000 });
await page.waitForTimeout(3000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot2 = await page.snapshotForAI({ track: "garimpalinks-disparar-step2", timeout: 15000 });
console.log("STEP 2:");
console.log(snapshot2.full);