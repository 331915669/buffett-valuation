import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Settings, ShieldCheck, MessageSquare, Info, BarChart3, Edit3 } from 'lucide-react';

const App = () => {
  // --- 状态管理 ---
  const [params, setParams] = useState({
    fcf: 10, 
    growth: 15,
    discount: 10,
    perpetual: 3.0
  });

  const [aiAnalysis, setAiAnalysis] = useState("正在观察市场...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- DCF 计算核心引擎 ---
  const valuation = useMemo(() => {
    const fcf = params.fcf;
    const g = params.growth / 100;
    const r = params.discount / 100;
    const pg = params.perpetual / 100;

    if (pg >= r) return null;

    let stage1Sum = 0;
    let currentFcf = fcf;
    const chartData = [];

    for (let t = 1; t <= 10; t++) {
      currentFcf *= (1 + g);
      chartData.push({ year: `第${t}年`, fcf: parseFloat(currentFcf.toFixed(2)) });
      stage1Sum += currentFcf / Math.pow(1 + r, t);
    }

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

  useEffect(() => {
    const updateAiAdvice = () => {
      const { growth, discount, perpetual } = params;
      if (growth > 25) return "“年轻人，25% 以上的增长率通常只存在于幻觉中。除非这家公司拥有某种合法的垄断地位，否则我建议您把参数调低点。”";
      if (discount < 8) return "“8% 以下的折现率？即使是在零利率时代，我们也得为风险索要足够的补偿。不要为了让估值好看而降低您的标准。”";
      if (perpetual > 4) return "“如果一家公司永远能保持 4% 的增长，它迟早会买下整个地球。现实一点，通常我们会把永续增长率设定在通胀率附近。”";
      return "“这组参数看起来还算理智。现在您该去研究它的管理层是否诚实，以及它的护城河是否能挡住那些贪婪的竞争对手了。”";
    };
    setAiAnalysis(updateAiAdvice());
  }, [params]);

  const handleAiDeepDive = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-[#1e3a8a] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-lg">
              <span className="text-xl">🍎</span>
            </div>
            <span className="text-lg font-bold tracking-tight">巴菲特 AI 估值助手</span>
          </div>
          <div className="hidden md:block text-xs italic opacity-70 font-serif">
            “价值是你得到的，价格是你付出的。”
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* 左侧：输入控制 */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-6 text-slate-800">
              <Settings className="w-5 h-5 mr-2 text-blue-700" />
              <h2 className="font-bold uppercase tracking-tight">估值模型参数</h2>
            </div>

            <div className="space-y-8">
              {/* 基期 FCF 输入优化 */}
              <FcfInput 
                value={params.fcf} 
                onChange={(val) => setParams({...params, fcf: val})} 
              />
              
              <ParamSlider 
                label="高速增长率 (1-10年)" 
                value={params.growth} 
                unit="%" 
                min={0} max={50} 
                onChange={(v) => setParams({...params, growth: v})} 
              />
              <ParamSlider 
                label="期望折现率" 
                value={params.discount} 
                unit="%" 
                min={5} max={20} 
                onChange={(v) => setParams({...params, discount: v})} 
              />
              <ParamSlider 
                label="永续增长率 (g)" 
                value={params.perpetual} 
                unit="%" 
                min={0} max={5} step={0.1}
                onChange={(v) => setParams({...params, perpetual: v})} 
              />
            </div>
          </section>

          {/* 评估结论 */}
          <section className="bg-[#1e3a8a] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-white">
              <ShieldCheck size={80} />
            </div>
            
            <h3 className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></span>
              企业评估结论
            </h3>

            {valuation ? (
              <>
                <div className="mb-6">
                  <p className="text-blue-300 text-[10px] mb-1 uppercase tracking-wider">建议买入参考价 (7折安全边际)</p>
                  <div className="text-3xl font-bold font-mono">
                    ¥ {Number(valuation.safetyPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })} 亿
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-blue-800">
                  <div>
                    <p className="text-blue-300 text-[10px] uppercase">估值倍数 (P/FCF)</p>
                    <p className="font-mono font-bold text-lg">{valuation.multiple}x</p>
                  </div>
                  <div>
                    <p className="text-blue-300 text-[10px] uppercase">远期价值占比</p>
                    <p className="font-mono font-bold text-lg">{valuation.tvRatio}%</p>
                  </div>
                </div>

                <button 
                  onClick={handleAiDeepDive}
                  className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 transition text-white font-bold py-4 rounded-2xl mt-4 flex items-center justify-center space-x-2 shadow-lg"
                >
                  {isAnalyzing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <MessageSquare size={18} />
                      <span>获取 AI 深度报告</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-red-300 text-sm py-10 text-center font-bold">
                ⚠️ 永续增长率必须小于折现率
              </div>
            )}
          </section>
        </div>

        {/* 右侧：结果展示 */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 to-indigo-500"></div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">当前内在价值 (Intrinsic Value)</p>
            
            {valuation ? (
              <>
                <div className="text-5xl md:text-7xl font-bold text-[#1e3a8a] font-mono mb-8 tracking-tighter">
                  ¥ {Number(valuation.total).toLocaleString(undefined, { minimumFractionDigits: 2 })} 亿
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase block">高速增长期总现值</span>
                    <span className="text-2xl font-bold text-slate-700 font-mono">¥ {Number(valuation.stage1).toLocaleString()} 亿</span>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div className="bg-blue-600 h-full transition-all duration-700 ease-out" style={{width: `${100 - valuation.tvRatio}%`}}></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase block">永续增长期总现值</span>
                    <span className="text-2xl font-bold text-slate-700 font-mono">¥ {Number(valuation.tv).toLocaleString()} 亿</span>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all duration-700 ease-out" style={{width: `${valuation.tvRatio}%`}}></div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </section>

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center text-slate-800 font-bold">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                <span>现金流预测轨迹 (未来10年)</span>
              </div>
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
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <Tooltip 
                    formatter={(value) => [`${value} 亿`, "自由现金流"]}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'}}
                    labelStyle={{fontWeight: 'bold', marginBottom: '4px'}}
                  />
                  <Area type="monotone" dataKey="fcf" stroke="#1e3a8a" strokeWidth={4} fillOpacity={1} fill="url(#colorFcf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden shadow-inner text-white">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=buffett&backgroundColor=ffdfbf" alt="Buffett" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 font-serif">巴菲特 实时点评</h4>
                <div className="flex items-center text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-2"></span>
                  AI 智能顾问系统
                </div>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed italic text-base border-l-4 border-slate-50 pl-6 py-2">
              {aiAnalysis}
            </p>
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 text-[10px] border-t border-slate-200 mt-10">
        <p className="uppercase tracking-widest mb-1 font-bold">© 2025 内在价值实验室 | 资产评估实战工具</p>
        <p>注：所有计算基于用户假设，不构成投资建议。市场有风险，入市需谨慎。</p>
      </footer>
    </div>
  );
};

// --- 核心优化组件：FCF 输入交互 (拖动上限 500 亿，输入不封顶) ---
const FcfInput = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const inputRef = useRef(null);

  // 格式化显示：亿/万
  const formatDisplay = (val) => {
    if (val === 0) return '0 亿';
    if (val < 1) return `${(val * 10000).toFixed(0)} 万`;
    return `${val.toLocaleString()} 亿`;
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseFloat(tempValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
      setTempValue(parsed.toString());
    } else {
      setTempValue(value.toString());
    }
  };

  const handleQuickJump = (val) => {
    onChange(val);
    setTempValue(val.toString());
  };

  // 动态滑块百分比逻辑 (基于 500 亿上限)
  const getSliderValue = () => {
    if (value >= 500) return 100;
    if (value <= 10) return (value * 4); // 0-10亿映射到0-40刻度
    return 40 + ((value - 10) / 490) * 60; // 10-500亿映射到40-100刻度
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">基期自由现金流 (FCF)</span>
        <div 
          onClick={() => setIsEditing(true)}
          className="cursor-pointer group flex items-center space-x-2 text-blue-700 font-mono font-bold transition-all"
        >
          {isEditing ? (
            <div className="flex items-center bg-slate-100 px-3 py-1.5 rounded-xl shadow-inner border border-blue-100">
              <input
                ref={inputRef}
                autoFocus
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                className="bg-transparent outline-none w-24 text-right text-blue-800"
              />
              <span className="text-[10px] ml-1 text-slate-400">亿</span>
            </div>
          ) : (
            <>
              <span className="text-xl underline decoration-dotted decoration-blue-300 group-hover:decoration-blue-700 transition-all">
                {formatDisplay(value)}
              </span>
              <Edit3 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
            </>
          )}
        </div>
      </div>

      {/* 拖动逻辑：上限 500 亿，非线性步进 */}
      <input 
        type="range" 
        min="0" 
        max="100" 
        step="0.1"
        value={getSliderValue()}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          let val;
          if (raw <= 40) {
            val = (raw / 4).toFixed(1); // 0-10亿区间，极度精准
          } else {
            // 10-500亿区间，平分剩下的 60 个刻度
            const calculated = 10 + ((raw - 40) / 60) * 490;
            // 10-100亿按1亿步进，100亿以上按10亿步进
            if (calculated <= 100) {
              val = Math.round(calculated).toFixed(0);
            } else {
              val = (Math.round(calculated / 10) * 10).toFixed(0);
            }
          }
          const finalVal = Math.max(0, parseFloat(val));
          onChange(finalVal);
          setTempValue(finalVal.toString());
        }}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700 hover:accent-blue-800 transition-all"
      />

      {/* 快捷跳转按钮：针对不同量级优化 */}
      <div className="flex justify-between">
        {[1, 50, 100, 500].map(v => (
          <button 
            key={v}
            onClick={() => handleQuickJump(v)}
            className="text-[10px] bg-white hover:bg-[#1e3a8a] hover:text-white text-slate-500 px-3 py-2 rounded-xl transition-all border border-slate-200 shadow-sm font-bold uppercase tracking-tighter"
          >
            {v >= 100 ? `${v}亿` : `${v} 亿`}
          </button>
        ))}
      </div>
      
      {value > 500 && (
        <div className="text-center">
          <span className="text-[9px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
            已进入手动输入模式 (超过 500 亿上限)
          </span>
        </div>
      )}
    </div>
  );
};

// --- 子组件：标准参数滑块 ---
const ParamSlider = ({ label, value, unit, displayVal, min, max, step = 1, onChange }) => (
  <div className="group">
    <div className="flex justify-between text-xs font-bold text-slate-500 mb-3 group-hover:text-blue-700 transition">
      <span className="uppercase tracking-wider">{label}</span>
      <span className="font-mono">{displayVal || value} {unit}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step}
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700 hover:accent-blue-800 transition-all"
    />
  </div>
);

export default App;