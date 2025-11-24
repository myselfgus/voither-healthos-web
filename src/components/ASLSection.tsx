import { useState } from "react"
import { GlassCard } from "./GlassCard"

interface Insight {
  id: number
  x: number
  label: string
  detail: string
  confidence: number
}

const insights: Insight[] = [
  { id: 1, x: 15, label: "Latência de resposta", detail: "Padrão identificado: Latência de resposta", confidence: 0.85 },
  { id: 2, x: 35, label: "Marcador afetivo", detail: "Marcador clínico: Risco de embotamento afetivo", confidence: 0.78 },
  { id: 3, x: 60, label: "Disrupção semântica", detail: "Padrão identificado: Disrupção na coerência semântica", confidence: 0.92 },
  { id: 4, x: 82, label: "Tom prosódico", detail: "Marcador clínico: Alteração no padrão prosódico", confidence: 0.73 }
]

export function ASLSection() {
  const [activeInsight, setActiveInsight] = useState<number | null>(null)

  return (
    <section className="py-40 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-20">
          <h2 
            className="font-semibold tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: "1.1" }}
          >
            Além da Transcrição: Inteligência Clínica.
          </h2>
          <p 
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
            style={{ fontSize: "clamp(1.125rem, 2.5vw, 1.75rem)" }}
          >
            Ouvimos o que não foi dito.
          </p>
        </div>

        <div className="relative h-64 mb-12">
          <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="oklch(0.92 0.005 264)" stopOpacity="0.3" />
                <stop offset="50%" stopColor="oklch(0.92 0.005 264)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="oklch(0.92 0.005 264)" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            <path
              d="M 0 100 Q 50 80, 100 90 T 200 95 Q 250 85, 300 88 T 400 92 Q 450 78, 500 85 T 600 90 Q 650 95, 700 88 T 800 93 Q 850 87, 900 90 T 1000 95"
              fill="none"
              stroke="url(#waveGradient)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {insights.map((insight) => {
              const wavePoints = [
                { x: 0, y: 100 },
                { x: 150, y: 85 },
                { x: 350, y: 78 },
                { x: 600, y: 95 },
                { x: 820, y: 82 }
              ]
              
              const pointIndex = Math.floor((insight.x / 100) * (wavePoints.length - 1))
              const point = wavePoints[Math.min(pointIndex, wavePoints.length - 1)]
              const x = (insight.x / 100) * 1000
              const y = point.y + (Math.random() - 0.5) * 10

              return (
                <g key={insight.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    className="cursor-pointer transition-all duration-300"
                    fill={activeInsight === insight.id ? "oklch(0.80 0.07 260)" : "oklch(0.75 0.06 220)"}
                    opacity={activeInsight === insight.id ? "1" : "0.7"}
                    onMouseEnter={() => setActiveInsight(insight.id)}
                    onMouseLeave={() => setActiveInsight(null)}
                    style={{
                      filter: activeInsight === insight.id 
                        ? "drop-shadow(0 0 8px oklch(0.80 0.07 260))" 
                        : "none"
                    }}
                  />
                </g>
              )
            })}
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.map((insight) => (
            <GlassCard
              key={insight.id}
              className={`p-6 transition-all duration-300 cursor-pointer ${
                activeInsight === insight.id 
                  ? "ring-2 ring-accent shadow-lg scale-105" 
                  : "hover:scale-102"
              }`}
              onMouseEnter={() => setActiveInsight(insight.id)}
              onMouseLeave={() => setActiveInsight(null)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{insight.label}</h3>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    {(insight.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{insight.detail}</p>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="mt-16 text-center max-w-3xl mx-auto">
          <p className="text-lg leading-relaxed" style={{ lineHeight: "1.7" }}>
            Modelos genéricos apenas transcrevem palavras. O nosso ToolActor ASL analisa a estrutura 
            do pensamento. Transformamos a fala em biomarcadores digitais, detectando padrões sutis 
            invisíveis ao olho nu.
          </p>
        </div>
      </div>
    </section>
  )
}
