import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Scheduler from './pages/Scheduler';
import Predict from './pages/Predict';

function App() {
  return (
    <Router>
      <div className="fixed inset-0 w-full h-full -z-50 pointer-events-none">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4" type="video/mp4" />
        </video>
      </div>
      
      <div className="relative z-0 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/predict" element={<Predict />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
