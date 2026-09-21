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
        <div class="gdl-wrapper" style="max-width: 1200px; margin: 0 auto; padding: 20px; color: #fff;">
            <Spinner v-if="loading" />

            <template v-else>
                <!-- Панель управления админа -->
                <div v-if="isAdmin" style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center;">
                    <button @click="openAddPlayerModal" style="padding: 10px 16px; background: #22c55e; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
                        + Добавить игрока
                    </button>
                    <input 
                        type="text" 
                        v-model="searchQuery" 
                        placeholder="Поиск игрока..." 
                        class="gdl-input"
                        style="max-width: 300px;"
                    />
                </div>

                <!-- Главная сетка: Детали слева, Список игроков справа -->
                <div style="display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start;">
                    
                    <!-- ЛЕВАЯ КОЛОНКА: Профиль выбранного игрока -->
                    <div v-if="selectedPlayer" style="background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                        
                        <!-- Шапка профиля (Аватар, Имя, Флаг) -->
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                            <img 
                                :src="selectedPlayer.avatar || 'https://i.imgur.com/6VBx3io.png'" 
                                style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid #3b82f6; margin-bottom: 12px;"
                                @error="onAvatarError"
                            />
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <img 
                                    v-if="selectedPlayer.country" 
                                    :src="'https://flagcdn.com/32x24/' + selectedPlayer.country.toLowerCase() + '.png'" 
                                    style="width: 28px; height: 20px; border-radius: 3px;"
                                />
                                <h1 style="margin: 0; font-size: 28px; font-weight: 800;">{{ selectedPlayer.name }}</h1>
                            </div>

                            <!-- Кнопки админа для игрока -->
                            <div v-if="isAdmin" style="margin-top: 12px; display: flex; gap: 8px;">
                                <button @click="openEditPlayerModal(selectedPlayer)" style="background: #3b82f6; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                                    ✏️ Редактировать
                                </button>
                                <button @click="deletePlayer(selectedPlayer)" style="background: #ef4444; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                                    🗑️ Удалить
                                </button>
                            </div>
                        </div>

                        <!-- Ранг игрока -->
                        <div style="background: #1e293b; border-radius: 12px; padding: 12px; text-align: center;">
                            <div style="font-size: 20px;">🏆</div>
                            <div style="font-size: 22px; font-weight: 800;">#{{ selectedPlayer.rank }}</div>
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">RANK</div>
                        </div>

                        <!-- Hardest level (Если есть хотя бы одно прохождение) -->
                        <div v-if="selectedPlayer.records && selectedPlayer.records.length > 0" style="background: #1e293b; border-radius: 12px; padding: 16px;">
                            <div style="color: #f59e0b; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                                🔥 Hardest level
                            </div>
                            <div style="font-size: 18px; font-weight: 800;">{{ selectedPlayer.records[0].level }}</div>
                        </div>

                        <!-- Main levels (Прохождения - теги) -->
                        <div style="background: #1e293b; border-radius: 12px; padding: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span style="color: #ef4444; font-size: 14px; font-weight: 700;">★ Main levels</span>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="background: #0f172a; padding: 2px 8px; border-radius: 12px; font-size: 12px; color: #94a3b8;">
                                        {{ selectedPlayer.records ? selectedPlayer.records.length : 0 }}
                                    </span>
                                    <button v-if="isAdmin" @click="openAddRecordModal" style="background: #22c55e; color: #fff; border: none; padding: 4px 8px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 11px;">
                                        + Добавить
                                    </button>
                                </div>
                            </div>

                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                <div 
                                    v-for="(rec, rIdx) in selectedPlayer.records" 
                                    :key="rIdx"
                                    style="background: #0f172a; border: 1px solid #334155; padding: 6px 12px; border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 6px;"
                                >
                                    <a v-if="rec.link" :href="rec.link" target="_blank" style="color: #fff; text-decoration: none;">
                                        {{ rec.level }} <span v-if="rec.percent < 100" style="color: #3b82f6;">({{ rec.percent }}%)</span>
                                    </a>
                                    <span v-else>{{ rec.level }} <span v-if="rec.percent < 100" style="color: #3b82f6;">({{ rec.percent }}%)</span></span>
                                    
                                    <button v-if="isAdmin" @click="deleteRecord(rIdx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0 0 0 4px;">×</button>
                                </div>
                                <div v-if="!selectedPlayer.records || selectedPlayer.records.length === 0" style="color: #64748b; font-size: 13px;">
                                    Нет прохождений
                                </div>
                            </div>
                        </div>

                        <!-- Which are verified (Верификации - зеленые теги) -->
                        <div style="background: #064e3b22; border: 1px solid #05966944; border-radius: 12px; padding: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span style="color: #10b981; font-size: 14px; font-weight: 700;">✓ Which are verified</span>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="background: #064e3b; padding: 2px 8px; border-radius: 12px; font-size: 12px; color: #a7f3d0;">
                                        {{ selectedPlayer.verifies ? selectedPlayer.verifies.length : 0 }}
                                    </span>
                                    <button v-if="isAdmin" @click="openAddVerifyModal" style="background: #10b981; color: #fff; border: none; padding: 4px 8px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 11px;">
                                        + Добавить
                                    </button>
                                </div>
                            </div>

                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                <div 
                                    v-for="(v, vIdx) in selectedPlayer.verifies" 
                                    :key="vIdx"
                                    style="background: #022c22; border: 1px solid #059669; color: #a7f3d0; padding: 6px 12px; border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 6px;"
                                >
                                    <a v-if="v.link" :href="v.link" target="_blank" style="color: #a7f3d0; text-decoration: none;">
                                        {{ v.level }}
                                    </a>
                                    <span v-else>{{ v.level }}</span>
                                    
                                    <button v-if="isAdmin" @click="deleteVerify(vIdx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0 0 0 4px;">×</button>
                                </div>
                                <div v-if="!selectedPlayer.verifies || selectedPlayer.verifies.length === 0" style="color: #047857; font-size: 13px;">
                                    Нет верифицированных уровней
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- ПРАВАЯ КОЛОНКА: Правый сайдбар со списком игроков -->
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div 
                            v-for="(player, index) in filteredPlayers" 
                            :key="player.name + index"
                            @click="selectedPlayer = player"
                            :draggable="isAdmin && !searchQuery"
                            @dragstart="onDragStart($event, index)"
                            @dragover.prevent
                            @drop="onDrop($event, index)"
                            :style="{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                background: selectedPlayer && selectedPlayer.name === player.name ? '#1e293b' : '#0f172a',
                                border: selectedPlayer && selectedPlayer.name === player.name ? '2px solid #3b82f6' : '1px solid #1e293b',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }"
                        >
                            <!-- Номер места -->
                            <span style="font-weight: 800; font-size: 14px; color: #3b82f6; width: 24px;">#{{ player.rank }}</span>

                            <!-- Аватарка -->
                            <img 
                                :src="player.avatar || 'https://i.imgur.com/6VBx3io.png'" 
                                style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;"
                                @error="onAvatarError"
                            />

                            <!-- Флаг -->
                            <img 
                                v-if="player.country" 
                                :src="'https://flagcdn.com/24x18/' + player.country.toLowerCase() + '.png'" 
                                style="width: 20px; height: 14px; border-radius: 2px;"
                            />

                            <!-- Никнейм -->
                            <span style="font-weight: 700; font-size: 14px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                                {{ player.name }}
                            </span>
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

        // --- ДРАГ И ДРОП ИГРОКОВ (В ПРАВОМ СПИСКЕ) ---
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
