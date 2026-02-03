
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GrowthStage } from "../types";

export const analyzeStock = async (ticker: string, customMethodology?: string): Promise<AnalysisResult> => {
  // 항상 최신 API Key를 사용하기 위해 호출 시점에 process.env.API_KEY 참조
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const baseInstruction = `
    당신은 세계 최고의 주식 분석가입니다. 
    사용자가 입력한 티커 "${ticker}"에 대해 심층적인 정량 분석을 수행하십시오.
    모든 데이터는 2026년 실적 추정치(Forward Estimates)를 기반으로 산출해야 합니다.
  `;

  // 파일 내용이 있으면 그것을 최우선 지침으로 설정
  const methodologyInstruction = customMethodology 
    ? `
      [필독: 엄격 준수 분석 방법론]
      사용자가 업로드한 파일에서 추출된 다음 분석법을 **반드시 100% 적용**하여 분석하십시오:
      ---
      ${customMethodology}
      ---
      위 방법론에서 정의한 기준과 정량적 공식을 사용하여 데이터를 산출하십시오.
    `
    : `
      [기본 방법론: 올랜도 킴 모델]
      - TAM/SAM/SOM 규모 산출 (2026년 기준)
      - 성장 단계 판단 및 S-Curve 침투율 분석
      - LTV/CAC 유닛 이코노믹스 건전성 검증
    `;

  const systemInstruction = `
    ${baseInstruction}
    ${methodologyInstruction}
    
    [출력 규칙]
    - 반드시 한국어로 답변하십시오.
    - 출력 형식은 반드시 순수 JSON이어야 합니다. 마크다운 코드 블록(\`\`\`json)을 사용하지 마십시오.
    - googleSearch 도구를 사용하여 최신 뉴스, 공시 자료, 애널리스트 리포트 가이던스를 검색하십시오.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // 복잡한 정량 분석과 검색을 위해 Pro 모델 사용
      contents: `미국 주식 ${ticker}에 대해 제공된 방법론을 적용한 정량 분석 결과를 JSON으로 작성해줘. 2026년 전망치를 포함해야 해.`,
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
              }
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
                cacReasoning: { type: Type.STRING }
              }
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
                  impact: { type: Type.STRING }
                }
              }
            }
          },
          required: ["ticker", "companyName", "verdict", "potentialRating", "growthStage", "marketSize", "unitEconomics", "buyStrategy", "investmentSummary"]
        }
      }
    });

    const rawText = response.text || "";
    let data: any;
    
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      data = JSON.parse(cleaned);
    } catch (parseError) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON_PARSE_FAILED");
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
    console.error("Gemini API Error Core:", error);
    throw error;
  }
};
