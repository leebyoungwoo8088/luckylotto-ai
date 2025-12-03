import React, { useState } from 'react';
import { generateLottoNumbersWithAI } from './services/geminiService';
import { generateWeightedRandomNumbers } from './utils/lottoUtils';
import LottoMachine from './components/LottoMachine';
import LottoBall from './components/LottoBall';
import { HistoryItem } from './types';
import { soundManager } from './utils/audioUtils';

// Icons
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 3.844L18 4.75l-.259-.906a3 3 0 00-2.133-2.133L14.75 1.5l.906-.259a3 3 0 002.133-2.133L18 .75l.259.906a3 3 0 002.133 2.133L21.25 1.5l-.906.259a3 3 0 00-2.133 2.133zM19.75 19.25L19.5 20.107l-.25-.857a2.25 2.25 0 00-1.607-1.607L16.75 17.5l.893-.143a2.25 2.25 0 001.607-1.607L19.5 14.893l.25.857a2.25 2.25 0 001.607 1.607l.893.143-.893.143a2.25 2.25 0 00-1.607 1.607z" />
  </svg>
);

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M6 16.5v-7.5M6 16.5h9.75M10.5 16.5v-9M10.5 7.5l9 5.25M10.5 7.5L3 7.5" />
  </svg>
);

// Safe way to get API Key without crashing if process is undefined
const getApiKey = (): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore ReferenceError
  }
  return undefined;
};

export default function App() {
  const [targetNumbers, setTargetNumbers] = useState<number[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reasoning, setReasoning] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (useAI: boolean) => {
    if (isSpinning) return;
    
    // Unlock audio context on user gesture
    soundManager.init();

    // 1. Start spinning IMMEDIATELY (UX improvement)
    setIsSpinning(true);
    setTargetNumbers([]); 
    setError(null);
    setReasoning("");
    setIsLoading(true);

    try {
      let numbers: number[] = [];
      let aiReasoning = "";

      if (useAI) {
        // Use safe getter
        const apiKey = getApiKey();
        // The service handles the fallback if the key is missing or invalid.
        const result = await generateLottoNumbersWithAI(apiKey);
        numbers = result.numbers;
        aiReasoning = result.reasoning;
      } else {
        // Random gen
        await new Promise(resolve => setTimeout(resolve, 500)); // Slight artificial delay
        numbers = generateWeightedRandomNumbers();
        aiReasoning = "과거 10년간의 당첨 통계 데이터를 기반으로 한 가중치 알고리즘(Hot/Cold Number)을 적용하여 생성되었습니다.";
      }

      setTargetNumbers(numbers);
      setReasoning(aiReasoning);

    } catch (err: any) {
      console.error(err);
      // Fallback just in case something critical failed
      const fallback = generateWeightedRandomNumbers();
      setTargetNumbers(fallback);
      setReasoning("시스템 오류로 인해 기본 생성 모드로 전환되었습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMachineComplete = () => {
     setIsSpinning(false);
     
     // Add to history only when animation completes
     if (targetNumbers.length === 6) {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            numbers: targetNumbers,
            timestamp: new Date(),
            method: reasoning.includes("API") ? 'RANDOM' : (reasoning.includes("AI") ? 'AI' : 'RANDOM'),
            reasoning
        };
        setHistory(prev => [newItem, ...prev]);
     }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center overflow-x-hidden">
      
      {/* Header */}
      <header className="pt-8 pb-4 text-center z-10 w-full max-w-4xl px-4">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 text-transparent bg-clip-text drop-shadow-[0_2px_10px_rgba(255,165,0,0.3)] mb-2 tracking-tight">
          LUCKY LOTTO AI
        </h1>
        <p className="text-slate-400 text-sm md:text-base flex justify-center items-center gap-2">
          <ChartIcon />
          <span>Gemini AI & 빅데이터 분석 기반 로또 생성기</span>
        </p>
      </header>

      <main className="flex-1 w-full max-w-5xl flex flex-col items-center justify-start p-4 space-y-6">
        
        {/* Machine Section */}
        <div className="w-full relative mt-4 mb-4 min-h-[500px] flex justify-center">
           {/* Background decorative glow */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[80px] -z-10 animate-pulse-glow"></div>
           
           <LottoMachine 
             isSpinning={isSpinning} 
             targetNumbers={targetNumbers}
             onComplete={handleMachineComplete}
           />
        </div>

        {/* Controls */}
        <section className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl justify-center items-center z-20">
           <button 
             onClick={() => handleGenerate(true)}
             disabled={isSpinning}
             className={`
               group relative flex items-center justify-center gap-3 px-8 py-5 rounded-2xl text-lg font-bold w-full sm:w-auto
               bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 
               hover:from-indigo-500 hover:to-purple-700
               border border-indigo-400/30 shadow-[0_0_20px_rgba(79,70,229,0.4)]
               transition-all transform hover:-translate-y-1 active:scale-95
               disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
             `}
           >
             <div className="absolute inset-0 rounded-2xl bg-white/20 group-hover:animate-ping opacity-0 group-hover:opacity-100 duration-700"></div>
             <SparklesIcon />
             <div className="flex flex-col items-start leading-none">
                 <span className="text-xs font-normal text-indigo-200">Gemini Pro</span>
                 <span>AI 정밀 분석 생성</span>
             </div>
           </button>

           <button 
             onClick={() => handleGenerate(false)}
             disabled={isSpinning}
             className="px-8 py-5 rounded-2xl text-lg font-bold w-full sm:w-auto
               bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300
               transition-all hover:-translate-y-1 shadow-lg active:scale-95
               disabled:opacity-50 disabled:cursor-not-allowed"
           >
             확률 기반 랜덤 생성
           </button>
        </section>

        {/* AI Reasoning / Info Display */}
        {reasoning && !isSpinning && targetNumbers.length > 0 && (
          <section className="w-full max-w-2xl bg-slate-800/60 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl animate-pop-in mt-6">
            <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
               <SparklesIcon /> 분석 리포트
            </h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm md:text-base">
              {reasoning}
            </p>
          </section>
        )}

        {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-xl backdrop-blur-sm animate-bounce-slight">
                {error}
            </div>
        )}

        {/* History List */}
        <section className="w-full max-w-2xl pt-12 border-t border-slate-800/50 mt-8">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-400">최근 당첨 예측 기록</h3>
              <span className="text-xs text-slate-600 bg-slate-800 px-2 py-1 rounded">최근 10건</span>
          </div>
          
          <div className="space-y-3">
             {history.length === 0 && <p className="text-slate-600 text-center py-8 bg-slate-800/30 rounded-xl">생성 기록이 없습니다.</p>}
             {history.map((item) => (
               <div key={item.id} className="flex flex-col md:flex-row items-center justify-between bg-slate-800/50 hover:bg-slate-800 p-4 rounded-xl border border-slate-700/50 transition-colors">
                  <div className="flex space-x-2 mb-3 md:mb-0">
                    {item.numbers.map((n) => (
                      <LottoBall key={n} number={n} size="sm" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs md:text-sm text-slate-400">
                       <span className={`px-2 py-1 rounded-md font-medium border ${item.method === 'AI' ? 'bg-indigo-900/50 border-indigo-700 text-indigo-300' : 'bg-slate-700/50 border-slate-600 text-slate-300'}`}>
                         {item.method === 'AI' ? 'AI 분석' : '확률 통계'}
                       </span>
                       <span className="opacity-60">{item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
               </div>
             ))}
          </div>
        </section>

      </main>
      
      <footer className="w-full py-6 text-center text-slate-600 text-xs mt-12 border-t border-slate-800">
          © {new Date().getFullYear()} LuckyLotto AI. Powered by Google Gemini.
      </footer>
    </div>
  );
}