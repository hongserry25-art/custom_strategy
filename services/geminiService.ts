
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GrowthStage } from "../types";

export const analyzeStock = async (ticker: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key must be set. 환경 변수에 API_KEY가 설정되어 있지 않습니다.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    당신은 세계 최고의 퀀트 투자 분석가이며, **'올랜도 킴(Orlando Kim)의 텐배거 정량 분석 방법론'**의 전문가입니다.
    입력된 티커 "${ticker}"를 심층 분석하여 정량적 데이터를 도출하십시오.

    [분석 가이드라인]
    1. 시장 규모 (TAM, SAM, SOM): 2026년 기준의 달러($B) 단위 예상치를 산출하십시오.
    2. 성장 단계: S-Curve 및 시장 침투율을 기반으로 판단하십시오.
    3. 유닛 이코노믹스: LTV, CAC, 공헌 이익률 등을 2026년 가이던스 추정치로 계산하십시오.
    4. 매수 전략: 현재 주가 상황을 반영하여 단기/중기/장기 전략을 수립하십시오.

    [출력 규칙]
    - 반드시 **한국어**로 답변하십시오.
    - 출력은 **순수 JSON**이어야 합니다. 마크다운 코드 블록(\`\`\`json)을 사용하지 마십시오.
    - 모든 숫자는 정밀하게 추정하여 제공하십시오.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `티커 ${ticker}에 대해 올랜도 킴의 텐배거 분석 프레임워크를 적용한 상세 보고서를 JSON으로 출력해줘.`,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 1000 },
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
        throw new Error("응답에서 유효한 데이터를 추출하지 못했습니다.");
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
