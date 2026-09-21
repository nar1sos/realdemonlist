import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';

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
    githubToken: localStorage.getItem('gdl_gh_token') || '',
    
    toggleDark() {
        this.dark = !this.dark;
    },
    toggleAdmin() {
        if (this.isAdmin) {
            if (confirm("Выйти из режима админа?")) {
                this.isAdmin = false;
                this.githubToken = '';
                localStorage.removeItem('gdl_is_admin');
                localStorage.removeItem('gdl_gh_token');
                location.reload();
            }
        } else {
            const token = prompt("Введите ваш Personal Access Token от GitHub:");
            if (token) {
                this.githubToken = token;
                this.isAdmin = true;
                localStorage.setItem('gdl_is_admin', 'true');
                localStorage.setItem('gdl_gh_token', token);
                location.reload();
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
