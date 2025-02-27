import { Groq } from "groq-sdk";
import { groqConfig } from "../config/settings.js";
import { log } from "../utils/tools.js";

class GroqService {
  constructor() {
    this.client = new Groq({
      apiKey: groqConfig.apiKey,
    });
  }

  async generateQuestion() {
    try {
      const prompt = `生成一个关于区块链、加密货币或 Web3 技术的随机且引人入胜的问题。
                     问题需发人深省，适合 AI 助手回答。只返回问题本身，不包含其他内容。`;
      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: groqConfig.model,
        temperature: groqConfig.temperature,
      });
      return completion.choices[0]?.message?.content?.trim() || "区块链技术有哪些关键优势？";
    } catch (error) {
      log(`生成问题时出错: ${error.message}`, "error");
      return "区块链技术有哪些关键优势？";
    }
  }
}

export default new GroqService();
