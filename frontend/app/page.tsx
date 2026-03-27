"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, Droplet, Battery, AlertTriangle, CheckCircle, Wifi, WifiOff, Watch, ShieldAlert, HeartPulse, RefreshCw, LogOut, MessageCircle } from 'lucide-react';

export default function Dashboard() {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  const ws = useRef<WebSocket | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const connectWs = () => {
      ws.current = new WebSocket('ws://localhost:8000/ws/telemetry');

      ws.current.onopen = () => {
        setConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLatest(data);

          setTelemetry(prev => {
            const point = {
              time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              hr: data.payload?.heart_rate?.value,
              glucose: data.payload?.glucose?.value
            };
            const next = [...prev, point];
            return next.slice(-20);
          });

          if (data.payload?.fall_event?.detected) {
            setAlerts(prev => [...prev, `CRITICAL: Fall detected from device ${data.device_id}. Immediate attention required.`]);
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
        setTimeout(connectWs, 5000);
      };
    };

    connectWs();
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white p-4 sm:p-6 lg:p-8 font-sans overflow-x-hidden relative">
      {/* Dynamic Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-rose-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[50%] h-[30%] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 pb-6 border-b border-white/10">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-2 drop-shadow-lg">
              CarePulse
            </h1>
            <p className="text-slate-400 text-sm sm:text-base font-medium flex items-center">
              <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
              Clinical-Grade Wearable Monitoring
            </p>
          </div>
          <div className="flex items-center space-x-4 bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-lg">
            <div className={`flex items-center px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 ${connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
              {connected ? (
                <><Wifi className="w-4 h-4 mr-2" /> Live Stream</>
              ) : (
                <><WifiOff className="w-4 h-4 mr-2" /> Offline</>
              )}
            </div>
            {latest && (
              <div className="flex items-center text-slate-300 font-medium px-2">
                <Battery className={`w-5 h-5 mr-1.5 ${latest.battery_level > 20 ? 'text-emerald-400' : 'text-rose-400'}`} />
                {latest.battery_level}%
              </div>
            )}
            <div className="pl-4 border-l border-white/10 ml-2 h-8 flex items-center">
              <button
                onClick={() => { localStorage.removeItem('token'); router.push('/login'); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20 group"
                title="Logout"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* Alerts Area */}
        {alerts.length > 0 && (
          <div className="mb-8 flex flex-col gap-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="group overflow-hidden relative bg-rose-500/10 border border-rose-500/40 text-rose-100 px-6 py-4 rounded-2xl flex items-center justify-between backdrop-blur-xl shadow-[0_8px_30px_rgb(225,29,72,0.15)] animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-50"></div>
                <div className="relative flex items-center z-10 w-full">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mr-4 flex-shrink-0 animate-bounce">
                    <ShieldAlert className="w-6 h-6 text-rose-400" />
                  </div>
                  <span className="font-semibold text-base sm:text-lg flex-1">{alert}</span>
                </div>
                <button
                  onClick={() => setAlerts(alerts.filter((_, i) => i !== idx))}
                  className="relative z-10 text-sm font-bold border border-rose-500/50 hover:bg-rose-500 hover:text-white px-4 py-2 rounded-lg text-rose-300 transition-all duration-300"
                >
                  DISMISS
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Vitals Grid - Ensure absolute horizontal flow on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 w-full">
          {/* Heart Rate Card */}
          <div className="bg-gradient-to-br from-[#131A2D] to-[#0A0F1C] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-1 hover:border-rose-500/30 transition-all duration-300 shadow-xl hover:shadow-rose-500/10 backdrop-blur-xl w-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[40px] group-hover:bg-rose-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-slate-400 font-medium tracking-wider uppercase text-xs">Heart Rate</h3>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <HeartPulse className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-end mb-2">
              <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">
                {latest?.payload?.heart_rate?.value || '--'}
              </span>
              <span className="ml-3 text-rose-400 font-semibold mb-2">BPM</span>
            </div>
            <div className="w-full bg-slate-800/50 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-gradient-to-r from-rose-500 to-orange-400 h-full rounded-full w-2/3 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
            </div>
          </div>

          {/* Blood Glucose Card */}
          <div className="bg-gradient-to-br from-[#131A2D] to-[#0A0F1C] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-1 hover:border-blue-500/30 transition-all duration-300 shadow-xl hover:shadow-blue-500/10 backdrop-blur-xl w-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-slate-400 font-medium tracking-wider uppercase text-xs">Blood Glucose (NiBG)</h3>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                <Droplet className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-end mb-2">
              <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">
                {latest?.payload?.glucose?.value || '--'}
              </span>
              <span className="ml-3 text-blue-400 font-semibold mb-2">mmol/L</span>
            </div>
            <div className="mt-4 flex items-center">
              {latest?.payload?.glucose?.trend ? (
                <div className="flex items-center text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-md shadow-inner">
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin-slow" />
                  {latest.payload.glucose.trend} Trend
                </div>
              ) : (
                <div className="h-7"></div>
              )}
            </div>
          </div>

          {/* System Status Panel - span 2 cols */}
          <div className="bg-gradient-to-br from-indigo-950/40 to-[#0A0F1C] border border-indigo-500/20 rounded-3xl p-6 lg:col-span-2 relative overflow-hidden backdrop-blur-xl shadow-xl hover:border-indigo-500/40 transition-all duration-300 w-full group">
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-700"></div>

            <div className="flex items-center mb-6">
              <Watch className="w-5 h-5 text-indigo-400 mr-2" />
              <h3 className="text-indigo-200 font-semibold tracking-wider uppercase text-xs">System Telemetry & Device Status</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 h-full">
              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 hover:bg-white/5 transition-colors">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Device ID</p>
                <p className="text-sm font-bold text-slate-200 truncate">{latest?.device_id || 'Waiting...'}</p>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 hover:bg-white/5 transition-colors">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Synced</p>
                <p className="text-sm font-bold text-slate-200 truncate">{latest ? new Date(latest.timestamp).toLocaleTimeString() : '--:--:--'}</p>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 hover:bg-white/5 transition-colors">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Fall Detection</p>
                <div className="flex items-center text-sm font-bold text-emerald-400">
                  <CheckCircle className="w-4 h-4 mr-1.5" /> ONLINE
                </div>
              </div>

              <div className="bg-black/20 rounded-2xl p-4 border border-white/5 hover:bg-white/5 transition-colors">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Network Base</p>
                <p className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                  {latest?.network || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Chart Section */}
        <div className="bg-[#131A2D]/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0F1C]/50 pointer-events-none" />

          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="text-xl font-bold flex items-center tracking-wide">
              <Activity className="w-6 h-6 mr-3 text-purple-400" />
              Live Vitals Stream
            </h3>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 tracking-wider">
              <span className="flex items-center"><div className="w-3 h-3 rounded bg-rose-500 mr-2"></div>HR</span>
              <span className="flex items-center ml-4"><div className="w-3 h-3 rounded bg-blue-500 mr-2"></div>BG</span>
            </div>
          </div>

          <div className="h-[450px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGluc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={12}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#475569"
                  tick={{ fill: '#f43f5e', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#475569"
                  tick={{ fill: '#3b82f6', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '1rem',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(8px)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ fontWeight: 600, padding: '4px 0' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}
                />

                <Area yAxisId="left" type="monotone" dataKey="hr" name="Heart Rate (BPM)" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorHr)" activeDot={{ r: 8, stroke: '#0f172a', strokeWidth: 2 }} />
                <Area yAxisId="right" type="monotone" dataKey="glucose" name="Glucose (mmol/L)" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorGluc)" activeDot={{ r: 8, stroke: '#0f172a', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Floating WhatsApp Emergency Button */}
        <a
          href="https://wa.me/263771549380?text=EMERGENCY%3A%20CarePulse%20System%20Alert.%20Please%20check%20monitor%20dashboard%20immediately."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-[#25D366] hover:bg-[#22c35e] text-white p-4 rounded-full shadow-[0_4px_30px_rgba(37,211,102,0.4)] hover:shadow-[0_8px_40px_rgba(37,211,102,0.6)] transition-all duration-300 hover:-translate-y-2 z-50 group flex items-center justify-center border border-[#25D366]/50 hover:scale-110"
        >
          <MessageCircle className="w-8 h-8" />
          {/* Tooltip on hover */}
          <span className="absolute right-full mr-4 bg-[#131A2D]/90 backdrop-blur-md text-white border border-[#25D366]/30 text-sm font-bold tracking-wide px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-[0_0_15px_rgba(37,211,102,0.2)]">
            Contact Caregiver
          </span>
        </a>

      </div>
    </div>
  );
}
