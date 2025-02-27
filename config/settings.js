import fs from "fs/promises";
import dotenv from "dotenv";
import { log } from "../utils/tools.js";

dotenv.config();

export const rateLimitConfig = {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 10000,
  requestsPerMinute: 15,
  intervalBetweenCycles: 15000,
  walletVerificationRetries: 3,
};

export const agents = {
  deployment_R89FtdnXa7jWWHyr97WQ9LKG: "Professo",
  deployment_fseGykIvCLs3m9Nrpe9Zguy9: "Crypto Buddy",
  deployment_zs6OE0EdBuQuit8KK0V10dJT: "Sherlock",
};

export const groqConfig = {
  apiKey: process.env.GROQ_API_KEY || "请设置 GROQ_API_KEY",
  model: "mixtral-8x7b-32768",
  temperature: 0.7,
};

export const proxyList = []; 

export const loadProxies = async () => {
  try {
    const data = await fs.readFile("proxies.txt", "utf-8");
    return data.split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(proxy => {
        if (proxy.includes('://')) {
          const url = new URL(proxy);
          const protocol = url.protocol.replace(':', '');
          const auth = url.username ? `${url.username}:${url.password}@` : '';
          const host = url.hostname;
          const port = url.port;
          return { protocol, host, port, auth };
        } else {
          const parts = proxy.split(':');
          let [protocol, host, port, user, pass] = parts;
          protocol = protocol.replace('//', '');
          const auth = user && pass ? `${user}:${pass}@` : '';
          return { protocol, host, port, auth };
        }
      });
  } catch (err) {
    log("proxies.txt 为空或未找到有效代理，将直接使用本地连接", "warn");
    return [];
  }
};

export const refCode = {
  code: "CuEPgRvm" 
};
