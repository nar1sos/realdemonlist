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

const app = Vue.createApp({
    data() {
        return {
            store: Vue.reactive({
                dark: localStorage.getItem('dark') === 'true',
                toggleDark() {
                    this.dark = !this.dark;
                    localStorage.setItem('dark', this.dark);
                }
            })
        };
    }
});

// ОБЯЗАТЕЛЬНО: регистрируем VueRouter в приложении
app.use(router);

app.mount('#app');
