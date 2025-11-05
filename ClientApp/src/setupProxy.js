
const { createProxyMiddleware } = require('http-proxy-middleware');

const target = process.env.REACT_APP_BACKEND_URL || 'https://localhost:7265';
console.log('[proxy] target:', target);

module.exports = function (app) {
    const appProxy = createProxyMiddleware(
        ['/auth', '/songs', '/api', '/roomHub', '/spotify', '/youtube'],
        {
            target,
            changeOrigin: true,
            secure: false,     
            ws: true,
            logLevel: 'debug'
        }
    );

    app.use(appProxy);
    app.on('upgrade', appProxy.upgrade);
};
