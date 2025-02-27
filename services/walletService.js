import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/tools.js";
import Web3 from "web3"; // 新增依赖

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class WalletService {
  constructor() {
    this.web3 = new Web3("https://api.avax.network/ext/bc/C/rpc"); // 使用与 gokiteAi.js 相同的 RPC
  }

  async loadWallets() {
    try {
      const data = await fs.readFile("/root/KiteAI-BOT/wallets.json", "utf-8");
      const wallets = JSON.parse(data);
      if (!wallets || wallets.length === 0) {
        log("wallets.json 文件为空，未加载任何钱包地址", "warn");
        return [];
      }
      return wallets.map(wallet => ({
        address: wallet.address.toLowerCase(),
        privateKey: wallet.privateKey,
      }));
    } catch (error) {
      log(`加载钱包时出错: ${error.message}`, "error");
      return [];
    }
  }

  // 获取远程统计
  async getRemoteStats(walletAddress, privateKey) {
    const gokiteAi = new GokiteAiService(walletAddress, privateKey);
    return await gokiteAi.getStats();
  }
}

export default new WalletService();
