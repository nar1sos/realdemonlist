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

        <div v-else class="leaderboard-container" style="padding: 20px;">
            <!-- Панель управления админа -->
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
                <!-- Аватарка и Ник -->
                <div class="profile-header">
                    <div class="avatar-ring">
                        <img :src="getAvatarUrl(selectedPlayer)" class="profile-avatar" @error="onAvatarError" />
                    </div>
                    <div class="profile-title">
                        <img v-if="getPlayerFlag(selectedPlayer)" :src="getPlayerFlag(selectedPlayer)" class="flag-img" @error="onFlagError" />
                        <h1>{{ selectedPlayer.user || selectedPlayer.name }}</h1>
                    </div>

                    <div v-if="isAdmin" style="margin-top: 10px; display: flex; gap: 8px;">
                        <button @click="openEditPlayerModal(selectedPlayer)" style="background: #3b82f6; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">✏️ Редактировать</button>
                        <button @click="deletePlayer(selectedPlayer)" style="background: #ef4444; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">🗑️ Удалить</button>
                    </div>
                </div>

                <!-- Rank -->
                <div class="single-stat-container">
                    <div class="card-stat">
                        <span class="stat-icon">🏆</span>
                        <div class="stat-info">
                            <span class="val">#{{ selectedRank }}</span>
                            <span class="lbl">RANK</span>
                        </div>
                    </div>
                </div>

                <!-- Hardest level -->
                <div class="section-box hardest-box" v-if="selectedPlayer.hardest || (selectedPlayer.records && selectedPlayer.records.length)">
                    <div class="box-title red-title">🔥 Hardest level</div>
                    <div class="hardest-name">{{ selectedPlayer.hardest || getHardestName(selectedPlayer) }}</div>
                </div>

                <!-- Main levels -->
                <div class="section-box" v-if="mainLevelsList.length || isAdmin">
                    <div class="box-header">
                        <div class="box-title red-title">★ Main levels</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge-count">{{ mainLevelsList.length }}</span>
                            <button v-if="isAdmin" @click="openAddRecordModal" style="background: #22c55e; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">
                                + Выбрать пачкой
                            </button>
                        </div>
                    </div>
                    <div class="pills-flex">
                        <div v-for="(item, idx) in mainLevelsList" :key="idx" class="pill-btn" style="display: inline-flex; align-items: center; gap: 6px;">
                            <span>{{ item.title }}</span>
                            <button v-if="isAdmin" @click.stop="deleteRecord(item.originalIndex)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0;">×</button>
                        </div>
                    </div>
                </div>

                <!-- Progresses -->
                <div class="section-box" v-if="progressesList.length">
                    <div class="box-header">
                        <div class="box-title blue-title">📊 Progresses</div>
                        <span class="badge-count">{{ progressesList.length }}</span>
                    </div>
                    <div class="pills-flex">
                        <div v-for="(prog, idx) in progressesList" :key="idx" class="pill-btn progress-pill">
                            {{ prog.item.levelName || prog.item.level || prog.item }} <span v-if="prog.item.percent" class="blue-text">({{ prog.item.percent }}%)</span>
                        </div>
                    </div>
                </div>

                <!-- Verified levels -->
                <div class="section-box verified-box" v-if="verifiedLevelsList.length || isAdmin">
                    <div class="box-header">
                        <div class="box-title green-title"><span class="check-circle">✓</span> Which are verified</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge-count green-badge">{{ verifiedLevelsList.length }}</span>
                            <button v-if="isAdmin" @click="openAddVerifyModal" style="background: #10b981; color: #fff; border: none; padding: 4px 10px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">
                                + Добавить верификации
                            </button>
                        </div>
                    </div>
                    <div class="pills-flex">
                        <div v-for="(ver, idx) in verifiedLevelsList" :key="idx" class="pill-btn verified-pill" style="display: inline-flex; align-items: center; gap: 6px;">
                            <span>{{ ver.title }}</span>
                            <button v-if="isAdmin" @click.stop="deleteVerify(idx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0;">×</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ПРАВАЯ КОЛОНКА: СПИСОК ИГРОКОВ -->
            <div class="sidebar-list">
                <div 
                    v-for="(player, index) in filteredPlayers" 
                    :key="player.user || player.name || index"
                    class="sidebar-item"
                    :class="{ 'active': (selectedPlayer?.user || selectedPlayer?.name) === (player.user || player.name) }"
                    @click="selectedPlayer = player"
                >
                    <span class="rank-num">#{{ index + 1 }}</span>
                    <div class="user-block">
                        <img :src="getAvatarUrl(player)" class="list-avatar" @error="onAvatarError" />
                        <img v-if="getPlayerFlag(player)" :src="getPlayerFlag(player)" class="list-flag-img" @error="onFlagError" />
                        <span class="username">{{ player.user || player.name }}</span>
                    </div>
                </div>
            </div>

            <!-- МОДАЛКА: МНОЖЕСТВЕННЫЙ (ПАЧКОЙ) ВЫБОР УРОВНЕЙ -->
            <div v-if="showRecordModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showRecordModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 20px; border-radius: 12px; width: 100%; max-width: 520px; max-height: 85vh; display: flex; flex-direction: column; color: #fff;">
                    
                    <h3 style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <span>Загрузить уровни пачкой</span>
                        <span style="font-size: 13px; color: #22c55e;">Выбрано: {{ selectedLevels.length }}</span>
                    </h3>

                    <!-- Поиск и фильтр -->
                    <div style="margin-bottom: 12px; display: flex; gap: 10px; align-items: center;">
                        <input 
                            type="text" 
                            v-model="levelSearch" 
                            placeholder="Поиск демонов по названию..." 
                            style="flex: 1; padding: 8px 12px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px;"
                        />
                        <div style="display: flex; flex-direction: column; align-items: flex-end;">
                            <label style="font-size: 10px; color: #94a3b8;">Процент:</label>
                            <input type="number" v-model.number="recordPercent" min="1" max="100" style="width: 70px; padding: 6px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px; text-align: center;" />
                        </div>
                    </div>

                    <!-- Панель быстрых действий -->
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                        <button @click="selectAllFiltered" style="background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0;">✓ Выбрать все отфильтрованные</button>
                        <button @click="selectedLevels = []" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0;">✕ Снять выделение</button>
                    </div>

                    <!-- Список всех демонов с чекбоксами -->
                    <div style="flex: 1; overflow-y: auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 4px;">
                        <div 
                            v-for="lvl in filteredDemonList" 
                            :key="lvl"
                            @click="toggleLevelSelection(lvl)"
                            style="padding: 10px 12px; border-bottom: 1px solid #1e293b; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none;"
                            :style="{ background: selectedLevels.includes(lvl) ? '#1e293b' : 'transparent' }"
                        >
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="checkbox" :checked="selectedLevels.includes(lvl)" @click.stop="toggleLevelSelection(lvl)" style="cursor: pointer;" />
                                <span>{{ lvl }}</span>
                            </div>
                            <span v-if="selectedLevels.includes(lvl)" style="color: #22c55e; font-weight: bold; font-size: 12px;">В ПАЧКЕ</span>
                        </div>
                    </div>

                    <!-- Кнопки отправки -->
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button 
                            @click="saveSelectedRecords" 
                            :disabled="!selectedLevels.length"
                            style="flex: 2; padding: 12px; background: #22c55e; color: #fff; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; opacity: 1;"
                            :style="{ opacity: selectedLevels.length ? 1 : 0.5, cursor: selectedLevels.length ? 'pointer' : 'not-allowed' }"
                        >
                            🚀 Добавить {{ selectedLevels.length }} демонов в профиль
                        </button>
                        <button @click="showRecordModal = false" style="flex: 1; padding: 12px; background: #475569; color: #fff; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">Отмена</button>
                    </div>

                </div>
            </div>

            <!-- МОДАЛКА: РЕДАКТИРОВАНИЕ ИГРОКА -->
            <div v-if="showPlayerModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showPlayerModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; color: #fff;">
                    <h3>{{ isEditing ? 'Редактировать игрока' : 'Добавить игрока' }}</h3>
                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Никнейм:*</label>
                    <input type="text" v-model="playerForm.name" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" />
                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Страна (код):</label>
                    <input type="text" v-model="playerForm.country" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" maxlength="2" />
                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Avatar URL:</label>
                    <input type="text" v-model="playerForm.avatar" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" />
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button @click="savePlayer" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Сохранить</button>
                        <button @click="showPlayerModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
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
            return this.leaderboard.filter(p => (p.user || p.name || '').toLowerCase().includes(q));
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
        await Promise.all([this.loadLeaderboardData(), this.loadDemonList()]);
    },

    methods: {
        async loadLeaderboardData() {
            try {
                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_LEADERBOARD_PATH}?_t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    this.fileSha = data.sha;
                    this.leaderboard = JSON.parse(base64ToUtf8(data.content));
                }
                if (this.leaderboard.length > 0) this.selectedPlayer = this.leaderboard[0];
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
            let code = player.country || player.nationality;
            if (!code) return null;
            return `https://flagcdn.com/w40/${code.toLowerCase().slice(0, 2)}.png`;
        },

        getAvatarUrl(player) {
            if (player?.avatar) return player.avatar;
            return `https://github.com/${player?.user || player?.name || 'ghost'}.png`;
        },

        onAvatarError(e) { e.target.src = this.defaultAvatar; },
        onFlagError(e) { e.target.style.display = 'none'; },

        // --- ВЫБОР ПАЧКОЙ ---
        openAddRecordModal() {
            this.selectedLevels = [];
            this.levelSearch = '';
            this.recordPercent = 100;
            this.showRecordModal = true;
        },

        toggleLevelSelection(levelName) {
            const idx = this.selectedLevels.indexOf(levelName);
            if (idx === -1) {
                this.selectedLevels.push(levelName);
            } else {
                this.selectedLevels.splice(idx, 1);
            }
        },

        selectAllFiltered() {
            this.filteredDemonList.forEach(lvl => {
                if (!this.selectedLevels.includes(lvl)) {
                    this.selectedLevels.push(lvl);
                }
            });
        },

        async saveSelectedRecords() {
            if (!this.selectedLevels.length) return;
            if (!this.selectedPlayer.records) this.selectedPlayer.records = [];

            // Избегаем дубликатов у игрока
            this.selectedLevels.forEach(lvl => {
                const isAlreadyAdded = this.selectedPlayer.records.some(r => (typeof r === 'string' ? r : r.levelName) === lvl);
                if (!isAlreadyAdded) {
                    if (this.recordPercent < 100) {
                        this.selectedPlayer.records.push({ levelName: lvl, percent: this.recordPercent });
                    } else {
                        this.selectedPlayer.records.push(lvl);
                    }
                }
            });

            this.showRecordModal = false;
            await this.saveToGitHub();
        },

        async deleteRecord(index) {
            if (confirm("Удалить этот уровень из профиля?")) {
                this.selectedPlayer.records.splice(index, 1);
                await this.saveToGitHub();
            }
        },

        // --- СОХРАНЕНИЕ НА GITHUB ---
        async saveToGitHub() {
            const token = sessionStorage.getItem('github_token');
            if (!token) {
                alert("Токен GitHub не найден!");
                return;
            }

            this.loading = true;
            try {
                const encodedContent = utf8ToBase64(JSON.stringify(this.leaderboard, null, 2));

                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_LEADERBOARD_PATH}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: "Bulk update records via admin panel",
                        content: encodedContent,
                        sha: this.fileSha,
                        branch: GITHUB_BRANCH
                    })
                });

                if (res.ok) {
                    const resData = await res.json();
                    this.fileSha = resData.content.sha;
                } else {
                    const errData = await res.json();
                    alert(`Ошибка сохранения: ${errData.message || res.statusText}`);
                }
            } catch (err) {
                console.error("Save error:", err);
                alert(" Ошибка сети при сохранении!");
            } finally {
                this.loading = false;
            }
        }
    }
};
