export enum LogCategory {
  GLUCOSE = '血糖',
  KETONE = '血酮',
  FEEDING = '灌食',
  SALINE = '皮下輸液',
  MEDS = '藥物/膠囊'
}

export enum Units {
  MG_DL = 'mg/dL',
  MMOL_L = 'mmol/L',
  ML = 'ml',
  PILL = '顆/粒',
  NONE = ''
}

export interface LogEntry {
  id: string;
  timestamp: number;
  category: LogCategory;
  value: number;
  unit: string;
  note: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type Tab = 'dashboard' | 'log' | 'history' | 'assistant';