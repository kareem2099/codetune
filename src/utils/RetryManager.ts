import { logger } from './Logger';

export interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    timeoutMs: number;
}

export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attemptsUsed: number;
    lastError?: string;
}

export interface NetworkState {
    isOnline: boolean;
    type: string;
}

export class RetryManager {
    private config: RetryConfig;
    private isNetworkConnected: boolean = true;

    constructor(config?: Partial<RetryConfig>) {
        this.config = {
            maxRetries: config?.maxRetries ?? 3,
            initialDelayMs: config?.initialDelayMs ?? 1000,
            maxDelayMs: config?.maxDelayMs ?? 30000,
            backoffMultiplier: config?.backoffMultiplier ?? 2,
            timeoutMs: config?.timeoutMs ?? 10000
        };

        this.initializeNetworkMonitoring();
        logger.info('RetryManager initialized', this.config);
    }

    private initializeNetworkMonitoring() {
        this.isNetworkConnected = true;
    }

    public getNetworkState(): NetworkState {
        return {
            isOnline: this.isNetworkConnected,
            type: 'node-env'
        };
    }

    private isRetryableError(error: any): boolean {
        const errorMsg = String(error?.message || error || '').toLowerCase();

        // Node.js specific error codes
        const nodeErrorCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'];
        if (error?.code && nodeErrorCodes.includes(error.code)) {
            return true;
        }

        if (error instanceof TypeError && errorMsg.includes('fetch')) {
            return true;
        }

        if (error?.status) {
            const retryableStatuses = [408, 429, 500, 502, 503, 504];
            return retryableStatuses.includes(error.status);
        }

        if (errorMsg.includes('timeout') || errorMsg.includes('econnrefused')) {
            return true;
        }

        return false;
    }

    private calculateDelay(attemptNumber: number): number {
        const exponentialDelay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attemptNumber - 1);
        const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5);
        return Math.min(delayWithJitter, this.config.maxDelayMs);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string = 'operation'
    ): Promise<RetryResult<T>> {
        let lastError: Error | null = null;
        let attemptCount = 0;

        for (attemptCount = 1; attemptCount <= this.config.maxRetries; attemptCount++) {
            // fixed potential memory leak by ensuring timeout is cleared in all cases (success, retryable error, non-retryable error)
            let timeoutId: NodeJS.Timeout;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`Operation timed out after ${this.config.timeoutMs}ms`));
                }, this.config.timeoutMs);
            });

            try {
                logger.debug(`[${operationName}] Attempt ${attemptCount}/${this.config.maxRetries}`);

                const result = await Promise.race([
                    operation(),
                    timeoutPromise
                ]);

                clearTimeout(timeoutId!); // clear timeout on success

                logger.info(`[${operationName}] Succeeded on attempt ${attemptCount}`);
                return {
                    success: true,
                    data: result,
                    attemptsUsed: attemptCount
                };
            } catch (error) {
                clearTimeout(timeoutId!); // clear timeout on error

                lastError = error instanceof Error ? error : new Error(String(error));
                logger.warn(`[${operationName}] Attempt ${attemptCount} failed:`, lastError.message);

                if (!this.isRetryableError(error)) {
                    logger.error(`[${operationName}] Non-retryable error, stopping retries`);
                    return {
                        success: false,
                        error: lastError,
                        attemptsUsed: attemptCount,
                        lastError: lastError.message
                    };
                }

                if (attemptCount < this.config.maxRetries) {
                    const delayMs = this.calculateDelay(attemptCount);
                    logger.debug(`[${operationName}] Waiting ${Math.round(delayMs)}ms before retry ${attemptCount + 1}`);
                    await this.sleep(delayMs);
                }
            }
        }

        logger.error(`[${operationName}] All ${attemptCount - 1} retries exhausted`);
        return {
            success: false,
            error: lastError || new Error(`${operationName} failed after ${attemptCount - 1} retries`),
            attemptsUsed: attemptCount - 1,
            lastError: lastError?.message || 'Unknown error'
        };
    }

    public async executeWithRetryOrThrow<T>(
        operation: () => Promise<T>,
        operationName: string = 'operation'
    ): Promise<T> {
        const result = await this.executeWithRetry(operation, operationName);
        if (!result.success) {
            throw result.error || new Error(result.lastError || `${operationName} failed`);
        }
        return result.data as T;
    }

    public updateConfig(config: Partial<RetryConfig>) {
        this.config = { ...this.config, ...config };
        logger.info('RetryManager config updated', this.config);
    }

    public getConfig(): RetryConfig {
        return { ...this.config };
    }

    public async checkNetworkConnectivity(): Promise<boolean> {
        if (!this.isNetworkConnected) { return false; }

        try {
            // Abort the request after 5 seconds to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://1.1.1.1', {
                method: 'HEAD',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok || response.status === 405;
        } catch (error) {
            logger.warn('Network connectivity check failed:', error);
            return false;
        }
    }

    public async waitForNetworkConnection(timeoutMs: number = 30000): Promise<boolean> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if (this.isNetworkConnected && await this.checkNetworkConnectivity()) {
                logger.info('Network connection restored');
                return true;
            }
            await this.sleep(1000);
        }
        logger.warn(`Network connection not restored within ${timeoutMs}ms`);
        return false;
    }

    public getStatistics() {
        return {
            config: this.getConfig(),
            networkState: this.getNetworkState()
        };
    }
}

export const retryManager = new RetryManager();