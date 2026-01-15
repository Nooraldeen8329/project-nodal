// Simple AI Service Abstraction

export const generateReply = async (messages, onStream) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const lastUserMessage = messages[messages.length - 1].content;
    const response = `[AI Mock Reply] I received your message: "${lastUserMessage}". \n\nThis is a placeholder for the actual LLM integration. In a real implementation, this would stream tokens from a local model (Ollama) or an API.`;

    // Simulate streaming
    let currentText = '';
    const tokens = response.split(' ');

    for (const token of tokens) {
        currentText += token + ' ';
        onStream(currentText);
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    return currentText;
};
