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
        <div v-else class="gdlf-container">
            <!-- Жесткие 3-колоночные стили Global Demonlist -->
            <style>
                .gdlf-container {
                    max-width: 1450px;
                    margin: 20px auto;
                    padding: 0 15px;
                    color: #fff;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                }
                .gdlf-grid {
                    display: grid;
                    grid-template-columns: 300px 1fr 420px;
                    gap: 20px;
                    align-items: start;
                }

                /* ЛЕВАЯ КОЛОНКА: ПРАВИЛА */
                .gdlf-rules-card {
                    background: #111318;
                    border: 1px solid #222630;
                    border-radius: 8px;
                    padding: 18px;
                    position: sticky;
                    top: 20px;
                }
                .gdlf-rules-card h2 {
                    margin-top: 0;
                    font-size: 1.2rem;
                    border-bottom: 1px solid #222630;
                    padding-bottom: 10px;
                    color: #fff;
                }
                .gdlf-rules-list {
                    margin: 0;
                    padding-left: 18px;
                    color: #a0aec0;
                    font-size: 0.88rem;
                    line-height: 1.5;
                }
                .gdlf-rules-list li {
                    margin-bottom: 8px;
                }

                /* ЦЕНТРАЛЬНАЯ КОЛОНКА: ТОП УРОВНЕЙ */
                .gdlf-list-col {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .gdlf-level-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: #111318;
                    border: 1px solid #222630;
                    border-radius: 8px;
                    padding: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .gdlf-level-card:hover, .gdlf-level-card.active {
                    background: #1a1d26;
                    border-color: #3b82f6;
                }
                .gdlf-thumb {
                    width: 110px;
                    height: 62px;
                    object-fit: cover;
                    border-radius: 6px;
                }
                .gdlf-level-info h3 {
                    margin: 0 0 4px 0;
                    font-size: 1.05rem;
                    font-weight: 700;
                }
                .gdlf-level-info p {
                    margin: 0;
                    color: #8a94a6;
                    font-size: 0.85rem;
                }

                /* ПРАВАЯ КОЛОНКА: ИНФОРМАЦИЯ О ВЫБРАННОМ УРОВНЕ */
                .gdlf-info-card {
                    background: #111318;
                    border: 1px solid #222630;
                    border-radius: 8px;
                    padding: 20px;
                    position: sticky;
                    top: 20px;
                }
                .gdlf-info-card h1 {
                    margin-top: 0;
                    font-size: 1.4rem;
                }
                .gdlf-record-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #1e222d;
                    font-size: 0.9rem;
                }
            </style>

            <div class="gdlf-grid">
                <!-- 1. ЛЕВАЯ КОЛОНКА: ПРАВИЛА -->
                <aside class="gdlf-rules-card">
                    <h2>📋 Rules & Guidelines</h2>
                    <ol class="gdlf-rules-list">
                        <li>Все рекорды должны иметь видеозапись с кликами/тапами или сырым звуком.</li>
                        <li>Недопустимо использование читов, физических модов или нелегитимных хитбоксов.</li>
                        <li>Рекорд считается принятым только при достижении минимального требуемого процента.</li>
                        <li>Прогресс на уровнях из топ-10 принимается строго от 0%.</li>
                    </ol>
                </aside>

                <!-- 2. СЕРЕДИНА: САМ ТОП УРОВНЕЙ -->
                <main class="gdlf-list-col">
                    <div 
                        v-for="(level, index) in list" 
                        :key="index"
                        class="gdlf-level-card"
                        :class="{ active: selectedLevel && selectedLevel.name === level.name }"
                        @click="selectedLevel = level"
                    >
                        <img :src="getThumbnail(level.ytid)" class="gdlf-thumb" alt="">
                        <div class="gdlf-level-info">
                            <h3>#{{ level.rank }} {{ level.name }}</h3>
                            <p>by <strong>{{ level.author || 'Unknown' }}</strong></p>
                        </div>
                    </div>
                </main>

                <!-- 3. СПРАВА: ИНФОРМАЦИЯ ОБ УРОВНЕ -->
                <aside class="gdlf-info-card" v-if="selectedLevel">
                    <h1>#{{ selectedLevel.rank }} — {{ selectedLevel.name }}</h1>
                    <p style="margin: 4px 0; color: #8a94a6;">Created by <strong style="color:#fff;">{{ selectedLevel.author || 'Unknown' }}</strong></p>
                    <p v-if="selectedLevel.verifier" style="margin: 4px 0; color: #8a94a6;">Verified by <strong style="color:#fff;">{{ selectedLevel.verifier }}</strong></p>

                    <div v-if="selectedLevel.ytid" style="margin: 15px 0;">
                        <iframe 
                            :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" 
                            frameborder="0" 
                            allowfullscreen 
                            style="width: 100%; aspect-ratio: 16/9; border-radius: 6px; border: none;"
                        ></iframe>
                    </div>

                    <div style="margin-top: 20px;">
                        <h3 style="font-size: 1.1rem; border-bottom: 1px solid #222630; padding-bottom: 8px; margin-bottom: 10px;">
                            Records ({{ (selectedLevel.records || []).length }})
                        </h3>
                        <div v-for="(rec, idx) in (selectedLevel.records || [])" :key="idx" class="gdlf-record-row">
                            <div><strong>{{ rec.user }}</strong> — {{ rec.percent }}%</div>
                            <a v-if="rec.link" :href="rec.link" target="_blank" style="color: #3b82f6; text-decoration: none;">Video ↗</a>
                        </div>
                        <p v-if="!selectedLevel.records || selectedLevel.records.length === 0" style="color: #666; font-size: 0.85rem; margin: 5px 0;">
                            Рекордов пока нет
                        </p>
                    </div>
                </aside>
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

        getThumbnail(ytid) {
            return ytid ? `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg` : 'https://i.imgur.com/6VBx3io.png';
        }
    }
};
