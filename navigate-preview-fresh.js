const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/garimpar", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);
// Get fresh snapshot
const snapshot1 = await page.snapshotForAI({ track: "garimpalinks-garimpar-fresh", timeout: 15000 });
console.log("FRESH SNAPSHOT:");
console.log(snapshot1.full);
// Find preview buttons in the fresh snapshot