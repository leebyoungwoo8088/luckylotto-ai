

import React, { useEffect, useState, useRef } from 'react';
import LottoBall from './LottoBall';
import { soundManager } from '../utils/audioUtils';

interface LottoMachineProps {
  isSpinning: boolean;
  targetNumbers: number[];
  onComplete: () => void;
}

interface PhysicsBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  num: number;
  r: number; // rotation angle
  vr: number; // rotational velocity
  z: number; // depth scale
}

// Physics Constants
const DRUM_SIZE = 240;
const CENTER = DRUM_SIZE / 2;
const DRUM_RADIUS = 105; // Slightly smaller than visual container
const BALL_RADIUS = 13;  // Approx visual size radius
const GRAVITY = 0.35;
const FRICTION = 0.99; // Air resistance
const BOUNCE = 0.75;    // Restitution
const WALL_FRICTION = 0.1; // Tangential force from spinning wall
const ROTATION_SPEED = 0.15; // Speed of wall impulse

const LottoMachine: React.FC<LottoMachineProps> = ({ isSpinning, targetNumbers, onComplete }) => {
  // We use a Ref for physics state to run high-frequency updates without React render overhead lag
  const ballsRef = useRef<PhysicsBall[]>([]);
  const requestRef = useRef<number>(0);
  
  // State for rendering positions
  const [renderBalls, setRenderBalls] = useState<PhysicsBall[]>([]);
  
  // Sequence Logic
  const [placedBalls, setPlacedBalls] = useState<(number | null)[]>([null, null, null, null, null, null]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [activeBall, setActiveBall] = useState<{ number: number; x: number; y: number } | null>(null);

  // Initialize Physics Balls
  useEffect(() => {
    // Fill drum with random balls
    const initialBalls: PhysicsBall[] = [];
    // Ensure we include target numbers if they exist, plus randoms
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    
    // Create ~30 balls for the visual
    for (let i = 0; i < 30; i++) {
        // Random position within circle
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (DRUM_RADIUS - BALL_RADIUS);
        
        initialBalls.push({
            id: i,
            x: CENTER + Math.cos(angle) * r,
            y: CENTER + Math.sin(angle) * r,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            num: pool[Math.floor(Math.random() * pool.length)], // Visual number only
            r: Math.random() * 360,
            vr: (Math.random() - 0.5) * 10,
            z: Math.random() // Depth for 3D effect
        });
    }
    ballsRef.current = initialBalls;
    setRenderBalls(initialBalls);
  }, []);

  // Sound Effect Management
  useEffect(() => {
    if (isSpinning) {
        soundManager.playSpin();
    } else {
        soundManager.stopSpin();
    }
    return () => soundManager.stopSpin();
  }, [isSpinning]);

  // Physics Loop
  useEffect(() => {
    // Only run physics if spinning or balls are in the machine
    const animate = () => {
        const balls = ballsRef.current;
        const isDrumMoving = isSpinning || currentIndex >= 0;

        // Physics steps
        for (let i = 0; i < balls.length; i++) {
            const b = balls[i];

            // 1. Gravity
            b.vy += GRAVITY;

            // 2. Air Turbulence (Simulate air mix if spinning)
            if (isDrumMoving) {
                b.vx += (Math.random() - 0.5) * 0.5;
                b.vy += (Math.random() - 0.5) * 0.5;
            }

            // 3. Apply Velocity
            b.x += b.vx;
            b.y += b.vy;
            b.r += b.vr;

            // 4. Air Friction
            b.vx *= FRICTION;
            b.vy *= FRICTION;
            b.vr *= 0.95; // Rotational damping

            // 5. Wall Collisions (Circular Drum)
            const dx = b.x - CENTER;
            const dy = b.y - CENTER;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist + BALL_RADIUS > DRUM_RADIUS) {
                // Collision Normal
                const nx = dx / dist;
                const ny = dy / dist;

                // Push ball back inside
                const overlap = (dist + BALL_RADIUS) - DRUM_RADIUS;
                b.x -= nx * overlap;
                b.y -= ny * overlap;

                // Reflect velocity
                const vDotN = b.vx * nx + b.vy * ny;
                b.vx -= 2 * vDotN * nx;
                b.vy -= 2 * vDotN * ny;

                // Damping on wall bounce
                b.vx *= BOUNCE;
                b.vy *= BOUNCE;

                // Wall Friction / Rotation Impulse
                // If drum is spinning, the wall imparts tangential velocity
                if (isDrumMoving) {
                    // Tangent vector (-ny, nx)
                    const tx = -ny;
                    const ty = nx;
                    
                    b.vx += tx * ROTATION_SPEED * 5;
                    b.vy += ty * ROTATION_SPEED * 5;
                    
                    // Add spin to ball based on wall contact
                    b.vr += ROTATION_SPEED * 20;
                }
            }
        }

        // 6. Ball-to-Ball Collisions (Naive O(N^2) - OK for N=30)
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                const b1 = balls[i];
                const b2 = balls[j];

                const dx = b2.x - b1.x;
                const dy = b2.y - b1.y;
                const distSq = dx * dx + dy * dy;
                const minDist = BALL_RADIUS * 2;

                if (distSq < minDist * minDist && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    
                    // Normal vector
                    const nx = dx / dist;
                    const ny = dy / dist;

                    // Separation (prevent sticking)
                    const overlap = minDist - dist;
                    const sepX = nx * overlap * 0.5;
                    const sepY = ny * overlap * 0.5;
                    
                    b1.x -= sepX;
                    b1.y -= sepY;
                    b2.x += sepX;
                    b2.y += sepY;

                    // Relative velocity
                    const dvx = b2.vx - b1.vx;
                    const dvy = b2.vy - b1.vy;
                    
                    // Impulse
                    const p = 2 * (dvx * nx + dvy * ny) / 2; // Equal mass
                    
                    b1.vx += p * nx * BOUNCE;
                    b1.vy += p * ny * BOUNCE;
                    b2.vx -= p * nx * BOUNCE;
                    b2.vy -= p * ny * BOUNCE;

                    // Play collision sound if impact is strong enough and drum is moving
                    if (isDrumMoving) {
                        const impactSpeed = Math.sqrt(dvx*dvx + dvy*dvy);
                        if (impactSpeed > 2) {
                            soundManager.playCollision(impactSpeed);
                        }
                    }
                }
            }
        }

        requestRef.current = requestAnimationFrame(animate);
    };

    if (isSpinning || currentIndex >= 0) {
        requestRef.current = requestAnimationFrame(animate);
    }

    // Render loop - Limit react updates to 30fps to save CPU for physics
    const renderInterval = setInterval(() => {
        if (isSpinning || currentIndex >= 0) {
             setRenderBalls([...ballsRef.current]);
        }
    }, 32);

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        clearInterval(renderInterval);
    };
  }, [isSpinning, currentIndex]);


  // Reset logic for restarts
  useEffect(() => {
    if (isSpinning && currentIndex === -2) {
      setCurrentIndex(-1);
      setPlacedBalls([null, null, null, null, null, null]);
    }
  }, [isSpinning]); 

  // Sequence Controller
  useEffect(() => {
    if (isSpinning && targetNumbers.length === 6 && currentIndex === -1) {
      setPlacedBalls([null, null, null, null, null, null]);
      // Shortened Spin up time
      setTimeout(() => {
          setCurrentIndex(0);
      }, 500);
    }
  }, [isSpinning, targetNumbers, currentIndex]);

  // Ball Drop Logic
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < 6) {
      const numberToDrop = targetNumbers[currentIndex];
      
      // Calculate positions
      // Tray is 90% width.
      // Slot width is 90% / 6 = 15%.
      // Center of slot i = Margin(5%) + (15% * i) + (15%/2)
      const slotWidthPercent = 90 / 6;
      const targetSlotPercent = 5 + (currentIndex * slotWidthPercent) + (slotWidthPercent / 2);
      
      // 1. Remove one random ball from drum to simulate depletion
      if (ballsRef.current.length > 0) {
          ballsRef.current.pop();
      }

      let start = 0;
      let animationFrameId: number;

      const animateDrop = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const duration = 600;

        if (progress < duration) {
            // Single Phase: Gravity accelerated drop along the vector
            const t = progress / duration;
            const easeIn = t * t; // Quad In for gravity feel
            
            const startX = 50; // Top Pivot Center
            const startY = 180; // Top Pivot Y (End of tube)
            const endY = 445; // Target Y in tray (visually aligned with new 3D tray)
            
            // Interpolate
            const currentX = startX + ((targetSlotPercent - startX) * easeIn);
            const currentY = startY + ((endY - startY) * easeIn);
            
            setActiveBall({ number: numberToDrop, x: currentX, y: currentY });
            animationFrameId = requestAnimationFrame(animateDrop);

        } else {
            // Landed
            setActiveBall(null);
            setPlacedBalls(prev => {
                const n = [...prev];
                n[currentIndex] = numberToDrop;
                return n;
            });

            // PLAY LAND SOUND
            soundManager.playLand();
            
            // Trigger Next
            setTimeout(() => {
                if (currentIndex < 5) {
                    setCurrentIndex(prev => prev + 1);
                } else {
                    setCurrentIndex(-2); // Done
                    onComplete();
                }
            }, 500); 
        }
      };
      
      // Delay drop slightly to let nozzle move
      const delay = setTimeout(() => {
          animationFrameId = requestAnimationFrame(animateDrop);
      }, 300);

      return () => {
          clearTimeout(delay);
          cancelAnimationFrame(animationFrameId);
      };
    }
  }, [currentIndex, targetNumbers, onComplete]);

  // Tube Rotation Logic
  const getTubeRotation = () => {
    // If idle or starting, center
    if (currentIndex < 0 && currentIndex !== -2) return 0;
    
    // If finished (-2), keep looking at last slot
    const idx = currentIndex === -2 ? 5 : currentIndex;
    
    // Inverted angles for Left-to-Right sequence (Index 0 is Left)
    // Index 0 requires POSITIVE rotation (Pivot bottom moves Left) -> +41
    // Index 5 requires NEGATIVE rotation (Pivot bottom moves Right) -> -41
    const ANGLES = [41, 25, 8, -8, -25, -41];
    
    return ANGLES[idx] || 0;
  };

  return (
    <div className="relative w-full max-w-[500px] h-[520px] mx-auto perspective-1000 select-none flex flex-col items-center">
      
      {/* --- 1. THE DRUM (Top) --- */}
      <div className="relative z-20 w-[240px] h-[240px] mb-8">
        {/* Glass Sphere Container */}
        <div className={`
            absolute inset-0 rounded-full glass-drum border-[6px] border-slate-300/40
            ${isSpinning || currentIndex >= 0 ? 'animate-spin-slow' : ''}
        `}>
            {/* Highlights on the glass (rotate with drum) */}
            <div className="absolute top-4 left-6 w-16 h-8 bg-white/30 blur-md rounded-full -rotate-12"></div>
            <div className="absolute bottom-4 right-6 w-12 h-6 bg-white/10 blur-sm rounded-full -rotate-12"></div>
            
            {/* Center Axle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-400 rounded-full border border-slate-500 shadow-inner flex items-center justify-center z-50">
                <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
            </div>
        </div>

        {/* Static Ball Container (Physics World) */}
        <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden">
             {renderBalls.map((b) => (
                <div 
                    key={b.id}
                    className="absolute"
                    style={{ 
                        left: b.x, 
                        top: b.y, 
                        marginLeft: `-${BALL_RADIUS}px`, 
                        marginTop: `-${BALL_RADIUS}px`,
                        transform: `scale(${0.7 + b.z * 0.4}) rotate(${b.r}deg)` 
                    }}
                >
                    <LottoBall number={b.num} size="sm" className="opacity-90 shadow-lg" />
                </div>
            ))}
        </div>
      </div>

      {/* --- 2. The Rail & Pivoting Nozzle (Middle) --- */}
      <div className="relative w-full h-[60px] -mt-10 z-30">
          {/* Fixed Axle Bar */}
          <div className="absolute top-4 left-24 right-24 h-4 bg-slate-400 rounded-full shadow-inner border border-slate-500/50 backdrop-blur-sm z-10"></div>
          
          {/* Pivoting Nozzle System */}
          <div 
            className="absolute top-4 w-14 h-[150px] transition-transform duration-500 ease-out origin-top z-20"
            style={{ 
                left: '50%',
                transform: `translateX(-50%) rotate(${getTubeRotation()}deg)`
            }}
          >
              {/* Connector/Pivot Joint */}
              <div className="w-12 h-12 bg-slate-300 mx-auto rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.3)] border border-slate-200 flex items-center justify-center -mt-6">
                  <div className="w-8 h-8 rounded-full border border-slate-400 bg-slate-200 flex items-center justify-center">
                    <div className={`w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_red] ${isSpinning ? 'animate-pulse' : ''}`}></div>
                  </div>
              </div>
              
              {/* Vertical Transparent Tube - Shortened to 150px */}
              <div className="w-12 h-full glass-tube mx-auto -mt-2 relative flex flex-col items-center rounded-b-xl border-b border-white/20">
                   <div className="w-full h-full bg-white/5 blur-[0.5px]"></div>
              </div>
          </div>
      </div>

      {/* --- 3. The Base Table (Tray Only) - LOG WOOD STYLE --- */}
      <div className="absolute bottom-2 w-full flex flex-col items-center justify-end z-10 perspective-1000">
         
         {/* 3D Log Wood Tray */}
         <div 
            className="relative w-[90%] h-24 rounded-[30px] flex items-center justify-around px-4 shadow-[0_20px_40px_rgba(0,0,0,0.6)] border-b-8 border-b-[#3E2723]"
            style={{ 
                transform: 'rotateX(20deg)', // 3D Tilt for perspective
                transformStyle: 'preserve-3d',
                // Log Wood Texture: Base brown with linear grain and a cylindrical shading gradient
                background: `
                    linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%),
                    repeating-linear-gradient(90deg, #8D6E63 0px, #8D6E63 2px, #6D4C41 2px, #6D4C41 6px),
                    #5D4037
                `,
                backgroundBlendMode: 'overlay, normal, normal'
            }}
         >
            {/* 6 Recessed Wooden Holes */}
            {placedBalls.map((num, idx) => (
                <div key={idx} className="relative group w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
                    {/* Concave Hole (Deep Dark Wood) */}
                    <div 
                        className="absolute inset-0 rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.8),inset_0_-1px_1px_rgba(255,255,255,0.1)] border-b border-white/10"
                        style={{ background: '#2a1b12' }}
                    ></div>
                    
                    {/* Wood Ring/Rim (Lighter cut edge) */}
                    <div className="absolute -inset-1 rounded-full border border-[#A1887F]/30 opacity-60"></div>

                    {/* The Ball Sitting in the Hole */}
                    <div className="relative z-10 -mt-1">
                         {num !== null && (
                            <div className={`${currentIndex === -2 ? '' : 'animate-bounce-slight'}`}>
                                <LottoBall number={num} size="sm" className="shadow-[0_5px_10px_rgba(0,0,0,0.8)]" />
                            </div>
                         )}
                    </div>

                     {/* Slot Number Label (Engraved/Burned wood look) */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#D7CCC8] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] tracking-widest opacity-80">
                        {idx + 1}
                    </div>
                </div>
            ))}
         </div>
         
         {/* Branding - Adjusted for Wood Theme */}
         <div className="mt-4 text-xs text-[#D7CCC8] font-bold tracking-[0.3em] opacity-50 mix-blend-plus-lighter">
            LUCKY<span className="text-[#FFD700]">AI</span> SYSTEM
         </div>
      </div>

      {/* --- 4. Active Moving Ball Layer --- */}
      {activeBall && (
          <div 
            className="absolute z-40 transition-none pointer-events-none"
            style={{
                left: `${activeBall.x}%`, // % relative to container
                top: `${activeBall.y}px`, // px relative to container
                transform: 'translate(-50%, -50%)'
            }}
          >
              <LottoBall number={activeBall.number} size="md" isRolling={true} />
          </div>
      )}

    </div>
  );
};

export default LottoMachine;
