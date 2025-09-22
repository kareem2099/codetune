import * as vscode from 'vscode';
import { MusicServiceManager, MusicServiceType } from './musicService';
import { YouTubeMusicService } from './youtubeMusicService';
import { MusicTrack } from './musicService';

export class MusicExplorerProvider implements vscode.TreeDataProvider<MusicItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MusicItem | undefined | void> = new vscode.EventEmitter<MusicItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<MusicItem | undefined | void> = this._onDidChangeTreeData.event;

    private searchHistory: string[] = [];
    private currentSearchResults: MusicTrack[] = [];
    private isSearching: boolean = false;

    constructor(private musicServiceManager: MusicServiceManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MusicItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MusicItem): Promise<MusicItem[]> {
        if (!element) {
            // Root level - show main categories
            return this.getRootItems();
        }

        if (element.contextValue === 'searchHistory') {
            return this.getSearchHistoryItems();
        }

        if (element.contextValue === 'currentSearch') {
            return this.getCurrentSearchItems();
        }

        if (element.contextValue === 'services') {
            return this.getServiceItems();
        }

        if (element.contextValue === 'youtubeMusic') {
            return this.getYouTubeMusicItems();
        }

        return [];
    }

    private getRootItems(): MusicItem[] {
        const items: MusicItem[] = [
            new MusicItem(
                'Services',
                vscode.TreeItemCollapsibleState.Expanded,
                'services',
                'folder',
                {
                    command: 'codeTune.selectMusicService',
                    title: 'Select Music Service'
                }
            ),
            new MusicItem(
                'Search',
                vscode.TreeItemCollapsibleState.Expanded,
                'searchHistory',
                'search',
                {
                    command: 'codeTune.searchMusic',
                    title: 'Search Music'
                }
            )
        ];

        // Add current search results if any
        if (this.currentSearchResults.length > 0) {
            items.splice(1, 0, new MusicItem(
                `Search Results (${this.currentSearchResults.length})`,
                vscode.TreeItemCollapsibleState.Expanded,
                'currentSearch',
                'list-ordered'
            ));
        }

        return items;
    }

    private getServiceItems(): MusicItem[] {
        const services = this.musicServiceManager.getAvailableServices();
        return services.map(service => new MusicItem(
            `${service.name}${service.isFree ? ' (Free)' : ' (Premium)'}`,
            vscode.TreeItemCollapsibleState.None,
            service.type,
            service.type === MusicServiceType.YOUTUBE_MUSIC ? 'music' : 'radio',
            {
                command: 'codeTune.selectMusicService',
                title: `Switch to ${service.name}`,
                arguments: [service.type]
            }
        ));
    }

    private getSearchHistoryItems(): MusicItem[] {
        const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
        if (youtubeService instanceof YouTubeMusicService) {
            this.searchHistory = youtubeService.getSearchHistory();
        }

        if (this.searchHistory.length === 0) {
            return [new MusicItem(
                'No search history',
                vscode.TreeItemCollapsibleState.None,
                'noHistory',
                'info'
            )];
        }

        return this.searchHistory.slice(0, 10).map((query, index) => new MusicItem(
            query,
            vscode.TreeItemCollapsibleState.None,
            `history_${index}`,
            'history',
            {
                command: 'codeTune.searchMusic',
                title: `Search for "${query}"`,
                arguments: [query]
            }
        ));
    }

    private getCurrentSearchItems(): MusicItem[] {
        return this.currentSearchResults.map((track, index) => new MusicItem(
            `${track.name} - ${track.artists.join(', ')}`,
            vscode.TreeItemCollapsibleState.None,
            `track_${track.id}`,
            'music',
            {
                command: 'codeTune.playTrack',
                title: `Play ${track.name}`,
                arguments: [track.id]
            }
        ));
    }

    private getYouTubeMusicItems(): MusicItem[] {
        const items: MusicItem[] = [];

        // Add search history
        items.push(new MusicItem(
            'Search History',
            vscode.TreeItemCollapsibleState.Collapsed,
            'youtubeSearchHistory',
            'history'
        ));

        // Add cache management
        items.push(new MusicItem(
            'Clear Cache',
            vscode.TreeItemCollapsibleState.None,
            'clearCache',
            'clear-all',
            {
                command: 'codeTune.clearYouTubeCache',
                title: 'Clear YouTube Music Cache'
            }
        ));

        return items;
    }

    public setSearchResults(results: MusicTrack[]): void {
        this.currentSearchResults = results;
        this.refresh();
    }

    public clearSearchResults(): void {
        this.currentSearchResults = [];
        this.refresh();
    }
}

export class MusicItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        iconName?: string,
        command?: vscode.Command
    ) {
        super(label, collapsibleState);

        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        }

        if (command) {
            this.command = command;
        }

        // Set tooltips for better UX
        this.tooltip = this.label;
        this.description = this.getDescription();
    }

    private getDescription(): string {
        switch (this.contextValue) {
            case 'services':
                return 'Available music services';
            case 'searchHistory':
                return 'Recent searches';
            case 'currentSearch':
                return 'Current search results';
            case 'youtubeMusic':
                return 'YouTube Music features';
            default:
                return '';
        }
    }
}

export class MusicSearchProvider implements vscode.TreeDataProvider<SearchItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SearchItem | undefined | void> = new vscode.EventEmitter<SearchItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<SearchItem | undefined | void> = this._onDidChangeTreeData.event;

    private searchQuery: string = '';
    private searchResults: any[] = [];
    private isSearching: boolean = false;

    constructor(private musicServiceManager: MusicServiceManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SearchItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SearchItem): Promise<SearchItem[]> {
        if (!element) {
            return this.getSearchRootItems();
        }

        if (element.contextValue === 'quickSearches') {
            return this.getQuickSearchItems();
        }

        if (element.contextValue === 'searchResults') {
            return this.getSearchResultItems();
        }

        return [];
    }

    private getSearchRootItems(): SearchItem[] {
        const items: SearchItem[] = [
            new SearchItem(
                'Quick Searches',
                vscode.TreeItemCollapsibleState.Expanded,
                'quickSearches',
                'search'
            )
        ];

        if (this.searchQuery) {
            items.push(new SearchItem(
                `Results for "${this.searchQuery}"`,
                vscode.TreeItemCollapsibleState.Expanded,
                'searchResults',
                'list-ordered'
            ));
        }

        return items;
    }

    private getQuickSearchItems(): SearchItem[] {
        const quickSearches = [
            'Top Hits 2024',
            'Trending Music',
            'Popular Playlists',
            'New Releases',
            'Chill Music',
            'Focus Music',
            'Workout Music'
        ];

        return quickSearches.map((query, index) => new SearchItem(
            query,
            vscode.TreeItemCollapsibleState.None,
            `quick_${index}`,
            'play',
            {
                command: 'codeTune.searchMusic',
                title: `Search for ${query}`,
                arguments: [query]
            }
        ));
    }

    private getSearchResultItems(): SearchItem[] {
        if (this.isSearching) {
            return [new SearchItem(
                'Searching...',
                vscode.TreeItemCollapsibleState.None,
                'searching',
                'sync~spin'
            )];
        }

        if (this.searchResults.length === 0) {
            return [new SearchItem(
                'No results found',
                vscode.TreeItemCollapsibleState.None,
                'noResults',
                'info'
            )];
        }

        return this.searchResults.map((result, index) => new SearchItem(
            `${result.name} - ${result.artists.join(', ')}`,
            vscode.TreeItemCollapsibleState.None,
            `result_${index}`,
            'music',
            {
                command: 'codeTune.playTrack',
                title: `Play ${result.name}`,
                arguments: [result.id]
            }
        ));
    }

    public setSearchQuery(query: string): void {
        this.searchQuery = query;
        this.refresh();
    }

    public setSearchResults(results: any[]): void {
        this.searchResults = results;
        this.isSearching = false;
        this.refresh();
    }

    public setSearching(searching: boolean): void {
        this.isSearching = searching;
        this.refresh();
    }
}

export class SearchItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        iconName?: string,
        command?: vscode.Command
    ) {
        super(label, collapsibleState);

        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        }

        if (command) {
            this.command = command;
        }

        this.tooltip = this.label;
        this.description = this.getDescription();
    }

    private getDescription(): string {
        switch (this.contextValue) {
            case 'quickSearches':
                return 'Quick search options';
            case 'searchResults':
                return 'Search results';
            default:
                return '';
        }
    }
}
