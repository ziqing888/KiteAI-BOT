// 文件名: /root/KiteAI-BOT/main.js
import { rateLimitConfig, agents } from "./config/settings.js";
import agentService from "./services/agentService.js";
import walletService from "./services/walletService.js";
import { sleep, formatError, formatStats, getTimestamp, log, formatDuration } from "./utils/tools.js";
import chalk from "chalk";

let isRunning = true;
// 移除本地统计，依赖远程统计
const startTime = Date.now();

// 显示欢迎横幅
function displayBanner() {
  console.log(chalk.cyan.bold("========================================"));
  console.log(chalk.cyan.bold("          KiteAI 机器人          "));
  console.log(chalk.cyan("  关注X：https://x.com/qklxsqf 获得更多资讯 "));
  console.log(chalk.cyan.bold("========================================"));
}


process.on("SIGINT", () => {
  log("正在停止脚本...", "warn");
  isRunning = false;
  setTimeout(() => {
    log("再见!", "success");
    process.exit(0);
  }, 1000);
});

async function processAgentCycle(wallet, agentId, agentName) {
  try {
    log(`正在使用代理服务: ${agentName} (ID: ${agentId})`);
    const walletAddress = wallet.address; 
    const nanya = await agentService.sendQuestion(agentId);
    if (nanya) {
      log(`问题: ${nanya.question}`);
      log(`回答: ${nanya?.response?.content ?? ""}`);

      const reported = await agentService.reportUsage(walletAddress, { 
        agent_id: agentId,
        question: nanya.question,
        response: nanya?.response || { content: "无回答" },
      });

      if (reported) {
        log("使用数据上报成功!", "success");
      } else {
        log("使用数据上报失败", "error");
      }

    } else {
      log("未收到回答", "error");
    }
  } catch (error) {
    log(`代理循环出错: ${formatError(error)}`, "error");
  }
}


async function processWallet(wallet, cycleCount) {
  log(`正在处理钱包: ${wallet.address}`, "warn");
  log(`当前周期: ${cycleCount} | 运行时间: ${formatDuration(Date.now() - startTime)}`);

  for (const [agentId, agentName] of Object.entries(agents)) {
    if (!isRunning) break;
    await processAgentCycle(wallet, agentId, agentName);
    if (isRunning) {
      const waitTime = rateLimitConfig.intervalBetweenCycles / 1000;
      log(`等待 ${waitTime} 秒后进行下一次尝试...`);
      await sleep(rateLimitConfig.intervalBetweenCycles);
    }
  }
}


async function startContinuousProcess(wallets) {
  let cycleCount = 1;
  while (isRunning) {
    log(`开始第 ${cycleCount} 次循环`, "success");
    for (const wallet of wallets) {
      if (!isRunning) break;
      await processWallet(wallet, cycleCount);
    }
    cycleCount++;
  }
}


async function main() {
  try {
    displayBanner();
    const wallets = await walletService.loadWallets();
    if (wallets.length === 0) {
      log("未在 wallets.json 中找到钱包，程序停止。", "error");
      process.exit(1);
    }


    await agentService.initializeProxies();

    log(`从 wallets.json 中加载了 ${wallets.length} 个钱包`, "success");
    await startContinuousProcess(wallets);
  } catch (error) {
    log(`发生错误: ${formatError(error)}`, "error");
    process.exit(1);
  }
}

main();
