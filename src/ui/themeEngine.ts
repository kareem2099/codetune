// src/ui/themeEngine.ts
import * as vscode from 'vscode';
import { logger } from '../utils/Logger';

export type ThemeName = 'default' | 'green' | 'gold' | 'ocean' | 'dark' | 'light' | 'custom';

export interface ThemeVariables {
    '--ct-primary': string;
    '--ct-primary-hover': string;
    '--ct-accent': string;
    '--ct-bg-primary': string;
    '--ct-bg-secondary': string;
    '--ct-bg-card': string;
    '--ct-text-primary': string;
    '--ct-text-secondary': string;
    '--ct-border': string;
    '--ct-shadow': string;
}

const PRESETS: Record<ThemeName, ThemeVariables | null> = {
    default: null, // null = use VS Code vars

    green: {
        '--ct-primary': '#2d8a55',
        '--ct-primary-hover': '#236644',
        '--ct-accent': '#3fba76',
        '--ct-bg-primary': '#0d1f17',
        '--ct-bg-secondary': '#122a1f',
        '--ct-bg-card': '#183526',
        '--ct-text-primary': '#e8f5ee',
        '--ct-text-secondary': '#a0c9b0',
        '--ct-border': '#1e4d30',
        '--ct-shadow': 'rgba(45,138,85,0.25)'
    },

    gold: {
        '--ct-primary': '#c8993a',
        '--ct-primary-hover': '#a67a2c',
        '--ct-accent': '#e6bb59',
        '--ct-bg-primary': '#1c1609',
        '--ct-bg-secondary': '#26200e',
        '--ct-bg-card': '#302914',
        '--ct-text-primary': '#f5ead3',
        '--ct-text-secondary': '#c4a96a',
        '--ct-border': '#4a3b14',
        '--ct-shadow': 'rgba(200,153,58,0.25)'
    },

    ocean: {
        '--ct-primary': '#1e7ea1',
        '--ct-primary-hover': '#165f7c',
        '--ct-accent': '#29a8d4',
        '--ct-bg-primary': '#071620',
        '--ct-bg-secondary': '#0c1f2e',
        '--ct-bg-card': '#10283b',
        '--ct-text-primary': '#d4eaf5',
        '--ct-text-secondary': '#7db8d4',
        '--ct-border': '#163a52',
        '--ct-shadow': 'rgba(30,126,161,0.25)'
    },

    dark: {
        '--ct-primary': '#667eea',
        '--ct-primary-hover': '#5a67d8',
        '--ct-accent': '#764ba2',
        '--ct-bg-primary': '#0f0f23',
        '--ct-bg-secondary': '#1a1a2e',
        '--ct-bg-card': '#16213e',
        '--ct-text-primary': '#e2e8f0',
        '--ct-text-secondary': '#cbd5e1',
        '--ct-border': 'rgba(255, 255, 255, 0.1)',
        '--ct-shadow': 'rgba(0, 0, 0, 0.3)'
    },

    light: {
        '--ct-primary': '#4f46e5',
        '--ct-primary-hover': '#4338ca',
        '--ct-accent': '#6366f1',
        '--ct-bg-primary': '#f8fafc',
        '--ct-bg-secondary': '#f1f5f9',
        '--ct-bg-card': '#ffffff',
        '--ct-text-primary': '#0f172a',
        '--ct-text-secondary': '#334155',
        '--ct-border': '#e2e8f0',
        '--ct-shadow': 'rgba(0, 0, 0, 0.08)'
    },

    custom: null // populated at runtime
};

const CONFIG_KEY = 'codeTune.theme';
const CUSTOM_KEY = 'codeTune.customThemeVariables';

export class ThemeEngine {
    private static _instance: ThemeEngine;
    private context!: vscode.ExtensionContext;
    private currentTheme: ThemeName = 'default';
    private customVariables: Partial<ThemeVariables> = {};
    /** Webview panels/providers that should receive theme updates. */
    private subscribers: Array<(vars: ThemeVariables | null) => void> = [];

    private constructor() { }

    public static get instance(): ThemeEngine {
        if (!ThemeEngine._instance) {
            ThemeEngine._instance = new ThemeEngine();
        }
        return ThemeEngine._instance;
    }

    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;

        // Load persisted theme
        const savedTheme = context.globalState.get<ThemeName>('codeTune_theme', 'default');
        this.customVariables = context.globalState.get<Partial<ThemeVariables>>(CUSTOM_KEY, {});
        this.currentTheme = savedTheme;

        // Re-apply on config changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(CONFIG_KEY)) {
                const theme = vscode.workspace.getConfiguration('codeTune').get<ThemeName>('theme', 'default');
                this.applyTheme(theme);
            }
        });

        logger.info(`[ThemeEngine] Initialized. Current theme: ${this.currentTheme}`);
    }

    /**
     * Subscribe to theme changes (e.g., from a webview provider).
     * The callback receives the full variable map, or null for the default VS Code theme.
     */
    public subscribe(callback: (vars: ThemeVariables | null) => void): void {
        this.subscribers.push(callback);
        // Immediately call with current state
        callback(this.getVariables());
    }

    /**
     * Apply a named preset theme.
     */
    public applyTheme(name: ThemeName): void {
        this.currentTheme = name;
        if (this.context) {
            this.context.globalState.update('codeTune_theme', name);
        }
        try {
            vscode.workspace.getConfiguration('codeTune').update('theme', name, vscode.ConfigurationTarget.Global);
        } catch {
            // ignore if not configurable
        }

        const vars = this.getVariables();
        logger.info(`[ThemeEngine] Applied theme: ${name}`);
        this.notifySubscribers(vars);
    }

    /**
     * Apply custom color overrides (for the custom theme).
     */
    public applyCustomVariables(vars: Partial<ThemeVariables>): void {
        this.customVariables = { ...this.customVariables, ...vars };
        if (this.context) {
            this.context.globalState.update(CUSTOM_KEY, this.customVariables);
        }
        this.currentTheme = 'custom';
        this.notifySubscribers(this.getVariables());
    }

    /**
     * Get the current CSS variable map, or null for the default theme.
     */
    public getVariables(): ThemeVariables | null {
        if (this.currentTheme === 'default') { return null; }
        if (this.currentTheme === 'custom') {
            // Merge green as base for custom
            const base = { ...PRESETS.green } as ThemeVariables;
            return { ...base, ...this.customVariables } as ThemeVariables;
        }
        return PRESETS[this.currentTheme];
    }

    public getCurrentTheme(): ThemeName { return this.currentTheme; }

    public getPresetNames(): ThemeName[] {
        return Object.keys(PRESETS) as ThemeName[];
    }

    /** Generate a <style> block to inject into a webview. */
    public generateStyleTag(): string {
        const vars = this.getVariables();
        if (!vars) { return ''; }
        const declarations = Object.entries(vars)
            .map(([k, v]) => `  ${k}: ${v};`)
            .join('\n');
        return `<style>\n:root {\n${declarations}\n}\n</style>`;
    }

    private notifySubscribers(vars: ThemeVariables | null): void {
        for (const cb of this.subscribers) {
            try { cb(vars); } catch { /* ignore individual subscriber errors */ }
        }
    }
}
