export default {
    template: `
        <div class="page-login" style="max-width: 400px; margin: 50px auto; padding: 20px;">
            <h2>Вход в аккаунт</h2>
            <form @submit.prevent="login">
                <div style="margin-bottom: 10px;">
                    <label>Логин:</label>
                    <input v-model="username" required style="width: 100%; padding: 8px;" />
                </div>
                <div style="margin-bottom: 10px;">
                    <label>GitHub Personal Token (для админки):</label>
                    <input v-model="token" type="password" placeholder="ghp_..." style="width: 100%; padding: 8px;" />
                </div>
                <button type="submit" style="padding: 10px 20px; cursor: pointer;">Войти</button>
            </form>
        </div>
    `,
    data: () => ({
        username: "",
        token: ""
    }),
    methods: {
        login() {
            const isAdmin = (this.username.toLowerCase() === "nar1sos");
            const userData = {
                username: this.username,
                isAdmin: isAdmin,
                token: this.token
            };
            localStorage.setItem("gdl_user", JSON.stringify(userData));
            alert(isAdmin ? "Добро пожаловать, Админ!" : "Вы вошли как обычный пользователь.");
            window.location.reload();
        }
    }
};
