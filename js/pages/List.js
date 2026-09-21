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
            <div class="list-container">
                <div class="list">
                    <template v-for="(level, index) in list" :key="index">
                        <div 
                            class="level" 
                            :class="{ selected: selectedLevel && selectedLevel.name === level.name }"
                            @click="selectedLevel = level"
                        >
                            <a :href="level.video || '#'" target="_blank" class="video" @click.stop>
                                <img :src="getThumbnail(level.ytid)" alt="">
                            </a>
                            <div class="meta">
                                <h1>#{{ level.rank }} {{ level.name }}</h1>
                                <p>by <strong>{{ level.author || 'Unknown' }}</strong></p>
                            </div>
                        </div>
                    </template>
                </div>

                <div class="meta-container" v-if="selectedLevel">
                    <div class="meta">
                        <div class="card">
                            <h1>#{{ selectedLevel.rank }} — {{ selectedLevel.name }}</h1>
                            <p>Created by <strong>{{ selectedLevel.author || 'Unknown' }}</strong></p>
                            <p v-if="selectedLevel.verifier">Verified by <strong>{{ selectedLevel.verifier }}</strong></p>

                            <div class="video-container" v-if="selectedLevel.ytid">
                                <iframe :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" frameborder="0" allowfullscreen></iframe>
                            </div>

                            <h2>Records ({{ (selectedLevel.records || []).length }})</h2>
                            <div class="records">
                                <div v-for="(rec, idx) in (selectedLevel.records || [])" :key="idx" class="record">
                                    <div class="user">
                                        <strong>{{ rec.user }}</strong> — {{ rec.percent }}%
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
        list: [],
        players: [],
        loading: true,
        selectedLevel: null
    }),

    async mounted() {
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
                    this.list = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                } else {
                    const fetchListFn = ContentModule.fetchList || (async () => []);
                    const raw = await fetchListFn();
                    this.list = raw.map(i => typeof i === 'string' ? { name: i, author: "Unknown", records: [] } : i);
                }

                // 2. Загрузка игроков (СТРОГО БЕЗ ПРОБЕЛОВ)
                let resPlayers = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_players.json?ref=${GITHUB_BRANCH}`);
                if (resPlayers.status === 404) {
                    resPlayers = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/_players.json?ref=${GITHUB_BRANCH}`);
                }

                if (resPlayers.ok) {
                    const data = await resPlayers.json();
                    this.players = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                }

                // Проставляем ранги
                if (Array.isArray(this.list)) {
                    this.list.forEach((lvl, i) => lvl.rank = i + 1);
                    if (this.list.length > 0) this.selectedLevel = this.list[0];
                }
            } catch (e) {
                console.error("Ошибка:", e);
            } finally {
                this.loading = false;
            }
        },

        getThumbnail(ytid) {
            return ytid ? `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg` : 'https://i.imgur.com/6VBx3io.png';
        }
    }
};
