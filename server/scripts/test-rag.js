import { AIService } from '../src/cli/ai/google-service.js';
import { enableTools } from '../src/config/tool.config.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    console.log("🧪 Testing RAG Feature...");

    // Enable the tool
    enableTools(['search_codebase']);

    const ai = new AIService();

    console.log("❓ Question: What is in agent.config.js?");

    try {
        const response = await ai.sendMessage([
            { role: 'user', content: 'What is in agent.config.js? Please explain its purpose.' }
        ], (chunk) => process.stdout.write(chunk));

        console.log("\n\n✅ Test Complete.");
    } catch (error) {
        console.error("\n❌ Test Failed:", error);
    }
}

main().catch(console.error);
