import './assets/main.css'

import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App);

app.use(PrimeVue, {
    unstyled: true
});

app.use(createPinia());

app.mount('#app')
