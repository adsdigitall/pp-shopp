# Banco do backend

Esta pasta contém a migration inicial do PP Shopp. Ela ainda não foi aplicada em um projeto remoto porque este repositório não possui um projeto Supabase conectado.

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor** e execute o arquivo `migrations/20260904000000_backend_marketplace.sql`.
3. Crie uma chave de criptografia forte para os tokens no backend.
4. Cadastre no ambiente da Vercel:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<somente-backend>
TOKEN_ENCRYPTION_KEY=<32-byte-key>
```

A `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser colocada no frontend ou em variável `VITE_*`. As tabelas têm RLS habilitado e as políticas restringem linhas ao usuário autenticado.
