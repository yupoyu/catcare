import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { LogEntry, LogCategory, AppSettings } from '../types';

interface ChartsProps {
  logs: LogEntry[];
  settings: AppSettings;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
        <p className="text-sm text-gray-500 mb-1">
          {isNaN(Number(label)) 
            ? label 
            : new Date(label).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
          }
        </p>
        {payload.map((p: any, index: number) => (
          <div key={index} className="mb-1 last:mb-0">
             <p className="text-md font-bold" style={{ color: p.color }}>
              {p.name}: {p.value} {p.payload.unit || p.unit || ''}
            </p>
            {p.payload.note && (
              <p className="text-xs text-gray-400 mt-0.5 break-words max-w-[150px]">{p.payload.note}</p>
            )}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const HealthCharts: React.FC<ChartsProps> = ({ logs, settings }) => {
  const glucoseData = useMemo(() => {
    return logs
      .filter(l => l.category === LogCategory.GLUCOSE)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(l => ({
        timestamp: l.timestamp,
        value: l.value,
        unit: l.unit,
        note: l.note,
        name: '血糖'
      }));
  }, [logs]);

  const ketoneData = useMemo(() => {
    return logs
      .filter(l => l.category === LogCategory.KETONE)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(l => ({
        timestamp: l.timestamp,
        value: l.value,
        unit: l.unit,
        note: l.note,
        name: '血酮'
      }));
  }, [logs]);

  // Calculate daily totals for Feeding and Saline
  const dailyIntakeData = useMemo(() => {
    const dailyMap = new Map<string, { date: string, timestamp: number, feeding: number, saline: number }>();

    // Get dates from logs to ensure correct sorting
    logs.forEach(log => {
      if (log.category === LogCategory.FEEDING || log.category === LogCategory.SALINE) {
        const dateObj = new Date(log.timestamp);
        // Reset time to midnight for grouping
        const dateKey = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
        
        if (!dailyMap.has(dateKey.toString())) {
          dailyMap.set(dateKey.toString(), { 
            date: new Date(dateKey).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }), 
            timestamp: dateKey, 
            feeding: 0, 
            saline: 0 
          });
        }
        
        const entry = dailyMap.get(dateKey.toString())!;
        if (log.category === LogCategory.FEEDING) entry.feeding += log.value;
        if (log.category === LogCategory.SALINE) entry.saline += log.value;
      }
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-7); // Show last 7 active days
  }, [logs]);

  if (glucoseData.length === 0 && ketoneData.length === 0 && dailyIntakeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>尚無健康數據</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {glucoseData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span>
            血糖趨勢 (Glucose)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={glucoseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  stroke="transparent"
                  minTickGap={30}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  stroke="transparent"
                  unit=" mg"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={settings.glucoseLow} label="低血糖" stroke="red" strokeDasharray="3 3" />
                <ReferenceLine y={settings.glucoseHigh} label="高血糖" stroke="orange" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="血糖"
                  unit="mg/dL"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {ketoneData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-6 bg-purple-500 rounded-full mr-2"></span>
            血酮趨勢 (Ketone)
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ketoneData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  stroke="transparent"
                  minTickGap={30}
                />
                <YAxis
                  domain={[0, 'auto']}
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  stroke="transparent"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={settings.ketoneWarning} stroke="#F59E0B" strokeDasharray="3 3" />
                <ReferenceLine y={settings.ketoneDanger} label="危險" stroke="#EF4444" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#A855F7"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#A855F7', strokeWidth: 2, stroke: '#fff' }}
                  name="血酮"
                  unit="mmol/L"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {dailyIntakeData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-6 bg-orange-400 rounded-full mr-2"></span>
            每日攝取總量 (Daily Intake)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyIntakeData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  stroke="transparent"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  stroke="transparent"
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f9fafb'}} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                {settings.dailyFeedingTarget > 0 && (
                  <ReferenceLine y={settings.dailyFeedingTarget} label="灌食目標" stroke="#F97316" strokeDasharray="5 5" />
                )}
                 {settings.dailySalineTarget > 0 && (
                  <ReferenceLine y={settings.dailySalineTarget} label="輸液目標" stroke="#06B6D4" strokeDasharray="5 5" />
                )}
                <Bar dataKey="feeding" name="灌食 (ml)" stackId="a" fill="#F97316" radius={[0, 0, 4, 4]} barSize={20} unit="ml" />
                <Bar dataKey="saline" name="輸液 (ml)" stackId="a" fill="#06B6D4" radius={[4, 4, 0, 0]} barSize={20} unit="ml" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};