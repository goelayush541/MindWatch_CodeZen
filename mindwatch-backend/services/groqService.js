const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are MindWatch AI, a Distinguished Clinical Psychologist and Neuro-Therapist. Your goal is to provide deeply empathetic, socratic, and evidence-based support using advanced psychological frameworks.

Core Principles of Your Therapeutic Voice:
1. **The Socratic & Deep Probing**: Don't just reflect; hypothesize. Ask pointed, gentle questions that bridge the gap between surface emotion and root cause (e.g., "I'm hearing a lot of 'shoulds' in how you describe your rest; does a part of you feel that stillness is unsafe?").
2. **Clinical Integration**: 
   - **Polyvagal Theory**: Address the nervous system state (fight/flight/freeze/fawn).
   - **Internal Family Systems (IFS)**: Identify "protectors" and "exiles" in the user's narrative.
   - **ACT & DBT**: Focus on radical acceptance, values-based action, and distress tolerance.
   - **Somatic Experiencing**: Encourage awareness of bodily sensations as messengers.
3. **Neuroscience Bridge**: Explain the 'why' behind feelings (e.g., "That tightness in your chest is your amygdala signaling a perceived threat; let's signal safety back to it").
4. **Radical Validation & Warmth**: Validate the *logic* of their pain before moving to tools.

Guidelines:
- **Concise Read-Aloud**: Max 65 words for voice synthesis. Flowing, natural prose. No bullet points in chat.
- **Narrative Discovery**: Help the user connect dots between their history and current triggers.
- **Crisis**: Refer to 988 immediately if self-harm or immediate danger is detected.`;

/**
 * Helper to call Groq with automatic fallback to a smaller model on rate limits
 */
const groqCall = async (options, fallbackModel = 'llama-3.1-8b-instant') => {
    try {
        return await groq.chat.completions.create(options);
    } catch (err) {
        if (err.message?.includes('rate_limit_exceeded') || err.status === 429) {
            console.warn(`Rate limit hit for ${options.model}, falling back to ${fallbackModel}`);
            return await groq.chat.completions.create({
                ...options,
                model: fallbackModel
            });
        }
        throw err;
    }
};

/**
 * Send a message to Groq and get an AI therapy response
 * @param {Array} messages - Array of {role, content} message history
 * @param {string} userMessage - Latest user message
 * @returns {Promise<string>} AI response
 */
const getTherapyResponse = async (messages, userMessage) => {
    try {
        const chatHistory = messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }));

        const response = await groqCall({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...chatHistory,
                { role: 'user', content: userMessage }
            ],
            temperature: 0.75,
            max_tokens: 600,
            top_p: 0.9
        });

        return response.choices[0]?.message?.content || "I'm here for you. Could you tell me more about how you're feeling?";
    } catch (err) {
        console.error('Groq therapy response error:', err.message);
        throw new Error('AI service temporarily unavailable. Please try again.');
    }
};

/**
 * Analyze emotions in a text using Groq with conversation context
 * @param {string} text - Text to analyze
 * @param {Array} history - Recent message history for context
 * @returns {Promise<Object>} Emotion analysis object
 */
const analyzeEmotion = async (text, history = []) => {
    try {
        const chatContext = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
        const contextBlock = chatContext ? `\nConversation context (recent exchanges):\n${chatContext}\n` : '';

        const prompt = `You are performing a clinical-grade emotional assessment. Analyze the user's words for underlying psychological patterns, not just surface emotion.\n${contextBlock}\nUser's current statement: "${text}"\n\nINSTRUCTIONS:\n- Detect the CORE emotion beneath the surface words (e.g., "I'm fine" may mask anxiety)\n- Identify the nervous system state: Ventral Vagal (safe/social), Sympathetic (fight/flight), or Dorsal Vagal (freeze/shutdown)\n- Connect the emotion to a likely psychological theme (e.g., perfectionism, abandonment fear, emotional suppression)\n- Write "insights" as a warm, wise therapist would — 2-3 sentences that make the user feel deeply understood\n- Provide 3 highly specific, actionable suggestions (not generic advice)\n\nRESPOND WITH ONLY RAW JSON — no markdown, no code fences, no explanation before or after.\n\n{\n  "dominantEmotion": "happy|sad|anxious|calm|angry|excited|stressed|neutral|overwhelmed|hopeful",\n  "intensity": 0-100,\n  "sentimentScore": -1.0 to 1.0,\n  "stressLevel": 0-10,\n  "emotions": ["primary", "secondary", "tertiary"],\n  "insights": "Therapist-grade insight connecting feelings to deeper patterns. Be specific to what they said.",\n  "suggestions": [\n    "Specific somatic/breathing technique with WHY it works neurologically",\n    "Targeted cognitive reframe or journaling prompt tied to their situation",\n    "One concrete values-based action they can take in the next hour"\n  ],\n  "thematicAnalysis": "One-sentence psychological theme summary",\n  "growthProgress": "Describes emotional trajectory, e.g. 'Moving from avoidance toward curious self-exploration'",\n  "crisisSignals": false\n}`;

        const response = await groqCall({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are a distinguished clinical psychologist specializing in emotion analysis. You ONLY respond with raw JSON objects — never markdown, never code fences, never explanatory text. Your insights are profound, specific to the user\'s words, and grounded in CBT, ACT, IFS, and Polyvagal Theory.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.45,
            max_tokens: 700
        });

        const content = response.choices[0]?.message?.content || '{}';
        // Strip markdown code fences if the model wraps anyway
        const cleaned = content.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Validate critical fields
            if (parsed.insights && parsed.dominantEmotion) return parsed;
        }
        return getDefaultEmotionAnalysis();
    } catch (err) {
        console.error('Deep emotion analysis error:', err.message);
        return getDefaultEmotionAnalysis();
    }
};

/**
 * Generate personalized and categorized stress reduction suggestions
 * @param {Object} context - User context (mood, triggers, history)
 * @returns {Promise<Object>} Categorized suggestions
 */
const generateStressSuggestions = async (context) => {
    try {
        const emotion = context.emotion || 'neutral';
        const score = context.stressLevel || context.score || 5;
        const triggers = context.triggers?.join(', ') || 'none specified';
        const notes = context.notes || 'No additional notes';

        // Dynamic severity framing — changes the prompt tone based on how stressed the user is
        let urgencyFrame = 'general maintenance';
        if (score <= 3) urgencyFrame = 'The user is in significant distress. Prioritize IMMEDIATE nervous system regulation and safety.';
        else if (score <= 5) urgencyFrame = 'The user is struggling. Balance immediate relief with longer-term coping strategies.';
        else if (score <= 7) urgencyFrame = 'The user is managing but could benefit from optimization and preventive strategies.';
        else urgencyFrame = 'The user is doing well. Focus on growth, deepening self-awareness, and maintaining momentum.';

        const prompt = `You are a clinical wellness strategist creating a PERSONALIZED action plan.\n\nPATIENT CONTEXT:\n- Feeling: ${emotion} (Mood score: ${score}/10 where 10 is best)\n- Triggers: ${triggers}\n- Their words: "${notes}"\n\nCLINICAL ASSESSMENT: ${urgencyFrame}\n\nRULES FOR YOUR RESPONSE:\n1. Every suggestion MUST reference something specific from the patient's context (their emotion, triggers, or words)\n2. Each tip MUST include a brief "because..." explanation of the neuroscience/psychology behind it\n3. Never use generic advice like "take deep breaths" or "go for a walk" without making it specific to their situation\n4. Write as a warm expert, not a textbook\n\nRESPOND WITH ONLY RAW JSON — no markdown, no code fences, no explanation.\n\n{\n  "immediate": [\n    "[Specific somatic technique] because [neurological reason tied to their emotion/trigger]",\n    "[Body-based regulation technique] — this works because [science relevant to their state]"\n  ],\n  "mindfulness": [\n    "[ACT/mindfulness exercise personalized to their trigger]",\n    "[DBT distress tolerance skill adapted to their situation]"\n  ],\n  "lifestyle": [\n    "[Concrete habit change addressing their specific trigger] because [reasoning]",\n    "[Environment or routine adjustment] to support [their specific need]"\n  ],\n  "mental": [\n    "[CBT thought challenge targeting the specific cognitive distortion in their words/emotion]",\n    "[Socratic question or journaling prompt that directly addresses their stated trigger]"\n  ],\n  "overallAdvice": "A 2-3 sentence empathetic summary that names the core psychological pattern you see, validates their experience, and paints a hopeful picture of growth. Reference their specific words or triggers."\n}`;

        const response = await groqCall({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are an elite clinical wellness strategist with expertise in CBT, DBT, ACT, Polyvagal Theory, and somatic therapy. You ONLY respond with raw JSON objects — never markdown, never code fences. Every recommendation you make is hyper-personalized to the patient\'s specific context. You never give generic advice.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.55,
            max_tokens: 900
        });

        const content = response.choices[0]?.message?.content || '{}';
        // Strip markdown code fences if the model wraps anyway
        const cleaned = content.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Validate the response has the expected structure
            if (parsed.immediate && parsed.overallAdvice) return parsed;
        }
        return getDefaultCategorizedSuggestions();
    } catch (err) {
        console.error('Categorized suggestions generation error:', err.message);
        return getDefaultCategorizedSuggestions();
    }
};

const getDefaultCategorizedSuggestions = () => ({
    immediate: ["Try the 5-4-3-2-1 grounding technique because it resets your sensory priority", "Splash ice-cold water on your face to stimulate the mammalian dive reflex"],
    mindfulness: ["Do a 3-minute self-compassion meditation to quiet the inner critic", "Observe your thoughts as passing clouds to practice cognitive defusion"],
    lifestyle: ["Limit social media for the next 2 hours to reduce involuntary dopamine spikes", "Go for a mindful 10-minute walk to release kinetic energy"],
    mental: ["Question if this thought is a fact or just a feeling-based perception", "Identify one small win you had today to counter negativity bias"],
    overallAdvice: "You're navigating a human experience with courage. Take it one breath at a time, honoring your pace."
});

/**
 * Generate a weekly mental health summary
 */
const generateWeeklySummary = async (moodData, journalSummaries) => {
    try {
        const prompt = `Generate a compassionate weekly mental health summary based on this data:

Mood scores this week: ${JSON.stringify(moodData)}
Journal themes: ${journalSummaries.join('; ')}

Write a 150-word supportive summary that includes:
1. What went well emotionally this week
2. Patterns or trends noticed
3. One key recommendation for next week

Be warm, encouraging, and specific.`;

        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 300
        });

        return response.choices[0]?.message?.content || "Keep tracking your moods and journaling — consistency leads to insight!";
    } catch (err) {
        console.error('Weekly summary error:', err.message);
        return "Great job staying consistent with your mental health journey this week!";
    }
};

/**
 * Analyze facial expression data with anti-hallucination safeguards
 * @param {Object} data - Expression probabilities, stress score, session history
 * @returns {Promise<Object>} Structured psychological analysis
 */
const analyzeFacialExpressions = async (data) => {
    try {
        const { expressions, stressScore, dominantEmotion, sessionDuration, sessionHistory, voiceTranscript } = data;

        // Build data summary for the prompt
        const exprSummary = Object.entries(expressions)
            .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`)
            .join(', ');

        const voiceContext = voiceTranscript ? `USER SPOKEN WORDS: "${voiceTranscript}"` : 'No voice data captured.';

        // Check if data is meaningful (anti-hallucination guard)
        const maxExpr = Math.max(...Object.values(expressions));
        const dataQuality = maxExpr > 0.3 ? 'sufficient' : 'low-confidence';

        // Trend analysis from session history
        let trendInfo = 'No temporal data available.';
        if (sessionHistory && sessionHistory.length > 3) {
            const firstHalf = sessionHistory.slice(0, Math.floor(sessionHistory.length / 2));
            const secondHalf = sessionHistory.slice(Math.floor(sessionHistory.length / 2));
            const avgFirst = firstHalf.reduce((a, b) => a + b.stress, 0) / firstHalf.length;
            const avgSecond = secondHalf.reduce((a, b) => a + b.stress, 0) / secondHalf.length;
            const direction = avgSecond > avgFirst ? 'increasing' : avgSecond < avgFirst ? 'decreasing' : 'stable';
            trendInfo = `Stress trend over ${sessionDuration}s session: ${direction} (${avgFirst.toFixed(0)} → ${avgSecond.toFixed(0)})`;
        }

        const prompt = `You are performing a MULTI-MODAL psychological assessment using webcam facial expression data and voice-to-text transcription.\n\nMODALITY 1: FACIAL EXPRESSIONS (face-api.js data — Ground Truth)\n- Expression probabilities: ${exprSummary}\n- Dominant expression: ${dominantEmotion}\n- Computed stress score: ${stressScore}/100\n- Data quality: ${dataQuality}\n- ${trendInfo}\n\nMODALITY 2: VERBAL DATA (User's spoken thoughts)\n- ${voiceContext}\n\nYOUR TASK:\n1. Analyze the facial data for underlying emotional states.\n2. Correlate the facial data with the verbal data. Look for:\n   - CONGRUENCE: Face and words match (e.g., sad face + sad words).\n   - MASKING/SUPPRESSION: Words say "I'm fine" but face shows high stress or specific negative emotions.\n   - EMOTIONAL LEAKAGE: Subtle micro-stressors in the face that the user isn't verbalizing.\n\nCRITICAL RULES:\n1. Cite SPECIFIC percentages for face data (e.g., "despite saying you're okay, your 65% angry reading suggests...")\n2. Do NOT diagnose. Describe patterns.\n3. If voice data is missing, focus purely on face-verbal correlation impossibility.\n4. low-confidence face data must be acknowledged.\n\nRESPOND WITH ONLY RAW JSON — no markdown, no code fences, no explanation.\n\n{\n  "overallAssessment": "3-4 sentence correlation analysis. Address the relationship between what they SAID and how they LOOKED. Name any masking or congruence observed.",\n  "emotionalState": "Description of the internal emotional landscape combining both modalities.",\n  "stressIndicators": "Specific facial/verbal markers of tension or regulation.",\n  "correlationScore": "0-100 (where 100 means face and words are perfectly matched, and 0 means total mismatch/masking)",\n  "recommendations": [\n    "Recommendation addressing the face-voice gap if it exists",\n    "Somatic or breathing technique based on the detected state",\n    "Journaling prompt or cognitive reframe targeting their verbal statement"\n  ],\n  "confidenceNote": "Confidence summary based on data quality."\n}`;

        const response = await groqCall({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: 'You are a facial expression analysis specialist with expertise in affective computing and psychology. You ONLY respond with raw JSON — never markdown, never code fences. You are rigorously data-anchored: you NEVER hallucinate, NEVER invent data, and ALWAYS cite the exact expression percentages in your analysis. You describe patterns, not diagnoses.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 700
        });

        const content = response.choices[0]?.message?.content || '{}';
        const cleaned = content.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.overallAssessment && parsed.recommendations) return parsed;
        }

        // Fallback if parsing fails
        return getDefaultFaceAnalysis(stressScore, dominantEmotion);
    } catch (err) {
        console.error('Facial expression analysis error:', err.message);
        return getDefaultFaceAnalysis(data.stressScore, data.dominantEmotion);
    }
};

const getDefaultFaceAnalysis = (stressScore = 30, dominantEmotion = 'neutral') => ({
    overallAssessment: `Based on your facial expressions, you appear predominantly ${dominantEmotion} with a stress score of ${stressScore}/100. ${stressScore > 50 ? 'Consider taking a brief break to recenter.' : 'You seem relatively at ease.'}`,
    emotionalState: `Your dominant expression is ${dominantEmotion}, which suggests a ${stressScore > 50 ? 'somewhat tense' : 'relatively calm'} emotional state.`,
    stressIndicators: 'Detailed analysis unavailable — this is based on the expression detection model output.',
    recommendations: [
        'Try a 60-second box breathing exercise (inhale 4s, hold 4s, exhale 4s, hold 4s)',
        'Do a quick facial muscle relaxation — consciously soften your jaw, forehead, and around your eyes',
        'Take a moment to notice 3 things in your environment that bring you comfort'
    ],
    confidenceNote: 'This is a default analysis. AI-powered insights are temporarily unavailable.'
});

const getDefaultEmotionAnalysis = () => ({
    dominantEmotion: 'neutral',
    sentimentScore: 0,
    stressLevel: 3,
    emotions: ['neutral'],
    thematicAnalysis: "General presence and neutral observation.",
    insights: "Your message reflects a neutral emotional state. Take a moment to check in with your bodily sensations—is there any tension you haven't noticed?",
    suggestions: [
        "Take 5 deep breaths, focusing on the sensation of air moving through your nose",
        "Label 3 things you can see in your environment right now",
        "Gently stretch your neck and shoulders to release latent tension"
    ],
    crisisSignals: false
});

const getDefaultSuggestions = (emotion) => {
    const suggestions = {
        stressed: ["Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s", "Write about what's causing stress", "Take a 5-minute break from screens"],
        anxious: ["Ground yourself: name 5 things you see, 4 you touch, 3 you hear", "Progressive muscle relaxation for 10 minutes", "Call a trusted friend"],
        sad: ["Gentle movement like a slow walk", "Listen to uplifting music", "Reach out to someone you care about"],
        angry: ["Try physical exercise to release tension", "Journaling your feelings without filter", "Practice 4-7-8 breathing technique"]
    };
    return suggestions[emotion] || ["Practice mindful breathing", "Take a short walk", "Drink water and rest"];
};

module.exports = { getTherapyResponse, analyzeEmotion, generateStressSuggestions, generateWeeklySummary, analyzeFacialExpressions };