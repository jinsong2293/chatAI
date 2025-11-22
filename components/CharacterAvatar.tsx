import React, { useEffect, useState, useRef } from 'react';
import { Emotion } from '../types';

interface CharacterAvatarProps {
  isStreaming: boolean;
  isLoading: boolean;
  emotion: Emotion;
}

const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ isStreaming, isLoading, emotion }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle Eye Blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (!isLoading && emotion !== 'surprised' && emotion !== 'angry') {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      }
    }, 3500 + Math.random() * 2000); // Random blink interval
    return () => clearInterval(blinkInterval);
  }, [emotion, isLoading]);

  // Handle Mouse Move for 3D Parallax (Head following mouse)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / 18; 
        const y = (e.clientY - rect.top - rect.height / 2) / 18;
        setMousePos({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // --- DYNAMIC STYLING LOGIC ---

  const isAngry = emotion === 'angry';
  const isSad = emotion === 'sad';
  
  // Head Animation logic
  // When loading, we use a fixed position for the "thinking" pose
  const headRotateX = isLoading 
    ? -8 
    : Math.max(Math.min(-mousePos.y, 15), -15);

  const headRotateY = isLoading
    ? 5
    : Math.max(Math.min(mousePos.x, 20), -20);

  // Head Tilt (Z-axis) for extra expression
  let headRotateZ = 0;
  if (emotion === 'happy') headRotateZ = 5; // Jaunty tilt
  if (emotion === 'sad') headRotateZ = -5; // Droopy tilt
  if (isLoading) headRotateZ = -2;
  if (isAngry) headRotateZ = 0; // Shake handles Z

  // Body Colors
  const skinColorLight = isAngry ? "#fee2e2" : "#ffedd5";
  const skinColorDark = isAngry ? "#fca5a5" : "#fdba74";
  const robeColor = isAngry ? "#7f1d1d" : "#065f46"; // Red vs Green
  const robeHighlight = isAngry ? "#b91c1c" : "#10b981";

  // Expression Logic
  let mouthPath = "";
  let eyebrowRotate = 0;
  let eyebrowY = 0;

  // Logic for Wrinkles (New)
  const showWrinkles = isAngry || isSad || isLoading;

  // Default Eyes (Circles)
  const renderEye = (side: 'left' | 'right') => {
    const cx = side === 'left' ? 85 : 115;
    
    if (emotion === 'happy') {
       // Inverted U for happy eyes ^ ^
       return <path d={`M${cx-8},95 Q${cx},85 ${cx+8},95`} fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />;
    }
    
    if (emotion === 'sad') {
      // U shape for sad T T
       return <path d={`M${cx-8},95 Q${cx},100 ${cx+8},95`} fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />;
    }

    // Standard Eye (Circle + Pupil)
    let scaleY = blink ? 0.1 : 1;
    if (emotion === 'surprised') scaleY = 1.3;
    if (emotion === 'angry') scaleY = 0.8;

    // Pupil shift
    const pupilX = isLoading ? (side === 'left' ? -1 : 1) : mousePos.x / 3;
    const pupilY = isLoading ? 4 : mousePos.y / 3; // Look down when thinking

    return (
      <g transform={`translate(${cx}, 95) scale(1, ${scaleY})`}>
        <circle r="8" fill="white" />
        <circle cx={pupilX} cy={pupilY} r={emotion === 'surprised' ? 2 : 3.5} fill="#1e293b" />
        <circle cx={pupilX + 2} cy={pupilY - 2} r="1.5" fill="white" opacity="0.7" />
      </g>
    );
  };

  // Mouth shapes
  if (isStreaming) {
    mouthPath = "M92,125 Q100,135 108,125 Q100,115 92,125"; // Talking O
  } else if (isLoading) {
    mouthPath = "M95,128 Q100,125 105,128"; // Small line (pursed lips)
  } else if (emotion === 'happy') {
    mouthPath = "M90,125 Q100,135 110,125"; // Smile
  } else if (emotion === 'angry') {
    mouthPath = "M90,130 Q100,120 110,130"; // Frown
  } else if (emotion === 'surprised') {
    mouthPath = "M95,125 Q100,140 105,125"; // O
  } else {
    mouthPath = "M92,128 Q100,130 108,128"; // Neutral
  }

  // Eyebrows
  if (emotion === 'angry') { eyebrowRotate = 20; eyebrowY = 5; }
  if (emotion === 'sad') { eyebrowRotate = -15; eyebrowY = -2; }
  if (emotion === 'surprised') { eyebrowY = -8; }
  if (isLoading) { eyebrowRotate = 5; eyebrowY = -3; } // One brow raised look

  // Animation Class selection
  let animationClass = 'animate-meditate-3d'; // Default breathing
  if (isLoading) {
    animationClass = 'animate-think-3d';
  } else if (emotion === 'angry') {
    animationClass = 'animate-shake-3d';
  }

  return (
    <div 
      ref={containerRef}
      className={`perspective-container relative w-full h-full flex items-center justify-center transition-all duration-500 ${animationClass}`}
    >
      {/* Glow effects */}
      <div className={`absolute w-[60%] h-[60%] rounded-full blur-3xl opacity-40 -z-10 transition-colors duration-700 ${emotion === 'angry' ? 'bg-red-500' : emotion === 'happy' ? 'bg-amber-300' : 'bg-emerald-300'}`} />

      <svg 
        viewBox="0 0 200 200" 
        className="w-full h-full overflow-visible drop-shadow-2xl"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <defs>
          {/* 3D Gradients */}
          <radialGradient id="skinGradient" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor={skinColorLight} />
            <stop offset="60%" stopColor={skinColorDark} />
            <stop offset="100%" stopColor={isAngry ? "#ef4444" : "#fb923c"} />
          </radialGradient>
          
          <radialGradient id="robeGradient" cx="70%" cy="30%" r="90%">
            <stop offset="0%" stopColor={robeHighlight} />
            <stop offset="70%" stopColor={robeColor} />
            <stop offset="100%" stopColor="#022c22" />
          </radialGradient>

          <linearGradient id="beardGradient" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          
          <filter id="shadowBlur">
             <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
             <feOffset dx="1" dy="3" result="offsetblur"/>
             <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
             </feComponentTransfer>
             <feMerge> 
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/> 
             </feMerge>
          </filter>
        </defs>

        {/* --- BODY GROUP (Anchored) --- */}
        <g transform="translate(100, 170)">
          {/* Robe Body */}
          <path 
            d="M-40,0 Q-50,-50 0,-60 Q50,-50 40,0 Z" 
            fill="url(#robeGradient)" 
            filter="url(#shadowBlur)"
          />
          {/* Inner Collar */}
          <path d="M-20,-50 L0,-30 L20,-50" fill="none" stroke="white" strokeWidth="4" opacity="0.8" />
        </g>

        {/* --- LEFT HAND (Holds Staff/Gourd) --- */}
        <g transform="translate(60, 150)">
          <circle r="10" fill="url(#skinGradient)" filter="url(#shadowBlur)" />
          
          {/* Staff Group - Animated */}
          <g className="animate-staff">
             {/* Staff Stick */}
             <rect x="-4" y="-60" width="8" height="100" rx="4" fill="#d97706" />
             {/* Gourd top of staff */}
             <path d="M-8,-60 Q0,-75 8,-60 Q12,-50 0,-45 Q-12,-50 -8,-60" fill="#fcd34d" transform="translate(-3, -10)" />
          </g>
        </g>

        {/* --- RIGHT HAND (Gestures) --- */}
        {/* Moves based on emotion */}
        <g 
          transform={`translate(140, ${emotion === 'happy' ? 140 : 150})`} 
          className={emotion === 'happy' ? 'animate-fan' : ''}
        >
          {isLoading ? (
             // Thinking hand gesture (moved to chin and animated)
             <g className="animate-stroke-beard">
                <circle r="10" fill="url(#skinGradient)" filter="url(#shadowBlur)" />
             </g>
          ) : (
             // Fan Object (or just resting hand if not happy)
             <g>
                <circle r="10" fill="url(#skinGradient)" filter="url(#shadowBlur)" />
                {emotion === 'happy' && (
                   <path d="M0,0 L20,-30 Q35,-40 50,-30 L40,10 Z" fill="#fcd34d" stroke="#b45309" strokeWidth="2" transform="rotate(-20)" />
                )}
             </g>
          )}
        </g>

        {/* --- HEAD GROUP (Moves 3D) --- */}
        <g 
           style={{ 
             transform: `translate(100px, 100px) rotateX(${headRotateX}deg) rotateY(${headRotateY}deg) rotateZ(${headRotateZ}deg)`,
             transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' // Bouncy transition
           }}
        >
            {/* Hair Bun (Behind) */}
            <circle cx="0" cy="-45" r="25" fill="#cbd5e1" filter="url(#shadowBlur)" />
            <rect x="-30" y="-50" width="60" height="10" rx="5" fill="#64748b" />

            {/* Face Shape */}
            <circle r="55" fill="url(#skinGradient)" filter="url(#shadowBlur)" />

            {/* Ears */}
            <circle cx="-55" cy="0" r="10" fill="url(#skinGradient)" />
            <circle cx="55" cy="0" r="10" fill="url(#skinGradient)" />

            {/* Face Features Container (Slight parallax) */}
            <g transform={`translate(${isLoading ? 0 : mousePos.x / 2}, ${isLoading ? 0 : mousePos.y / 2}) translate(-100, -95)`}>
                
                {/* Forehead Wrinkles - Animated Opacity */}
                <g 
                  className={`transition-all duration-700 ease-in-out`}
                  style={{ opacity: showWrinkles ? 0.6 : 0 }}
                >
                   <path 
                      d="M82,68 Q100,76 118,68" 
                      fill="none" 
                      stroke="#7c2d12" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                   />
                   <path 
                      d="M90,60 Q100,65 110,60" 
                      fill="none" 
                      stroke="#7c2d12" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                   />
                </g>

                {/* Eyebrows */}
                <g transform={`translate(0, ${eyebrowY})`}>
                    <path 
                        d="M70,80 Q85,75 100,80" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        transform={`rotate(${eyebrowRotate}, 85, 80)`}
                        filter="url(#shadowBlur)"
                    />
                    <path 
                        d="M100,80 Q115,75 130,80" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        transform={`rotate(${-eyebrowRotate}, 115, 80)`}
                        filter="url(#shadowBlur)"
                    />
                </g>

                {/* Eyes */}
                {renderEye('left')}
                {renderEye('right')}

                {/* Moustache & Mouth */}
                <g transform="translate(0, 5)">
                   {/* Mouth */}
                   <path 
                      d={mouthPath} 
                      fill={emotion === 'surprised' || isStreaming ? "#451a03" : "none"} 
                      stroke="#451a03" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                   />

                   {/* Moustache */}
                   <path 
                      d="M65,115 Q100,105 135,115" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="6" 
                      strokeLinecap="round" 
                      filter="url(#shadowBlur)"
                   />

                   {/* Beard */}
                   <path 
                      d="M70,120 Q100,220 130,120" 
                      fill="url(#beardGradient)" 
                      filter="url(#shadowBlur)"
                      className="animate-beard"
                      style={{ transformBox: 'fill-box', transformOrigin: '100px 120px' }}
                   />
                </g>

                {/* Expression Extras */}
                {emotion === 'angry' && (
                    <path d="M130,60 L140,70 M140,60 L130,70" stroke="#b91c1c" strokeWidth="3" />
                )}
                {isLoading && (
                   <g opacity="0.8">
                      <circle cx="140" cy="60" r="4" fill="#d97706" className="animate-bounce" style={{ animationDelay: '0s' }} />
                      <circle cx="150" cy="50" r="3" fill="#d97706" className="animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <circle cx="160" cy="40" r="2" fill="#d97706" className="animate-bounce" style={{ animationDelay: '0.4s' }} />
                   </g>
                )}
            </g>
        </g>

      </svg>
    </div>
  );
};

export default CharacterAvatar;