
import React, { useState, useRef } from 'react';
import { Search, Loader2, BarChart3, TrendingUp, Info, Target, Activity, DollarSign, Key, AlertTriangle, FileUp, CheckCircle2, FileText } from 'lucide-react';
import { analyzeStock } from './services/geminiService';
import { AnalysisResult } from './types';
import StockDashboard from './components/StockDashboard';

// Removing local interface and global Window extension to resolve conflicting declaration errors.
// The platform already provides these types; using casting where needed to satisfy TypeScript.

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
    };
    reader.readAsText(file);
  };

  const handleOpenKeyDialog = async () => {
    try {
      // Using type assertion to access the globally available aistudio object
      await (window as any).aistudio.openSelectKey();
      setError(null);
      setIsQuotaExceeded(false);
    } catch (err) {
      console.error("Failed to open key dialog", err);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;
    if (!methodology) {
      setError("분석 방법론 파일을 먼저 업로드해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIsQuotaExceeded(false);
    setResult(null);

    try {
      // Check if API key is selected before proceeding
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        // Proceeding after openSelectKey as per "Race condition" guideline
      }

      const data = await analyzeStock(ticker.toUpperCase(), methodology);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err?.message || "";
      // Enhanced error checking including "Requested entity was not found." as per guidelines
      if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted")) {
        setIsQuotaExceeded(true);
        setError("API 사용량이 초과되었습니다. 원활한 분석을 위해 본인의 API 키를 연결해주세요.");
      } else if (errorMessage.includes("Requested entity was not found.")) {
        setError("API 키 설정에 문제가 있습니다. 다시 설정해주세요.");
        await (window as any).aistudio.openSelectKey();
      } else {
        setError("분석에 실패했습니다. 파일 내용이나 티커를 확인하고 다시 시도해주세요.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
      <div className="flex justify-end mb-8">
        <button 
          onClick={handleOpenKeyDialog}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all shadow-lg"
        >
          <Key size={14} className="text-blue-400" />
          API 키 설정
        </button>
      </div>

      <header className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 mb-6">
          <TrendingUp className="text-white" size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          커스텀 <span className="text-blue-500">전략 분석기</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          업로드한 분석 방법론을 AI가 학습하여 종목을 정밀 분석합니다.
        </p>
      </header>

      <div className="max-w-xl mx-auto mb-16 space-y-6">
        {/* Methodology File Upload Section */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer group flex flex-col items-center justify-center text-center ${methodology ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 hover:border-blue-500/50 bg-slate-800/50 hover:bg-slate-800'}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".txt,.md,.doc,.docx" 
            className="hidden" 
          />
          {methodology ? (
            <>
              <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
              <p className="text-emerald-400 font-bold mb-1">방법론 업로드 완료</p>
              <p className="text-slate-500 text-xs truncate max-w-full">{methodologyFileName}</p>
            </>
          ) : (
            <>
              <FileUp size={32} className="text-slate-500 group-hover:text-blue-500 mb-2 transition-colors" />
              <p className="text-slate-300 font-bold mb-1">분석 방법론 파일 업로드</p>
              <p className="text-slate-500 text-xs">.txt, .md 파일을 드래그하거나 클릭하세요</p>
            </>
          )}
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="relative group">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="분석할 미국 주식 티커 (예: TSLA)"
              className="w-full h-16 pl-14 pr-32 bg-slate-800 border-2 border-slate-700 rounded-2xl text-xl font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all group-hover:border-slate-600 shadow-xl"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={24} />
            <button
              type="submit"
              disabled={isAnalyzing || !methodology}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg"
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
              {isQuotaExceeded ? '할당량 초과' : '오류 발생'}
            </div>
            <p className="text-sm opacity-90">{error}</p>
            {isQuotaExceeded && (
              <button onClick={handleOpenKeyDialog} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl transition-all shadow-lg">
                내 API 키 연결하여 계속하기
              </button>
            )}
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-24 h-24 border-8 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-8"></div>
          <h3 className="text-xl font-bold text-white mb-2">업로드한 방법론을 바탕으로 분석 중...</h3>
          <p className="text-slate-400 text-center max-w-sm">
            제공된 텍스트에서 분석 규칙을 추출하여 {ticker.toUpperCase()}에 대입하고 있습니다.
          </p>
        </div>
      )}

      {result && <StockDashboard data={result} />}

      {!result && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
          <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl text-center">
            <FileText className="mx-auto mb-4 text-blue-400" size={32} />
            <h4 className="font-bold mb-2">방법론 기반 분석</h4>
            <p className="text-xs text-slate-500">당신만의 분석 로직을 파일로 전달하세요.</p>
          </div>
          <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl text-center">
            <Target className="mx-auto mb-4 text-emerald-400" size={32} />
            <h4 className="font-bold mb-2">정밀 데이터 추출</h4>
            <p className="text-xs text-slate-500">구글 검색을 통한 최신 재무 지표 반영.</p>
          </div>
          <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl text-center">
            <Activity className="mx-auto mb-4 text-amber-400" size={32} />
            <h4 className="font-bold mb-2">실시간 검증</h4>
            <p className="text-xs text-slate-500">2026년 가이던스 기반 미래 가치 산출.</p>
          </div>
        </div>
      )}

      <footer className="mt-20 py-10 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p>© 2026 Custom Stock Methodology Analyzer. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
