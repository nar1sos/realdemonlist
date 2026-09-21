import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';

// 🔑 ВСТАВЬ СЮДА СВОЙ ТОКЕН GITHUB (ghp_...)
const MY_GITHUB_TOKEN = "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"; 

const routes = [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

const store = Vue.reactive({
    dark: true,
    isAdmin: localStorage.getItem('gdl_is_admin') === 'true',
    githubToken: MY_GITHUB_TOKEN, // Токен сразу зашит в систему
    
    toggleDark() {
        this.dark = !this.dark;
    },
    
    toggleAdmin() {
        if (this.isAdmin) {
            if (confirm("Выйти из режима админа?")) {
                this.isAdmin = false;
                localStorage.removeItem('gdl_is_admin');
                localStorage.removeItem('gdl_gh_token');
                location.reload();
            }
        } else {
            const input = prompt("Введите пароль/токен админа:");
            if (!input) return;

            // Проверяем, совпадает ли введённый текст с твоим зашитым токеном
            if (input.trim() === MY_GITHUB_TOKEN.trim()) {
                this.isAdmin = true;
                localStorage.setItem('gdl_is_admin', 'true');
                localStorage.setItem('gdl_gh_token', MY_GITHUB_TOKEN.trim());
                alert("Успешный вход!");
                location.reload();
            } else {
                alert("Неверный токен/пароль!");
            }
        }
    }
});

const app = Vue.createApp({
    data() {
        return {
            store,
        };
    },
});

app.use(router);
app.mount('#app');
