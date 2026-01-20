import { Runner } from "@google/adk";
// THIS IS A TEST FILE TO UNDERSTAND HOW EVENTS OPERATE IN ADK. I WANT TO USE EVENT TRACEABILITY

async function runConversation() {
    const runner = new Runner({
        agent: myAgent,      // your configured agent
        sessionId: "session-123",
    });

    for await (const event of runner.run({ input: "Hello!" })) {
        // event is a google.adk.events.Event-like object
        console.log("Author:", event.author);
        if (event.content?.parts?.length) {
            const firstPart = event.content.parts[0];
            if (firstPart.text) {
                console.log("Text:", firstPart.text);
            }
            if (firstPart.function_call) {
                console.log("Tool call:", firstPart.function_call.name, firstPart.function_call.args);
            }
            if (firstPart.function_response) {
                console.log("Tool result:", firstPart.function_response.name, firstPart.function_response.response);
            }
        }
    }
}
