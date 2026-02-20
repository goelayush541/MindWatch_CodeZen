import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, ArcElement } from 'chart.js';
import { RiAddLine, RiCheckLine, RiDeleteBinLine, RiRefreshLine, RiLoader4Line } from 'react-icons/ri';
import './MoodTracker.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, ArcElement);

const EMOTIONS = [
    { value: 'happy', emoji: '😊', label: 'Happy', color: '#fcd34d' },
    { value: 'calm', emoji: '😌', label: 'Calm', color: '#6ee7b7' },
    { value: 'hopeful', emoji: '🌱', label: 'Hopeful', color: '#86efac' },
    { value: 'excited', emoji: '🤩', label: 'Excited', color: '#fde68a' },
    { value: 'neutral', emoji: '😐', label: 'Neutral', color: '#94a3b8' },
    { value: 'anxious', emoji: '😰', label: 'Anxious', color: '#f9a8d4' },
    { value: 'sad', emoji: '😢', label: 'Sad', color: '#93c5fd' },
    { value: 'stressed', emoji: '😫', label: 'Stressed', color: '#fca5a5' },
    { value: 'overwhelmed', emoji: '🥺', label: 'Overwhelmed', color: '#c4b5fd' },
    { value: 'angry', emoji: '😤', label: 'Angry', color: '#fb7185' }
];

const TRIGGERS = ['work', 'family', 'health', 'finances', 'relationships', 'sleep', 'exercise', 'diet', 'social', 'personal'];

const MoodTracker = () => {
    const [form, setForm] = useState({
        score: 5, emotion: 'neutral', notes: '', triggers: [], energyLevel: 3, sleepHours: ''
    });
    const [moodLogs, setMoodLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [activeTab, setActiveTab] = useState('log');
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const [logsRes, statsRes] = await Promise.all([
                api.get('/mood?limit=30'),
                api.get('/mood/stats')
            ]);
            setMoodLogs(logsRes.data.data || []);
            setStats(statsRes.data.data);
        } catch (err) {
            console.error('Fetch mood data error:', err);
            setFetchError('Unable to load mood data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.emotion) return toast.error('Please select an emotion');
        setSubmitting(true);
        setAiResult(null);
        try {
            const payload = { ...form, sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : null };
            const res = await api.post('/mood', payload);
            setAiResult(res.data.data);
            toast.success('Mood logged! 🎉');
            setForm({ score: 5, emotion: 'neutral', notes: '', triggers: [], energyLevel: 3, sleepHours: '' });
            fetchData();
        } catch (err) {
            console.error('Submit mood error:', err);
            toast.error('Failed to log mood. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (deletingId) return;
        setDeletingId(id);
        try {
            await api.delete(`/mood/${id}`);
            toast.success('Mood log deleted');
            fetchData();
        } catch {
            toast.error('Failed to delete mood log');
        } finally {
            setDeletingId(null);
        }
    };

    const toggleTrigger = (trigger) => {
        setForm(prev => ({
            ...prev,
            triggers: prev.triggers.includes(trigger)
                ? prev.triggers.filter(t => t !== trigger)
                : [...prev.triggers, trigger]
        }));
    };

    const selectedEmotion = EMOTIONS.find(e => e.value === form.emotion);

    // --- Render helper: AI Suggestions (handles string / array / object) ---
    const renderAiSuggestions = (suggestions) => {
        if (!suggestions) return null;

        // String response
        if (typeof suggestions === 'string') {
            return (
                <div className="ai-insights-box">
                    <p className="ai-result-insights">{suggestions}</p>
                </div>
            );
        }

        // Array response
        if (Array.isArray(suggestions)) {
            return (
                <div className="ai-suggestions-list">
                    {suggestions.map((tip, idx) => (
                        <div key={idx} className="category-tip-item">
                            <RiCheckLine size={14} className="tip-check" />
                            <span>{typeof tip === 'string' ? tip : JSON.stringify(tip)}</span>
                        </div>
                    ))}
                </div>
            );
        }

        // Object (categorized) response — the expected format
        if (typeof suggestions === 'object') {
            const categories = Object.entries(suggestions).filter(
                ([key, val]) => key !== 'overallAdvice' && Array.isArray(val)
            );
            return (
                <div className="ai-categorized-suggestions">
                    {categories.map(([category, tips]) => (
                        <div key={category} className="suggestion-category-group">
                            <div className="category-header">
                                <span className={`category-tag tag-${category}`}>{category}</span>
                            </div>
                            <div className="category-tips">
                                {tips.map((tip, idx) => (
                                    <div key={idx} className="category-tip-item">
                                        <RiCheckLine size={14} className="tip-check" />
                                        <span>{typeof tip === 'string' ? tip : JSON.stringify(tip)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {suggestions.overallAdvice && (
                        <div className="overall-advice-box">
                            <p>{suggestions.overallAdvice}</p>
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    // --- Chart data ---
    const trendChartData = {
        labels: (stats?.trend || []).slice(-14).map(d => {
            const date = new Date(d.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [{
            label: 'Mood',
            data: (stats?.trend || []).slice(-14).map(d => d.average),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139,92,246,0.1)',
            fill: true, tension: 0.4,
            pointBackgroundColor: '#8b5cf6',
            pointRadius: 5, borderWidth: 2
        }]
    };

    const emotionFreqData = stats?.emotionFrequency ? {
        labels: Object.keys(stats.emotionFrequency).map(e => e.charAt(0).toUpperCase() + e.slice(1)),
        datasets: [{
            data: Object.values(stats.emotionFrequency),
            backgroundColor: Object.keys(stats.emotionFrequency).map(
                e => EMOTIONS.find(em => em.value === e)?.color || '#6b7280'
            ),
            borderWidth: 0,
            hoverOffset: 8
        }]
    } : null;

    const triggerFreqEntries = stats?.triggerFrequency
        ? Object.entries(stats.triggerFrequency).sort((a, b) => b[1] - a[1])
        : [];

    // Streak calculation
    const calculateStreak = () => {
        if (!moodLogs.length) return 0;
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sortedLogs = [...moodLogs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const logDates = new Set(sortedLogs.map(l => new Date(l.createdAt).toISOString().split('T')[0]));

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (logDates.has(dateStr)) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        return streak;
    };

    // --- Loading / error states ---
    if (loading && !moodLogs.length) {
        return (
            <div className="mood-page animate-fadeInUp">
                <div className="page-header">
                    <h1 className="page-title">Mood Tracker</h1>
                    <p className="page-subtitle">Track your emotional wellbeing and receive AI-powered insights</p>
                </div>
                <div className="mood-loading">
                    <div className="loading-spinner-container">
                        <RiLoader4Line size={36} className="spin-icon" />
                        <p>Loading your mood data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (fetchError && !moodLogs.length) {
        return (
            <div className="mood-page animate-fadeInUp">
                <div className="page-header">
                    <h1 className="page-title">Mood Tracker</h1>
                    <p className="page-subtitle">Track your emotional wellbeing and receive AI-powered insights</p>
                </div>
                <div className="mood-error glass-card">
                    <div className="mood-error-icon">⚠️</div>
                    <p className="mood-error-text">{fetchError}</p>
                    <button className="btn btn-primary" onClick={fetchData}>
                        <RiRefreshLine size={16} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mood-page animate-fadeInUp">
            <div className="page-header">
                <h1 className="page-title">Mood Tracker</h1>
                <p className="page-subtitle">Track your emotional wellbeing and receive AI-powered insights</p>
            </div>

            <div className="mood-tabs">
                {['log', 'history', 'insights'].map(tab => (
                    <button key={tab} className={`mood-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* ==================== LOG TAB ==================== */}
            {activeTab === 'log' && (
                <div className="mood-log-layout">
                    <form onSubmit={handleSubmit} className="mood-form glass-card">
                        <h3 className="mood-form-title">How are you feeling right now?</h3>

                        {/* Emotion Picker */}
                        <div className="emotion-grid">
                            {EMOTIONS.map(e => (
                                <button
                                    key={e.value} type="button"
                                    className={`emotion-btn ${form.emotion === e.value ? 'selected' : ''}`}
                                    style={form.emotion === e.value ? { borderColor: e.color, background: `${e.color}15` } : {}}
                                    onClick={() => setForm(prev => ({ ...prev, emotion: e.value }))}
                                >
                                    <span className="emotion-btn-emoji">{e.emoji}</span>
                                    <span className="emotion-btn-label" style={form.emotion === e.value ? { color: e.color } : {}}>{e.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Score Slider */}
                        <div className="form-group">
                            <label className="form-label">
                                Mood Score: <strong style={{ color: selectedEmotion?.color || '#8b5cf6' }}>{form.score}/10</strong>
                            </label>
                            <div className="slider-wrapper">
                                <span>1</span>
                                <input
                                    type="range" min="1" max="10" step="1"
                                    value={form.score}
                                    onChange={e => setForm(prev => ({ ...prev, score: parseInt(e.target.value) }))}
                                    className="mood-slider"
                                    style={{ '--track-color': selectedEmotion?.color || '#8b5cf6' }}
                                />
                                <span>10</span>
                            </div>
                        </div>

                        {/* Energy Level */}
                        <div className="form-group">
                            <label className="form-label">Energy Level: {['😴', '😑', '😐', '😊', '⚡'][form.energyLevel - 1]} {form.energyLevel}/5</label>
                            <div className="energy-btns">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button key={n} type="button"
                                        className={`energy-btn ${form.energyLevel === n ? 'active' : ''}`}
                                        onClick={() => setForm(prev => ({ ...prev, energyLevel: n }))}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sleep */}
                        <div className="form-group">
                            <label className="form-label">Sleep (hours last night)</label>
                            <input
                                type="number" min="0" max="24" step="0.5"
                                className="form-input"
                                placeholder="e.g. 7.5"
                                value={form.sleepHours}
                                onChange={e => setForm(prev => ({ ...prev, sleepHours: e.target.value }))}
                            />
                        </div>

                        {/* Triggers */}
                        <div className="form-group">
                            <label className="form-label">What triggered this mood?</label>
                            <div className="trigger-grid">
                                {TRIGGERS.map(t => (
                                    <button key={t} type="button"
                                        className={`trigger-chip ${form.triggers.includes(t) ? 'selected' : ''}`}
                                        onClick={() => toggleTrigger(t)}>
                                        {form.triggers.includes(t) && <RiCheckLine size={12} />}
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <textarea
                                className="form-input"
                                placeholder="Any additional thoughts or context..."
                                value={form.notes}
                                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                            {submitting ? <><RiLoader4Line size={16} className="spin-icon" /> Analyzing...</> : <><RiAddLine size={16} /> Log My Mood</>}
                        </button>
                    </form>

                    {/* AI Result */}
                    {aiResult && (
                        <div className="ai-result glass-card animate-fadeInUp">
                            <div className="ai-result-header">
                                <span className="ai-result-title">🤖 AI Wellness Analysis</span>
                                <span className="badge-emotion" style={{
                                    background: (EMOTIONS.find(e => e.value === aiResult.emotion)?.color || '#8b5cf6') + '30',
                                    color: EMOTIONS.find(e => e.value === aiResult.emotion)?.color || '#8b5cf6'
                                }}>
                                    {aiResult.emotion}
                                </span>
                            </div>

                            {aiResult.aiAnalysis && (
                                <div className="ai-insights-box">
                                    <p className="ai-result-insights">{aiResult.aiAnalysis}</p>
                                </div>
                            )}

                            {renderAiSuggestions(aiResult.aiSuggestions)}
                        </div>
                    )}
                </div>
            )}

            {/* ==================== HISTORY TAB ==================== */}
            {activeTab === 'history' && (
                <div className="mood-history">
                    {moodLogs.length === 0 ? (
                        <div className="empty-state glass-card">
                            <div className="empty-state-icon">📊</div>
                            <div className="empty-state-title">No mood logs yet</div>
                            <p className="empty-state-text">Start by logging your first mood in the Log tab!</p>
                        </div>
                    ) : (
                        moodLogs.map(log => {
                            const em = EMOTIONS.find(e => e.value === log.emotion);
                            return (
                                <div key={log._id} className="mood-history-item glass-card">
                                    <div className="mood-history-emoji">{em?.emoji || '😐'}</div>
                                    <div className="mood-history-info">
                                        <div className="mood-history-top">
                                            <span className="mood-history-emotion" style={{ color: em?.color }}>{log.emotion}</span>
                                            <span className="mood-history-score">{log.score}/10</span>
                                            {log.energyLevel && <span className="mood-history-energy">⚡{log.energyLevel}/5</span>}
                                            {log.sleepHours != null && <span className="mood-history-sleep">😴{log.sleepHours}h</span>}
                                            <span className="mood-history-date">{new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {log.notes && <p className="mood-history-notes">{log.notes}</p>}
                                        {log.triggers?.length > 0 && (
                                            <div className="mood-history-triggers">
                                                {log.triggers.map(t => <span key={t} className="trigger-tag">{t}</span>)}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="mood-delete-btn"
                                        onClick={() => handleDelete(log._id)}
                                        disabled={deletingId === log._id}
                                        title="Delete mood log"
                                    >
                                        {deletingId === log._id
                                            ? <RiLoader4Line size={16} className="spin-icon" />
                                            : <RiDeleteBinLine size={16} />}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ==================== INSIGHTS TAB ==================== */}
            {activeTab === 'insights' && (
                <div className="mood-insights">
                    {/* Stats Cards */}
                    {stats && (
                        <div className="insights-stats-grid">
                            <div className="stat-card glass-card">
                                <div className="stat-value" style={{ color: '#8b5cf6' }}>{stats.averageMood}</div>
                                <div className="stat-label">Average Mood</div>
                                <div className="stat-sublabel">out of 10</div>
                            </div>
                            <div className="stat-card glass-card">
                                <div className="stat-value" style={{ color: '#10b981' }}>{stats.totalLogs}</div>
                                <div className="stat-label">Total Logs</div>
                                <div className="stat-sublabel">past 30 days</div>
                            </div>
                            <div className="stat-card glass-card">
                                <div className="stat-value" style={{ color: '#06b6d4' }}>{calculateStreak()}</div>
                                <div className="stat-label">Day Streak</div>
                                <div className="stat-sublabel">🔥 keep going!</div>
                            </div>
                            <div className="stat-card glass-card">
                                <div className="stat-value" style={{ color: '#f59e0b' }}>
                                    {EMOTIONS.find(e => e.value === Object.entries(stats.emotionFrequency || {}).sort((a, b) => b[1] - a[1])[0]?.[0])?.emoji || '—'}
                                </div>
                                <div className="stat-label">Top Emotion</div>
                                <div className="stat-sublabel">{Object.entries(stats.emotionFrequency || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}</div>
                            </div>
                        </div>
                    )}

                    {/* Mood Trend Chart */}
                    <div className="insights-chart-card glass-card">
                        <h3 className="insights-section-title">📈 14-Day Mood Trend</h3>
                        {stats?.trend?.length > 0 ? (
                            <div className="chart-container">
                                <Line data={trendChartData} options={{
                                    responsive: true, maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 11 } } },
                                        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { size: 11 } }, min: 0, max: 10 }
                                    }
                                }} />
                            </div>
                        ) : (
                            <div className="empty-state-inline">
                                <span>📈</span> Log moods to see your trend
                            </div>
                        )}
                    </div>

                    {/* Emotion Distribution + Trigger Frequency */}
                    <div className="insights-bottom-grid">
                        {/* Emotion Frequency Doughnut */}
                        <div className="insights-chart-card glass-card">
                            <h3 className="insights-section-title">🎭 Emotion Distribution</h3>
                            {emotionFreqData ? (
                                <div className="doughnut-container">
                                    <Doughnut data={emotionFreqData} options={{
                                        responsive: true, maintainAspectRatio: false,
                                        cutout: '60%',
                                        plugins: {
                                            legend: {
                                                position: 'bottom',
                                                labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 10 }
                                            }
                                        }
                                    }} />
                                </div>
                            ) : (
                                <div className="empty-state-inline">
                                    <span>🎭</span> No emotion data yet
                                </div>
                            )}
                        </div>

                        {/* Trigger Frequency Bars */}
                        <div className="insights-chart-card glass-card">
                            <h3 className="insights-section-title">🎯 Top Triggers</h3>
                            {triggerFreqEntries.length > 0 ? (
                                <div className="trigger-freq-list">
                                    {triggerFreqEntries.slice(0, 8).map(([trigger, count]) => {
                                        const maxCount = triggerFreqEntries[0][1];
                                        const pct = Math.round((count / maxCount) * 100);
                                        return (
                                            <div key={trigger} className="trigger-freq-item">
                                                <div className="trigger-freq-label">
                                                    <span className="trigger-freq-name">{trigger}</span>
                                                    <span className="trigger-freq-count">{count}</span>
                                                </div>
                                                <div className="trigger-freq-bar-bg">
                                                    <div className="trigger-freq-bar-fill" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state-inline">
                                    <span>🎯</span> No trigger data yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoodTracker;
