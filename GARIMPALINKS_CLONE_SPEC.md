# GARIMPA LINKS - CLONE SPECIFICATION
> Complete feature parity specification based on live app analysis (app.garimpalinks.com.br)

---

## 📱 APP ARCHITECTURE OVERVIEW

**Tech Stack**: React 19 + TypeScript + Vite + TailwindCSS | Node.js native HTTP backend | Vercel deploy

**Navigation Structure** (Sidebar):
```
├── Visão geral (Dashboard)        → /visao-geral
├── Garimpar (Product Search)      → /garimpar
├── Disparos (Send Wizard)         → /disparar
├── Ofertas (Queue)                → /fila
├── Páginas (Public Pages)         → /paginas
├── Espelhamento (Mirroring)       → /espelhamento
├── Meus Grupos (Groups Mgmt)      → /grupos
├── Métricas (Analytics)           → /metricas  [UNDER CONSTRUCTION]
├── Extensão (Extension)           → /extensao
└── Configurações (Settings)       → /configuracoes
    ├── Canais
    ├── Plataformas
    ├── Templates
    ├── Cupons
    ├── Segurança
    └── Conta
```

**Floating Actions** (Bottom Right):
- WhatsApp (connection status modal)
- Notificações (push notifications)
- Alternar tema (dark/light)

---

## 1. VISÃO GERAL (DASHBOARD) - `/visao-geral`

### Layout
- Greeting: "Bom dia, {nome}. Você garimpou {N} pepitas hoje. Plataforma em alta: {platform}."
- Quick Action Cards (2-column grid):
  1. **Garimpar agora** → navigates to `/garimpar`
  2. **Sua fila** → shows count + "Disparar nos grupos" link → `/disparar`
- Dispatch Status Card: "Nenhum disparo em andamento" / "Iniciar disparo"
- Metrics Row (4 cards):
  - Disparos hoje: `{count}`
  - Grupos ativos: `{count}` (↑ +{N} na semana)
  - Cliques no link: `{count}`
  - Ofertas na fila: `{count}`
- Atividade Recente: list or "Sem envios ainda"
- Future placeholders: Ranking de conversão, Melhores horários (heatmap)

---

## 2. GARIMPAR (PRODUCT SEARCH) - `/garimpar`

### Platform Selector (Top)
- **Shopee** (active, connected)
- **Mercado Livre** · conectar → opens OAuth flow
- **Amazon** · conectar → opens config
- **Magalu** em breve (disabled)

### Search Tabs
| Tab | Function |
|-----|----------|
| **Buscar** | Free text search input + "Garimpar" button |
| **Categorias** | Grid of 9 categories (Casa, Cozinha, Eletrônico, Moda, Beleza, Ferramenta, Esporte, Pet, Bebê) |
| **Mais buscados** | Chips: air fryer, fone de ouvido, kit organizador, potes de cozinha, celular |
| **Lojas favoritas** | "Gerencie suas lojas e grupos favoritos" + "Abrir grupos" button |
| **Por links** | Paste Shopee/ML link → "Garimpar" fetches via API |

### Filter Chips (Below Search)
- Mais vendidos
- Maior comissão
- Menor preço
- Com desconto
- Avaliação 4+

### Product Grid (3 cols desktop, 2 mobile)
Each card shows:
- **Image** (aspect-square) + **Discount badge** (e.g., "-66%")
- **Title** (truncated)
- **Price row**: Current price (bold) + Original price (strikethrough)
- **Meta row**: Sales count (formatted: "980 vendas", "2,6mil vendas", "38,4mil vendas") + Commission % (e.g., "10% comissão")
- **Actions** (3 icon buttons):
  1. **Jogar na fila** (queue icon) → adds to queue, toast "Oferta adicionada à fila"
  2. **Gerar link** (link icon) → generates affiliate link
  3. **Preview** (eye icon) → opens Preview Modal

### Pagination
- "Carregar mais ofertas" button at bottom (infinite scroll via IntersectionObserver)

---

## 3. DISPARAR (3-STEP WIZARD) - `/disparar`

### Step Indicator (Top)
`1 Ofertas → 2 Mensagem → 3 Destinos` (current step highlighted)

### Step 1: Ofertas
- "Vindas da fila. Desmarque o que não quer disparar agora."
- "X selecionadas" button
- Product cards from queue (checkbox + image + title + prices)
- **Continuar** button (enabled when ≥1 selected)

### Step 2: Mensagem
- "Configure a mensagem de cada app. Pode usar os dois ou só um."
- **WhatsApp** toggle (on by default)
- **Template Selector** (combobox):
  - Vendedor e humanizado (default)
  - Direto e agressivo
  - Sensação de achado
  - Urgência e escassez
- **Message Editor** (textarea with variables):
  - Variable buttons: `{TITULO}`, `{PRECO}`, `{PRECO_ANTIGO}`, `{LINK}`, `{CUPOM}`
  - Live preview shows rendered message
- **Options**:
  - Mostrar imagem (toggle, ON)
  - CTAs rotativas (toggle, DISABLED - "Adicione frases no seu modelo em Configurações pra ativar")
- **WhatsApp Preview** - shows exactly how it renders
- **Voltar** / **Continuar** buttons

### Step 3: Destinos
- "Escolha os grupos que vão receber este disparo — nenhum vem marcado."
- **Group Selector**:
  - Search input "Buscar grupos"
  - "selecionar todos" button
  - List of groups: Name + member count badge
  - Click to toggle selection
- **Quando**: Radio buttons "agora" / "agendar"
- **Ritmo**: 
  - "Intervalo entre envios:" spinner (default 8) + dropdown (segundos/minutos/horas)
  - Helper: "Recomendamos intervalos de 20 minutos para manter a segurança"
- **Safety Toggles** (all ON by default):
  - Não enviar das 23h às 6h
  - Não enviar Sábados e Domingos
  - Não enviar ofertas expiradas
- **Disparar X** button (shows selected count, disabled if 0 groups)

---

## 4. OFERTAS / FILA (QUEUE) - `/fila`

### Tabs
- **Fila** (default) | **Grupos**

### Header
- "X ofertas prontas pra disparar. Revise e ajuste antes de mandar."
- **Adicionar oferta** button (opens manual add modal)
- **Selecionar tudo** | **Limpar Fila** | **Ir para Disparos** (link)

### Queue Items
Each item shows:
- Platform badge: "Shopee" + Status badge: "Pronta"
- Product title
- Price row: Original ~ Current
- **Affiliate Link Display**: short URL (s.shopee.com.br/xxx) + **Copy** button
- **Remover oferta** button (trash icon)

---

## 5. PÁGINAS (PUBLIC PAGES) - `/paginas`

### Types (3 buttons)
1. **Vitrine de Ofertas** - Product showcase page
2. **Convite para Grupos** - Group invitation landing
3. **LinkTree Personalizada** - Bio link page

### Page List
Each page shows:
- Name + Status badge (Rascunho/Publicada)
- "X produtos · criada em DD/MM/YY"
- Actions: **Adicionar ofertas** | **Personalizar** | **Publicar vitrine** | **Apagar coleção**

### Nova Vitrine Modal
- Name input: "Nome da vitrine (ex.: Achados da semana)"
- Type selector: 3 radio cards (Vitrine/Convite/LinkTree)
- **Criar vitrine** (disabled until name filled)

---

## 6. ESPELHAMENTO (MIRRORING) - `/espelhamento`

### Novo Espelhamento Modal (Complex!)

#### Origem (Source) - Choose 1
- Search input + "atualizar" button
- Group list with member counts
- Single select (radio style)

#### Destino (Destinations) - Multi-select, Admin Required
- Same group list
- Shows "admin necessário" badge + disabled if not admin
- Multi-select (checkbox style)

#### Tipo de Espelhamento (Radio Cards)
1. **Instantâneo** - "Espelha a oferta na hora, assim que ela aparece na origem."
2. **Embaralhado** - "Junta um lote de ofertas e sorteia a ordem de envio, diferente em cada grupo."

#### Modelos de Mensagem (Optional, Multi-select)
- 4 template cards (same as Disparar templates)
- "Nenhum selecionado: a mensagem original é repostada com o link trocado."

#### Opções (Toggles)
- **Somente ofertas** - "Espelha só mensagens com link de loja (Shopee, ML, Amazon, Magalu). Evita repostar links pessoais."
- **Cupom da mensagem** (Radio):
  - "Copiar do grupo de origem" - Tenta ler cupom da mensagem original
  - "Usar meus cupons" - Usa cupons de Configurações pela plataforma
- **Eu sou quem posta neste grupo** - "Ligue se você mesmo escreve as ofertas na origem..."

#### Criar espelhamento (disabled until valid)

---

## 7. MEUS GRUPOS - `/grupos`

### Tabs
- **Monitor** | **Proteção** | **Campanhas**

### Stats Cards
- Grupos ativos: `{count}`
- Membros alcançados: `{count}`
- Mensagens enviadas: `{count}`

### Group Management
- "Escolha quais grupos do seu WhatsApp aparecem em Meus Grupos."
- **Selecionar grupos** button

### Group List
Each group shows:
- Avatar + Name + Status badge (Novo/Saudável)
- Member count: "X membros"
- Activity: "X em 30d" (sent) + "X em 30d" (received) with icons
- "Enviadas: X" + "Última atividade: DD/MM/YYYY"
- **Remover de Meus Grupos** button

---

## 8. CONFIGURAÇÕES - `/configuracoes`

### Tab: Canais
- WhatsApp: Status "Conectado" + **Desconectar** button
- Telegram: "Em breve"
- **Adicionar outro número ou bot** button

### Tab: Plataformas
| Platform | Fields |
|----------|--------|
| **Shopee** | AppId (textbox) + Secret (password) + **Salvar** + **Validar conexão** |
| **Mercado Livre** | Tag de afiliado (textbox) + **Salvar** |
| **Amazon** | Associate tag (textbox) + **Salvar** |
| **Magalu** | Sua loja / Magazine Você (textbox) + **Salvar** |

### Tab: Templates
- "Modelos de mensagem usados nos disparos e espelhamentos. Use variáveis como {TITULO}, {PRECO} e {LINK}."

**Custom Templates** (editable):
- Each: Name + Message textarea + **Editar** | **Remover**

**Modelos Sugeridos** (read-only, with "usar" button):
1. Direto e agressivo
2. Sensação de achado
3. Curto (volume)
4. Urgência e escassez
5. Vendedor e humanizado

- **Modelo em branco** button (creates new)

### Tab: Cupons
- "Cupons por plataforma. Nas mensagens, a variável {CUPOM} usa o cupom da mesma plataforma da oferta."
- **Novo cupom** button

### Tab: Segurança
- **Ritmo seguro**: "Intervalo automático e mínimo de 20 minutos entre envios" (toggle)

### Tab: Conta
- Plan badge: "PRO | Afiliado Viral" + "Assinatura ativa" + **Gerenciar**
- Profile: Name (textbox), Email (textbox)
- **Alterar senha** | **Salvar**
- **Sair da conta** button

---

## 9. EXTENSÃO - `/extensao`

### Hero
- Title: "Extensão do GarimpaLinks"
- Subtitle: "Garimpe páginas inteiras de Shopee, Amazon, Mercado Livre e Magalu com um clique..."
- **Baixar extensão (.zip)** link → `/garimpalinks-connect.zip`

### Requirements
- "Você precisa ser afiliado das plataformas"
- ML: logado na conta de afiliado
- Amazon/Magalu: configure tag/slug no app

### Installation Steps (5 steps with icons)
1. Baixe e descompacte
2. Abra `chrome://extensions` (copy button)
3. Ligue Modo do desenvolvedor
4. "Carregar sem compactação" → select folder
5. Pronto! Abra loja → "Garimpar esta página"

### Conexão da Extensão
- **Seu token** (code block + copy) - auth for all stores
- **URL do painel** (code block + copy) - where extension sends products

### O que cada loja exige
| Platform | Config |
|----------|--------|
| Mercado Livre | Sincronizar sessão (cookies) + tag afiliado |
| Amazon | Associate tag (ex.: suatag-20) |
| Magalu | Slug Magazine Você |
| Shopee | Usa conexão server-side do app |

### Security Note
- "Seguro por padrão: só lê página aberta, não acessa conta, não envia sem você mandar. Não compartilhe token."

---

## 10. WHATSAPP CONNECTION MODAL
- Trigger: Floating WhatsApp button
- Shows: WhatsApp logo + "Conectado" status
- **Desconectar dispositivo** button
- **Fechar** button

---

## 11. PREVIEW MODAL (Product)
- Trigger: "Preview" button on product card
- Shows: Full message preview with rendered variables
- Copy/Share actions

---

## 12. BACKEND API ENDPOINTS NEEDED

### Products & Search
```
GET  /api/products              # Search products (Shopee/ML/Amazon)
GET  /api/products/:id          # Single product details
POST /api/affiliate-link        # Generate affiliate link
```

### Queue (Fila)
```
GET    /api/queue               # List queued products
POST   /api/queue               # Add to queue
DELETE /api/queue/:id           # Remove from queue
POST   /api/queue/clear         # Clear all
```

### Dispatch (Disparar)
```
POST   /api/dispatch            # Create dispatch job
GET    /api/dispatch/:id        # Dispatch status
GET    /api/dispatch/history    # Dispatch history
```

### Groups
```
GET    /api/groups              # List WhatsApp groups
POST   /api/groups/sync         # Sync groups from WhatsApp
GET    /api/groups/:id/stats    # Group metrics
```

### Mirroring (Espelhamento)
```
POST   /api/mirroring           # Create mirroring config
GET    /api/mirroring           # List mirroring configs
DELETE /api/mirroring/:id       # Delete mirroring
GET    /api/mirroring/:id/logs  # Mirroring logs
```

### Public Pages (Páginas)
```
POST   /api/pages               # Create page
GET    /api/pages               # List pages
GET    /api/pages/:slug         # Public page view
PUT    /api/pages/:id           # Update page
DELETE /api/pages/:id           # Delete page
POST   /api/pages/:id/products  # Add products to page
```

### Settings
```
GET    /api/settings            # Get all settings
PUT    /api/settings/channels   # Update channels
PUT    /api/settings/platforms  # Update platform credentials
PUT    /api/settings/templates  # Update templates
PUT    /api/settings/coupons    # Update coupons
PUT    /api/settings/security   # Update security
```

### Extension
```
POST   /api/extension/import    # Receive products from extension (token auth)
GET    /api/extension/token     # Get user's extension token
```

### WhatsApp
```
GET    /api/whatsapp/status     # Connection status
POST   /api/whatsapp/connect    # Initiate connection
POST   /api/whatsapp/disconnect # Disconnect
```

### Analytics (Future)
```
GET    /api/analytics/overview  # Dashboard metrics
GET    /api/analytics/dispatch  # Dispatch performance
GET    /api/analytics/groups    # Group engagement
GET    /api/analytics/products  # Product conversion
```

---

## 13. DATA MODELS (TypeScript)

```typescript
// Product (from API)
interface Product {
  id: string;
  marketplace: 'shopee' | 'mercado_livre' | 'amazon' | 'magalu';
  marketplaceProductId: string;
  name: string;
  imageUrl: string;
  currentPrice: number;
  originalPrice: number;
  discountPercentage: number;
  salesCount: number;
  salesCountText: string;  // formatted: "980 vendas", "2,6mil vendas"
  commissionRate: number;  // percentage
  commissionAmount: number;
  productUrl: string;
  affiliateUrl: string;
  affiliateStatus: 'pending' | 'generated' | 'failed';
  category: string;
  isFlashSale: boolean;
  fetchedAt: string;
}

// Queue Item
interface QueueItem {
  id: string;
  product: Product;
  addedAt: string;
  selected: boolean;
}

// Dispatch Job
interface DispatchJob {
  id: string;
  status: 'draft' | 'pending' | 'running' | 'completed' | 'failed';
  step: 1 | 2 | 3;
  offers: QueueItem[];
  message: {
    whatsapp: {
      enabled: boolean;
      templateId: string;
      customMessage: string;
      showImage: boolean;
      rotatingCTAs: boolean;
    };
  };
  destinations: {
    groups: Group[];
    schedule: 'now' | 'scheduled';
    scheduledAt?: string;
    interval: { value: number; unit: 'seconds' | 'minutes' | 'hours' };
    nightPause: boolean;
    weekendPause: boolean;
    expirePause: boolean;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  stats: { sent: number; failed: number; pending: number };
}

// Group
interface Group {
  id: string;
  name: string;
  memberCount: number;
  isAdmin: boolean;
  status: 'active' | 'healthy' | 'warning';
  messagesSent30d: number;
  messagesReceived30d: number;
  lastActivity: string;
  addedAt: string;
}

// Mirroring Config
interface MirroringConfig {
  id: string;
  name: string;
  sourceGroupId: string;
  destinationGroupIds: string[];
  type: 'instant' | 'shuffled';
  templateIds: string[];
  onlyOffers: boolean;
  couponSource: 'origin' | 'own';
  iAmPoster: boolean;
  status: 'active' | 'paused';
  createdAt: string;
}

// Public Page
interface PublicPage {
  id: string;
  name: string;
  type: 'vitrine' | 'convite' | 'linktree';
  status: 'draft' | 'published';
  slug: string;
  products: string[]; // product IDs
  customization: {
    theme: 'light' | 'dark';
    primaryColor: string;
    logo?: string;
    description?: string;
  };
  createdAt: string;
  publishedAt?: string;
}

// Templates
interface Template {
  id: string;
  name: string;
  message: string; // with variables
  isCustom: boolean;
  createdAt: string;
}

// Coupon
interface Coupon {
  id: string;
  platform: 'shopee' | 'mercado_livre' | 'amazon' | 'magalu';
  code: string;
  description?: string;
  expiresAt?: string;
  isActive: boolean;
}

// Settings
interface Settings {
  channels: {
    whatsapp: { connected: boolean; phone?: string; instanceId?: string };
    telegram: { connected: boolean; botToken?: string; chatId?: string };
  };
  platforms: {
    shopee: { appId: string; secret: string; validated: boolean };
    mercadoLivre: { affiliateTag: string; accessToken?: string };
    amazon: { associateTag: string };
    magalu: { storeSlug: string };
  };
  templates: Template[];
  coupons: Coupon[];
  security: {
    safeInterval: boolean; // 20 min minimum
  };
  account: {
    name: string;
    email: string;
    plan: 'free' | 'pro' | 'viral';
    subscriptionStatus: 'active' | 'canceled' | 'past_due';
  };
}
```

---

## 14. UI/UX DETAILS TO REPLICATE

### Design System
- **Colors**: Orange primary (`#EE4D2D`), Slate grays, White/Orange gradients
- **Dark mode**: `bg-[radial-gradient(circle_at_top,#fff7ed_0%,#f8fafc_42%,#eef2ff_100%)]` light, dark variant
- **Border radius**: `rounded-2xl` (cards), `rounded-3xl` (sections), `rounded-xl` (buttons)
- **Shadows**: `shadow-sm`, `shadow-lg`, `shadow-orange-200`
- **Typography**: `font-sans`, `font-black` for headings, `text-xs`/`text-sm` for body
- **Spacing**: Consistent 4px scale (`gap-2`, `p-3`, `p-5`, `space-y-4`)

### Component Patterns
- **Cards**: White/80 backdrop-blur, border slate-200, hover border-orange-300
- **Buttons**: 
  - Primary: `bg-[#EE4D2D] text-white hover:bg-orange-600`
  - Secondary: `border border-slate-200 bg-white/80 hover:border-orange-300`
  - Ghost: `text-slate-500 hover:text-slate-800`
  - Destructive: `bg-red-50 text-red-700`
- **Badges**: 
  - Platform: `bg-orange-100 text-orange-700` (Shopee), `bg-yellow-100 text-yellow-700` (ML)
  - Status: `bg-green-100 text-green-700` (Pronta), `bg-orange-100 text-orange-700` (Pendente)
  - Discount: `bg-red-100 text-red-700` (negative for discount)
- **Inputs**: `border-slate-200 bg-white/80 focus:border-orange-400 rounded-xl`
- **Switches**: Custom toggle with icon + label
- **Modals**: Centered, `max-w-lg`, backdrop blur, scrollable content
- **Toasts**: Top-right stack, auto-dismiss 3.5s, types: success/info/error

### Responsive Breakpoints
- Mobile: `< 640px` - 2 col grid, bottom nav visible
- Tablet: `640-1024px` - 2-3 col grid, sidebar collapsible
- Desktop: `> 1024px` - 3 col grid, sidebar fixed (`md:ml-72`)

### Mobile Bottom Nav (5 items)
1. Início (Home) → scroll to top
2. Produtos → scroll to products
3. Grupos → opens Groups modal
4. Config → opens Settings modal
5. Perfil → user menu

---

## 15. IMPLEMENTATION PRIORITY

### Phase 1: Core Navigation & Layout
1. Update Sidebar with all 10 sections
2. Routing for all pages
3. Floating action buttons
4. Theme toggle (dark/light persistence)

### Phase 2: Garimpar (Product Search)
1. Platform selector state
2. Search tabs component
3. Filter chips
4. Product grid with actions
5. Integration with existing Shopee API + new ML/Amazon APIs

### Phase 3: Disparar Wizard
1. 3-step wizard component
2. Step 1: Queue selection
3. Step 2: Message editor with templates + variables + preview
4. Step 3: Group selector + scheduling + safety options
5. Dispatch execution backend

### Phase 4: Queue (Fila)
1. Queue state management
2. Product cards with affiliate link copy
3. Bulk actions (select all, clear, go to dispatch)

### Phase 5: Public Pages (Páginas)
1. Page types (Vitrine/Convite/LinkTree)
2. Page builder UI
3. Public page rendering (SEO optimized)

### Phase 6: Espelhamento
1. Mirroring config modal (complex form)
2. Background worker for monitoring source groups
3. Message processing + link replacement

### Phase 7: Groups & Settings
1. Groups management with tabs
2. All 6 settings tabs with persistence
3. WhatsApp connection flow

### Phase 8: Extension & Analytics
1. Extension download page
2. Extension ingestion endpoint
3. Analytics dashboard (when ready)

---

## 16. EXISTING CODE TO LEVERAGE

Your current project already has:
- ✅ Shopee API integration (`server/services/shopee/`)
- ✅ Mercado Livre OAuth + API (`server/services/marketplace/`)
- ✅ Product types & service (`src/types/product.ts`, `src/services/productService.ts`)
- ✅ Offer generation (`src/services/offerGenerator.ts`)
- ✅ Product refresh logic (`src/services/productRefresh.ts`)
- ✅ Push notifications (`server/services/push.mjs`)
- ✅ Data store (`server/services/storage/DataStore.mjs`)
- ✅ Analytics store (`server/services/analytics/SupabaseAnalyticsStore.mjs`)
- ✅ Affiliate link providers (`server/services/marketplace/AffiliateLinkProvider.mjs`)
- ✅ Components: ProductCard, OfferPreviewModal, SettingsModal, GroupsModal, NotificationsModal, DispatchWizardModal, AnalyticsModal, MobileBottomNav, DesktopSidebar, Header, FilterTabs, Toast

### Need to Build New:
- Complete page components for each section
- DispararWizard (3-step) - extends existing DispatchWizardModal
- Garimpar page with platform tabs
- Fila page with queue management
- Páginas page with page builder
- Espelhamento page with complex modal
- MeusGrupos page with tabs
- Configuracoes page with 6 tabs
- Extensao page
- Backend routes for all new features
- WebSocket/background jobs for espelhamento monitoring
- Extension ingestion endpoint