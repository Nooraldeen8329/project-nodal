// AI Provider Service

export const AI_PROVIDERS = {
    OLLAMA: 'ollama',
    OPENAI: 'openai'
};

export const DEFAULT_SETTINGS = {
    provider: AI_PROVIDERS.OLLAMA,
    apiKey: '', // Only for OpenAI
    model: 'llama3', // Default for Ollama
    baseUrl: 'http://localhost:11434' // Default for Ollama
};

class LLMProvider {
    constructor(settings) {
        this.settings = settings;
    }

    async generateStream() {
        throw new Error('Not implemented');
    }
}

class OllamaProvider extends LLMProvider {
    async generateStream(messages, onChunk) {
        const response = await fetch(`${this.settings.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.settings.model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Error: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.message?.content) {
                        onChunk(json.message.content);
                    }
                    if (json.done) {
                        return;
                    }
                } catch (e) {
                    console.warn('Error parsing Ollama chunk', e);
                }
            }
        }
    }
}

class OpenAIProvider extends LLMProvider {
    async generateStream(messages, onChunk) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`
            },
            body: JSON.stringify({
                model: this.settings.model || 'gpt-3.5-turbo',
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line === 'data: [DONE]') return;
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.slice(6));
                        if (json.choices?.[0]?.delta?.content) {
                            onChunk(json.choices[0].delta.content);
                        }
                    } catch (e) {
                        console.warn('Error parsing OpenAI chunk', e);
                    }
                }
            }
        }
    }
}

export const createAIProvider = (settings) => {
    switch (settings.provider) {
        case AI_PROVIDERS.OPENAI:
            return new OpenAIProvider(settings);
        case AI_PROVIDERS.OLLAMA:
        default:
            return new OllamaProvider(settings);
    }
};
