import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Settings, ShieldCheck, MessageSquare, Edit3, BarChart3, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';

/**
 * 核心配置说明：
 * 1. 兼容性修复：由于部分环境对 import.meta.env 支持受限，我们采用更健壮的兼容性写法
 * 2. 线上环境：请确保在 Vercel 或 Netlify 后台设置 VITE_GEMINI_API_KEY 环境变量
 */
const getApiKey = () => {
  try {
    // 优先尝试从 Vite 环境变量获取
    return import.meta.env.VITE_GEMINI_API_KEY || "";
  } catch (e) {
    // 降级处理，避免编译错误
    return "";
  }
};

const apiKey = getApiKey();
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

const App = () => {
  // --- 状态管理 ---
  const [params, setParams] = useState({
    fcf: 10,
    growth: 15,
    discount: 10,
    perpetual: 3.0
  });

  const [deepReport, setDeepReport] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // --- DCF 计算核心引擎 ---
  const valuation = useMemo(() => {
    const { fcf, growth, discount, perpetual } = params;
    const g = growth / 100;
    const r = discount / 100;
    const pg = perpetual / 100;

    // 逻辑守卫：折现率必须大于永续增长率
    if (pg >= r) return null;

    let stage1Sum = 0;
    let currentFcf = fcf;
    const chartData = [];

    // 计算前10年自由现金流折现
    for (let t = 1; t <= 10; t++) {
      currentFcf *= (1 + g);
      chartData.push({ year: `第${t}年`, fcf: parseFloat(currentFcf.toFixed(2)) });
      stage1Sum += currentFcf / Math.pow(1 + r, t);
    }

    // 计算终值 (Terminal Value) 并折现
    const terminalValue = (currentFcf * (1 + pg)) / (r - pg);
    const discountedTV = terminalValue / Math.pow(1 + r, 10);
    const total = stage1Sum + discountedTV;

    return {
      total: total.toFixed(2),
      stage1: stage1Sum.toFixed(2),
      tv: discountedTV.toFixed(2),
      safetyPrice: (total * 0.7).toFixed(2),
      multiple: fcf !== 0 ? (total / fcf).toFixed(1) : 0,
      tvRatio: total !== 0 ? ((discountedTV / total) * 100).toFixed(1) : 0,
      chartData
    };
  }, [params]);

  // --- 指数退避重试 API 调用封装 ---
  const fetchWithRetry = async (prompt, retries = 5, delay = 1000) => {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { 
        parts: [{ text: "你是一位精通巴菲特价值投资哲学的AI。请根据用户提供的估值参数，以巴菲特的口吻进行犀利、睿智且专业的投资诊断。语气要幽默且具有启发性，重点关注安全边际、增长可持续性和护城河。不要回复过长，保持在300字以内。" }] 
      }
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API 返回错误: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (err) {
      if (retries > 0) {
        await new Promise(res => setTimeout(res, delay));
        return fetchWithRetry(prompt, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  // --- 执行 AI 深度诊断 ---
  const handleAiDeepDive = async () => {
    if (!apiKey) {
      setError("配置缺失：请在 .env 文件或 Vercel 后台设置 VITE_GEMINI_API_KEY 环境变量。如果是本地预览，请检查 Vite 配置。");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setDeepReport("");

    const prompt = `
      我正在对一家公司进行DCF估值，参数如下：
      - 当前基期自由现金流 (FCF): ${params.fcf} 亿
      - 预测未来10年增长率: ${params.growth}%
      - 设定折现率 (期望回报率): ${params.discount}%
      - 永续增长率: ${params.perpetual}%
      - 计算出的内在价值: ${valuation?.total} 亿
      
      请以巴菲特的视角，对这组参数的合理性、安全边际以及潜在风险进行点评。
    `;

    try {
      const result = await fetchWithRetry(prompt);
      setDeepReport(result);
    } catch (err) {
      console.error(err);
      setError("AI 诊断暂时连接失败（已重试5次）。请检查网络或确认 API Key 是否有效。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 顶部导航 */}
      <nav className="bg-[#1e3a8a] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="text-amber-400" />
            <span className="text-lg font-bold tracking-tight">巴菲特 AI 估值助手 2.0</span>
          </div>
          <div className="text-xs italic opacity-70 hidden md:block">“Price is what you pay. Value is what you get.”</div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左侧：参数输入区 */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-6 text-slate-800">
              <Settings className="w-5 h-5 mr-2 text-blue-700" />
              <h2 className="font-bold">模型参数设置</h2>
            </div>

            <div className="space-y-8">
              <FcfInput value={params.fcf} onChange={(val) => setParams({...params, fcf: val})} />
              <ParamSlider label="高速增长率 (1-10年)" value={params.growth} unit="%" min={0} max={50} onChange={(v) => setParams({...params, growth: v})} />
              <ParamSlider label="期望折现率" value={params.discount} unit="%" min={5} max={20} onChange={(v) => setParams({...params, discount: v})} />
              <ParamSlider label="永续增长率 (g)" value={params.perpetual} unit="%" min={0} max={5} step={0.1} onChange={(v) => setParams({...params, perpetual: v})} />
            </div>
          </section>

          {/* 评估结论卡片 */}
          <section className="bg-[#1e3a8a] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-white">
              <ShieldCheck size={80} />
            </div>
            
            <h3 className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4 flex items-center">
              评估结论
            </h3>

            {valuation ? (
              <>
                <div className="mb-6">
                  <p className="text-blue-300 text-[10px] mb-1 uppercase tracking-wider">建议买入参考价 (7折安全边际)</p>
                  <div className="text-3xl font-bold font-mono">
                    ¥ {Number(valuation.safetyPrice).toLocaleString()} 亿
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-blue-800 text-sm">
                  <div>
                    <p className="text-blue-300 text-[10px]">估值倍数 (P/FCF)</p>
                    <p className="font-bold font-mono text-lg">{valuation.multiple}x</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-[10px]">远期价值占比</p>
                    <p className="font-bold font-mono text-lg">{valuation.tvRatio}%</p>
                  </div>
                </div>

                <button 
                  onClick={handleAiDeepDive}
                  disabled={isAnalyzing}
                  className={`w-full transition-all text-white font-bold py-4 rounded-2xl mt-4 flex items-center justify-center space-x-2 shadow-lg ${
                    isAnalyzing ? 'bg-slate-500 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 active:scale-95'
                  }`}
                >
                  {isAnalyzing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <MessageSquare size={18} />
                      <span>获取巴菲特 AI 点评</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-red-300 text-sm py-6 text-center border border-red-900/30 rounded-xl bg-red-950/20">
                ⚠️ 永续增长率必须小于折现率
              </div>
            )}
          </section>
        </div>

        {/* 右侧：分析展示区 */}
        <div className="lg:col-span-8 space-y-6">
          {/* 内在价值看板 */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 to-indigo-500"></div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">当前内在价值 (Intrinsic Value)</p>
            {valuation ? (
              <div className="text-5xl md:text-7xl font-bold text-[#1e3a8a] font-mono mb-2 tracking-tighter">
                ¥ {Number(valuation.total).toLocaleString()} 亿
              </div>
            ) : <div className="text-slate-300 italic">参数无效</div>}
          </section>

          {/* AI 诊断报告展示区 */}
          {(isAnalyzing || deepReport || error) && (
            <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center space-x-3 mb-4 text-[#1e3a8a]">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden border border-amber-200">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=buffett" alt="Buffett AI" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">巴菲特 AI 深度报告</h4>
                  <p className="text-[10px] text-amber-600 font-bold uppercase">Deep Diagnosis powered by Gemini</p>
                </div>
              </div>

              {error && (
                <div className="flex items-start text-red-600 text-sm bg-red-50 p-4 rounded-2xl border border-red-100">
                  <AlertCircle size={18} className="mr-2 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-4 p-4">
                  <div className="h-4 bg-slate-100 rounded-full animate-pulse w-3/4"></div>
                  <div className="h-4 bg-slate-100 rounded-full animate-pulse w-1/2"></div>
                  <div className="h-4 bg-slate-100 rounded-full animate-pulse w-2/3"></div>
                </div>
              )}

              {deepReport && (
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap font-serif text-lg bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                  {deepReport}
                </div>
              )}
            </section>
          )}

          {/* 现金流趋势图 */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center text-slate-800 font-bold mb-6">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              <span>现金流预测轨迹 (未来10年)</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={valuation?.chartData || []}>
                  <defs>
                    <linearGradient id="colorFcf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)'}}
                    formatter={(val) => [`${val} 亿`, '预计现金流']}
                  />
                  <Area type="monotone" dataKey="fcf" stroke="#1e3a8a" strokeWidth={4} fill="url(#colorFcf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

// --- FCF 输入子组件 ---
const FcfInput = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(tempValue);
    if (!isNaN(parsed) && parsed >= 0) onChange(parsed);
  };

  const getSliderValue = () => {
    if (value >= 500) return 100;
    if (value <= 10) return (value * 4); 
    return 40 + ((value - 10) / 490) * 60;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">基期自由现金流 (FCF)</span>
        <div onClick={() => setIsEditing(true)} className="cursor-pointer group flex items-center space-x-2 text-blue-700 font-mono font-bold">
          {isEditing ? (
            <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-xl border border-blue-100">
              <input 
                autoFocus 
                type="number" 
                value={tempValue} 
                onChange={(e) => setTempValue(e.target.value)} 
                onBlur={handleBlur} 
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                className="bg-transparent outline-none w-24 text-right" 
              />
              <span className="text-[10px] ml-1 text-slate-400">亿</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xl underline decoration-dotted decoration-blue-300 group-hover:decoration-blue-700">
                {value < 1 ? `${(value * 10000).toFixed(0)}万` : `${value.toLocaleString()} 亿`}
              </span>
              <Edit3 size={14} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
            </div>
          )}
        </div>
      </div>
      <input 
        type="range" min="0" max="100" step="0.1" value={getSliderValue()}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          let val = raw <= 40 ? (raw / 4).toFixed(1) : (10 + ((raw - 40) / 60) * 490).toFixed(0);
          onChange(parseFloat(val));
          setTempValue(val.toString());
        }}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
      />
      <div className="flex justify-between">
        {[1, 50, 100, 500].map(v => (
          <button 
            key={v} 
            onClick={() => {onChange(v); setTempValue(v.toString());}} 
            className="text-[10px] bg-white hover:bg-[#1e3a8a] hover:text-white text-slate-500 px-3 py-1.5 rounded-xl border border-slate-200 transition-all font-bold shadow-sm"
          >
            {v}亿
          </button>
        ))}
      </div>
    </div>
  );
};

// --- 标准参数滑块子组件 ---
const ParamSlider = ({ label, value, unit, min, max, step = 1, onChange }) => (
  <div className="group">
    <div className="flex justify-between text-xs font-bold text-slate-500 mb-3 group-hover:text-blue-700 transition">
      <span className="uppercase tracking-wider">{label}</span>
      <span className="font-mono">{value} {unit}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))} 
      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700" 
    />
  </div>
);

export default App;