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
        <div class="demonlist-container">
            <Spinner v-if="loading" />

            <template v-else>
                <!-- Левая колонка: Список уровней -->
                <div class="level-list">
                    <div class="list-header">
                        <input 
                            type="text" 
                            v-model="searchQuery" 
                            placeholder="Поиск уровня..." 
                            class="search-input"
                        />
                        <button v-if="isAdmin" @click="openAddModal" class="add-btn" title="Добавить уровень">+</button>
                    </div>

                    <div 
                        v-for="(level, index) in filteredList" 
                        :key="level.name + index"
                        class="level-card"
                        :class="{ active: selectedLevel && selectedLevel.name === level.name }"
                        @click="selectedLevel = level"
                        :draggable="isAdmin && !searchQuery"
                        @dragstart="onDragStart($event, index)"
                        @dragover.prevent
                        @drop="onDrop($event, index)"
                    >
                        <div class="level-rank">#{{ level.rank }}</div>
                        <div class="level-thumb-mini">
                            <img :src="getThumbnail(level)" alt="thumb" />
                        </div>
                        <div class="level-info-mini">
                            <div class="level-title">{{ level.name }}</div>
                            <div class="level-author">by {{ level.author }}</div>
                        </div>
                    </div>
                </div>

                <!-- Правая колонка: Детали уровня -->
                <div class="level-details" v-if="selectedLevel">
                    <div class="details-banner">
                        <img :src="getThumbnail(selectedLevel)" alt="banner" />
                        <div class="banner-overlay">
                            <h1>#{{ selectedLevel.rank }} - {{ selectedLevel.name }}</h1>
                            <p>Создатель: <strong>{{ selectedLevel.author }}</strong></p>
                            <p v-if="selectedLevel.verifier">Верификатор: <strong>{{ selectedLevel.verifier }}</strong></p>
                            
                            <div v-if="isAdmin" class="admin-actions">
                                <button @click="openEditModal(selectedLevel)" class="edit-btn">Редактировать</button>
                            </div>
                        </div>
                    </div>

                    <!-- Видео верификации -->
                    <div class="video-container" v-if="selectedLevel.ytid">
                        <iframe 
                            :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" 
                            frameborder="0" 
                            allowfullscreen>
                        </iframe>
                    </div>

                    <!-- Рекорды -->
                    <div class="records-section">
                        <div class="records-header">
                            <h3>Рекорды ({{ selectedLevel.records ? selectedLevel.records.length : 0 }})</h3>
                            <button v-if="isAdmin" @click="openAddRecordModal" class="add-record-btn">+ Добавить рекорд</button>
                        </div>

                        <div class="records-list" v-if="selectedLevel.records && selectedLevel.records.length > 0">
                            <div v-for="(rec, rIdx) in selectedLevel.records" :key="rIdx" class="record-item">
                                <span class="rec-user">{{ rec.user }}</span>
                                <span class="rec-percent">{{ rec.percent }}%</span>
                                <a v-if="rec.link" :href="rec.link" target="_blank" class="rec-link">Видео</a>
                                <button v-if="isAdmin" @click="deleteRecord(rIdx)" class="del-rec-btn">×</button>
                            </div>
                        </div>
                        <p v-else class="no-records">Пока нет подтвержденных рекордов.</p>
                    </div>
                </div>
            </template>

            <!-- МОДАЛЬНОЕ ОКНО: Добавление/Редактирование Уровня -->
            <div v-if="showLevelModal" class="modal-backdrop" @click.self="showLevelModal = false">
                <div class="modal-content">
                    <h3>{{ isEditing ? 'Редактировать уровень' : 'Добавить новый уровень' }}</h3>
                    
                    <label>Название уровня:*</label>
                    <input type="text" v-model="levelForm.name" placeholder="Например: Tidal Wave" />

                    <label>Автор:*</label>
                    <input type="text" v-model="levelForm.author" placeholder="Например: OniLink" />

                    <label>Верификатор:</label>
                    <input type="text" v-model="levelForm.verifier" placeholder="Например: Zoink" />

                    <label>YouTube Video ID (для видео):</label>
                    <input type="text" v-model="levelForm.ytid" placeholder="Например: dQw4w9WgXcQ" />

                    <label>Превью (Прямая ссылка на фото):</label>
                    <input type="text" v-model="levelForm.thumbnail" placeholder="https://..." />

                    <div class="modal-buttons">
                        <button @click="saveLevel" class="save-btn">Сохранить</button>
                        <button @click="showLevelModal = false" class="cancel-btn">Отмена</button>
                    </div>
                </div>
            </div>

            <!-- МОДАЛЬНОЕ ОКНО: Добавление Рекорда -->
            <div v-if="showRecordModal" class="modal-backdrop" @click.self="showRecordModal = false">
                <div class="modal-content">
                    <h3>Добавить рекорд</h3>

                    <label>Имя игрока:*</label>
                    <input type="text" v-model="recordForm.user" placeholder="Например: Trick" />

                    <label>Процент:*</label>
                    <input type="number" v-model.number="recordForm.percent" min="1" max="100" />

                    <label>Ссылка на видео доказательство:</label>
                    <input type="text" v-model="recordForm.link" placeholder="https://youtube.com/..." />

                    <div class="modal-buttons">
                        <button @click="saveRecord" class="save-btn">Сохранить</button>
                        <button @click="showRecordModal = false" class="cancel-btn">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
    `,

    data: () => ({
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
