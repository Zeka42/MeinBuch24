
import React from 'react';
import { 
  BookOpen, 
  Heart, 
  Rocket, 
  Users, 
  CheckCircle, 
  Sparkles, 
  ArrowRight, 
  PlayCircle,
  Clock,
  Layout
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- HEADER / NAVIGATION --- */}
      <header className="fixed w-full bg-white/90 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-2">
              <div className="bg-brand-600 p-2 rounded-lg text-white">
                <Heart size={24} fill="currentColor" />
              </div>
              <div>
                <span className="text-xl font-bold text-slate-800 block leading-none">Herzensbuch</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest">Platform</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={onLogin}
                className="text-slate-600 hover:text-brand-600 font-medium px-4 py-2 transition-colors"
              >
                Anmelden
              </button>
              <button 
                onClick={onRegister}
                className="bg-brand-600 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50"
              >
                Jetzt starten
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 z-0"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-100/50 to-transparent skew-x-12 transform origin-top-right z-0"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center bg-white border border-blue-200 rounded-full px-4 py-1.5 mb-8 shadow-sm animate-fade-in-up">
            <span className="flex h-2 w-2 relative mr-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-600">Dein Weg zum Amazon Bestseller</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
            Deine Herzensbotschaft <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">gebündelt als Buch.</span>
          </h1>
          
          <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed">
            Wir sind deine Geburtshelfer für dein Buch. Mit unserer Software, persönlichem Coaching und KI-Unterstützung bringen wir dein Werk in 6 Wochen in die Welt.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={onRegister}
              className="px-8 py-4 bg-brand-600 text-white text-lg font-bold rounded-xl shadow-xl hover:bg-brand-700 transition-all flex items-center justify-center"
            >
              Erstes Projekt starten <ArrowRight className="ml-2" />
            </button>
            <button className="px-8 py-4 bg-white text-slate-700 text-lg font-bold rounded-xl border border-slate-200 shadow-md hover:bg-slate-50 transition-all flex items-center justify-center">
              <PlayCircle className="mr-2 text-brand-600" /> Wie es funktioniert
            </button>
          </div>

          <div className="mt-12 flex justify-center items-center space-x-8 text-slate-400 grayscale opacity-70">
             {/* Trust Badges / Logos Placeholder */}
             <div className="flex flex-col items-center"><span className="font-serif font-bold text-xl">amazon</span><span className="text-[10px]">Kindle Direct Publishing</span></div>
             <div className="h-8 w-px bg-slate-300"></div>
             <div className="flex flex-col items-center"><span className="font-bold text-xl">KLARMEISTER</span></div>
          </div>
        </div>
      </section>

      {/* --- PROBLEM / SOLUTION (Geburtshelfer) --- */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
                <div className="absolute -inset-4 bg-brand-100 rounded-2xl transform -rotate-2"></div>
                <img 
                    src="https://images.unsplash.com/photo-1516979187457-637abb4f9353?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                    alt="Schreiben mit Herz" 
                    className="relative rounded-xl shadow-2xl"
                />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Mehr als nur Software. <br/>Wir sind deine Geburtshelfer.</h2>
              <p className="text-lg text-slate-600 mb-6">
                Ein Buch zu schreiben ist wie ein Kind in die Welt zu bringen. Es braucht Schutz, Nahrung, Anleitung und jemanden, der dir die Angst nimmt.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 bg-green-100 p-1 rounded-full text-green-600 mt-1">
                    <CheckCircle size={20} />
                  </div>
                  <span className="ml-3 text-slate-700 font-medium">Wöchentliche Online-Meetings & persönliche Betreuung</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 bg-green-100 p-1 rounded-full text-green-600 mt-1">
                    <CheckCircle size={20} />
                  </div>
                  <span className="ml-3 text-slate-700 font-medium">Intelligente Software, die dich durch den Prozess führt</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 bg-green-100 p-1 rounded-full text-green-600 mt-1">
                    <CheckCircle size={20} />
                  </div>
                  <span className="ml-3 text-slate-700 font-medium">Garantierte Veröffentlichung auf Amazon KDP</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- THE 6 WEEK PROCESS --- */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Dein Fahrplan zum Erfolg</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              In nur 5 Stunden pro Woche führen wir dich Schritt für Schritt von der Idee zum fertigen Buch.
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-brand-600 to-indigo-600 transform -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 relative z-10">
              {[
                { week: "1", title: "Herzensbotschaft", desc: "Positionierung & Idee finden", icon: <Heart className="text-red-400" /> },
                { week: "2", title: "Struktur", desc: "Gliederung & Roter Faden", icon: <Layout className="text-blue-400" /> },
                { week: "3", title: "Schreiben", desc: "KI-gestützte Texterstellung", icon: <Sparkles className="text-purple-400" /> },
                { week: "4", title: "Feinschliff", desc: "Lektorat & Überarbeitung", icon: <CheckCircle className="text-green-400" /> },
                { week: "5", title: "Cover & Design", desc: "Professioneller Look", icon: <BookOpen className="text-amber-400" /> },
                { week: "6", title: "Launch", desc: "Amazon KDP Veröffentlichung", icon: <Rocket className="text-brand-400" /> },
              ].map((step, idx) => (
                <div key={idx} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-brand-500 transition-colors text-center group">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-700 group-hover:border-brand-500 transition-colors relative">
                    {step.icon}
                    <div className="absolute -top-3 -right-3 bg-brand-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {step.week}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-16 bg-slate-800/50 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between border border-slate-700">
             <div className="flex items-center mb-6 md:mb-0">
                 <div className="bg-brand-900/50 p-3 rounded-full mr-4">
                     <Clock className="text-brand-400" size={32} />
                 </div>
                 <div>
                     <h4 className="font-bold text-xl">Wöchentlicher Zeitinvest: Nur 5 Stunden</h4>
                     <p className="text-slate-400 text-sm">Unser Prozess ist optimiert für vielbeschäftigte Menschen.</p>
                 </div>
             </div>
             <button onClick={onRegister} className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-slate-100 transition-colors">
                 Jetzt loslegen
             </button>
          </div>
        </div>
      </section>

      {/* --- SOFTWARE SHOWCASE --- */}
      <section className="py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <span className="text-brand-600 font-bold uppercase tracking-wider text-sm">Exklusive Technologie</span>
                <h2 className="text-3xl font-bold text-slate-900 mt-2">Die Herzensbuch Plattform</h2>
                <p className="text-slate-600 mt-4">Unsere eigens entwickelte Software garantiert deinen Erfolg.</p>
            </div>
            
            <div className="relative rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden max-w-5xl mx-auto">
                {/* Mockup Header */}
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                {/* Mockup Content (Screenshot simulation) */}
                <div className="aspect-video bg-white relative flex">
                     {/* Sidebar Mock */}
                     <div className="w-1/4 bg-slate-50 border-r border-slate-100 p-4 hidden md:block">
                         <div className="h-4 w-3/4 bg-slate-200 rounded mb-4"></div>
                         <div className="space-y-3">
                             {[1,2,3,4,5].map(i => (
                                 <div key={i} className="flex items-center space-x-2">
                                     <div className="w-4 h-4 bg-slate-200 rounded"></div>
                                     <div className="h-3 w-full bg-slate-100 rounded"></div>
                                 </div>
                             ))}
                         </div>
                     </div>
                     {/* Editor Mock */}
                     <div className="flex-1 p-8">
                         <div className="flex justify-between items-center mb-6">
                            <div className="h-8 w-1/3 bg-slate-100 rounded"></div>
                            <div className="flex space-x-2">
                                <div className="h-8 w-20 bg-purple-50 rounded border border-purple-100 flex items-center justify-center text-purple-400 text-xs">AI Assist</div>
                            </div>
                         </div>
                         <div className="space-y-4">
                             <div className="h-4 w-full bg-slate-50 rounded"></div>
                             <div className="h-4 w-full bg-slate-50 rounded"></div>
                             <div className="h-4 w-5/6 bg-slate-50 rounded"></div>
                             <div className="h-4 w-full bg-slate-50 rounded"></div>
                             <div className="h-24 w-full bg-blue-50/50 rounded border border-blue-100 p-4 relative">
                                 <div className="absolute top-2 right-2 text-xs text-blue-400 font-bold">AI GENERATED</div>
                                 <div className="space-y-2 opacity-50">
                                     <div className="h-3 w-full bg-blue-200 rounded"></div>
                                     <div className="h-3 w-2/3 bg-blue-200 rounded"></div>
                                 </div>
                             </div>
                         </div>
                     </div>
                     {/* Tool Mock */}
                     <div className="w-64 bg-white border-l border-slate-100 p-4 hidden lg:block">
                         <div className="bg-yellow-50 border border-yellow-100 rounded p-3 mb-3">
                             <div className="text-xs font-bold text-yellow-700 mb-1">Lektorat</div>
                             <div className="h-2 w-full bg-yellow-200 rounded"></div>
                         </div>
                     </div>
                </div>
                
                {/* Overlay Feature Badges */}
                <div className="absolute bottom-8 left-8 right-8 flex justify-center gap-4 flex-wrap">
                    <span className="px-4 py-2 bg-slate-900/90 backdrop-blur text-white rounded-full text-sm font-bold flex items-center shadow-lg"><Sparkles size={16} className="mr-2 text-purple-400"/> AI Schreibassistent</span>
                    <span className="px-4 py-2 bg-slate-900/90 backdrop-blur text-white rounded-full text-sm font-bold flex items-center shadow-lg"><Users size={16} className="mr-2 text-blue-400"/> Lektorat Integration</span>
                    <span className="px-4 py-2 bg-slate-900/90 backdrop-blur text-white rounded-full text-sm font-bold flex items-center shadow-lg"><BookOpen size={16} className="mr-2 text-green-400"/> Kapitel-Struktur</span>
                </div>
            </div>
        </div>
      </section>

      {/* --- CTA FOOTER --- */}
      <footer className="bg-slate-900 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Bist du bereit, deine Geschichte zu erzählen?</h2>
          <p className="mb-8 max-w-2xl mx-auto text-slate-400">
            Starte jetzt mit deinem Herzensbuch. Wir begleiten dich von der ersten Zeile bis zur Veröffentlichung auf Amazon.
          </p>
          <button 
            onClick={onRegister}
            className="bg-brand-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-900/50"
          >
            Jetzt kostenlos registrieren
          </button>
          
          <div className="mt-16 pt-8 border-t border-slate-800 text-sm flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2024 meinbuch24.de - Alle Rechte vorbehalten.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="hover:text-white">Impressum</a>
                <a href="#" className="hover:text-white">Datenschutz</a>
                <a href="#" className="hover:text-white">AGB</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
