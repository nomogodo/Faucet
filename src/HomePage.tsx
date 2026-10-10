import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CandlestickChart,
  Check,
  CircleDollarSign,
  Code2,
  Eye,
  EyeOff,
  Flame,
  Gamepad2,
  Gift,
  HandCoins,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Megaphone,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import {
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import SupabaseStatus from './components/SupabaseStatus'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './HomePage.css'

const API_BASE = 'https://api.binance.com/api/v3'
const MARKET_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT']

type MiniTicker = { symbol: string; lastPrice: string; priceChangePercent: string }
type KlineRow = [number, string, string, string, string, string]

const coinRows = [
  { symbol: 'BTC', name: 'Bitcoin', balance: '0.02481', value: '$1,642.80', mark: '₿', tone: 'coin-orange' },
  { symbol: 'ETH', name: 'Ethereum', balance: '0.4820', value: '$1,384.26', mark: 'Ξ', tone: 'coin-lilac' },
  { symbol: 'USDT', name: 'Tether', balance: '842.50', value: '$842.50', mark: '₮', tone: 'coin-green' },
]

const earnRows = [
  { icon: 'F', label: 'Faucets', detail: 'Recompensa diaria · puntos internos' },
  { icon: 'O', label: 'Offerwalls y encuestas', detail: 'Aún sin proveedor · ninguna oferta activa' },
  { icon: '↗', label: 'Paid-to-click', detail: 'Aún sin proveedor · ninguna campaña activa' },
]

function StaticButton({ children, className = '', onClick }: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return <button className={`static-button ${className}`} type="button" disabled={!onClick} onClick={onClick}>{children}</button>
}

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(() => new URLSearchParams(window.location.search).get('login') === '1')
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'recovery' | 'update-password'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [canResendConfirmation, setCanResendConfirmation] = useState(false)
  const [authRedirect, setAuthRedirect] = useState('/dashboard')
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('login') !== '1') return
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedInEmail(data.session?.user.email ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null)
      if (_event === 'PASSWORD_RECOVERY') {
        setAuthMode('update-password')
        setAuthError('')
        setAuthMessage('')
        setAuthOpen(true)
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setAuthError('')
    setAuthMessage('')
    setCanResendConfirmation(false)
    setAuthOpen(true)
  }

  const openWallet = async () => {
    if (signedInEmail) {
      window.location.assign('/dashboard')
      return
    }
    if (supabase) {
      const { data, error } = await supabase.auth.getSession()
      if (!error && data.session) {
        window.location.assign('/dashboard')
        return
      }
    }
    openAuth('signup')
  }

  const openDashboardSection = async (section: string) => {
    const destination = `/dashboard?section=${encodeURIComponent(section)}`
    if (signedInEmail) {
      window.location.assign(destination)
      return
    }
    if (supabase) {
      const { data, error } = await supabase.auth.getSession()
      if (!error && data.session) {
        window.location.assign(destination)
        return
      }
    }
    setAuthRedirect(destination)
    openAuth('login')
  }

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setAuthError('Supabase aún no está configurado. Añade la URL y la clave pública en .env.local.')
      return
    }
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')
    setCanResendConfirmation(false)
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { data: { display_name: authName.trim() || undefined } },
        })
        if (error) throw error
        if (data.session) {
          setAuthMessage('Cuenta creada. Ya has iniciado sesión.')
          window.location.assign(authRedirect)
        } else {
          setAuthMessage('Cuenta creada. Revisa tu correo para confirmar la dirección antes de iniciar sesión.')
        }
      } else if (authMode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setAuthMessage('Si existe una cuenta para este correo, recibirás un enlace para restablecer la contraseña.')
      } else if (authMode === 'update-password') {
        const { error } = await supabase.auth.updateUser({ password: authPassword })
        if (error) throw error
        setAuthMessage('Contraseña actualizada. Ya puedes seguir usando tu cuenta.')
        setAuthMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
        if (error) throw error
        setAuthMessage('Sesión iniciada correctamente.')
        window.location.assign(authRedirect)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la solicitud. Inténtalo de nuevo.'
      if (authMode === 'login' && message.toLowerCase().includes('email not confirmed')) {
        setAuthError('Tu correo todavía no está confirmado.')
        setCanResendConfirmation(true)
      } else {
        setAuthError(message)
      }
    } finally {
      setAuthBusy(false)
    }
  }

  const resendConfirmation = async () => {
    if (!supabase || !authEmail.trim()) return
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authEmail.trim(),
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setCanResendConfirmation(false)
      setAuthMessage('Solicitud enviada. Revisa la bandeja de entrada y el spam.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo reenviar el correo. Inténtalo de nuevo.')
    } finally {
      setAuthBusy(false)
    }
  }

  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) setAuthError(error.message)
    else setAuthMessage('Sesión cerrada.')
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-brand" aria-label="Faucet Protocol">
          <span className="home-brand-mark"><i /></span>
          <span className="home-brand-name">faucet<span>.</span></span>
          <span className="home-brand-tag">PROTOCOL</span>
        </div>
        <nav className="home-nav" aria-label="Secciones del producto">
          {[['Ganar', 'Earn'], ['Faucets', 'Faucets'], ['Juegos', 'Juegos'], ['Staking', 'Staking'], ['Anunciar', 'Anunciar'], ['API', 'API']].map(([label, section]) => <button key={section} onClick={() => void openDashboardSection(section)}>{label}</button>)}
        </nav>
        <div className="home-auth-actions">
          {signedInEmail ? <><span className="home-user-email">{signedInEmail}</span><StaticButton className="home-login" onClick={() => void signOut()}><LogOut size={13} />Salir</StaticButton></> : <><StaticButton className="home-login" onClick={() => openAuth('login')}>Iniciar sesión</StaticButton><StaticButton className="home-signup" onClick={() => openAuth('signup')}>Crear cuenta <ArrowRight size={14} /></StaticButton></>}
        </div>
      </header>

      <div className="home-content">
        <section className="home-hero">
          <div className="hero-copy">
            <div className="home-eyebrow"><span /> MICRO-WALLET · EARN · WEB3</div>
            <h1>Tu cripto.<br /><em>En movimiento.</em></h1>
            <p>Gana, guarda y mueve activos digitales desde un solo lugar. Una plataforma para usuarios, creadores y comunidades cripto.</p>
            <div className="hero-actions">
              <StaticButton className="hero-primary" onClick={() => void openWallet()}>Abrir tu wallet <ArrowRight size={16} /></StaticButton>
              <StaticButton className="hero-secondary" onClick={() => void openDashboardSection('Earn')}>Ganar ahora <ArrowUpRight size={15} /></StaticButton>
            </div>
            <div className="hero-tertiary"><StaticButton>Explorar faucets <ArrowRight size={13} /></StaticButton><span>Sin custodia Web3 o cuenta tradicional</span></div>
            <div className="hero-proof"><span><Check size={13} /> Pagos internos instantáneos</span><i /><span>20+ activos digitales</span><i /><span>Seguridad por diseño</span></div>
          </div>

          <MarketPreview />
          <div className="hero-orbit-label orbit-top"><span className="orbit-dot orbit-lime" /> MERCADOS EN VIVO</div>
          <div className="hero-orbit-label orbit-bottom"><span className="orbit-dot orbit-coral" /> MULTI-ACTIVO</div>
        </section>

        <section className="home-ticker-strip" aria-label="Mercados destacados">
          <div className="ticker-intro"><span className="ticker-live-dot" /> MERCADOS</div>
          <MarketTickers />
          <div className="ticker-source">SPOT · DATOS EN VIVO</div>
        </section>

        <section className="home-section-heading">
          <div><span className="home-kicker">UN ECOSISTEMA COMPLETO</span><h2>Todo lo que necesitas.<br /><span>Todo conectado.</span></h2></div>
          <p>Desde la primera recompensa hasta las herramientas de crecimiento para tu proyecto.</p>
        </section>

        <section className="home-feature-grid" aria-label="Funciones de Faucet Protocol">
          <article className="home-feature wallet-feature">
            <div className="feature-heading"><span className="feature-icon lime-icon"><Wallet size={17} /></span><span className="feature-label">WALLET</span><span className="feature-top-mark">01</span></div>
            <h3>Tu micro-wallet multimoneda.</h3>
            <p>Más de 20 activos, saldo interno y movimientos entre usuarios sin comisiones ni esperas on-chain.</p>
            <div className="wallet-preview">
              <div className="wallet-preview-heading"><span>PORTAFOLIO <i>VISTA PREVIA</i></span><strong>$4,182.20 <small>USD</small></strong></div>
              {coinRows.map((coin) => <div className="wallet-coin-row" key={coin.symbol}><span className={`coin-mark ${coin.tone}`}>{coin.mark}</span><span className="coin-title"><strong>{coin.symbol}</strong><small>{coin.name}</small></span><span className="coin-balance"><strong>{coin.balance} <small>{coin.symbol}</small></strong><small>{coin.value}</small></span></div>)}
            </div>
            <div className="static-action-row"><StaticButton><ArrowDownLeft size={14} />Depositar</StaticButton><StaticButton><ArrowUpRight size={14} />Retirar</StaticButton><StaticButton><ArrowRight size={14} />Enviar</StaticButton></div>
          </article>

          <article className="home-feature earn-feature-home">
            <div className="feature-heading"><span className="feature-icon coral-icon"><HandCoins size={17} /></span><span className="feature-label">EARN</span><span className="feature-top-mark">02</span></div>
            <h3>Tareas verificadas.<br />Puntos internos.</h3>
            <p>El faucet diario y la tarea de perfil ya acreditan puntos internos. Las ofertas externas aún no están conectadas.</p>
            <div className="earn-preview-list">{earnRows.map((row) => <div className="earn-preview-row" key={row.label}><span>{row.icon}</span><div><strong>{row.label}</strong><small>{row.detail}</small></div><ArrowRight size={14} /></div>)}</div>
            <StaticButton className="feature-action">Proveedores externos pendientes</StaticButton>
          </article>

          <article className="home-feature games-feature">
            <div className="feature-heading"><span className="feature-icon blue-icon"><Gamepad2 size={17} /></span><span className="feature-label">FAIR PLAY</span><span className="feature-top-mark">03</span></div>
            <h3>Juega con transparencia.</h3>
            <p>Dice, Crash, Plinko, Mines y ruleta con rondas provably fair y semillas verificables.</p>
            <div className="game-tile-row"><div><span className="game-glyph glyph-coral">7</span><strong>Dice</strong></div><div><span className="game-glyph glyph-lime">↗</span><strong>Crash</strong></div><div><span className="game-glyph glyph-blue">•••</span><strong>Plinko</strong></div><div><span className="game-glyph glyph-gold">✳</span><strong>Mines</strong></div></div>
            <StaticButton className="feature-action">Ver juegos <ArrowRight size={14} /></StaticButton>
          </article>

          <article className="home-feature swap-feature">
            <div className="feature-heading"><span className="feature-icon blue-icon"><ArrowLeftRight size={17} /></span><span className="feature-label">SWAP</span><span className="feature-top-mark">04</span></div>
            <h3>Cambia de activo.<br />Sigue tu camino.</h3>
            <p>Conversión entre activos compatibles con cotización y comisiones a la vista.</p>
            <div className="swap-preview"><div><span className="coin-mark coin-orange">₿</span><strong>BTC</strong><small>Bitcoin</small></div><ArrowLeftRight size={17} /><div><span className="coin-mark coin-green">₮</span><strong>USDT</strong><small>Tether</small></div></div>
            <StaticButton className="feature-action">Ir al exchange <ArrowRight size={14} /></StaticButton>
          </article>

          <article className="home-feature staking-feature">
            <div className="feature-heading"><span className="feature-icon gold-icon"><Flame size={17} /></span><span className="feature-label">TOKEN · DEFI</span><span className="feature-top-mark">05</span></div>
            <h3>Utilidad que va más allá.</h3>
            <p>FEY para ventajas de plataforma; estrategias DeFi opt-in, con riesgos y rendimientos variables visibles.</p>
            <div className="token-utility-list"><span><Check size={13} /> Descuentos en comisiones</span><span><Check size={13} /> Staking flexible</span><span><Check size={13} /> Integraciones Aave / Uniswap</span></div>
            <div className="staking-footer"><span>APY <strong>Variable</strong></span><StaticButton>Explorar staking <ArrowRight size={13} /></StaticButton></div>
          </article>

          <article className="home-feature social-feature">
            <div className="feature-heading"><span className="feature-icon coral-icon"><Users size={17} /></span><span className="feature-label">SOCIAL · PROGRESO</span><span className="feature-top-mark">06</span></div>
            <div className="social-copy"><div><h3>Crece junto a tu comunidad.</h3><p>XP, pase de temporada y gremios con metas colectivas.</p></div><div className="season-stamp"><Trophy size={18} /><span>SEASON<br /><strong>04</strong></span></div></div>
            <div className="level-preview"><div className="level-top"><span>NIVEL 08 <i>EXPLORER</i></span><strong>680 <small>/ 1,000 XP</small></strong></div><div className="level-track"><span /></div><div className="pass-row"><span><Gift size={14} /> Battle Pass</span><strong>GRATIS <i>· PREMIUM</i></strong></div></div>
            <StaticButton className="feature-action">Ver temporada <ArrowRight size={14} /></StaticButton>
          </article>

          <article className="home-feature ad-feature">
            <div className="feature-heading"><span className="feature-icon gold-icon"><Megaphone size={17} /></span><span className="feature-label">PARA ANUNCIANTES</span><span className="feature-top-mark">07</span></div>
            <h3>Llega a usuarios que ya usan cripto.</h3>
            <p>Compra tráfico PTC, banners, ubicaciones patrocinadas y anuncios nativos.</p>
            <div className="ad-format-row"><span><MousePointerClick size={14} /> PTC</span><span><Activity size={14} /> Banners</span><span><Sparkles size={14} /> Nativos</span></div>
            <div className="advertiser-actions"><StaticButton className="feature-action">Iniciar campaña <ArrowRight size={14} /></StaticButton><StaticButton className="feature-outline">Listings patrocinados</StaticButton></div>
          </article>

          <article className="home-feature developer-feature">
            <div className="feature-heading"><span className="feature-icon blue-icon"><Code2 size={17} /></span><span className="feature-label">PARA DEVELOPERS</span><span className="feature-top-mark">08</span></div>
            <h3>Pagos cripto listos para integrar.</h3>
            <p>API, webhooks idempotentes, entorno sandbox y conciliación para tu producto.</p>
            <div className="api-snippet"><span><i /> API · SANDBOX</span><code><b>POST</b> /v1/payouts</code><code>asset: <em>"USDT"</em> · amount: <em>"1.50"</em></code></div>
            <StaticButton className="feature-action">Documentación API <ArrowRight size={14} /></StaticButton>
          </article>

          <article className="home-feature security-feature">
            <div className="feature-heading"><span className="feature-icon lime-icon"><ShieldCheck size={17} /></span><span className="feature-label">CAPA DE CONFIANZA</span><span className="feature-top-mark">09</span></div>
            <h3>Protección desde el acceso.</h3>
            <p>Inicio híbrido, smart accounts y señales anti-bot asistidas por IA con revisión de decisiones.</p>
            <div className="security-tags"><span><KeyRound size={13} /> Email · 2FA</span><span><LockKeyhole size={13} /> Smart accounts</span><span><Wallet size={13} /> WalletConnect</span><span><Activity size={13} /> Anti-bot IA</span><span><Check size={13} /> Push · PWA</span></div>
            <div className="security-note"><span className="security-pulse" /> CONTROL DE CUENTA <strong>ACTIVO</strong></div>
          </article>

          <article className="home-feature analytics-feature">
            <div className="feature-heading"><span className="feature-icon coral-icon"><Activity size={17} /></span><span className="feature-label">ANALÍTICA</span><span className="feature-top-mark">10</span></div>
            <h3>Una vista clara de tu actividad.</h3>
            <p>Portafolio, historial, mapa de actividad y rendimiento de referidos.</p>
            <div className="analytics-preview"><div className="analytics-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="analytics-caption"><span>ACTIVIDAD · 12 SEMANAS</span><strong><span /> 18 días activos</strong></div></div>
            <StaticButton className="feature-action">Ver dashboard <ArrowRight size={14} /></StaticButton>
          </article>
        </section>

        <section className="home-onboarding">
          <div className="onboarding-icon"><CircleDollarSign size={19} /></div>
          <div><span className="home-kicker">EMPIEZA EN MINUTOS</span><h2>Tu primer satoshi está cerca.</h2><p>Cuenta tradicional, wallet externa o smart account: tú decides cómo entrar.</p></div>
          <div className="onboarding-methods"><span>Email + 2FA</span><i /><span>WalletConnect</span><i /><span>Account Abstraction</span></div>
          <StaticButton className="onboarding-cta" onClick={() => openAuth('signup')}>Crear mi cuenta <ArrowRight size={14} /></StaticButton>
        </section>

        <footer className="home-footer">
          <div className="footer-brand"><span className="home-brand-mark"><i /></span><strong>faucet<span>.</span></strong><small>Una plataforma cripto, sin ruido.</small></div>
          <div className="footer-link-group"><span>PRODUCTO</span><b>Comisiones</b><b>Verificar pagos</b><b>API docs</b></div>
          <div className="footer-link-group"><span>RECURSOS</span><b>Centro de ayuda</b><b>Blog</b><b>Reportar abuso</b></div>
          <div className="footer-link-group"><span>LEGAL</span><b>Términos</b><b>Privacidad</b><b>Juego responsable</b></div>
          <div className="footer-status"><SupabaseStatus /><small>© 2026 Faucet Protocol</small></div>
        </footer>
      </div>

      {authOpen && <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !authBusy) setAuthOpen(false) }}>
        <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <button className="auth-close" type="button" aria-label="Cerrar" disabled={authBusy} onClick={() => setAuthOpen(false)}><X size={17} /></button>
          <span className="auth-mark"><LockKeyhole size={19} /></span>
          <span className="home-kicker">FAUCET PROTOCOL · CUENTA</span>
          <h2 id="auth-title">{authMode === 'signup' ? 'Crea tu cuenta' : authMode === 'recovery' ? 'Recupera el acceso' : authMode === 'update-password' ? 'Elige una contraseña nueva' : 'Qué bueno verte.'}</h2>
          <p className="auth-intro">{authMode === 'signup' ? 'Empieza con tu correo. Podrás conectar una wallet después.' : authMode === 'recovery' ? 'Te enviaremos un enlace para restablecer tu contraseña.' : authMode === 'update-password' ? 'Actualiza tu contraseña para recuperar el acceso a tu cuenta.' : 'Inicia sesión para continuar a tu wallet.'}</p>
          {!isSupabaseConfigured && <div className="auth-config-warning"><CircleDollarSign size={16} /><span>Falta configurar Supabase. Añade <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> en <code>.env.local</code> y reinicia el servidor.</span></div>}
          <form className="auth-form" onSubmit={(event) => void submitAuth(event)}>
            {authMode === 'signup' && <label><span>Nombre (opcional)</span><div className="auth-input-wrap"><Users size={15} /><input autoComplete="name" value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Cómo te llamamos" maxLength={50} disabled={!isSupabaseConfigured || authBusy} /></div></label>}
            <label><span>Correo electrónico</span><div className="auth-input-wrap"><Mail size={15} /><input type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="nombre@correo.com" disabled={!isSupabaseConfigured || authBusy} /></div></label>
            {authMode === 'login' && <label><span>Contraseña</span><div className="auth-input-wrap"><KeyRound size={15} /><input type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" minLength={8} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Mínimo 8 caracteres" disabled={!isSupabaseConfigured || authBusy} /><button className="auth-password-toggle" type="button" aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setPasswordVisible(!passwordVisible)} disabled={!isSupabaseConfigured || authBusy}>{passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label>}
            {(authMode === 'signup' || authMode === 'update-password') && <label><span>{authMode === 'signup' ? 'Contraseña' : 'Nueva contraseña'}</span><div className="auth-input-wrap"><KeyRound size={15} /><input type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" minLength={8} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Mínimo 8 caracteres" disabled={!isSupabaseConfigured || authBusy} /><button className="auth-password-toggle" type="button" aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setPasswordVisible(!passwordVisible)} disabled={!isSupabaseConfigured || authBusy}>{passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label>}
            {authMode === 'login' && <button className="auth-text-button auth-forgot" type="button" onClick={() => { setAuthMode('recovery'); setAuthError(''); setAuthMessage('') }}>¿Olvidaste tu contraseña?</button>}
            {authError && <p className="auth-feedback auth-feedback-error" role="alert">{authError}</p>}
            {canResendConfirmation && <button className="auth-text-button" type="button" disabled={authBusy || !authEmail.trim()} onClick={() => void resendConfirmation()}>{authBusy ? 'Enviando…' : 'Reenviar correo de verificación'}</button>}
            {authMessage && <p className="auth-feedback auth-feedback-success" role="status">{authMessage}</p>}
            <button className="auth-submit" type="submit" disabled={!isSupabaseConfigured || authBusy}>{authBusy ? 'Procesando…' : authMode === 'signup' ? 'Crear cuenta' : authMode === 'recovery' ? 'Enviar enlace' : authMode === 'update-password' ? 'Guardar contraseña' : 'Iniciar sesión'} <ArrowRight size={15} /></button>
          </form>
          <div className="auth-switch">{authMode === 'recovery' || authMode === 'update-password' ? <button className="auth-text-button" type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthMessage('') }}>Volver a iniciar sesión</button> : <>{authMode === 'signup' ? '¿Ya tienes cuenta?' : '¿Primera vez por aquí?'} <button className="auth-text-button" type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError(''); setAuthMessage('') }}>{authMode === 'signup' ? 'Inicia sesión' : 'Crear cuenta'}</button></>}</div>
          <div className="auth-legal"><ShieldCheck size={13} /> Sesión protegida por Supabase Auth</div>
        </section>
      </div>}
    </main>
  )
}

function MarketPreview() {
  const [tickers, setTickers] = useState<MiniTicker[]>([])
  const [streamStatus, setStreamStatus] = useState('CONECTANDO')

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ symbols: JSON.stringify(MARKET_SYMBOLS) })
    const refresh = async () => {
      try {
        const response = await fetch(`${API_BASE}/ticker/24hr?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error('Market data unavailable')
        setTickers(await response.json() as MiniTicker[])
      } catch {
        if (!controller.signal.aborted) setStreamStatus('SIN DATOS')
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [])

  return <div className="hero-market-card">
    <div className="market-card-top"><div><span className="market-card-kicker"><CandlestickChart size={13} /> MERCADO DESTACADO</span><strong>BTC <small>/ USDT</small></strong></div><span className={`market-card-status ${streamStatus === 'EN VIVO' ? 'status-live' : ''}`}><i />{streamStatus}</span></div>
    <MarketLineChart onLive={() => setStreamStatus('EN VIVO')} onError={() => setStreamStatus('SONDEO')} />
    <div className="market-card-bottom"><div><span>BITCOIN</span><strong>{tickers.find((ticker) => ticker.symbol === 'BTCUSDT') ? `$${Number(tickers.find((ticker) => ticker.symbol === 'BTCUSDT')?.lastPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}</strong></div><span className="market-card-live"><i /> REST + STREAM</span></div>
  </div>
}

function MarketTickers() {
  const [tickers, setTickers] = useState<MiniTicker[]>([])
  const marketNames = [
    { symbol: 'BTCUSDT', mark: '₿', name: 'BTC / USDT' },
    { symbol: 'ETHUSDT', mark: 'Ξ', name: 'ETH / USDT' },
    { symbol: 'SOLUSDT', mark: '◎', name: 'SOL / USDT' },
    { symbol: 'DOGEUSDT', mark: 'Ð', name: 'DOGE / USDT' },
  ]

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ symbols: JSON.stringify(MARKET_SYMBOLS) })
    const refresh = async () => {
      try {
        const response = await fetch(`${API_BASE}/ticker/24hr?${params}`, { signal: controller.signal })
        if (!response.ok) return
        setTickers(await response.json() as MiniTicker[])
      } catch { /* Keep the preview quiet when public market data is unavailable. */ }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [])

  return <div className="ticker-data">{marketNames.map((market) => {
    const ticker = tickers.find((item) => item.symbol === market.symbol)
    const change = Number(ticker?.priceChangePercent ?? 0)
    return <div className="ticker-item" key={market.symbol}><span className="ticker-coin">{market.mark}</span><span className="ticker-name"><strong>{market.name}</strong><small>{ticker ? `$${Number(ticker.lastPrice).toLocaleString('en-US', { maximumFractionDigits: Number(ticker.lastPrice) < 1 ? 5 : 2 })}` : 'Cargando'}</small></span><span className={`ticker-change ${change < 0 ? 'negative' : ''}`}>{ticker ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '—'}</span></div>
  })}</div>
}

function MarketLineChart({ onLive, onError }: { onLive: () => void; onError: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef({ onLive, onError })
  useEffect(() => { callbackRef.current = { onLive, onError } }, [onLive, onError])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let chart: IChartApi | undefined
    let socket: WebSocket | undefined
    let timer: number | undefined
    let disposed = false
    const controller = new AbortController()

    chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: { background: { type: ColorType.Solid, color: '#142137' }, textColor: '#91a4bf', fontFamily: 'DM Sans, sans-serif', fontSize: 10 },
      grid: { vertLines: { color: '#ffffff08' }, horzLines: { color: '#ffffff08' } },
      rightPriceScale: { visible: false },
      timeScale: { visible: false, borderVisible: false, rightOffset: 4 },
      crosshair: { vertLine: { visible: false, labelVisible: false }, horzLine: { visible: false, labelVisible: false } },
      handleScroll: false,
      handleScale: false,
    })
    const line = chart.addSeries(LineSeries, { color: '#6eafff', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false })
    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width && chart) chart.applyOptions({ width })
    })
    resizeObserver.observe(container)

    const getLatest = async () => {
      try {
        const response = await fetch(`${API_BASE}/klines?symbol=BTCUSDT&interval=1m&limit=2`, { signal: controller.signal })
        if (!response.ok) throw new Error('Price stream unavailable')
        const rows = await response.json() as KlineRow[]
        const row = rows[rows.length - 1]
        if (!disposed && row) line.update({ time: Math.floor(row[0] / 1000) as UTCTimestamp, value: Number(row[4]) })
      } catch {
        if (!disposed) callbackRef.current.onError()
      }
    }

    fetch(`${API_BASE}/klines?symbol=BTCUSDT&interval=1h&limit=72`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Chart unavailable'); return response.json() as Promise<KlineRow[]> })
      .then((rows) => {
        if (disposed) return
        line.setData(rows.map((row) => ({ time: Math.floor(row[0] / 1000) as UTCTimestamp, value: Number(row[4]) })))
        chart?.timeScale().fitContent()
        try {
          socket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m')
          socket.onopen = () => callbackRef.current.onLive()
          socket.onmessage = (event) => {
            const payload = JSON.parse(event.data) as { k?: { t: number; c: string } }
            if (!disposed && payload.k) line.update({ time: Math.floor(payload.k.t / 1000) as UTCTimestamp, value: Number(payload.k.c) })
          }
          socket.onerror = () => socket?.close()
          socket.onclose = () => {
            if (disposed) return
            callbackRef.current.onError()
            timer = window.setInterval(() => void getLatest(), 15_000)
            void getLatest()
          }
        } catch { callbackRef.current.onError(); timer = window.setInterval(() => void getLatest(), 15_000) }
      })
      .catch(() => { if (!disposed) callbackRef.current.onError() })

    return () => {
      disposed = true
      controller.abort()
      resizeObserver.disconnect()
      if (timer) window.clearInterval(timer)
      socket?.close()
      chart?.remove()
    }
  }, [])

  return <div ref={containerRef} className="hero-market-chart" aria-label="Gráfico real de Bitcoin frente a USDT" />
}