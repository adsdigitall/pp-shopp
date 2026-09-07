const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/configuracoes", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1000);
await page.click('button:has-text("Conta")');
await page.waitForTimeout(2000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks-conta", timeout: 15000 });
console.log(snapshot.full);