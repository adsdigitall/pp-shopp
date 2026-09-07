# WAHA no Easypanel

Crie um serviço chamado `waha` usando `docker-compose.easypanel.yml`. O domínio HTTPS deve apontar para o serviço interno na porta `3000`; não publique a porta diretamente na internet.

Variáveis do serviço:

- `WAHA_API_KEY`: chave privada do WAHA. Para maior segurança, use o formato hash `sha512:<hash>` no WAHA e mantenha a chave pura somente como segredo do backend Radar.
- `WAHA_WEBHOOK_URL`: `https://radarfertas.shop/api/webhooks/waha`
- `WAHA_WEBHOOK_HMAC_KEY`: segredo compartilhado do HMAC.

No backend Radar, configure `WAHA_BASE_URL=https://waha.seu-dominio.com`, `WAHA_API_KEY=<chave>` e `WAHA_WEBHOOK_HMAC_KEY=<mesmo segredo>`. O navegador nunca acessa o WAHA diretamente.
