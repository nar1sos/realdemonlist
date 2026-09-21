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
                <div class="list-content">
                    <!-- ЛЕВАЯ КОЛОНКА: СПИСОК УРОВНЕЙ -->
                    <section class="list">
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
                    </section>

                    <!-- ПРАВАЯ КОЛОНКА: ИНФОРМАЦИЯ И РЕКОРДЫ -->
                    <section class="meta-container" v-if="selectedLevel">
                        <div class="meta">
                            <div class="card">
                                <h1>#{{ selectedLevel.rank }} — {{ selectedLevel.name }}</h1>
                                <p>Created by <strong>{{ selectedLevel.author || 'Unknown' }}</strong></p>
                                <p v-if="selectedLevel.verifier">Verified by <strong>{{ selectedLevel.verifier }}</strong></p>

                                <div class="video-container" v-if="selectedLevel.ytid" style="margin-top: 15px;">
                                    <iframe :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" frameborder="0" allowfullscreen style="width:100%; aspect-ratio:16/9;"></iframe>
                                </div>

                                <div class="records-container" style="margin-top: 20px;">
                                    <h2>Records ({{ (selectedLevel.records || []).length }})</h2>
                                    <div class="records">
                                        <div v-for="(rec, idx) in (selectedLevel.records || [])" :key="idx" class="record" style="display:flex; justify-content:space-between; margin-bottom:8px;">
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
                    </section>
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
                let loadedList = [];

                // Загрузка с GitHub API
                try {
                    let resList = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json?ref=${GITHUB_BRANCH}`);
                    if (resList.status === 404) {
                        resList = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/_list.json?ref=${GITHUB_BRANCH}`);
                    }

                    if (resList.ok) {
                        const data = await resList.json();
                        loadedList = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                    }
                } catch (err) {
                    console.warn("Не удалось загрузить с GitHub API, используем локальный файл", err);
                }

                // Фоллбек на content.js
                if (!loadedList || loadedList.length === 0) {
                    const fetchListFn = ContentModule.fetchList || (async () => []);
                    loadedList = await fetchListFn();
                }

                // Нормализация данных
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
                console.error("Ошибка при обработке данных:", e);
            } finally {
                this.loading = false;
            }
        },

        getThumbnail(ytid) {
            return ytid ? `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg` : 'https://i.imgur.com/6VBx3io.png';
        }
    }
};
