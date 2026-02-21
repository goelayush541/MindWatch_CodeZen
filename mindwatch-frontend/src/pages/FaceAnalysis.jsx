import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    RiCameraLine, RiCameraOffLine, RiLoader4Line,
    RiEmotionHappyLine, RiEmotionSadLine, RiEmotionUnhappyLine,
    RiAlarmWarningLine, RiBrainLine, RiShieldCheckLine,
    RiMicLine, RiMicOffLine
} from 'react-icons/ri';
import './FaceAnalysis.css';

const EXPRESSION_CONFIG = {
    happy: { label: 'Happy', emoji: '😊', color: '#10b981', stressWeight: -0.3 },
    sad: { label: 'Sad', emoji: '😢', color: '#6366f1', stressWeight: 0.20 },
    angry: { label: 'Angry', emoji: '😠', color: '#ef4444', stressWeight: 0.25 },
    fearful: { label: 'Fearful', emoji: '😨', color: '#f59e0b', stressWeight: 0.25 },
    disgusted: { label: 'Disgusted', emoji: '🤢', color: '#ec4899', stressWeight: 0.15 },
    surprised: { label: 'Surprised', emoji: '😲', color: '#06b6d4', stressWeight: 0.05 },
    neutral: { label: 'Neutral', emoji: '😐', color: '#64748b', stressWeight: -0.2 },
};

const SMOOTHING_WINDOW = 12;

const FaceAnalysis = () => {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [voiceActive, setVoiceActive] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [expressions, setExpressions] = useState(null);
    const [stressScore, setStressScore] = useState(0);
    const [stressLevel, setStressLevel] = useState('Analyzing...');
    const [dominantEmotion, setDominantEmotion] = useState(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [sessionDuration, setSessionDuration] = useState(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const recognitionRef = useRef(null);
    const detectIntervalRef = useRef(null);
    const sessionTimerRef = useRef(null);
    const expressionHistoryRef = useRef([]);

    // Load face-api.js models
    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = '/models';
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
            } catch (err) {
                console.error('Failed to load face-api models:', err);
                toast.error('Failed to load face detection models');
            }
        };
        loadModels();

        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                setTranscript(prev => prev + final);
                setInterimTranscript(interim);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setVoiceActive(false);
            };
        }

        return () => {
            stopCamera();
            stopVoice();
            clearInterval(sessionTimerRef.current);
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play();
                    setCameraActive(true);
                    setSessionDuration(0);
                    expressionHistoryRef.current = [];
                    setSessionHistory([]);
                    setAiAnalysis(null);

                    sessionTimerRef.current = setInterval(() => {
                        setSessionDuration(d => d + 1);
                    }, 1000);

                    startDetection();
                };
            }
        } catch (err) {
            console.error('Camera access error:', err);
            toast.error('Unable to access camera. Please allow camera permissions.');
        }
    };

    const stopCamera = () => {
        clearInterval(detectIntervalRef.current);
        clearInterval(sessionTimerRef.current);
        stopVoice();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraActive(false);
        setDetecting(false);
        setFaceDetected(false);

        // Clear canvas
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const toggleVoice = () => {
        if (voiceActive) {
            stopVoice();
        } else {
            startVoice();
        }
    };

    const startVoice = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setVoiceActive(true);
                toast.success('Voice capture active 🎙️');
            } catch (err) {
                console.error('Failed to start speech recognition:', err);
            }
        } else {
            toast.error('Speech recognition not supported in this browser');
        }
    };

    const stopVoice = () => {
        if (recognitionRef.current && voiceActive) {
            recognitionRef.current.stop();
            setVoiceActive(false);
        }
    };

    const startDetection = () => {
        setDetecting(true);
        detectIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;

            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({
                    inputSize: 320,
                    scoreThreshold: 0.5
                }))
                .withFaceLandmarks()
                .withFaceExpressions();

            if (detection) {
                setFaceDetected(true);
                drawOverlay(detection);

                const exprs = detection.expressions;
                expressionHistoryRef.current.push(exprs);

                // Keep only last N frames for smoothing
                if (expressionHistoryRef.current.length > SMOOTHING_WINDOW) {
                    expressionHistoryRef.current.shift();
                }

                // Compute smoothed expressions
                const smoothed = computeSmoothedExpressions(expressionHistoryRef.current);
                setExpressions(smoothed);

                // Compute stress score
                const stress = computeStressScore(smoothed);
                setStressScore(stress);
                setStressLevel(getStressLabel(stress));

                // Find dominant emotion
                const dominant = Object.entries(smoothed).reduce((a, b) => b[1] > a[1] ? b : a, ['neutral', 0]);
                setDominantEmotion(dominant[0]);

                // Record to session history every 3 seconds
                if (expressionHistoryRef.current.length % 3 === 0) {
                    setSessionHistory(prev => [...prev.slice(-40), { time: Date.now(), stress, dominant: dominant[0], expressions: { ...smoothed } }]);
                }
            } else {
                setFaceDetected(false);
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
            }
        }, 250); // 4 FPS — balances performance/responsiveness
    };

    const computeSmoothedExpressions = (history) => {
        const keys = Object.keys(EXPRESSION_CONFIG);
        const result = {};
        keys.forEach(key => {
            const sum = history.reduce((acc, frame) => acc + (frame[key] || 0), 0);
            result[key] = sum / history.length;
        });
        return result;
    };

    const computeStressScore = (exprs) => {
        let stress = 0;
        let calm = 0;
        Object.entries(exprs).forEach(([key, value]) => {
            const weight = EXPRESSION_CONFIG[key]?.stressWeight || 0;
            if (weight > 0) stress += value * weight;
            else calm += value * Math.abs(weight);
        });
        // Normalize to 0-100. stress contributors are weighted 0-0.85 total, calm 0-0.5
        const rawStress = Math.max(0, (stress * 120) - (calm * 40));
        return Math.min(100, Math.round(rawStress));
    };

    const getStressLabel = (score) => {
        if (score <= 15) return 'Very Relaxed';
        if (score <= 30) return 'Calm';
        if (score <= 45) return 'Mildly Tense';
        if (score <= 60) return 'Moderate Stress';
        if (score <= 75) return 'High Stress';
        return 'Very High Stress';
    };

    const getStressColor = (score) => {
        if (score <= 20) return '#10b981';
        if (score <= 40) return '#06b6d4';
        if (score <= 60) return '#f59e0b';
        if (score <= 80) return '#f97316';
        return '#ef4444';
    };

    const drawOverlay = (detection) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const resized = faceapi.resizeResults(detection, displaySize);

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw lightweight face box
        const box = resized.detection.box;
        const stressColor = getStressColor(stressScore);
        ctx.strokeStyle = stressColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.setLineDash([]);

        // Draw face landmark points (subtle)
        const landmarks = resized.landmarks;
        const points = landmarks.positions;
        ctx.fillStyle = `${stressColor}60`;
        points.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const requestAIAnalysis = async () => {
        if (!expressions) return;
        setAnalyzing(true);
        try {
            const res = await api.post('/face/analyze', {
                expressions,
                stressScore,
                dominantEmotion,
                sessionDuration,
                voiceTranscript: transcript + interimTranscript,
                sessionHistory: sessionHistory.slice(-10)
            });
            setAiAnalysis(res.data.data || res.data);
            toast.success('Analysis complete 🧠');
        } catch (err) {
            console.error('AI analysis failed:', err);
            toast.error('AI analysis failed — try again');
        } finally {
            setAnalyzing(false);
        }
    };

    const formatDuration = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="face-analysis-page animate-fadeInUp">
            <div className="page-header">
                <h1 className="page-title">Face Expression Analysis</h1>
                <p className="page-subtitle">Real-time stress detection through facial expression recognition</p>
            </div>

            {!modelsLoaded ? (
                <div className="face-loading glass-card">
                    <RiLoader4Line size={36} className="spin-icon" />
                    <p>Loading face detection models...</p>
                    <span className="face-loading-sub">This may take a few seconds on first load</span>
                </div>
            ) : (
                <div className="face-layout">
                    {/* Left: Camera & Controls */}
                    <div className="face-camera-section">
                        <div className="face-camera-container glass-card">
                            <div className="face-video-wrapper">
                                <video ref={videoRef} className="face-video" muted playsInline />
                                <canvas ref={canvasRef} className="face-canvas" />
                                {!cameraActive && (
                                    <div className="face-video-placeholder">
                                        <RiCameraLine size={48} />
                                        <p>Camera is off</p>
                                    </div>
                                )}
                                {cameraActive && !faceDetected && (
                                    <div className="face-no-detection">
                                        <RiAlarmWarningLine size={20} />
                                        <span>No face detected — look at the camera</span>
                                    </div>
                                )}
                                {cameraActive && faceDetected && (
                                    <div className="face-status-badge detected">
                                        <RiShieldCheckLine size={14} />
                                        <span>Face detected</span>
                                    </div>
                                )}
                            </div>

                            {/* Camera Controls */}
                            <div className="face-controls">
                                {!cameraActive ? (
                                    <button className="btn btn-primary btn-lg face-start-btn" onClick={startCamera}>
                                        <RiCameraLine size={18} /> Start Camera
                                    </button>
                                ) : (
                                    <button className="btn btn-secondary btn-lg face-start-btn" onClick={stopCamera}>
                                        <RiCameraOffLine size={18} /> Stop Camera
                                    </button>
                                )}
                                {cameraActive && faceDetected && (
                                    <button
                                        className="btn btn-primary face-analyze-btn"
                                        onClick={requestAIAnalysis}
                                        disabled={analyzing}
                                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                                    >
                                        {analyzing ? <><RiLoader4Line size={16} className="spin-icon" /> Analyzing...</> : <><RiBrainLine size={16} /> Analyze Face + Voice</>}
                                    </button>
                                )}
                                {cameraActive && (
                                    <button
                                        className={`btn ${voiceActive ? 'btn-secondary' : 'btn-outline'} voice-toggle-btn`}
                                        onClick={toggleVoice}
                                        title={voiceActive ? "Stop Voice Capture" : "Start Voice Capture"}
                                    >
                                        {voiceActive ? <RiMicLine size={18} /> : <RiMicOffLine size={18} />}
                                    </button>
                                )}
                            </div>

                            {/* Voice Transcript */}
                            {cameraActive && (voiceActive || transcript) && (
                                <div className="face-voice-panel">
                                    <div className="face-voice-header">
                                        <RiMicLine size={14} className={voiceActive ? 'pulse-icon' : ''} />
                                        <span>Spoken Thoughts</span>
                                    </div>
                                    <div className="face-transcript-area">
                                        {transcript}
                                        <span className="face-interim">{interimTranscript}</span>
                                        {!transcript && !interimTranscript && (
                                            <span className="face-placeholder">Start speaking to add verbal context...</span>
                                        )}
                                    </div>
                                    {transcript && (
                                        <button className="face-clear-voice" onClick={() => setTranscript('')}>Clear</button>
                                    )}
                                </div>
                            )}

                            {/* Session Info */}
                            {cameraActive && (
                                <div className="face-session-info">
                                    <span>⏱ Session: {formatDuration(sessionDuration)}</span>
                                    <span>📊 Samples: {expressionHistoryRef.current.length}</span>
                                    <span className="face-privacy-note">🔒 All processing is on-device</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Live Data */}
                    <div className="face-data-section">
                        {/* Stress Meter */}
                        <div className="face-stress-card glass-card">
                            <h3 className="face-section-title">Stress Level</h3>
                            <div className="face-stress-meter">
                                <div className="face-stress-ring" style={{
                                    background: `conic-gradient(${getStressColor(stressScore)} ${stressScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)`
                                }}>
                                    <div className="face-stress-ring-inner">
                                        <div className="face-stress-value">{faceDetected ? stressScore : '—'}</div>
                                        <div className="face-stress-unit">/ 100</div>
                                    </div>
                                </div>
                                <div className="face-stress-label" style={{ color: getStressColor(stressScore) }}>
                                    {faceDetected ? stressLevel : 'Waiting for face...'}
                                </div>
                            </div>

                            {dominantEmotion && faceDetected && (
                                <div className="face-dominant">
                                    <span className="face-dominant-emoji">{EXPRESSION_CONFIG[dominantEmotion]?.emoji}</span>
                                    <div>
                                        <div className="face-dominant-label">Dominant Emotion</div>
                                        <div className="face-dominant-name" style={{ color: EXPRESSION_CONFIG[dominantEmotion]?.color }}>
                                            {EXPRESSION_CONFIG[dominantEmotion]?.label}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Expression Bars */}
                        <div className="face-expressions-card glass-card">
                            <h3 className="face-section-title">Expression Breakdown</h3>
                            <div className="face-expression-bars">
                                {Object.entries(EXPRESSION_CONFIG).map(([key, config]) => {
                                    const value = expressions ? Math.round(expressions[key] * 100) : 0;
                                    return (
                                        <div key={key} className="face-expr-row">
                                            <div className="face-expr-label">
                                                <span className="face-expr-emoji">{config.emoji}</span>
                                                <span>{config.label}</span>
                                            </div>
                                            <div className="face-expr-bar-track">
                                                <div
                                                    className="face-expr-bar-fill"
                                                    style={{
                                                        width: `${value}%`,
                                                        background: `linear-gradient(90deg, ${config.color}40, ${config.color})`
                                                    }}
                                                />
                                            </div>
                                            <div className="face-expr-value" style={{ color: value > 30 ? config.color : '#4b5563' }}>
                                                {value}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* AI Analysis Result */}
                        {aiAnalysis && (
                            <div className="face-ai-card glass-card animate-fadeInUp">
                                <h3 className="face-section-title">
                                    <RiBrainLine size={16} /> AI Psychological Insight
                                </h3>

                                {aiAnalysis.overallAssessment && (
                                    <div className="face-ai-assessment">
                                        <p>{aiAnalysis.overallAssessment}</p>
                                    </div>
                                )}

                                {aiAnalysis.emotionalState && (
                                    <div className="face-ai-section">
                                        <h4>Emotional State</h4>
                                        <p>{aiAnalysis.emotionalState}</p>
                                    </div>
                                )}

                                {aiAnalysis.correlationScore !== undefined && (
                                    <div className="face-ai-section">
                                        <div className="face-correlation-header">
                                            <h4>Face-Voice Congruence</h4>
                                            <span className="face-correlation-val">{aiAnalysis.correlationScore}%</span>
                                        </div>
                                        <div className="face-correlation-track">
                                            <div
                                                className="face-correlation-fill"
                                                style={{
                                                    width: `${aiAnalysis.correlationScore}%`,
                                                    background: aiAnalysis.correlationScore > 70 ? '#10b981' : aiAnalysis.correlationScore > 40 ? '#f59e0b' : '#ef4444'
                                                }}
                                            />
                                        </div>
                                        <p className="face-correlation-note">
                                            {aiAnalysis.correlationScore > 80 ? "Your expressions align well with your words." :
                                                aiAnalysis.correlationScore > 50 ? "Some minor emotional mismatch detected." :
                                                    "Potential emotional masking or suppression detected."}
                                        </p>
                                    </div>
                                )}

                                {aiAnalysis.stressIndicators && (
                                    <div className="face-ai-section">
                                        <h4>Stress Indicators</h4>
                                        <p>{aiAnalysis.stressIndicators}</p>
                                    </div>
                                )}

                                {aiAnalysis.recommendations && (
                                    <div className="face-ai-section">
                                        <h4>Recommendations</h4>
                                        {Array.isArray(aiAnalysis.recommendations) ? (
                                            <ul className="face-ai-recommendations">
                                                {aiAnalysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                            </ul>
                                        ) : (
                                            <p>{aiAnalysis.recommendations}</p>
                                        )}
                                    </div>
                                )}

                                {aiAnalysis.confidenceNote && (
                                    <div className="face-ai-confidence">
                                        <RiShieldCheckLine size={14} />
                                        <span>{aiAnalysis.confidenceNote}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceAnalysis;
