const page = await browser.getPage("garimpalinks");
await page.goto("https://app.garimpalinks.com.br/garimpar", { waitUntil: "domcontentloaded", timeout: 30000 });
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks", timeout: 10000 });
console.log(snapshot.full);