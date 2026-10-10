# Faucet Protocol

Plataforma en desarrollo de recompensas y herramientas cripto. La autenticación, el faucet de puntos internos y las tareas verificadas funcionan al conectar Supabase; las demás secciones financieras y ofertas de proveedores continúan en vista de demostración.

## Ejecutar

Requisitos: Node.js 20.19+ o 22.12+.

```bash
npm install
npm run dev
```

Verificaciones disponibles: `npm run build` y `npm run lint`. La build genera una PWA con manifest y service worker; en desarrollo el service worker no se registra.

## Conectar Supabase

1. Crea un proyecto en Supabase y configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (o la clave legacy `VITE_SUPABASE_ANON_KEY`) en `.env.local`, usando `.env.example` como referencia. `.env.local` está ignorado por Git.
2. Ejecuta en orden `supabase/migrations/202610100001_profiles.sql`, `supabase/migrations/202610100002_daily_faucet.sql` y `supabase/migrations/202610100003_earn_tasks.sql` en el SQL Editor del proyecto. Las migraciones de recompensas activan RLS, crean la reclamación diaria y añaden tareas verificadas en el servidor.
3. En Supabase, habilita el proveedor Email en **Authentication → Providers** y configura las URLs de sitio/redirección para el origen local (`http://localhost:5173`) y el dominio de producción.
4. Reinicia Vite. El indicador del pie de página consulta `profiles` y distingue conexión, migración pendiente y credenciales sin configurar.

Para conectar wallets móviles mediante QR, crea un proyecto en Reown Cloud y añade `VITE_WALLETCONNECT_PROJECT_ID` a `.env.local` y a las variables de Vercel. Es un identificador público de la aplicación (`config`), no una contraseña; vuelve a desplegar tras guardarlo. MetaMask, Coinbase Wallet y proveedores EVM inyectados no requieren este ID.

El cliente está en `src/lib/supabase.ts`. La home ya ofrece registro con email/contraseña, login, restablecimiento/cambio de contraseña, persistencia de sesión y cierre de sesión. Si el proveedor Email exige confirmación, el registro informa que debe confirmarse desde el correo. Solo se admite la clave pública publishable/anon en Vite; **nunca** pongas la `service_role` key en variables `VITE_*` ni en el navegador.

## Estado del producto

- **Home:** portada de producto con accesos a wallet, Earn/faucets, juegos, mercados, anuncios y cuenta. Las áreas sin integración se identifican como demostración y no mueven fondos.
- **Dashboard (`/dashboard`):** navegación por Resumen, Mercados, Cartera, depósitos, retiros, transferencias, exchange, historial, direcciones, Faucets, Offerwalls, Shortlinks, PTC, Juegos, Lotería, Staking, Afiliados, campañas, listings patrocinados, API, Perfil, Seguridad y Ajustes; incluye además Social-Fi. Login exitoso abre esta ruta. Las opciones muestran previews/demo hasta conectar los servicios correspondientes.
- **Seguridad de cuenta:** el usuario puede registrar una app autenticadora TOTP desde Seguridad; el dashboard solicita el código en los inicios de sesión posteriores cuando Supabase eleva el nivel de autenticación a AAL2. Los códigos y secretos no se guardan en las tablas públicas de la aplicación.
- **Cartera e historial de puntos:** Cartera presenta el saldo promocional real de Supabase separado de las monedas demo; Historial muestra las acreditaciones del ledger de recompensas con fecha, origen y balance posterior.
- **Recompensas y tareas internas:** con Supabase y sesión iniciada, cada usuario puede reclamar 10 puntos cada 24 horas y una recompensa única de 25 puntos por verificar el correo y completar su nombre visible. El servidor valida los requisitos y acredita los puntos en la misma transacción que registra la tarea y una entrada de ledger inmutable. RLS limita la lectura al propietario; las tablas no permiten acreditar ni editar recompensas desde el navegador. Los puntos no son criptoactivos, no tienen valor monetario y no se pueden retirar ni transferir.
- **Datos reales de mercado:** mini-gráfico BTC/USDT y cotizaciones BTC, ETH, SOL y DOGE vía Binance Spot. El explorador completo de pares permanece en `src/MarketExplorer.tsx`, pero no está conectado a la home.
- **Pendiente para producción completa:** recuperación robusta de MFA, proveedor de offerwall/encuestas y PTC con callbacks firmados, ledger de doble entrada para activos, custodia, depósitos/retiros, wallet connect para uso de fondos, swap, juegos con dinero, moderación/antifraude, monitorización y operaciones de backend. Las ofertas de muestra actuales no acreditan recompensa real.
- **Límite de seguridad:** no conectar fondos reales a esta UI. Antes hacen falta servicios, revisión legal, auditorías, controles operativos y conciliación.

La home consulta endpoints públicos de Binance Spot (`/api/v3/ticker/24hr`, `/api/v3/klines`) y su WebSocket de velas. Los precios se refrescan cada 30 segundos; si el stream falla, el gráfico usa sondeo REST cada 15 segundos. El explorador separado carga los pares públicos y permite filtros. Las APIs pueden limitar tráfico o no estar disponibles en ciertas regiones. Para producción, mover estas consultas a un adaptador backend con caché, límites, monitorización y proveedor alternativo; validar los términos del proveedor.

## Arquitectura objetivo

| Dominio | Tecnología y responsabilidad |
|---|---|
| Cliente | Next.js/React + TypeScript; PWA, panel responsive y rutas autenticadas. La demo actual usa Vite para iterar el frontend sin fingir SSR ni servicios. |
| API | NestJS modular; REST versionado para comandos/consultas y WebSocket para cotizaciones y notificaciones. OpenAPI como contrato. |
| Identidad | Email/passkeys y 2FA; OIDC opcional. WalletConnect para EVM y adaptador separado para Solana. Abstracción de cuentas por cadena/proveedor. |
| Ledger | PostgreSQL; doble entrada append-only, transacciones ACID, idempotencia, cuentas disponibles/pendientes/reservadas y conciliación. Nunca usar `float` para importes. |
| Procesamiento | Redis para caché y rate limiting; Kafka/RabbitMQ para callbacks, retiros y eventos. Outbox transaccional para no perder eventos. |
| Analítica | ClickHouse/warehouse aislado del OLTP para cohortes, ROI, campañas y fraude. |
| Custodia | Proveedor institucional o MPC/HSM con políticas de firma, límites, allowlists y aprobación reforzada. Claves fuera de la aplicación y de PostgreSQL. |
| Web3 | Contratos Solidity en una red EVM inicial. Añadir Solana solo con un caso validado. Auditoría independiente antes de custodiar o distribuir activos. |
| Operación | Infraestructura como código, secretos en KMS, métricas/trazas con OpenTelemetry, alertas y runbooks de incidentes. |

Mantener un **monolito modular** inicialmente. Separar workers o servicios cuando el volumen, aislamiento de riesgo o equipos lo justifiquen. Adaptadores desacoplados para custodios, redes, precios, proveedores Earn, ad networks y protocolos DeFi.

### Dominios de aplicación

`Identity`, `Accounts/Ledger`, `Custody`, `Earn`, `Ads`, `Swap`, `Games`, `Risk`, `Rewards/Social`, `Developer API` y `Notifications`. Los comandos financieros deben validar límites y riesgo, registrar asientos atómicos y publicar eventos mediante outbox.

### Modelo de datos inicial

```mermaid
erDiagram
  USER ||--o{ CREDENTIAL : authenticates
  USER ||--o{ WALLET : links
  USER ||--o{ ACCOUNT : owns
  ASSET ||--o{ ACCOUNT : denominates
  ACCOUNT ||--o{ LEDGER_POSTING : posts
  JOURNAL_ENTRY ||--|{ LEDGER_POSTING : contains
  USER ||--o{ TRANSACTION : requests
  TRANSACTION ||--o{ JOURNAL_ENTRY : settles
  USER ||--o{ OFFER_COMPLETION : earns
  OFFER ||--o{ OFFER_COMPLETION : fulfills
  OFFER_PROVIDER ||--o{ OFFER : supplies
  USER ||--o{ GAME_BET : places
  GAME_ROUND ||--o{ GAME_BET : includes
  GAME_ROUND ||--|| FAIRNESS_PROOF : proves
  USER ||--o{ STAKING_POSITION : opts_in
  YIELD_STRATEGY ||--o{ STAKING_POSITION : allocates
  USER ||--o{ XP_EVENT : progresses
  SEASON ||--o{ XP_EVENT : scores
  CLAN ||--o{ CLAN_MEMBERSHIP : groups
  USER ||--o{ CLAN_MEMBERSHIP : joins
```

Entidades mínimas: `User`, `Credential`, `Wallet`, `Asset(chain, contract, decimals)`, `Account(user, asset, purpose)`, `JournalEntry`, `LedgerPosting(account, side, amount_minor)`, `Transaction`, `WithdrawalRequest`, `Offer`, `OfferProvider`, `OfferCompletion`, `AdCampaign`, `Impression/Click/Conversion`, `GameRound`, `GameBet`, `FairnessProof`, `SwapQuote/Execution`, `YieldStrategy`, `StakingPosition`, `XPEvent`, `Season`, `Clan`, `ClanMembership`, `RiskEvent`, `ReviewCase` y `AuditLog`.

Invariantes: importes en unidades mínimas enteras; asiento balanceado por activo; claves idempotentes únicas por operación/proveedor; callbacks firmados y deduplicados; ledger inmutable con reversos compensatorios; separar saldo disponible, retenido y pendiente; registrar hash/red/proveedor y estados auditables. Datos de identidad separados de señales antifraude, con retención limitada y acceso mínimo.

## Modelo de negocio y token

Ingresos principales: comisión neta de proveedores Earn, margen explícito de la red publicitaria, tarifas transparentes de swap, planes B2B/API y funciones premium. No basar la economía en pérdidas de jugadores, emisión perpetua o rendimiento prometido.

Utilidades candidatas del token: descuento verificable en tarifas, herramientas premium para anunciantes/desarrolladores y recompensas de temporada limitadas por presupuesto. No debe ser obligatorio para depositar o retirar. Evitar prometer “dividendos”: compartir ingresos con holders puede convertirlo en valor regulado según jurisdicción.

Política deflacionaria, condicionada a revisión legal y de mercado:

1. Publicar suministro, asignaciones, vesting, tesorería, emisiones, quemas y obligaciones. Recompensas financiadas por ingresos netos realizados, con límites por temporada.
2. Destinar, por ejemplo, hasta el 20% de **comisiones netas cobradas** de anuncios y swaps a recompras/quema trimestral, sujeto a solvencia, liquidez y aprobación de gobernanza. Es un parámetro de diseño para probar, no una promesa de precio.
3. En juegos, cobrar solo una tarifa de servicio explícita y legal; separar apuestas, premios y comisiones. Nunca financiar la quema con fondos del jugador ni incentivar pérdidas.
4. El staking DeFi es opt-in, con protocolos, redes, comisiones, liquidez y riesgos divulgados. Mostrar tasas históricas, nunca garantizadas; mantener reservas para pasivos y no invertir automáticamente micropagos.

## Roadmap y puertas de salida

### Fase 1 · MVP

Ledger y conciliación; autenticación segura; un custodio y pocas redes/activos; depósitos/retiros con límites; catálogo Earn con un proveedor, callbacks idempotentes y panel de soporte. Añadir referidos limitados, historial, estado de operaciones y analítica básica. Sin token, casino real ni yield.

**Gate:** conciliación diaria sin diferencias, retiros reproducibles, callbacks idempotentes, plan de incidentes probado, fraude dentro del presupuesto y coste por usuario retenido medido.

### Fase 2 · Ecosistema

Integrar proveedores adicionales, PTC/ad network, campañas y API de pagos con sandbox, scopes, rotación de claves, cuotas y webhooks firmados. Lanzar XP, pase gratuito y gremios con recompensas presupuestadas; dashboard de actividad y ROI de referidos. Activar swap solo con cotizaciones, liquidez y slippage auditables. Riesgo primero por reglas explicables; ML en modo sombra antes de influir en bloqueos.

**Gate:** margen de contribución positivo por cohorte, soporte y moderación escalables, controles de tráfico inválido, políticas de privacidad y acuerdos con proveedores revisados.

### Fase 3 · Web3

WalletConnect/smart accounts, contratos auditados, prueba de reservas y pasivos con metodología publicada, estrategia DeFi opt-in limitada y gobernanza gradual. Provably fair con algoritmo y pruebas verificables. Dinero real en juegos solo con licencias, controles de edad, geobloqueo, límites y juego responsable. La prueba de reservas aislada no demuestra solvencia.

## Go-to-market

1. Empezar en comunidades de faucets y micro-recompensas de una o dos redes de bajo coste. Lanzar cohortes por invitación y comunicar límites, comisiones y tiempos de retiro.
2. Alcanzar los primeros 10.000 con creadores y comunidades, guías comparativas y referidos pagados por actividad válida, no por registro/clic. Medir activación, retención D7/D30, coste por usuario retenido y margen por cohorte.
3. Captar operadores con API/sandbox, importación asistida, atribución, pagos automáticos, panel antifraude y reparto de ingresos transparente. Pilotos temporales sin exclusividad; migración siempre voluntaria.
4. Publicar página de estado, incidentes, reglas de ofertas, pruebas de fairness, reservas/metodología y soporte. No extraer listas de usuarios ni anunciar “sin comisiones” si el coste se recupera por otra vía.

## Seguridad y cumplimiento

Custodia, transmisión de dinero, KYC/AML, privacidad, token, publicidad y juego dependen de la jurisdicción. Obtener asesoría antes de habilitar cada flujo. No usar VPN como criterio único de bloqueo: combinar señales explicables, revisión humana y apelación. Aplicar controles de edad/territorio cuando correspondan, minimización de datos, límites de retiro, sanciones de proveedores y auditorías de contratos.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
