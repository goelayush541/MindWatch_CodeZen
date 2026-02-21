const armoriqService = require('../services/ArmoriqService');
const intentPlan = require('../config/intent.plan.json');

/**
 * Middleware to detect user intent using ArmorIQ and attach an execution plan to the request.
 */
const intentPlanMiddleware = async (req, res, next) => {
    try {
        const { message } = req.body;

        if (!message) return next();

        // 1. Detect intent using ArmorIQ
        const result = await armoriqService.detectIntent(message, {
            userId: req.user ? req.user._id : 'anonymous'
        });

        // 2. Map detection result to our intent plan config
        const matchedIntent = intentPlan.intents.find(i => i.id === result.intent) ||
            intentPlan.intents.find(i => i.id === intentPlan.default_intent);

        // 3. Attach the intent and its action to the request object
        req.intentPlan = {
            intent: result.intent,
            confidence: result.confidence,
            action: matchedIntent.action,
            description: matchedIntent.description,
            isCrisis: result.intent === 'crisis'
        };

        console.log(`[IntentPlan] Message classified as "${result.intent}" (Action: ${matchedIntent.action})`);

        next();
    } catch (err) {
        console.error('IntentPlan Middleware Error:', err.message);
        // Fallback to default behavior if intent detection fails
        req.intentPlan = {
            intent: intentPlan.default_intent,
            action: 'ai_therapy',
            isCrisis: false
        };
        next();
    }
};

module.exports = intentPlanMiddleware;
