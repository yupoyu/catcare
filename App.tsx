import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogCategory, Units, Tab, AppSettings } from './types';
import { HealthCharts } from './components/Charts';
import { AiChat } from './components/AiChat';
import { 
  Plus, Droplets, Syringe, Utensils, Activity, Trash2, Clock, Calendar, 
  Home, MessageCircle, ChevronRight, AlertCircle, Settings, Lock, Unlock, 
  Download, Upload, FileJson, X, Save
} from 'lucide-react';

// Simple Helper to get local storage
const STORAGE_KEY = 'cat_care_logs_v1';
const SETTINGS_KEY = 'cat_care_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  glucoseLow: 70,
  glucoseHigh: 250,
  ketoneWarning: 0.6,
  ketoneDanger: 1.5,
  dailyFeedingTarget: 0,
  dailySalineTarget: 0
};

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | null>(null);
  
  // Admin State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [inputValue, setInputValue] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [entryDate, setEntryDate] = useState('');

  // --- Effects ---
  useEffect(() => {
    const savedLogs = localStorage.getItem(STORAGE_KEY);
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error("Failed to load logs", e);
      }
    }

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // --- Actions ---

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

  const handleLogin = () => {
    if (passwordInput === '1234') {
      setIsAuthenticated(true);
      setAuthError(false);
      setPasswordInput('');
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdminModalOpen(false);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ logs, settings }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cat_care_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.logs) setLogs(data.logs);
        if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        alert('資料匯入成功！');
      } catch (err) {
        alert('資料格式錯誤，無法匯入。');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Helper Functions ---

  const getLatest = (cat: LogCategory) => logs.find(l => l.category === cat);

  const getDailyTotal = (cat: LogCategory) => {
    const today = new Date();
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

  const getStatusColor = (category: LogCategory, value: number, isBg = false) => {
    if (category === LogCategory.GLUCOSE) {
      if (value < settings.glucoseLow) return isBg ? 'bg-red-50 border-red-100 text-red-700' : 'text-red-600';
      if (value > settings.glucoseHigh) return isBg ? 'bg-orange-50 border-orange-100 text-orange-700' : 'text-orange-600';
      return isBg ? 'bg-white border-gray-100' : 'text-blue-600';
    }
    if (category === LogCategory.KETONE) {
      if (value >= settings.ketoneDanger) return isBg ? 'bg-red-50 border-red-100 text-red-700' : 'text-red-600';
      if (value >= settings.ketoneWarning) return isBg ? 'bg-orange-50 border-orange-100 text-orange-700' : 'text-orange-600';
      return isBg ? 'bg-white border-gray-100' : 'text-purple-600';
    }
    return isBg ? 'bg-white border-gray-100' : 'text-gray-700';
  };

  // --- Render Components ---

  const renderDashboard = () => {
    const latestGlucose = getLatest(LogCategory.GLUCOSE);
    const latestKetone = getLatest(LogCategory.KETONE);
    const latestFeeding = getLatest(LogCategory.FEEDING);
    const latestSaline = getLatest(LogCategory.SALINE);

    const dailyFeeding = getDailyTotal(LogCategory.FEEDING);
    const dailySaline = getDailyTotal(LogCategory.SALINE);

    return (
      <div className="space-y-6 pb-24">
        {/* Header with Admin Button */}
        <div className="flex justify-between items-center px-1">
          <h1 className="text-xl font-bold text-gray-800">健康儀表板</h1>
          <button 
            onClick={() => setIsAdminModalOpen(true)} 
            className="p-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-500 hover:text-teal-600 active:scale-95 transition-all"
          >
            {isAuthenticated ? <Settings size={20} /> : <Lock size={20} />}
          </button>
        </div>

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
            {latestGlucose && (latestGlucose.value < settings.glucoseLow || latestGlucose.value > settings.glucoseHigh) && (
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
            {latestKetone && latestKetone.value >= settings.ketoneWarning && (
               <AlertCircle className={`absolute top-2 right-2 ${latestKetone.value >= settings.ketoneDanger ? 'text-red-500/20' : 'text-orange-500/20'}`} size={48} />
            )}
          </div>

          {/* Feeding Summary */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-24">
             <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-orange-500">
                  <Utensils size={16} />
                  <span className="font-bold text-sm text-gray-600">今日灌食</span>
                </div>
             </div>
             <div>
               <span className="text-2xl font-bold text-gray-800">{dailyFeeding}<span className="text-xs text-gray-400 font-normal ml-1">ml</span></span>
               {settings.dailyFeedingTarget > 0 && (
                 <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                   <div 
                    className="bg-orange-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min((dailyFeeding / settings.dailyFeedingTarget) * 100, 100)}%` }}
                   ></div>
                 </div>
               )}
               {settings.dailyFeedingTarget > 0 && (
                 <div className="text-[10px] text-gray-400 mt-1 text-right">目標: {settings.dailyFeedingTarget}ml</div>
               )}
             </div>
          </div>

          {/* Saline Summary */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-24">
             <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-cyan-500">
                  <Syringe size={16} />
                  <span className="font-bold text-sm text-gray-600">今日輸液</span>
                </div>
             </div>
             <div>
                <span className="text-2xl font-bold text-gray-800">{dailySaline}<span className="text-xs text-gray-400 font-normal ml-1">ml</span></span>
                {settings.dailySalineTarget > 0 && (
                 <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                   <div 
                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min((dailySaline / settings.dailySalineTarget) * 100, 100)}%` }}
                   ></div>
                 </div>
               )}
               {settings.dailySalineTarget > 0 && (
                 <div className="text-[10px] text-gray-400 mt-1 text-right">目標: {settings.dailySalineTarget}ml</div>
               )}
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
        // Determine styling based on settings
        const isAbnormal = 
          (log.category === LogCategory.GLUCOSE && (log.value < settings.glucoseLow || log.value > settings.glucoseHigh)) ||
          (log.category === LogCategory.KETONE && log.value >= settings.ketoneWarning);
          
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

  const renderAdminModal = () => {
    if (!isAdminModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Settings size={24} className="text-gray-600" />
              管理者設定
            </h3>
            <button onClick={() => setIsAdminModalOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>

          {!isAuthenticated ? (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <Lock size={32} />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">請輸入管理者密碼 (預設: 1234)</p>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="PIN Code"
                  className={`w-full text-center text-2xl tracking-widest py-2 border-b-2 outline-none transition-colors ${authError ? 'border-red-500 text-red-500' : 'border-gray-200 focus:border-teal-500'}`}
                  maxLength={4}
                />
                {authError && <p className="text-xs text-red-500 mt-2">密碼錯誤</p>}
              </div>
              <button 
                onClick={handleLogin}
                className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-colors"
              >
                登入
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Health Thresholds */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 tracking-wider border-b pb-1">警示值設定</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-700">低血糖警示 (mg/dL)</label>
                    <input 
                      type="number" 
                      value={settings.glucoseLow}
                      onChange={(e) => setSettings({...settings, glucoseLow: Number(e.target.value)})}
                      className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-700">高血糖警示 (mg/dL)</label>
                    <input 
                      type="number" 
                      value={settings.glucoseHigh}
                      onChange={(e) => setSettings({...settings, glucoseHigh: Number(e.target.value)})}
                      className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-700">血酮危險值 (mmol/L)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={settings.ketoneDanger}
                      onChange={(e) => setSettings({...settings, ketoneDanger: Number(e.target.value)})}
                      className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Daily Targets */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 tracking-wider border-b pb-1">每日目標</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-700">每日灌食目標 (ml)</label>
                    <input 
                      type="number" 
                      value={settings.dailyFeedingTarget}
                      onChange={(e) => setSettings({...settings, dailyFeedingTarget: Number(e.target.value)})}
                      className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-gray-700">每日輸液目標 (ml)</label>
                    <input 
                      type="number" 
                      value={settings.dailySalineTarget}
                      onChange={(e) => setSettings({...settings, dailySalineTarget: Number(e.target.value)})}
                      className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-right"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">* 設定為 0 代表不顯示目標進度條</p>
                </div>
              </div>

              {/* Data Management */}
              <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 tracking-wider border-b pb-1">資料管理</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleExportData} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-3 rounded-xl hover:bg-blue-100 transition-colors">
                    <Download size={18} />
                    備份資料
                  </button>
                  <label className="flex items-center justify-center gap-2 bg-green-50 text-green-600 py-3 rounded-xl hover:bg-green-100 transition-colors cursor-pointer">
                    <Upload size={18} />
                    還原資料
                    <input 
                      type="file" 
                      accept=".json" 
                      ref={fileInputRef}
                      className="hidden" 
                      onChange={handleImportData}
                    />
                  </label>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full border border-gray-200 text-gray-500 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Unlock size={18} /> 登出管理者模式
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

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
             <HealthCharts logs={logs} settings={settings} />
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

      {renderAdminModal()}
      
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