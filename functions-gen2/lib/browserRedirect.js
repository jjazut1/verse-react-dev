"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserRedirect = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
/**
 * Server-side browser redirect function
 * Bypasses PWA manifest capture by serving redirects from a different endpoint
 */
exports.browserRedirect = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    invoker: 'public',
}, (request, response) => {
    try {
        // Get parameters from query string
        const { type, token, from } = request.query;
        // Base URL for the app (use environment variable or default)
        const baseUrl = process.env.APP_BASE_URL || 'https://verse-dev-central.web.app';
        // Build target URL based on type
        let targetUrl;
        if (type === 'assignment' && token) {
            targetUrl = `${baseUrl}/play?token=${token}&from=${from || 'email'}&forceBrowser=true&mode=browser&_pwa=false&browserRedirect=true`;
        }
        else if (type === 'dashboard') {
            targetUrl = `${baseUrl}/student?from=${from || 'email'}&forceBrowser=true&mode=browser&_pwa=false&browserRedirect=true`;
        }
        else {
            // Fallback to dashboard
            targetUrl = `${baseUrl}/student?from=email&forceBrowser=true&mode=browser&_pwa=false`;
        }
        firebase_functions_1.logger.info('Browser redirect request', {
            type,
            token: token ? 'present' : 'missing',
            from,
            targetUrl,
            userAgent: request.headers['user-agent'],
            referer: request.headers.referer
        });
        // Set headers to prevent caching and ensure browser handling
        response.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Browser-Redirect': 'true',
            // Prevent PWA from handling this response
            'Content-Security-Policy': "navigate-to 'self'",
        });
        // Create HTML response with immediate redirect
        const htmlResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opening in Browser - Lumino Learning</title>
    <meta http-equiv="refresh" content="0;url=${targetUrl}">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            max-width: 400px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .fallback a {
            color: white;
            text-decoration: underline;
            font-weight: bold;
        }
    </style>
    <script>
        // Server-side redirect with client-side fallback
        setTimeout(function() {
            if (!document.hidden) {
                window.location.replace('${targetUrl}');
            }
        }, 500);
        
        // Set browser preferences immediately
        try {
            localStorage.setItem('force_browser_mode', 'true');
            localStorage.setItem('browser_mode_timestamp', Date.now().toString());
            sessionStorage.setItem('force_browser_mode', 'true');
            console.log('🖥️ Browser mode preferences set');
        } catch (e) {
            console.log('Could not set storage preferences:', e);
        }
    </script>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>🖥️ Opening in Browser Mode</h2>
        <p>Redirecting you to the browser version...</p>
        <div class="fallback">
            <p>If you're not redirected automatically:</p>
            <a href="${targetUrl}">Click here to continue</a>
        </div>
    </div>
</body>
</html>`;
        // Send the HTML response
        response.status(200).send(htmlResponse);
    }
    catch (error) {
        firebase_functions_1.logger.error('Browser redirect error', error);
        // Error fallback
        response.status(500).send(`
<!DOCTYPE html>
<html>
<head>
    <title>Redirect Error - Lumino Learning</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: sans-serif; text-align: center; padding: 50px;">
    <h2>Unable to redirect</h2>
    <p>Please visit <a href="https://verse-dev-central.web.app/student">Lumino Learning</a> directly.</p>
</body>
</html>`);
    }
});
//# sourceMappingURL=browserRedirect.js.map