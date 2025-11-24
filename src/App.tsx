import { HeroSection } from "./components/HeroSection"
import { MedScribeSection } from "./components/MedScribeSection"
import { ASLSection } from "./components/ASLSection"
import { ArchitectureSection } from "./components/ArchitectureSection"
import { EcosystemSection } from "./components/EcosystemSection"

function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <MedScribeSection />
      <ASLSection />
      <ArchitectureSection />
      <EcosystemSection />
      
      <footer className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Voither HealthOS</h3>
            <p className="text-muted-foreground">
              O primeiro Sistema Operacional Cognitivo para Saúde
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <span>© 2024 Voither</span>
            <span>•</span>
            <span>Tecnologia Invisível</span>
            <span>•</span>
            <span>Soberania do Paciente</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default App