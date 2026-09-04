const tokenEl = document.getElementById('token');
const statusEl = document.getElementById('status');
chrome.storage.local.get(['radarToken'], ({ radarToken }) => { tokenEl.value = radarToken || ''; });
document.getElementById('send').addEventListener('click', async () => {
  const token = tokenEl.value.trim();
  if (!token) { statusEl.textContent = 'Informe o token da extensão.'; return; }
  chrome.storage.local.set({ radarToken: token });
  statusEl.textContent = 'Capturando produto…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.__RADAR_PRODUCT || null });
    if (!result?.name || !result?.productUrl) throw new Error('Abra uma página de produto compatível.');
    const response = await fetch('https://radarfertas.shop/api/extension/import', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-extension-token': token }, body: JSON.stringify({ products: [result] }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || 'Falha ao importar.');
    statusEl.textContent = 'Produto enviado para o Radar ✅';
  } catch (error) { statusEl.textContent = error.message || 'Não foi possível enviar.'; }
});
