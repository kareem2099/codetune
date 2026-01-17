// src/utils/Logger.ts
import * as vscode from 'vscode';

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

export class Logger {
    private static _instance: Logger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        // This is the name that will appear in the Output panel
        this.outputChannel = vscode.window.createOutputChannel("CodeTune");
    }

    public static get instance(): Logger {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        return Logger._instance;
    }

    private log(level: LogLevel, message: string, data?: any) {
        const timestamp = new Date().toLocaleTimeString();
        let logMessage = `[${timestamp}] [${level}] ${message}`;

        if (data) {
            // If there is data (Object), convert it to String and clean it
            try {
                const dataString = JSON.stringify(data, null, 2);
                logMessage += `\nData: ${dataString}`;
            } catch (error) {
                logMessage += `\nData: [Circular or Unstringifiable Object]`;
            }
        }

        this.outputChannel.appendLine(logMessage);

        // (Optional) If you want them to also appear in the Debug Console when developing
        if (process.env.NODE_ENV === 'development') {
            console.log(logMessage);
        }
    }

    public info(message: string, data?: any) {
        this.log(LogLevel.INFO, message, data);
    }

    public warn(message: string, data?: any) {
        this.log(LogLevel.WARN, message, data);
    }

    public error(message: string, error?: any) {
        // Smart handling of Error Objects
        const errorMsg = error instanceof Error ? error.stack || error.message : JSON.stringify(error);
        this.log(LogLevel.ERROR, message, errorMsg);
    }

    public debug(message: string, data?: any) {
        // Only log debug messages if DEBUG_MODE is enabled
        if (this.isDebugMode()) {
            this.log(LogLevel.DEBUG, message, data);
        }
    }

    private isDebugMode(): boolean {
        // Debug mode disabled for production to prevent log spam
        // Can be enabled by setting DEBUG_MODE=true environment variable
        return process.env.DEBUG_MODE === 'true' ||
               (global as any).DEBUG_MODE === true;
    }

    public show() {
        this.outputChannel.show();
    }
}
