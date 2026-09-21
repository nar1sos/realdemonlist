import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";
const GITHUB_FILE_PATH = "data/_list.json"; // Читаем рекорды напрямую из списка уровней

function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUtf8(str) {
    const binary = atob(str.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

// Расчет очков за уровень в зависимости от его позиции в Demonlist
function calculatePoints(rank, percent = 100, maxRank = 150) {
    if (rank > maxRank) return 0;
    // Формула очков (кастомная или близкая to Pointercrate):
    // Чем выше топ (меньше rank), тем больше очков.
    let basePoints = 250 * Math.pow(0.96, rank - 1);
    if (percent < 100) {
        basePoints *= (percent / 100) * 0.5; // За проходки % дают часть очков
    }
    return Math.round(basePoints * 10) / 10;
}

export default {
    components: { Spinner },
    template: `
        <div class="gdl-wrapper">
            <Spinner v-if="loading" />

            <template v-else>
                <!-- 1. ПОИСК ИГРОКОВ -->
                <div class="gdl-search-bar">
                    <div class="search-input-wrapper">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск игрока..." 
                            class="gdl-input"
                        />
                        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
                    </div>
                </div>

                <!-- 2. СЕТКА ЛИДЕРБОРДА -->
                <div class="gdl-content-grid">
                    
                    <!-- ЛЕВАЯ КОЛОНКА (Инфо о лидерборде) -->
                    <div class="gdl-left-column">
                        <div class="gdl-meta-box">
                            <h3>🏆 Топ Игроков</h3>
                            <p style="font-size: 13px; color: #94a3b8; margin-top: 5px;">
                                Таблица лидеров автоматически рассчитывается на основе подтверждённых рекордов и верификаций из Demonlist.
                            </p>
                            <div style="margin-top: 15px; font-size: 12px; color: #64748b;">
                                Всего игроков в базе: <strong>{{ leaderboard.length }}</strong>
                            </div>
                        </div>
                    </div>

                    <!-- ЦЕНТРАЛЬНАЯ КОЛОНКА (Список топ игроков) -->
                    <div class="gdl-cards-container">
                        <div 
                            v-for="(player, index) in filteredLeaderboard" 
                            :key="player.name + index"
                            class="gdl-level-card"
                            :class="{ active: selectedPlayer && selectedPlayer.name === player.name }"
                            @click="selectedPlayer = player"
                        >
                            <div class="gdl-card-thumb" style="width: 50px; justify-content: center; align-items: center; font-weight: 900; font-size: 18px; color: #f59e0b;">
                                #{{ player.rank }}
                            </div>

                            <div class="gdl-card-info">
                                <div class="card-header">
                                    <h4 class="level-title">{{ player.name }}</h4>
                                </div>
                                <div class="card-authors" style="color: #38bdf8; font-weight: 700;">
                                    {{ player.score }} pt.
                                </div>
                                <div class="verifier-name" style="font-size: 11px;">
                                    Пройдено демонов: {{ player.completedCount }} | Рекордов: {{ player.records.length }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ПРАВАЯ КОЛОНКА (Подробности выбранного игрока) -->
                    <div class="gdl-details-container" v-if="selectedPlayer">
                        <div class="gdl-level-detail-box">
                            <h2 class="detail-title">#{{ selectedPlayer.rank }} - {{ selectedPlayer.name }}</h2>

                            <div class="authors-clean-block">
                                <div class="author-item">
                                    <span class="author-label">Всего очков</span>
                                    <span class="author-val" style="color: #38bdf8; font-weight: 800;">{{ selectedPlayer.score }} pt</span>
                                </div>
                                <div class="author-item">
                                    <span class="author-label">100% Прохождений</span>
                                    <span class="author-val">{{ selectedPlayer.completedCount }}</span>
                                </div>
                                <div class="author-item" v-if="selectedPlayer.verifiedCount">
                                    <span class="author-label">Верифицировано</span>
                                    <span class="author-val" style="color: #22c55e;">{{ selectedPlayer.verifiedCount }}</span>
                                </div>
                            </div>

                            <!-- СПИСОК ДОСТИЖЕНИЙ ИГРОКА -->
                            <div class="records-section" style="margin-top: 20px;">
                                <div class="records-header">
                                    <span class="records-trophy">📜</span>
                                    <h3 class="section-subtitle">Рекорды и верификации игрока</h3>
                                </div>

                                <div class="records-list" v-if="selectedPlayer.records.length > 0">
                                    <div v-for="(rec, idx) in selectedPlayer.records" :key="idx" class="record-card">
                                        <div class="record-user-info">
                                            <span class="user-name">#{{ rec.levelRank }} - {{ rec.levelName }}</span>
                                            <span v-if="rec.isVerification" style="margin-left: 6px; background: #22c55e; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">VERIFIER</span>
                                        </div>
                                        <div class="record-meta-info">
                                            <span class="percent-tag">{{ rec.percent }}%</span>
                                            <a v-if="rec.link" :href="rec.link" target="_blank" class="record-video-btn">▶</a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </template>
        </div>
    `,

    data: () => ({
        list: [],
        leaderboard: [],
        loading: true,
        selectedPlayer: null,
        searchQuery: '',
        fileSha: '',
        isAdmin: sessionStorage.getItem('is_admin') === 'true'
    }),

    computed: {
        filteredLeaderboard() {
            if (!this.searchQuery) return this.leaderboard;
            const q = this.searchQuery.toLowerCase();
            return this.leaderboard.filter(p => p.name.toLowerCase().includes(q));
        }
    },

    async mounted() {
        window.addEventListener('admin-state-changed', this.updateAdminState);
        await this.loadAndBuildLeaderboard();
    },

    unmounted() {
        window.removeEventListener('admin-state-changed', this.updateAdminState);
    },

    methods: {
        updateAdminState() {
            this.isAdmin = sessionStorage.getItem('is_admin') === 'true';
        },

        async loadAndBuildLeaderboard() {
            this.loading = true;
            try {
                let loadedList = [];
                let resList = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`);
                
                if (resList.ok) {
                    const data = await resList.json();
                    this.fileSha = data.sha;
                    const decodedContent = base64ToUtf8(data.content);
                    loadedList = JSON.parse(decodedContent);
                } else {
                    const fetchListFn = ContentModule.fetchList || (async () => []);
                    loadedList = await fetchListFn();
                }

                if (Array.isArray(loadedList)) {
                    this.list = loadedList.map((item, index) => ({
                        ...item,
                        rank: index + 1,
                        records: item.records || []
                    }));
                }

                // Автоматический сбор и парсинг игроков из всех уровней
                this.buildLeaderboardFromList();

            } catch (err) {
                console.error("Leaderboard load error:", err);
            } finally {
                this.loading = false;
            }
        },

        buildLeaderboardFromList() {
            const playersMap = {};

            this.list.forEach(level => {
                const rank = level.rank;

                // 1. Учитываем верификатора уровня
                if (level.verifier && level.verifier.trim() !== '') {
                    const vName = level.verifier.trim();
                    if (!playersMap[vName]) {
                        playersMap[vName] = { name: vName, score: 0, completedCount: 0, verifiedCount: 0, records: [] };
                    }
                    const pts = calculatePoints(rank, 100);
                    playersMap[vName].score += pts;
                    playersMap[vName].completedCount += 1;
                    playersMap[vName].verifiedCount += 1;
                    playersMap[vName].records.push({
                        levelName: level.name,
                        levelRank: rank,
                        percent: 100,
                        link: level.ytid ? `https://youtu.be/${level.ytid}` : '',
                        isVerification: true
                    });
                }

                // 2. Учитываем рекорды из уровня
                if (Array.isArray(level.records)) {
                    level.records.forEach(rec => {
                        if (!rec.user) return;
                        const uName = rec.user.trim();
                        // Если верификатор и игрок — одно лицо, исключаем дублирование 100%
                        if (uName.toLowerCase() === (level.verifier || '').trim().toLowerCase()) return;

                        if (!playersMap[uName]) {
                            playersMap[uName] = { name: uName, score: 0, completedCount: 0, verifiedCount: 0, records: [] };
                        }

                        const percent = Number(rec.percent) || 100;
                        const pts = calculatePoints(rank, percent);
                        
                        playersMap[uName].score += pts;
                        if (percent === 100) playersMap[uName].completedCount += 1;

                        playersMap[uName].records.push({
                            levelName: level.name,
                            levelRank: rank,
                            percent: percent,
                            link: rec.link || '',
                            isVerification: false
                        });
                    });
                }
            });

            // Преобразуем объект в массив и сортируем по очкам
            const sorted = Object.values(playersMap)
                .map(p => ({
                    ...p,
                    score: Math.round(p.score * 10) / 10,
                    // Сортировка рекордов игрока по сложности уровня
                    records: p.records.sort((a, b) => a.levelRank - b.levelRank)
                }))
                .sort((a, b) => b.score - a.score);

            // Присваиваем ранг местоположения
            this.leaderboard = sorted.map((p, idx) => ({ ...p, rank: idx + 1 }));

            if (this.leaderboard.length > 0) {
                this.selectedPlayer = this.leaderboard[0];
            }
        }
    }
};
