
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GrowthStage } from "../types";

export const analyzeStock = async (ticker: string, methodology: string): Promise<AnalysisResult> => {
  // Always create a new instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toLocaleDateString('ko-KR');
  
  const systemInstruction = `
    당신은 세계 최고의 퀀트 투자 분석가입니다. 
    사용자가 제공한 [분석 방법론]을 바탕으로 주식 티커 "${ticker}"를 심층 분석하십시오.
    
    [분석 방법론 지침]
    ${methodology}
    
    [필독 지침]
    1. 반드시 위의 [분석 방법론]에 명시된 모든 정량적, 정성적 기준을 적용하십시오.
    2. 언어: 모든 텍스트는 반드시 **한국어**로 작성하십시오.
    3. 수치 근거: 모든 데이터(TAM, SAM, SOM, LTV, CAC 등)는 최신 공시 자료와 2026년 가이던스를 바탕으로 추정하고 그 근거를 명확히 기술하십시오.
    4. 시점: 현재 날짜는 ${today}입니다.
    5. 출력 형식: 반드시 순수 JSON 형식으로만 응답하십시오. 다른 설명이나 텍스트를 포함하지 마십시오.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `티커 ${ticker}에 대해 제공된 방법론을 적용하여 지정된 JSON 스키마에 맞춰 상세한 분석 보고서를 작성해줘.`,
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
  
  // When using googleSearch grounding, the response text might sometimes contain grounding notes 
  // or citations that can interfere with pure JSON parsing. We try a direct parse first, then fallback to extraction.
  try {
    data = JSON.parse(rawText);
  } catch (parseError) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        data = JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        throw new Error("분석 데이터 파싱에 실패했습니다: JSON 구조가 올바르지 않습니다.");
      }
    } else {
      throw new Error("분석 결과에서 유효한 데이터를 찾을 수 없습니다.");
    }
  }
  
  // Extract URLs from groundingChunks as required by the search grounding guidelines.
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const searchSources = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title || "출처",
      uri: chunk.web.uri
    }));

  return {
    ...data,
    sources: [...(data.sources || []), ...searchSources]
  };
};
