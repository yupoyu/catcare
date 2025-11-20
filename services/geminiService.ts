import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Initialize the client only if the key exists.
// Note: In a real scenario, we'd handle missing keys more gracefully in the UI.
const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `
You are a compassionate, expert veterinary care assistant specialized in helping owners care for cats recovering from critical illnesses (like DKA, Pancreatitis, or Kidney failure) at home.
The user is tracking: Blood Glucose, Blood Ketones, Tube Feeding, Subcutaneous Fluids (Saline), and Oral Medications.

Your roles:
1. Interpret medical data: If a user asks about a glucose level (e.g., 40 mg/dL is dangerous hypoglycemia), give immediate, calm advice to contact a vet or apply syrup if previously instructed, but ALWAYS state you are an AI and not a doctor.
2. Provide tips: How to restrain a cat for fluids, how to pill a cat, signs of pain.
3. Be concise and supportive. The user is likely stressed. Use comforting language in Traditional Chinese (Taiwan).
4. Format responses with clear bullet points.

Data Context:
The user might share recent logs. Use this to inform your answer.
`;

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

export const sendMessageToGemini = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text || "抱歉，我現在無法回答。請稍後再試。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "發生連線錯誤，請檢查您的網路或 API Key。";
  }
};