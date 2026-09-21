import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";
const GITHUB_FILE_PATH = "data/_list.json";

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
                            placeholder="Поиск уровня..." 
                            class="gdl-input"
                        />
                        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
                    </div>
                </div>

                <!-- 2. СЕТКА КОНТЕНТА -->
                <div class="gdl-content-grid">
                    
                    <!-- ЛЕВАЯ КОЛОНКА (Инфо и правила) -->
                    <div class="gdl-left-column">
                        <div class="gdl-meta-box">
                            <h3>Редакторы списка</h3>
                            <ul class="editors-list">
                                <li><span>👑</span> {{ GITHUB_USER }}</li>
                            </ul>
                            
                            <div class="rules-section">
                                <h3>Правила</h3>
                                <ul class="rules-list">
                                    <li><strong>1.</strong> Запись видео с кликами обязательна.</li>
                                    <li><strong>2.</strong> Читы и хаки строго запрещены.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- ЦЕНТРАЛЬНАЯ КОЛОНКА (Список уровней) -->
                    <div class="gdl-cards-container">
                        <div v-if="isAdmin" style="margin-bottom: 10px;">
                            <button @click="openAddModal" style="width: 100%; padding: 10px; background: #22c55e; color: #fff; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">
                                + Добавить новый уровень
                            </button>
                        </div>

                        <div 
                            v-for="(level, index) in filteredList" 
                            :key="level.name + index"
                            class="gdl-level-card"
                            :class="{ active: selectedLevel && selectedLevel.name === level.name }"
                            @click="selectedLevel = level"
                            :draggable="isAdmin && !searchQuery"
                            @dragstart="onDragStart($event, index)"
                            @dragover.prevent
                            @drop="onDrop($event, index)"
                        >
                            <div class="gdl-card-thumb">
                                <span class="rank-badge">#{{ level.rank }}</span>
                                <img :src="getThumbnail(level)" alt="thumb" />
                            </div>

                            <div class="gdl-card-info">
                                <div class="card-header">
                                    <span class="rank-number">#{{ level.rank }}</span>
                                    <h4 class="level-title">{{ level.name }}</h4>
                                </div>
                                <div class="card-authors">
                                    от <span>{{ level.author }}</span>
                                </div>
                                <div class="verifier-name" v-if="level.verifier">
                                    Верификатор: {{ level.verifier }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ПРАВАЯ КОЛОНКА (Детали выбранного уровня) -->
                    <div class="gdl-details-container" v-if="selectedLevel">
                        <div class="gdl-level-detail-box">
                            <h2 class="detail-title">#{{ selectedLevel.rank }} - {{ selectedLevel.name }}</h2>

                            <div class="authors-clean-block">
                                <div class="author-item">
                                    <span class="author-label">Создатель</span>
                                    <span class="author-val">{{ selectedLevel.author }}</span>
                                </div>
                                <div class="author-item" v-if="selectedLevel.verifier">
                                    <span class="author-label">Верификатор</span>
                                    <span class="author-val">{{ selectedLevel.verifier }}</span>
                                </div>
                            </div>

                            <!-- Кнопки управления админа -->
                            <div v-if="isAdmin" style="margin-bottom: 15px;">
                                <button @click="openEditModal(selectedLevel)" style="background: #3b82f6; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 800; cursor: pointer; width: 100%;">
                                    ✏️ Редактировать уровень
                                </button>
                            </div>

                            <!-- Видео плеер -->
                            <div class="video-wrapper" v-if="selectedLevel.ytid">
                                <iframe 
                                    :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" 
                                    frameborder="0" 
                                    allowfullscreen>
                                </iframe>
                            </div>

                            <!-- Раздел с рекордами -->
                            <div class="records-section">
                                <div class="records-header" style="justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span class="records-trophy">🏆</span>
                                        <div class="records-header-text">
                                            <h3 class="section-subtitle">Рекорды ({{ selectedLevel.records ? selectedLevel.records.length : 0 }})</h3>
                                        </div>
                                    </div>
                                    <button v-if="isAdmin" @click="openAddRecordModal" style="background: #22c55e; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 12px;">
                                        + Рекорд
                                    </button>
                                </div>

                                <div class="records-list" v-if="selectedLevel.records && selectedLevel.records.length > 0">
                                    <div v-for="(rec, rIdx) in selectedLevel.records" :key="rIdx" class="record-card">
                                        <div class="record-user-info">
                                            <span class="user-name">{{ rec.user }}</span>
                                        </div>
                                        <div class="record-meta-info">
                                            <span class="percent-tag">{{ rec.percent }}%</span>
                                            <a v-if="rec.link" :href="rec.link" target="_blank" class="record-video-btn">▶</a>
                                            <button v-if="isAdmin" @click="deleteRecord(rIdx)" style="background: none; border: none; color: #ef4444; font-weight: 900; cursor: pointer; margin-left: 6px;">×</button>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="no-records">
                                    Пока нет подтвержденных рекордов.
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </template>

            <!-- МОДАЛЬНОЕ ОКНО: Добавление/Редактирование Уровня -->
            <div v-if="showLevelModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showLevelModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 24px; border-radius: 12px; width: 100%; max-width: 450px; color: #fff;">
                    <h3 style="margin-bottom: 15px;">{{ isEditing ? 'Редактировать уровень' : 'Добавить новый уровень' }}</h3>
                    
                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Название уровня:*</label>
                    <input type="text" v-model="levelForm.name" class="gdl-input" placeholder="Tidal Wave" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Автор:*</label>
                    <input type="text" v-model="levelForm.author" class="gdl-input" placeholder="OniLink" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Верификатор:</label>
                    <input type="text" v-model="levelForm.verifier" class="gdl-input" placeholder="Zoink" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">YouTube Video ID:</label>
                    <input type="text" v-model="levelForm.ytid" class="gdl-input" placeholder="dQw4w9WgXcQ" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Превью (Прямая ссылка):</label>
                    <input type="text" v-model="levelForm.thumbnail" class="gdl-input" placeholder="https://..." style="margin-top:4px;" />

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button @click="saveLevel" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Сохранить</button>
                        <button @click="showLevelModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- МОДАЛЬНОЕ ОКНО: Добавление Рекорда -->
            <div v-if="showRecordModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;" @click.self="showRecordModal = false">
                <div style="background: #161b26; border: 1px solid #283044; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; color: #fff;">
                    <h3 style="margin-bottom: 15px;">Добавить рекорд</h3>

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Имя игрока:*</label>
                    <input type="text" v-model="recordForm.user" class="gdl-input" placeholder="Trick" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Процент:*</label>
                    <input type="number" v-model.number="recordForm.percent" min="1" max="100" class="gdl-input" style="margin-top:4px;" />

                    <label style="display:block; margin-top:10px; font-size:12px; color:#94a3b8;">Ссылка на видео доказательство:</label>
                    <input type="text" v-model="recordForm.link" class="gdl-input" placeholder="https://youtube.com/..." style="margin-top:4px;" />

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button @click="saveRecord" style="flex:1; padding:10px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Сохранить</button>
                        <button @click="showRecordModal = false" style="flex:1; padding:10px; background:#475569; color:#fff; border:none; border-radius:8px; font-weight:800; cursor:pointer;">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    data: () => ({
        GITHUB_USER,
        list: [],
        loading: true,
        selectedLevel: null,
        searchQuery: '',
        draggedIndex: null,
        fileSha: '',
        isAdmin: sessionStorage.getItem('is_admin') === 'true',
        
        showLevelModal: false,
        isEditing: false,
        levelForm: { name: '', author: '', verifier: '', ytid: '', thumbnail: '' },

        showRecordModal: false,
        recordForm: { user: '', percent: 100, link: '' }
    }),

    computed: {
        filteredList() {
            if (!this.searchQuery) return this.list;
            const q = this.searchQuery.toLowerCase();
            return this.list.filter(item => 
                (item.name && item.name.toLowerCase().includes(q)) ||
                (item.author && item.author.toLowerCase().includes(q))
            );
        }
    },

    async mounted() {
        window.addEventListener('admin-state-changed', this.updateAdminState);
        await this.loadAllData();
    },

    unmounted() {
        window.removeEventListener('admin-state-changed', this.updateAdminState);
    },

    methods: {
        updateAdminState() {
            this.isAdmin = sessionStorage.getItem('is_admin') === 'true';
        },

        async loadAllData() {
            try {
                let loadedList = [];
                try {
                    let resList = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`);
                    
                    if (resList.ok) {
                        const data = await resList.json();
                        this.fileSha = data.sha;
                        const decodedContent = base64ToUtf8(data.content);
                        loadedList = JSON.parse(decodedContent);
                    }
                } catch (err) {
                    console.warn("GitHub fetch error:", err);
                }

                if (!loadedList || loadedList.length === 0) {
                    const fetchListFn = ContentModule.fetchList || (async () => []);
                    loadedList = await fetchListFn();
                }

                if (Array.isArray(loadedList)) {
                    this.list = loadedList.map((item, index) => {
                        if (typeof item === 'string') {
                            return { name: item, author: 'Unknown', rank: index + 1, records: [] };
                        } else if (typeof item === 'object' && item !== null) {
                            return { ...item, rank: index + 1, records: item.records || [] };
                        }
                        return { name: "Unknown", rank: index + 1, records: [] };
                    });
                } else {
                    this.list = [];
                }

                if (this.list.length > 0) {
                    this.selectedLevel = this.list[0];
                }
            } catch (e) {
                console.error("Data load error:", e);
            } finally {
                this.loading = false;
            }
        },

        getThumbnail(level) {
            if (level.thumbnail && level.thumbnail.trim() !== '') {
                return level.thumbnail;
            }
            return level.ytid ? `https://i.ytimg.com/vi/${level.ytid}/hqdefault.jpg` : 'https://i.imgur.com/6VBx3io.png';
        },

        openAddModal() {
            this.isEditing = false;
            this.levelForm = { name: '', author: '', verifier: '', ytid: '', thumbnail: '' };
            this.showLevelModal = true;
        },

        openEditModal(level) {
            this.isEditing = true;
            this.levelForm = {
                name: level.name || '',
                author: level.author || '',
                verifier: level.verifier || '',
                ytid: level.ytid || '',
                thumbnail: level.thumbnail || ''
            };
            this.showLevelModal = true;
        },

        async saveLevel() {
            if (!this.levelForm.name) return alert("Введите название уровня!");

            if (this.isEditing) {
                this.selectedLevel.name = this.levelForm.name;
                this.selectedLevel.author = this.levelForm.author;
                this.selectedLevel.verifier = this.levelForm.verifier;
                this.selectedLevel.ytid = this.levelForm.ytid;
                this.selectedLevel.thumbnail = this.levelForm.thumbnail;
            } else {
                const newLvl = {
                    name: this.levelForm.name,
                    author: this.levelForm.author || 'Unknown',
                    verifier: this.levelForm.verifier || '',
                    ytid: this.levelForm.ytid || '',
                    thumbnail: this.levelForm.thumbnail || '',
                    rank: this.list.length + 1,
                    records: []
                };
                this.list.push(newLvl);
                this.selectedLevel = newLvl;
            }

            this.showLevelModal = false;
            await this.saveListToGitHub();
        },

        openAddRecordModal() {
            this.recordForm = { user: '', percent: 100, link: '' };
            this.showRecordModal = true;
        },

        async saveRecord() {
            if (!this.recordForm.user) return alert("Введите имя игрока!");

            if (!this.selectedLevel.records) {
                this.selectedLevel.records = [];
            }

            this.selectedLevel.records.push({
                user: this.recordForm.user,
                percent: this.recordForm.percent || 100,
                link: this.recordForm.link || ''
            });

            this.showRecordModal = false;
            await this.saveListToGitHub();
        },

        async deleteRecord(index) {
            if (confirm("Удалить этот рекорд?")) {
                this.selectedLevel.records.splice(index, 1);
                await this.saveListToGitHub();
            }
        },

        onDragStart(event, filteredIndex) {
            if (!this.isAdmin || this.searchQuery) return;
            this.draggedIndex = filteredIndex;
            event.dataTransfer.effectAllowed = 'move';
        },

        async onDrop(event, targetIndex) {
            if (!this.isAdmin || this.searchQuery || this.draggedIndex === null || this.draggedIndex === targetIndex) return;

            const movedItem = this.list.splice(this.draggedIndex, 1)[0];
            this.list.splice(targetIndex, 0, movedItem);

            this.list.forEach((item, idx) => {
                item.rank = idx + 1;
            });

            this.draggedIndex = null;
            await this.saveListToGitHub();
        },

        async saveListToGitHub() {
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
                const getFileRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`, {
                    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
                });
                if (getFileRes.ok) {
                    const fileData = await getFileRes.json();
                    this.fileSha = fileData.sha;
                }

                const cleanData = this.list.map(item => ({
                    name: item.name,
                    author: item.author,
                    verifier: item.verifier,
                    ytid: item.ytid,
                    thumbnail: item.thumbnail || '',
                    percentToQualify: item.percentToQualify || 100,
                    records: item.records || []
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
                        message: 'Update demonlist via Admin Panel',
                        content: contentEncoded,
                        sha: this.fileSha,
                        branch: GITHUB_BRANCH
                    })
                });

                if (response.ok) {
                    const resData = await response.json();
                    this.fileSha = resData.content.sha;
                    alert("Успешно сохранено на GitHub!");
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
