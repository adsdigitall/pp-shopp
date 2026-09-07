const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/garimpar", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);
// Get fresh snapshot and immediately click
const snapshot1 = await page.snapshotForAI({ track: "garimpalinks-garimpar-fresh", timeout: 15000 });
// Find the first Preview button ref from the snapshot text
// The first product's Preview button is in the generic with ref e126-e144 range
// Let me try clicking by text/role instead
await page.getByRole("button", { name: "Preview" }).first().click({ timeout: 10000 });
await page.waitForTimeout(3000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks-preview", timeout: 15000 });
console.log(snapshot.full);