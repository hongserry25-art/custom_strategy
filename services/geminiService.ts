
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GrowthStage } from "../types";

export const analyzeStock = async (ticker: string, customMethodology?: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. 상단의 'API 키 설정' 버튼을 이용해주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const baseInstruction = `
    당신은 월가 수준의 퀀트 투자 전문가입니다. 
    티커 "${ticker}"에 대해 다음 방법론을 적용하여 JSON 보고서를 작성하세요.
    반드시 한국어로 답변하고, 숫자는 2026년 추정치를 반영하십시오.
  `;

  const methodologyText = customMethodology 
    ? `[업로드된 커스텀 방법론 지침]\n${customMethodology}`
    : `[기본 올랜도 킴 방법론]\n- TAM/SAM/SOM 규모 산출\n- S-Curve 성장 단계 판단\n- LTV/CAC 유닛 이코노믹스 검증`;

  const systemInstruction = `
    ${baseInstruction}
    ${methodologyText}
    
    출력은 반드시 유효한 JSON 형식이어야 하며 마크다운 코드 블록(예: \`\`\`json)을 포함하지 마십시오.
    구글 검색(googleSearch)을 활용해 최신 2024-2025 실적과 2026 가이던스를 참고하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: `미국 주식 ${ticker}의 정량 분석 결과(2026 추정치 포함)를 JSON으로 생성해줘.`,
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
        throw new Error("분석 데이터를 읽을 수 없습니다. (JSON 파싱 실패)");
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
