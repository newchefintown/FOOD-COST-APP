import { GoogleGenAI, Type } from "@google/genai";
import { Ingredient, Unit } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Flash for speed and efficiency in generating structured data
const MODEL_NAME = "gemini-2.5-flash";

export const generateRecipeDraft = async (recipeName: string, existingIngredients: Ingredient[]) => {
  try {
    const existingNames = existingIngredients.map(i => i.name).join(", ");
    
    const prompt = `
      Create a detailed professional restaurant recipe for "${recipeName}".
      
      I have an inventory with these ingredients: ${existingNames}. 
      Try to use existing ingredients where possible, but add new ones if strictly necessary.
      
      Return a JSON object with:
      1. description: A short appetizing description.
      2. servings: Default to 4.
      3. ingredients: A list of ingredients. For each, provide:
         - name: Ingredient name
         - quantity: Amount needed
         - unit: Metric unit (g, ml, pc)
         - estimatedCost: An estimated market cost in Indonesian Rupiah (IDR) for the quantity used.
      4. instructions: Brief cooking steps.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            servings: { type: Type.NUMBER },
            instructions: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  estimatedCost: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeProfitability = async (recipeName: string, cost: number, price: number) => {
  try {
    const prompt = `
      I am selling "${recipeName}".
      My total cost per serving is Rp ${cost.toLocaleString('id-ID')}.
      My selling price is Rp ${price.toLocaleString('id-ID')}.
      The currency is Indonesian Rupiah.
      
      Analyze this pricing. Is the profit margin healthy for a typical restaurant? 
      Give me 3 short, bulleted suggestions to improve profitability or value perception.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Could not generate analysis at this time.";
  }
};