import Spinner from "../components/Spinner.js";

const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";
const GITHUB_FILE_PATH = "data/_leaderboard.json";

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
        <div class="gdl-wrapper">
            <Spinner v-if="loading" />

            <template v-else>
                <!-- 1. ПОИСКОВКА -->
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
                    
                    <!-- ЛЕВАЯ КОЛОНКА (Инфо) -->
                    <div class="gdl-left-column">
                        <div class="gdl-meta-box">
                            <h3>Зал Славы</h3>
                            <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
                                Список сильнейших игроков и их подтвержденные прохождения с верификациями.
                            </p>
                        </div>
                    </div>

                    <!-- ЦЕНТРАЛЬНАЯ КОЛОНКА (Список игроков) -->
                    <div class="gdl-cards-container">
                        <div v-if="isAdmin" style="margin-bottom: 10px;">
                            <button @click="openAddPlayerModal" style="width: 100%; padding: 10px; background: #22c55e; color: #fff; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">
                                + Добавить игрока
                            </button>
                        </div>

                        <div 
                            v-for="(player, index) in filteredPlayers" 
                            :key="player.name + index"
                            class="gdl-level-card"
                            :class="{ active: selectedPlayer && selectedPlayer.name === player.name }"
                            @click="selectedPlayer = player"
                            :draggable="isAdmin && !searchQuery"
                            @dragstart="onDragStart($event, index)"
                            @dragover.prevent
                            @drop="onDrop($event, index)"
                        >
                            <!-- Аватарка по URL -->
                            <div class="gdl-card-thumb" style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; min-width: 50px;">
                                <img 
                                    :src="player.avatar || 'https://i.imgur.com/6VBx3io.png'" 
                                    alt="avatar"
                                    style="width: 100%; height: 100%; object-fit: cover;"
                                    @error="onAvatarError"
                                />
                            </div>

                            <div class="gdl-card-info" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                                <div>
                                    <div class="card-header" style="display: flex; align-items: center; gap: 8px;">
                                        <span class="rank-number">#{{ player.rank }}</span>
                                        
                                        <!-- Флаг страны -->
                                        <img 
                                            v-if="player.country" 
                                            :src="'https://flagcdn.com/24x18/' + player.country.toLowerCase() + '.png'" 
                                            :alt="player.country"
                                            style="width: 20px; height: 15px; border-radius: 2px;"
                                            :title="player.country.toUpperCase()"
                                        />

                                        <h4 class="level-title" style="margin: 0;">{{ player.name }}</h4>
                                    </div>
                                    <div class="card-authors" style="font-size: 12px; color: #64748b; margin-top: 4px;">
                                        Прохождений: {{ player.records ? player.records.length : 0 }} | Верификаций: {{ player.verifies ? player.verifies.length : 0 }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ПРАВАЯ КОЛОНКА (Профиль и достижения игрока) -->
                    <div class="gdl-details-container" v-if="selectedPlayer">
                        <div class="gdl-level-detail-box">
                            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                                <img 
                                    :src="selectedPlayer.avatar || 'https://i.imgur.com/6VBx3io.png'" 
                                    style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #3b82f6;"
                                    @error="onAvatarError"
                                />
                                <div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <h2 class="detail-title" style="margin: 0;">#{{ selectedPlayer.rank }} - {{ selectedPlayer.name }}</h2>
                                        <img 
                                            v-if="selectedPlayer.country" 
                                            :src="'https://flagcdn.com/32x24/' + selectedPlayer.country.toLowerCase() + '.png'" 
                                            style="width: 24px; height: 18px; border-radius: 2px;"
                                        />
                                    </div>
                                    <span style="font-size: 13px; color: #94a3b8;">Cтрана: {{ selectedPlayer.country ? selectedPlayer.country.toUpperCase() : 'Не указана' }}</span>
                                </div>
                            </div>

                            <!-- Кнопки админа -->
                            <div v-if="isAdmin" style="margin-bottom: 15px; display: flex; gap: 8px;">
                                <button @click="openEditPlayerModal(selectedPlayer)" style="flex: 2; background: #3b82f6; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 800; cursor: pointer;">
                                    ✏️ Редактировать игрока
                                </button>
                                <button @click="deletePlayer(selectedPlayer)" style="flex: 1; background: #ef4444; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 800; cursor: pointer;">
                                    🗑️ Удалить
                                </button>
                            </div>

                            <!-- ВЕРИФИКАЦИИ -->
                            <div class="records-section" style="margin-bottom: 20px;">
                                <div class="records-header" style="justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span class="records-trophy">👑</span>
                                        <h3 class="section-subtitle">Верификации ({{ selectedPlayer.verifies ? selectedPlayer.verifies.length : 0 }})</h3>
                                    </div>
                                    <button v-if="isAdmin" @click="openAddVerifyModal" style="background: #22c55e; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 12px;">
                                        + Верификацию
                                    </button>
                                </div>

                                <div class="records-list" v-if="selectedPlayer.verifies && selectedPlayer.verifies.length > 0">
                                    <div v-for="(v, vIdx) in selectedPlayer.verifies" :key="vIdx" class="record-card">
                                        <div class="record-user-info">
                                            <span class="user-name">{{ v.level }}</span>
                                        </div>
                                        <div class="record-meta-info">
                                            <a v-if="v.link" :href="v.link" target="_blank" class="record-video-btn">▶</a>
                                            <button v-if="isAdmin" @click="deleteVerify(vIdx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; margin-left: 6px;">×</button>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="no-records">Нет верифицированных уровней.</div>
                            </div>

                            <!-- ПРОХОЖДЕНИЯ (РЕКОРДЫ) -->
                            <div class="records-section">
                                <div class="records-header" style="justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span class="records-trophy">🏆</span>
                                        <h3 class="section-subtitle">Прохождения ({{ selectedPlayer.records ? selectedPlayer.records.length : 0 }})</h3>
                                    </div>
                                    <button v-if="isAdmin" @click="openAddRecordModal" style="background: #22c55e; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 12px;">
                                        + Прохождение
                                    </button>
                                </div>

                                <div class="records-list" v-if="selectedPlayer.records && selectedPlayer.records.length > 0">
                                    <div v-for="(rec, rIdx) in selectedPlayer.records" :key="rIdx" class="record-card">
                                        <div class="record-user-info">
                                            <span class="user-name">{{ rec.level }}</span>
                                        </div>
                                        <div class="record-meta-info">
                                            <span class="percent-tag">{{ rec.percent }}%</span>
                                            <a v-if="rec.link" :href="rec.link" target="_blank" class="record-video-btn">▶</a>
                                            <button v-if="isAdmin" @click="deleteRecord(rIdx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; margin-left: 6px;">×</button>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="no-records">Нет подтвержденных прохождений.</div>
                            </div>

                        </div>
                    </div>

                </div>
            </template>

            <!-- МОДАЛКА: Игрок (Добавить / Изменить) -->
            <div v-if="showPlayerModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showPlayerModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; color: #fff;">
                    <h3 style="margin-bottom: 15px;">{{ isEditing ? 'Редактировать игрока' : 'Добавить игрока' }}</h3>

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Никнейм игрока:*</label>
                    <input type="text" v-model="playerForm.name" class="gdl-input" placeholder="Zoink" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Код страны (например: ru, ua, us, kz):</label>
                    <input type="text" v-model="playerForm.country" class="gdl-input" placeholder="ru" maxlength="2" style="margin-top:4px; text-transform: lowercase;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">URL Аватарки (Ссылка на картинку):</label>
                    <input type="text" v-model="playerForm.avatar" class="gdl-input" placeholder="https://i.imgur.com/..." style="margin-top:4px;" />

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button @click="savePlayer" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Сохранить</button>
                        <button @click="showPlayerModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- МОДАЛКА: Добавить Прохождение -->
            <div v-if="showRecordModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showRecordModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; color: #fff;">
                    <h3 style="margin-bottom: 15px;">Добавить прохождение</h3>

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Название уровня:*</label>
                    <input type="text" v-model="recordForm.level" class="gdl-input" placeholder="Tidal Wave" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Процент:*</label>
                    <input type="number" v-model.number="recordForm.percent" min="1" max="100" class="gdl-input" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Ссылка на видео:</label>
                    <input type="text" v-model="recordForm.link" class="gdl-input" placeholder="https://youtube.com/..." style="margin-top:4px;" />

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button @click="saveRecord" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Сохранить</button>
                        <button @click="showRecordModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- МОДАЛКА: Добавить Верификацию -->
            <div v-if="showVerifyModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showVerifyModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; color: #fff;">
                    <h3 style="margin-bottom: 15px;">Добавить верификацию</h3>

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Название уровня:*</label>
                    <input type="text" v-model="verifyForm.level" class="gdl-input" placeholder="Acheron" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Ссылка на видео:</label>
                    <input type="text" v-model="verifyForm.link" class="gdl-input" placeholder="https://youtube.com/..." style="margin-top:4px;" />

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button @click="saveVerify" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Сохранить</button>
                        <button @click="showVerifyModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    data: () => ({
        players: [],
        loading: true,
        selectedPlayer: null,
        searchQuery: '',
        draggedIndex: null,
        fileSha: '',
        isAdmin: sessionStorage.getItem('is_admin') === 'true',

        showPlayerModal: false,
        isEditing: false,
        playerForm: { name: '', country: '', avatar: '' },

        showRecordModal: false,
        recordForm: { level: '', percent: 100, link: '' },

        showVerifyModal: false,
        verifyForm: { level: '', link: '' }
    }),

    computed: {
        filteredPlayers() {
            if (!this.searchQuery) return this.players;
            const q = this.searchQuery.toLowerCase();
            return this.players.filter(p => p.name && p.name.toLowerCase().includes(q));
        }
    },

    async mounted() {
        window.addEventListener('admin-state-changed', this.updateAdminState);
        await this.loadLeaderboardData();
    },

    unmounted() {
        window.removeEventListener('admin-state-changed', this.updateAdminState);
    },

    methods: {
        updateAdminState() {
            this.isAdmin = sessionStorage.getItem('is_admin') === 'true';
        },

        onAvatarError(event) {
            event.target.src = 'https://i.imgur.com/6VBx3io.png';
        },

        async loadLeaderboardData() {
            try {
                const cacheBuster = `?_t=${Date.now()}`;
                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}${cacheBuster}`, {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                });

                if (res.ok) {
                    const data = await res.json();
                    this.fileSha = data.sha;
                    const decoded = base64ToUtf8(data.content);
                    const parsed = JSON.parse(decoded);

                    this.players = parsed.map((p, idx) => ({
                        rank: idx + 1,
                        name: p.name || 'Unknown',
                        country: p.country || '',
                        avatar: p.avatar || '',
                        records: p.records || [],
                        verifies: p.verifies || []
                    }));
                } else {
                    this.players = [];
                }

                if (this.players.length > 0) {
                    this.selectedPlayer = this.players[0];
                }
            } catch (err) {
                console.error("Leaderboard load error:", err);
            } finally {
                this.loading = false;
            }
        },

        openAddPlayerModal() {
            this.isEditing = false;
            this.playerForm = { name: '', country: '', avatar: '' };
            this.showPlayerModal = true;
        },

        openEditPlayerModal(player) {
            this.isEditing = true;
            this.playerForm = {
                name: player.name || '',
                country: player.country || '',
                avatar: player.avatar || ''
            };
            this.showPlayerModal = true;
        },

        async savePlayer() {
            if (!this.playerForm.name) return alert("Введите имя игрока!");

            if (this.isEditing) {
                this.selectedPlayer.name = this.playerForm.name;
                this.selectedPlayer.country = this.playerForm.country.toLowerCase().trim();
                this.selectedPlayer.avatar = this.playerForm.avatar.trim();
            } else {
                const newPlayer = {
                    rank: this.players.length + 1,
                    name: this.playerForm.name,
                    country: this.playerForm.country.toLowerCase().trim(),
                    avatar: this.playerForm.avatar.trim(),
                    records: [],
                    verifies: []
                };
                this.players.push(newPlayer);
                this.selectedPlayer = newPlayer;
            }

            this.showPlayerModal = false;
            await this.saveToGitHub();
        },

        async deletePlayer(player) {
            if (confirm(`Удалить игрока "${player.name}"?`)) {
                const idx = this.players.findIndex(p => p.name === player.name);
                if (idx !== -1) {
                    this.players.splice(idx, 1);
                    this.players.forEach((p, i) => p.rank = i + 1);
                    this.selectedPlayer = this.players.length > 0 ? this.players[0] : null;
                    await this.saveToGitHub();
                }
            }
        },

        // --- ДРАГ И ДРОП ИГРОКОВ ---
        onDragStart(event, filteredIndex) {
            if (!this.isAdmin || this.searchQuery) return;
            this.draggedIndex = filteredIndex;
            event.dataTransfer.effectAllowed = 'move';
        },

        async onDrop(event, targetIndex) {
            if (!this.isAdmin || this.searchQuery || this.draggedIndex === null || this.draggedIndex === targetIndex) return;

            const movedItem = this.players.splice(this.draggedIndex, 1)[0];
            this.players.splice(targetIndex, 0, movedItem);

            this.players.forEach((p, idx) => p.rank = idx + 1);

            this.draggedIndex = null;
            await this.saveToGitHub();
        },

        // --- ПРОХОЖДЕНИЯ ---
        openAddRecordModal() {
            this.recordForm = { level: '', percent: 100, link: '' };
            this.showRecordModal = true;
        },

        async saveRecord() {
            if (!this.recordForm.level) return alert("Введите название уровня!");
            if (!this.selectedPlayer.records) this.selectedPlayer.records = [];

            this.selectedPlayer.records.push({
                level: this.recordForm.level,
                percent: this.recordForm.percent || 100,
                link: this.recordForm.link || ''
            });

            this.showRecordModal = false;
            await this.saveToGitHub();
        },

        async deleteRecord(index) {
            if (confirm("Удалить это прохождение?")) {
                this.selectedPlayer.records.splice(index, 1);
                await this.saveToGitHub();
            }
        },

        // --- ВЕРИФИКАЦИИ ---
        openAddVerifyModal() {
            this.verifyForm = { level: '', link: '' };
            this.showVerifyModal = true;
        },

        async saveVerify() {
            if (!this.verifyForm.level) return alert("Введите название уровня!");
            if (!this.selectedPlayer.verifies) this.selectedPlayer.verifies = [];

            this.selectedPlayer.verifies.push({
                level: this.verifyForm.level,
                link: this.verifyForm.link || ''
            });

            this.showVerifyModal = false;
            await this.saveToGitHub();
        },

        async deleteVerify(index) {
            if (confirm("Удалить эту верификацию?")) {
                this.selectedPlayer.verifies.splice(index, 1);
                await this.saveToGitHub();
            }
        },

        // --- СОХРАНЕНИЕ НА GITHUB ---
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
                const getFileRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?_t=${Date.now()}`, {
                    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
                });
                if (getFileRes.ok) {
                    const fileData = await getFileRes.json();
                    this.fileSha = fileData.sha;
                }

                const cleanData = this.players.map(p => ({
                    name: p.name,
                    country: p.country || '',
                    avatar: p.avatar || '',
                    records: p.records || [],
                    verifies: p.verifies || []
                }));

                const jsonString = JSON.stringify(cleanData, null, 4);
                const contentEncoded = utf8ToBase64(jsonString);

                const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
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
                    alert("Лидерборд успешно сохранен на GitHub!");
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
