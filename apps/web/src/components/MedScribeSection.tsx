import { useEffect, useRef, useState } from "react"
import { GlassCard } from "./GlassCard"

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  progress: number
  speed: number
}

export function MedScribeSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [inView, setInView] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
        }
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    setCanvasSize()
    window.addEventListener("resize", setCanvasSize)

    const particleCount = 50
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width * 0.3,
        y: Math.random() * canvas.height,
        targetX: canvas.width * 0.7 + (i % 5) * 40,
        targetY: 100 + Math.floor(i / 5) * 30,
        progress: 0,
        speed: 0.005 + Math.random() * 0.005
      })
    }

    let animationFrame: number
    let startTime = Date.now()

    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const elapsed = Date.now() - startTime
      const delayStart = 500

      particles.forEach((particle, i) => {
        const particleDelay = delayStart + i * 20

        if (elapsed > particleDelay) {
          particle.progress = Math.min(particle.progress + particle.speed, 1)

          const eased = 1 - Math.pow(1 - particle.progress, 3)

          const currentX = particle.x + (particle.targetX - particle.x) * eased
          const currentY = particle.y + (particle.targetY - particle.y) * eased

          const midX = canvas.width * 0.5
          const distToMid = Math.abs(currentX - midX)
          const maxDist = canvas.width * 0.2

          const glowAmount = distToMid < maxDist ? (1 - distToMid / maxDist) * 0.5 : 0

          ctx.beginPath()
          ctx.arc(currentX, currentY, 3, 0, Math.PI * 2)

          if (particle.progress < 0.5) {
            ctx.fillStyle = `rgba(163, 177, 198, ${0.6 + glowAmount})`
          } else {
            ctx.fillStyle = `rgba(37, 99, 235, ${0.3 + particle.progress * 0.4})`
          }

          if (glowAmount > 0) {
            ctx.shadowBlur = 15
            ctx.shadowColor = "rgba(147, 197, 253, 0.8)"
          } else {
            ctx.shadowBlur = 0
          }

          ctx.fill()
        }
      })

      ctx.shadowBlur = 0

      const lensX = canvas.width * 0.5
      const lensY = canvas.height * 0.5
      const lensRadius = 60

      const gradient = ctx.createRadialGradient(lensX, lensY, 0, lensX, lensY, lensRadius)
      gradient.addColorStop(0, "rgba(147, 197, 253, 0.4)")
      gradient.addColorStop(0.5, "rgba(196, 181, 253, 0.3)")
      gradient.addColorStop(1, "rgba(147, 197, 253, 0.1)")

      ctx.beginPath()
      ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"
      ctx.lineWidth = 2
      ctx.stroke()

      if (elapsed < 3000 || particles.some(p => p.progress < 1)) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener("resize", setCanvasSize)
    }
  }, [inView])

  return (
    <section ref={sectionRef} className="py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative h-[500px]">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />
          </div>

          <div className="space-y-8">
            <h2 
              className="font-semibold tracking-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: "1.1" }}
            >
              Converse. O resto é automático.
            </h2>

            <p className="text-lg leading-relaxed" style={{ lineHeight: "1.7" }}>
              O MedScribe não é um ditado. É uma IA treinada em 300 horas de contexto psiquiátrico 
              real e validada com 400 pacientes. Ele entende a diferença entre uma pausa reflexiva 
              e um sintoma.
            </p>

            <div className="space-y-4 mt-8">
              <GlassCard className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <p className="text-base">De áudio para Nota SOAP instantânea.</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <p className="text-base">Geração automática de prescrições e atestados (requer assinatura).</p>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                  <p className="text-base">Invisible Documentation: Você cuida, nós escrevemos.</p>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
