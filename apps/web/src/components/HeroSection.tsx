import { useEffect, useState } from "react"

export function HeroSection() {
  const [scrolled, setScrolled] = useState(false)
  const [liquidFlowing, setLiquidFlowing] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      if (scrollPosition > 10 && !scrolled) {
        setScrolled(true)
        setLiquidFlowing(true)
        setTimeout(() => setLiquidFlowing(false), 800)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [scrolled])

  const scrollToNext = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth"
    })
  }

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div className="max-w-5xl mx-auto text-center space-y-12">
        <h1 
          className="font-bold tracking-tight leading-[1.1]"
          style={{ fontSize: "clamp(3rem, 6vw, 5.25rem)" }}
        >
          <span className="relative inline-block">
            A medicina virou{" "}
            <span className="relative inline-block">
              <span
                className={`transition-opacity duration-300 ${
                  scrolled ? "opacity-0" : "opacity-100"
                }`}
              >
                burocracia
              </span>
              {liquidFlowing && (
                <span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/30 to-transparent"
                  style={{ animation: "liquidFlow 0.8s ease-in-out" }}
                />
              )}
              <span
                className={`absolute inset-0 transition-opacity duration-500 ${
                  scrolled ? "opacity-100" : "opacity-0"
                }`}
              >
                invisível
              </span>
            </span>
          </span>
          <br />
          {scrolled && (
            <span
              className="inline-block opacity-0"
              style={{ animation: "fade-in 0.6s ease-out 0.4s forwards" }}
            >
              Nós a tornamos invisível.
            </span>
          )}
        </h1>

        <div className="relative mt-16">
          <div className="absolute inset-0 flex items-center justify-center opacity-80">
            <div className="w-full h-full max-w-md animate-pulse" style={{ animation: "float 6s ease-in-out infinite" }}>
              <div 
                className="w-full aspect-square rounded-full mx-auto"
                style={{
                  background: "radial-gradient(circle at 30% 30%, oklch(0.85 0.08 220), oklch(0.80 0.07 260), oklch(0.75 0.06 290))",
                  filter: "blur(2px)",
                  boxShadow: "0 20px 60px rgba(147, 197, 253, 0.3), 0 0 80px rgba(196, 181, 253, 0.2)",
                  animation: "breathe 4s ease-in-out infinite"
                }}
              />
            </div>
          </div>
        </div>

        <p 
          className="text-lg max-w-3xl mx-auto leading-relaxed mt-24 relative z-10"
          style={{ lineHeight: "1.7" }}
        >
          O primeiro Sistema Operacional Cognitivo que devolve o tempo do médico e a soberania do paciente.
        </p>

        <button
          onClick={scrollToNext}
          className="neumorphic rounded-[--radius-md] px-6 py-4 font-medium transition-all duration-300 hover:shadow-[6px_6px_12px_rgba(163,177,198,0.2),-6px_-6px_12px_rgba(255,255,255,0.8)] active:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] mt-12 inline-flex items-center gap-2"
        >
          Descubra o HealthOS
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
