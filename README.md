# KiteAI 机器人

## 概述
KiteAI 机器人是一个基于 Web3 技术的自动化工具，旨在利用区块链基础设施（如 Kite AI 的 Layer 1 链和 Proof of Attributed Intelligence 共识机制）处理数据请求、生成智能回答，并与 Zettablock 代理服务（如 Professor）交互。机器人支持钱包管理、数据上报和远程统计功能，适用于开发者探索 Web3 生态系统。

## 功能
- **问题生成与回答**：利用 AI 模型生成问题并提供智能回答。
- **数据上报**：将请求和响应数据上报到 Zettablock 平台。
- **钱包管理**：支持 Ethereum 钱包地址和私钥管理，用于身份验证和数据获取。
- **远程统计**：获取并显示钱包的远程统计信息（如用户经验、等级、操作数等）。
- **去中心化支持**：通过区块链技术实现去中心化治理和安全机制。
## 先决条件
A KiteAI 测试网账号 [注册](https://testnet.gokite.ai?r=CuEPgRvm)

Groq API 密钥 从 https://console.groq.com 获取

## 安装步骤
   克隆仓库:
   ```bash
   git clone https://github.com/ziqing888/KiteAI-BOT.git
   cd KiteAI-BOT
   ```
   安装依赖:
   ```bash
   npm install
   ```
  配置环境：
  .env 文件，添加以下变量
  ```bash
  GROQ_API_KEY=
  ```
  编辑 wallets.json，确保包含正确的钱包地址和私钥：
  ```bash
  [
  {
    "address": "0x123234445456767888989990",
    "privateKey": "0x你的私钥"
  }
]
```
运行程序
 ```bash
node bot.js
 ```


