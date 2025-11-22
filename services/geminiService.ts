import { GoogleGenAI, Chat } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";

// --- CẢNH BÁO CỦA ÔNG LÃO ---
// Việc gắn cứng Key vào đây giúp chạy ngay (Mỳ ăn liền)
// Nhưng nếu public code này lên mạng, kẻ gian sẽ lấy mất Key.
// Hãy cẩn trọng!
const HARDCODED_KEY = 'AIzaSyAYCGnkZcHK1W2f4MwUog5mELnbCHAgwhk'; 

let ai: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

// Placeholder check to see if env key is valid
const getEnvKey = () => {
  // 1. Ưu tiên Key "gắn cứng" của tiểu hữu
  if (HARDCODED_KEY && HARDCODED_KEY.startsWith('AIza')) {
    return HARDCODED_KEY;
  }

  // 2. Check process.env.API_KEY
  const envKey = process.env.API_KEY;
  if (envKey && envKey !== 'REPLACE_WITH_ACTUAL_KEY_DURING_DEPLOYMENT' && envKey.length > 10) {
    return envKey;
  }
  
  // 3. Check window.process.env.API_KEY (injected via index.html)
  // @ts-ignore
  const windowEnvKey = window.process?.env?.API_KEY;
  if (windowEnvKey && windowEnvKey !== 'REPLACE_WITH_ACTUAL_KEY_DURING_DEPLOYMENT' && windowEnvKey.length > 10) {
    return windowEnvKey;
  }
  
  return null;
};

/**
 * Initialize the GenAI instance with a specific key
 */
export const initializeGenAI = (apiKey: string) => {
  if (!apiKey) return;
  // IMPORTANT: Trim whitespace which is a common copy-paste error
  const cleanKey = apiKey.trim();
  ai = new GoogleGenAI({ apiKey: cleanKey });
  chatSession = null; // Reset session on new key
};

/**
 * Check if we have a valid instance
 */
export const hasValidSession = (): boolean => {
  return !!ai;
};

/**
 * Initializes or retrieves the current chat session.
 */
export const getChatSession = (): Chat => {
  // 1. If instance doesn't exist, try to init from Hardcode, Env or LocalStorage
  if (!ai) {
    const envKey = getEnvKey(); // Now includes HARDCODED_KEY
    const localKey = localStorage.getItem('GEMINI_API_KEY');
    
    // Priority: 
    // 1. LocalStorage (User manually entered a new key override)
    // 2. Hardcoded Key / Env Var
    const finalKey = localKey || envKey;
    
    if (finalKey) {
      initializeGenAI(finalKey);
    } else {
      throw new Error("MISSING_API_KEY");
    }
  }

  if (!ai) throw new Error("MISSING_API_KEY");

  if (!chatSession) {
    chatSession = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 1.2,
        topK: 40,
        topP: 0.95,
      },
    });
  }
  return chatSession;
};

/**
 * Resets the chat session.
 */
export const resetChatSession = () => {
  chatSession = null;
  try {
    return getChatSession();
  } catch (e) {
    return null;
  }
};