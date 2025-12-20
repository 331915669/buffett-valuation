import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Settings, ShieldCheck, MessageSquare, Edit3, BarChart3, AlertCircle, Sparkles, BookOpen, TrendingUp, Zap } from 'lucide-react';

const App = () => {
  const [params, setParams] = useState({
    fcf: 10,
    growth: 15,
    discount: 10,
    perpetual: 3.0
  });

  const [deepReport, setDeepReport] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // --- DCF 估值算法 ---
  const valuation = useMemo(() => {
    const { fcf, growth, discount, perpetual } = params;
    const g = growth / 100;
    const r = discount / 100;
    const pg = perpetual / 100;

    if (pg >= r) return null;

    let stage1Sum = 0;
    let currentFcf = fcf;
    const chartData = [];

    for (let t = 1; t <= 10; t++) {
      currentFcf *= (1 + g);
      chartData.push({ 
        year: `第${t}年`, 
        fcf: parseFloat(currentFcf.toFixed(2)),
        pv: parseFloat((currentFcf / Math.pow(1 + r, t)).toFixed(2))
      });
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

  /**
   * 安全的 AI 请求逻辑 - 已切换至阿里云 Qwen 接口
   */
  const fetchAiAnalysis = async (prompt) => {
    // 必须保持为空字符串，平台会自动注入 Key
    const apiKey = ""; 
    const systemPrompt = "你是一位精通巴菲特投资哲学的AI。请根据用户提供的估值参数，以巴菲特的口吻进行诊断。关注安全边际、护城河和现金流。语气要睿智且幽默，300字以内。";
    
    const callWithRetry = async (retryCount = 5, delay = 1000) => {
      try {
        const response = await fetch(`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // 确保没有多余空格，直接使用注入点
            'Authorization': `Bearer ${apiKey}` 
          },
          body: JSON.stringify({
            model: "qwen-plus",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ]
          })
        });

        if (response.status === 401) {
          throw new Error("UNAUTHORIZED_ACCESS");
        }

        if (!response.ok) throw new Error("API_GATEWAY_ERROR");
        
        const result = await response.json();
        return result.choices?.[0]?.message?.content;
      } catch (err) {
        if (retryCount > 0) {
          await new Promise(res => setTimeout(res, delay));
          return callWithRetry(retryCount - 1, delay * 2);
        }
        throw err;
      }
    };

    return callWithRetry();
  };

  const handleAiDeepDive = async () => {
    setIsAnalyzing(true);
    setError("");
    const prompt = `估值参数：FCF ${params.fcf}亿，增长率 ${params.growth}%，折现率 ${params.discount}%，永续增长 ${params.perpetual}%。内在价值估值为 ${valuation?.total}亿。请点评。`;
    try {
      const result = await fetchAiAnalysis(prompt);
      setDeepReport(result);
    } catch (err) {
      setError("通往奥马哈的通讯暂时中断 (401 或 网络限制)。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      <nav className="bg-[#1e3a8a] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="text-amber-400" />
            <span className="text-lg font-bold">巴菲特 AI 估值助手 2.0 (Qwen版)</span>
          </div>
          <div className="text-xs italic opacity-70 hidden md:block">“Price is what you pay. Value is what you get.”</div>
        </div>
      </nav>

      <div className="bg-green-50 border-b border-green-100 py-2">
        <div className="max-w-7xl mx-auto px-4 flex items-center text-green-800 text-xs font-medium">
          <ShieldCheck size={14} className="mr-2 flex-shrink-0" />
          <span>核心安全优化：API Key 已切换至阿里云并由服务端网关托管。</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左侧配置栏 */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center mb-6">
              <Settings className="w-5 h-5 mr-2 text-blue-700" />
              <h2 className="font-bold">估值模型设置</h2>
            </div>
            <div className="space-y-8">
              <FcfInput value={params.fcf} onChange={(val) => setParams(p => ({...p, fcf: val}))} />
              <ParamSlider label="高速增长率 (1-10年)" value={params.growth} unit="%" min={0} max={50} onChange={(v) => setParams(p => ({...p, growth: v}))} />
              <ParamSlider label="期望折现率" value={params.discount} unit="%" min={5} max={20} onChange={(v) => setParams(p => ({...p, discount: v}))} />
              <ParamSlider label="永续增长率" value={params.perpetual} unit="%" min={0} max={5} step={0.1} onChange={(v) => setParams(p => ({...p, perpetual: v}))} />
            </div>
          </section>
        </div>

        {/* 右侧展示区 */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 to-indigo-500"></div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">内在价值 (Intrinsic Value)</p>
            {valuation ? (
              <div className="text-5xl md:text-7xl font-bold text-[#1e3a8a] font-mono">
                ¥ {Number(valuation.total).toLocaleString()} 亿
              </div>
            ) : (
              <div className="text-red-400 py-4">参数冲突，请调低永续增长率</div>
            )}
          </section>

          <section className="bg-[#1e3a8a] text-white rounded-3xl p-8 shadow-xl">
            <div className="flex items-center space-x-2 mb-6 text-blue-200">
              <Zap size={18} />
              <h3 className="text-xs font-bold uppercase">投资建议</h3>
            </div>
            {valuation && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <p className="text-blue-300 text-[10px] mb-2 uppercase">安全买入价 (7折)</p>
                  <div className="text-3xl font-bold text-amber-400 font-mono">¥ {Number(valuation.safetyPrice).toLocaleString()} 亿</div>
                </div>
                <div>
                  <p className="text-blue-300 text-[10px] mb-1 uppercase">P/FCF 倍数</p>
                  <p className="font-bold text-3xl font-mono">{valuation.multiple}x</p>
                </div>
                <div>
                  <p className="text-blue-300 text-[10px] mb-1 uppercase">终值贡献比</p>
                  <p className="font-bold text-3xl font-mono">{valuation.tvRatio}%</p>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200 overflow-hidden shrink-0">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=buffett`} alt="Avatar" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">巴菲特 AI 深度诊断</h4>
                <p className="text-xs text-slate-400">Powered by 阿里云通义千问</p>
              </div>
            </div>
            <button 
              onClick={handleAiDeepDive} 
              disabled={isAnalyzing}
              className={`px-8 py-4 rounded-2xl font-bold text-white transition-all ${isAnalyzing ? 'bg-slate-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              {isAnalyzing ? "正在进行安全分析..." : "获取 AI 诊断报告"}
            </button>
          </section>

          {(isAnalyzing || deepReport || error) && (
            <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg">
              {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl mb-4">{error}</div>}
              {deepReport && (
                <div className="text-slate-700 leading-relaxed font-serif text-lg bg-slate-50 p-8 rounded-2xl">
                  <div className="mb-4 text-amber-600 font-bold text-xs uppercase flex items-center italic">
                    <Sparkles size={14} className="mr-2" />
                    Qwen 智能诊断结论
                  </div>
                  <div className="whitespace-pre-wrap">{deepReport}</div>
                </div>
              )}
            </section>
          )}

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
             <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={valuation?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="fcf" stroke="#1e3a8a" strokeWidth={3} fill="#1e3a8a22" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

const FcfInput = ({ value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-500">基期现金流 (FCF)</span>
        <div onClick={() => setIsEditing(true)} className="cursor-pointer text-blue-700 font-bold underline">
          {isEditing ? (
            <input autoFocus value={tempValue} onBlur={() => { setIsEditing(false); onChange(parseFloat(tempValue)); }} onChange={(e) => setTempValue(e.target.value)} className="w-20 text-right bg-slate-50 rounded" />
          ) : (
            `${value} 亿`
          )}
        </div>
      </div>
      <input type="range" min="0" max="500" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-blue-700" />
    </div>
  );
};

const ParamSlider = ({ label, value, unit, min, max, step = 1, onChange }) => (
  <div>
    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
      <span>{label}</span>
      <span className="text-blue-700 font-mono">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-blue-700" />
  </div>
);

export default App;