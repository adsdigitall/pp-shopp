# Banco do backend

As migrations desta pasta já foram aplicadas no projeto Supabase `nqgbygurplruthoihwrl`.

Para configurar o backend local ou na Vercel, defina:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<somente-backend>
TOKEN_ENCRYPTION_KEY=<32-byte-key>
SUPABASE_DEFAULT_USER_ID=<UUID do usuario em auth.users>
```

`SUPABASE_SERVICE_ROLE_KEY` nunca deve ser colocada no frontend ou em variável `VITE_*`. `SUPABASE_DEFAULT_USER_ID` é o UUID do usuário autenticado usado pelo backend enquanto o fluxo de autenticação do app não estiver completo. As tabelas têm RLS habilitado.
