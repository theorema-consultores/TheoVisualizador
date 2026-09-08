import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: { main: 'index.html', balanceteReceita: 'dashboards/balancete-receita/index.html' }
    }
  }
});
