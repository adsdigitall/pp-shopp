const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/garimpar", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);
// Find and click Preview button using the ref from earlier snapshot
await page.getByRef("e144").click({ timeout: 10000 });
await page.waitForTimeout(3000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks-preview", timeout: 15000 });
console.log(snapshot.full);