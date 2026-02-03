
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GrowthStage } from "../types";

export const analyzeStock = async (ticker: string): Promise<AnalysisResult> => {
  // 사용자의 최신 API 키를 사용하기 위해 호출 직전에 인스턴스 생성
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toLocaleDateString('ko-KR');
  
  const systemInstruction = `
    당신은 세계 최고의 퀀트 투자 분석가이며, **'올랜도 킴(Orlando Kim)의 텐배거 정량 분석 방법론'**의 권위자입니다.
    사용자가 입력한 티커 "${ticker}"를 심층 분석하여 정량적 데이터를 도출하십시오.

    [핵심 분석 항목]
    1. 시장 규모 (TAM, SAM, SOM): 2026년 기준의 달러($B) 단위 예상치를 산출하고 그 구체적인 논리적 근거를 제시하십시오.
    2. 성장 단계: S-Curve 및 시장 침투율을 기반으로 판단하십시오.
    3. 유닛 이코노믹스: LTV, CAC, 공헌 이익률, 페이백 기간을 2026년 가이던스 추정치로 계산하십시오. (LTV/CAC 비율이 3 이상이면 건강한 비즈니스로 간주)
    4. 2026년 미래 가치: 현재 주가 상황(Current Price Context)을 반영하여 매수 전략을 수립하십시오.

    [주의 사항]
    - 반드시 **한국어**로 답변하십시오.
    - 출력은 **반드시 유효한 JSON**이어야 합니다. 마크다운 코드 블록 없이 순수 JSON 문자열만 반환하십시오.
    - 최신 뉴스나 공시 자료를 검색하여 최선의 정량적 추정치를 제공하십시오.
  `;

  try {
    // googleSearch 도구는 지침에 따라 'gemini-3-pro-image-preview' 모델에서 사용해야 합니다.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: `미국 주식 ${ticker}에 대해 올랜도 킴의 텐배거 분석 프레임워크를 적용하여 상세한 정량 보고서를 JSON으로 작성해줘. 2026년 전망치와 시장 규모를 숫자로 명확히 포함해야 해.`,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        // 지연 최소화를 위해 thinkingBudget 제거 (모델이 필요 시 자동 결정)
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
              },
              required: ["currentPriceContext", "shortTerm", "mediumTerm", "longTerm"]
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
      const jsonContent = rawText.includes("```json") 
        ? rawText.split("```json")[1].split("```")[0].trim() 
        : rawText.trim();
      data = JSON.parse(jsonContent);
    } catch (parseError) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("분석 데이터를 유효한 JSON으로 파싱할 수 없습니다.");
      }
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchSources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "참조 자료",
        uri: chunk.web.uri
      }));

    return {
      ...data,
      sources: [...(data.sources || []), ...searchSources]
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
