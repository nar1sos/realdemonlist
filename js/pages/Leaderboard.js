import Spinner from "../components/Spinner.js";

const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist"; // 👈 ЗАМЕНИ НА ИМЯ РЕПОЗИТОРИЯ
const GITHUB_BRANCH = "main";

export default {
    components: { Spinner },
    template: `
        <div class="gdl-root">
            <main v-if="loading">
                <Spinner />
            </main>

            <div v-else class="page-leaderboard">
                <!-- ПАНЕЛЬ АДМИНА -->
                <div v-if="currentUser && currentUser.isAdmin" class="admin-bar" style="margin-bottom: 15px;">
                    <button @click="savePlayersToGithub" :disabled="saving" style="background: #28a745; color: white; padding: 8px 15px; cursor: pointer;">
                        {{ saving ? 'Сохранение...' : '🚀 Сохранить Лидеборд на GitHub' }}
                    </button>
                </div>

                <div class="board-container">
                    <div class="board">
                        <!-- Форма добавления нового игрока вручную -->
                        <div v-if="currentUser && currentUser.isAdmin" class="admin-add-box" style="margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;">
                            <h3>➕ Добавить игрока в Лидеборд</h3>
                            <form @submit.prevent="addPlayer" style="display: flex; gap: 8px;">
                                <input v-model="newPlayerName" placeholder="Никнейм игрока" required style="flex: 1;" />
                                <button type="submit">Добавить</button>
                            </form>
                        </div>

                        <!-- СПИСОК ИГРОКОВ -->
                        <div 
                            v-for="(player, index) in sortedPlayers" 
                            :key="index" 
                            class="player"
                            :class="{ selected: selectedPlayer && selectedPlayer.name === player.name }"
                            @click="selectedPlayer = player"
                            style="cursor: pointer;"
                        >
                            <div class="rank">#{{ index + 1 }}</div>
                            <div class="name">{{ player.name }}</div>
                            <div class="score">{{ player.score }} pts</div>
                            <button v-if="currentUser && currentUser.isAdmin" class="delete-btn" @click.stop="deletePlayer(player.name)" style="color: red; background: none; border: none; font-size: 16px; cursor: pointer;">✕</button>
                        </div>
                    </div>

                    <!-- ПРОФИЛЬ ИГРОКА И ЕГО ПРОЙДЕННЫЕ УРОВНИ -->
                    <div class="meta-container" v-if="selectedPlayer">
                        <div class="inner">
                            <h1>{{ selectedPlayer.name }}</h1>
                            <p>Total Points: <strong>{{ selectedPlayer.score }}</strong></p>

                            <h2>Completed Levels & Records ({{ (selectedPlayer.records || []).length }})</h2>
                            <div class="records">
                                <div v-for="(rec, idx) in (selectedPlayer.records || [])" :key="idx" class="record">
                                    <div class="user">
                                        <strong>#{{ rec.rank }} {{ rec.level }}</strong> — {{ rec.percent }}%
                                    </div>
                                    <div class="link">
                                        <a v-if="rec.link" :href="rec.link" target="_blank">Video</a>
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
        players: [],
        loading: true,
        saving: false,
        selectedPlayer: null,
        fileShaPlayers: "",
        newPlayerName: "",
        currentUser: null
    }),

    computed: {
        sortedPlayers() {
            return [...this.players].sort((a, b) => b.score - a.score);
        }
    },

    async mounted() {
        this.currentUser = JSON.parse(localStorage.getItem("gdl_user") || "null");
        await this.loadPlayers();
    },

    methods: {
        async loadPlayers() {
            try {
                let res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_players.json?ref=${GITHUB_BRANCH}`);
                if (res.status === 404) {
                    res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/_players.json?ref=${GITHUB_BRANCH}`);
                }

                if (res.ok) {
                    const data = await res.json();
                    this.fileShaPlayers = data.sha;
                    this.players = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                }
                
                if (this.sortedPlayers.length > 0) {
                    this.selectedPlayer = this.sortedPlayers[0];
                }
            } catch (e) {
                console.error("Ошибка загрузки лидеборда:", e);
            } finally {
                this.loading = false;
            }
        },

        addPlayer() {
            if (!this.newPlayerName) return;
            const exists = this.players.find(p => p.name.toLowerCase() === this.newPlayerName.toLowerCase());
            if (exists) {
                alert("Игрок с таким ником уже существует!");
                return;
            }
            const p = { name: this.newPlayerName, score: 0, records: [] };
            this.players.push(p);
            this.selectedPlayer = p;
            this.newPlayerName = "";
        },

        deletePlayer(playerName) {
            this.players = this.players.filter(p => p.name !== playerName);
            if (this.selectedPlayer && this.selectedPlayer.name === playerName) {
                this.selectedPlayer = this.sortedPlayers[0] || null;
            }
        },

        async savePlayersToGithub() {
            if (!this.currentUser || !this.currentUser.token) {
                alert("Ошибка авторизации!");
                return;
            }

            this.saving = true;
            try {
                const jsonString = JSON.stringify(this.players, null, 2);
                const utf8Bytes = new TextEncoder().encode(jsonString);
                let binary = '';
                utf8Bytes.forEach(b => binary += String.fromCharCode(b));
                const contentBase64 = btoa(binary);

                const body = {
                    message: "Update _players.json via Leaderboard Admin Panel",
                    content: contentBase64,
                    branch: GITHUB_BRANCH
                };
                if (this.fileShaPlayers) body.sha = this.fileShaPlayers;

                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_players.json`, {
                    method: "PUT",
                    headers: { "Authorization": `token ${this.currentUser.token}`, "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    const data = await res.json();
                    this.fileShaPlayers = data.content.sha;
                    alert("Лидеборд успешно обновлен на GitHub!");
                } else {
                    const err = await res.json();
                    alert("Ошибка: " + err.message);
                }
            } catch (e) {
                alert("Ошибка сохранения: " + e.message);
            } finally {
                this.saving = false;
            }
        }
    }
};
