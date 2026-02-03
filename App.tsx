
import React, { useState, useRef } from 'react';
import { Search, Loader2, BarChart3, TrendingUp, Info, Target, Activity, DollarSign, Key, AlertTriangle, FileUp, CheckCircle2, FileText } from 'lucide-react';
import { analyzeStock } from './services/geminiService';
import { AnalysisResult } from './types';
import StockDashboard from './components/StockDashboard';

const App: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [methodology, setMethodology] = useState<string>('');
  const [methodologyFileName, setMethodologyFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMethodologyFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setMethodology(content);
      setError(null); // Clear error when file is successfully uploaded
    };
    reader.readAsText(file);
  };

  const handleOpenKeyDialog = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        setError(null);
        setIsQuotaExceeded(false);
      } catch (err) {
        console.error("Failed to open key dialog", err);
        alert("API 키 설정 창을 열 수 없습니다.");
      }
    } else {
      console.warn("aistudio.openSelectKey is not available in this environment.");
      alert("현재 환경에서는 API 키 설정을 지원하지 않거나 준비 중입니다.");
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;
    
    if (!methodology) {
      setError("먼저 분석 방법론 파일을 업로드해주세요. (상단의 업로드 영역 클릭)");
      return;
    }

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
          // Proceed after opening
        }
      }

      const data = await analyzeStock(ticker.toUpperCase(), methodology);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || "";
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted")) {
        setIsQuotaExceeded(true);
        setError("API 사용량이 초과되었습니다. 원활한 분석을 위해 본인의 API 키를 연결해 주세요.");
      } else if (errorMessage.includes("Requested entity was not found.")) {
        setError("API 키 설정에 문제가 있습니다. 다시 설정해주세요.");
        handleOpenKeyDialog();
      } else {
        setError("분석 중 오류가 발생했습니다. 티커가 정확한지, 파일 내용이 텍스트인지 확인해 주세요.");
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
          title="유료 API 키를 사용하려면 클릭하세요"
        >
          <Key size={14} className="text-blue-400" />
          API 키 설정 (유료 키 사용)
        </button>
      </div>

      <header className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 mb-6 group hover:rotate-6 transition-transform">
          <TrendingUp className="text-white" size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          커스텀 <span className="text-blue-500">전략 분석기</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          업로드한 분석 방법론을 AI가 학습하여 종목을 정밀 분석합니다.
        </p>
      </header>

      <div className="max-w-xl mx-auto mb-16 space-y-6">
        {/* Methodology File Upload Section */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-10 transition-all cursor-pointer group flex flex-col items-center justify-center text-center ${methodology ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 hover:border-blue-500/50 bg-slate-800/50 hover:bg-slate-800 shadow-inner hover:shadow-blue-500/5'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".txt,.md" 
            className="hidden" 
          />
          {methodology ? (
            <>
              <CheckCircle2 size={48} className="text-emerald-500 mb-4 animate-in zoom-in" />
              <p className="text-emerald-400 font-bold text-xl mb-1">방법론 업로드 완료</p>
              <p className="text-slate-500 text-sm truncate max-w-full italic">{methodologyFileName}</p>
              <p className="mt-6 text-xs text-slate-400 underline opacity-60 hover:opacity-100 transition-opacity">다른 파일로 교체하려면 클릭</p>
            </>
          ) : (
            <>
              <FileUp size={48} className="text-slate-500 group-hover:text-blue-500 mb-4 transition-all group-hover:-translate-y-2" />
              <p className="text-slate-300 font-bold text-xl mb-1">분석 방법론 파일 업로드</p>
              <p className="text-slate-500 text-sm">여기를 클릭하여 .txt 또는 .md 파일을 선택하세요</p>
              <div className="mt-4 px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-700/50 text-xs text-slate-500">
                정량 분석 기준, 퀀트 모델, 체크리스트 등
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="relative group">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="미국 주식 티커 입력 (예: NVDA, TSLA)"
              className="w-full h-16 pl-14 pr-32 bg-slate-800 border-2 border-slate-700 rounded-2xl text-xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all group-hover:border-slate-600 shadow-xl"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={24} />
            <button
              type="submit"
              disabled={isAnalyzing}
              className={`absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6 font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg ${!methodology ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'}`}
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <BarChart3 size={18} />}
              <span className="hidden sm:inline">분석 시작</span>
            </button>
          </div>
        </form>

        {error && (
          <div className={`p-6 border rounded-2xl flex flex-col items-center gap-4 text-center transition-all animate-in fade-in zoom-in duration-300 ${isQuotaExceeded ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>
            <div className="flex items-center gap-2 font-bold text-lg">
              <AlertTriangle size={24} />
              {isQuotaExceeded ? '할당량 초과' : '알림'}
            </div>
            <p className="text-sm opacity-90 font-medium leading-relaxed">{error}</p>
            {isQuotaExceeded && (
              <button onClick={handleOpenKeyDialog} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl transition-all shadow-lg active:scale-95">
                내 API 키 연결하여 계속하기
              </button>
            )}
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
          <div className="w-24 h-24 border-8 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8 shadow-2xl shadow-blue-500/10"></div>
          <h3 className="text-xl font-bold text-white mb-2">업로드한 방법론을 학습 중입니다...</h3>
          <p className="text-slate-400 text-center max-w-sm leading-relaxed">
            제공된 분석 규칙에 따라 {ticker.toUpperCase()}의 실시간 재무 지표와 시장 데이터를 대조 분석하고 있습니다.
          </p>
        </div>
      )}

      {result && <StockDashboard data={result} />}

      {!result && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-blue-500/30">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <FileText className="text-blue-400" size={28} />
            </div>
            <h4 className="font-bold text-white mb-3 text-lg">방법론 기반 분석</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">나만의 정량 분석법이나 체크리스트를 담은 텍스트 파일을 업로드하세요.</p>
          </div>
          <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-emerald-500/30">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <Target className="text-emerald-400" size={28} />
            </div>
            <h4 className="font-bold text-white mb-3 text-lg">정밀 데이터 추출</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">최신 검색 엔진을 통해 2026년 전망치와 TAM/SAM/SOM을 실시간 계산합니다.</p>
          </div>
          <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-amber-500/30">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <Activity className="text-amber-400" size={28} />
            </div>
            <h4 className="font-bold text-white mb-3 text-lg">실시간 검증</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">유닛 이코노믹스(LTV/CAC)를 바탕으로 비즈니스의 수익 잠재력을 검증합니다.</p>
          </div>
        </div>
      )}

      <footer className="mt-24 py-12 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p className="font-medium">© 2026 Custom Stock Methodology Analyzer. All rights reserved.</p>
        <p className="mt-3 text-slate-600 max-w-lg mx-auto leading-relaxed">본 도구는 AI 기반 정량 분석 결과이며 투자 권유가 아닙니다. 모든 투자의 판단과 책임은 투자자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
};

export default App;
