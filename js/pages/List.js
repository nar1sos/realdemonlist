import { fetchList, fetchAdmins } from '../content.js';
import { getLocalList, setLocalList } from '../storage.js';
import { embed, localize } from '../util.js';
import { score } from '../score.js';

// ⚙️ НАСТРОЙКИ ГИТХАБА
const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";

// 🔑 Твой пароль для входа в админку
const ADMIN_PASS = "29564329981";

// Токен берется из памяти браузера (GitHub его не увидит в коде и не забанит!)
let GITHUB_TOKEN = localStorage.getItem("my_gh_token") || "";

export default {
    template: `
        <main v-if="loading">
            <p>Загрузка...</p>
        </main>
        <main v-else class="page-list">
            <section class="list-container">
                <table>
                    <tr v-for="(err, i) in errors" :key="i">
                        <td class="rank">#</td>
                        <td class="level">
                            <a class="type-label-lg">{{ err }}</a>
                        </td>
                    </tr>
                    <tr v-for="([level, err], i) in list" :key="i">
                        <td class="rank">
                            <p class="type-label-lg">#{{ i + 1 }}</p>
                        </td>
                        <td class="level" :class="{ 'active': selected === i }">
                            <button @click="selected = i">
                                <span class="type-label-lg">{{ level.name }}</span>
                                <span class="type-label-md">{{ level.author }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </section>
            
            <section class="level-container">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <p class="author">Создатель: <b>{{ level.author }}</b> | Вертификатор: <b>{{ level.verifier }}</b></p>
                    
                    <div class="video-container" v-if="level.verification">
                        <iframe :src="embed(level.verification)" frameborder="0" allowfullscreen></iframe>
                    </div>

                    <div class="records" v-if="level.records && level.records.length">
                        <h2>Рекорды ({{ level.records.length }})</h2>
                        <ul>
                            <li v-for="(rec, index) in level.records" :key="index">
                                <b>{{ rec.user }}</b> — {{ rec.percent }}% 
                                <a :href="rec.link" target="_blank" v-if="rec.link">📹 Видео</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- 🔒 АДМИН ПАНЕЛЬ -->
                <div class="admin-panel" style="margin-top: 30px; padding: 20px; border: 1px solid #444; background: #111; border-radius: 8px;">
                    <h2>🔒 Панель Управления</h2>
                    <div v-if="!isAdmin">
                        <button @click="login" style="padding: 10px 20px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 4px;">Войти в Админку</button>
                    </div>
                    <div v-else>
                        <p style="color: #4CAF50;">✅ Авторизован как Администратор</p>
                        <button @click="saveChanges" style="padding: 10px 20px; cursor: pointer; background: #2196F3; color: white; border: none; border-radius: 4px; margin-right: 10px;">💾 Сохранить изменения на GitHub</button>
                        <button @click="logout" style="padding: 10px 20px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 4px;">Выйти</button>
                    </div>
                </div>
            </section>
        </main>
    `,
    data() {
        return {
            list: [],
            editors: [],
            loading: true,
            selected: 0,
            errors: [],
            isAdmin: false,
        };
    },
    computed: {
        level() {
            return this.list[this.selected] ? this.list[this.selected][0] : null;
        }
    },
    async mounted() {
        // Загрузка списка
        this.list = await fetchList();
        this.editors = await fetchAdmins();
        this.loading = false;

        // Проверка сессии админа
        if (sessionStorage.getItem("is_admin") === "true") {
            this.isAdmin = true;
        }
    },
    methods: {
        embed,
        localize,
        score,

        // Функция входа по паролю
        login() {
            const pass = prompt("Введите пароль админа:");
            if (pass === ADMIN_PASS) {
                // Если пароль верный, проверяем/запрашиваем токен
                if (!GITHUB_TOKEN) {
                    const token = prompt("Введите ваш GitHub Personal Access Token (вводится 1 раз и сохраняется у вас в браузере):");
                    if (token) {
                        GITHUB_TOKEN = token.trim();
                        localStorage.setItem("my_gh_token", GITHUB_TOKEN);
                    } else {
                        alert("Без токена GitHub сохранение работать не будет!");
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

        // Функция выхода
        logout() {
            this.isAdmin = false;
            sessionStorage.removeItem("is_admin");
            alert("Вы вышли из админки.");
        },

        // Функция сохранения данных на GitHub
        async saveChanges() {
            if (!GITHUB_TOKEN) {
                const token = prompt("GitHub Token не найден. Введите ваш токен:");
                if (token) {
                    GITHUB_TOKEN = token.trim();
                    localStorage.setItem("my_gh_token", GITHUB_TOKEN);
                } else {
                    alert("Ошибка: отсутствует токен.");
                    return;
                }
            }

            try {
                // Преобразуем текущий список в JSON
                const rawList = this.list.map(item => item[0]);
                const content = JSON.stringify(rawList, null, 4);

                // 1. Получаем текущий SHA файла data/_list.json из GitHub
                const getFileUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json?ref=${GITHUB_BRANCH}`;
                const fileRes = await fetch(getFileUrl, {
                    headers: {
                        "Authorization": `token ${GITHUB_TOKEN}`,
                        "Accept": "application/vnd.github.v3+json"
                    }
                });

                if (!fileRes.ok) {
                    const errData = await fileRes.json();
                    throw new Error(`GitHub (${fileRes.status}): ${errData.message}`);
                }

                const fileData = await fileRes.json();
                const sha = fileData.sha;

                // 2. Отправляем обновленный файл на GitHub
                const updateUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/data/_list.json`;
                const putRes = await fetch(updateUrl, {
                    method: "PUT",
                    headers: {
                        "Authorization": `token ${GITHUB_TOKEN}`,
                        "Content-Type": "application/json",
                        "Accept": "application/vnd.github.v3+json"
                    },
                    body: JSON.stringify({
                        message: "Update demonlist via Admin Panel",
                        content: btoa(unescape(encodeURIComponent(content))), // Base64 кодирование
                        sha: sha,
                        branch: GITHUB_BRANCH
                    })
                });

                if (putRes.ok) {
                    alert("Успешно сохранено на GitHub!");
                } else {
                    const errData = await putRes.json();
                    throw new Error(`GitHub (${putRes.status}): ${errData.message}`);
                }
            } catch (err) {
                alert("Ошибка сохранения: " + err.message);
                console.error(err);
            }
        }
    }
};
