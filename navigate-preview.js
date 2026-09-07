const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/garimpar", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
// Click on first Preview button
await page.click('button:has-text("Preview")');
await page.waitForTimeout(2000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks-preview", timeout: 15000 });
console.log(snapshot.full);