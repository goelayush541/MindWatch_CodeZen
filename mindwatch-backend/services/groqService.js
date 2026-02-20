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
        const prompt = `Perform a high-precision neuro-psychological analysis on the latest interaction, leveraging the provided context.

Context (recent exchanges):
${chatContext}

Latest Spoken Text: "${text}"

Deliverable Goals:
1. **Thematic Mapping**: Identify recurring psychological themes (e.g., abandonment, perfectionism, hyper-vigilance).
2. **Nervous System State**: Hypothesize if the user is in Ventral Vagal (safety), Sympathetic (anxiety/anger), or Dorsal Vagal (shutdown).
3. **Root Hypothesis**: Suggest a potential "Why" behind the current emotion based on the narrative.

Return exactly this JSON structure (no markdown):
{
  "dominantEmotion": "one of: happy|sad|anxious|calm|angry|excited|stressed|neutral|overwhelmed|hopeful|frustrated|fearful|relief|shame|grief",
  "intensity": <number 0-100>,
  "sentimentScore": <number from -1.0 to 1.0>,
  "stressLevel": <number from 0 to 10>,
  "emotions": ["nuanced", "sub-emotions"],
  "insights": "A profound therapist-grade reflection that connects current feelings to a broader pattern or socratic bridge. Avoid surface-level empathy.",
  "suggestions": [
    "Neuro-somatic exercise (e.g., Vagus nerve stimulation tip)",
    "Cognitive reframe or Socratic journal prompt",
    "Compassionate values-based action"
  ],
  "thematicAnalysis": "1-sentence summary of the underlying psychological theme detected.",
  "growthProgress": "Movement description (e.g., 'From self-judgment toward curiosity')",
  "crisisSignals": <true or false>
}  `;

        const response = await groqCall({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are an expert clinical psychologist and emotion analyst. You provide evidence-based, logical, and structured insights.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.4,
            max_tokens: 600
        });

        const content = response.choices[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
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
        const prompt = `Based on this mental health context, provide a comprehensive set of evidence-based wellness strategies using CBT, DBT, ACT, and Polyvagal frameworks. 
        
        Ensure the advice is DYNAMIC, BOLD, and highly specific. Each tip must include a "Why this works" (Neuro-Logic).

Current context:
- Primary Emotion: ${context.emotion || 'neutral'}
- Stress/Score: ${context.stressLevel || context.score || 5}/10
- Triggers: ${context.triggers?.join(', ') || 'none specified'}
- User Notes: "${context.notes || 'No notes provided'}"

Provide 2 high-impact suggestions for each category:
1. "immediate" (Neuro-Somatic): Biological hacks to reset the nervous system.
2. "mindfulness" (Cognitive/ACT): Shifts in perception and presence.
3. "lifestyle" (Building Resilience): Long-term system support.
4. "mental" (Root Work): Challenging the origin of the distress.

Return exactly this JSON structure (no markdown):
{
  "immediate": ["Bio-hack with logic: 'Try [X] because it stimulates [Y]'", "Somatic task: '[X] signals safety to your [Y]'"],
  "mindfulness": ["Creative ACT prompt", "DBT Distress Tolerance skill"],
  "lifestyle": ["Habit-shift with reasoning", "Environment optimization"],
  "mental": ["CBT reframe against [Trigger]", "Socratic hypothesis for [Emotion]"],
  "overallAdvice": "A deeply empathetic psychological summary that identifies the core theme of the user's current state and offers a vision of growth."
} `;

        const response = await groqCall({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are a master clinical wellness strategist. You provide evidence-based, deeply insightful, and psychologically sound stress management advice that feels personalized and warm, never robotic.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.5,
            max_tokens: 800
        });

        const content = response.choices[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
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

module.exports = { getTherapyResponse, analyzeEmotion, generateStressSuggestions, generateWeeklySummary };