
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GrowthStage } from "../types";

export const analyzeStock = async (ticker: string, customMethodology?: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key must be set. 상단의 API 키 설정 버튼을 눌러주세요.");
  }

  // 매 요청마다 새 인스턴스 생성하여 최신 키 반영
  const ai = new GoogleGenAI({ apiKey });
  
  const defaultMethodology = `
    - 시장 규모 (TAM, SAM, SOM): 2026년 기준의 달러($B) 단위 예상치를 산출하십시오.
    - 성장 단계: S-Curve 및 시장 침투율을 기반으로 판단하십시오.
    - 유닛 이코노믹스: LTV, CAC, 공헌 이익률 등을 2026년 가이던스 추정치로 계산하십시오.
    - 매수 전략: 현재 주가 상황을 반영하여 단기/중기/장기 전략을 수립하십시오.
  `;

  const methodologyToUse = customMethodology ? `사용자가 제공한 다음 분석 방법론을 엄격히 적용하십시오:\n${customMethodology}` : `기본 분석 방법론(올랜도 킴 모델)을 적용하십시오:\n${defaultMethodology}`;

  const systemInstruction = `
    당신은 세계 최고의 퀀트 투자 분석가입니다.
    입력된 티커 "${ticker}"를 다음 방법론에 따라 심층 분석하여 정량적 데이터를 도출하십시오.

    [적용할 분석 방법론]
    ${methodologyToUse}

    [출력 규칙]
    - 반드시 **한국어**로 답변하십시오.
    - 출력은 **순수 JSON**이어야 합니다. 마크다운 코드 블록을 사용하지 마십시오.
    - googleSearch 도구를 사용하여 최신 시장 데이터와 2026년 추정치를 반영하십시오.
  `;

  try {
    // 무한 로딩 해결을 위해 응답 속도가 빠른 gemini-3-flash-preview 사용
    // 복잡한 분석을 위해 필요한 경우 gemini-3-pro-preview로 변경 가능하나, 현재는 안정성 우선
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: `미국 주식 ${ticker}에 대해 제공된 방법론을 적용한 상세 정량 보고서를 JSON으로 작성해줘.`,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        // thinkingConfig 제거하여 지연 시간 단축
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
      data = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch (parseError) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("분석 데이터를 파싱하는 데 실패했습니다.");
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
