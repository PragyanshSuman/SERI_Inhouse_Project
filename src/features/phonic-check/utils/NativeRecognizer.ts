import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';

export class NativeRecognizer {
    private isRecognizing = false;
    private currentResult: string | null = null;

    constructor() {
        // Setup listeners
        Voice.onSpeechResults = this.onSpeechResults.bind(this);
        Voice.onSpeechError = (e) => console.error('Native Voice Error:', e);
    }

    public async recognizeOnce(locale: string = 'en-US'): Promise<string | null> {
        await this.start(locale);
        return new Promise((resolve) => {
            setTimeout(async () => {
                const result = await this.stop();
                resolve(result);
            }, 5000);
        });
    }

    public async start(locale: string = 'en-US'): Promise<void> {
        try {
            if (this.isRecognizing) await this.stop();

            this.currentResult = null;
            this.isRecognizing = true;
            await Voice.start(locale);
        } catch (error) {
            console.error('Native Recognition Start Failed:', error);
            this.isRecognizing = false;
        }
    }

    public async stop(): Promise<string | null> {
        if (!this.isRecognizing) return this.currentResult;

        try {
            await Voice.stop();
            this.isRecognizing = false;
        } catch (error) {
            console.error('Native Recognition Stop Failed:', error);
        }
        return this.currentResult;
    }

    private onSpeechResults(e: SpeechResultsEvent) {
        if (e.value && e.value.length > 0) {
            this.currentResult = e.value[0];
            console.log(`[NativeRecognizer] Partial/Final Result: ${this.currentResult}`);
        }
    }

    public async destroy() {
        try {
            await Voice.destroy().then(Voice.removeAllListeners);
        } catch (e) {
            console.error(e);
        }
    }
}
