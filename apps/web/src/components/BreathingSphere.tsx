import { useEffect, useRef } from "react"

export function BreathingSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const setCanvasSize = () => {
      const size = Math.min(window.innerWidth * 0.4, 400)
      canvas.width = size
      canvas.height = size
    }

    setCanvasSize()
    window.addEventListener("resize", setCanvasSize)

    let animationFrame: number
    let time = 0

    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const baseRadius = canvas.width * 0.35

      time += 0.01
      const breatheScale = 1 + Math.sin(time) * 0.05
      const radius = baseRadius * breatheScale

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.3,
        centerX,
        centerY,
        radius
      )

      const hue1 = 220 + Math.sin(time * 0.5) * 10
      const hue2 = 290 + Math.cos(time * 0.5) * 10

      gradient.addColorStop(0, `hsla(${hue1}, 60%, 85%, 0.9)`)
      gradient.addColorStop(0.5, `hsla(${(hue1 + hue2) / 2}, 55%, 80%, 0.7)`)
      gradient.addColorStop(1, `hsla(${hue2}, 50%, 75%, 0.5)`)

      ctx.shadowBlur = 40
      ctx.shadowColor = `hsla(${hue1}, 60%, 75%, 0.6)`

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"
      ctx.lineWidth = 2
      ctx.stroke()

      const highlightGradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.5
      )
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.6)")
      highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)")

      ctx.beginPath()
      ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = highlightGradient
      ctx.fill()

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener("resize", setCanvasSize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto"
      style={{ filter: "blur(1px)" }}
    />
  )
}
