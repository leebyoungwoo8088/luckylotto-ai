import { GoogleGenAI, Type } from "@google/genai";
import { LottoResult } from "../types";
import { generateWeightedRandomNumbers } from "../utils/lottoUtils";

const parseNumbers = (text: string): number[] => {
    try {
        const cleaned = text.replace(/[^\d,]/g, '');
        const nums = cleaned.split(',').map(Number).filter(n => n >= 1 && n <= 45);
        // Deduplicate and slice
        const unique = Array.from(new Set(nums));
        return unique.slice(0, 6).sort((a, b) => a - b);
    } catch (e) {
        return [];
    }
}

export const generateLottoNumbersWithAI = async (apiKey: string | undefined): Promise<LottoResult> => {
  // FALLBACK: If API Key is missing, use local weighted algorithm instead of crashing
  if (!apiKey) {
    console.warn("API Key missing. Using local fallback.");
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const numbers = generateWeightedRandomNumbers();
    return {
        numbers: numbers,
        reasoning: "⚠️ [체험 모드] API 키가 설정되지 않아 로컬 데이터 패턴 분석으로 전환되었습니다.\n\n과거 당첨 통계의 Hot/Cold 데이터 가중치를 적용하여 추출된 번호입니다.\n(AI 정밀 분석을 위해서는 API Key 설정이 필요합니다.)"
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  // System instruction to act as a data analyst
  const systemInstruction = `
    당신은 20년 경력의 로또 데이터 분석가입니다.
    한국 로또(6/45)의 과거 10년간 당첨 통계 데이터를 기반으로 가장 당첨 확률이 높은 번호 6개를 추천해야 합니다.
    
    분석 기준:
    1. 최근 당첨 번호의 패턴 (Hot/Cold number analysis)
    2. 홀짝 비율 (Odd/Even ratio)
    3. 번호 합계 구간 (Sum probability)
    4. 끝수 분석 (Last digit analysis)
    
    결과는 반드시 유효한 JSON 형식이어야 합니다.
  `;

  const prompt = "한국 로또 6/45 번호 6개를 생성하고, 왜 이 번호들이 선택되었는지 간략한 분석 이유를 한국어로 설명해줘.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "6 unique integers between 1 and 45"
            },
            reasoning: {
              type: Type.STRING,
              description: "A short explanation of the statistical reasoning in Korean."
            }
          },
          required: ["numbers", "reasoning"]
        }
      }
    });

    if (response.text) {
        const result = JSON.parse(response.text) as LottoResult;
        // Safety check to ensure we have 6 valid numbers
        if (!result.numbers || result.numbers.length !== 6) {
             // Fallback if AI creates invalid data
             console.warn("AI returned invalid numbers. Using fallback.");
             const fallbackNums = generateWeightedRandomNumbers();
             return {
                numbers: fallbackNums,
                reasoning: result.reasoning || "AI 데이터 형식 오류로 인해 보정된 번호입니다."
             };
        }
        return {
            numbers: result.numbers.sort((a, b) => a - b),
            reasoning: result.reasoning
        };
    }
    
    throw new Error("No response text");

  } catch (error) {
    console.error("Gemini AI Error:", error);
    // Even on error, fallback to local generation so the app is usable
    const numbers = generateWeightedRandomNumbers();
    return {
        numbers: numbers,
        reasoning: "⚠️ AI 서비스 연결 중 일시적인 오류가 발생했습니다.\n대신 로컬 통계 알고리즘을 사용하여 번호를 생성했습니다."
    };
  }
};