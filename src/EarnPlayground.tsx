import { useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react'

type ActivityMode = 'survey' | 'offer' | 'game'
type EarnPlaygroundProps = {
  mode: ActivityMode
  title: string
  detail: string
  reward: string
  onBack: () => void
}

const surveyQuestions = [
  { question: '¿Con qué frecuencia utilizas aplicaciones financieras?', answers: ['Todos los días', 'Varias veces por semana', 'Una vez por semana', 'Casi nunca'] },
  { question: '¿Qué función te resulta más útil?', answers: ['Consultar mis gastos', 'Ahorrar objetivos', 'Invertir', 'Enviar dinero'] },
  { question: '¿Desde qué dispositivo sueles acceder?', answers: ['Móvil', 'Ordenador', 'Tableta', 'Depende del momento'] },
]

const gameNames = ['Dice', 'Mines', 'Plinko']

function createMines() {
  const mines = new Set<number>()
  while (mines.size < 3) mines.add(Math.floor(Math.random() * 16))
  return [...mines]
}

export default function EarnPlayground({ mode, title, detail, reward, onBack }: EarnPlaygroundProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [surveyComplete, setSurveyComplete] = useState(false)
  const [diceValue, setDiceValue] = useState<number | null>(null)
  const [diceRounds, setDiceRounds] = useState(0)
  const [mines, setMines] = useState(createMines)
  const [revealed, setRevealed] = useState<number[]>([])
  const [minesFinished, setMinesFinished] = useState(false)
  const [plinkoScore, setPlinkoScore] = useState(0)
  const [plinkoResult, setPlinkoResult] = useState<number | null>(null)

  const playDice = () => {
    setDiceValue(Math.floor(Math.random() * 6) + 1)
    setDiceRounds((rounds) => rounds + 1)
  }
  const revealCell = (cell: number) => {
    if (minesFinished || revealed.includes(cell)) return
    const nextRevealed = [...revealed, cell]
    setRevealed(nextRevealed)
    if (mines.includes(cell) || nextRevealed.length === 13) setMinesFinished(true)
  }
  const resetMines = () => {
    setMines(createMines())
    setRevealed([])
    setMinesFinished(false)
  }
  const dropPlinko = () => {
    const scores = [0, 1, 2, 5, 2, 1, 0]
    const result = scores[Math.floor(Math.random() * scores.length)]
    setPlinkoResult(result)
    setPlinkoScore((score) => score + result)
  }

  return <section className="activity-playground">
    <button className="activity-back" onClick={onBack}><ArrowLeft size={15} />Volver a actividades</button>
    <div className="activity-heading"><div><span className="section-kicker">{mode === 'survey' ? 'ENCUESTA DE MUESTRA' : mode === 'game' ? 'JUEGO GRATUITO' : 'ACTIVIDAD'}</span><h2>{title}</h2><p>{detail}</p></div>{mode === 'offer' && <span className="activity-status">Proveedor pendiente</span>}</div>

    {mode === 'survey' ? <div className="activity-content">
      {surveyComplete ? <div className="activity-complete"><ShieldCheck size={23} /><h3>Encuesta de muestra completada</h3><p>Las respuestas solo se han usado en esta vista. No se enviaron a ningún proveedor ni se generó una recompensa.</p><button className="action-primary" onClick={onBack}>Ver actividades <ArrowRight size={15} /></button></div> : <>
        <div className="survey-progress"><span>Pregunta {questionIndex + 1} de {surveyQuestions.length}</span><span>{Math.round(((questionIndex + 1) / surveyQuestions.length) * 100)}%</span><div><i style={{ width: `${((questionIndex + 1) / surveyQuestions.length) * 100}%` }} /></div></div>
        <h3 className="survey-question">{surveyQuestions[questionIndex].question}</h3>
        <div className="survey-answers" role="group" aria-label="Opciones de respuesta">{surveyQuestions[questionIndex].answers.map((answer) => <button key={answer} className={`survey-answer ${answers[questionIndex] === answer ? 'survey-answer-selected' : ''}`} aria-pressed={answers[questionIndex] === answer} onClick={() => setAnswers((current) => current.map((item, index) => index === questionIndex ? answer : item).concat(current.length <= questionIndex ? [answer] : []))}>{answer}</button>)}</div>
        <div className="activity-actions"><span>Vista de preparación · sin datos personales</span><button className="action-primary" disabled={!answers[questionIndex]} onClick={() => questionIndex === surveyQuestions.length - 1 ? setSurveyComplete(true) : setQuestionIndex((index) => index + 1)}>{questionIndex === surveyQuestions.length - 1 ? 'Terminar muestra' : 'Siguiente'}<ArrowRight size={15} /></button></div>
      </>}</div>
      : mode === 'game' ? <div className="activity-content">
        <div className="game-safety-note">Partida gratuita · sin apuestas, pagos ni recompensas reales.</div>
        {title === 'Dice' && <div className="playable-game"><div className="dice-result" aria-live="polite">{diceValue ?? '—'}</div><p>{diceValue ? `Salió ${diceValue}.` : 'Lanza el dado para empezar.'} Rondas: {diceRounds}</p><button className="action-primary" onClick={playDice}>Lanzar dado</button></div>}
        {title === 'Mines' && <div className="playable-game"><p className="mines-status" aria-live="polite">{minesFinished ? (revealed.some((cell) => mines.includes(cell)) ? 'Mina encontrada. Reinicia para otra ronda.' : '¡Tablero despejado!') : `${revealed.filter((cell) => !mines.includes(cell)).length} celdas seguras · 3 minas ocultas`}</p><div className="mines-grid" role="group" aria-label="Tablero de Mines">{Array.from({ length: 16 }, (_, cell) => { const isRevealed = revealed.includes(cell) || minesFinished; const isMine = mines.includes(cell); return <button key={cell} className={`mine-cell ${isRevealed ? (isMine ? 'mine-cell-hit' : 'mine-cell-safe') : ''}`} aria-label={isRevealed ? (isMine ? 'Mina' : 'Casilla segura') : `Revelar casilla ${cell + 1}`} disabled={minesFinished || revealed.includes(cell)} onClick={() => revealCell(cell)}>{isRevealed ? (isMine ? '×' : '·') : '?'}</button> })}</div><button className="action-secondary" onClick={resetMines}><RotateCcw size={14} />Nueva ronda</button></div>}
        {title === 'Plinko' && <div className="playable-game"><div className="plinko-board" aria-label="Tablero Plinko de muestra"><span>●</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><span>·</span><strong>{plinkoResult === null ? '0 · 1 · 2 · 5 · 2 · 1 · 0' : `Resultado: ${plinkoResult} puntos demo`}</strong></div><p>Puntuación de muestra: {plinkoScore}</p><button className="action-primary" onClick={dropPlinko}>Soltar ficha</button></div>}
        {!gameNames.includes(title) && <div className="activity-complete"><p>Este juego aún está en preparación.</p><button className="action-secondary" onClick={onBack}>Volver a juegos</button></div>}
      </div>
      : <div className="activity-content activity-offer-content"><p>Esta actividad está preparada como ficha de producto, pero aún no está conectada a un proveedor externo. No abras cuentas ni compartas datos desde esta vista.</p><dl><div><dt>Tipo</dt><dd>{title}</dd></div><div><dt>Estado</dt><dd>Integración pendiente</dd></div><div><dt>Recompensa indicada</dt><dd>{reward} · referencia demo</dd></div></dl><div className="game-safety-note">Las encuestas y ofertas reales necesitan proveedor, consentimiento, verificación y un sistema de recompensas conectado.</div></div>}
  </section>
}
