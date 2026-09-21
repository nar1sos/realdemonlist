import Spinner from "../components/Spinner.js";

const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "НАЗВАНИЕ_РЕПОЗИТОРИЯ";
const GITHUB_BRANCH = "main";

export default {
    components: { Spinner },
    template: `
        <div class="gdl-root">
            <main v-if="loading">
                <Spinner />
            </main>

            <div v-else class="page-leaderboard">
                <div v-if="currentUser && currentUser.isAdmin" class="admin-bar">
                    <button @click="savePlayersToGithub" :disabled="saving">
                        {{ saving ? 'Сохранение...' : '🚀 Сохранить изменения Лидеборда' }}
                    </button>
                </div>

                <div class="board-container">
                    <div class="board">
                        <!-- Добавление игрока в админке -->
                        <div v-if="currentUser && currentUser.isAdmin" class="admin-add-box">
                            <h3>Добавить игрока в Лидеборд</h3>
                            <form @submit.prevent="addPlayer">
                                <input v-model="newPlayerName" placeholder="Никнейм игрока" required />
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
                        >
                            <div class="rank">#{{ index + 1 }}</div>
                            <div class="name">{{ player.name }}</div>
                            <div class="score">{{ player.score }} pts</div>
                            <button v-if="currentUser && currentUser.isAdmin" class="delete-btn" @click.stop="deletePlayer(index)">✕</button>
                        </div>
                    </div>

                    <!-- ДЕТАЛИ ИГРОКА И ЕГО ПРОЙДЕННЫЕ ЛВЛА -->
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
                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_players.json?ref=${GITHUB_BRANCH}`);
                if (res.ok) {
                    const data = await res.json();
                    this.fileShaPlayers = data.sha;
                    this.players = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                }
                if (this.sortedPlayers.length > 0) this.selectedPlayer = this.sortedPlayers[0];
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
                alert("Такой игрок уже есть!");
                return;
            }
            const p = { name: this.newPlayerName, score: 0, records: [] };
            this.players.push(p);
            this.selectedPlayer = p;
            this.newPlayerName = "";
        },

        deletePlayer(idx) {
            this.players.splice(idx, 1);
        },

        async savePlayersToGithub() {
            const token = this.currentUser.token;
            this.saving = true;

            try {
                const jsonString = JSON.stringify(this.players, null, 2);
                const utf8Bytes = new TextEncoder().encode(jsonString);
                let binary = '';
                utf8Bytes.forEach(b => binary += String.fromCharCode(b));
                const contentBase64 = btoa(binary);

                const body = {
                    message: "Update _players.json",
                    content: contentBase64,
                    branch: GITHUB_BRANCH,
                    sha: this.fileShaPlayers
                };

                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_players.json`, {
                    method: "PUT",
                    headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    alert("Лидеборд сохранен!");
                }
            } catch (e) {
                alert("Ошибка сохранения: " + e.message);
            } finally {
                this.saving = false;
            }
        }
    }
};
