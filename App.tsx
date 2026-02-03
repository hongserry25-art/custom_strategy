
import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, BarChart3, TrendingUp, Key, AlertTriangle, Target, Activity, ShieldCheck, Upload, FileText, CheckCircle2, X, ExternalLink } from 'lucide-react';
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
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      setIsPlatformSupport(true);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 5) { // 5MB limit
      setError("파일 크기가 너무 큽니다. 5MB 이하의 텍스트 파일을 업로드해주세요.");
      return;
    }

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCustomMethodology(content);
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
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;

    setIsAnalyzing(true);
    setIsQuotaExceeded(false);
    setAnalysisStep('서버와 연결 중...');
    setError(null);
    setResult(null);

    const stepInterval = setInterval(() => {
      const steps = [
        '최신 공시 및 뉴스 데이터 수집 중...',
        '2026년 정량적 추정치 시뮬레이션 중...',
        '업로드된 분석 방법론 적용 중...',
        '유닛 이코노믹스 건전성 검증 중...',
        '최종 분석 대시보드 구성 중...'
      ];
      setAnalysisStep(prev => {
        const idx = steps.indexOf(prev);
        return steps[(idx + 1) % steps.length];
      });
    }, 4000);

    try {
      // 60초 타임아웃 설정
      const analysisPromise = analyzeStock(cleanTicker, customMethodology);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), 60000)
      );

      const data = await Promise.race([analysisPromise, timeoutPromise]) as AnalysisResult;
      setResult(data);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      let errorMessage = err?.message || String(err);
      
      // JSON 형태의 에러 메시지에서 실제 문구 추출
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error && parsed.error.message) {
          errorMessage = parsed.error.message;
        }
      } catch (e) {}

      if (errorMessage === "TIMEOUT") {
        setError("분석 시간이 너무 오래 걸립니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.");
      } else if (errorMessage.includes("quota") || errorMessage.includes("429") || errorMessage.includes("exhausted")) {
        setIsQuotaExceeded(true);
        setError("현재 공유 API 할당량이 모두 소진되었습니다. 본인의 Google AI Studio API 키를 연결하면 즉시 분석이 가능합니다.");
      } else if (errorMessage.includes("API Key") || errorMessage.includes("apiKey") || errorMessage.includes("401")) {
        setError("API 키가 유효하지 않거나 설정되지 않았습니다. 상단의 'API 키 설정'을 확인해주세요.");
      } else if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
        setError("안전 정책에 의해 해당 종목의 분석이 거부되었습니다. 다른 티커를 입력해보세요.");
      } else {
        setError(`분석 중 문제가 발생했습니다: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`);
      }
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex justify-end mb-8 h-10">
        {isPlatformSupport && (
          <button 
            onClick={handleOpenKeyDialog}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all shadow-lg active:scale-95"
          >
            <Key size={14} className="text-blue-400" />
            API 키 설정
          </button>
        )}
      </div>

      <header className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/20 mb-8 group hover:rotate-6 transition-transform">
          <TrendingUp className="text-white" size={40} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
          <span className="text-blue-500">텐배거 분석기</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-xl leading-relaxed">
          올랜도 킴 모델과 사용자의 커스텀 방법론을 결합하여<br/>미국 주식의 잠재력을 정량적으로 분석합니다.
        </p>
      </header>

      <div className="max-w-2xl mx-auto mb-20 space-y-6">
        {/* File Upload Section */}
        <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-3xl p-6 transition-all hover:border-blue-500/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-900 rounded-2xl text-blue-400">
                <Upload size={24} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">커스텀 분석 방법론 파일 (선택)</p>
                <p className="text-xs text-slate-500">파일 업로드 시 해당 내용을 분석에 즉시 반영합니다. (.txt 권장)</p>
              </div>
            </div>
            {!uploadedFileName ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-black rounded-xl transition-all whitespace-nowrap"
              >
                파일 선택
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <FileText size={14} className="text-blue-400" />
                <span className="text-xs font-bold text-blue-400 truncate max-w-[120px]">{uploadedFileName}</span>
                <button onClick={removeFile} className="text-slate-500 hover:text-white p-1">
                  <X size={14} />
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".txt,.pdf,.md"
            />
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="relative group">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="미국 주식 티커 입력 (예: NVDA, TSLA)"
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
          <div className={`p-6 border rounded-2xl flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-300 ${isQuotaExceeded ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>
            <AlertTriangle size={32} />
            <div className="space-y-2">
              <p className="text-sm font-bold">{isQuotaExceeded ? '현재 사용량이 많아 접속이 지연되고 있습니다' : '알림'}</p>
              <p className="text-xs opacity-80 leading-relaxed max-w-sm">{error}</p>
            </div>
            {isQuotaExceeded && isPlatformSupport && (
              <button 
                onClick={handleOpenKeyDialog}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Key size={18} />
                내 API 키를 연결해 즉시 사용하기
              </button>
            )}
            <button 
              onClick={() => setError(null)} 
              className="text-xs opacity-50 hover:opacity-100 underline"
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-8 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="text-blue-500 animate-pulse" size={32} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-white mb-4">정량적 분석 진행 중</h3>
          <p className="text-blue-400 font-bold flex items-center gap-2 h-6">
            <Loader2 className="animate-spin" size={16} />
            {analysisStep}
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md w-full">
             <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
               <CheckCircle2 size={14} className="text-emerald-500" /> 티커 유효성 확인 완료
             </div>
             <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
               <CheckCircle2 size={14} className={customMethodology ? "text-emerald-500" : "text-slate-600"} /> 
               {customMethodology ? "커스텀 방법론 로드 완료" : "기본 방법론 적용"}
             </div>
          </div>
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
            <p className="text-sm text-slate-500 leading-relaxed font-medium">단순 추측이 아닌 시장 데이터를 기반으로 미래 매출 규모를 추정합니다.</p>
          </div>
          <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-emerald-500/30">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <Activity className="text-emerald-400" size={28} />
            </div>
            <h4 className="font-bold text-white mb-3 text-lg text-emerald-500">Unit Economics</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">LTV/CAC 비율을 분석하여 지속 가능한 성장 모델인지 확인합니다.</p>
          </div>
          <div className="p-8 bg-slate-800/40 border border-slate-700/50 rounded-3xl text-center group hover:bg-slate-800 transition-all hover:border-amber-500/30">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
               <ShieldCheck className="text-amber-400" size={28} />
            </div>
            <h4 className="font-bold text-white mb-3 text-lg text-amber-500">AI 방법론 적용</h4>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">본인만의 분석 텍스트를 업로드하면 AI가 그 기준에 맞춰 종목을 읽어냅니다.</p>
          </div>
        </div>
      )}

      <footer className="mt-32 py-12 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p className="font-medium tracking-wide">ORLANDO KIM STOCK ANALYZER SYSTEM</p>
        <p className="mt-4 text-slate-600 max-w-lg mx-auto leading-relaxed">이 도구는 AI 기반 정량 분석 결과이며, 투자에 따른 책임은 투자자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
};

export default App;
