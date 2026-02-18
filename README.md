# Doação PET - Painel Admin (Next.js)

## Instalação
npx create-next-app@latest painel-admin-pet
cd painel-admin-pet
npm i @supabase/supabase-js

Crie .env.local:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

Cole os arquivos deste pacote em:
- lib/supabaseClient.js
- pages/index.js
- pages/admin.js

Rode:
npm run dev
