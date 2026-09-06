# Worker de disparos no Easypanel

Crie no projeto Radar um serviço App chamado `radar-worker`, apontando para este repositório e usando `deploy/radar-worker/Dockerfile`.

Não configure domínio nem porta pública. O worker só acessa Supabase e WAHA de saída.

Copie para o serviço as variáveis de backend `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DEFAULT_USER_ID`.
