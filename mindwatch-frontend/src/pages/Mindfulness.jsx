import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { RiLeafLine, RiPlayLine, RiStopLine, RiTimeLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';
import './Mindfulness.css';

const TECHNIQUES = [
    { id: 'box-breathing', name: 'Box Breathing', emoji: '📦', inhale: 4, hold1: 4, exhale: 4, hold2: 4, color: '#8b5cf6', desc: 'Used by Navy SEALs to reduce stress instantly' },
    { id: '4-7-8', name: '4-7-8 Breathing', emoji: '🌙', inhale: 4, hold1: 7, exhale: 8, hold2: 0, color: '#06b6d4', desc: 'Dr. Weil\'s natural tranquilizer for the nervous system' },
    { id: 'deep-breathing', name: 'Deep Belly', emoji: '🌊', inhale: 5, hold1: 0, exhale: 5, hold2: 0, color: '#10b981', desc: 'Simple diaphragmatic breathing for instant calm' },
    { id: 'coherent', name: 'Coherent', emoji: '💫', inhale: 6, hold1: 0, exhale: 6, hold2: 0, color: '#f59e0b', desc: 'Heart-brain coherence for deep relaxation' },
];

const PHASES = ['inhale', 'hold1', 'exhale', 'hold2'];
const PHASE_LABELS = { inhale: 'Inhale', hold1: 'Hold', exhale: 'Exhale', hold2: 'Hold' };

// ========== YOGA DATA ==========
const YOGA_POSES = [
    {
        id: 'mountain', name: 'Mountain Pose', sanskrit: 'Tadasana', emoji: '🏔️',
        duration: 60, difficulty: 'Beginner', color: '#8b5cf6',
        benefits: ['Improves posture', 'Strengthens thighs & ankles', 'Grounds the nervous system'],
        steps: [
            'Stand tall with feet hip-width apart, toes spread',
            'Distribute weight evenly across both feet',
            'Engage your thighs, draw your tailbone down',
            'Roll shoulders back and down, arms at sides with palms forward',
            'Lengthen through the crown of your head',
            'Breathe deeply — feel your body connecting to the earth'
        ],
        focus: 'Grounding & body awareness'
    },
    {
        id: 'tree', name: 'Tree Pose', sanskrit: 'Vrksasana', emoji: '🌳',
        duration: 45, difficulty: 'Beginner', color: '#10b981',
        benefits: ['Improves balance & focus', 'Strengthens legs', 'Calms the mind'],
        steps: [
            'Begin in Mountain Pose',
            'Shift weight onto your left foot',
            'Place right foot on inner left thigh or calf (avoid the knee)',
            'Press foot and leg into each other for stability',
            'Bring hands to prayer position at heart, or extend arms overhead',
            'Fix gaze on a steady point ahead — hold for 30-45 seconds, then switch sides'
        ],
        focus: 'Balance & mental focus'
    },
    {
        id: 'warrior-2', name: 'Warrior II', sanskrit: 'Virabhadrasana II', emoji: '⚔️',
        duration: 45, difficulty: 'Beginner', color: '#f59e0b',
        benefits: ['Builds strength & stamina', 'Opens hips & chest', 'Cultivates inner power'],
        steps: [
            'Step feet wide apart, about 3-4 feet',
            'Turn right foot out 90°, left foot slightly inward',
            'Bend right knee directly over right ankle',
            'Extend arms parallel to the floor, palms down',
            'Gaze past your right fingertips with soft focus',
            'Root down through both feet, breathe steadily — hold 30 seconds per side'
        ],
        focus: 'Strength & confidence'
    },
    {
        id: 'child', name: 'Child\'s Pose', sanskrit: 'Balasana', emoji: '🧒',
        duration: 90, difficulty: 'Beginner', color: '#06b6d4',
        benefits: ['Releases back tension', 'Calms nervous system', 'Promotes surrender & rest'],
        steps: [
            'Kneel on the floor, big toes touching, knees hip-width apart',
            'Slowly fold forward, laying your torso between your thighs',
            'Extend arms forward on the floor, forehead resting down',
            'Let your shoulders melt away from your ears',
            'Breathe into your lower back — feel it expand with each inhale',
            'Stay here for 1-3 minutes, releasing deeper with each exhale'
        ],
        focus: 'Surrender & deep rest'
    },
    {
        id: 'downdog', name: 'Downward Dog', sanskrit: 'Adho Mukha Svanasana', emoji: '🐕',
        duration: 60, difficulty: 'Beginner', color: '#ec4899',
        benefits: ['Full body stretch', 'Energizes & relieves fatigue', 'Builds upper body strength'],
        steps: [
            'Start on hands and knees, wrists under shoulders',
            'Tuck toes, lift hips up and back toward the ceiling',
            'Straighten legs as much as feels comfortable (slight bend is fine)',
            'Press palms firmly, spread fingers wide',
            'Let your head hang naturally between your arms',
            'Pedal feet gently to warm up calves — hold for 5-8 breaths'
        ],
        focus: 'Full-body energy reset'
    },
    {
        id: 'cobra', name: 'Cobra Pose', sanskrit: 'Bhujangasana', emoji: '🐍',
        duration: 30, difficulty: 'Beginner', color: '#ef4444',
        benefits: ['Opens the chest', 'Strengthens spine', 'Counteracts desk posture'],
        steps: [
            'Lie face down, legs extended, tops of feet on the floor',
            'Place hands under shoulders, elbows close to body',
            'On an inhale, gently press into your hands to lift chest',
            'Keep elbows slightly bent — lift only as high as feels good',
            'Roll shoulders back, open across your collarbones',
            'Hold for 15-30 seconds, breathing steadily — lower slowly on exhale'
        ],
        focus: 'Heart opening & spinal health'
    },
    {
        id: 'corpse', name: 'Corpse Pose', sanskrit: 'Savasana', emoji: '🧘',
        duration: 300, difficulty: 'Beginner', color: '#6366f1',
        benefits: ['Deep relaxation', 'Integrates practice benefits', 'Activates parasympathetic rest'],
        steps: [
            'Lie on your back, legs extended, arms by your sides with palms up',
            'Close your eyes, let your feet fall open naturally',
            'Soften every muscle — jaw, shoulders, hands, toes',
            'Scan from head to toes, releasing tension at each point',
            'Let your breathing become completely natural',
            'Rest here for 3-5 minutes, allowing total stillness'
        ],
        focus: 'Total relaxation & integration'
    },
    {
        id: 'cat-cow', name: 'Cat-Cow Flow', sanskrit: 'Marjaryasana-Bitilasana', emoji: '🐱',
        duration: 60, difficulty: 'Beginner', color: '#f97316',
        benefits: ['Warms up the spine', 'Releases back tension', 'Syncs movement with breath'],
        steps: [
            'Start on hands and knees, wrists under shoulders, knees under hips',
            'INHALE (Cow): Drop belly, lift chest and tailbone, gaze up',
            'EXHALE (Cat): Round spine, tuck chin to chest, draw belly in',
            'Flow smoothly between these positions with your breath',
            'Move at your own pace — let the breath lead the movement',
            'Continue for 8-10 rounds, feeling your spine become fluid'
        ],
        focus: 'Spinal mobility & breath sync'
    }
];

const YOGA_FLOWS = [
    {
        id: 'morning-energy', name: 'Morning Energy', emoji: '🌅', duration: '10 min', color: '#f59e0b',
        desc: 'Wake up your body & mind',
        poses: ['mountain', 'cat-cow', 'downdog', 'warrior-2', 'cobra', 'mountain']
    },
    {
        id: 'stress-relief', name: 'Stress Relief', emoji: '🌿', duration: '12 min', color: '#10b981',
        desc: 'Release tension & find calm',
        poses: ['child', 'cat-cow', 'downdog', 'child', 'corpse']
    },
    {
        id: 'desk-break', name: 'Desk Break', emoji: '💻', duration: '5 min', color: '#06b6d4',
        desc: 'Quick recovery from screen time',
        poses: ['mountain', 'cat-cow', 'cobra', 'child']
    },
    {
        id: 'evening-wind-down', name: 'Evening Wind-Down', emoji: '🌙', duration: '15 min', color: '#8b5cf6',
        desc: 'Prepare your body for restful sleep',
        poses: ['child', 'cat-cow', 'tree', 'child', 'corpse']
    }
];

const Mindfulness = () => {
    const [mainTab, setMainTab] = useState('breathing');
    const [selected, setSelected] = useState(TECHNIQUES[0]);
    const [isRunning, setIsRunning] = useState(false);
    const [phase, setPhase] = useState('inhale');
    const [countdown, setCountdown] = useState(4);
    const [cycles, setCycles] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [moodBefore, setMoodBefore] = useState(5);
    const [moodAfter, setMoodAfter] = useState(null);
    const [showPostSession, setShowPostSession] = useState(false);
    const [sessions, setSessions] = useState([]);

    // Yoga state
    const [yogaTab, setYogaTab] = useState('poses');
    const [selectedPose, setSelectedPose] = useState(null);
    const [selectedFlow, setSelectedFlow] = useState(null);
    const [flowStep, setFlowStep] = useState(0);
    const [yogaTimer, setYogaTimer] = useState(0);
    const [yogaRunning, setYogaRunning] = useState(false);
    const yogaTimerRef = useRef(null);

    const timerRef = useRef(null);
    const elapsedRef = useRef(null);

    useEffect(() => { fetchSessions(); }, []);

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            clearInterval(elapsedRef.current);
            clearInterval(yogaTimerRef.current);
        };
    }, []);

    // Yoga timer effect
    useEffect(() => {
        if (yogaRunning && yogaTimer > 0) {
            yogaTimerRef.current = setInterval(() => {
                setYogaTimer(t => {
                    if (t <= 1) {
                        clearInterval(yogaTimerRef.current);
                        setYogaRunning(false);
                        toast.success('Pose complete! 🧘');
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => clearInterval(yogaTimerRef.current);
    }, [yogaRunning]);

    const fetchSessions = async () => {
        try {
            const res = await api.get('/mindfulness/sessions?limit=5');
            setSessions(res.data.data || []);
        } catch { /**/ }
    };

    const startBreathing = () => {
        setIsRunning(true);
        setPhase('inhale');
        setCountdown(selected.inhale);
        setCycles(0);
        setElapsedSeconds(0);

        elapsedRef.current = setInterval(() => {
            setElapsedSeconds(s => s + 1);
        }, 1000);

        runPhase('inhale', selected, 0);
    };

    const runPhase = (currentPhase, tech, currentCycles) => {
        const duration = tech[currentPhase === 'hold1' ? 'hold1' : currentPhase === 'hold2' ? 'hold2' : currentPhase] || 0;

        if (duration === 0) {
            const phases = PHASES.filter(p => tech[p] > 0);
            const currentIdx = phases.indexOf(currentPhase);
            const nextPhase = phases[(currentIdx + 1) % phases.length];
            const newCycles = nextPhase === 'inhale' ? currentCycles + 1 : currentCycles;
            setPhase(nextPhase);
            setCountdown(tech[nextPhase]);
            if (nextPhase === 'inhale') setCycles(newCycles);
            timerRef.current = setTimeout(() => runPhase(nextPhase, tech, newCycles), tech[nextPhase] * 1000);
            return;
        }

        let remaining = duration;
        setCountdown(remaining);

        timerRef.current = setInterval(() => {
            remaining -= 1;
            setCountdown(remaining);

            if (remaining <= 0) {
                clearInterval(timerRef.current);
                const phases = PHASES.filter(p => tech[p] > 0);
                const currentIdx = phases.indexOf(currentPhase);
                const nextPhase = phases[(currentIdx + 1) % phases.length];
                const newCycles = nextPhase === 'inhale' ? currentCycles + 1 : currentCycles;
                setPhase(nextPhase);
                if (nextPhase === 'inhale') setCycles(newCycles);
                setCountdown(tech[nextPhase]);
                timerRef.current = setTimeout(() => runPhase(nextPhase, tech, newCycles), 0);
            }
        }, 1000);
    };

    const stopBreathing = () => {
        clearInterval(timerRef.current);
        clearInterval(elapsedRef.current);
        setIsRunning(false);
        if (elapsedSeconds > 10) setShowPostSession(true);
    };

    const saveSession = async () => {
        try {
            await api.post('/mindfulness/session', {
                technique: selected.id,
                duration: elapsedSeconds,
                cycles,
                moodBefore,
                moodAfter: moodAfter || moodBefore
            });
            toast.success('Session saved! 🌿');
            setShowPostSession(false);
            setMoodAfter(null);
            fetchSessions();
        } catch { toast.error('Failed to save session'); }
    };

    // Yoga helpers
    const startPoseTimer = (pose) => {
        setSelectedPose(pose);
        setYogaTimer(pose.duration);
        setYogaRunning(true);
    };

    const stopPoseTimer = () => {
        clearInterval(yogaTimerRef.current);
        setYogaRunning(false);
        setYogaTimer(0);
    };

    const startFlow = (flow) => {
        setSelectedFlow(flow);
        setFlowStep(0);
        const firstPose = YOGA_POSES.find(p => p.id === flow.poses[0]);
        if (firstPose) {
            setSelectedPose(firstPose);
            setYogaTimer(firstPose.duration);
            setYogaRunning(true);
        }
    };

    const nextFlowStep = () => {
        if (!selectedFlow) return;
        const nextIdx = flowStep + 1;
        if (nextIdx >= selectedFlow.poses.length) {
            toast.success('Flow complete! Namaste 🙏');
            setSelectedFlow(null);
            setYogaRunning(false);
            setYogaTimer(0);
            setSelectedPose(null);
            return;
        }
        setFlowStep(nextIdx);
        const nextPose = YOGA_POSES.find(p => p.id === selectedFlow.poses[nextIdx]);
        if (nextPose) {
            setSelectedPose(nextPose);
            setYogaTimer(nextPose.duration);
            setYogaRunning(true);
        }
    };

    const prevFlowStep = () => {
        if (!selectedFlow || flowStep <= 0) return;
        const prevIdx = flowStep - 1;
        setFlowStep(prevIdx);
        const prevPose = YOGA_POSES.find(p => p.id === selectedFlow.poses[prevIdx]);
        if (prevPose) {
            clearInterval(yogaTimerRef.current);
            setSelectedPose(prevPose);
            setYogaTimer(prevPose.duration);
            setYogaRunning(true);
        }
    };

    const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const circleScale = phase === 'inhale' ? 1.35 : phase === 'exhale' ? 0.75 : 1;
    const circleOpacity = phase === 'hold1' || phase === 'hold2' ? 0.8 : 1;

    return (
        <div className="mindfulness-page animate-fadeInUp">
            <div className="page-header">
                <h1 className="page-title">Mindfulness & Wellness</h1>
                <p className="page-subtitle">Breathing exercises, yoga poses & guided flows for mind-body harmony</p>
            </div>

            {/* Main Tabs: Breathing / Yoga */}
            <div className="mindfulness-main-tabs">
                <button className={`main-tab ${mainTab === 'breathing' ? 'active' : ''}`} onClick={() => setMainTab('breathing')}>
                    🌬️ Breathing
                </button>
                <button className={`main-tab ${mainTab === 'yoga' ? 'active' : ''}`} onClick={() => setMainTab('yoga')}>
                    🧘 Yoga
                </button>
            </div>

            {/* ==================== BREATHING TAB ==================== */}
            {mainTab === 'breathing' && (
                <div className="mindfulness-layout">
                    {/* Technique Selector */}
                    <div className="technique-selector">
                        <h3 className="section-title">Choose Technique</h3>
                        <div className="technique-grid">
                            {TECHNIQUES.map(t => (
                                <button
                                    key={t.id}
                                    className={`technique-card glass-card ${selected.id === t.id ? 'active' : ''}`}
                                    style={selected.id === t.id ? { borderColor: t.color, boxShadow: `0 0 20px ${t.color}30` } : {}}
                                    onClick={() => { if (!isRunning) setSelected(t); }}
                                    disabled={isRunning}
                                >
                                    <div className="technique-emoji">{t.emoji}</div>
                                    <div className="technique-name">{t.name}</div>
                                    <div className="technique-desc">{t.desc}</div>
                                    <div className="technique-pattern">
                                        {['Inhale', 'Hold', 'Exhale', 'Hold']
                                            .map((label, i) => {
                                                const val = [t.inhale, t.hold1, t.exhale, t.hold2][i];
                                                return val > 0 ? <span key={i}>{val}s {label}</span> : null;
                                            })
                                            .filter(Boolean)
                                            .reduce((acc, el, i) => [...acc, i > 0 ? ' · ' : '', el], [])}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Mood before */}
                        {!isRunning && !showPostSession && (
                            <div className="mood-before glass-card">
                                <label className="form-label">Mood before session: <strong>{moodBefore}/10</strong></label>
                                <input
                                    type="range" min="1" max="10"
                                    value={moodBefore}
                                    onChange={e => setMoodBefore(parseInt(e.target.value))}
                                    className="mood-slider"
                                    style={{ '--track-color': '#8b5cf6' }}
                                />
                            </div>
                        )}

                        {/* Session history */}
                        {sessions.length > 0 && (
                            <div className="session-history">
                                <h4 className="section-title" style={{ fontSize: 13 }}>Recent Sessions</h4>
                                {sessions.map(s => (
                                    <div key={s._id} className="session-history-item glass-card">
                                        <RiLeafLine color="#10b981" />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{s.technique.replace(/-/g, ' ')}</div>
                                            <div style={{ fontSize: 11, color: '#6b7280' }}>{Math.floor(s.duration / 60)}m · {new Date(s.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        {s.moodBefore && s.moodAfter && (
                                            <div style={{ marginLeft: 'auto', fontSize: 12, color: s.moodAfter > s.moodBefore ? '#10b981' : '#ef4444' }}>
                                                {s.moodBefore}→{s.moodAfter}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Breathing Animation */}
                    <div className="breathing-area">
                        <div className="breathing-widget glass-card">
                            <div className="breathing-circle-container">
                                <div
                                    className="breathing-circle-outer"
                                    style={{
                                        transform: `scale(${circleScale})`,
                                        opacity: circleOpacity,
                                        border: `3px solid ${selected.color}`,
                                        boxShadow: `0 0 60px ${selected.color}40, 0 0 30px ${selected.color}20`,
                                        transition: `transform ${isRunning ? (phase === 'inhale' ? selected.inhale : phase === 'exhale' ? selected.exhale : 0.1) : 0.4}s ease-in-out`
                                    }}
                                >
                                    <div className="breathing-circle-inner"
                                        style={{ background: `radial-gradient(circle, ${selected.color}20, transparent)` }}>
                                        <div className="breathing-phase-label">{isRunning ? PHASE_LABELS[phase] : selected.emoji}</div>
                                        <div className="breathing-countdown">
                                            {isRunning ? countdown : ''}
                                        </div>
                                    </div>
                                </div>
                                {isRunning && (
                                    <>
                                        <div className="pulse-ring" style={{ borderColor: selected.color, animationDelay: '0s' }} />
                                        <div className="pulse-ring" style={{ borderColor: selected.color, animationDelay: '1s' }} />
                                    </>
                                )}
                            </div>

                            {isRunning && (
                                <div className="breathing-stats">
                                    <div className="breathing-stat">
                                        <div className="breathing-stat-val">{cycles}</div>
                                        <div className="breathing-stat-label">Cycles</div>
                                    </div>
                                    <div className="breathing-stat">
                                        <div className="breathing-stat-val">{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</div>
                                        <div className="breathing-stat-label">Duration</div>
                                    </div>
                                </div>
                            )}

                            <div className="breathing-controls">
                                {!isRunning ? (
                                    <button className="btn btn-primary btn-lg breathing-start-btn" onClick={startBreathing}
                                        style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.color}aa)` }}>
                                        <RiPlayLine size={20} /> Start Session
                                    </button>
                                ) : (
                                    <button className="btn btn-secondary btn-lg breathing-start-btn" onClick={stopBreathing}>
                                        <RiStopLine size={20} /> End Session
                                    </button>
                                )}
                            </div>
                        </div>

                        {showPostSession && (
                            <div className="post-session glass-card animate-fadeInUp">
                                <h3>🎉 Great session! How do you feel now?</h3>
                                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
                                    You completed {cycles} cycles in {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
                                </p>
                                <label className="form-label">Mood after: <strong>{moodAfter || moodBefore}/10</strong></label>
                                <input type="range" min="1" max="10"
                                    value={moodAfter || moodBefore}
                                    onChange={e => setMoodAfter(parseInt(e.target.value))}
                                    className="mood-slider"
                                    style={{ '--track-color': '#10b981', width: '100%' }}
                                />
                                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSession}>Save Session</button>
                                    <button className="btn btn-secondary" onClick={() => setShowPostSession(false)}>Skip</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== YOGA TAB ==================== */}
            {mainTab === 'yoga' && (
                <div className="yoga-section">
                    {/* Yoga sub-tabs */}
                    <div className="yoga-sub-tabs">
                        <button className={`yoga-sub-tab ${yogaTab === 'poses' ? 'active' : ''}`} onClick={() => { setYogaTab('poses'); setSelectedPose(null); setSelectedFlow(null); stopPoseTimer(); }}>
                            Individual Poses
                        </button>
                        <button className={`yoga-sub-tab ${yogaTab === 'flows' ? 'active' : ''}`} onClick={() => { setYogaTab('flows'); setSelectedPose(null); setSelectedFlow(null); stopPoseTimer(); }}>
                            Guided Flows
                        </button>
                    </div>

                    {/* ===== INDIVIDUAL POSES ===== */}
                    {yogaTab === 'poses' && !selectedPose && (
                        <div className="yoga-poses-grid">
                            {YOGA_POSES.map(pose => (
                                <button key={pose.id} className="yoga-pose-card glass-card" onClick={() => setSelectedPose(pose)}>
                                    <div className="yoga-pose-emoji">{pose.emoji}</div>
                                    <div className="yoga-pose-name">{pose.name}</div>
                                    <div className="yoga-pose-sanskrit">{pose.sanskrit}</div>
                                    <div className="yoga-pose-meta">
                                        <span className="yoga-badge" style={{ background: `${pose.color}20`, color: pose.color }}>{pose.difficulty}</span>
                                        <span className="yoga-duration"><RiTimeLine size={12} /> {pose.duration}s</span>
                                    </div>
                                    <div className="yoga-pose-focus">{pose.focus}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ===== POSE DETAIL ===== */}
                    {yogaTab === 'poses' && selectedPose && !selectedFlow && (
                        <div className="yoga-pose-detail">
                            <button className="yoga-back-btn" onClick={() => { setSelectedPose(null); stopPoseTimer(); }}>
                                <RiArrowLeftSLine size={18} /> Back to poses
                            </button>

                            <div className="yoga-detail-layout">
                                {/* Left: Instructions */}
                                <div className="yoga-detail-info glass-card">
                                    <div className="yoga-detail-header">
                                        <span className="yoga-detail-emoji">{selectedPose.emoji}</span>
                                        <div>
                                            <h2 className="yoga-detail-name">{selectedPose.name}</h2>
                                            <p className="yoga-detail-sanskrit">{selectedPose.sanskrit}</p>
                                        </div>
                                    </div>

                                    <div className="yoga-detail-focus-tag" style={{ background: `${selectedPose.color}15`, color: selectedPose.color }}>
                                        {selectedPose.focus}
                                    </div>

                                    <div className="yoga-detail-section">
                                        <h4>Benefits</h4>
                                        <ul className="yoga-benefits-list">
                                            {selectedPose.benefits.map((b, i) => (
                                                <li key={i}>{b}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="yoga-detail-section">
                                        <h4>Step-by-Step Instructions</h4>
                                        <ol className="yoga-steps-list">
                                            {selectedPose.steps.map((step, i) => (
                                                <li key={i}>{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>

                                {/* Right: Timer */}
                                <div className="yoga-timer-card glass-card">
                                    <div className="yoga-timer-circle" style={{ borderColor: selectedPose.color, boxShadow: yogaRunning ? `0 0 40px ${selectedPose.color}30` : 'none' }}>
                                        <div className="yoga-timer-value">{formatTimer(yogaTimer)}</div>
                                        <div className="yoga-timer-label">{yogaRunning ? 'Hold the pose' : 'Ready?'}</div>
                                    </div>

                                    {!yogaRunning ? (
                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ width: '100%', background: `linear-gradient(135deg, ${selectedPose.color}, ${selectedPose.color}aa)` }}
                                            onClick={() => startPoseTimer(selectedPose)}
                                        >
                                            <RiPlayLine size={18} /> Start Pose ({selectedPose.duration}s)
                                        </button>
                                    ) : (
                                        <button className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={stopPoseTimer}>
                                            <RiStopLine size={18} /> Stop
                                        </button>
                                    )}

                                    <div className="yoga-timer-tip">
                                        <RiLeafLine size={14} color="#10b981" />
                                        <span>Focus on your breath throughout the pose</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GUIDED FLOWS ===== */}
                    {yogaTab === 'flows' && !selectedFlow && (
                        <div className="yoga-flows-grid">
                            {YOGA_FLOWS.map(flow => (
                                <button key={flow.id} className="yoga-flow-card glass-card" onClick={() => startFlow(flow)}>
                                    <div className="yoga-flow-header">
                                        <span className="yoga-flow-emoji">{flow.emoji}</span>
                                        <span className="yoga-flow-duration">{flow.duration}</span>
                                    </div>
                                    <div className="yoga-flow-name">{flow.name}</div>
                                    <div className="yoga-flow-desc">{flow.desc}</div>
                                    <div className="yoga-flow-poses-preview">
                                        {flow.poses.map((poseId, i) => {
                                            const p = YOGA_POSES.find(x => x.id === poseId);
                                            return p ? <span key={i} className="yoga-flow-pose-pip" title={p.name}>{p.emoji}</span> : null;
                                        })}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ===== FLOW IN PROGRESS ===== */}
                    {selectedFlow && selectedPose && (
                        <div className="yoga-flow-active">
                            <div className="yoga-flow-progress-bar">
                                {selectedFlow.poses.map((poseId, i) => {
                                    const p = YOGA_POSES.find(x => x.id === poseId);
                                    return (
                                        <div key={i} className={`flow-step-dot ${i === flowStep ? 'active' : i < flowStep ? 'done' : ''}`}
                                            style={i === flowStep ? { borderColor: p?.color } : {}}>
                                            <span>{p?.emoji}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="yoga-flow-step-label">
                                Pose {flowStep + 1} of {selectedFlow.poses.length}: <strong>{selectedPose.name}</strong>
                            </div>

                            <div className="yoga-detail-layout">
                                <div className="yoga-detail-info glass-card">
                                    <div className="yoga-detail-header">
                                        <span className="yoga-detail-emoji">{selectedPose.emoji}</span>
                                        <div>
                                            <h2 className="yoga-detail-name">{selectedPose.name}</h2>
                                            <p className="yoga-detail-sanskrit">{selectedPose.sanskrit}</p>
                                        </div>
                                    </div>
                                    <div className="yoga-detail-section">
                                        <h4>Instructions</h4>
                                        <ol className="yoga-steps-list">
                                            {selectedPose.steps.map((step, i) => (
                                                <li key={i}>{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>

                                <div className="yoga-timer-card glass-card">
                                    <div className="yoga-timer-circle" style={{ borderColor: selectedPose.color, boxShadow: yogaRunning ? `0 0 40px ${selectedPose.color}30` : 'none' }}>
                                        <div className="yoga-timer-value">{formatTimer(yogaTimer)}</div>
                                        <div className="yoga-timer-label">{yogaRunning ? 'Hold' : yogaTimer === 0 ? 'Done!' : 'Paused'}</div>
                                    </div>

                                    <div className="yoga-flow-nav">
                                        <button className="btn btn-secondary" onClick={prevFlowStep} disabled={flowStep <= 0}>
                                            <RiArrowLeftSLine size={16} /> Previous
                                        </button>
                                        {yogaTimer === 0 || !yogaRunning ? (
                                            <button
                                                className="btn btn-primary"
                                                style={{ background: `linear-gradient(135deg, ${selectedPose.color}, ${selectedPose.color}aa)` }}
                                                onClick={nextFlowStep}
                                            >
                                                {flowStep + 1 >= selectedFlow.poses.length ? 'Finish 🙏' : 'Next Pose'} <RiArrowRightSLine size={16} />
                                            </button>
                                        ) : (
                                            <button className="btn btn-secondary" onClick={stopPoseTimer}>
                                                <RiStopLine size={16} /> Pause
                                            </button>
                                        )}
                                    </div>

                                    <button className="yoga-exit-flow-btn" onClick={() => { setSelectedFlow(null); setSelectedPose(null); stopPoseTimer(); }}>
                                        Exit Flow
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Mindfulness;
