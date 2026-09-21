import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';

// 🔑 ВСТАВЬ СЮДА СВОЙ ТОКЕН GITHUB
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
    
    toggleDark() {
        this.dark = !this.dark;
    },
    
    toggleAdmin() {
        if (this.isAdmin) {
            if (confirm("Выйти из режима админа?")) {
                this.isAdmin = false;
                localStorage.removeItem('gdl_is_admin');
                location.reload();
            }
        } else {
            const input = prompt("Введите GitHub Токен для входа:");
            if (!input) return;

            if (input.trim() === MY_GITHUB_TOKEN.trim()) {
                this.isAdmin = true;
                localStorage.setItem('gdl_is_admin', 'true');
                alert("Успешный вход!");
                location.reload();
            } else {
                alert("Неверный токен!");
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
