
import chalk from "chalk";
import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const formatAddress = (address) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

export const formatDuration = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const parts = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}秒`);
  return parts.join(" ");
};

export const calculatePercentage = (part, total) => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

export const formatError = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  return error.message || "发生未知错误";
};

export const getTimestamp = () => {
  return new Date().toLocaleTimeString("zh-CN");
};


export const formatStats = (stats) => {
  return `
========================= 统计信息 =========================
钱包地址: ${formatAddress(stats.walletAddress)}
用户经验: ${stats.totalAgentActionsXp || 0}
用户排名: ${stats.rank || 0} 名
今日操作: ${stats.dailyAgentAction || 0}
总操作数: ${stats.totalAgentActions || 0}
今日经验: ${stats.dailyAgentActionsXp || 0}
总经验: ${stats.totalAgentActionsXp || 0}
=============================================================
  `;
};

export const createAgent = (proxy) => {
  if (!proxy) return null;
  const { protocol, host, port, auth } = proxy;
  const authString = auth ? `${auth}` : '';
  const proxyUrl = `${protocol}://${authString}${host}:${port}`;
  return protocol.startsWith('socks') 
    ? new SocksProxyAgent(proxyUrl)
    : new HttpsProxyAgent(proxyUrl);
};

export const log = (message, type = "info") => {
  const timestamp = getTimestamp();
  let formattedMessage = `[${timestamp}] `;
  

  switch (type) {
    case "success":
      formattedMessage += chalk.green(`✅ ${message}`);
      break;
    case "error":
      formattedMessage += chalk.red(`❌ ${message}`);
      break;
    case "warn":
      formattedMessage += chalk.yellow(`⚠️ ${message}`);
      break;
    case "debug":
      formattedMessage += chalk.blue(`🔧 ${message}`);
      break;
    default:
      formattedMessage += chalk.white(`ℹ️ ${message}`);
  }
  
  // 输出到控制台
  console.log(formattedMessage);
};
