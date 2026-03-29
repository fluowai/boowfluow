import { GoogleGenAI } from "@google/genai";

export const getGeminiResponse = async (prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. AI features will not work.");
    return "Desculpe, a chave de API da IA não foi configurada corretamente. Por favor, verifique as configurações.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "Você é o assistente oficial da Fluow Ai, uma plataforma de automação e agentes de IA para negócios. Seu objetivo é ajudar os usuários a navegar na plataforma, entender como criar agentes e dar dicas de automação. Seja profissional, prestativo e direto.",
      },
    });

    const response = await chat.sendMessage({ message: prompt });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Desculpe, tive um problema ao processar sua solicitação. Tente novamente em instantes.";
  }
};
