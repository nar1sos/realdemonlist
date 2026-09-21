import Spinner from "../components/Spinner.js";

const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";
const GITHUB_LEADERBOARD_PATH = "data/_leaderboard.json";
const GITHUB_LIST_PATH = "data/_list.json";

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

export default {
    components: { Spinner },
    template: `
        <main v-if="loading" class="leaderboard-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="leaderboard-container">
            <!-- Панель администратора -->
            <div v-if="isAdmin" style="grid-column: 1 / -1; margin-bottom: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button @click="openAddPlayerModal" style="padding: 10px 16px; background: #22c55e; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
                    + Добавить игрока
                </button>
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    placeholder="Поиск игрока..." 
                    class="gdl-input"
                    style="max-width: 300px; padding: 8px 12px; background: #0f172a; border: 1px solid #1e293b; color: #fff; border-radius: 8px;"
                />
            </div>

            <!-- ЛЕВАЯ КОЛОНКА: ПРОФИЛЬ -->
            <div class="profile-card" v-if="selectedPlayer">
                <div class="profile-header">
                    <div class="avatar-ring">
                        <img 
                            :src="getAvatarUrl(selectedPlayer)" 
                            class="profile-avatar"
                            @error="onAvatarError"
                        />
                    </div>
                    <div class="profile-title">
                        <img 
                            v-if="getPlayerFlag(selectedPlayer)" 
                            :src="getPlayerFlag(selectedPlayer)" 
                            class="flag-img" 
                            @error="onFlagError"
                        />
                        <h1>{{ selectedPlayer.user || selectedPlayer.name }}</h1>
                    </div>

                    <div v-if="isAdmin" style="margin-top: 10px; display: flex; gap: 8px;">
                        <button @click="openEditPlayerModal(selectedPlayer)" style="background: #3b82f6; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                            ✏️ Редактировать
                        </button>
                        <button @click="deletePlayer(selectedPlayer)" style="background: #ef4444; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                            🗑️ Удалить
                        </button>
                    </div>
                </div>

                <div class="single-stat-container">
                    <div class="card-stat">
                        <span class="stat-icon">🏆</span>
                        <div class="stat-info">
                            <span class="val">#{{ selectedRank }}</span>
                            <span class="lbl">RANK</span>
                        </div>
                    </div>
                </div>

                <div class="section-box hardest-box" v-if="selectedPlayer.hardest || (selectedPlayer.records && selectedPlayer.records.length)">
                    <div class="box-title red-title">
                        🔥 Hardest level
                    </div>
                    <div class="hardest-name">
                        {{ selectedPlayer.hardest || getHardestName(selectedPlayer) }}
                    </div>
                </div>

                <div class="section-box" v-if="mainLevelsList.length || isAdmin">
                    <div class="box-header">
                        <div class="box-title red-title">
                            ★ Main levels
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge-count">{{ mainLevelsList.length }}</span>
                            <button v-if="isAdmin" @click="openAddRecordModal" style="background: #22c55e; color: #fff; border: none; padding: 2px 8px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">
                                + Добавить
                            </button>
                        </div>
                    </div>
                    <div class="pills-flex">
                        <div 
                            v-for="(item, idx) in mainLevelsList" 
                            :key="idx" 
                            class="pill-btn"
                            :draggable="isAdmin"
                            @dragstart="onRecordDragStart($event, item.originalIndex)"
                            @dragover.prevent
                            @drop="onRecordDrop($event, item.originalIndex)"
                            style="display: inline-flex; align-items: center; gap: 6px;"
                        >
                            <span>{{ item.title }}</span>
                            <button v-if="isAdmin" @click.stop="deleteRecord(item.originalIndex)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0;">×</button>
                        </div>
                    </div>
                </div>

                <div class="section-box" v-if="progressesList.length">
                    <div class="box-header">
                        <div class="box-title blue-title">
                            📊 Progresses
                        </div>
                        <span class="badge-count">{{ progressesList.length }}</span>
                    </div>
                    <div class="pills-flex">
                        <div 
                            v-for="(prog, idx) in progressesList" 
                            :key="idx" 
                            class="pill-btn progress-pill"
                            :draggable="isAdmin"
                            @dragstart="onRecordDragStart($event, prog.originalIndex)"
                            @dragover.prevent
                            @drop="onRecordDrop($event, prog.originalIndex)"
                        >
                            {{ prog.item.levelName || prog.item.level || prog.item }} <span v-if="prog.item.percent" class="blue-text">({{ prog.item.percent }}%)</span>
                            <button v-if="isAdmin" @click.stop="deleteRecord(prog.originalIndex)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0; margin-left: 4px;">×</button>
                        </div>
                    </div>
                </div>

                <div class="section-box verified-box" v-if="verifiedLevelsList.length || isAdmin">
                    <div class="box-header">
                        <div class="box-title green-title">
                            <span class="check-circle">✓</span> Which are verified
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge-count green-badge">{{ verifiedLevelsList.length }}</span>
                            <button v-if="isAdmin" @click="openAddVerifyModal" style="background: #10b981; color: #fff; border: none; padding: 2px 8px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">
                                + Добавить
                            </button>
                        </div>
                    </div>
                    <div class="pills-flex">
                        <div 
                            v-for="(ver, idx) in verifiedLevelsList" 
                            :key="idx" 
                            class="pill-btn verified-pill"
                            :draggable="isAdmin"
                            @dragstart="onVerifyDragStart($event, idx)"
                            @dragover.prevent
                            @drop="onVerifyDrop($event, idx)"
                            style="display: inline-flex; align-items: center; gap: 6px;"
                        >
                            <span>{{ ver.title }}</span>
                            <button v-if="isAdmin" @click.stop="deleteVerify(idx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0;">×</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ПРАВАЯ КОЛОНКА: ТОП ИГРОКОВ -->
            <div class="sidebar-list">
                <div 
                    v-for="(player, index) in filteredPlayers" 
                    :key="player.user || player.name || index"
                    class="sidebar-item"
                    :class="{ 'active': (selectedPlayer?.user || selectedPlayer?.name) === (player.user || player.name) }"
                    @click="selectedPlayer = player"
                    :draggable="isAdmin && !searchQuery"
                    @dragstart="onPlayerDragStart($event, index)"
                    @dragover.prevent
                    @drop="onPlayerDrop($event, index)"
                >
                    <span class="rank-num">#{{ index + 1 }}</span>
                    
                    <div class="user-block">
                        <img 
                            :src="getAvatarUrl(player)" 
                            class="list-avatar" 
                            @error="onAvatarError"
                        />
                        <img 
                            v-if="getPlayerFlag(player)" 
                            :src="getPlayerFlag(player)" 
                            class="list-flag-img" 
                            @error="onFlagError"
                        />
                        <span class="username">{{ player.user || player.name }}</span>
                    </div>
                </div>
            </div>

            <!-- МОДАЛКА: ИГРОК -->
            <div v-if="showPlayerModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showPlayerModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; color: #fff;">
                    <h3 style="margin-bottom: 15px;">{{ isEditing ? 'Редактировать игрока' : 'Добавить игрока' }}</h3>

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Никнейм игрока:*</label>
                    <input type="text" v-model="playerForm.name" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" placeholder="NaR1" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Код страны (например: ua, ru, us):</label>
                    <input type="text" v-model="playerForm.country" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" placeholder="ua" maxlength="2" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">URL Аватарки:</label>
                    <input type="text" v-model="playerForm.avatar" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" placeholder="https://..." />

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button @click="savePlayer" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Сохранить</button>
                        <button @click="showPlayerModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- МОДАЛКА: МНОЖЕСТВЕННЫЙ ВЫБОР РЕКОРДОВ -->
            <div v-if="showRecordModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showRecordModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 20px; border-radius: 12px; width: 100%; max-width: 520px; max-height: 85vh; display: flex; flex-direction: column; color: #fff;">
                    <h3 style="margin-bottom: 10px;">Добавить демоны в профиль</h3>

                    <div style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center;">
                        <div style="flex: 1;">
                            <label style="font-size:11px; color:#94a3b8; display:block;">Процент (100 = пройден):</label>
                            <input type="number" v-model.number="recordPercent" min="1" max="100" style="width:100%; padding:6px 10px; margin-top:2px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" />
                        </div>
                        <div style="flex: 2;">
                            <label style="font-size:11px; color:#94a3b8; display:block;">Фильтр по названию:</label>
                            <input type="text" v-model="levelSearch" placeholder="Поиск демона..." style="width:100%; padding:6px 10px; margin-top:2px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" />
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #0f172a; padding: 8px 12px; border-radius: 6px; border: 1px solid #1e293b;">
                        <span style="font-size: 12px; color: #22c55e; font-weight: bold;">
                            Выбрано: {{ selectedLevels.length }} из {{ demonList.length }}
                        </span>
                        <div style="display: flex; gap: 6px;">
                            <button @click="selectAllFiltered" style="background: #334155; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Выбрать всё</button>
                            <button @click="deselectAll" style="background: #334155; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Сброс</button>
                        </div>
                    </div>

                    <div style="flex: 1; overflow-y: auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 4px;">
                        <label 
                            v-for="lvl in filteredDemonList" 
                            :key="lvl"
                            style="padding: 8px 12px; border-bottom: 1px solid #1e293b; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;"
                            :style="{ background: selectedLevels.includes(lvl) ? 'rgba(34, 197, 94, 0.15)' : 'transparent' }"
                        >
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input 
                                    type="checkbox" 
                                    :value="lvl" 
                                    v-model="selectedLevels"
                                    style="width: 16px; height: 16px; accent-color: #22c55e; cursor: pointer;"
                                />
                                <span :style="{ fontWeight: selectedLevels.includes(lvl) ? 'bold' : 'normal', color: selectedLevels.includes(lvl) ? '#fff' : '#cbd5e1' }">
                                    {{ lvl }}
                                </span>
                            </div>
                            <span v-if="isLevelAlreadyInProfile(lvl)" style="font-size: 10px; background: #334155; color: #94a3b8; padding: 2px 6px; border-radius: 4px;">
                                Уже добавлен
                            </span>
                        </label>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button @click="saveSelectedRecords" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">
                            Добавить выбранные ({{ selectedLevels.length }})
                        </button>
                        <button @click="showRecordModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- МОДАЛКА: МНОЖЕСТВЕННЫЙ ВЫБОР ВЕРИФИКАЦИЙ -->
            <div v-if="showVerifyModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showVerifyModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 20px; border-radius: 12px; width: 100%; max-width: 520px; max-height: 85vh; display: flex; flex-direction: column; color: #fff;">
                    <h3 style="margin-bottom: 10px;">Добавить верификации</h3>

                    <input type="text" v-model="levelSearch" placeholder="Поиск демона..." style="width:100%; padding:8px 12px; margin-bottom:10px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" />

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #0f172a; padding: 8px 12px; border-radius: 6px; border: 1px solid #1e293b;">
                        <span style="font-size: 12px; color: #10b981; font-weight: bold;">
                            Выбрано: {{ selectedLevels.length }} шт.
                        </span>
                        <div style="display: flex; gap: 6px;">
                            <button @click="selectAllFiltered" style="background: #334155; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Выбрать всё</button>
                            <button @click="deselectAll" style="background: #334155; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Сброс</button>
                        </div>
                    </div>

                    <div style="flex: 1; overflow-y: auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 4px;">
                        <label 
                            v-for="lvl in filteredDemonList" 
                            :key="lvl"
                            style="padding: 8px 12px; border-bottom: 1px solid #1e293b; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;"
                            :style="{ background: selectedLevels.includes(lvl) ? 'rgba(16, 185, 129, 0.15)' : 'transparent' }"
                        >
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input 
                                    type="checkbox" 
                                    :value="lvl" 
                                    v-model="selectedLevels"
                                    style="width: 16px; height: 16px; accent-color: #10b981; cursor: pointer;"
                                />
                                <span :style="{ fontWeight: selectedLevels.includes(lvl) ? 'bold' : 'normal', color: selectedLevels.includes(lvl) ? '#fff' : '#cbd5e1' }">
                                    {{ lvl }}
                                </span>
                            </div>
                        </label>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button @click="saveSelectedVerifies" style="flex:1; padding:10px; background:#10b981; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">
                            Добавить выбранные ({{ selectedLevels.length }})
                        </button>
                        <button @click="showVerifyModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    data: () => ({
        leaderboard: [],
        demonList: [],
        loading: true,
        selectedPlayer: null,
        searchQuery: '',
        levelSearch: '',
        selectedLevels: [],
        recordPercent: 100,

        draggedPlayerIndex: null,
        draggedRecordIndex: null,
        draggedVerifyIndex: null,
        fileSha: '',
        defaultAvatar: 'https://i.imgur.com/6VBx3io.png',
        isAdmin: sessionStorage.getItem('is_admin') === 'true',

        showPlayerModal: false,
        isEditing: false,
        playerForm: { name: '', country: '', avatar: '' },

        showRecordModal: false,
        showVerifyModal: false
    }),

    computed: {
        filteredPlayers() {
            if (!this.searchQuery) return this.leaderboard;
            const q = this.searchQuery.toLowerCase();
            return this.leaderboard.filter(p => {
                const name = p.user || p.name || '';
                return name.toLowerCase().includes(q);
            });
        },
        filteredDemonList() {
            if (!this.levelSearch) return this.demonList;
            const q = this.levelSearch.toLowerCase();
            return this.demonList.filter(name => name.toLowerCase().includes(q));
        },
        selectedRank() {
            if (!this.selectedPlayer || !this.leaderboard.length) return '-';
            const selName = this.selectedPlayer.user || this.selectedPlayer.name;
            const index = this.leaderboard.findIndex(p => (p.user || p.name) === selName);
            return index !== -1 ? index + 1 : '-';
        },
        mainLevelsList() {
            if (!this.selectedPlayer || !this.selectedPlayer.records) return [];
            return this.selectedPlayer.records
                .map((r, idx) => ({ item: r, originalIndex: idx }))
                .filter(entry => typeof entry.item === 'string' || !entry.item.percent || entry.item.percent === 100)
                .map(entry => ({
                    title: typeof entry.item === 'string' ? entry.item : (entry.item.levelName || entry.item.level),
                    originalIndex: entry.originalIndex
                }));
        },
        progressesList() {
            if (!this.selectedPlayer || !this.selectedPlayer.records) return [];
            return this.selectedPlayer.records
                .map((r, idx) => ({ item: r, originalIndex: idx }))
                .filter(entry => typeof entry.item === 'object' && entry.item.percent && entry.item.percent < 100);
        },
        verifiedLevelsList() {
            if (!this.selectedPlayer) return [];
            const list = this.selectedPlayer.verified || this.selectedPlayer.verifies || [];
            return list.map((v, idx) => ({
                title: typeof v === 'string' ? v : (v.levelName || v.level),
                originalIndex: idx
            }));
        }
    },

    async mounted() {
        window.addEventListener('admin-state-changed', this.updateAdminState);
        await Promise.all([this.loadLeaderboardData(), this.loadDemonList()]);
    },

    unmounted() {
        window.removeEventListener('admin-state-changed', this.updateAdminState);
    },

    methods: {
        updateAdminState() {
            this.isAdmin = sessionStorage.getItem('is_admin') === 'true';
        },

        async loadLeaderboardData() {
            try {
                const cacheBuster = `?_t=${Date.now()}`;
                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_LEADERBOARD_PATH}${cacheBuster}`, {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                });

                if (res.ok) {
                    const data = await res.json();
                    this.fileSha = data.sha;
                    const decoded = base64ToUtf8(data.content);
                    this.leaderboard = JSON.parse(decoded);
                } else {
                    this.leaderboard = [];
                }

                if (this.leaderboard.length > 0) {
                    this.selectedPlayer = this.leaderboard[0];
                }
            } catch (err) {
                console.error("Error loading leaderboard:", err);
            } finally {
                this.loading = false;
            }
        },

        async loadDemonList() {
            try {
                const res = await fetch(`data/_list.json?_t=${Date.now()}`);
                if (res.ok) {
                    const listData = await res.json();
                    this.demonList = listData.map(item => typeof item === 'string' ? item : (item.name || item.title || item.levelName)).filter(Boolean);
                }
            } catch (err) {
                console.error("Error loading demon list:", err);
            }
        },

        getHardestName(player) {
            if (!player || !player.records || !player.records.length) return '';
            const rec = player.records[0];
            return typeof rec === 'string' ? rec : (rec.levelName || rec.level || '');
        },

        getPlayerFlag(player) {
            if (!player) return null;
            let raw = player.country || player.nationality || player.nation;

            if (!raw && Array.isArray(player.records)) {
                for (const rec of player.records) {
                    if (rec && typeof rec === 'object' && (rec.country || rec.nationality || rec.nation)) {
                        raw = rec.country || rec.nationality || rec.nation;
                        break;
                    }
                }
            }

            if (!raw) return null;
            let code = String(raw).trim().toLowerCase();

            if (code.startsWith('http') || code.startsWith('/')) {
                return raw;
            }

            return `https://flagcdn.com/w40/${code.slice(0, 2)}.png`;
        },

        getAvatarUrl(player) {
            if (player?.avatar) return player.avatar;
            if (player?.icon) return player.icon;
            const uname = player?.user || player?.name || 'ghost';
            return `https://github.com/${uname}.png`;
        },

        onAvatarError(e) {
            e.target.src = this.defaultAvatar;
        },

        onFlagError(e) {
            e.target.style.display = 'none';
        },

        isLevelAlreadyInProfile(levelName) {
            if (!this.selectedPlayer || !this.selectedPlayer.records) return false;
            return this.selectedPlayer.records.some(r => {
                const name = typeof r === 'string' ? r : (r.levelName || r.level);
                return name === levelName;
            });
        },

        selectAllFiltered() {
            this.filteredDemonList.forEach(lvl => {
                if (!this.selectedLevels.includes(lvl)) {
                    this.selectedLevels.push(lvl);
                }
            });
        },

        deselectAll() {
            this.selectedLevels = [];
        },

        openAddRecordModal() {
            this.selectedLevels = [];
            this.levelSearch = '';
            this.recordPercent = 100;
            this.showRecordModal = true;
        },

        async saveSelectedRecords() {
            if (!this.selectedLevels.length) return alert("Выберите хотя бы один уровень!");
            if (!this.selectedPlayer.records) this.selectedPlayer.records = [];

            this.selectedLevels.forEach(lvl => {
                if (this.recordPercent < 100) {
                    this.selectedPlayer.records.push({
                        levelName: lvl,
                        percent: this.recordPercent
                    });
                } else {
                    this.selectedPlayer.records.push(lvl);
                }
            });

            this.showRecordModal = false;
            await this.saveToGitHub();
        },

        openAddVerifyModal() {
            this.selectedLevels = [];
            this.levelSearch = '';
            this.showVerifyModal = true;
        },

        async saveSelectedVerifies() {
            if (!this.selectedLevels.length) return alert("Выберите хотя бы один уровень!");
            const targetArray = this.selectedPlayer.verified ? this.selectedPlayer.verified : (this.selectedPlayer.verifies || (this.selectedPlayer.verified = []));

            this.selectedLevels.forEach(lvl => {
                targetArray.push(lvl);
            });

            this.showVerifyModal = false;
            await this.saveToGitHub();
        },

        onRecordDragStart(event, originalIndex) {
            if (!this.isAdmin) return;
            this.draggedRecordIndex = originalIndex;
            event.dataTransfer.effectAllowed = 'move';
        },

        async onRecordDrop(event, targetIndex) {
            if (!this.isAdmin || this.draggedRecordIndex === null || this.draggedRecordIndex === targetIndex) return;

            const records = this.selectedPlayer.records;
            const movedItem = records.splice(this.draggedRecordIndex, 1)[0];
            records.splice(targetIndex, 0, movedItem);

            this.draggedRecordIndex = null;
            await this.saveToGitHub();
        },

        onVerifyDragStart(event, index) {
            if (!this.isAdmin) return;
            this.draggedVerifyIndex = index;
            event.dataTransfer.effectAllowed = 'move';
        },

        async onVerifyDrop(event, targetIndex) {
            if (!this.isAdmin || this.draggedVerifyIndex === null || this.draggedVerifyIndex === targetIndex) return;

            const list = this.selectedPlayer.verified || this.selectedPlayer.verifies;
            if (list) {
                const movedItem = list.splice(this.draggedVerifyIndex, 1)[0];
                list.splice(targetIndex, 0, movedItem);
                this.draggedVerifyIndex = null;
                await this.saveToGitHub();
            }
        },

        onPlayerDragStart(event, filteredIndex) {
            if (!this.isAdmin || this.searchQuery) return;
            this.draggedPlayerIndex = filteredIndex;
            event.dataTransfer.effectAllowed = 'move';
        },

        async onPlayerDrop(event, targetIndex) {
            if (!this.isAdmin || this.searchQuery || this.draggedPlayerIndex === null || this.draggedPlayerIndex === targetIndex) return;

            const movedItem = this.leaderboard.splice(this.draggedPlayerIndex, 1)[0];
            this.leaderboard.splice(targetIndex, 0, movedItem);

            this.draggedPlayerIndex = null;
            await this.saveToGitHub();
        },

        openAddPlayerModal() {
            this.isEditing = false;
            this.playerForm = { name: '', country: '', avatar: '' };
            this.showPlayerModal = true;
        },

        openEditPlayerModal(player) {
            this.isEditing = true;
            this.playerForm = {
                name: player.user || player.name || '',
                country: player.country || player.nationality || '',
                avatar: player.avatar || ''
            };
            this.showPlayerModal = true;
        },

        async savePlayer() {
            if (!this.playerForm.name) return alert("Введите имя игрока!");

            if (this.isEditing) {
                if (this.selectedPlayer.user !== undefined) this.selectedPlayer.user = this.playerForm.name;
                this.selectedPlayer.name = this.playerForm.name;
                this.selectedPlayer.country = this.playerForm.country.toLowerCase().trim();
                this.selectedPlayer.avatar = this.playerForm.avatar.trim();
            } else {
                const newPlayer = {
                    user: this.playerForm.name,
                    name: this.playerForm.name,
                    country: this.playerForm.country.toLowerCase().trim(),
                    avatar: this.playerForm.avatar.trim(),
                    records: [],
                    verified: []
                };
                this.leaderboard.push(newPlayer);
                this.selectedPlayer = newPlayer;
            }

            this.showPlayerModal = false;
            await this.saveToGitHub();
        },

        async deletePlayer(player) {
            const pName = player.user || player.name;
            if (confirm(`Удалить игрока "${pName}"?`)) {
                const idx = this.leaderboard.findIndex(p => (p.user || p.name) === pName);
                if (idx !== -1) {
                    this.leaderboard.splice(idx, 1);
                    this.selectedPlayer = this.leaderboard.length > 0 ? this.leaderboard[0] : null;
                    await this.saveToGitHub();
                }
            }
        },

        async deleteRecord(index) {
            if (confirm("Удалить этот уровень/прохождение?")) {
                this.selectedPlayer.records.splice(index, 1);
                await this.saveToGitHub();
            }
        },

        async deleteVerify(index) {
            if (confirm("Удалить эту верификацию?")) {
                const targetArray = this.selectedPlayer.verified || this.selectedPlayer.verifies;
                if (targetArray) targetArray.splice(index, 1);
                await this.saveToGitHub();
            }
        },

        async saveToGitHub() {
            let token = localStorage.getItem("my_gh_token") || "";
            if (!token) {
                token = prompt("Введите ваш GitHub Token:");
                if (token) {
                    token = token.trim();
                    localStorage.setItem("my_gh_token", token);
                } else {
                    return alert("Без токена нельзя сохранить изменения!");
                }
            }

            try {
                const getFileRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_LEADERBOARD_PATH}?_t=${Date.now()}`, {
                    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
                });
                if (getFileRes.ok) {
                    const fileData = await getFileRes.json();
                    this.fileSha = fileData.sha;
                }

                const jsonString = JSON.stringify(this.leaderboard, null, 4);
                const contentEncoded = utf8ToBase64(jsonString);

                const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_LEADERBOARD_PATH}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: 'Update Leaderboard via Admin Panel',
                        content: contentEncoded,
                        sha: this.fileSha,
                        branch: GITHUB_BRANCH
                    })
                });

                if (response.ok) {
                    const resData = await response.json();
                    this.fileSha = resData.content.sha;
                } else {
                    const errData = await response.json();
                    alert(`Ошибка GitHub (${response.status}): ${errData.message || 'Проверьте токен'}`);
                }
            } catch (err) {
                alert("Ошибка сохранения: " + err.message);
            }
        }
    }
};
