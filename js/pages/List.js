import * as ContentModule from "../content.js";
import Spinner from "../components/Spinner.js";

const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";

export default {
    components: { Spinner },
    template: `
        <main v-if="loading">
            <Spinner />
        </main>
        <div v-else class="page-list">
            <!-- ПАНЕЛЬ АДМИНА -->
            <div v-if="currentUser && currentUser.isAdmin" class="admin-bar" style="padding: 10px; background: #1b1b1b; border-bottom: 1px solid #333; margin-bottom: 20px;">
                <button @click="saveAllToGithub" :disabled="saving" style="background: #28a745; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    {{ saving ? 'Сохранение...' : '🚀 Опубликовать изменения на GitHub' }}
                </button>
            </div>

            <div class="list-container">
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
                                <h1>#{{ level.rank }} {{ level.name }}</h1>
                                <p>by <strong>{{ level.author || 'Unknown' }}</strong></p>
                            </div>
                            <button v-if="currentUser && currentUser.isAdmin" @click.stop="deleteLevel(index)" style="background:none; border:none; color:red; cursor:pointer; font-size:16px;">✕</button>
                        </div>
                    </template>

                    <!-- Форма добавления уровня -->
                    <div v-if="currentUser && currentUser.isAdmin" style="padding: 15px; background: #181818; border: 1px solid #333; border-radius: 5px; margin-top: 15px;">
                        <h3 style="margin-top:0;">➕ Добавить уровень</h3>
                        <form @submit.prevent="addNewLevel" style="display:flex; flex-direction:column; gap:8px;">
                            <input v-model="newLevel.name" placeholder="Название уровня" required style="padding:6px; background:#222; color:#fff; border:1px solid #444;" />
                            <input v-model="newLevel.author" placeholder="Автор" required style="padding:6px; background:#222; color:#fff; border:1px solid #444;" />
                            <input v-model="newLevel.verifier" placeholder="Верификатор" style="padding:6px; background:#222; color:#fff; border:1px solid #444;" />
                            <input v-model="newLevel.ytid" placeholder="YouTube Video ID (например: dQw4w9WgXcQ)" style="padding:6px; background:#222; color:#fff; border:1px solid #444;" />
                            <button type="submit" style="padding:8px; background:#007bff; color:#fff; border:none; cursor:pointer;">Добавить</button>
                        </form>
                    </div>
                </div>

                <div class="meta-container" v-if="selectedLevel">
                    <div class="meta">
                        <div class="card" style="padding: 20px; background: #141414; border: 1px solid #222; border-radius: 6px;">
                            <h1>#{{ selectedLevel.rank }} — {{ selectedLevel.name }}</h1>
                            <p>Created by <strong>{{ selectedLevel.author || 'Unknown' }}</strong></p>
                            <p v-if="selectedLevel.verifier">Verified by <strong>{{ selectedLevel.verifier }}</strong></p>

                            <div class="video-container" v-if="selectedLevel.ytid" style="margin: 15px 0;">
                                <iframe :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" frameborder="0" allowfullscreen style="width:100%; height:300px;"></iframe>
                            </div>

                            <!-- Форма добавления рекорда -->
                            <div v-if="currentUser && currentUser.isAdmin" style="margin: 15px 0; padding: 10px; background: #1f1f1f; border-radius: 4px;">
                                <h4 style="margin-top:0;">➕ Засчитать рекорд</h4>
                                <form @submit.prevent="addRecord" style="display:flex; flex-direction:column; gap:6px;">
                                    <input v-model="newRecord.user" placeholder="Никнейм игрока" required style="padding:5px; background:#2b2b2b; color:#fff; border:1px solid #444;" />
                                    <input v-model.number="newRecord.percent" type="number" min="1" max="100" placeholder="Процент (%)" required style="padding:5px; background:#2b2b2b; color:#fff; border:1px solid #444;" />
                                    <input v-model="newRecord.link" placeholder="Ссылка на доказательство (видео)" style="padding:5px; background:#2b2b2b; color:#fff; border:1px solid #444;" />
                                    <button type="submit" style="padding:6px; background:#28a745; color:#fff; border:none; cursor:pointer;">Сохранить рекорд</button>
                                </form>
                            </div>

                            <h2>Records ({{ (selectedLevel.records || []).length }})</h2>
                            <div class="records">
                                <div v-for="(rec, idx) in (selectedLevel.records || [])" :key="idx" class="record" style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom: 1px solid #222;">
                                    <div class="user">
                                        <strong>{{ rec.user }}</strong> — {{ rec.percent }}%
                                    </div>
                                    <div class="link">
                                        <a v-if="rec.link" :href="rec.link" target="_blank">Video</a>
                                        <button v-if="currentUser && currentUser.isAdmin" @click="deleteRecord(idx)" style="color:red; background:none; border:none; cursor:pointer; margin-left:8px;">✕</button>
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
                // 1. Загрузка _list.json
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
                    this.list = rawList.map(item => typeof item === 'string' ? { name: item, author: "Unknown", records: [] } : item);
                }

                // 2. Загрузка _players.json (БЕЗ ПРОБЕЛОВ В URL)
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

            this.list.forEach((lvl, idx) => {
                if (typeof lvl === 'object' && lvl !== null) {
                    lvl.rank = idx + 1;
                }
            });

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
