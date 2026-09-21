// ⚙️ НАСТРОЙКИ ГИТХАБА
const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";

// 🔑 Твой пароль для входа в админку
const ADMIN_PASS = "29564329981";

// Токен берется из памяти браузера (не светится в коде!)
let GITHUB_TOKEN = localStorage.getItem("my_gh_token") || "";

export default {
    template: `
        <main v-if="loading" style="color: #fff; padding: 20px;">
            <h2>Загрузка демонов...</h2>
        </main>
        <div v-else class="gdl-wrapper" style="padding: 20px; color: #fff;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h1>Demon List</h1>
                
                <div>
                    <button v-if="!isAdmin" @click="login" style="padding: 8px 16px; background: #2ecc71; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                        🔒 Войти в Админку
                    </button>
                    <div v-else style="display: flex; gap: 10px; align-items: center;">
                        <span style="color: #2ecc71; font-weight: bold;">✅ Админ</span>
                        <button @click="openAddModal" style="padding: 8px 14px; background: #2ecc71; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">➕ Добавить уровень</button>
                        <button @click="saveListToGitHub" style="padding: 8px 14px; background: #3498db; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">💾 Сохранить на GitHub</button>
                        <button @click="logout" style="padding: 8px 14px; background: #e74c3c; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Выйти</button>
                    </div>
                </div>
            </div>

            <!-- СПИСОК УРОВНЕЙ -->
            <div style="display: grid; grid-template-columns: 300px 1fr; gap: 20px;">
                
                <div style="background: #181b20; border: 1px solid #333; border-radius: 8px; padding: 10px;">
                    <div 
                        v-for="(lvl, idx) in list" 
                        :key="idx" 
                        @click="selectedLevel = lvl"
                        :style="{
                            padding: '10px',
                            marginBottom: '6px',
                            background: selectedLevel === lvl ? '#2ecc7122' : '#22252b',
                            border: selectedLevel === lvl ? '1px solid #2ecc71' : '1px solid #333',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }"
                    >
                        <strong>#{{ idx + 1 }} {{ lvl.name }}</strong>
                        <div style="font-size: 12px; color: #aaa;">by {{ lvl.author || 'Unknown' }}</div>
                    </div>
                </div>

                <!-- ДЕТАЛИ УРОВНЯ -->
                <div v-if="selectedLevel" style="background: #181b20; border: 1px solid #333; border-radius: 8px; padding: 20px;">
                    <h2>#{{ getRank(selectedLevel) }} — {{ selectedLevel.name }}</h2>
                    <p style="color: #aaa; margin-bottom: 15px;">
                        Создатель: <b>{{ selectedLevel.author || 'Unknown' }}</b> | Верификатор: <b>{{ selectedLevel.verifier || 'Unknown' }}</b>
                    </p>

                    <div v-if="selectedLevel.ytid" style="margin-bottom: 20px;">
                        <iframe 
                            :src="'https://www.youtube.com/embed/' + selectedLevel.ytid" 
                            style="width: 100%; height: 350px; border: none; border-radius: 8px;"
                            allowfullscreen
                        ></iframe>
                    </div>

                    <h3>Рекорды</h3>
                    <div v-if="selectedLevel.records && selectedLevel.records.length" style="margin-top: 10px;">
                        <div v-for="(rec, rIdx) in selectedLevel.records" :key="rIdx" style="background: #22252b; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; display: flex; justify-content: space-between;">
                            <span><b>{{ rec.user }}</b> — {{ rec.percent }}%</span>
                            <a v-if="rec.link" :href="rec.link" target="_blank" style="color: #3498db;">🎬 Видео</a>
                        </div>
                    </div>
                    <p v-else style="color: #666; margin-top: 8px;">Рекордов пока нет.</p>
                </div>

            </div>

            <!-- МОДАЛКА ДОБАВЛЕНИЯ -->
            <div v-if="showModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999;">
                <div style="background:#181b20; border:1px solid #333; padding:24px; border-radius:12px; width:350px; color:#fff;">
                    <h3>Добавить новый уровень</h3>
                    <input v-model="form.name" placeholder="Название уровня" style="width:100%; margin: 8px 0; padding:8px; background:#222; border:1px solid #444; color:#fff; border-radius:4px;" />
                    <input v-model="form.author" placeholder="Создатель" style="width:100%; margin: 8px 0; padding:8px; background:#222; border:1px solid #444; color:#fff; border-radius:4px;" />
                    <input v-model="form.verifier" placeholder="Верификатор" style="width:100%; margin: 8px 0; padding:8px; background:#222; border:1px solid #444; color:#fff; border-radius:4px;" />
                    <input v-model="form.ytid" placeholder="YouTube Video ID (например: dQw4w9WgXcQ)" style="width:100%; margin: 8px 0; padding:8px; background:#222; border:1px solid #444; color:#fff; border-radius:4px;" />
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
                        <button @click="showModal = false" style="padding:6px 12px; background:#444; color:#fff; border:none; border-radius:4px; cursor:pointer;">Отмена</button>
                        <button @click="addLevel" style="padding:6px 12px; background:#2ecc71; color:#000; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Добавить</button>
                    </div>
                </div>
            </div>

        </div>
    `,

    data() {
        return {
            list: [],
            loading: true,
            selectedLevel: null,
            isAdmin: false,
            fileSha: '',
            showModal: false,
            form: { name: '', author: '', verifier: '', ytid: '' }
        };
    },

    async mounted() {
        if (sessionStorage.getItem("is_admin") === "true") {
            this.isAdmin = true;
        }
        await this.loadList();
    },

    methods: {
        getRank(lvl) {
            return this.list.indexOf(lvl) + 1;
        },

        async loadList() {
            try {
                const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json?ref=${GITHUB_BRANCH}`);
                if (res.ok) {
                    const data = await res.json();
                    this.fileSha = data.sha;
                    const decoded = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
                    this.list = JSON.parse(decoded);
                    if (this.list.length > 0) this.selectedLevel = this.list[0];
                }
            } catch (err) {
                console.error("Ошибка загрузки данных:", err);
            } finally {
                this.loading = false;
            }
        },

        login() {
            const pass = prompt("Введите пароль админа:");
            if (pass === ADMIN_PASS) {
                if (!GITHUB_TOKEN) {
                    const token = prompt("Введите ваш GitHub Personal Access Token (сохранится 1 раз у вас в браузере):");
                    if (token) {
                        GITHUB_TOKEN = token.trim();
                        localStorage.setItem("my_gh_token", GITHUB_TOKEN);
                    } else {
                        alert("Без токена нельзя сохранять данные!");
                        return;
                    }
                }
                this.isAdmin = true;
                sessionStorage.setItem("is_admin", "true");
                alert("Успешный вход!");
            } else {
                alert("Неверный пароль!");
            }
        },

        logout() {
            this.isAdmin = false;
            sessionStorage.removeItem("is_admin");
        },

        openAddModal() {
            this.form = { name: '', author: '', verifier: '', ytid: '' };
            this.showModal = true;
        },

        addLevel() {
            if (!this.form.name) return alert("Введите название уровня!");
            const newLvl = {
                name: this.form.name,
                author: this.form.author || 'Unknown',
                verifier: this.form.verifier || '',
                ytid: this.form.ytid || '',
                records: []
            };
            this.list.push(newLvl);
            this.selectedLevel = newLvl;
            this.showModal = false;
        },

        async saveListToGitHub() {
            if (!GITHUB_TOKEN) {
                alert("Ошибка: нет токена GitHub!");
                return;
            }

            try {
                // Получаем актуальный SHA перед отправкой
                const getRes = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json?ref=${GITHUB_BRANCH}`, {
                    headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
                });
                if (getRes.ok) {
                    const fileData = await getRes.json();
                    this.fileSha = fileData.sha;
                }

                const jsonString = JSON.stringify(this.list, null, 4);
                const contentEncoded = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                    return String.fromCharCode('0x' + p1);
                }));

                const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
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
                    alert("Успешно сохранено на GitHub!");
                } else {
                    const err = await response.json();
                    alert(`Ошибка сохранения (${response.status}): ${err.message}`);
                }
            } catch (err) {
                alert("Ошибка: " + err.message);
            }
        }
    }
};
