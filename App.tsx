
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, BarChart3, TrendingUp, Key, AlertTriangle, Target, Activity, ShieldCheck, Upload, FileText, CheckCircle2, X, ExternalLink, RefreshCcw } from 'lucide-react';
import { analyzeStock } from './services/geminiService';
import { AnalysisResult } from './types';
import StockDashboard from './components/StockDashboard';

const App: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isPlatformSupport, setIsPlatformSupport] = useState(false);
  const [customMethodology, setCustomMethodology] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // aistudio 환경(API 키 선택 도구) 지원 여부 확인
    const checkPlatform = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.openSelectKey === 'function') {
        setIsPlatformSupport(true);
      }
    };
    checkPlatform();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) { // 2MB 제한
      setError("파일 크기가 너무 큽니다. 2MB 이하의 텍스트 파일만 가능합니다.");
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCustomMethodology(content);
      setError(null);
    };
    reader.readAsText(file);
  };

  const removeFile = () => {
    setUploadedFileName(null);
    setCustomMethodology('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      }
    } else {
      window.open('https://ai.google.dev/gemini-api/docs/billing', '_blank');
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;

    setIsAnalyzing(true);
    setIsQuotaExceeded(false);
    setAnalysisStep('서버와 세션 연결 중...');
    setError(null);
    setResult(null);

    const stepInterval = setInterval(() => {
      const steps = [
        '시장 데이터 검색 및 수집 중...',
        '2026년 정량적 추정치 계산 중...',
        '업로드된 분석 방법론 매칭 중...',
        '유닛 이코노믹스 건전성 평가 중...',
        '분석 보고서 최종 렌더링 중...'
      ];
      setAnalysisStep(prev => {
        const idx = steps.indexOf(prev);
        return steps[(idx + 1) % steps.length] || steps[0];
      });
    }, 5000);

    try {
      // 90초 타임아웃 (Pro 모델 및 검색은 시간이 더 소요됨)
      const analysisPromise = analyzeStock(cleanTicker, customMethodology);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), 90000)
      );

      const data = await Promise.race([analysisPromise, timeoutPromise]) as AnalysisResult;
      setResult(data);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      let errorMessage = err?.message || String(err);
      
      // JSON 에러 메시지 파싱 시도
      try {
        if (errorMessage.startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          errorMessage = parsed.error?.message || errorMessage;
        }
      } catch (e) {}

      if (errorMessage === "TIMEOUT") {
        setError("분석 시간이 너무 오래 걸립니다. (90초 초과) 티커를 다시 확인하거나 잠시 후 시도해주세요.");
      } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        setIsQuotaExceeded(true);
        setError("현재 공유 API 할당량이 초과되었습니다. 본인의 유료 API 키를 연결하시면 즉시 분석이 가능합니다.");
      } else if (errorMessage === "API_KEY_MISSING" || errorMessage.includes("401")) {
        setError("API 키 설정이 필요합니다. 상단의 버튼을 눌러 본인의 키를 연결해 주세요.");
      } else if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
        setError("안전 정책에 의해 분석이 차단되었습니다. 다른 종목을 시도해 주세요.");
      } else {
        setError(`분석 실패: ${errorMessage.substring(0, 150)}`);
      }
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16 bg-slate-900 min-h-screen text-slate-100 selection:bg-blue-500/30">
      <div className="flex justify-end mb-8 h-10">
        {isPlatformSupport ? (
          <button 
            onClick={handleOpenKeyDialog}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all shadow-lg active:scale-95 group"
          >
            <Key size={14} className="text-blue-400 group-hover:rotate-12 transition-transform" />
            내 API 키 설정
          </button>
        ) : (
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-400"
          >
            API 키 발급받기 <ExternalLink size={12} />
          </a>
        )}
      </div>

      <header className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-400 rounded-3xl shadow-2xl shadow-blue-500/20 mb-8 animate-pulse-slow">
          <TrendingUp className="text-white" size={40} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
          <span className="text-blue-500">텐배거 분석기</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-xl leading-relaxed font-medium">
          사용자의 분석 방법론을 학습한 AI가<br/>미국 주식의 미래 잠재력을 정밀 진단합니다.
        </p>
      </header>

      <div className="max-w-2xl mx-auto mb-20 space-y-6">
        {/* 파일 업로드 섹션 */}
        <div className={`bg-slate-800/50 border-2 border-dashed rounded-3xl p-6 transition-all ${uploadedFileName ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-700 hover:border-slate-500'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${uploadedFileName ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-500'}`}>
                {uploadedFileName ? <CheckCircle2 size={24} /> : <Upload size={24} />}
              </div>
              <div className="text-left">
                <p className={`text-sm font-bold ${uploadedFileName ? 'text-blue-400' : 'text-white'}`}>
                  {uploadedFileName ? '분석 방법론 적용됨' : '커스텀 분석법 파일 (선택)'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">업로드 시 해당 분석 기준을 최우선으로 적용합니다.</p>
              </div>
            </div>
            {!uploadedFileName ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-black rounded-xl transition-all whitespace-nowrap active:scale-95"
              >
                파일 선택
              </button>
            ) : (
              <button onClick={removeFile} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
                <X size={14} /> 취소
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".txt,.md"
            />
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="relative group">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="미국 주식 티커 입력 (예: PLTR, NVDA)"
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
          <div className={`p-6 border rounded-2xl flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-300 ${isQuotaExceeded ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-lg shadow-amber-500/5' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>
            <AlertTriangle size={32} className={isQuotaExceeded ? 'animate-bounce' : ''} />
            <div className="space-y-1.5">
              <p className="text-sm font-black">{isQuotaExceeded ? '공유 할당량이 모두 소진되었습니다' : '분석 중 오류 발생'}</p>
              <p className="text-xs opacity-80 leading-relaxed max-w-sm">{error}</p>
            </div>
            {isQuotaExceeded && (
              <div className="flex flex-col gap-2 w-full">
                <button 
                  onClick={handleOpenKeyDialog}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95"
                >
                  <Key size={18} />
                  내 전용 API 키로 즉시 사용하기
                </button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-amber-600/70 hover:underline">
                  본인 키 사용 가이드 (무료/유료 플랜 확인)
                </a>
              </div>
            )}
            {!isQuotaExceeded && (
              <button 
                onClick={() => setError(null)} 
                className="text-xs opacity-50 hover:opacity-100 underline"
              >
                닫기
              </button>
            )}
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
          <div className="relative mb-10">
            <div className="w-28 h-28 border-8 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="text-blue-500 animate-pulse" size={36} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white mb-4">정밀 퀀트 분석 진행 중</h3>
          <p className="text-blue-400 font-bold flex items-center gap-2 h-6 animate-pulse">
            <RefreshCcw className="animate-spin" size={16} />
            {analysisStep}
          </p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md w-full">
             <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 text-xs text-slate-400 flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
               실시간 구글 검색 엔진 연결됨
             </div>
             <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 text-xs text-slate-400 flex items-center gap-3">
               <div className={`w-2 h-2 rounded-full ${customMethodology ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-slate-600"}`} />
               {customMethodology ? "커스텀 분석법 로드 완료" : "올랜도 킴 기본 모델"}
             </div>
          </div>
        </div>
      )}

      {result && <StockDashboard data={result} />}

      {!result && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-slate-800/30 border border-slate-700/30 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-blue-500/30">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <Target className="text-blue-400" size={32} />
            </div>
            <h4 className="font-black text-white mb-3 text-lg text-blue-500">TAM/SAM/SOM</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">최신 공시 자료를 검색하여 미래 도달 가능한 시장 규모를 정량적으로 도출합니다.</p>
          </div>
          <div className="p-8 bg-slate-800/30 border border-slate-700/30 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-emerald-500/30">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <Activity className="text-emerald-400" size={32} />
            </div>
            <h4 className="font-black text-white mb-3 text-lg text-emerald-500">Unit Economics</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">LTV/CAC 비율 및 공헌 이익률을 분석하여 비즈니스의 이익 체력을 진단합니다.</p>
          </div>
          <div className="p-8 bg-slate-800/30 border border-slate-700/30 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-amber-500/30">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <ShieldCheck className="text-amber-400" size={32} />
            </div>
            <h4 className="font-black text-white mb-3 text-lg text-amber-500">커스텀 파일 분석</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">본인만의 분석 가이드가 담긴 파일을 올리면 AI가 그 규칙대로 종목을 해부합니다.</p>
          </div>
        </div>
      )}

      <footer className="mt-32 py-12 border-t border-slate-800 text-center text-slate-600 text-xs">
        <p className="font-bold tracking-widest text-slate-500">ORLANDO KIM QUANT SYSTEM v2.5</p>
        <p className="mt-4 max-w-lg mx-auto leading-relaxed">이 시스템은 Gemini 3 Pro 모델과 구글 검색 기능을 사용하여 정량적 추정치를 제공합니다. 투자의 최종 결정은 본인의 책임하에 이루어져야 합니다.</p>
      </footer>
    </div>
  );
};

export default App;
