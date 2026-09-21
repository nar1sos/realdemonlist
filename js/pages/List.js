import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

// ⚙️ НАСТРОЙКИ ГИТХАБА И АДМИНКИ
const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";
const GITHUB_TOKEN = "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"; // 👈 Вставь сюда свой ghp_... токен

export default {
    components: { Spinner },
    template: `
        <main v-if="loading">
            <Spinner />
        </main>
        <div v-else class="gdl-wrapper">
            
            <!-- SEARCH BAR -->
            <div class="gdl-search-bar">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input 
                        type="text" 
                        v-model="searchQuery" 
                        class="gdl-input" 
                        placeholder="Search levels..."
                    />
                    <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
                </div>
            </div>

            <!-- GRID -->
            <div class="gdl-content-grid">
                
                <!-- LEFT COLUMN -->
                <div class="gdl-left-column">
                    <div class="gdl-meta-box">
                        <h3>List Editors</h3>
                        <ul class="editors-list">
                            <li>
                                <span class="role-icon">👑</span>
                                <span>nar1sos</span>
                            </li>
                        </ul>

                        <div class="rules-section">
                            <h3>Rules & Guidelines</h3>
                            <ul class="rules-list">
                                <li>Все рекорды должны иметь видеозапись с кликами/тапами или сырым звуком.</li>
                                <li>Недопустимо использование читов, физических модов или нелегитимных хитбоксов.</li>
                                <li>Рекорд считается принятым только при достижении минимального требуемого процента.</li>
                                <li>Прогресс на уровнях из топ-10 принимается строго от 0%.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- CENTER COLUMN -->
                <div class="gdl-cards-container">
                    <div v-if="isAdmin" class="admin-notice" style="background:#2ecc7122; border: 1px solid #2ecc71; color:#2ecc71; padding:10px; border-radius:8px; margin-bottom:12px; font-size:13px; text-align:center;">
                        ⚡ <strong>Режим Редактора:</strong> Перетаскивайте карточки для смены позиций!
                        <div style="margin-top: 8px;">
                            <button @click="openAddModal" style="background:#2ecc71; color:#000; border:none; padding:6px 14px; border-radius:6px; font-weight:bold; cursor:pointer;">
                                ➕ Add Level
                            </button>
                        </div>
                    </div>

                    <div 
                        v-for="(level, index) in filteredList" 
                        :key="level.name"
                        class="gdl-level-card"
                        :class="{ 
                            active: selectedLevel && selectedLevel.name === level.name,
                            'draggable-card': isAdmin
                        }"
                        :draggable="isAdmin"
                        @dragstart="onDragStart($event, index)"
                        @dragover.prevent
                        @dragenter.prevent
                        @drop="onDrop($event, index)"
                        @click="selectedLevel = level"
                    >
                        <div class="gdl-card-thumb">
                            <span class="rank-badge">#{{ level.rank }}</span>
                            <img :src="getThumbnail(level)" alt="">
                        </div>
                        <div class="gdl-card-info">
                            <div class="card-header">
                                <span class="rank-number">#{{ level.rank }}</span>
                                <h2 class="level-title">{{ level.name }}</h2>
                            </div>
                            <div class="card-authors">
                                by <strong>{{ level.author || 'Unknown' }}</strong>
                                <span v-if="level.verifier"> (Verified by <span class="verifier-name">{{ level.verifier }}</span>)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN -->
                <div class="gdl-details-container" v-if="selectedLevel">
                    <div class="gdl-level-detail-box">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <h1 class="detail-title" style="margin:0;">#{{ selectedLevel.rank }} — {{ selectedLevel.name }}</h1>
                            <button v-if="isAdmin" @click="openEditModal(selectedLevel)" style="background:#f39c12; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">
                                ✏️ Edit Level
                            </button>
                        </div>
                        
                        <div class="authors-clean-block">
                            <div class="author-item">
                                <span class="author-label">CREATOR</span>
                                <span class="author-val">{{ selectedLevel.author || 'Unknown' }}</span>
                            </div>
                            <div class="author-item" v-if="selectedLevel.verifier">
                                <span class="author-label">VERIFIER</span>
                                <span class="author-val verifier-name">{{ selectedLevel.verifier }}</span>
                            </div>
                        </div>

                        <div class="video-wrapper" v-if="selectedLevel.ytid">
                            <iframe 
                                :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" 
                                frameborder="0" 
                                allowfullscreen
                            ></iframe>
                        </div>

                        <div class="records-section">
                            <div class="records-header" style="display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span class="records-trophy">🏆</span>
                                    <div class="records-header-text">
                                        <h3 class="section-subtitle">Records</h3>
                                        <p class="records-count-info">
                                            Total: <strong>{{ (selectedLevel.records || []).length }}</strong>
                                        </p>
                                    </div>
                                </div>
                                <button v-if="isAdmin" @click="openAddRecordModal" style="background:#2ecc71; color:#000; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px;">
                                    ➕ Add Record
                                </button>
                            </div>

                            <div class="records-list" v-if="selectedLevel.records && selectedLevel.records.length > 0">
                                <div v-for="(rec, idx) in selectedLevel.records" :key="idx" class="record-card" style="display:flex; justify-content:space-between; align-items:center;">
                                    <div class="record-user-info">
                                        <span class="user-name">{{ rec.user }}</span>
                                    </div>
                                    <div class="record-meta-info" style="display:flex; align-items:center; gap:8px;">
                                        <span class="percent-tag">{{ rec.percent }}%</span>
                                        <a v-if="rec.link" :href="rec.link" target="_blank" class="record-video-btn">🎬</a>
                                        <button v-if="isAdmin" @click="deleteRecord(idx)" style="background:none; border:none; cursor:pointer; font-size:14px;" title="Delete Record">🗑️</button>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="no-records">
                                No records yet.
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- MODAL ADD / EDIT LEVEL -->
            <div v-if="showLevelModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999;">
                <div style="background:#181b20; border:1px solid #333; padding:24px; border-radius:12px; width:400px; color:#fff;">
                    <h2 style="margin-bottom:16px;">{{ isEditing ? 'Edit Level' : 'Add New Level' }}</h2>
                    
                    <label style="font-size:12px; color:#aaa;">Level Name</label>
                    <input v-model="levelForm.name" placeholder="e.g. Tidal Wave" class="gdl-input" style="width:100%; margin-bottom:10px; padding:8px;" />
                    
                    <label style="font-size:12px; color:#aaa;">Creator</label>
                    <input v-model="levelForm.author" placeholder="e.g. OniLink" class="gdl-input" style="width:100%; margin-bottom:10px; padding:8px;" />
                    
                    <label style="font-size:12px; color:#aaa;">Verifier</label>
                    <input v-model="levelForm.verifier" placeholder="e.g. Zoink" class="gdl-input" style="width:100%; margin-bottom:10px; padding:8px;" />
                    
                    <label style="font-size:12px; color:#aaa;">YouTube Video ID</label>
                    <input v-model="levelForm.ytid" placeholder="e.g. dQw4w9WgXcQ" class="gdl-input" style="width:100%; margin-bottom:10px; padding:8px;" />
                    
                    <label style="font-size:12px; color:#aaa;">Custom Thumbnail URL (Optional)</label>
                    <input v-model="levelForm.thumbnail" placeholder="https://i.imgur.com/example.png" class="gdl-input" style="width:100%; margin-bottom:16px; padding:8px;" />
                    
                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button @click="showLevelModal = false" style="background:#444; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Cancel</button>
                        <button @click="saveLevel" style="background:#2ecc71; color:#000; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">Save</button>
                    </div>
                </div>
            </div>

            <!-- MODAL ADD RECORD -->
            <div v-if="showRecordModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999;">
                <div style="background:#181b20; border:1px solid #333; padding:24px; border-radius:12px; width:360px; color:#fff;">
                    <h2 style="margin-bottom:16px;">Add Record</h2>
                    
                    <label style="font-size:12px; color:#aaa;">Player Name</label>
                    <input v-model="recordForm.user" placeholder="e.g. Player1" class="gdl-input" style="width:100%; margin-bottom:10px; padding:8px;" />
                    
                    <label style="font-size:12px; color:#aaa;">Percent (%)</label>
                    <input type="number" v-model.number="recordForm.percent" placeholder="100" class="gdl-input" style="width:100%; margin-bottom:10px; padding:8px;" />
                    
                    <label style="font-size:12px; color:#aaa;">Video Link (YouTube)</label>
                    <input v-model="recordForm.link" placeholder="https://youtu.be/..." class="gdl-input" style="width:100%; margin-bottom:16px; padding:8px;" />
                    
                    <div style="display:flex; justify-content:flex-end; gap:8px;">
                        <button @click="showRecordModal = false" style="background:#444; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">Cancel</button>
                        <button @click="saveRecord" style="background:#2ecc71; color:#000; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">Add</button>
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
        
        // Modals
        showLevelModal: false,
        isEditing: false,
        levelForm: {
            name: '',
            author: '',
            verifier: '',
            ytid: '',
            thumbnail: ''
        },

        showRecordModal: false,
        recordForm: {
            user: '',
            percent: 100,
            link: ''
        }
    }),

    computed: {
        isAdmin() {
            return localStorage.getItem('gdl_is_admin') === 'true';
        },
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
        await this.loadAllData();
    },

    methods: {
        async loadAllData() {
            try {
                let loadedList = [];

                try {
                    let resList = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json?ref=${GITHUB_BRANCH}`);
                    if (resList.status === 404) {
                        resList = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/_list.json?ref=${GITHUB_BRANCH}`);
                    }

                    if (resList.ok) {
                        const data = await resList.json();
                        this.fileSha = data.sha;
                        loadedList = JSON.parse(decodeURIComponent(escape(atob(data.content))));
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

        // --- LEVEL MANAGEMENT ---
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
            if (!this.levelForm.name) {
                alert("Введите название уровня!");
                return;
            }

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

        // --- RECORD MANAGEMENT ---
        openAddRecordModal() {
            this.recordForm = { user: '', percent: 100, link: '' };
            this.showRecordModal = true;
        },

        async saveRecord() {
            if (!this.recordForm.user) {
                alert("Введите имя игрока!");
                return;
            }

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

        // --- DRAG & DROP ---
        onDragStart(event, index) {
            if (!this.isAdmin) return;
            this.draggedIndex = index;
            event.dataTransfer.effectAllowed = 'move';
        },

        async onDrop(event, targetIndex) {
            if (!this.isAdmin || this.draggedIndex === null || this.draggedIndex === targetIndex) return;

            const movedItem = this.list.splice(this.draggedIndex, 1)[0];
            this.list.splice(targetIndex, 0, movedItem);

            this.list.forEach((item, idx) => {
                item.rank = idx + 1;
            });

            this.draggedIndex = null;
            await this.saveListToGitHub();
        },

        // --- SAVE TO GITHUB ---
        async saveListToGitHub() {
            const token = GITHUB_TOKEN;

            if (!token || token.includes("ВСТАВЬ_СЮДА")) {
                alert("Ошибка: Не указан токен GitHub в начале файла List.js!");
                return;
            }

            try {
                const cleanData = this.list.map(item => ({
                    name: item.name,
                    author: item.author,
                    verifier: item.verifier,
                    ytid: item.ytid,
                    thumbnail: item.thumbnail || '',
                    percentToQualify: item.percentToQualify || 100,
                    records: item.records || []
                }));

                const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(cleanData, null, 4))));

                const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json'
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
                    console.log("Успешно сохранено на GitHub!");
                } else {
                    alert("Ошибка при сохранении на GitHub! Код ответа: " + response.status);
                }
            } catch (err) {
                console.error("Save error:", err);
                alert("Не удалось связаться с GitHub API.");
            }
        }
    }
};
