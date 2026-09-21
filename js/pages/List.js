import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="gdl-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="gdl-wrapper">
            <!-- ПОИСК -->
            <div class="gdl-search-bar">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input 
                        type="text" 
                        v-model="searchQuery" 
                        placeholder="Search levels or authors..." 
                        class="gdl-input"
                    />
                    <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
                </div>
            </div>

            <!-- СЕТКА -->
            <div class="gdl-content-grid">
                
                <!-- ЛЕВАЯ КОЛОНКА -->
                <div class="gdl-left-column">
                    <div class="gdl-meta-box">
                        <h3>List Editors</h3>
                        <ul class="editors-list" v-if="editors.length">
                            <li v-for="(editor, i) in editors" :key="i">
                                <span class="role-icon">🛡️</span>
                                <span>{{ editor.name || editor }}</span>
                            </li>
                        </ul>
                        <p v-else style="color: #64748b; font-size: 13px;">No editors listed.</p>

                        <div class="rules-section">
                            <h3>Rules</h3>
                            <ul class="rules-list">
                                <li><strong>1.</strong> Records must have video proof with clicks/taps.</li>
                                <li><strong>2.</strong> Raw footage must be available if requested.</li>
                                <li><strong>3.</strong> Hacks or secret ways are strictly prohibited.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- ЦЕНТРАЛЬНАЯ КОЛОНКА -->
                <div class="gdl-cards-container">
                    <div 
                        v-for="level in filteredList" 
                        :key="level.path || level.rank" 
                        class="gdl-level-card"
                        :class="{ 'active': selectedLevel?.name === level.name }"
                        @click="selectedLevel = level"
                    >
                        <div class="gdl-card-thumb">
                            <img :src="getThumbnail(level.ytid)" @error="onThumbError" />
                            <span class="rank-badge">#{{ level.rank }}</span>
                        </div>
                        <div class="gdl-card-info">
                            <div class="card-header">
                                <span class="rank-number">#{{ level.rank }}</span>
                                <h3 class="level-title">{{ level.name }}</h3>
                            </div>
                            <div class="card-authors">
                                By <strong>{{ level.author }}</strong>
                            </div>
                            <div class="card-authors">
                                Verified by <span class="verifier-name">{{ level.verifier }}</span>
                            </div>
                            <div class="card-points">
                                <span class="points-max">{{ score(level.rank) }} pts</span>
                            </div>
                        </div>
                    </div>
                    <div v-if="filteredList.length === 0" style="color: #64748b; text-align: center; padding: 20px;">
                        No levels found.
                    </div>
                </div>

                <!-- ПРАВАЯ КОЛОНКА -->
                <div class="gdl-details-container" v-if="selectedLevel">
                    <div class="gdl-level-detail-box">
                        <h2 class="detail-title">#{{ selectedLevel.rank }} {{ selectedLevel.name }}</h2>

                        <div class="authors-clean-block">
                            <div class="author-item">
                                <span class="author-label">CREATOR</span>
                                <span class="author-val">{{ selectedLevel.author }}</span>
                            </div>
                            <div class="author-item">
                                <span class="author-label">VERIFIER</span>
                                <span class="author-val verifier-name">{{ selectedLevel.verifier }}</span>
                            </div>
                        </div>

                        <!-- ВИДЕО -->
                        <div class="video-wrapper" v-if="selectedLevel.ytid">
                            <iframe 
                                :src="embed(selectedLevel.ytid)" 
                                frameborder="0" 
                                allowfullscreen
                            ></iframe>
                        </div>

                        <!-- СТАТИСТИКА -->
                        <div class="gdl-stats-grid">
                            <div class="stat-item">
                                <span class="stat-label">POINTS</span>
                                <span class="stat-value">{{ score(selectedLevel.rank) }}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">QUALIFY</span>
                                <span class="stat-value">{{ selectedLevel.percentToQualify || 100 }}%</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">RECORDS</span>
                                <span class="stat-value">{{ recordsList.length }}</span>
                            </div>
                        </div>

                        <!-- РЕКОРДЫ -->
                        <div class="records-section">
                            <div class="records-header">
                                <span class="records-trophy">🏆</span>
                                <div class="records-header-text">
                                    <h3 class="section-subtitle">Records</h3>
                                    <p class="records-count-info">
                                        <span class="highlight-100">{{ selectedLevel.percentToQualify || 100 }}%</span> required to qualify
                                    </p>
                                </div>
                            </div>

                            <div class="records-list" v-if="recordsList.length">
                                <div 
                                    v-for="(rec, idx) in recordsList" 
                                    :key="idx" 
                                    class="record-card"
                                >
                                    <div class="record-user-info">
                                        <span class="user-name">{{ rec.user || rec.name }}</span>
                                    </div>
                                    <div class="record-meta-info">
                                        <span class="percent-tag">{{ rec.percent }}% ({{ rec.hz || 60 }}Hz)</span>
                                        <a v-if="rec.link" :href="rec.link" target="_blank" class="record-video-btn" title="Watch video">
                                            ▶
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <p v-else class="no-records">No records on this level yet.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `,

    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selectedLevel: null,
        searchQuery: ""
    }),

    computed: {
        filteredList() {
            if (!this.searchQuery) return this.list;
            const q = this.searchQuery.toLowerCase().trim();
            return this.list.filter(l => 
                (l.name && l.name.toLowerCase().includes(q)) ||
                (l.author && l.author.toLowerCase().includes(q)) ||
                (l.verifier && l.verifier.toLowerCase().includes(q))
            );
        },
        recordsList() {
            if (!this.selectedLevel || !this.selectedLevel.records) return [];
            return Array.isArray(this.selectedLevel.records) ? this.selectedLevel.records : [];
        }
    },

    async mounted() {
        try {
            const fetchListFn = ContentModule.fetchList || (async () => []);
            const fetchEditorsFn = ContentModule.fetchEditors || (async () => []);

            const [listData, editorsData] = await Promise.all([
                fetchListFn(),
                fetchEditorsFn()
            ]);

            this.list = Array.isArray(listData) ? listData : [];
            this.editors = Array.isArray(editorsData) ? editorsData : [];

            if (this.list.length > 0) {
                this.selectedLevel = this.list[0];
            }
        } catch (e) {
            console.error("Error mounting List component:", e);
        } finally {
            this.loading = false;
        }
    },

    methods: {
        embed(ytid) {
            if (!ytid) return '';
            return `https://www.youtube.com/embed/${ytid}`;
        },

        getThumbnail(ytid) {
            if (!ytid) {
                return 'https://img.youtube.com/vi/3547192841/hqdefault.jpg';
            }
            return `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg`;
        },

        onThumbError(e) {
            e.target.src = 'https://i.imgur.com/6VBx3io.png';
        },

        score(rank) {
            if (!rank || typeof rank !== 'number') return 0;
            return Math.max(100 - (rank - 1) * 2, 5);
        }
    }
};
