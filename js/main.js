import routes from './routes.js';
import { fetchList } from './content.js';

// ⚙️ НАСТРОЙКИ ГИТХАБА
const GITHUB_USER = "nar1sos";
const GITHUB_REPO = "realdemonlist";
const GITHUB_BRANCH = "main";

// Пароль администратора
const ADMIN_PASS = "29564329981";

// Получаем токен из локального хранилища браузера
let GITHUB_TOKEN = localStorage.getItem("my_gh_token") || "";

const app = Vue.createApp({
    data() {
        return {
            store: {
                dark: localStorage.getItem('dark') === 'true',
            },
            route: window.location.hash,
        };
    },
    computed: {
        ViewComponent() {
            const matchingRoute = routes[this.route] || routes['#/'];
            return matchingRoute;
        },
    },
    methods: {
        toggleDark() {
            this.store.dark = !this.store.dark;
            localStorage.setItem('dark', this.store.dark);
        },
        // Универсальный метод проверки входа
        checkAdmin() {
            return sessionStorage.getItem("is_admin") === "true";
        }
    },
    mounted() {
        window.addEventListener('hashchange', () => {
            this.route = window.location.hash;
        });
    },
});

app.mount('#app');
