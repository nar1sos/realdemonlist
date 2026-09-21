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
        <main v-if="loading" class="leaderboard-wrapper">
            <Spinner></Spinner>
        </main>

        <div v-else class="leaderboard-container" style="padding: 20px;">
            <!-- Панель управления админа -->
            <div v-if="isAdmin" style="grid-column: 1 / -1; margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
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
                <!-- Аватарка -->
                <div class="profile-header">
                    <div class="avatar-ring">
                        <img 
                            :src="getAvatarUrl(selectedPlayer)" 
                            class="profile-avatar"
                            @error="onAvatarError"
                        />
                    </div>
                    <!-- Имя с флагом СЛЕВА -->
                    <div class="profile-title">
                        <img 
                            v-if="getPlayerFlag(selectedPlayer)" 
                            :src="getPlayerFlag(selectedPlayer)" 
                            class="flag-img" 
                            @error="onFlagError"
                        />
                        <h1>{{ selectedPlayer.user || selectedPlayer.name }}</h1>
                    </div>

                    <!-- Кнопки управления профилем (для админа) -->
                    <div v-if="isAdmin" style="margin-top: 10px; display: flex; gap: 8px;">
                        <button @click="openEditPlayerModal(selectedPlayer)" style="background: #3b82f6; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                            ✏️ Редактировать
                        </button>
                        <button @click="deletePlayer(selectedPlayer)" style="background: #ef4444; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                            🗑️ Удалить
                        </button>
                    </div>
                </div>

                <!-- Статистика: RANK -->
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
                    <div class="box-title red-title">
                        🔥 Hardest level
                    </div>
                    <div class="hardest-name">
                        {{ selectedPlayer.hardest || getHardestName(selectedPlayer) }}
                    </div>
                </div>

                <!-- Main levels -->
                <div class="section-box" v-if="mainLevels.length || isAdmin">
                    <div class="box-header">
                        <div class="box-title red-title">
                            ★ Main levels
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge-count">{{ mainLevels.length }}</span>
                            <button v-if="isAdmin" @click="openAddRecordModal" style="background: #22c55e; color: #fff; border: none; padding: 2px 8px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">
                                + Добавить
                            </button>
                        </div>
                    </div>
                    <div class="pills-flex">
                        <div 
                            v-for="(lvl, idx) in mainLevels" 
                            :key="idx" 
                            class="pill-btn"
                            style="display: inline-flex; align-items: center; gap: 6px;"
                        >
                            <span>{{ lvl }}</span>
                            <button v-if="isAdmin" @click="deleteRecord(idx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0;">×</button>
                        </div>
                    </div>
                </div>

                <!-- Progresses -->
                <div class="section-box" v-if="progresses.length">
                    <div class="box-header">
                        <div class="box-title blue-title">
                            📊 Progresses
                        </div>
                        <span class="badge-count">{{ progresses.length }}</span>
                    </div>
                    <div class="pills-flex">
                        <div 
                            v-for="(prog, idx) in progresses" 
                            :key="idx" 
                            class="pill-btn progress-pill"
                        >
                            {{ prog.levelName || prog.level || prog }} <span v-if="prog.percent" class="blue-text">({{ prog.percent }}%)</span>
                        </div>
                    </div>
                </div>

                <!-- Which are verified -->
                <div class="section-box verified-box" v-if="verifiedLevels.length || isAdmin">
                    <div class="box-header">
                        <div class="box-title green-title">
                            <span class="check-circle">✓</span> Which are verified
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge-count green-badge">{{ verifiedLevels.length }}</span>
                            <button v-if="isAdmin" @click="openAddVerifyModal" style="background: #10b981; color: #fff; border: none; padding: 2px 8px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px;">
                                + Добавить
                            </button>
                        </div>
                    </div>
                    <div class="pills-flex">
                        <div 
                            v-for="(ver, idx) in verifiedLevels" 
                            :key="idx" 
                            class="pill-btn verified-pill"
                            style="display: inline-flex; align-items: center; gap: 6px;"
                        >
                            <span>{{ ver.levelName || ver.level || ver }}</span>
                            <button v-if="isAdmin" @click="deleteVerify(idx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; padding: 0;">×</button>
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
                    :draggable="isAdmin && !searchQuery"
                    @dragstart="onDragStart($event, index)"
                    @dragover.prevent
                    @drop="onDrop($event, index)"
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

            <!-- МОДАЛКА: Игрок (Добавить / Редактировать) -->
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

            <!-- МОДАЛКА: Добавить уровень в Main Levels / Record -->
            <div v-if="showRecordModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showRecordModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; color: #fff;">
                    <h3 style="margin-bottom: 15px;">Добавить уровень</h3>

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Название уровня:*</label>
                    <input type="text" v-model="recordForm.level" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" placeholder="Tidal Wave" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Процент (100 = пройден):</label>
                    <input type="number" v-model.number="recordForm.percent" min="1" max="100" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" />

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
                    <input type="text" v-model="verifyForm.level" style="width:100%; padding:8px; margin-top:4px; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px;" placeholder="Acheron" />

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button @click="saveVerify" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Сохранить</button>
                        <button @click="showVerifyModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    data: () => ({
        leaderboard: [],
        loading: true,
        selectedPlayer: null,
        searchQuery: '',
        draggedIndex: null,
        fileSha: '',
        defaultAvatar: 'https://i.imgur.com/6VBx3io.png',
        isAdmin: sessionStorage.getItem('is_admin') === 'true',

        showPlayerModal: false,
        isEditing: false,
        playerForm: { name: '', country: '', avatar: '' },

        showRecordModal: false,
        recordForm: { level: '', percent: 100 },

        showVerifyModal: false,
        verifyForm: { level: '' }
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
        selectedRank() {
            if (!this.selectedPlayer || !this.leaderboard.length) return '-';
            const selName = this.selectedPlayer.user || this.selectedPlayer.name;
            const index = this.leaderboard.findIndex(p => (p.user || p.name) === selName);
            return index !== -1 ? index + 1 : '-';
        },
        mainLevels() {
            if (!this.selectedPlayer) return [];
            
            const records = (this.selectedPlayer.records || [])
                .filter(r => typeof r === 'string' || !r.percent || r.percent === 100)
                .map(r => typeof r === 'string' ? r : (r.levelName || r.level));
                
            const verified = (this.selectedPlayer.verified || this.selectedPlayer.verifies || [])
                .map(v => typeof v === 'string' ? v : (v.levelName || v.level));

            return [...new Set([...records, ...verified])];
        },
        progresses() {
            if (!this.selectedPlayer?.records) return [];
            return this.selectedPlayer.records.filter(r => typeof r === 'object' && r.percent && r.percent < 100);
        },
        verifiedLevels() {
            if (!this.selectedPlayer) return [];
            return this.selectedPlayer.verified || this.selectedPlayer.verifies || [];
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

        // --- УПРАВЛЕНИЕ ИГРОКАМИ (АДМИН) ---
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

        // --- DRAG & DROP ---
        onDragStart(event, filteredIndex) {
            if (!this.isAdmin || this.searchQuery) return;
            this.draggedIndex = filteredIndex;
            event.dataTransfer.effectAllowed = 'move';
        },

        async onDrop(event, targetIndex) {
            if (!this.isAdmin || this.searchQuery || this.draggedIndex === null || this.draggedIndex === targetIndex) return;

            const movedItem = this.leaderboard.splice(this.draggedIndex, 1)[0];
            this.leaderboard.splice(targetIndex, 0, movedItem);

            this.draggedIndex = null;
            await this.saveToGitHub();
        },

        // --- ЗАПИСИ И ВЕРИФИКАЦИИ ---
        openAddRecordModal() {
            this.recordForm = { level: '', percent: 100 };
            this.showRecordModal = true;
        },

        async saveRecord() {
            if (!this.recordForm.level) return alert("Введите название уровня!");
            if (!this.selectedPlayer.records) this.selectedPlayer.records = [];

            if (this.recordForm.percent < 100) {
                this.selectedPlayer.records.push({
                    levelName: this.recordForm.level,
                    percent: this.recordForm.percent
                });
            } else {
                this.selectedPlayer.records.push(this.recordForm.level);
            }

            this.showRecordModal = false;
            await this.saveToGitHub();
        },

        async deleteRecord(index) {
            if (confirm("Удалить этот уровень/прохождение?")) {
                this.selectedPlayer.records.splice(index, 1);
                await this.saveToGitHub();
            }
        },

        openAddVerifyModal() {
            this.verifyForm = { level: '' };
            this.showVerifyModal = true;
        },

        async saveVerify() {
            if (!this.verifyForm.level) return alert("Введите название уровня!");
            const targetArray = this.selectedPlayer.verified ? this.selectedPlayer.verified : (this.selectedPlayer.verifies || (this.selectedPlayer.verified = []));

            targetArray.push(this.verifyForm.level);

            this.showVerifyModal = false;
            await this.saveToGitHub();
        },

        async deleteVerify(index) {
            if (confirm("Удалить эту верификацию?")) {
                const targetArray = this.selectedPlayer.verified || this.selectedPlayer.verifies;
                if (targetArray) targetArray.splice(index, 1);
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

                const jsonString = JSON.stringify(this.leaderboard, null, 4);
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
