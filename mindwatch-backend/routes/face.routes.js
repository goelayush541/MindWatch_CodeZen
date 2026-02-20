const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { analyzeFacialExpressions } = require('../services/groqService');

/**
 * POST /api/face/analyze
 * Analyze facial expression data with AI
 */
router.post('/analyze', auth, async (req, res) => {
    try {
        const { expressions, stressScore, dominantEmotion, sessionDuration, sessionHistory } = req.body;

        if (!expressions || typeof expressions !== 'object') {
            return res.status(400).json({ error: 'Expression data is required' });
        }

        const analysis = await analyzeFacialExpressions({
            expressions,
            stressScore,
            dominantEmotion,
            sessionDuration,
            sessionHistory
        });

        res.json({ data: analysis });
    } catch (err) {
        console.error('Face analysis error:', err.message);
        res.status(500).json({
            error: 'Analysis failed',
            data: {
                overallAssessment: 'Unable to perform AI analysis at this time. Your facial expression data shows you are ' +
                    (req.body?.stressScore > 50 ? 'experiencing some stress' : 'relatively calm') +
                    '. Consider taking a few deep breaths.',
                emotionalState: 'Analysis temporarily unavailable.',
                stressIndicators: 'Please try again in a moment.',
                recommendations: [
                    'Take a 4-7-8 breathing break to reset your nervous system',
                    'Step away from the screen for 2 minutes and look at something distant',
                    'Do a quick body scan — notice where you are holding tension'
                ],
                confidenceNote: 'This is a fallback response. AI analysis was temporarily unavailable.'
            }
        });
    }
});

module.exports = router;
