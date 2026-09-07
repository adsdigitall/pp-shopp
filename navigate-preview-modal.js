const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/garimpar", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);
// Click first Preview button using the role approach
await page.getByRole("button", { name: "Preview" }).first().click({ timeout: 10000 });
// Wait for modal to appear
await page.waitForSelector('[role="dialog"], .modal, [class*="modal"], [class*="preview"]', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(2000);
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks-preview", timeout: 15000 });
console.log(snapshot.full);