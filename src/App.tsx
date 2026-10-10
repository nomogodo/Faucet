import { lazy, Suspense, useEffect, useState } from 'react'
import HomePage from './HomePage'
import { supabase } from './lib/supabase'
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell, Blocks, CandlestickChart, Check,
  ChevronDown, Clock3, Code2, Coins, Eye, EyeOff, Flame, Gamepad2, Gift, Grid2X2,
  HandCoins, History, Link2, Megaphone, Menu, MousePointerClick, Plus, Search,
  Settings, ShieldCheck, Sparkles, Ticket, TrendingUp, Trophy, UserRound, Users, WalletCards,
  X, Zap,
} from 'lucide-react'
import './App.css'

type NavItem = { label: string; icon: typeof Grid2X2 }
const PortfolioChart = lazy(() => import('./PortfolioChart'))
const MarketExplorer = lazy(() => import('./MarketExplorer'))

const dashboardNav: { group: string; items: NavItem[] }[] = [
  { group: 'GENERAL', items: [{ label: 'Resumen', icon: Grid2X2 }, { label: 'Mercados', icon: CandlestickChart }] },
  { group: 'WALLET', items: [
    { label: 'Cartera', icon: WalletCards }, { label: 'Depositar', icon: ArrowDownLeft },
    { label: 'Retirar', icon: ArrowUpRight }, { label: 'Transferir', icon: ArrowRight },
    { label: 'Exchange', icon: ArrowLeftRight }, { label: 'Historial', icon: History },
    { label: 'Direcciones', icon: Link2 },
  ] },
  { group: 'GANAR', items: [
    { label: 'Faucets', icon: Coins }, { label: 'Offerwalls', icon: HandCoins },
    { label: 'Shortlinks', icon: Link2 }, { label: 'PTC', icon: MousePointerClick },
  ] },
  { group: 'JUEGOS', items: [{ label: 'Juegos', icon: Gamepad2 }, { label: 'Lotería', icon: Ticket }] },
  { group: 'CRECER', items: [
    { label: 'Staking', icon: Flame }, { label: 'Afiliados', icon: Users },
    { label: 'Anunciar', icon: Megaphone }, { label: 'Campañas', icon: Activity },
    { label: 'Listings patrocinados', icon: Sparkles },
  ] },
  { group: 'SOCIAL', items: [{ label: 'Temporada', icon: Trophy }, { label: 'Gremio', icon: Blocks }] },
  { group: 'DESARROLLADORES', items: [{ label: 'API', icon: Code2 }] },
  { group: 'CUENTA', items: [
    { label: 'Perfil', icon: UserRound }, { label: 'Seguridad', icon: ShieldCheck },
    { label: 'Ajustes', icon: Settings },
  ] },
]
const chartSets = {
  '1D': [{ time: '00:00', value: 3200 }, { time: '04:00', value: 3460 }, { time: '08:00', value: 3370 }, { time: '12:00', value: 3720 }, { time: '16:00', value: 3590 }, { time: '20:00', value: 3940 }, { time: 'Ahora', value: 4182 }],
  '1S': [{ time: 'Lun', value: 2870 }, { time: 'Mar', value: 3140 }, { time: 'Mié', value: 3020 }, { time: 'Jue', value: 3490 }, { time: 'Vie', value: 3340 }, { time: 'Sáb', value: 3810 }, { time: 'Dom', value: 4182 }],
  '1M': [{ time: '01', value: 2460 }, { time: '05', value: 2980 }, { time: '10', value: 2710 }, { time: '15', value: 3420 }, { time: '20', value: 3260 }, { time: '25', value: 3890 }, { time: '30', value: 4182 }],
  '1A': [{ time: 'Ene', value: 1900 }, { time: 'Feb', value: 2250 }, { time: 'Mar', value: 2140 }, { time: 'Abr', value: 2740 }, { time: 'May', value: 2980 }, { time: 'Jun', value: 3670 }, { time: 'Jul', value: 4182 }],
}
const assets = [
  { ticker: 'BTC', name: 'Bitcoin', amount: '0.02481', value: '$1,642.80', change: '+2.41%', icon: '₿', color: 'bitcoin' },
  { ticker: 'ETH', name: 'Ethereum', amount: '0.4820', value: '$1,384.26', change: '+1.82%', icon: 'Ξ', color: 'ethereum' },
  { ticker: 'USDT', name: 'Tether', amount: '842.50', value: '$842.50', change: '0.01%', icon: '₮', color: 'tether' },
  { ticker: 'SOL', name: 'Solana', amount: '2.184', value: '$312.64', change: '+5.68%', icon: '◎', color: 'solana' },
]
const earnItems = [
  { name: 'SurveyTime', detail: 'Encuestas · 4–8 min', reward: '$0.42', tag: 'Rápida', icon: 'ST', tone: 'coral', category: 'Encuestas' },
  { name: 'PixelPoint', detail: 'Completa una oferta', reward: '$1.85', tag: 'Popular', icon: 'P', tone: 'lime', category: 'Offerwall' },
  { name: 'Daily Faucet', detail: 'Recompensa diaria', reward: '$0.03', tag: '1 min', icon: '◉', tone: 'blue', category: 'Faucets' },
  { name: 'ClickBoost', detail: 'Anuncio patrocinado · 30 s', reward: '$0.02', tag: '30 s', icon: '↗', tone: 'coral', category: 'PTC' },
  { name: 'LinkSprint', detail: 'Shortlink · 2 pasos', reward: '$0.06', tag: '2 min', icon: 'L', tone: 'blue', category: 'Shortlinks' },
]
const heatmap = [
  0, 1, 2, 0, 3, 2, 1, 0, 1, 3, 2, 1, 0, 2, 3, 1, 0, 2, 1, 3, 3, 2, 1, 0, 1, 2, 3, 2,
  1, 0, 2, 3, 1, 0, 2, 2, 3, 1, 0, 1, 2, 3, 2, 1, 0, 3, 2, 1, 2, 3, 1, 0, 2, 1, 3, 2,
  0, 1, 2, 3, 2, 1, 0, 2, 3, 1, 2, 3, 1, 0, 2, 2, 3, 1, 0, 1, 2, 3, 2, 1, 0, 2, 3, 1,
  1, 2, 3, 0, 1, 2, 3, 2, 1, 0, 2, 3, 1, 2, 3, 1, 0, 1, 2, 3, 2, 1, 3, 2, 0, 1, 2, 3,
]
const sectionCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  Cartera: { eyebrow: 'WALLET', title: 'Tu cartera cripto.', description: 'Consulta tus balances, direcciones y movimientos de activos desde un solo lugar.' },
  Depositar: { eyebrow: 'WALLET · ENTRADA', title: 'Depositar cripto.', description: 'Elige un activo y consulta la dirección de depósito y sus confirmaciones.' },
  Retirar: { eyebrow: 'WALLET · SALIDA', title: 'Retirar fondos.', description: 'Envía activos a una dirección externa con una revisión clara de red y comisión.' },
  Transferir: { eyebrow: 'WALLET · INTERNO', title: 'Transferir a un usuario.', description: 'Envía saldo a otra cuenta FaucetPay mediante transferencia interna.' },
  Exchange: { eyebrow: 'CONVERSIÓN', title: 'Exchange de criptomonedas.', description: 'Consulta los pares disponibles, el tipo de cambio y el coste antes de convertir.' },
  Historial: { eyebrow: 'ACTIVIDAD', title: 'Historial de transacciones.', description: 'Depósitos, retiros, transferencias, pagos y conversiones en orden cronológico.' },
  Direcciones: { eyebrow: 'WALLET · DIRECCIONES', title: 'Direcciones de depósito.', description: 'Gestiona las direcciones asociadas a tus activos y redes.' },
  Faucets: { eyebrow: 'GANAR · FAUCETS', title: 'Directorio de faucets.', description: 'Encuentra sitios de recompensas, consulta monedas admitidas y pagos reportados.' },
  Offerwalls: { eyebrow: 'GANAR · OFFERWALLS', title: 'Ofertas y encuestas.', description: 'Explora tareas de proveedores, requisitos y recompensas estimadas.' },
  Shortlinks: { eyebrow: 'GANAR · SHORTLINKS', title: 'Shortlinks disponibles.', description: 'Completa enlaces patrocinados y revisa el estado de tus recompensas.' },
  PTC: { eyebrow: 'GANAR · PUBLICIDAD', title: 'Paid-to-click.', description: 'Ve anuncios patrocinados y consulta la recompensa indicada por visita.' },
  Juegos: { eyebrow: 'JUEGOS · PROVABLY FAIR', title: 'Juegos originales.', description: 'Explora Dice, Crash, Plinko, Mines, Ruleta y más juegos verificables.' },
  Lotería: { eyebrow: 'JUEGOS · SORTEOS', title: 'Loterías y sorteos.', description: 'Consulta sorteos activos, entradas y resultados publicados.' },
  Staking: { eyebrow: 'FEY · STAKING', title: 'Staking y ventajas.', description: 'Consulta posiciones, periodos y beneficios disponibles para FEY.' },
  Afiliados: { eyebrow: 'AFILIADOS', title: 'Invita y gana.', description: 'Consulta tu enlace, actividad de referidos y comisiones elegibles.' },
  Anunciar: { eyebrow: 'PUBLICIDAD', title: 'Llega a usuarios cripto.', description: 'Crea campañas PTC, listings patrocinados y anuncios para la red.' },
  Campañas: { eyebrow: 'PUBLICIDAD · CAMPAÑAS', title: 'Gestiona tus campañas.', description: 'Consulta presupuesto, impresiones, clics y estado de tus anuncios.' },
  'Listings patrocinados': { eyebrow: 'PUBLICIDAD · DIRECTORIO', title: 'Promociona tu faucet.', description: 'Destaca un sitio en el directorio y consulta el alcance de la publicación.' },
  API: { eyebrow: 'DESARROLLADORES', title: 'API y pagos para sitios.', description: 'Integra pagos, callbacks y verificación desde tus aplicaciones.' },
  Perfil: { eyebrow: 'CUENTA', title: 'Tu perfil.', description: 'Administra identidad pública, correo y preferencias de cuenta.' },
  Seguridad: { eyebrow: 'CUENTA · SEGURIDAD', title: 'Protege tu cuenta.', description: 'Revisa autenticación, sesiones, 2FA y opciones de recuperación.' },
  Ajustes: { eyebrow: 'CUENTA · PREFERENCIAS', title: 'Ajustes de cuenta.', description: 'Configura idioma, notificaciones y preferencias de visualización.' },
  Mercados: { eyebrow: 'MERCADOS SPOT', title: 'Mercados cripto', description: 'Precios y velas de mercado en vivo desde Binance Spot.' },
  Earn: { eyebrow: 'CENTRO DE RECOMPENSAS', title: 'Gana a tu ritmo.', description: 'Encuestas, faucets y tareas verificadas. Recompensas estimadas, sin promesas de rentabilidad.' },
  Swap: { eyebrow: 'CONVERSIÓN', title: 'Un activo. Otro activo.', description: 'Consulta una cotización de demostración. Las operaciones reales todavía no están habilitadas.' },
  Arcade: { eyebrow: 'JUEGO RESPONSABLE', title: 'Juega por diversión.', description: 'Esta vista previa no acepta apuestas ni distribuye premios. Los juegos con valor real requieren disponibilidad legal.' },
  Anuncios: { eyebrow: 'AD NETWORK', title: 'Tu audiencia, con intención.', description: 'Explora formatos y una estimación de campaña en modo demo.' },
  Temporada: { eyebrow: 'SEASON 04 · JULIO', title: 'Sube de nivel.', description: 'Progreso de muestra. Las misiones y recompensas reales se configurarán al conectar el backend.' },
  Gremio: { eyebrow: 'SOCIAL FI', title: 'Mejor en equipo.', description: 'Únete a un gremio de demostración y mira el progreso colectivo.' },
  Desarrolladores: { eyebrow: 'FAUCET PROTOCOL', title: 'Integra pagos sin fricción.', description: 'El portal de desarrolladores está en vista previa. Las claves y endpoints aún no están conectados.' },
}

export function DashboardPrototype() {
  const [activePage, setActivePage] = useState('Resumen')
  const [period, setPeriod] = useState<keyof typeof chartSets>('1S')
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [modal, setModal] = useState('')
  const [toast, setToast] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [earnFilter, setEarnFilter] = useState('Para ti')
  const [search, setSearch] = useState('')
  const [accountEmail, setAccountEmail] = useState('alex@example.com')

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session?.user.email) setAccountEmail(data.session.user.email)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session?.user.email) setAccountEmail(session.user.email)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }
  const selectPage = (label: string) => { setActivePage(label); setMobileMenuOpen(false) }
  const openAction = (action: string) => setModal(action)
  const signOut = async () => {
    if (!supabase) return notify('Supabase no está configurado.')
    const { error } = await supabase.auth.signOut()
    if (error) return notify('No se pudo cerrar la sesión.')
    window.location.replace('/?login=1')
  }
  const isOverview = activePage === 'Resumen'
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#inicio" onClick={() => selectPage('Resumen')} aria-label="Faucet, inicio">
          <span className="brand-mark"><span /></span><span className="brand-word">faucet<span className="brand-period">.</span></span><span className="brand-beta">BETA</span>
        </a>
        <button className="workspace-switch" onClick={() => notify('Espacio personal · modo demo')}>
          <span className="workspace-avatar">M</span><span className="workspace-copy"><strong>Mi espacio</strong><small>Cuenta personal</small></span><ChevronDown size={15} />
        </button>
        <nav className="side-nav" aria-label="Navegación del dashboard">
          {dashboardNav.map((group) => <div className="nav-group" key={group.group}>
            <span className="nav-caption">{group.group}</span>
            {group.items.map(({ label, icon: Icon }) => <button key={label} className={`nav-link ${activePage === label ? 'nav-link-active' : ''}`} onClick={() => selectPage(label)}><Icon size={16} strokeWidth={1.8} /><span>{label}</span>{label === 'Faucets' && <span className="nav-count">12</span>}</button>)}
          </div>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="safety-card"><div className="safety-icon"><ShieldCheck size={16} /></div><div><strong>Cuenta protegida</strong><small>2FA activado</small></div><span className="status-dot" /></div>
          <button className="profile-row" onClick={() => void signOut()}><span className="profile-avatar">{accountEmail.slice(0, 2).toUpperCase()}</span><span className="profile-copy"><strong>{accountEmail}</strong><small>{supabase ? 'Cerrar sesión' : 'Cuenta demo'}</small></span><ChevronDown size={15} /></button>
        </div>
      </aside>

      {mobileMenuOpen && <button className="mobile-backdrop" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-trigger" aria-label="Abrir menú" onClick={() => setMobileMenuOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <label className="search-field"><Search size={16} /><input aria-label="Buscar" placeholder="Buscar..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" aria-label="Notificaciones" onClick={() => notify('No tienes notificaciones nuevas')}><Bell size={17} /><i /></button>
            <button className="connect-button" onClick={() => openAction('Conectar wallet')}><span className="connect-indicator" />Conectar wallet</button>
          </div>
        </header>
        <div className="page-content">
          {isOverview ? <>
            <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> TU CENTRO FINANCIERO <span className="demo-tag">DEMO</span></div><h1>Buenos días, Alex <span className="wave">✳</span></h1><p className="welcome-subtitle">Tu actividad cripto, en un solo lugar.</p></div><button className="date-select" onClick={() => notify('Mostrando los últimos 7 días')}><Clock3 size={15} />Últimos 7 días<ChevronDown size={14} /></button></section>

            <section className="hero-grid">
              <div className="balance-panel">
                <div className="balance-topline"><span>VALOR TOTAL DEL PORTAFOLIO</span><button className="subtle-icon" aria-label={balanceVisible ? 'Ocultar saldo' : 'Mostrar saldo'} onClick={() => setBalanceVisible(!balanceVisible)}>{balanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button></div>
                <div className="balance-line"><strong>{balanceVisible ? '$4,182.20' : '••••••••'}</strong><span className="balance-currency">USD</span></div>
                <div className="balance-change"><span><TrendingUp size={14} /> +$284.65</span><span>+7.3% esta semana</span><span className="change-divider" /><span className="balance-note">estimación · demo</span></div>
                <div className="balance-chart" aria-label="Gráfico ilustrativo del valor del portafolio"><Suspense fallback={<div className="chart-loading" aria-hidden="true" />}><PortfolioChart data={chartSets[period]} /></Suspense></div>
                <div className="chart-periods" role="group" aria-label="Periodo del gráfico">{(Object.keys(chartSets) as Array<keyof typeof chartSets>).map((item) => <button key={item} className={period === item ? 'period-active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div>
                <div className="balance-actions"><button className="action-primary" onClick={() => openAction('Depositar')}><ArrowDownLeft size={16} />Depositar</button><button className="action-secondary" onClick={() => openAction('Retirar')}><ArrowUpRight size={16} />Retirar</button><button className="action-secondary" onClick={() => selectPage('Swap')}><ArrowLeftRight size={16} />Swap</button><button className="action-more" aria-label="Más opciones" onClick={() => openAction('Más opciones')}><Plus size={18} /></button></div>
              </div>
              <div className="earn-panel">
                <div className="panel-heading"><div><span className="section-kicker">OPORTUNIDADES</span><h2>Earn hoy</h2></div><button className="text-link" onClick={() => selectPage('Earn')}>Ver todas <ArrowRight size={14} /></button></div>
                <div className="earn-total"><span>Recompensas disponibles</span><strong>$8.40 <small>USD</small></strong></div><div className="earn-progress"><span style={{ width: '62%' }} /></div><div className="earn-progress-label"><span>Meta semanal</span><strong>$31.20 <em>/ $50</em></strong></div>
                <div className="earn-list">{earnItems.map((item) => <button className="earn-row" key={item.name} onClick={() => openAction(`Oferta: ${item.name}`)}><span className={`earn-brand ${item.tone}`}>{item.icon}</span><span className="earn-info"><strong>{item.name}</strong><small>{item.detail}</small></span><span className="earn-reward">{item.reward}<small>{item.tag}</small></span><ArrowRight className="earn-arrow" size={14} /></button>)}</div>
                <button className="earn-cta" onClick={() => selectPage('Earn')}><Sparkles size={15} />Explorar oportunidades <ArrowRight size={15} /></button>
              </div>
            </section>

            <section className="portfolio-section"><div className="section-header"><div><span className="section-kicker">TUS ACTIVOS</span><h2>Portafolio</h2></div><button className="view-all" onClick={() => notify('Vista demo: 4 activos')}>Ver activos <ArrowRight size={14} /></button></div><div className="asset-table"><div className="asset-head"><span>ACTIVO</span><span>PRECIO</span><span>BALANCE</span><span>CAMBIO 24H</span><span /></div>{assets.map((asset, index) => <button key={asset.ticker} className="asset-row" onClick={() => notify(`${asset.name} · balance de demostración`)}><span className="asset-name"><span className={`coin-icon ${asset.color}`}>{asset.icon}</span><span><strong>{asset.ticker}</strong><small>{asset.name}</small></span></span><span className="asset-price">{['$66,219.04', '$2,872.12', '$1.00', '$143.15'][index]}</span><span className="asset-balance"><strong>{asset.amount} <small>{asset.ticker}</small></strong><em>{balanceVisible ? asset.value : '••••••'}</em></span><span className={`asset-change ${asset.change.startsWith('+') ? 'positive' : ''}`}>{asset.change}</span><ArrowRight className="asset-arrow" size={15} /></button>)}</div></section>

            <section className="bottom-grid">
              <div className="activity-panel"><div className="section-header"><div><span className="section-kicker">TU ACTIVIDAD</span><h2>Ritmo de ganancias</h2></div><span className="activity-total"><span /> 18 días activos</span></div><div className="heatmap-wrap"><div className="heatmap-months"><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span><span>Jul</span></div><div className="heatmap-grid">{heatmap.map((level, index) => <span key={index} className={`heat-cell heat-${level}`} title={`${level + 1} actividad${level ? 'es' : ''}`} />)}</div></div><div className="heatmap-legend"><span>Menos</span><i className="heat-0" /><i className="heat-1" /><i className="heat-2" /><i className="heat-3" /><span>Más</span><span className="heatmap-total">$126.84 ganados este mes</span></div></div>
              <div className="season-panel"><div className="season-top"><span className="season-icon"><Trophy size={17} /></span><span className="season-live"><i /> TEMPORADA 04</span><button className="subtle-icon" aria-label="Más sobre temporada" onClick={() => selectPage('Temporada')}><ArrowUpRight size={15} /></button></div><div className="season-title"><div><span className="section-kicker">PASE DE BATALLA</span><h2>Ruta del explorador</h2></div><span className="season-level">LVL 08</span></div><div className="season-progress"><span style={{ width: '68%' }} /></div><div className="season-progress-copy"><span>680 / 1,000 XP</span><span>Siguiente: <strong>+25 Sats</strong></span></div><button className="season-button" onClick={() => selectPage('Temporada')}>Ver misiones <ArrowRight size={15} /></button></div>
            </section>

            <section className="clan-strip"><div className="clan-symbol"><Blocks size={19} /></div><div className="clan-copy"><span className="section-kicker">TU GREMIO</span><strong>Night Owls <span>· #14 global</span></strong></div><div className="clan-members"><span className="mini-avatar mini-a">J</span><span className="mini-avatar mini-b">K</span><span className="mini-avatar mini-c">S</span><span className="mini-avatar mini-more">+8</span></div><div className="clan-stat"><span>XP del gremio</span><strong>24,680 <small>/ 30,000</small></strong></div><button className="clan-open" aria-label="Abrir gremio" onClick={() => selectPage('Gremio')}><ArrowRight size={16} /></button></section>
            <footer className="page-footer"><span>© 2025 Faucet Protocol <i className="footer-dot" /> Vista previa del producto</span><span><button onClick={() => notify('Centro de ayuda demo')}>Ayuda</button><button onClick={() => notify('Estado: entorno de demostración')}>Estado del sistema <i className="status-dot" /></button></span></footer>
          </> : activePage === 'Mercados' ? <Suspense fallback={<div className="market-loading-page"><span className="live-dot" />Conectando con Binance Spot...</div>}><MarketExplorer search={search} /></Suspense> : <SectionView page={activePage} onAction={openAction} onNavigate={selectPage} search={search} earnFilter={earnFilter} setEarnFilter={setEarnFilter} />}
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Navegación móvil">{['Resumen', 'Cartera', 'Faucets', 'Juegos'].map((label) => { const Icon = dashboardNav.flatMap((group) => group.items).find((item) => item.label === label)?.icon ?? Grid2X2; return <button key={label} className={activePage === label ? 'mobile-nav-active' : ''} onClick={() => selectPage(label)}><Icon size={19} /><span>{label}</span></button> })}</nav>
      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal('') }}><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Cerrar" onClick={() => setModal('')}><X size={18} /></button><span className="modal-mark"><ShieldCheck size={20} /></span><span className="section-kicker">ENTORNO DE DEMOSTRACIÓN</span><h2 id="modal-title">{modal}</h2><p>Esta acción todavía no está conectada a una wallet ni a servicios financieros. No se realizará ninguna transacción.</p><div className="modal-note"><span className="status-dot" />Tus fondos no están en riesgo en esta vista previa.</div><button className="modal-primary" onClick={() => { setModal(''); notify('Vista previa: acción no ejecutada') }}>Entendido <Check size={16} /></button></section></div>}
      <div className={`toast ${toast ? 'toast-visible' : ''}`} role="status" aria-live="polite"><Check size={15} />{toast}</div>
    </div>
  )
}

function SectionView({ page, onAction, onNavigate, search, earnFilter, setEarnFilter }: {
  page: string; onAction: (action: string) => void; onNavigate: (page: string) => void
  search: string; earnFilter: string; setEarnFilter: (filter: string) => void
}) {
  const copy = sectionCopy[page] ?? sectionCopy.Earn
  const selectedEarnFilter = page === 'Faucets' ? 'Faucets'
    : page === 'Offerwalls' ? 'Offerwalls'
      : page === 'Shortlinks' ? 'Shortlinks'
        : page === 'PTC' ? 'PTC' : earnFilter
  const filteredOffers = earnItems.filter((item) => {
    const matchesSearch = `${item.name} ${item.detail}`.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedEarnFilter === 'Para ti' || item.category === selectedEarnFilter || (selectedEarnFilter === 'Offerwalls' && item.category === 'Offerwall')
    return matchesSearch && matchesCategory
  })
  return <section className="section-view">
    <div className="section-view-heading"><div><div className="eyebrow"><span className="live-dot" /> {copy.eyebrow} <span className="demo-tag">DEMO</span></div><h1>{copy.title}</h1><p>{copy.description}</p></div><button className="date-select" onClick={() => onNavigate('Resumen')}><Grid2X2 size={15} />Volver al resumen</button></div>
    {page === 'Earn' || ['Faucets', 'Offerwalls', 'Shortlinks', 'PTC'].includes(page) ? <>
      <div className="earn-feature"><div className="earn-feature-icon"><Zap size={22} /></div><div><span className="section-kicker">RECOMPENSAS SEMANALES</span><h2>Hay nuevas formas de ganar.</h2><p>Completa tareas de proveedores asociados. Revisa siempre las condiciones antes de participar.</p></div><div className="earn-feature-amount"><span>Hasta</span><strong>$4.20</strong><small>estimado · demo</small></div></div>
      <div className="filter-tabs">{['Para ti', 'Encuestas', 'Faucets', 'Offerwalls', 'Shortlinks', 'PTC'].map((filter) => <button key={filter} className={selectedEarnFilter === filter ? 'filter-active' : ''} onClick={() => setEarnFilter(filter)}>{filter}</button>)}</div>
      <div className="section-offers">{filteredOffers.length ? filteredOffers.map((item) => <button className="offer-card" key={item.name} onClick={() => onAction(`Oferta: ${item.name}`)}><span className={`earn-brand ${item.tone}`}>{item.icon}</span><div><strong>{item.name}</strong><small>{item.detail}</small></div><span className="offer-tag">{item.tag}</span><strong className="offer-reward">{item.reward}</strong><ArrowRight size={16} /></button>) : <p className="empty-search">No encontramos ofertas para “{search}”.</p>}</div>
      <div className="notice-line"><ShieldCheck size={16} /><span>Las ofertas las gestionan proveedores externos. Faucet no garantiza aprobación ni recompensa.</span></div>
    </> : page === 'Swap' || page === 'Exchange' ? <div className="swap-demo"><div className="swap-field"><span>DESDE</span><div><span className="coin-icon bitcoin">₿</span><strong>BTC <small>Bitcoin</small></strong><span className="swap-balance">0.02481 BTC</span></div><input value="0.01000" readOnly aria-label="Importe de Bitcoin" /></div><button className="swap-switch" aria-label="Intercambiar activos" onClick={() => onAction('Cambiar dirección')}><ArrowLeftRight size={17} /></button><div className="swap-field"><span>HACIA</span><div><span className="coin-icon ethereum">Ξ</span><strong>ETH <small>Ethereum</small></strong><span className="swap-balance">0.4820 ETH</span></div><input value="≈ 0.2314" readOnly aria-label="Estimación de Ethereum" /></div><div className="swap-rate"><span>Tipo estimado</span><strong>1 BTC ≈ 23.14 ETH</strong><small>La cotización no es en vivo</small></div><button className="modal-primary swap-submit" onClick={() => onAction('Swap no disponible')}>Vista previa de swap <ArrowRight size={16} /></button></div>
      : page === 'Arcade' || page === 'Juegos' ? <div className="game-grid">{[{ name: 'Dice', label: 'Elige tu número', icon: '01', color: 'game-coral' }, { name: 'Crash', label: 'Multiplicador en vivo', icon: '↗', color: 'game-lime' }, { name: 'Plinko', label: 'Suerte y estrategia', icon: '•••', color: 'game-blue' }, { name: 'Mines', label: 'Encuentra el camino', icon: '✳', color: 'game-yellow' }, { name: 'Ruleta', label: 'Apuesta a un color', icon: '◉', color: 'game-blue' }, { name: 'Limbo', label: 'Elige un objetivo', icon: '↗', color: 'game-lime' }].map((game) => <button className="game-card" key={game.name} onClick={() => onAction(`${game.name} · modo demo`)}><span className={`game-art ${game.color}`}>{game.icon}</span><span className="game-meta"><strong>{game.name}</strong><small>{game.label}</small></span><ArrowUpRight size={16} /></button>)}</div>
      : ['Anuncios', 'Anunciar', 'Campañas', 'Listings patrocinados'].includes(page) ? <><div className="ad-metrics">{[['IMPRESIONES DEMO', '24,680'], ['CTR ESTIMADO', '2.84%'], ['COSTE MEDIO', '$0.012']].map(([label, value]) => <div className="ad-metric" key={label}><span>{label}</span><strong>{value}</strong><small><Activity size={13} /> Campaña de muestra</small></div>)}</div><button className="campaign-cta" onClick={() => onAction(page === 'Listings patrocinados' ? 'Crear listing' : 'Crear campaña')}><span><Megaphone size={18} /><strong>{page === 'Listings patrocinados' ? 'Promociona tu faucet' : 'Configura tu primera campaña'}</strong><small>{page === 'Listings patrocinados' ? 'Ubicación destacada en el directorio · simulación' : 'PTC, banners y anuncios nativos · simulación'}</small></span><ArrowRight size={18} /></button></>
      : page === 'Temporada' ? <><div className="season-large"><div className="season-large-head"><span className="season-icon"><Trophy size={19} /></span><span className="season-live"><i /> EN CURSO</span><strong>19 días restantes</strong></div><h2>Ruta del explorador</h2><p>Completa actividades para progresar. En producción, cada misión tendrá reglas y recompensas publicadas.</p><div className="season-progress"><span style={{ width: '68%' }} /></div><div className="season-progress-copy"><span>Nivel 08 · 680 / 1,000 XP</span><span>Próxima recompensa: <strong>25 Sats demo</strong></span></div></div><div className="mission-row"><span className="mission-icon"><MousePointerClick size={17} /></span><div><strong>Completa 3 ofertas</strong><small>Progreso: 2 / 3 · +120 XP</small></div><span className="mission-reward">+120 XP</span><ArrowRight size={15} /></div><div className="mission-row"><span className="mission-icon mission-gift"><Gift size={17} /></span><div><strong>Visita la plataforma 5 días</strong><small>Progreso: 4 / 5 · +80 XP</small></div><span className="mission-reward">+80 XP</span><ArrowRight size={15} /></div></>
      : page === 'Gremio' ? <div className="guild-panel"><div className="guild-banner"><div className="guild-emblem"><Blocks size={26} /></div><div><span className="section-kicker">GREMIO · #14 GLOBAL</span><h2>Night Owls</h2><p>Juntos desde hace 42 días</p></div><button className="action-secondary" onClick={() => onAction('Invitar al gremio')}><Users size={15} />Invitar</button></div><div className="guild-stats"><div><span>XP colectiva</span><strong>24,680 <small>/ 30,000</small></strong></div><div><span>Miembros activos</span><strong>12 <small>/ 20</small></strong></div><div><span>Posición semanal</span><strong>#14 <small>↑ 3</small></strong></div></div><div className="guild-footer"><span><Flame size={15} /> Racha de gremio: 8 días</span><button className="text-link" onClick={() => onAction('Tabla de posiciones')}>Ver tabla <ArrowRight size={14} /></button></div></div>
      : page === 'Desarrolladores' || page === 'API' ? <div className="developer-panel"><div className="developer-icon"><Code2 size={24} /></div><div><span className="section-kicker">API DE PAGOS</span><h2>Integra. Prueba. Lanza.</h2><p>Consulta documentación, crea credenciales de sandbox y simula webhooks cuando el portal esté conectado.</p><div className="developer-actions"><button className="action-primary" onClick={() => onAction('Documentación API')}><Code2 size={15} />Ver documentación</button><button className="action-secondary" onClick={() => onAction('Crear API key')}><Plus size={15} />Crear API key</button></div></div><div className="code-preview"><span><i /> SANDBOX · EJEMPLO</span><pre>{`POST /v1/payouts\nAuthorization: Bearer demo_key\n\n{\n  "asset": "USDT",\n  "amount": "1.50"\n}`}</pre></div></div>
      : <ModuleOverview page={page} onAction={onAction} />}
  </section>
}

const moduleOptions: Record<string, { metric: string; value: string; caption: string; rows: { title: string; detail: string; value: string }[] }> = {
  Cartera: { metric: 'ACTIVOS EN VISTA', value: '4', caption: 'balances ilustrativos', rows: assets.map((asset) => ({ title: `${asset.name} · ${asset.ticker}`, detail: `${asset.amount} ${asset.ticker}`, value: asset.value })) },
  Depositar: { metric: 'REDES DISPONIBLES', value: '12', caption: 'redes en el catálogo', rows: [{ title: 'Bitcoin', detail: 'BTC · Red Bitcoin', value: 'Activo' }, { title: 'Ethereum', detail: 'ETH · ERC-20', value: 'Activo' }, { title: 'USDT', detail: 'Selecciona red antes de depositar', value: 'Revisar' }] },
  Retirar: { metric: 'ESTADO', value: 'Listo', caption: 'verificación de cuenta requerida', rows: [{ title: 'Seleccionar activo', detail: 'Elige una moneda y red compatible', value: 'Paso 1' }, { title: 'Dirección de destino', detail: 'Se valida antes de confirmar', value: 'Paso 2' }, { title: 'Revisión de retiro', detail: 'Límites y comisiones visibles', value: 'Paso 3' }] },
  Transferir: { metric: 'COMISIÓN INTERNA', value: '0', caption: 'para pagos entre usuarios', rows: [{ title: 'Nombre de usuario', detail: 'Identifica al destinatario', value: 'Requerido' }, { title: 'Activo y cantidad', detail: 'Se muestra el total antes de enviar', value: 'Requerido' }, { title: 'Confirmación', detail: 'Las transferencias son finales', value: 'Revisar' }] },
  Historial: { metric: 'OPERACIONES', value: '24', caption: 'actividad reciente de demo', rows: [{ title: 'Recompensa de faucet', detail: 'BTC · Hoy, 10:42', value: '+0.00000042' }, { title: 'Pago interno', detail: 'USDT · Ayer, 18:06', value: '-2.50' }, { title: 'Retiro on-chain', detail: 'LTC · 08 oct, 13:27', value: '-0.025' }] },
  Direcciones: { metric: 'DIRECCIONES GUARDADAS', value: '0', caption: 'ninguna en esta vista demo', rows: [{ title: 'Lista de permitidas', detail: 'Guarda direcciones de retiro verificadas', value: 'Vacía' }, { title: 'Red correcta', detail: 'La red de destino debe coincidir', value: 'Importante' }] },
  Lotería: { metric: 'SORTEOS ACTIVOS', value: '3', caption: 'muestra ilustrativa', rows: [{ title: 'Sorteo semanal', detail: 'BTC · Cierra en 2 d 14 h', value: 'Ver reglas' }, { title: 'Premio comunitario', detail: 'DOGE · Cierra en 5 d', value: 'Ver reglas' }] },
  Staking: { metric: 'RENDIMIENTO', value: 'Variable', caption: 'no garantizado · depende del protocolo', rows: [{ title: 'FEY flexible', detail: 'Sin periodo fijo · riesgos del token', value: 'Más información' }, { title: 'Yield DeFi', detail: 'Estrategia externa · riesgo de contrato', value: 'No conectado' }] },
  Afiliados: { metric: 'REFERIDOS', value: '0', caption: 'sin actividad conectada', rows: [{ title: 'Enlace de invitación', detail: 'Disponible al activar afiliados', value: 'Pendiente' }, { title: 'Comisiones', detail: 'Reglas y condiciones publicadas', value: 'Pendiente' }] },
  Perfil: { metric: 'CUENTA', value: 'Demo', caption: 'perfil no conectado', rows: [{ title: 'Información personal', detail: 'Nombre visible y correo', value: 'Editar' }, { title: 'Preferencias', detail: 'Idioma y moneda de visualización', value: 'Configurar' }] },
  Seguridad: { metric: 'PROTECCIÓN', value: '2FA', caption: 'ejemplo visual', rows: [{ title: 'Autenticación de dos factores', detail: 'Segundo factor para iniciar sesión', value: 'Revisar' }, { title: 'Sesiones activas', detail: 'Cierra sesiones que no reconozcas', value: '0 activas' }, { title: 'Historial de acceso', detail: 'Actividad reciente de cuenta', value: 'Consultar' }] },
  Ajustes: { metric: 'PREFERENCIAS', value: '3', caption: 'controles disponibles', rows: [{ title: 'Idioma', detail: 'Español', value: 'Cambiar' }, { title: 'Moneda de visualización', detail: 'USD', value: 'Cambiar' }, { title: 'Notificaciones', detail: 'Correo y alertas de cuenta', value: 'Configurar' }] },
}

function ModuleOverview({ page, onAction }: { page: string; onAction: (action: string) => void }) {
  const module = moduleOptions[page] ?? {
    metric: 'ESTADO DEL MÓDULO', value: 'Vista previa', caption: 'sin integración activa',
    rows: [{ title: 'Configuración del servicio', detail: 'Conectaremos esta función en su siguiente fase', value: 'Pendiente' }],
  }
  const Icon = dashboardNav.flatMap((group) => group.items).find((item) => item.label === page)?.icon ?? WalletCards
  return <div className="module-preview-grid">
    <div className="module-preview-panel">
      <div className="module-preview-heading"><span className="module-preview-icon"><Icon size={19} /></span><div><span className="section-kicker">{page.toUpperCase()} · VISTA PREVIA</span><h2>Opciones de {page.toLowerCase()}</h2></div></div>
      <div className="module-preview-list">{module.rows.map((row) => <button className="module-preview-row" key={row.title} onClick={() => onAction(`${row.title} · vista demo`)}><span><strong>{row.title}</strong><small>{row.detail}</small></span><em>{row.value}</em><ArrowRight size={15} /></button>)}</div>
      <div className="module-preview-notice"><ShieldCheck size={15} />Vista de demostración: no se envían fondos ni se modifican datos.</div>
    </div>
    <aside className="module-summary-panel"><span className="section-kicker">RESUMEN</span><strong>{module.value}</strong><small>{module.metric}</small><p>{module.caption}</p><div className="module-summary-foot"><span className="market-status-dot" /> Servicio en preparación</div></aside>
  </div>
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  return path === '/dashboard' ? <DashboardRoute /> : <HomePage />
}

function DashboardRoute() {
  const [hasSession, setHasSession] = useState<boolean | null>(() => supabase ? null : import.meta.env.DEV)

  useEffect(() => {
    if (!supabase) return

    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(Boolean(data.session))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setHasSession(Boolean(session))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (hasSession === false && !import.meta.env.DEV) {
      window.location.replace('/?login=1')
    }
  }, [hasSession])

  if (hasSession === null) return <div className="market-loading-page"><span className="live-dot" />Verificando sesión…</div>
  if (!hasSession && !import.meta.env.DEV) return null
  return <DashboardPrototype />
}