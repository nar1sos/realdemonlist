import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

// ⚠️ УКАЖИ ДАННЫЕ СВОЕГО РЕПОЗИТОРИЯ ⚠️
const GITHUB_USER = "nar1sos"; // Твой логин на GitHub
const GITHUB_REPO = "realdemonlist"; // Название твоего репозитория (например, demonlist)
const GITHUB_BRANCH = "main"; // Название ветки (main или master)

export default {
    components: { Spinner },
    template: `
        <div class="gdl-root">
            <main v-if="loading" class="gdl-wrapper">
                <Spinner />
            </main>

            <div v-else class="gdl-wrapper">
                <!-- ПАНЕЛЬ АДМИНА -->
                <div class="admin-control-panel" style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
                    <button @click="toggleAdmin" class="gdl-btn" style="padding: 8px 15px; cursor: pointer;">
                        {{ isAdmin ? '🔒 Выйти из режима редактора' : '🔓 Включить режим редактора' }}
                    </button>
                    <button v-if="isAdmin" @click="saveToGithub" class="gdl-btn" :disabled="saving" style="background: #28a745; color: white; padding: 8px 15px; cursor: pointer;">
                        {{ saving ? '⏳ Сохраняю на GitHub...' : '🚀 Опубликовать изменения для всех' }}
                    </button>
                </div>

                <div class="gdl-content-grid">
                    
                    <!-- ЛЕВАЯ КОЛОНКА (ФОРМА ДОБАВЛЕНИЯ УРОВНЯ) -->
                    <div class="gdl-left-column">
                        <div class="gdl-meta-box">
                            <div v-if="isAdmin" class="add-level-box" style="margin-bottom: 20px;">
                                <h3>➕ Добавить уровень</h3>
                                <form @submit.prevent="addNewLevel" style="display: flex; flex-direction: column; gap: 8px;">
                                    <input v-model="newLevel.name" placeholder="Название уровня" required class="gdl-input" />
                                    <input v-model="newLevel.author" placeholder="Автор" required class="gdl-input" />
                                    <input v-model="newLevel.verifier" placeholder="Верификатор" required class="gdl-input" />
                                    <input v-model="newLevel.ytid" placeholder="YouTube Video ID" class="gdl-input" />
                                    <button type="submit" class="gdl-btn">Добавить в топ</button>
                                </form>
                            </div>

                            <h3>Rules</h3>
                            <ul class="rules-list">
                                <li><strong>1.</strong> Records must have video proof.</li>
                                <li><strong>2.</strong> Secret ways are strictly prohibited.</li>
                            </ul>
                        </div>
                    </div>

                    <!-- ЦЕНТРАЛЬНАЯ КОЛОНКА (СПИСОК С DRAG & DROP) -->
                    <div class="gdl-cards-container">
                        <div 
                            v-for="(level, index) in list" 
                            :key="index" 
                            class="gdl-level-card"
                            :class="{ 'active': selectedLevel && selectedLevel.name === level.name }"
                            :draggable="isAdmin"
                            @dragstart="onDragStart($event, index)"
                            @dragover.prevent
                            @drop="onDrop($event, index)"
                            @click="selectedLevel = level"
                            style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid #333; margin-bottom: 5px; border-radius: 5px;"
                        >
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span v-if="isAdmin" style="cursor: grab; font-weight: bold; font-size: 18px;">☰</span>
                                <div class="gdl-card-thumb" style="width: 80px;">
                                    <img :src="getThumbnail(level.ytid)" :alt="level.name" style="width: 100%; border-radius: 4px;" />
                                </div>
                                <div class="gdl-card-info">
                                    <h3 style="margin: 0;">#{{ level.rank }} {{ level.name }}</h3>
                                    <small>By <strong>{{ level.author }}</strong></small>
                                </div>
                            </div>
                            
                            <button v-if="isAdmin" @click.stop="deleteLevel(index)" style="color: #ff4d4d; background: none; border: none; font-size: 18px; cursor: pointer;">✕</button>
                        </div>
                    </div>

                    <!-- ПРАВАЯ КОЛОНКА (ДЕТАЛИ И РЕКОРДЫ) -->
                    <div class="gdl-details-container" v-if="selectedLevel">
                        <div class="gdl-level-detail-box">
                            <h2>#{{ selectedLevel.rank }} {{ selectedLevel.name }}</h2>

                            <div class="video-wrapper" v-if="selectedLevel.ytid" style="margin-bottom: 15px;">
                                <iframe :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" frameborder="0" allowfullscreen style="width: 100%; height: 250px;"></iframe>
                            </div>

                            <!-- Добавление рекорда -->
                            <div v-if="isAdmin" class="add-record-box" style="margin-bottom: 15px; border-top: 1px solid #444; padding-top: 10px;">
                                <h4>➕ Добавить рекорд игроку</h4>
                                <form @submit.prevent="addRecord" style="display: flex; flex-direction: column; gap: 6px;">
                                    <input v-model="newRecord.user" placeholder="Имя игрока" required class="gdl-input" />
                                    <input v-model.number="newRecord.percent" type="number" min="1" max="100" placeholder="Процент (%)" required class="gdl-input" />
                                    <input v-model="newRecord.link" placeholder="Ссылка на видео" class="gdl-input" />
                                    <button type="submit" class="gdl-btn">Сохранить рекорд</button>
                                </form>
                            </div>

                            <!-- Список рекордов -->
                            <div class="records-list">
                                <h3>Records</h3>
                                <div v-for="(rec, idx) in (selectedLevel.records || [])" :key="idx" style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #222;">
                                    <span><strong>{{ rec.user }}</strong> — {{ rec.percent }}%</span>
                                    <div>
                                        <a v-if="rec.link" :href="rec.link" target="_blank" style="color: #4da6ff; margin-right: 8px;">▶ Video</a>
                                        <button v-if="isAdmin" @click="deleteRecord(idx)" style="color: #ff4d4d; background: none; border: none; cursor: pointer;">✕</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `,

    data: () => ({
        list: [],
        loading: true,
        saving: false,
        selectedLevel: null,
        isAdmin: false,
        draggedIndex: null,
        fileSha: "",
        githubToken: "",
        newLevel: { name: "", author: "", verifier: "", ytid: "" },
        newRecord: { user: "", percent: 100, link: "" }
    }),

    async mounted() {
        // Проверяем, сохранен ли токен админа в браузере
        const savedToken = localStorage.getItem("gdl_admin_token");
        if (savedToken) {
            this.githubToken = savedToken;
        }
        await this.loadList();
    },

    methods: {
        toggleAdmin() {
            this.isAdmin = !this.isAdmin;
        },

        async loadList() {
            try {
                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json?ref=${GITHUB_BRANCH}`);
                if (res.ok) {
                    const data = await res.json();
                    this.fileSha = data.sha;
                    const content = decodeURIComponent(escape(atob(data.content)));
                    this.list = JSON.parse(content);
                } else {
                    const fetchListFn = ContentModule.fetchList || (async () => []);
                    this.list = await fetchListFn();
                }

                this.updateRanks();
                if (this.list.length > 0) this.selectedLevel = this.list[0];
            } catch (e) {
                console.error("Ошибка загрузки:", e);
            } finally {
                this.loading = false;
            }
        },

        async saveToGithub() {
            // Если токена нет, запрашиваем его у пользователя
            if (!this.githubToken) {
                const inputToken = prompt("Введи твой GitHub Personal Access Token (ghp_...):");
                if (!inputToken) return;
                this.githubToken = inputToken.trim();
                localStorage.setItem("gdl_admin_token", this.githubToken);
            }

            this.saving = true;
            this.updateRanks();

            try {
                const jsonString = JSON.stringify(this.list, null, 2);
                const utf8Bytes = new TextEncoder().encode(jsonString);
                let binary = '';
                utf8Bytes.forEach(b => binary += String.fromCharCode(b));
                const contentBase64 = btoa(binary);

                const body = {
                    message: "Update _list.json via Site Editor",
                    content: contentBase64,
                    branch: GITHUB_BRANCH
                };

                if (this.fileSha) {
                    body.sha = this.fileSha;
                }

                const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `token ${this.githubToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });

                if (response.ok) {
                    const result = await response.json();
                    this.fileSha = result.content.sha;
                    alert("Успешно! Изменения отправлены на GitHub. Через 1-2 минуты сайт обновится у всех.");
                } else {
                    const err = await response.json();
                    if (response.status === 401 || response.status === 403) {
                        alert("Ошибка доступа! Неверный токен. Попробуй ввести его заново.");
                        localStorage.removeItem("gdl_admin_token");
                        this.githubToken = "";
                    } else {
                        alert("Ошибка сохранения: " + err.message);
                    }
                }
            } catch (e) {
                console.error(e);
                alert("Ошибка сети при отправке на GitHub.");
            } finally {
                this.saving = false;
            }
        },

        updateRanks() {
            this.list.forEach((lvl, index) => {
                lvl.rank = index + 1;
            });
        },

        /* DRAG AND DROP LOGIC */
        onDragStart(e, index) {
            if (!this.isAdmin) return;
            this.draggedIndex = index;
        },

        onDrop(e, targetIndex) {
            if (!this.isAdmin || this.draggedIndex === null) return;
            const itemToMove = this.list.splice(this.draggedIndex, 1)[0];
            this.list.splice(targetIndex, 0, itemToMove);
            this.draggedIndex = null;
            this.updateRanks();
        },

        addNewLevel() {
            if (!this.newLevel.name) return;
            const level = { ...this.newLevel, records: [], rank: this.list.length + 1 };
            this.list.push(level);
            this.updateRanks();
            this.selectedLevel = level;
            this.newLevel = { name: "", author: "", verifier: "", ytid: "" };
        },

        deleteLevel(index) {
            this.list.splice(index, 1);
            this.updateRanks();
        },

        addRecord() {
            if (!this.selectedLevel || !this.newRecord.user) return;
            if (!this.selectedLevel.records) this.selectedLevel.records = [];
            this.selectedLevel.records.push({ ...this.newRecord });
            this.newRecord = { user: "", percent: 100, link: "" };
        },

        deleteRecord(index) {
            if (this.selectedLevel && this.selectedLevel.records) {
                this.selectedLevel.records.splice(index, 1);
            }
        },

        getThumbnail(ytid) {
            return ytid ? `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg` : 'https://i.imgur.com/6VBx3io.png';
        }
    }
};
