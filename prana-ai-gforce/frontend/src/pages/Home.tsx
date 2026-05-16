import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Activity, BrainCircuit, BellRing, Bot, Camera, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          setActiveFeature(index);
        }
      });
    }, {
      rootMargin: '-40% 0px -40% 0px'
    });

    const elements = document.querySelectorAll('.feature-scroll-step');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-manrope animate-page-transition">
      {/* Navbar Overlay */}
      <nav className="relative z-20 w-full flex items-center justify-between px-6 md:px-[120px] py-[16px] bg-transparent">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-[20px]">PRANA</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 ml-8 mr-auto">
          <Link to="/" className="text-white font-medium text-[14px] hover:opacity-80 transition-opacity">Home</Link>
          <div className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity group">
            <Link to="/dashboard" className="text-white font-medium text-[14px]">Dashboard</Link>
            <ChevronDown className="text-white w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
          <Link to="/consultations" className="text-white font-medium text-[14px] hover:opacity-80 transition-opacity">Consultations</Link>
          <Link to="/scheduler" className="text-white font-medium text-[14px] hover:opacity-80 transition-opacity">Scheduler</Link>
          <Link to="/predict" className="text-white font-medium text-[14px] hover:opacity-80 transition-opacity">Predict</Link>
          <Link to="/autonomous-pipeline" className="text-white font-medium text-[14px] hover:opacity-80 transition-opacity">Agents</Link>
          <Link to="#about" className="text-white font-medium text-[14px] hover:opacity-80 transition-opacity">About</Link>
        </div>


        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col p-6">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-[20px]">PRANA</span>
            </div>
            <button className="text-white" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col gap-6">
            <Link to="/" className="text-white text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/dashboard" className="text-white text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            <Link to="/consultations" className="text-white text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>Consultations</Link>
            <Link to="/scheduler" className="text-white text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>Scheduler</Link>
            <Link to="/predict" className="text-white text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>Predict</Link>
            <Link to="/autonomous-pipeline" className="text-white text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>Agents</Link>
            <Link to="#about" className="text-white text-xl font-medium" onClick={() => setMobileMenuOpen(false)}>About</Link>

          </div>
        </div>
      )}

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center mt-32 px-6">
        {/* Tagline Pill */}
        <div className="flex items-center gap-2 bg-[rgba(37,99,235,0.3)] backdrop-blur-md border border-[rgba(147,197,253,0.4)] rounded-[10px] h-[38px] px-2 pr-4 mb-6">
          <div className="bg-[#2563eb] text-white font-cabin font-medium text-[12px] px-2 py-0.5 rounded-[6px]">
            AI
          </div>
          <span className="text-white font-cabin font-medium text-[14px]">
            Powered by Random Forest + SHAP Explainability
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-instrument text-white text-5xl md:text-[96px] leading-[1.1] max-w-[900px] mb-6">
          Predict patient deterioration <span className="italic pr-1">before</span> it's too late
        </h1>

        {/* Subtext */}
        <p className="font-inter font-normal text-[18px] text-white/70 max-w-[662px] mb-10">
          PRANA monitors chronic patients using 12 clinical vitals — detecting early signs of heart failure and delivering explainable, actionable risk scores to doctors in real time.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center bg-[#2563eb] text-white font-cabin font-medium text-[16px] rounded-[10px] px-6 py-3 w-full sm:w-auto hover:bg-[#3b82f6] transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/consultations"
            className="flex items-center justify-center bg-[#8b5cf6] text-white font-cabin font-medium text-[16px] rounded-[10px] px-6 py-3 w-full sm:w-auto hover:bg-[#7c3aed] transition-colors"
          >
            Consultations
          </Link>
          <Link
            to="/autonomous-pipeline"
            className="flex items-center justify-center bg-[#0f172a] text-[#f6f7f9] font-cabin font-medium text-[16px] rounded-[10px] px-6 py-3 w-full sm:w-auto hover:bg-[#1e293b] transition-colors"
          >
            Launch Agents
          </Link>
          <button 
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center justify-center bg-[#0f172a] text-[#f6f7f9] font-cabin font-medium text-[16px] rounded-[10px] px-6 py-3 w-full sm:w-auto hover:bg-[#1e293b] transition-colors"
          >
            See How It Works
          </button>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="relative z-10 w-full max-w-7xl mx-auto px-6 py-32 mt-16">
        <div className="text-center mb-16">
          <h2 className="font-instrument text-white text-4xl md:text-5xl mb-4">How PRANA Works</h2>
          <p className="font-inter text-gray-400 text-lg max-w-2xl mx-auto">
            A seamless integration of continuous wearable monitoring, advanced AI prediction, and automated emergency response.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-[#0f172a]/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:bg-[#1e293b]/80 transition-colors">
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 border border-blue-500/30">
              <Activity className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">1. Continuous Monitoring</h3>
            <p className="text-gray-400 leading-relaxed">
              Vitals such as heart rate, blood pressure, and oxygen saturation are continuously synced in real-time from the patient's smartwatch directly into the PRANA dashboard.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#0f172a]/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:bg-[#1e293b]/80 transition-colors">
            <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 border border-purple-500/30">
              <BrainCircuit className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">2. AI Risk Prediction</h3>
            <p className="text-gray-400 leading-relaxed">
              Our Random Forest model instantly processes 12 clinical parameters to calculate a Risk Score. SHAP Explainability pinpoints exactly which vitals are causing deterioration.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-[#0f172a]/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:bg-[#1e293b]/80 transition-colors">
            <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center mb-6 border border-red-500/30">
              <BellRing className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">3. Automated Alerts</h3>
            <p className="text-gray-400 leading-relaxed">
              When vitals enter a critical zone, PRANA automatically triggers immediate Pushbullet notifications and multilingual Twilio voice calls to emergency contacts.
            </p>
          </div>
        </div>
      </div>

      {/* Smart Medicine Scheduler - Apple Style Scroll */}
      <div className="relative z-10 w-full bg-gray-950/50 py-32 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 md:mb-32">
            <h2 className="font-instrument text-white text-4xl md:text-5xl mb-4">Smart Medicine Scheduler</h2>
            <p className="font-inter text-gray-400 text-lg max-w-2xl mx-auto">
              Never miss a dose again. AI-driven context and seamless automated alerts.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-12 relative">
            {/* Left side: Scrolling Text */}
            <div className="w-full md:w-1/2 flex flex-col gap-[40vh] pb-[30vh]">
               {/* Item 1 */}
               <div className="feature-scroll-step transition-opacity duration-500" data-index="0" style={{ opacity: activeFeature === 0 ? 1 : 0.3 }}>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Camera className="text-blue-400 w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">Vision AI Extraction</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">Just upload a picture of your prescription. Google Gemini Vision instantly reads the handwriting, identifies the drugs, and builds a complete dosage schedule for you automatically.</p>
               </div>
               {/* Item 2 */}
               <div className="feature-scroll-step transition-opacity duration-500" data-index="1" style={{ opacity: activeFeature === 1 ? 1 : 0.3 }}>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Bot className="text-purple-400 w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">Context-Aware Chatbot</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">Chat naturally with your schedule. Ask "What should I take next?" and our Groq-powered AI instantly cross-references your current time and schedule to give you the exact pill to take.</p>
               </div>
               {/* Item 3 */}
               <div className="feature-scroll-step transition-opacity duration-500" data-index="2" style={{ opacity: activeFeature === 2 ? 1 : 0.3 }}>
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                    <BellRing className="text-green-400 w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">Intelligent Alarms</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">If you miss a dose or enter a danger zone, PRANA automatically calls your phone directly in your native language via Twilio, ensuring you are immediately informed.</p>
               </div>
            </div>

            {/* Right side: Sticky Mockup */}
            <div className="w-full md:w-1/2 relative hidden md:block">
              <div className="sticky top-1/4 h-[60vh] w-full bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center p-8">
                 {/* Mockup State 1 */}
                 <div className={`absolute inset-0 p-8 transition-opacity duration-700 flex flex-col items-center justify-center ${activeFeature === 0 ? 'opacity-100 z-10 translate-y-0' : 'opacity-0 z-0 translate-y-8'}`}>
                    <div className="w-64 h-80 border-2 border-dashed border-gray-600 rounded-2xl flex flex-col items-center justify-center bg-gray-800/30">
                      <Camera className="w-12 h-12 text-gray-500 mb-4" />
                      <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Scanning Rx_Doc.jpg...</p>
                      <div className="w-3/4 h-2 bg-gray-700 rounded-full mt-6 overflow-hidden">
                        <div className="h-full bg-blue-500 w-2/3 animate-pulse"></div>
                      </div>
                    </div>
                 </div>

                 {/* Mockup State 2 */}
                 <div className={`absolute inset-0 p-8 transition-opacity duration-700 flex flex-col justify-center ${activeFeature === 1 ? 'opacity-100 z-10 translate-y-0' : 'opacity-0 z-0 translate-y-8'}`}>
                    <div className="w-full max-w-sm mx-auto space-y-6">
                      <div className="bg-gray-800 p-4 rounded-2xl rounded-tl-sm w-3/4 self-start shadow-lg">
                        <p className="text-sm text-white">What pill should I take next?</p>
                      </div>
                      <div className="bg-purple-600/20 border border-purple-500/30 p-5 rounded-2xl rounded-tr-sm w-5/6 self-end ml-auto shadow-lg backdrop-blur-md">
                        <p className="text-sm text-purple-100 leading-relaxed">Based on your schedule, you need to take 500mg of <strong>Metformin</strong> in 20 minutes (at 8:00 AM).</p>
                      </div>
                    </div>
                 </div>

                 {/* Mockup State 3 */}
                 <div className={`absolute inset-0 p-8 transition-opacity duration-700 flex flex-col items-center justify-center ${activeFeature === 2 ? 'opacity-100 z-10 translate-y-0' : 'opacity-0 z-0 translate-y-8'}`}>
                    <div className="w-48 h-48 bg-red-500/10 rounded-full flex items-center justify-center animate-ping border border-red-500/20">
                      <div className="w-32 h-32 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/40">
                         <BellRing className="w-12 h-12 text-red-500" />
                      </div>
                    </div>
                    <div className="mt-12 text-center bg-gray-800/80 px-6 py-3 rounded-full border border-gray-700 shadow-xl backdrop-blur-sm">
                      <span className="text-green-400 font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Twilio Voice Alert Dispatched</span>
                    </div>
                 </div>
                 
                 {/* Glass Reflection Overlay */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
