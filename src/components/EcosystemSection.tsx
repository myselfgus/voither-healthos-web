import { Waveform, CalendarBlank, VideoCamera, FileText } from "@phosphor-icons/react"

const stages = [
  {
    id: 1,
    icon: Waveform,
    title: "MedScribe",
    description: "Documentação clínica automática via IA",
    status: "Live",
    connections: [2, 4]
  },
  {
    id: 2,
    icon: FileText,
    title: "Regulação",
    description: "Integração com SISREG e fluxos regulatórios",
    status: "Beta",
    connections: [3]
  },
  {
    id: 3,
    icon: CalendarBlank,
    title: "Agenda",
    description: "Orquestração inteligente de compromissos",
    status: "Desenvolvimento",
    connections: [4]
  },
  {
    id: 4,
    icon: VideoCamera,
    title: "Telemedicina",
    description: "Consultas remotas com IA assistente",
    status: "Planejamento",
    connections: []
  }
]

export function EcosystemSection() {
  return (
    <section className="py-40 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-6 mb-20">
          <h2 
            className="font-semibold tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: "1.1" }}
          >
            Um Ecossistema. Não um Aplicativo.
          </h2>
          <p 
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
            style={{ fontSize: "clamp(1.125rem, 2.5vw, 1.75rem)" }}
          >
            O HealthOS orquestra ServiceActors e EntityActors em um sistema cognitivo completo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {stages.map((stage, index) => {
            const Icon = stage.icon
            
            return (
              <div
                key={stage.id}
                className="relative group"
              >
                <div className="neumorphic rounded-[--radius-lg] p-8 transition-all duration-500 hover:shadow-[10px_10px_20px_rgba(163,177,198,0.2),-10px_-10px_20px_rgba(255,255,255,0.8)]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-accent" weight="duotone" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-xl">{stage.title}</h3>
                        <span 
                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                            stage.status === "Live" 
                              ? "bg-green-100 text-green-700" 
                              : stage.status === "Beta"
                              ? "bg-blue-100 text-blue-700"
                              : stage.status === "Desenvolvimento"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {stage.status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                </div>

                <svg 
                  className="absolute pointer-events-none hidden md:block" 
                  style={{ 
                    left: "100%", 
                    top: "50%", 
                    width: "100px", 
                    height: "2px",
                    opacity: stage.connections.length > 0 ? 0.3 : 0
                  }}
                >
                  <line 
                    x1="0" 
                    y1="0" 
                    x2="100" 
                    y2="0" 
                    stroke="oklch(0.80 0.07 260)" 
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>
            )
          })}
        </div>

        <div className="mt-20 text-center">
          <div className="inline-block neumorphic rounded-[--radius-lg] px-8 py-6">
            <p className="text-sm text-muted-foreground mb-2">Total Addressable Market</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
              $127B
            </p>
            <p className="text-sm text-muted-foreground mt-2">Healthcare IT no Brasil até 2030</p>
          </div>
        </div>
      </div>
    </section>
  )
}
