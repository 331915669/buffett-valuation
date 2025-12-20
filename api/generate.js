/**
 * Vercel Serverless Function: API 代理
 * 路径: /api/generate
 * 作用: 在服务端隐藏并使用 API Key，防止前端泄露
 */

export default async function handler(req, res) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  
  // 2. 从 Vercel 环境变量中获取 API Key

  // --- 核心配置 ---
/**
 * API Key 获取逻辑：
 * 优先从环境变量获取（兼容 Vite 等构建工具），若无则由环境在运行时注入。
 */
const getApiKey = () => {
  try {
    // 尝试从 Vite 环境变量获取，或返回空字符串由平台注入
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey(); 

  // const apiKey = process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API KEY' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  try {
    // 3. 转发请求到 Google Gemini API
    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await googleResponse.json();

    // 4. 将结果返回给前端
    return res.status(googleResponse.status).json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: '请求转发失败' });
  }
}