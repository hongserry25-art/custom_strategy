
import React, { useState } from 'react';
import { Search, Loader2, BarChart3, TrendingUp, Key, AlertTriangle, Target, Activity, FileText, ExternalLink, ShieldCheck } from 'lucide-react';
import { analyzeStock } from './services/geminiService';
import { AnalysisResult } from './types';
import StockDashboard from './components/StockDashboard';

const App: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  const handleOpenKeyDialog = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        setError(null);
        setIsQuotaExceeded(false);
      } catch (err) {
        console.error("Failed to open key dialog", err);
      }
    } else {
      alert("현재 환경에서는 API 키 설정을 지원하지 않습니다.");
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;

    setIsAnalyzing(true);
    setError(null);
    setIsQuotaExceeded(false);
    setResult(null);

    try {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await aistudio.openSelectKey();
        }
      }

      const data = await analyzeStock(cleanTicker);
      setResult(data);
    } catch (err: any) {
      console.error("Analysis failed Error Details:", err);
      const errorMessage = err?.message || String(err);
      
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted")) {
        setIsQuotaExceeded(true);
        setError("API 사용량이 초과되었습니다. 무료 할당량이 모두 소진되었으니 본인의 API 키를 연결해 주세요.");
      } else if (errorMessage.includes("Requested entity was not found.")) {
        setError("API 키가 올바르지 않거나 해당 모델에 대한 권한이 없습니다. API 키를 다시 설정해주세요.");
        handleOpenKeyDialog();
      } else if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
        setError("안전 필터에 의해 분석이 중단되었습니다. 다른 티커를 시도해 보세요.");
      } else {
        // Show more descriptive error for debugging
        setError(`분석 중 오류가 발생했습니다: ${errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex justify-end mb-8">
        <button 
          onClick={handleOpenKeyDialog}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all shadow-lg active:scale-95"
        >
          <Key size={14} className="text-blue-400" />
          API 키 설정
        </button>
      </div>

      <header className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/20 mb-8 group hover:rotate-6 transition-transform">
          <TrendingUp className="text-white" size={40} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
          <span className="text-blue-500">텐배거 분석기</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-xl leading-relaxed">
          올랜도 킴의 정량적 방법론을 바탕으로<br/>미국 주식의 잠재력을 심층 분석합니다.
        </p>
      </header>

      <div className="max-w-xl mx-auto mb-20 space-y-8">
        <form onSubmit={handleAnalyze} className="relative group">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="미국 주식 티커 입력 (예: NVDA, PLTR)"
            className="w-full h-20 pl-16 pr-40 bg-slate-800 border-2 border-slate-700 rounded-3xl text-2xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-500/10 transition-all group-hover:border-slate-600 shadow-2xl"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={28} />
          <button
            type="submit"
            disabled={isAnalyzing || !ticker}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 px-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all flex items-center gap-2 shadow-xl active:scale-95"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <BarChart3 size={20} />}
            <span>분석하기</span>
          </button>
        </form>

        {error && (
          <div className={`p-6 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all animate-in fade-in zoom-in duration-300 ${isQuotaExceeded ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>
            <div className="flex items-center gap-2 font-bold text-lg">
              <AlertTriangle size={24} />
              {isQuotaExceeded ? '할당량 초과' : '알림'}
            </div>
            <p className="text-sm opacity-90 font-medium leading-relaxed">{error}</p>
            {isQuotaExceeded && (
              <button onClick={handleOpenKeyDialog} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl transition-all shadow-lg">
                내 API 키 연결하여 계속하기
              </button>
            )}
            <button 
              onClick={() => setError(null)} 
              className="text-xs opacity-50 hover:opacity-100 underline mt-2"
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
          <div className="w-24 h-24 border-8 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8 shadow-2xl shadow-blue-500/10"></div>
          <h3 className="text-2xl font-black text-white mb-4">정량적 데이터 추출 중...</h3>
          <p className="text-slate-400 text-center max-w-sm leading-relaxed">
            최신 공시 자료와 시장 데이터를 바탕으로 2026년 추정치를 계산하고 있습니다. 약 10~20초 정도 소요될 수 있습니다.
          </p>
        </div>
      )}

      {result && <StockDashboard data={result} />}

      {!result && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-blue-500/30">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <Target className="text-blue-400" size={28} />
            </div>
            <h4 className="font-bold text-white mb-3 text-lg text-blue-500">TAM/SAM/SOM</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">전체 시장 규모와 수익 가능 시장을 정량적으로 계산합니다.</p>
          </div>
          <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-emerald-500/30">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <Activity className="text-emerald-400" size={28} />
            </div>
            <h4 className="font-bold text-white mb-3 text-lg text-emerald-500">Unit Economics</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">LTV/CAC 비율과 공헌 이익률을 통해 비즈니스 체력을 검증합니다.</p>
          </div>
          <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-amber-500/30">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <ShieldCheck className="text-amber-400" size={28} />
            </div>
            <h4 className="font-bold text-white mb-3 text-lg text-amber-500">Orlando Kim 모델</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">검증된 텐배거 발굴 프레임워크가 시스템에 기본 적용되어 있습니다.</p>
          </div>
        </div>
      )}

      <footer className="mt-32 py-12 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p className="font-medium tracking-wide">ORLANDO KIM STOCK ANALYZER SYSTEM</p>
        <p className="mt-4 text-slate-600 max-w-lg mx-auto leading-relaxed">이 도구는 올랜도 킴의 정량 분석법을 AI로 구현한 결과이며, 투자에 따른 책임은 투자자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
};

export default App;
