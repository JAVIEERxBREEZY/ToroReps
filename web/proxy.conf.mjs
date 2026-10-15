export default {
  '/api/**': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: false,
    rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ''),
  },
};
