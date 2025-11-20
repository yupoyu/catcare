import React, { useState, useEffect, useCallback } from 'react';
import { LogEntry, LogCategory, Units, Tab } from './types';
import { HealthCharts } from './components/Charts';
import { AiChat } from './components/AiChat';
import { Plus, Droplets, Syringe, Utensils, Activity, Trash2, Clock, Calendar, Home, MessageCircle, ChevronRight, AlertCircle } from 'lucide-react';

// Simple Helper to get local storage
const STORAGE_KEY = 'cat_care_logs_v1';

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | null>(null);

  // Form State
  const [inputValue, setInputValue] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [entryDate, setEntryDate] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLogs(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load logs", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const openLogModal = (category: LogCategory) => {
    setSelectedCategory(category);
    setInputValue('');
    setInputNote('');
    // Default to current local time for input type="datetime-local"
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEntryDate(localIso);
    setIsLogModalOpen(true);
  };

  const handleSaveLog = () => {
    if (!selectedCategory || !inputValue) return;

    let unit = Units.NONE;
    switch (selectedCategory) {
      case LogCategory.GLUCOSE: unit = Units.MG_DL; break;
      case LogCategory.KETONE: unit = Units.MMOL_L; break;
      case LogCategory.FEEDING: unit = Units.ML; break;
      case LogCategory.SALINE: unit = Units.ML; break;
      case LogCategory.MEDS: unit = Units.PILL; break;
    }

    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(entryDate).getTime(),
      category: selectedCategory,
      value: parseFloat(inputValue),
      unit,
      note: inputNote
    };

    setLogs(prev => [newLog, ...prev].sort((a, b) => b.timestamp - a.timestamp));
    setIsLogModalOpen(false);
  };

  const deleteLog = (id: string) => {
    if (confirm('確定要刪除這筆紀錄嗎？')) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  // --- Helper Functions for Logic ---

  const getLatest = (cat: LogCategory) => logs.find(l => l.category === cat);

  const getDailyTotal = (cat: LogCategory) => {
    const today = new Date();
    // Reset to start of today 00:00 for comparison
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    
    return logs
      .filter(l => l.category === cat && l.timestamp >= startOfDay)
      .reduce((sum, curr) => sum + curr.value, 0);
  };

  const getTimeSince = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return '剛剛';
    if (hours < 1) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    return `${Math.floor(hours / 24)} 天前`;
  };

  // Color Coding for Abnormal Values
  const getStatusColor = (category: LogCategory, value: number, isBg = false) => {
    if (category === LogCategory.GLUCOSE) {
      if (value < 70) return isBg ? 'bg-red-50 border-red-100 text-red-700' : 'text-red-600'; // Hypo
      if (value > 250) return isBg ? 'bg-orange-50 border-orange-100 text-orange-700' : 'text-orange-600'; // High
      return isBg ? 'bg-white border-gray-100' : 'text-blue-600';
    }
    if (category === LogCategory.KETONE) {
      if (value >= 1.5) return isBg ? 'bg-red-50 border-red-100 text-red-700' : 'text-red-600'; // Danger
      if (value >= 0.6) return isBg ? 'bg-orange-50 border-orange-100 text-orange-700' : 'text-orange-600'; // Warning
      return isBg ? 'bg-white border-gray-100' : 'text-purple-600';
    }
    return isBg ? 'bg-white border-gray-100' : 'text-gray-700';
  };

  // --- Render Functions ---

  const renderDashboard = () => {
    const latestGlucose = getLatest(LogCategory.GLUCOSE);
    const latestKetone = getLatest(LogCategory.KETONE);
    const latestFeeding = getLatest(LogCategory.FEEDING);
    const latestSaline = getLatest(LogCategory.SALINE);

    return (
      <div className="space-y-6 pb-24">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Glucose Card */}
          <div className={`p-4 rounded-2xl shadow-sm border flex flex-col justify-between h-32 relative overflow-hidden ${latestGlucose ? getStatusColor(LogCategory.GLUCOSE, latestGlucose.value, true) : 'bg-white border-gray-100'}`}>
            <div className="flex items-center space-x-2 mb-1">
              <Activity size={16} className={latestGlucose ? getStatusColor(LogCategory.GLUCOSE, latestGlucose.value) : 'text-gray-400'} />
              <span className="font-bold text-sm text-gray-600">血糖</span>
            </div>
            <div>
              <div className="text-3xl font-bold tracking-tight">
                {latestGlucose?.value || '--'} <span className="text-xs font-normal opacity-60">mg/dL</span>
              </div>
              {latestGlucose && (
                 <div className="text-[10px] opacity-70 mt-1 flex items-center gap-1">
                   <Clock size={10} /> {getTimeSince(latestGlucose.timestamp)}
                 </div>
              )}
            </div>
            {latestGlucose && (latestGlucose.value < 70 || latestGlucose.value > 250) && (
              <AlertCircle className="absolute top-2 right-2 text-red-500/20" size={48} />
            )}
          </div>

          {/* Ketone Card */}
          <div className={`p-4 rounded-2xl shadow-sm border flex flex-col justify-between h-32 relative overflow-hidden ${latestKetone ? getStatusColor(LogCategory.KETONE, latestKetone.value, true) : 'bg-white border-gray-100'}`}>
            <div className="flex items-center space-x-2 mb-1">
              <Droplets size={16} className={latestKetone ? getStatusColor(LogCategory.KETONE, latestKetone.value) : 'text-gray-400'} />
              <span className="font-bold text-sm text-gray-600">血酮</span>
            </div>
            <div>
              <div className="text-3xl font-bold tracking-tight">
                {latestKetone?.value || '--'} <span className="text-xs font-normal opacity-60">mmol/L</span>
              </div>
               {latestKetone && (
                 <div className="text-[10px] opacity-70 mt-1 flex items-center gap-1">
                   <Clock size={10} /> {getTimeSince(latestKetone.timestamp)}
                 </div>
              )}
            </div>
            {latestKetone && latestKetone.value >= 0.6 && (
               <AlertCircle className={`absolute top-2 right-2 ${latestKetone.value >= 1.5 ? 'text-red-500/20' : 'text-orange-500/20'}`} size={48} />
            )}
          </div>

          {/* Feeding Summary */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-24">
             <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-orange-500">
                  <Utensils size={16} />
                  <span className="font-bold text-sm text-gray-600">今日灌食</span>
                </div>
                <span className="text-2xl font-bold text-gray-800">{getDailyTotal(LogCategory.FEEDING)}<span className="text-xs text-gray-400 font-normal ml-1">ml</span></span>
             </div>
             <div className="text-xs text-gray-400">
                上次：{latestFeeding ? getTimeSince(latestFeeding.timestamp) : '無'}
             </div>
          </div>

          {/* Saline Summary */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-24">
             <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-cyan-500">
                  <Syringe size={16} />
                  <span className="font-bold text-sm text-gray-600">今日輸液</span>
                </div>
                <span className="text-2xl font-bold text-gray-800">{getDailyTotal(LogCategory.SALINE)}<span className="text-xs text-gray-400 font-normal ml-1">ml</span></span>
             </div>
             <div className="text-xs text-gray-400">
                上次：{latestSaline ? getTimeSince(latestSaline.timestamp) : '無'}
             </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3 px-1">快速紀錄</h3>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => openLogModal(LogCategory.FEEDING)} className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform group">
              <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-2 group-hover:bg-orange-100 transition-colors">
                <Utensils size={20} />
              </div>
              <span className="text-sm font-medium text-gray-600">灌食</span>
            </button>
            <button onClick={() => openLogModal(LogCategory.SALINE)} className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform group">
              <div className="w-10 h-10 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mb-2 group-hover:bg-cyan-100 transition-colors">
                <Syringe size={20} />
              </div>
              <span className="text-sm font-medium text-gray-600">皮下輸液</span>
            </button>
            <button onClick={() => openLogModal(LogCategory.MEDS)} className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform group">
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 group-hover:bg-red-100 transition-colors">
                <Activity size={20} />
              </div>
              <span className="text-sm font-medium text-gray-600">餵藥</span>
            </button>
            <button onClick={() => openLogModal(LogCategory.GLUCOSE)} className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform group">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                <Activity size={20} />
              </div>
              <span className="text-sm font-medium text-gray-600">測血糖</span>
            </button>
            <button onClick={() => openLogModal(LogCategory.KETONE)} className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform group">
              <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-100 transition-colors">
                <Droplets size={20} />
              </div>
              <span className="text-sm font-medium text-gray-600">測血酮</span>
            </button>
          </div>
        </div>

        {/* Recent Logs Preview */}
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-lg font-bold text-gray-800">最新紀錄</h3>
            <button onClick={() => setActiveTab('log')} className="text-teal-600 text-sm flex items-center hover:underline">
              查看全部 <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {logs.slice(0, 5).map(log => (
              <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-10 rounded-full ${
                    log.category === LogCategory.GLUCOSE ? 'bg-blue-500' :
                    log.category === LogCategory.KETONE ? 'bg-purple-500' :
                    log.category === LogCategory.FEEDING ? 'bg-orange-500' :
                    log.category === LogCategory.SALINE ? 'bg-cyan-500' :
                    'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="font-bold text-gray-800">{log.category}</p>
                    <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${getStatusColor(log.category, log.value)}`}>
                    {log.value} <span className="text-xs font-normal text-gray-400">{log.unit}</span>
                  </p>
                  {log.note && <p className="text-xs text-gray-400 max-w-[100px] truncate">{log.note}</p>}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                尚未有紀錄，請點擊上方按鈕新增
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLogList = () => (
    <div className="pb-24 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 px-1 flex items-center gap-2">
        <Calendar className="text-teal-600" />
        詳細紀錄表
      </h2>
      {logs.map(log => {
        // Determine styling based on abnormal values
        const isAbnormal = 
          (log.category === LogCategory.GLUCOSE && (log.value < 70 || log.value > 250)) ||
          (log.category === LogCategory.KETONE && log.value >= 0.6);
          
        return (
        <div key={log.id} className={`bg-white p-4 rounded-xl shadow-sm border relative group transition-all ${isAbnormal ? 'border-l-4 border-l-red-500 border-gray-100' : 'border-gray-100'}`}>
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  log.category === LogCategory.GLUCOSE ? 'bg-blue-50 text-blue-600' :
                  log.category === LogCategory.KETONE ? 'bg-purple-50 text-purple-600' :
                  log.category === LogCategory.FEEDING ? 'bg-orange-50 text-orange-600' :
                  log.category === LogCategory.SALINE ? 'bg-cyan-50 text-cyan-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {log.category === LogCategory.FEEDING ? <Utensils size={18}/> : 
                   log.category === LogCategory.SALINE ? <Syringe size={18}/> :
                   log.category === LogCategory.MEDS ? <Activity size={18}/> :
                   <Activity size={18}/>}
                </div>
                <div>
                  <p className="font-bold text-gray-800 flex items-center gap-2">
                    {log.category}
                    <span className={`font-mono text-lg ${getStatusColor(log.category, log.value)}`}>
                      {log.value} {log.unit}
                    </span>
                    {isAbnormal && <AlertCircle size={14} className="text-red-500" />}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{new Date(log.timestamp).toLocaleString('zh-TW')}</p>
                  {log.note && <div className="mt-2 bg-gray-50 p-2 rounded-lg text-sm text-gray-600">{log.note}</div>}
                </div>
            </div>
            <button onClick={() => deleteLog(log.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )})}
      {logs.length === 0 && <div className="text-center text-gray-400 mt-10">無資料</div>}
    </div>
  );

  return (
    <div className="min-h-screen w-full max-w-md mx-auto bg-gray-50 text-gray-900 relative overflow-hidden">
      {/* Main Content Area */}
      <main className="h-full overflow-y-auto p-4 no-scrollbar">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'log' && renderLogList()}
        {activeTab === 'history' && (
          <div className="pb-24">
             <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
               <Activity className="text-teal-600" />
               健康趨勢圖
             </h2>
             <HealthCharts logs={logs} />
          </div>
        )}
        {activeTab === 'assistant' && <AiChat />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-30 max-w-md mx-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'dashboard' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Home size={24} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">首頁</span>
        </button>
        <button onClick={() => setActiveTab('log')} className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'log' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Calendar size={24} strokeWidth={activeTab === 'log' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">紀錄</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'history' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <Activity size={24} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">趨勢</span>
        </button>
        <button onClick={() => setActiveTab('assistant')} className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'assistant' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}>
          <div className="relative">
            <MessageCircle size={24} strokeWidth={activeTab === 'assistant' ? 2.5 : 2} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
          </div>
          <span className="text-[10px] font-medium">AI 助手</span>
        </button>
      </nav>

      {/* Log Entry Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className={`w-1 h-6 rounded-full ${
                  selectedCategory === LogCategory.GLUCOSE ? 'bg-blue-500' :
                  selectedCategory === LogCategory.KETONE ? 'bg-purple-500' :
                  selectedCategory === LogCategory.FEEDING ? 'bg-orange-500' :
                  selectedCategory === LogCategory.SALINE ? 'bg-cyan-500' :
                  'bg-red-500'
                }`}></span>
                紀錄{selectedCategory}
              </h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">數值 ({
                   selectedCategory === LogCategory.GLUCOSE ? 'mg/dL' :
                   selectedCategory === LogCategory.KETONE ? 'mmol/L' :
                   selectedCategory === LogCategory.MEDS ? '顆/粒' : 'ml'
                })</label>
                <input
                  type="number"
                  step={selectedCategory === LogCategory.KETONE ? "0.1" : "1"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-gray-800 focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">時間</label>
                <input
                  type="datetime-local"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">備註 (選填)</label>
                <textarea
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  placeholder="例如：食慾不佳、有嘔吐..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:ring-2 focus:ring-teal-500 outline-none resize-none h-24"
                />
              </div>

              <button
                onClick={handleSaveLog}
                disabled={!inputValue}
                className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg mt-4 transition-all active:scale-[0.98] ${
                   selectedCategory === LogCategory.GLUCOSE ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' :
                   selectedCategory === LogCategory.KETONE ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' :
                   selectedCategory === LogCategory.FEEDING ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' :
                   selectedCategory === LogCategory.SALINE ? 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200' :
                   'bg-red-600 hover:bg-red-700 shadow-red-200'
                } disabled:bg-gray-300 disabled:shadow-none`}
              >
                儲存紀錄
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;