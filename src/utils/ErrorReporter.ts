import { logger } from './Logger';

export enum ErrorCategory {
    NETWORK = 'NETWORK',
    API = 'API',
    AUDIO = 'AUDIO',
    PERMISSION = 'PERMISSION',
    VALIDATION = 'VALIDATION',
    STORAGE = 'STORAGE',
    UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface ErrorRecord {
    id: string;
    timestamp: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;
    userMessage: string;
    context?: Record<string, any>;
    stack?: string;
    count: number;
    lastOccurred: string;
}

export class ErrorReporter {
    private errorHistory: Map<string, ErrorRecord> = new Map();
    private maxHistorySize: number = 100;

    // separate user-friendly messages based on error category and keywords
    private readonly userMessages: Record<ErrorCategory, Record<string, string>> = {
        [ErrorCategory.NETWORK]: {
            timeout: 'Network request timed out. Please check your connection and try again.',
            offline: 'It looks like you\'re offline. Please check your internet connection.',
            econnrefused: 'Cannot connect to the server. Please check your connection and try again.',
            failed: 'Network connection failed. Please try again.'
        },
        [ErrorCategory.API]: {
            limit: 'Too many requests. Please wait a moment and try again.',
            unauthorized: 'Authentication failed. Please check your settings.',
            forbidden: 'You don\'t have permission to access this resource.',
            'not found': 'The requested resource was not found.',
            server: 'Server error occurred. Please try again later.'
        },
        [ErrorCategory.AUDIO]: {
            codec: 'Audio format is not supported by your browser.',
            playback: 'Failed to play audio. Please try again.',
            load: 'Failed to load audio file. Please check your connection.',
            stream: 'Audio stream interrupted. Auto-retrying...'
        },
        [ErrorCategory.PERMISSION]: {
            storage: 'Cannot access storage. Please check permission settings.',
            clipboard: 'Cannot access clipboard. Please check permission settings.'
        },
        [ErrorCategory.VALIDATION]: {
            invalid: 'Invalid input provided. Please check and try again.',
            missing: 'A required field is missing.',
            format: 'Invalid format. Please try again.'
        },
        [ErrorCategory.STORAGE]: {
            quota: 'Storage quota exceeded. Please clear some space.',
            write: 'Failed to write to storage. Please try again.',
            read: 'Failed to read from storage. Please try again.'
        },
        [ErrorCategory.UNKNOWN]: {}
    };

    private readonly defaultMessages: Record<ErrorCategory, string> = {
        [ErrorCategory.NETWORK]: 'Network error occurred. Please try again.',
        [ErrorCategory.API]: 'API error occurred. Please try again.',
        [ErrorCategory.AUDIO]: 'Audio playback error. Please try again.',
        [ErrorCategory.PERMISSION]: 'Permission denied. Please check your settings.',
        [ErrorCategory.VALIDATION]: 'Validation error. Please check your input.',
        [ErrorCategory.STORAGE]: 'Storage error occurred.',
        [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    };

    constructor() {
        logger.info('ErrorReporter initialized');
    }

    private categorizeError(error: any): ErrorCategory {
        const message = String(error?.message || error || '').toLowerCase();

        if (message.includes('timeout') || message.includes('network') || message.includes('fetch') || message.includes('econnrefused')) {
            return ErrorCategory.NETWORK;
        }
        if (error?.status || message.includes('http') || message.includes('api')) {
            return ErrorCategory.API;
        }
        if (message.includes('audio') || message.includes('codec') || message.includes('playback')) {
            return ErrorCategory.AUDIO;
        }
        if (message.includes('permission') || message.includes('denied')) {
            return ErrorCategory.PERMISSION;
        }
        if (message.includes('invalid') || message.includes('validation')) {
            return ErrorCategory.VALIDATION;
        }
        if (message.includes('quota') || message.includes('storage')) {
            return ErrorCategory.STORAGE;
        }

        return ErrorCategory.UNKNOWN;
    }

    private determineSeverity(category: ErrorCategory): ErrorSeverity {
        switch (category) {
            case ErrorCategory.PERMISSION:
                return ErrorSeverity.CRITICAL;
            case ErrorCategory.AUDIO:
            case ErrorCategory.STORAGE:
                return ErrorSeverity.HIGH;
            case ErrorCategory.API:
            case ErrorCategory.NETWORK:
                return ErrorSeverity.MEDIUM;
            default:
                return ErrorSeverity.LOW;
        }
    }

    private generateUserMessage(category: ErrorCategory, error: any): string {
        const message = String(error?.message || error || '').toLowerCase();
        const messageMap = this.userMessages[category] || {};

        // make sure the message contains the key
        for (const [key, value] of Object.entries(messageMap)) {
            if (message.includes(key)) {
                return value;
            }
        }

        // if not found, return the default message for the category
        return this.defaultMessages[category] || this.defaultMessages[ErrorCategory.UNKNOWN];
    }

    private generateErrorId(category: ErrorCategory, message: string): string {
        // safe message for ID generation: take first 20 chars, replace spaces with underscores, and lowercase
        const safeMessage = String(message || 'unknown_error').substring(0, 20).replace(/\s+/g, '_');
        return `${category}_${safeMessage}`.toLowerCase();
    }

    public reportError(error: any, context?: Record<string, any>): ErrorRecord {
        const category = this.categorizeError(error);
        const severity = this.determineSeverity(category);
        const userMessage = this.generateUserMessage(category, error);
        const message = String(error?.message || error || 'Unknown error');
        const errorId = this.generateErrorId(category, message);
        const now = new Date().toISOString();

        let record = this.errorHistory.get(errorId);
        if (record) {
            record.count++;
            record.lastOccurred = now;
            if (context) {
                record.context = { ...record.context, ...context };
            }
        } else {
            record = {
                id: errorId,
                timestamp: now,
                category,
                severity,
                message,
                userMessage,
                context,
                stack: error?.stack,
                count: 1,
                lastOccurred: now
            };

            if (this.errorHistory.size >= this.maxHistorySize) {
                const oldestKey = Array.from(this.errorHistory.keys())[0];
                this.errorHistory.delete(oldestKey);
            }

            this.errorHistory.set(errorId, record);
        }

        logger.error(`[${category}] ${message}`, {
            severity,
            userMessage,
            context,
            count: record.count
        });

        return record;
    }

    public getUserMessage(error: any): string {
        return this.generateUserMessage(this.categorizeError(error), error);
    }

    public getError(errorId: string): ErrorRecord | undefined {
        return this.errorHistory.get(errorId);
    }

    public getAllErrors(): ErrorRecord[] {
        return Array.from(this.errorHistory.values());
    }

    public getErrorsByCategory(category: ErrorCategory): ErrorRecord[] {
        return this.getAllErrors().filter(e => e.category === category);
    }

    public getErrorsBySeverity(severity: ErrorSeverity): ErrorRecord[] {
        return this.getAllErrors().filter(e => e.severity === severity);
    }

    public getFrequentErrors(threshold: number = 3): ErrorRecord[] {
        return this.getAllErrors()
            .filter(e => e.count >= threshold)
            .sort((a, b) => b.count - a.count);
    }

    public getStatistics() {
        const errors = this.getAllErrors();
        const byCategoryMap = new Map<ErrorCategory, number>();
        const bySeverityMap = new Map<ErrorSeverity, number>();

        errors.forEach(error => {
            byCategoryMap.set(error.category, (byCategoryMap.get(error.category) || 0) + error.count);
            bySeverityMap.set(error.severity, (bySeverityMap.get(error.severity) || 0) + error.count);
        });

        return {
            totalErrors: errors.length,
            totalOccurrences: errors.reduce((sum, e) => sum + e.count, 0),
            byCategory: Object.fromEntries(byCategoryMap),
            bySeverity: Object.fromEntries(bySeverityMap),
            topErrors: this.getFrequentErrors(1)
        };
    }

    public clearHistory() {
        this.errorHistory.clear();
        logger.info('Error history cleared');
    }

    public exportReport() {
        return {
            exportedAt: new Date().toISOString(),
            statistics: this.getStatistics(),
            errors: this.getAllErrors()
        };
    }

    public hasCriticalErrors(): boolean {
        return this.getAllErrors().some(e => e.severity === ErrorSeverity.CRITICAL);
    }

    public getRecentErrors(count: number = 10): ErrorRecord[] {
        return this.getAllErrors()
            .sort((a, b) => new Date(b.lastOccurred).getTime() - new Date(a.lastOccurred).getTime())
            .slice(0, count);
    }
}

export const errorReporter = new ErrorReporter();