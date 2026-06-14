export default function EventCoverDefault({ className = "w-full h-full" }: { className?: string }) {
  return (
    <div className={`${className} relative overflow-hidden`}
      style={{ background: "linear-gradient(135deg, #06080f 0%, #0c0a16 100%)" }}>

      {/* Dekorative SVG-Elemente (kein externes Bild nötig) */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 680 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ecd-teal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="ecd-red" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b2020" stopOpacity="0"/>
            <stop offset="100%" stopColor="#8b2020" stopOpacity="0.2"/>
          </linearGradient>
          <linearGradient id="ecd-div" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0"/>
            <stop offset="30%" stopColor="#14b8a6" stopOpacity="0.6"/>
            <stop offset="70%" stopColor="#8b2020" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#8b2020" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="ecd-top" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0"/>
            <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Diagonale Farbbänder */}
        <polygon points="0,0 320,0 0,400" fill="url(#ecd-teal)"/>
        <polygon points="680,0 360,0 680,400" fill="url(#ecd-red)"/>

        {/* Punkt-Grids */}
        <g fill="#ffffff" fillOpacity="0.04">
          <circle cx="40" cy="40" r="1.2"/><circle cx="80" cy="40" r="1.2"/><circle cx="120" cy="40" r="1.2"/>
          <circle cx="40" cy="80" r="1.2"/><circle cx="80" cy="80" r="1.2"/><circle cx="120" cy="80" r="1.2"/>
          <circle cx="40" cy="120" r="1.2"/><circle cx="80" cy="120" r="1.2"/><circle cx="120" cy="120" r="1.2"/>
          <circle cx="40" cy="280" r="1.2"/><circle cx="80" cy="280" r="1.2"/><circle cx="120" cy="280" r="1.2"/>
          <circle cx="40" cy="320" r="1.2"/><circle cx="80" cy="320" r="1.2"/><circle cx="120" cy="320" r="1.2"/>
          <circle cx="40" cy="360" r="1.2"/><circle cx="80" cy="360" r="1.2"/><circle cx="120" cy="360" r="1.2"/>
          <circle cx="560" cy="40" r="1.2"/><circle cx="600" cy="40" r="1.2"/><circle cx="640" cy="40" r="1.2"/>
          <circle cx="560" cy="80" r="1.2"/><circle cx="600" cy="80" r="1.2"/><circle cx="640" cy="80" r="1.2"/>
          <circle cx="560" cy="120" r="1.2"/><circle cx="600" cy="120" r="1.2"/><circle cx="640" cy="120" r="1.2"/>
          <circle cx="560" cy="280" r="1.2"/><circle cx="600" cy="280" r="1.2"/><circle cx="640" cy="280" r="1.2"/>
          <circle cx="560" cy="320" r="1.2"/><circle cx="600" cy="320" r="1.2"/><circle cx="640" cy="320" r="1.2"/>
          <circle cx="560" cy="360" r="1.2"/><circle cx="600" cy="360" r="1.2"/><circle cx="640" cy="360" r="1.2"/>
        </g>

        {/* Diagonale Akzentlinien links */}
        <line x1="-60" y1="0" x2="160" y2="400" stroke="#14b8a6" strokeOpacity="0.07" strokeWidth="0.6"/>
        <line x1="-20" y1="0" x2="200" y2="400" stroke="#14b8a6" strokeOpacity="0.05" strokeWidth="0.6"/>
        <line x1="20" y1="0" x2="240" y2="400" stroke="#14b8a6" strokeOpacity="0.03" strokeWidth="0.6"/>

        {/* Diagonale Akzentlinien rechts */}
        <line x1="740" y1="0" x2="520" y2="400" stroke="#8b2020" strokeOpacity="0.08" strokeWidth="0.6"/>
        <line x1="700" y1="0" x2="480" y2="400" stroke="#8b2020" strokeOpacity="0.05" strokeWidth="0.6"/>
        <line x1="660" y1="0" x2="440" y2="400" stroke="#8b2020" strokeOpacity="0.03" strokeWidth="0.6"/>

        {/* Eckschnitte */}
        <line x1="0" y1="28" x2="28" y2="0" stroke="#14b8a6" strokeOpacity="0.4" strokeWidth="0.8"/>
        <line x1="0" y1="22" x2="22" y2="0" stroke="#14b8a6" strokeOpacity="0.2" strokeWidth="0.5"/>
        <line x1="680" y1="28" x2="652" y2="0" stroke="#8b2020" strokeOpacity="0.4" strokeWidth="0.8"/>
        <line x1="680" y1="22" x2="658" y2="0" stroke="#8b2020" strokeOpacity="0.2" strokeWidth="0.5"/>
        <line x1="0" y1="372" x2="28" y2="400" stroke="#14b8a6" strokeOpacity="0.4" strokeWidth="0.8"/>
        <line x1="680" y1="372" x2="652" y2="400" stroke="#8b2020" strokeOpacity="0.4" strokeWidth="0.8"/>

        {/* Obere Akzentlinie */}
        <line x1="0" y1="1" x2="680" y2="1" stroke="url(#ecd-top)" strokeWidth="1"/>

        {/* Trennlinie über Text */}
        <line x1="140" y1="330" x2="540" y2="330" stroke="url(#ecd-div)" strokeWidth="0.8"/>

        {/* Seitenmarker */}
        <rect x="0" y="185" width="3" height="30" rx="1.5" fill="#14b8a6" fillOpacity="0.7"/>
        <rect x="677" y="185" width="3" height="30" rx="1.5" fill="#8b2020" fillOpacity="0.7"/>

        {/* Text */}
        <text x="340" y="358" textAnchor="middle"
          fontFamily="system-ui,ui-sans-serif,sans-serif"
          fontSize="10" fontWeight="700" letterSpacing="5"
          fill="#ffffff" fillOpacity="0.22">OMA COMPANION</text>
        <circle cx="164" cy="354" r="2" fill="#14b8a6" fillOpacity="0.5"/>
        <circle cx="516" cy="354" r="2" fill="#8b2020" fillOpacity="0.5"/>
      </svg>

      {/* Logo als normales img — lädt unabhängig vom SVG */}
      <img
        src="/OMALogoNew.png"
        alt="OMA Companion"
        className="absolute w-[30%] h-auto"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -54%)" }}
      />
    </div>
  );
}
