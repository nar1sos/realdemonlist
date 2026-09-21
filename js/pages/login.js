export default {
    template: `
        <div class="page-login" style="max-width: 400px; margin: 60px auto; padding: 25px; border: 1px solid #333; border-radius: 8px; background: #181818; color: #fff;">
            <h2 style="margin-top: 0; text-align: center;">Вход для Админа</h2>
            <form @submit.prevent="login" style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px;">Логин:</label>
                    <input v-model="username" placeholder="Введи nar1sos" required style="width: 100%; padding: 8px; box-sizing: border-box; background: #222; color: #fff; border: 1px solid #444;" />
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px;">GitHub Personal Access Token:</label>
                    <input v-model="token" type="password" placeholder="ghp_..." required style="width: 100%; padding: 8px; box-sizing: border-box; background: #222; color: #fff; border: 1px solid #444;" />
                </div>
                <button type="submit" style="padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Войти в аккаунт
                </button>
            </form>
        </div>
    `,
    data: () => ({
        username: "",
        token: ""
    }),
    methods: {
        login() {
            const isAdmin = (this.username.trim().toLowerCase() === "nar1sos");
            const userData = {
                username: this.username.trim(),
                isAdmin: isAdmin,
                token: this.token.trim()
            };
            localStorage.setItem("gdl_user", JSON.stringify(userData));
            if (isAdmin) {
                alert("Добро пожаловать, nar1sos! Режим админа включен.");
            } else {
                alert("Вы вошли как обычный пользователь.");
            }
            window.location.href = "#/";
            window.location.reload();
        }
    }
};
