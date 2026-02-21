const fetch = require('node-fetch'); // Using node-fetch or global fetch if available

const API_KEY = 'ak_live_77ab3e765197bede3f47106e14317809b347ca32057f18c251ce0327038d28a3';
const ENDPOINT = 'https://customer-api.armoriq.ai/v1/plan';

async function testArmorIQ() {
    console.log('--- ArmorIQ Diagnostic Start ---');
    console.log(`Connecting to: ${ENDPOINT}`);

    const testPlan = {
        intent: 'therapy_vent',
        reasoning: 'Diagnostic test from MindWatch backend to verify dashboard sync.',
        nodes: [{
            id: 'diagnostic_node',
            type: 'test',
            value: 'Diagnostic check',
            metadata: { message: 'Hello ArmorIQ Dashboard!' }
        }],
        context: {
            userId: 'diagnostic-user',
            sessionId: 'test-session',
            domain: 'mental-health'
        }
    };

    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPlan)
        });

        console.log(`HTTP Status: ${response.status}`);
        const data = await response.json();
        console.log('Response Payload:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ SUCCESS: Plan submitted to ArmorIQ.');
            console.log('Now check your dashboard: http://customer-iap.armoriq.ai');
        } else {
            console.log('\n❌ ERROR: API request failed.');
        }
    } catch (err) {
        console.error('\n❌ CRITICAL ERROR:', err.message);
    }
    console.log('--- ArmorIQ Diagnostic End ---');
}

testArmorIQ();
