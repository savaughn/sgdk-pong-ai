// Dynamically load videos from public folder
import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

// Utility to fetch all .mp4 files from the backend API
function useVideoList(): string[] {
    const [videos, setVideos] = useState<string[]>([]);
    useEffect(() => {
        fetch('/api/best_videos')
            .then(res => res.json())
            .then(list => {
                setVideos(list);
            })
            .catch(() => setVideos([]));
    }, []);
    return videos;
}
// ...existing code...

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
);

const WS_URL = 'http://192.168.1.196:5000';

function movingAverage(arr: number[], window: number): number[] {
    return arr.map((_, i) => {
        const start = Math.max(0, i - window + 1);
        const slice = arr.slice(start, i + 1);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
}

// --- Flashy StatCard and MainStatCard components ---
type StatCardProps = {
    label: string;
    value: any;
    icon: string;
    color: string;
    tooltip: string;
};

function StatCard({ label, value, icon, color, tooltip }: StatCardProps) {
    return (
        <div className="relative group bg-gray-800 p-3 rounded flex flex-col items-center justify-center">
            <span className="absolute top-2 right-2 text-sm opacity-70" title={tooltip}>ℹ️</span>
            <span className="text-2xl mb-1">{icon}</span>
            <div className="text-base font-semibold mb-1">{label}</div>
            <div className="text-xl font-mono text-retro-green">{value}</div>
        </div>
    );
}

type MainStatCardProps = {
    label: string;
    value: any;
    color: string;
    icon: string;
};

function MainStatCard({ label, value, color, icon }: MainStatCardProps) {
    return (
        <div className="bg-gray-800 p-4 rounded flex flex-col items-center justify-center w-32 h-32">
            <span className="text-3xl mb-1">{icon}</span>
            <div className="text-base font-semibold mb-1">{label}</div>
            <div className="text-2xl font-mono text-retro-green">{value}</div>
        </div>
    );
}

const TrainingMonitor: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    // Load history from localStorage on mount
    const [history, setHistory] = useState<Array<any>>(() => {
        try {
            const cached = localStorage.getItem('pong_ai_stats_history');
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const chartRef = useRef<any>(null);

    // Add new stats fields to state
    const [epsilon, setEpsilon] = useState<number | null>(null);
    const [steps, setSteps] = useState<number | null>(null);
    const [avgReward, setAvgReward] = useState<number | null>(null);
    const [avgLength, setAvgLength] = useState<number | null>(null);
    const [memory, setMemory] = useState<number | null>(null);
    const [bestScore, setBestScore] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number | null>(null);

    useEffect(() => {
        const socket = io(WS_URL);
        socket.on('connect', () => {
            console.log('[SocketIO] Connected:', socket.id);
        });
        socket.on('stats', (data) => {
            console.log('[SocketIO] Received stats:', data);
            console.log('[SocketIO] Data keys:', Object.keys(data));
            console.log('[SocketIO] Full data object:', JSON.stringify(data, null, 2));
            
            // If episode restarts (goes backwards), clear cache
            if (history.length > 0 && data.episode < history[history.length - 1].episode) {
                console.log('[SocketIO] Episode restart detected, clearing cache');
                localStorage.removeItem('pong_ai_stats_history');
                setHistory([data]);
            } else {
                setStats(data);
                setEpsilon(data.epsilon ?? null);
                setSteps(data.steps ?? null);
                setAvgReward(data.avg_reward ?? null);
                setAvgLength(data.avg_length ?? null);
                setMemory(data.memory ?? null);
                setBestScore(data.best_score ?? null);
                setElapsedTime(data.elapsed_time ?? null);
                setHistory(prev => {
                    const updated = [...prev, data];
                    console.log('[SocketIO] Updated history:', updated);
                    try {
                        localStorage.setItem('pong_ai_stats_history', JSON.stringify(updated));
                    } catch {}
                    return updated;
                });
            }
        });
        socket.on('disconnect', () => {
            console.log('[SocketIO] Disconnected');
        });
        socket.on('connect_error', (err) => {
            console.error('[SocketIO] Connection error:', err);
        });
        return () => socket.disconnect();
    }, []);
    // Optionally clear cache button for user
    const clearCache = () => {
        localStorage.removeItem('pong_ai_stats_history');
        setHistory([]);
    };

    // Export stats as CSV
    const exportCSV = () => {
        const csv = ["episode,reward,loss"].concat(
            history.map(h => `${h.episode},${h.reward},${h.loss}`)
        ).join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pong_ai_stats.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Show/hide analytics
    const [showAnalytics, setShowAnalytics] = React.useState(true);

    // Show raw data table
    // Table always visible, removed showTable toggle

    // Dynamically load videos inside the component
    const videos = useVideoList();
    const [latestVideo, setLatestVideo] = React.useState<string | null>(null);
    const [showDot, setShowDot] = React.useState(false);
    React.useEffect(() => {
        if (videos.length > 0 && videos[0] !== latestVideo) {
            setLatestVideo(videos[0]);
            setShowDot(true);
            setTimeout(() => setShowDot(false), 3000); // Dot visible for 3s
        }
    }, [videos, latestVideo]);

    // Play All Videos function removed

    // Prepare chart data
    // Use actual episode numbers for x-axis labels
    const rewards = history.map(h => h.reward);
    const losses = history.map(h => h.loss);
    const avgRewards = movingAverage(rewards, 20);
    const avgLosses = movingAverage(losses, 20);
    // Use actual episode numbers for x-axis labels, starting at the first cached episode
    const episodes = history.map(h => (typeof h.episode === 'number' ? h.episode : '').toString());

    // Bar chart: average reward/loss per group, with correct episode labels
    const barGroups = 10;
    const groupSize = Math.ceil(history.length / barGroups);
    const barLabels = Array.from({ length: barGroups }, (_, i) => {
        const idx = i * groupSize;
        const ep = history[idx]?.episode;
        return ep !== undefined ? `Ep ${ep}` : `Ep ?`;
    });
    const barRewardData = Array.from({ length: barGroups }, (_, i) => {
        const start = i * groupSize;
        const end = start + groupSize;
        const group = rewards.slice(start, end);
        return group.length ? group.reduce((a, b) => a + b, 0) / group.length : 0;
    });
    const barLossData = Array.from({ length: barGroups }, (_, i) => {
        const start = i * groupSize;
        const end = start + groupSize;
        const group = losses.slice(start, end);
        return group.length ? group.reduce((a, b) => a + b, 0) / group.length : 0;
    });

    // Line chart: reward/loss + moving average
    const last5 = history.slice(-5);
    const lineData = {
        labels: last5.map(h => `Ep ${h.episode}`),
        datasets: [
            {
                label: 'Reward',
                data: last5.map(h => h.reward),
                borderColor: 'rgb(34,197,94)',
                backgroundColor: 'rgba(34,197,94,0.2)',
                yAxisID: 'y',
                pointRadius: 0,
            },
            {
                label: 'Loss',
                data: last5.map(h => h.loss),
                borderColor: 'rgb(239,68,68)',
                backgroundColor: 'rgba(239,68,68,0.2)',
                yAxisID: 'y1',
                pointRadius: 0,
            }
        ]
    };

    // Show true episode number in tooltip
    const lineOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
            title: { display: true, text: 'Training Progress' },
            tooltip: {
                callbacks: {
                    title: (tooltipItems: any) => {
                        const idx = tooltipItems[0].dataIndex;
                        const trueEp = history[idx]?.episode;
                        return trueEp ? `Episode ${trueEp}` : `Index ${idx + 1}`;
                    }
                }
            }
        },
        scales: {
            y: { type: 'linear', display: true, position: 'left' },
            y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
        } as any // Fix chart.js type error
    };

    // Bar chart config
    const barData = {
        labels: barLabels,
        datasets: [
            {
                label: 'Avg Reward',
                data: barRewardData,
                backgroundColor: 'rgba(34,197,94,0.7)',
            },
            {
                label: 'Avg Loss',
                data: barLossData,
                backgroundColor: 'rgba(239,68,68,0.7)',
            }
        ]
    };
    const barOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
            title: { display: true, text: 'Avg Reward/Loss per Group' }
        }
    };

    // Dashboard stats
    const bestReward = rewards.length ? Math.max(...rewards) : 0;
    const bestLoss = losses.length ? Math.max(...losses) : 0;
    const totalEpisodes = history.length;
    const successRate = rewards.length ? (rewards.filter(r => r > 0).length / rewards.length * 100).toFixed(1) : '0.0';
    const trainingStartEp = history[0]?.episode ?? 0;
    const trainingEndEp = history[history.length - 1]?.episode ?? 0;
    const trainingDuration = trainingEndEp && trainingStartEp ? (trainingEndEp - trainingStartEp + 1) : 0;

    // Use the dynamic video list
    // videos already declared above
    const sortedVideos = [...videos].sort((a, b) => b.localeCompare(a));
    const basePath = "/best_videos/20250906/";

    // Get last stat from history if no live stats
    const lastStat = stats ?? (history.length > 0 ? history[history.length - 1] : null);

    // Video list expand/collapse state
    const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

// --- Flashy StatCard and MainStatCard components ---




type StatCardProps = {
    label: string;
    value: any;
    icon: string;
    color: string;
    tooltip: string;
};
function StatCard({ label, value, icon, color, tooltip }: StatCardProps) {
    return (
        <div className={`relative group bg-gradient-to-br ${color} p-4 rounded-xl shadow-lg flex flex-col items-center justify-center transition-transform duration-300 hover:scale-105`}>
            <span className="absolute top-2 right-2 text-lg opacity-70 group-hover:opacity-100 transition-opacity" title={tooltip}>ℹ️</span>
            <span className="text-3xl mb-2 drop-shadow-lg">{icon}</span>
            <div className="text-lg font-bold mb-1 tracking-wide">{label}</div>
            <div className="text-2xl font-mono text-white drop-shadow-xl">{value}</div>
            <div className="absolute bottom-2 left-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-60 px-2 py-1 rounded">{tooltip}</div>
        </div>
    );
}

type MainStatCardProps = {
    label: string;
    value: any;
    color: string;
    icon: string;
};
function MainStatCard({ label, value, color, icon }: MainStatCardProps) {
    return (
        <div className={`bg-gradient-to-br ${color} p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center w-40 h-40 transition-transform duration-300 hover:scale-105`}>
            <span className="text-4xl mb-2 drop-shadow-lg">{icon}</span>
            <div className="text-xl font-bold mb-1 tracking-wide">{label}</div>
            <div className="text-3xl font-mono text-white drop-shadow-xl">{value}</div>
        </div>
    );
}

    console.log('[TrainingMonitor] Table render, history:', history);
    console.log('[TrainingMonitor] History length:', history.length);
    
    // Debug each history item
    history.forEach((h, idx) => {
        console.log(`[TrainingMonitor] History item ${idx}:`, h);
    });

    return (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto mt-8 border-4 border-retro-green animate-fade-in">
            <h2 className="text-3xl font-extrabold mb-6 text-retro-green tracking-wide flex items-center gap-2">
                <span className="inline-block">⚡️</span> Training Analytics
            </h2>
            <table className="w-full text-xs md:text-sm bg-gray-800 rounded mb-8">
                    <thead>
                        <tr className="bg-gray-700 text-retro-green">
                            <th className="p-2">Episode</th>
                            <th className="p-2">Reward</th>
                            <th className="p-2">Loss</th>
                            <th className="p-2">Epsilon</th>
                            <th className="p-2">Steps</th>
                            <th className="p-2">Avg Reward</th>
                            <th className="p-2">Avg Length</th>
                            <th className="p-2">Replay Buffer</th>
                            <th className="p-2">Best Avg Score</th>
                            <th className="p-2">Elapsed Time (min)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-4 text-center text-gray-400">No training data yet...</td>
                            </tr>
                        ) : (
                            last5.map((h, idx) => (
                                <tr key={h.episode ?? idx} className={idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                                    <td className="p-2 text-white">{h.episode ?? '-'}</td>
                                    <td className="p-2 text-white">{typeof h.reward === 'number' ? h.reward.toFixed(2) : '-'}</td>
                                    <td className="p-2 text-white">{typeof h.loss === 'number' ? h.loss.toFixed(6) : '-'}</td>
                                    <td className="p-2 text-white">{h.epsilon ? h.epsilon.toFixed(3) : '-'}</td>
                                    <td className="p-2 text-white">{h.steps ?? '-'}</td>
                                    <td className="p-2 text-white">{h.avg_reward ? h.avg_reward.toFixed(2) : '-'}</td>
                                    <td className="p-2 text-white">{h.avg_length ? h.avg_length.toFixed(1) : '-'}</td>
                                    <td className="p-2 text-white">{h.memory ?? '-'}</td>
                                    <td className="p-2 text-white">{h.best_score ? h.best_score.toFixed(2) : '-'}</td>
                                    <td className="p-2 text-white">{h.elapsed_time ? (h.elapsed_time/60).toFixed(1) : '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            {/* Main episode/reward/loss cards */}
            <div className="mb-8 flex flex-wrap gap-6 justify-center">
                <MainStatCard label="Episode" value={lastStat?.episode ?? '-'} color="from-retro-green to-retro-blue" icon="🎬" />
                <MainStatCard label="Reward" value={typeof lastStat?.reward === 'number' ? lastStat.reward.toFixed(2) : '-'} color="from-retro-yellow to-retro-green" icon="💸" />
                <MainStatCard label="Loss" value={lastStat?.loss ?? '-'} color="from-retro-red to-retro-yellow" icon="🔥" />
            </div>
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mb-8 justify-center">
                <button className="px-4 py-2 bg-retro-red text-white rounded-lg shadow hover:bg-retro-red-dark transition-all text-sm font-bold" onClick={clearCache}>Clear Stats Cache</button>
                <button className="px-4 py-2 bg-retro-green text-white rounded-lg shadow hover:bg-retro-green-dark transition-all text-sm font-bold" onClick={exportCSV}>Export CSV</button>
                <button className="px-4 py-2 bg-retro-blue text-white rounded-lg shadow hover:bg-retro-blue-dark transition-all text-sm font-bold" onClick={() => setShowAnalytics(v => !v)}>{showAnalytics ? 'Hide Analytics' : 'Show Analytics'}</button>
                {/* Table toggle removed, table always visible */}
            </div>
            {/* Latest best video always visible, notification dot on new video */}
            {latestVideo && (
                <div className="bg-gray-800 p-4 rounded mb-6 relative">
                    <h3 className="text-xl font-bold mb-2 text-retro-green">Latest Best Video</h3>
                    {showDot && (
                        <span style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#ff0',
                            boxShadow: '0 0 8px #ff0',
                            zIndex: 10,
                            border: '2px solid #333'
                        }}></span>
                    )}
                    <video key={latestVideo} controls style={{ width: '100%', borderRadius: '8px', background: '#111' }}>
                        <source src={`/best_videos/20250906/${latestVideo}`} type="video/mp4" />
                        <track kind="captions" label="English captions" srcLang="en" default />
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}
            {/* Charts Section - two charts below best video */}
            <div className="bg-gray-800 p-4 rounded mb-6">
                <Line ref={chartRef} data={lineData} options={lineOptions} />
            </div>
            <div className="bg-gray-800 p-4 rounded mb-6">
                <Bar data={barData} options={barOptions} />
            </div>
            {/* List of available playback videos */}
            <div className="bg-gray-800 p-4 rounded mb-6">
                <h3 className="text-xl font-bold mb-2 text-retro-green">Available Playback Videos</h3>
                <ul className="divide-y divide-gray-700">
                    {sortedVideos.map(filename => {
                        // Parse filename: best_game_YYYYMMDD_HHMMSS.mp4
                        const match = filename.match(/best_game_(\d{8})_(\d{6})\.mp4/);
                        let label = filename;
                        if (match) {
                            const dateStr = match[1];
                            const timeStr = match[2];
                            // Format date and time
                            const year = dateStr.slice(0, 4);
                            const month = dateStr.slice(4, 6);
                            const day = dateStr.slice(6, 8);
                            const hour = timeStr.slice(0, 2);
                            const min = timeStr.slice(2, 4);
                            const sec = timeStr.slice(4, 6);
                            label = `${year}-${month}-${day} ${hour}:${min}:${sec}`;
                        }
                        return (
                            <li key={filename} className="py-2">
                                <button
                                    className="text-retro-green font-mono hover:underline focus:outline-none"
                                    onClick={() => setExpandedVideo(expandedVideo === filename ? null : filename)}
                                >
                                    {label}
                                </button>
                                {expandedVideo === filename && (
                                    <div className="mt-2">
                                        <video controls style={{ width: '100%', borderRadius: '8px', background: '#111' }}>
                                            <source src={basePath + filename} type="video/mp4" />
                                            <track kind="captions" label="English captions" srcLang="en" default />
                                            Your browser does not support the video tag.
                                        </video>
                                        {/* Optionally link to replay HTML if available */}
                                        <div className="mt-2 text-sm text-retro-green">
                                            <a href={basePath + `pong_ai_replay_best_${filename.replace('best_game_', '').replace('.mp4', '')}.html`} target="_blank" rel="noopener noreferrer">Full Replay & Stats</a>
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default TrainingMonitor;
