const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/disparar", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);
// Click Continuar to go to step 2
await page.getByRef("e123").click({ timeout: 10000 });
await page.waitForTimeout(3000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks-disparar-step2", timeout: 15000 });
console.log(snapshot.full);