const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/espelhamento", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);
// Click Novo espelhamento
await page.getByRole("button", { name: "Novo espelhamento" }).click({ timeout: 10000 });
await page.waitForTimeout(3000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks-novo-espelhamento", timeout: 15000 });
console.log(snapshot.full);