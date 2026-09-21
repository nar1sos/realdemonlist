import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";

export default {
    components: { Spinner },
    template: `
        <div class="gdl-root">
            <main v-if="loading">
                <Spinner />
            </main>

            <div v-else class="page-list">
                <!-- ПАНЕЛЬ АДМИНА -->
                <div v-if="currentUser && currentUser.isAdmin" class="admin-bar" style="margin-bottom: 15px;">
                    <button @click="saveAllToGithub" :disabled="saving" class="gdl-btn" style="background: #28a745; color: white; padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer;">
                        {{ saving ? 'Сохранение...' : '🚀 Опубликовать изменения на GitHub' }}
                    </button>
                </div>

                <div class="list-container">
                    <!-- СПИСОК УРОВНЕЙ -->
                    <div class="list">
                        <template v-for="(level, index) in list" :key="index">
                            <div 
                                class="level" 
                                :class="{ selected: selectedLevel && selectedLevel.name === level.name }"
                                :draggable="currentUser && currentUser.isAdmin"
                                @dragstart="onDragStart($event, index)"
                                @dragover.prevent
                                @drop="onDrop($event, index)"
                                @click="selectedLevel = level"
                            >
                                <a :href="level.video || '#'" target="_blank" class="video" @click.stop>
                                    <img :src="getThumbnail(level.ytid)" alt="">
                                </a>
                                <div class="meta">
                                    <p>#{{ level.rank }}</p>
                                    <h2>{{ level.name }}</h2>
                                    <p>By {{ level.author || 'Unknown' }} <span v-if="level.verifier">| Verified by {{ level.verifier }}</span></p>
                                </div>
                                <button v-if="currentUser && currentUser.isAdmin" class="delete-btn" @click.stop="deleteLevel(index)">✕</button>
                            </div>
                        </template>

                        <!-- Форма добавления уровня -->
                        <div v-if="currentUser && currentUser.isAdmin" class="admin-add-box" style="margin-top: 20px; border-top: 1px solid #444; padding-top: 10px;">
                            <h3>➕ Добавить уровень</h3>
                            <form @submit.prevent="addNewLevel" style="display: flex; flex-direction: column; gap: 8px;">
                                <input v-model="newLevel.name" placeholder="Название" required />
                                <input v-model="newLevel.author" placeholder="Автор" required />
                                <input v-model="newLevel.verifier" placeholder="Верификатор" />
                                <input v-model="newLevel.ytid" placeholder="YouTube Video ID" />
                                <button type="submit">Добавить в список</button>
                            </form>
                        </div>
                    </div>

                    <!-- ДЕТАЛИ УРОВНЯ И РЕКОРДЫ -->
                    <div class="meta-container" v-if="selectedLevel">
                        <div class="inner">
                            <h1>#{{ selectedLevel.rank }} — {{ selectedLevel.name }}</h1>
                            <p>Created by <strong>{{ selectedLevel.author || 'Unknown' }}</strong></p>
                            <p v-if="selectedLevel.verifier">Verified by <strong>{{ selectedLevel.verifier }}</strong></p>

                            <div class="video-container" v-if="selectedLevel.ytid">
                                <iframe :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" frameborder="0" allowfullscreen></iframe>
                            </div>

                            <!-- Добавление рекорда -->
                            <div v-if="currentUser && currentUser.isAdmin" class="admin-add-box" style="margin-bottom: 15px;">
                                <h3>➕ Добавить рекорд игроку</h3>
                                <form @submit.prevent="addRecord" style="display: flex; flex-direction: column; gap: 6px;">
                                    <input v-model="newRecord.user" placeholder="Имя игрока" required />
                                    <input v-model.number="newRecord.percent" type="number" min="1" max="100" placeholder="Процент (%)" required />
                                    <input v-model="newRecord.link" placeholder="Ссылка на видео" />
                                    <button type="submit">Засчитать рекорд</button>
                                </form>
                            </div>

                            <h2>Records ({{ (selectedLevel.records || []).length }})</h2>
                            <div class="records">
                                <div v-for="(rec, idx) in (selectedLevel.records || [])" :key="idx" class="record">
                                    <div class="user">
                                        <strong>{{ rec.user }}</strong> — {{ rec.percent }}%
                                    </div>
                                    <div class="link">
                                        <a v-if="rec.link" :href="rec.link" target="_blank">Video</a>
                                        <button v-if="currentUser && currentUser.isAdmin" @click="deleteRecord(idx)" style="color: red; background: none; border: none; cursor: pointer; margin-left: 8px;">✕</button>
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
        players: [],
        loading: true,
        saving: false,
        selectedLevel: null,
        draggedIndex: null,
        fileShaList: "",
        fileShaPlayers: "",
        currentUser: null,
        newLevel: { name: "", author: "", verifier: "", ytid: "" },
        newRecord: { user: "", percent: 100, link: "" }
    }),

    async mounted() {
        this.currentUser = JSON.parse(localStorage.getItem("gdl_user") || "null");
        await this.loadAllData();
    },

    methods: {
        async loadAllData() {
            try {
                // 1. Загрузка списка уровней
                let resList = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json?ref=${GITHUB_BRANCH}`);
                if (resList.status === 404) {
                    resList = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/_list.json?ref=${GITHUB_BRANCH}`);
                }

                if (resList.ok) {
                    const data = await resList.json();
                    this.fileShaList = data.sha;
                    this.list = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                } else {
                    const fetchListFn = ContentModule.fetchList || (async () => []);
                    const rawList = await fetchListFn();
                    
                    // Преобразуем строковый массив из content.js в объекты при необходимости
                    this.list = rawList.map(item => {
                        if (typeof item === 'string') {
                            return { name: item, author: "Unknown", records: [] };
                        }
                        return item;
                    });
                }

                // 2. Загрузка игроков
                let resPlayers = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_players.json?ref=${GITHUB_BRANCH}`);
                if (resPlayers.status === 404) {
                    resPlayers = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/_players.json?ref=${GITHUB_BRANCH}`);
                }

                if (resPlayers.ok) {
                    const data = await resPlayers.json();
                    this.fileShaPlayers = data.sha;
                    this.players = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                } else {
                    const fetchLeaderboardFn = ContentModule.fetchLeaderboard || (async () => []);
                    this.players = await fetchLeaderboardFn();
                }

                this.updateRanksAndScores();
                if (this.list.length > 0) this.selectedLevel = this.list[0];
            } catch (e) {
                console.error("Ошибка загрузки:", e);
            } finally {
                this.loading = false;
            }
        },

        updateRanksAndScores() {
            if (!Array.isArray(this.list)) return;

            // Пересчет рангов
            this.list.forEach((lvl, idx) => {
                if (typeof lvl === 'object' && lvl !== null) {
                    lvl.rank = idx + 1;
                }
            });

            // Обновление очков игроков
            if (Array.isArray(this.players) && this.players.length > 0) {
                this.players.forEach(player => {
                    player.records = [];
                    player.score = 0;

                    this.list.forEach(lvl => {
                        if (lvl && lvl.records) {
                            const rec = lvl.records.find(r => r.user && r.user.toLowerCase() === player.name.toLowerCase());
                            if (rec) {
                                const pts = Math.max(Math.round(100 - (lvl.rank - 1) * 2), 5);
                                player.records.push({
                                    level: lvl.name,
                                    rank: lvl.rank,
                                    percent: rec.percent,
                                    link: rec.link
                                });
                                if (rec.percent === 100) {
                                    player.score += pts;
                                }
                            }
                        }
                    });
                });
            }
        },

        onDragStart(e, index) {
            if (!this.currentUser || !this.currentUser.isAdmin) return;
            this.draggedIndex = index;
        },

        onDrop(e, targetIndex) {
            if (!this.currentUser || !this.currentUser.isAdmin || this.draggedIndex === null) return;
            const moved = this.list.splice(this.draggedIndex, 1)[0];
            this.list.splice(targetIndex, 0, moved);
            this.draggedIndex = null;
            this.updateRanksAndScores();
        },

        addNewLevel() {
            if (!this.newLevel.name) return;
            const lvl = { ...this.newLevel, records: [], rank: this.list.length + 1 };
            this.list.push(lvl);
            this.updateRanksAndScores();
            this.selectedLevel = lvl;
            this.newLevel = { name: "", author: "", verifier: "", ytid: "" };
        },

        deleteLevel(idx) {
            this.list.splice(idx, 1);
            this.updateRanksAndScores();
        },

        addRecord() {
            if (!this.selectedLevel || !this.newRecord.user) return;
            if (!this.selectedLevel.records) this.selectedLevel.records = [];
            
            this.selectedLevel.records.push({ ...this.newRecord });

            let player = this.players.find(p => p.name && p.name.toLowerCase() === this.newRecord.user.toLowerCase());
            if (!player) {
                player = { name: this.newRecord.user, score: 0, records: [] };
                this.players.push(player);
            }

            this.updateRanksAndScores();
            this.newRecord = { user: "", percent: 100, link: "" };
        },

        deleteRecord(idx) {
            this.selectedLevel.records.splice(idx, 1);
            this.updateRanksAndScores();
        },

        async saveAllToGithub() {
            if (!this.currentUser || !this.currentUser.token) {
                alert("Ошибка! Токен авторизации отсутствует.");
                return;
            }

            this.saving = true;
            try {
                await this.uploadFileToGithub("data/_list.json", this.list, this.fileShaList, this.currentUser.token);
                await this.uploadFileToGithub("data/_players.json", this.players, this.fileShaPlayers, this.currentUser.token);
                alert("Успешно сохранено на GitHub!");
            } catch (e) {
                alert("Ошибка сохранения: " + e.message);
            } finally {
                this.saving = false;
            }
        },

        async uploadFileToGithub(filepath, contentObj, sha, token) {
            const jsonString = JSON.stringify(contentObj, null, 2);
            const utf8Bytes = new TextEncoder().encode(jsonString);
            let binary = '';
            utf8Bytes.forEach(b => binary += String.fromCharCode(b));
            const contentBase64 = btoa(binary);

            const body = {
                message: `Update ${filepath}`,
                content: contentBase64,
                branch: GITHUB_BRANCH
            };
            if (sha) body.sha = sha;

            const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filepath}`, {
                method: "PUT",
                headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }
        },

        getThumbnail(ytid) {
            return ytid ? `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg` : 'https://i.imgur.com/6VBx3io.png';
        }
    }
};
