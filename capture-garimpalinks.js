const page = await browser.getPage("garimpalinks");
console.log("URL:", page.url());
console.log("Title:", await page.title());
const snapshot = await page.snapshotForAI({ track: "garimpalinks", timeout: 15000 });
console.log(snapshot.full);