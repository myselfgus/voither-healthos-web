import { useState, useEffect } from "react"

export function ArchitectureSection() {
  const [hoveredCapsule, setHoveredCapsule] = useState<number | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const capsules = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    row: Math.floor(i / 6),
    col: i % 6
  }))

  return (
    <section className="py-40 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-20">
          <h2 
            className="font-semibold tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: "1.1" }}
          >
            Soberania por Design.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="grid grid-cols-6 gap-4 p-8 rounded-3xl bg-muted/20">
              {capsules.map((capsule) => {
                const capsuleElement = document.getElementById(`capsule-${capsule.id}`)
                let distance = Infinity

                if (capsuleElement) {
                  const rect = capsuleElement.getBoundingClientRect()
                  const capsuleX = rect.left + rect.width / 2
                  const capsuleY = rect.top + rect.height / 2
                  distance = Math.sqrt(
                    Math.pow(mousePosition.x - capsuleX, 2) + 
                    Math.pow(mousePosition.y - capsuleY, 2)
                  )
                }

                const isNear = distance < 100
                const isUnlocked = distance < 60

                return (
                  <div
                    key={capsule.id}
                    id={`capsule-${capsule.id}`}
                    className="aspect-square rounded-2xl transition-all duration-300 cursor-pointer relative overflow-hidden"
                    style={{
                      background: isUnlocked
                        ? "linear-gradient(135deg, oklch(0.85 0.08 220), oklch(0.80 0.07 260))"
                        : "oklch(0.99 0.001 264 / 0.6)",
                      backdropFilter: "blur(20px)",
                      border: isUnlocked 
                        ? "2px solid oklch(0.80 0.07 260)" 
                        : "1px solid oklch(1 0 0 / 0.1)",
                      boxShadow: isUnlocked
                        ? "0 8px 32px rgba(147, 197, 253, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.3)"
                        : isNear
                        ? "0 4px 16px rgba(163, 177, 198, 0.2)"
                        : "0 2px 8px rgba(163, 177, 198, 0.1)",
                      transform: isUnlocked ? "scale(1.1)" : isNear ? "scale(1.05)" : "scale(1)"
                    }}
                    onMouseEnter={() => setHoveredCapsule(capsule.id)}
                    onMouseLeave={() => setHoveredCapsule(null)}
                  >
                    {isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg 
                          className="w-8 h-8 text-white animate-pulse" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" 
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="absolute -bottom-8 -right-8 w-32 h-32 opacity-20">
              <div className="w-full h-full rounded-3xl bg-destructive/30 backdrop-blur-sm border-2 border-destructive/50 animate-pulse" />
            </div>
          </div>

          <div className="space-y-8">
            <p className="text-lg leading-relaxed" style={{ lineHeight: "1.7" }}>
              Esqueça os bancos de dados centralizados vulneráveis. No HealthOS, cada paciente 
              é um <span className="font-semibold text-accent">PatientActor</span> isolado computacionalmente.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-muted/30">
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Isolamento total via Durable Objects</h3>
                  <p className="text-sm text-muted-foreground">
                    Cada paciente existe em seu próprio contexto computacional isolado.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-muted/30">
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">O médico é um convidado temporário</h3>
                  <p className="text-sm text-muted-foreground">
                    Acesso via SessionKey temporária. O paciente é o soberano.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-muted/30">
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Segurança que elimina vazamentos em massa</h3>
                  <p className="text-sm text-muted-foreground">
                    Impossível comprometer milhões de registros de uma só vez.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
