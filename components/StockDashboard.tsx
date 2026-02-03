
import React, { useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell
} from 'recharts';
import { TrendingUp, Target, DollarSign, Activity, Info, ShieldCheck, AlertCircle, X, ChevronRight, ClipboardList, Wallet, Clock, Rocket, Briefcase, Download, Loader2, FileText, ExternalLink } from 'lucide-react';
import { AnalysisResult, GrowthStage } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  data: AnalysisResult;
}

type MetricType = 'TAM' | 'SAM' | 'SOM' | 'LTV' | 'CAC' | 'MARGIN' | 'STATUS' | null;

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}T (조 달러)`;
  } else if (value >= 1) {
    return `$${value.toFixed(2)}B (십억 달러)`;
  } else {
    return `$${(value * 1000).toFixed(0)}M (백만 달러)`;
  }
};

const StockDashboard: React.FC<Props> = ({ data }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const reportTemplateRef = useRef<HTMLDivElement>(null);

  const marketData = [
    { name: 'TAM', value: data.marketSize.tam, label: '전체 가용 시장' },
    { name: 'SAM', value: data.marketSize.sam, label: '유효 시장' },
    { name: 'SOM', value: data.marketSize.som, label: '수익 가능 시장' },
  ];

  const getStageDisplay = (stage: GrowthStage) => {
    switch (stage) {
      case GrowthStage.INTRODUCTION: return { label: '도입기', color: 'bg-blue-500', text: 'text-blue-600' };
      case GrowthStage.GROWTH: return { label: '성장기', color: 'bg-emerald-500', text: 'text-emerald-600' };
      case GrowthStage.MATURITY: return { label: '성숙기', color: 'bg-amber-500', text: 'text-amber-600' };
      default: return { label: stage, color: 'bg-slate-500', text: 'text-slate-600' };
    }
  };

  const stageInfo = getStageDisplay(data.growthStage);

  const handleDownloadPDF = async () => {
    if (!reportTemplateRef.current) return;
    
    setIsExporting(true);
    const originalStyle = reportTemplateRef.current.style.display;
    reportTemplateRef.current.style.display = 'block';

    try {
      const element = reportTemplateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`${data.ticker}_정량분석_상세보고서_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF 생성 실패:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      reportTemplateRef.current.style.display = originalStyle;
      setIsExporting(false);
    }
  };

  const metricDefinitions: Record<string, { title: string, definition: string, reasoning?: string, valueDisplay?: string }> = {
    TAM: {
      title: 'TAM (전체 가용 시장)',
      definition: '비즈니스 모델이 적용될 수 있는 가장 큰 시장 범위입니다.',
      reasoning: data.marketSize.tamReasoning,
      valueDisplay: formatCurrency(data.marketSize.tam)
    },
    SAM: {
      title: 'SAM (유효 시장)',
      definition: '비즈니스 모델이 실제로 타겟팅하고 서비스할 수 있는 시장 범위입니다.',
      reasoning: data.marketSize.samReasoning,
      valueDisplay: formatCurrency(data.marketSize.sam)
    },
    SOM: {
      title: 'SOM (수익 가능 시장)',
      definition: '현실적으로 확보 가능한 목표 시장 점유율입니다.',
      reasoning: data.marketSize.somReasoning,
      valueDisplay: formatCurrency(data.marketSize.som)
    },
    LTV: {
      title: 'LTV (고객 생애 가치)',
      definition: '한 명의 고객이 이탈하기 전까지 기업에 가져다주는 총 이익의 현재 가치입니다.',
      reasoning: data.unitEconomics.ltvReasoning,
      valueDisplay: `$${data.unitEconomics.ltv.toLocaleString()}`
    },
    CAC: {
      title: 'CAC (고객 획득 비용)',
      definition: '신규 고객 한 명을 확보하기 위해 지출되는 총 비용입니다.',
      reasoning: data.unitEconomics.cacReasoning,
      valueDisplay: `$${data.unitEconomics.cac.toLocaleString()}`
    },
    MARGIN: {
      title: '공헌 이익률',
      definition: '매출액에서 변동비를 뺀 금액이 매출에서 차지하는 비율입니다.',
      reasoning: data.unitEconomics.contributionMarginReasoning,
      valueDisplay: `${data.unitEconomics.contributionMargin}%`
    },
    STATUS: {
      title: '비즈니스 모델 안정성',
      definition: 'LTV/CAC 비율, 공헌 이익률, 성장 단계를 종합한 판단입니다.',
      reasoning: data.businessModelReasoning,
      valueDisplay: data.unitEconomics.isHealthy ? "안정적" : "주의 필요"
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* PDF Export Button */}
      <div className="flex justify-end gap-3 mb-4">
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-black transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
          전문 보고서 다운로드 (PDF)
        </button>
      </div>

      {/* Hidden PDF Template (Optimized for A4, Explicit Dark Text) */}
      <div 
        ref={reportTemplateRef} 
        style={{ display: 'none', width: '800px', padding: '40px', color: '#1e293b', backgroundColor: '#ffffff' }}
        className="font-sans"
      >
        <div style={{ borderBottom: '3px solid #3b82f6', paddingBottom: '20px', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
            {data.companyName} ({data.ticker}) 정량 분석 보고서
          </h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#475569', fontWeight: 'bold' }}>발행일: {new Date().toLocaleDateString('ko-KR')} | 분석 시점: 2026년 2월</p>
            <div style={{ backgroundColor: '#eff6ff', padding: '8px 16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb' }}>텐배거 잠재력: {data.potentialRating}/10</span>
            </div>
          </div>
        </div>

        <section style={{ marginBottom: '35px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '15px', borderLeft: '5px solid #3b82f6', paddingLeft: '12px' }}>1. 종합 투자 의견</h2>
          <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', fontStyle: 'italic', lineHeight: '1.6', marginBottom: '15px' }}>"{data.verdict}"</p>
            <div style={{ fontSize: '14px', color: '#334155', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              <p style={{ marginBottom: '4px' }}>• 성장 단계: <strong style={{ color: '#2563eb' }}>{stageInfo.label}</strong></p>
              <p style={{ marginBottom: '4px' }}>• 시장 침투율: <strong style={{ color: '#0f172a' }}>{data.penetrationRate}%</strong></p>
              <p style={{ marginBottom: '4px' }}>• 비즈니스 모델 안정성: <strong style={{ color: '#0f172a' }}>{data.businessModelReasoning}</strong></p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '35px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '15px', borderLeft: '5px solid #10b981', paddingLeft: '12px' }}>2. 시장 규모 분석 (TAM/SAM/SOM)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            {[
              { label: 'TAM (전체 가용)', val: data.marketSize.tam, color: '#3b82f6' },
              { label: 'SAM (유효 시장)', val: data.marketSize.sam, color: '#10b981' },
              { label: 'SOM (수익 가능)', val: data.marketSize.som, color: '#f59e0b' }
            ].map((m, i) => (
              <div key={i} style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '5px' }}>{m.label}</p>
                <p style={{ fontSize: '20px', fontWeight: '900', color: m.color }}>{formatCurrency(m.val)}</p>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.7' }}>
            <p style={{ marginBottom: '8px' }}><strong>• TAM 근거:</strong> {data.marketSize.tamReasoning}</p>
            <p style={{ marginBottom: '8px' }}><strong>• SAM 근거:</strong> {data.marketSize.samReasoning}</p>
            <p style={{ marginBottom: '8px' }}><strong>• SOM 근거:</strong> {data.marketSize.somReasoning}</p>
          </div>
        </section>

        <section style={{ marginBottom: '35px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '15px', borderLeft: '5px solid #f59e0b', paddingLeft: '12px' }}>3. 유닛 이코노믹스 및 수익성</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
              <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>LTV / CAC RATIO</p>
              <p style={{ fontSize: '28px', fontWeight: '900', color: data.unitEconomics.ratio >= 3 ? '#059669' : '#d97706', marginBottom: '12px' }}>{data.unitEconomics.ratio.toFixed(2)}x</p>
              <div style={{ fontSize: '13px', color: '#334155', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <p style={{ marginBottom: '4px' }}><strong>• LTV:</strong> {data.unitEconomics.ltvReasoning}</p>
                <p><strong>• CAC:</strong> {data.unitEconomics.cacReasoning}</p>
              </div>
            </div>
            <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
              <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>수익 지표</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>공헌 이익률: <span style={{ color: '#2563eb' }}>{data.unitEconomics.contributionMargin}%</span></p>
              <p style={{ fontSize: '13px', color: '#334155', marginTop: '6px', fontStyle: 'italic' }}>{data.unitEconomics.contributionMarginReasoning}</p>
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '14px', color: '#0f172a' }}>투자 회수 기간(Payback): <strong>{data.unitEconomics.paybackPeriod}개월</strong></p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '35px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '15px', borderLeft: '5px solid #6366f1', paddingLeft: '12px' }}>4. 투자 핵심 요약 (Quantitative Focus)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '14px', border: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '900', width: '120px' }}>구분</th>
                <th style={{ padding: '14px', border: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '900' }}>내용 및 근거 (2026 전망)</th>
                <th style={{ padding: '14px', border: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '12px', fontWeight: '900' }}>핵심 투자 포인트</th>
              </tr>
            </thead>
            <tbody>
              {data.investmentSummary.map((item, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '16px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#2563eb', fontSize: '14px' }}>{item.classification}</td>
                  <td style={{ padding: '16px', border: '1px solid #e2e8f0', color: '#334155', fontSize: '13px', lineHeight: '1.6' }}>{item.content}</td>
                  <td style={{ padding: '16px', border: '1px solid #e2e8f0', color: '#059669', fontWeight: 'bold', fontSize: '13px', lineHeight: '1.6' }}>{item.investmentPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '15px', borderLeft: '5px solid #ef4444', paddingLeft: '12px' }}>5. 단계별 매수 전략</h2>
          <div style={{ backgroundColor: '#fff7ed', padding: '18px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #fed7aa' }}>
            <p style={{ fontSize: '15px', color: '#9a3412', fontWeight: 'bold' }}>현재 주가 상황: <span style={{ color: '#0f172a' }}>{data.buyStrategy.currentPriceContext}</span></p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 'bold', color: '#d97706', marginBottom: '8px', fontSize: '13px' }}>단기 (3개월)</p>
              <p style={{ color: '#334155', fontSize: '12px', lineHeight: '1.5' }}>{data.buyStrategy.shortTerm}</p>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 'bold', color: '#059669', marginBottom: '8px', fontSize: '13px' }}>중기 (1년)</p>
              <p style={{ color: '#334155', fontSize: '12px', lineHeight: '1.5' }}>{data.buyStrategy.mediumTerm}</p>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '8px', fontSize: '13px' }}>장기 (3년+)</p>
              <p style={{ color: '#334155', fontSize: '12px', lineHeight: '1.5' }}>{data.buyStrategy.longTerm}</p>
            </div>
          </div>
        </section>

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
          본 보고서는 AI 기반 정량 분석 결과이며 투자 권유가 아닙니다. 모든 투자의 책임은 본인에게 있습니다.
        </div>
      </div>

      <div ref={dashboardRef} className="space-y-8 p-4 bg-slate-900 rounded-3xl">
        {/* Modal Overlay */}
        {selectedMetric && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden text-slate-100">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                <h4 className="text-xl font-bold text-white flex items-center gap-2">
                  <Info size={20} className="text-blue-400" />
                  {metricDefinitions[selectedMetric].title}
                </h4>
                <button onClick={() => setSelectedMetric(null)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <section>
                  <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">개념 정의</h5>
                  <p className="text-slate-200 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                    {metricDefinitions[selectedMetric].definition}
                  </p>
                </section>
                <section>
                  <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">분석 근거 (2026 기준)</h5>
                  <div className="text-slate-200 leading-relaxed bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                    <p className="font-bold text-blue-400 text-lg mb-3">계산값: {metricDefinitions[selectedMetric].valueDisplay}</p>
                    <p className="text-slate-300">{metricDefinitions[selectedMetric].reasoning || "해당 항목에 대한 정량적 분석 데이터가 존재하지 않습니다."}</p>
                  </div>
                </section>
              </div>
              <div className="p-4 bg-slate-900/30 border-t border-slate-700 flex justify-end">
                <button onClick={() => setSelectedMetric(null)} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all">확인</button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard UI Cards */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 opacity-5">
            <TrendingUp size={240} />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <h2 className="text-4xl font-black text-white mb-2">{data.companyName} <span className="text-slate-500 text-2xl font-medium">({data.ticker})</span></h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase shadow-lg ${stageInfo.color} text-white`}>
                  {stageInfo.label}
                </span>
                <span className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-bold">
                  시장 침투율: <span className="text-white">{data.penetrationRate}%</span>
                </span>
              </div>
            </div>
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700 text-center min-w-[140px]">
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">텐배거 잠재력</div>
              <div className="text-5xl font-black text-blue-500">{data.potentialRating}<span className="text-slate-600 text-xl">/10</span></div>
            </div>
          </div>
          <div className="mt-6 bg-blue-500/5 rounded-2xl p-5 border border-blue-500/10">
            <div className="flex items-center gap-2 mb-2 text-blue-400 font-black text-sm">
              <ShieldCheck size={18} /> 종합 분석 결과
            </div>
            <p className="text-slate-200 leading-relaxed font-medium italic">"{data.verdict}"</p>
          </div>
        </div>

        {/* Charts & Economics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 lg:col-span-2 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black flex items-center gap-2 text-white">
                <Target size={24} className="text-blue-500" /> 시장 규모 분석 (TAM/SAM/SOM)
              </h3>
            </div>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="h-72 flex-grow bg-slate-900/50 rounded-2xl p-6 border border-slate-700/50">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marketData} layout="vertical" margin={{ left: 10, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={50} fontWeight="bold" />
                    <Tooltip 
                      cursor={{ fill: '#334155', opacity: 0.1 }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                      formatter={(value: number) => [formatCurrency(value), '시장 규모']}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={40}>
                      {marketData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={['#3b82f6', '#10b981', '#f59e0b'][index]} 
                          className="cursor-pointer hover:brightness-125 transition-all"
                          onClick={() => setSelectedMetric(entry.name as MetricType)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-72 space-y-3">
                {marketData.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedMetric(item.name as MetricType)}
                    className="w-full flex flex-col items-start p-5 rounded-2xl border border-slate-700 bg-slate-900/40 hover:bg-slate-700 hover:border-blue-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{item.name}</span>
                      <ChevronRight size={16} className="text-slate-700 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="text-xs font-bold text-slate-400 mb-1">{item.label}</div>
                    <div className="text-xl font-black text-white">{formatCurrency(item.value)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-xl">
            <h3 className="text-xl font-black mb-8 flex items-center gap-2 text-white">
              <DollarSign size={24} className="text-emerald-500" /> 유닛 이코노믹스
            </h3>
            <div className="space-y-6">
              <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-700 shadow-inner">
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">LTV / CAC 비율</div>
                <div className={`text-4xl font-black ${data.unitEconomics.ratio >= 3 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {data.unitEconomics.ratio.toFixed(1)}<span className="text-xl ml-1 text-slate-600">x</span>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button onClick={() => setSelectedMetric('LTV')} className="text-xs text-blue-400 hover:text-blue-300 font-bold underline decoration-blue-400/30">LTV 근거</button>
                  <button onClick={() => setSelectedMetric('CAC')} className="text-xs text-blue-400 hover:text-blue-300 font-bold underline decoration-blue-400/30">CAC 근거</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700 text-center cursor-pointer" onClick={() => setSelectedMetric('MARGIN')}>
                  <div className="text-slate-500 text-[10px] font-black mb-2">공헌 이익률</div>
                  <div className="text-2xl font-black text-white">{data.unitEconomics.contributionMargin}%</div>
                </div>
                <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700 text-center">
                  <div className="text-slate-500 text-[10px] font-black mb-2">투자 회수 기간</div>
                  <div className="text-2xl font-black text-white">{data.unitEconomics.paybackPeriod}개월</div>
                </div>
              </div>
              <button onClick={() => setSelectedMetric('STATUS')} className={`w-full flex items-center justify-between p-4 rounded-xl border font-bold transition-all ${data.unitEconomics.isHealthy ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' : 'text-amber-400 bg-amber-400/5 border-amber-400/20'}`}>
                <div className="flex items-center gap-2">
                  {data.unitEconomics.isHealthy ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
                  {data.unitEconomics.isHealthy ? '비즈니스 모델 안정적' : '수익 구조 개선 필요'}
                </div>
                <ChevronRight size={18} className="opacity-40" />
              </button>
            </div>
          </div>
        </div>

        {/* Investment Summary Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-xl">
          <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-white"><ClipboardList size={28} className="text-blue-500" /> 투자 핵심 요약 <span className="text-slate-500 text-sm font-medium">(Orlando Kim 모델)</span></h3>
          <div className="overflow-hidden rounded-2xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-700">
                <tr>
                  <th className="px-8 py-6 w-48">분석 항목</th>
                  <th className="px-8 py-6">정량적 데이터 (2026 전망)</th>
                  <th className="px-8 py-6">핵심 투자 포인트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data.investmentSummary.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/10 transition-colors">
                    <td className="px-8 py-6 font-black text-blue-400 bg-slate-900/20 border-r border-slate-700/30">{item.classification}</td>
                    <td className="px-8 py-6 text-slate-200">{item.content}</td>
                    <td className="px-8 py-6"><span className="font-black text-emerald-400">{item.investmentPoint}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buy Strategy Cards */}
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <h3 className="text-2xl font-black flex items-center gap-3 text-white"><Wallet size={28} className="text-amber-500" /> 단계별 매수 전략</h3>
            <div className="px-6 py-3 bg-slate-900/80 rounded-2xl border border-slate-700 text-sm shadow-inner">
              <span className="text-slate-500 font-bold mr-3">현재 상황:</span>
              <span className="text-white font-black">{data.buyStrategy.currentPriceContext}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: '단기 (3개월 이내)', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', content: data.buyStrategy.shortTerm },
              { title: '중기 (1년 이내)', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-500/10', content: data.buyStrategy.mediumTerm },
              { title: '장기 (3년 이상)', icon: Rocket, color: 'text-blue-500', bg: 'bg-blue-500/10', content: data.buyStrategy.longTerm },
            ].map((item, i) => (
              <div key={i} className="bg-slate-900/40 p-8 rounded-3xl border border-slate-700/50 hover:border-slate-500 transition-all group">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-3 ${item.bg} rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}><item.icon size={24} /></div>
                  <h4 className="font-black text-white text-lg">{item.title}</h4>
                </div>
                <p className="text-slate-400 leading-relaxed font-medium">{item.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sources Section - Essential for displaying Google Search grounding results */}
        {data.sources && data.sources.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-white">
              <ExternalLink size={24} className="text-slate-400" /> 분석 출처 및 근거 자료
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.sources.map((source, idx) => (
                <a 
                  key={idx} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 bg-slate-900/40 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-900/60 transition-all flex items-start gap-3 group"
                >
                  <div className="mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-ping" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                      {source.title}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate mt-1">
                      {source.uri}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockDashboard;
