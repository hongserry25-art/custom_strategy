
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GrowthStage } from "../types";

export const analyzeStock = async (ticker: string): Promise<AnalysisResult> => {
  // Always create a new instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toLocaleDateString('ko-KR');
  
  const systemInstruction = `
    당신은 세계 최고의 퀀트 투자 분석가이며, **'올랜도 킴(Orlando Kim)의 텐배거 정량 분석 방법론'**의 전문가입니다.
    사용자가 입력한 티커 "${ticker}"에 대해 다음의 엄격한 정량 분석 프레임워크를 적용하여 심층 분석 보고서를 작성하십시오.

    [분석 방법론: Orlando Kim's 10-Bagger Framework]
    1. 시장 규모 분석 (TAM, SAM, SOM):
       - TAM: 해당 비즈니스가 도달 가능한 전체 시장의 총액 (Billions 단위)
       - SAM: 현재 비즈니스 모델로 타겟팅 가능한 유효 시장
       - SOM: 현실적으로 점유 가능한 수익 시장과 2026년 예상 점유율
    2. 성장 단계 (Growth Stage):
       - S-Curve를 기반으로 도입기(Introduction), 성장기(Growth), 성숙기(Maturity) 중 하나로 분류하십시오.
       - 시장 침투율(Penetration Rate)을 %로 산출하십시오.
    3. 유닛 이코노믹스 (Unit Economics):
       - LTV(고객 생애 가치)와 CAC(고객 획득 비용)의 비율을 산출하십시오. (3x 이상인 경우 건강함)
       - 공헌 이익률(Contribution Margin)과 투자 회수 기간(Payback Period)을 2026 가이던스 기반으로 추정하십시오.
    4. 가격 결정권 및 규모의 경제:
       - Pricing Power의 유무와 고정비 레버리지 효과(Economies of Scale)를 정량적으로 분석하십시오.
    5. 2026년 미래 가치 산출:
       - 현재 주가 Context와 2026년 예상 실적을 비교하여 단기/중기/장기 매수 전략을 수립하십시오.

    [필독 지침]
    1. 언어: 모든 분석 내용은 반드시 **한국어**로 작성하십시오.
    2. 근거 중심: 최신 공시 자료(10-K, 10-Q)와 실적 발표 컨퍼런스 콜, 구글 검색을 통한 최신 데이터를 바탕으로 숫자를 제시하십시오.
    3. 출력 형식: 반드시 지정된 JSON 스키마를 따르는 순수 JSON 객체만 응답하십시오.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `티커 ${ticker}에 대해 올랜도 킴의 텐배거 프레임워크를 적용하여 2026년 전망치를 포함한 상세 분석 보고서를 JSON으로 출력해줘.`,
    config: {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          companyName: { type: Type.STRING },
          verdict: { type: Type.STRING },
          potentialRating: { type: Type.NUMBER },
          growthStage: { type: Type.STRING, enum: Object.values(GrowthStage) },
          penetrationRate: { type: Type.NUMBER },
          businessModelReasoning: { type: Type.STRING },
          marketSize: {
            type: Type.OBJECT,
            properties: {
              tam: { type: Type.NUMBER },
              sam: { type: Type.NUMBER },
              som: { type: Type.NUMBER },
              description: { type: Type.STRING },
              tamReasoning: { type: Type.STRING },
              samReasoning: { type: Type.STRING },
              somReasoning: { type: Type.STRING }
            },
            required: ["tam", "sam", "som", "description"]
          },
          unitEconomics: {
            type: Type.OBJECT,
            properties: {
              ltv: { type: Type.NUMBER },
              cac: { type: Type.NUMBER },
              ratio: { type: Type.NUMBER },
              contributionMargin: { type: Type.NUMBER },
              paybackPeriod: { type: Type.NUMBER },
              isHealthy: { type: Type.BOOLEAN },
              ltvReasoning: { type: Type.STRING },
              cacReasoning: { type: Type.STRING },
              contributionMarginReasoning: { type: Type.STRING }
            },
            required: ["ltv", "cac", "ratio", "isHealthy"]
          },
          buyStrategy: {
            type: Type.OBJECT,
            properties: {
              currentPriceContext: { type: Type.STRING },
              shortTerm: { type: Type.STRING },
              mediumTerm: { type: Type.STRING },
              longTerm: { type: Type.STRING }
            }
          },
          investmentSummary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                classification: { type: Type.STRING },
                content: { type: Type.STRING },
                investmentPoint: { type: Type.STRING }
              }
            }
          },
          pricingPower: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING },
              evidence: { type: Type.STRING }
            }
          },
          economiesOfScale: {
            type: Type.OBJECT,
            properties: {
              fixedCostRatio: { type: Type.NUMBER },
              analysis: { type: Type.STRING }
            }
          },
          bepAnalysis: { type: Type.STRING },
          recentIssues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] }
              }
            }
          }
        },
        required: ["ticker", "companyName", "verdict", "potentialRating", "growthStage", "marketSize", "unitEconomics", "investmentSummary", "buyStrategy"]
      }
    }
  });

  const rawText = response.text || "";
  let data: any;
  
  try {
    data = JSON.parse(rawText);
  } catch (parseError) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        data = JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        throw new Error("분석 데이터 파싱에 실패했습니다.");
      }
    } else {
      throw new Error("분석 결과에서 데이터를 찾을 수 없습니다.");
    }
  }
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const searchSources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || "출처 자료",
      uri: chunk.web.uri
    }));

  return {
    ...data,
    sources: [...(data.sources || []), ...searchSources]
  };
};
