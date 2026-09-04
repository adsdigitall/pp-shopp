(() => {
  const text = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
  const image = document.querySelector('meta[property="og:image"]')?.content || document.querySelector('img')?.src || '';
  const title = document.querySelector('meta[property="og:title"]')?.content || document.title;
  const price = document.querySelector('meta[property="product:price:amount"]')?.content || text('[class*="price"], [class*="Price"]');
  window.__RADAR_PRODUCT = { name: title.slice(0, 240), imageUrl: image, price: price.slice(0, 40), productUrl: location.href, marketplace: location.hostname };
})();
