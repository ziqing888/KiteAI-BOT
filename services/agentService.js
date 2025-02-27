
import fetch from 'node-fetch';
import axios from "axios";
import Web3 from "web3";
import { rateLimitConfig, proxyList, loadProxies } from "../config/settings.js";
import { createAgent, sleep, log, formatError, formatStats } from "../utils/tools.js"; // 添加 formatStats
import groqService from "./groqService.js";
import walletService from "./walletService.js";

class GokiteAiService {
  constructor(walletAddress, privateKey, proxy = null) {
    this.walletAddress = walletAddress;
    this.privateKey = privateKey;
    this.proxy = proxy;
    this.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    this.axiosConfig = {
      ...(this.proxy && { agent: createAgent(this.proxy) }),
      timeout: 60000,
      headers: { "User-Agent": this.userAgent },
    };
    this.web3 = new Web3("https://api.avax.network/ext/bc/C/rpc");
    this.token = null;
    this.tokenExpiresOn = null;
  }

  async makeRequest(method, url, config = {}, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios({
          method,
          url,
          ...this.axiosConfig,
          ...config,
        });
        return response;
      } catch (error) {
        log(`{red-fg}请求失败：${error.message}{/red-fg}`, "error");
        log(`{yellow-fg}重试中... (${i + 1}/${retries}){/red-fg}`, "warn");
        await sleep(12000);
      }
    }
    return null;
  }

  generateSignature(message) {
    const { signature } = this.web3.eth.accounts.sign(message, this.privateKey);
    return signature;
  }

  async getAuthTicket() {
    log(`{cyan-fg}正在获取账号 ${this.walletAddress} 的授权票据...{/cyan-fg}`, "info");
    const nonce = `timestamp_${Date.now()}`;
    const sendData = { nonce };
    try {
      const response = await this.makeRequest(
        "POST",
        "https://api-kiteai.bonusblock.io/api/auth/get-auth-ticket",
        { data: sendData }
      );
      if (response && response.data.success === true) {
        log(`{green-fg}账号 ${this.walletAddress} 成功获取授权票据{/green-fg}`, "success");
        return { data: response.data, nonce };
      }
      log(`{red-fg}获取授权票据出错：${response?.data?.message || "未知错误"}{/red-fg}`, "error");
      return null;
    } catch (error) {
      log(`{red-fg}获取授权票据失败：${formatError(error)}{/red-fg}`, "error");
      return null;
    }
  }

  async loginWallet(signature, nonce) {
    log(`{cyan-fg}正在登录账号 ${this.walletAddress}...{/cyan-fg}`, "info");
    const sendData = {
      blockchainName: "ethereum",
      signedMessage: signature,
      nonce: nonce,
      referralId: "optionalReferral",
    };
    try {
      const response = await this.makeRequest(
        "POST",
        "https://api-kiteai.bonusblock.io/api/auth/eth",
        { data: sendData }
      );
      if (response && response.data.success === true) {
        log(`{green-fg}账号 ${this.walletAddress} 登录成功{/green-fg}`, "success");
        this.token = response.data.payload.session.token;
        this.tokenExpiresOn = new Date(response.data.payload.session.expiresOn);
        return response.data;
      }
      return false;
    } catch (error) {
      log(`{red-fg}登录失败：${formatError(error)}{/red-fg}`, "error");
      return null;
    }
  }

  async getDataAccounts() {
    log(`{cyan-fg}正在获取账号 ${this.walletAddress} 的数据...{/cyan-fg}`, "info");
    const headers = { "x-auth-token": this.token };
    try {
      const response = await this.makeRequest(
        "GET",
        "https://api-kiteai.bonusblock.io/api/kite-ai/get-status",
        { headers }
      );
      if (response && response.data.success === true) {
        log(`{green-fg}账号 ${this.walletAddress} 数据获取成功{/green-fg}`, "success");
        const stats = {
          walletAddress: this.walletAddress,
          userExp: response.data.payload.userXp || 0,
          rank: response.data.payload.rank || 0,
          dailyAgentAction: response.data.payload.dailyAgentAction || 0,
          totalAgentActions: response.data.payload.totalAgentActions || 0,
          dailyAgentActionsXp: response.data.payload.dailyAgentActionsXp || 0,
          totalAgentActionsXp: response.data.payload.totalAgentActionsXp || 0,
        };
        return stats;
      }
      return false;
    } catch (error) {
      log(`{red-fg}数据获取失败：${formatError(error)}{/red-fg}`, "error");
      return null;
    }
  }

  async refreshOrGetData() {
    if (this.tokenExpiresOn && new Date() < this.tokenExpiresOn) {
      log(`{green-fg}令牌有效，直接获取数据{/green-fg}`, "success");
      return await this.getDataAccounts();
    } else {
      log(`{yellow-fg}令牌过期，重新登录{/yellow-fg}`, "warn");
      return await this.proccesingGetDataAccount();
    }
  }

  async proccesingGetDataAccount() {
    try {
      const authTicket = await this.getAuthTicket();
      if (!authTicket) return false;
      const signature = await this.generateSignature(authTicket.data.payload);
      if (!signature) return false;
      const login = await this.loginWallet(signature, authTicket.nonce);
      if (!login) return false;
      return await this.getDataAccounts();
    } catch (error) {
      log(`{red-fg}处理账号 ${this.walletAddress} 出错：${formatError(error)}{/red-fg}`, "error");
      return false;
    }
  }

  async getStats(wallet, privateKey) {
    const proxy = await loadProxies();
    const stats = await this.refreshOrGetData();
    return stats || {
      walletAddress: wallet,
      userExp: 0,
      rank: 0,
      dailyAgentAction: 0,
      totalAgentActions: 0,
      dailyAgentActionsXp: 0,
      totalAgentActionsXp: 0,
    };
  }
}

class AgentService {
  constructor() {
    this.lastRequestTime = Date.now();
    this.timeout = 60000;
    this.proxies = proxyList;
    this.proxyIndex = 0;
  }

  async initializeProxies() {
    const dynamicProxies = await loadProxies();
    if (dynamicProxies.length > 0) {
      this.proxies = dynamicProxies;
      log(`加载了 ${dynamicProxies.length} 个网络代理`, "success");
    } else {
      this.proxies = [];
      log("无可用网络代理，将直接使用本地连接", "info");
    }
  }

  calculateDelay(attempt) {
    return Math.min(rateLimitConfig.maxDelay, rateLimitConfig.baseDelay * Math.pow(2, attempt));
  }

  async checkRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minimumInterval = 60000 / rateLimitConfig.requestsPerMinute;
    if (timeSinceLastRequest < minimumInterval) {
      await sleep(minimumInterval - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }

  getNextProxy() {
    if (!this.proxies || this.proxies.length === 0) return null;
    const proxy = this.proxies[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  async sendQuestion(agent) {
    try {
      await this.checkRateLimit();
      const question = await groqService.generateQuestion();
      const proxy = this.getNextProxy();

      const agentObj = createAgent(proxy);
      const headers = {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };
      const data = { message: question, stream: true };

      const url = `https://${agent.toLowerCase().replace("_", "-")}.stag-vxzy.zettablock.com/main`;
      log(`发送请求到: ${url}${proxy ? ` (代理: ${proxy.host}:${proxy.port})` : "（无代理，使用本地连接）"}`, "info");

      const response = await fetch(url, {
        method: 'POST',
        agent: agentObj,
        headers,
        body: JSON.stringify(data),
        timeout: this.timeout
      });

      let accumulatedResponse = "";
      for await (const chunk of response.body) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') break;
            try {
              const jsonData = JSON.parse(jsonStr);
              const content = jsonData.choices?.[0]?.delta?.content || '';
              if (content) {
                accumulatedResponse += content;
                process.stdout.write(chalk.magenta(content));
              }
            } catch (e) {
              continue;
            }
          }
        }
      }
      console.log(); 
      return { question, response: { content: accumulatedResponse.trim() || "无回答" } };
    } catch (error) {
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`请求超时，超过 ${this.timeout / 1000} 秒`);
      }
      log(`请求失败: ${formatError(error)}`, "error");
      throw error;
    }
  }

  async reportUsage(wallet, options, retryCount = 0) {
    try {
      await this.checkRateLimit();
      const proxy = this.getNextProxy();
      const payload = {
        wallet_address: wallet.toLowerCase(),
        agent_id: options.agent_id,
        request_text: options.question,
        response_text: options.response.content || "无回答",
        request_metadata: {},
      };

      log(`上报数据: ${JSON.stringify(payload)}`, "info");

      const agentObj = createAgent(proxy);
      const response = await fetch('https://quests-usage-dev.prod.zettablock.com/api/report_usage', {
        method: 'POST',
        agent: agentObj,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify(payload),
        timeout: this.timeout
      });

      if (response.status === 200) {
        log(`上报成功，状态码: ${response.status}`, "success");
        // 更新远程统计
        const walletData = await walletService.loadWallets().then(wallets => wallets.find(w => w.address === wallet));
        if (walletData && walletData.privateKey) {
          const gokiteAi = new GokiteAiService(wallet, walletData.privateKey, proxy);
          const stats = await gokiteAi.getStats(wallet, walletData.privateKey); // 传递 wallet 和 privateKey
          if (stats) {
            log(formatStats(stats), "info");
          }
        }
        return true;
      } else {
        const errorText = await response.text();
        throw new Error(`上报失败，状态码: ${response.status}，详情: ${errorText}`);
      }
    } catch (error) {
      const isRateLimit = error.message?.includes("Rate limit exceeded");
      log(`上报失败: ${formatError(error)}`, "error");
      if (isRateLimit && retryCount < rateLimitConfig.maxRetries) {
        const delay = this.calculateDelay(retryCount);
        log(`等待 ${delay / 1000} 秒后重试...`, "warn");
        await sleep(delay);
        return this.reportUsage(wallet, options, retryCount + 1);
      }
      return false;
    }
  }
}

const agentService = new AgentService();
export default agentService;
