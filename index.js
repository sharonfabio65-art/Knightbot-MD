/**
 * 𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 ✅ - A WhatsApp Bot
 * Copyright (c) 2024 Professor
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// ========== WEB SERVER ==========
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store for web requests - KEYED BY SESSION ID
const userSessions = new Map();

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Clean expired sessions
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of userSessions) {
        if (data.pairCode && data.codeTimestamp) {
            if (now - data.codeTimestamp > 600000) {
                console.log(chalk.yellow(`⏰ Code expired for session: ${sessionId.substring(0, 8)}...`));
                data.pairCode = null;
                data.codeTimestamp = null;
                data.ready = false;
            }
        }
        if (data.timestamp && now - data.timestamp > 1800000) {
            console.log(chalk.yellow(`🗑️ Cleaning up old session: ${sessionId.substring(0, 8)}...`));
            userSessions.delete(sessionId);
        }
    }
}, 60000);

app.get('/', (req, res) => {
    const sessionId = generateSessionId();
    console.log(chalk.green(`✅ New device connected - Session: ${sessionId.substring(0, 8)}...`));
    
    userSessions.set(sessionId, {
        phone: null,
        pairCode: null,
        ready: false,
        botStarted: false,
        codeTimestamp: null,
        timestamp: Date.now(),
        client: null,
        reconnecting: false
    });
    
   res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>Bot Maintenance</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html, body {
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background: #0a0e17;
            position: relative;
        }
        
        /* Animated Background */
        .bg-animation {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 0;
            background: linear-gradient(135deg, #0a0e17 0%, #1a1a2e 50%, #16213e 100%);
            overflow: hidden;
        }
        
        .bg-animation .orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.4;
            animation: floatOrb 15s ease-in-out infinite;
        }
        
        .bg-animation .orb:nth-child(1) {
            width: 400px; height: 400px;
            background: #25D366;
            top: -100px; left: -100px;
            animation-delay: 0s;
        }
        
        .bg-animation .orb:nth-child(2) {
            width: 350px; height: 350px;
            background: #128C7E;
            bottom: -100px; right: -100px;
            animation-delay: -5s;
        }
        
        .bg-animation .orb:nth-child(3) {
            width: 250px; height: 250px;
            background: #075E54;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            animation-delay: -10s;
        }
        
        .bg-animation .orb:nth-child(4) {
            width: 200px; height: 200px;
            background: #34B7F1;
            top: 20%; right: 10%;
            animation-delay: -3s;
        }
        
        @keyframes floatOrb {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(50px, -50px) scale(1.1); }
            66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        
        /* Particles */
        .particles {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 0;
            pointer-events: none;
        }
        
        .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(37, 211, 102, 0.3);
            border-radius: 50%;
            animation: floatParticle 20s linear infinite;
        }
        
        .particle:nth-child(1) { left: 10%; animation-delay: 0s; }
        .particle:nth-child(2) { left: 20%; animation-delay: -3s; width: 6px; height: 6px; }
        .particle:nth-child(3) { left: 30%; animation-delay: -6s; }
        .particle:nth-child(4) { left: 40%; animation-delay: -9s; width: 8px; height: 8px; }
        .particle:nth-child(5) { left: 50%; animation-delay: -12s; }
        .particle:nth-child(6) { left: 60%; animation-delay: -15s; width: 5px; height: 5px; }
        .particle:nth-child(7) { left: 70%; animation-delay: -2s; }
        .particle:nth-child(8) { left: 80%; animation-delay: -7s; width: 7px; height: 7px; }
        .particle:nth-child(9) { left: 90%; animation-delay: -11s; }
        .particle:nth-child(10) { left: 95%; animation-delay: -14s; width: 4px; height: 4px; }
        
        @keyframes floatParticle {
            0% { transform: translateY(100vh) scale(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }
        
        /* Container - Glassmorphism */
        .container {
            position: relative;
            z-index: 1;
            background: rgba(31, 44, 51, 0.75);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 24px;
            max-width: 520px;
            width: 100%;
            padding: 40px 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.05);
            transition: transform 0.3s ease;
            margin: auto;
            max-height: 95vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        .container:hover { transform: translateY(-2px); }
        
        /* Header */
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .header .icon-container {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #25D366, #128C7E);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            box-shadow: 0 0 40px rgba(37, 211, 102, 0.3);
            animation: pulseGlow 2s ease-in-out infinite;
            position: relative;
        }
        
        .header .icon-container::after {
            content: '';
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: linear-gradient(135deg, #25D366, #128C7E);
            opacity: 0.3;
            filter: blur(12px);
            z-index: -1;
            animation: pulseGlow 2s ease-in-out infinite;
        }
        
        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 40px rgba(37, 211, 102, 0.3); }
            50% { box-shadow: 0 0 60px rgba(37, 211, 102, 0.5); }
        }
        
        .header .icon-container i {
            font-size: 36px;
            color: white;
        }
        
        .header .bot-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(37, 211, 102, 0.15);
            border: 1px solid rgba(37, 211, 102, 0.2);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 11px;
            color: #25D366;
            font-weight: 500;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 12px;
        }
        
        .header .bot-badge i { font-size: 10px; }
        
        .header h1 {
            color: #E9EDEF;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.3px;
        }
        
        .header h1 span {
            background: linear-gradient(135deg, #25D366, #34B7F1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header p {
            color: #8696A0;
            font-size: 14px;
            margin-top: 6px;
        }
        
        /* Status Container */
        .status-container {
            background: rgba(11, 20, 26, 0.5);
            border-radius: 12px;
            padding: 20px 16px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .status-container .status-icon {
            font-size: 48px;
            color: #25D366;
            margin-bottom: 12px;
            display: inline-block;
            animation: spin 3s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .status-container .status-text {
            color: #E9EDEF;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        
        .status-container .status-sub {
            color: #8696A0;
            font-size: 13px;
        }
        
        /* Progress Bar */
        .progress-wrapper {
            margin: 16px 0 20px;
        }
        
        .progress-bar {
            width: 100%;
            height: 6px;
            background: rgba(42, 57, 66, 0.5);
            border-radius: 10px;
            overflow: hidden;
        }
        
        .progress-bar .progress-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #25D366, #34B7F1);
            border-radius: 10px;
            animation: progressFill 3s ease-in-out infinite;
        }
        
        @keyframes progressFill {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
        }
        
        .progress-text {
            display: flex;
            justify-content: space-between;
            color: #5A6A74;
            font-size: 11px;
            margin-top: 6px;
            letter-spacing: 0.3px;
        }
        
        /* Fix Items */
        .fix-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
        }
        
        .fix-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 16px;
            background: rgba(11, 20, 26, 0.3);
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.03);
            transition: all 0.3s ease;
            animation: fadeInItem 0.5s ease forwards;
            opacity: 0;
        }
        
        .fix-item:nth-child(1) { animation-delay: 0.2s; }
        .fix-item:nth-child(2) { animation-delay: 0.5s; }
        .fix-item:nth-child(3) { animation-delay: 0.8s; }
        .fix-item:nth-child(4) { animation-delay: 1.1s; }
        .fix-item:nth-child(5) { animation-delay: 1.4s; }
        
        @keyframes fadeInItem {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .fix-item:hover {
            background: rgba(37, 211, 102, 0.05);
            border-color: rgba(37, 211, 102, 0.1);
        }
        
        .fix-item .fix-icon {
            width: 36px;
            height: 36px;
            background: rgba(37, 211, 102, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 1px solid rgba(37, 211, 102, 0.1);
        }
        
        .fix-item .fix-icon i {
            font-size: 14px;
            color: #25D366;
        }
        
        .fix-item .fix-content {
            flex: 1;
        }
        
        .fix-item .fix-content .fix-title {
            color: #E9EDEF;
            font-size: 13px;
            font-weight: 500;
        }
        
        .fix-item .fix-content .fix-desc {
            color: #8696A0;
            font-size: 12px;
        }
        
        .fix-item .fix-status {
            color: #25D366;
            font-size: 12px;
            font-weight: 500;
            animation: blink 1.2s ease-in-out infinite;
        }
        
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        /* Footer */
        .footer {
            text-align: center;
            margin-top: 16px;
            color: #5A6A74;
            font-size: 12px;
            letter-spacing: 0.3px;
        }
        
        .footer a {
            color: #25D366;
            text-decoration: none;
            transition: color 0.2s;
        }
        
        .footer a:hover { color: #34B7F1; }
        .footer .heart { color: #E74C3C; }
        
        /* Mobile Responsive */
        @media (max-width: 480px) {
            body { padding: 10px; }
            .container {
                padding: 24px 16px;
                border-radius: 16px;
                max-height: 98vh;
            }
            .header .icon-container {
                width: 64px;
                height: 64px;
            }
            .header .icon-container i { font-size: 28px; }
            .header h1 { font-size: 20px; }
            .status-container .status-icon { font-size: 36px; }
            .status-container .status-text { font-size: 16px; }
            .fix-item { padding: 10px 12px; }
            .fix-item .fix-icon { width: 30px; height: 30px; }
            .fix-item .fix-icon i { font-size: 12px; }
            .fix-item .fix-content .fix-title { font-size: 12px; }
            .fix-item .fix-content .fix-desc { font-size: 11px; }
        }
        
        @media (max-width: 380px) {
            .container { padding: 16px 12px; }
            .header h1 { font-size: 18px; }
        }
        
        /* iOS Safari Fix */
        @supports (-webkit-touch-callout: none) {
            .container { max-height: 90vh; }
        }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(31, 44, 51, 0.3); }
        ::-webkit-scrollbar-thumb { background: #25D366; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #1DA851; }
    </style>
</head>
<body>
    <!-- Animated Background -->
    <div class="bg-animation">
        <div class="orb"></div>
        <div class="orb"></div>
        <div class="orb"></div>
        <div class="orb"></div>
    </div>
    
    <!-- Particles -->
    <div class="particles">
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
    </div>
    
    <!-- Main Container -->
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="icon-container">
                <i class="fas fa-wrench"></i>
            </div>
            <div class="bot-badge">
                <i class="fas fa-circle" style="font-size: 6px;"></i>
                <span>CypherNodeMD Bot</span>
                <i class="fas fa-circle" style="font-size: 6px;"></i>
            </div>
            <h1>Under <span>Maintenance</span></h1>
            <p>Optimizing and fixing issues</p>
        </div>
        
        <!-- Status -->
        <div class="status-container">
            <i class="fas fa-cog status-icon"></i>
            <div class="status-text">Fixing Bugs & Commands</div>
            <div class="status-sub">Please wait while we update the bot</div>
        </div>
        
        <!-- Progress -->
        <div class="progress-wrapper">
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">
                <span>Initializing</span>
                <span>Optimizing</span>
                <span>Complete</span>
            </div>
        </div>
        
        <!-- Fix List -->
        <div class="fix-list">
            <div class="fix-item">
                <div class="fix-icon"><i class="fas fa-bug"></i></div>
                <div class="fix-content">
                    <div class="fix-title">Bug Fixes</div>
                    <div class="fix-desc">Resolving command errors</div>
                </div>
                <div class="fix-status">Fixing</div>
            </div>
            
            <div class="fix-item">
                <div class="fix-icon"><i class="fas fa-terminal"></i></div>
                <div class="fix-content">
                    <div class="fix-title">Command Optimization</div>
                    <div class="fix-desc">Improving response time</div>
                </div>
                <div class="fix-status">Running</div>
            </div>
            
            <div class="fix-item">
                <div class="fix-icon"><i class="fas fa-plug"></i></div>
                <div class="fix-content">
                    <div class="fix-title">Connection Stability</div>
                    <div class="fix-desc">Fixing reconnection issues</div>
                </div>
                <div class="fix-status">Active</div>
            </div>
            
            <div class="fix-item">
                <div class="fix-icon"><i class="fas fa-users"></i></div>
                <div class="fix-content">
                    <div class="fix-title">Group Management</div>
                    <div class="fix-desc">Fixing add & promote commands</div>
                </div>
                <div class="fix-status">In Progress</div>
            </div>
            
            <div class="fix-item">
                <div class="fix-icon"><i class="fas fa-shield-alt"></i></div>
                <div class="fix-content">
                    <div class="fix-title">Security Updates</div>
                    <div class="fix-desc">Applying latest patches</div>
                </div>
                <div class="fix-status">Applied</div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <span>Powered with <span class="heart">♥</span> by <a href="#">CypherNodeMD</a></span>
        </div>
    </div>
</body>
</html>`);
});

// ========== API ROUTES ==========

app.post('/start-session', (req, res) => {
    const { phoneNumber, sessionId } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number required' });
    }
    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    if (!userSessions.has(sessionId)) {
        userSessions.set(sessionId, {
            phone: null,
            pairCode: null,
            ready: false,
            botStarted: false,
            codeTimestamp: null,
            timestamp: Date.now(),
            client: null,
            reconnecting: false
        });
    }

    const session = userSessions.get(sessionId);
    session.phone = cleanPhone;
    session.pairCode = null;
    session.ready = false;
    session.codeTimestamp = null;
    session.reconnecting = false;
    
    console.log(chalk.green(`📱 Session ${sessionId.substring(0, 8)}... requested number: ${cleanPhone}`));
    
    if (!session.botStarted) {
        session.botStarted = true;
        console.log(chalk.yellow(`🚀 Starting bot for session: ${sessionId.substring(0, 8)}...`));
        startXeonBotInc(sessionId).catch(error => {
            console.error('Fatal error:', error);
            session.botStarted = false;
        });
    }
    
    res.json({ success: true });
});

app.get('/session-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    if (!userSessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    const session = userSessions.get(sessionId);
    if (session.pairCode && session.codeTimestamp) {
        if (Date.now() - session.codeTimestamp > 600000) {
            session.pairCode = null;
            session.codeTimestamp = null;
            session.ready = false;
        }
    }
    res.json({
        pairCode: session.pairCode || null,
        ready: session.ready || false
    });
});

app.post('/delete-session', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && userSessions.has(sessionId)) {
        const session = userSessions.get(sessionId);
        if (session.sessionFolder && fs.existsSync(session.sessionFolder)) {
            try {
                rmSync(session.sessionFolder, { recursive: true, force: true });
            } catch (e) {}
        }
        userSessions.delete(sessionId);
        console.log(chalk.green(`🗑️ Session deleted: ${sessionId.substring(0, 8)}...`));
    }
    res.json({ success: true });
});

// ========== START SERVER ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(chalk.green(`🌐 Web interface: http://0.0.0.0:${PORT}`));
    console.log(chalk.yellow('📱 Each device gets its own unique session'));
    console.log(chalk.yellow('⏱ Codes expire after 10 minutes'));
});

// ========== END WEB SERVER ==========

// Import lightweight store
const store = require('./lib/lightweight_store')
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// Memory optimization
setInterval(() => {
    if (global.gc) {
        global.gc()
        console.log('🧹 Garbage collection completed')
    }
}, 60_000)

// Memory monitoring
setInterval(() => {
    const used = process.memoryUsage().rss / 1024 / 1024
    if (used > 400) {
        console.log('⚠️ RAM too high (>400MB), restarting bot...')
        process.exit(1)
    }
}, 30_000)

let phoneNumber = "254787482014"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "Cypher Node MD Admin"
global.themeemoji = "•"
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null

// Question function - gets number from web
const question = async (text, sessionId) => {
    console.log(chalk.yellow(`⏳ Bot waiting for phone number from web... (Session: ${sessionId.substring(0, 8)}...)`));
    
    let attempts = 0;
    while (attempts < 300) {
        if (userSessions.has(sessionId)) {
            const session = userSessions.get(sessionId);
            if (session.phone && !session.reconnecting) {
                console.log(chalk.green(`📱 Using phone number from web: ${session.phone}`));
                const phone = session.phone;
                session.phone = null;
                return phone;
            }
        }
        await delay(1000);
        attempts++;
        if (attempts % 10 === 0) {
            console.log(chalk.yellow(`⏳ Still waiting for web input... (${attempts}s)`));
        }
    }
    
    console.log(chalk.yellow('⏳ No number received. Restarting wait...'));
    if (userSessions.has(sessionId)) {
        userSessions.get(sessionId).botStarted = false;
    }
    return null;
}

async function startXeonBotInc(sessionId, existingPhone = null) {
    try {
        let phoneNumber = existingPhone;
        
        if (!phoneNumber) {
            phoneNumber = await question('', sessionId);
        } else {
            console.log(chalk.green(`🔄 Reconnecting with existing number: ${phoneNumber}`));
            if (userSessions.has(sessionId)) {
                userSessions.get(sessionId).reconnecting = true;
            }
        }

        if (!phoneNumber) {
            if (userSessions.has(sessionId)) {
                userSessions.get(sessionId).botStarted = false;
            }
            return;
        }

        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '')

        if (!cleanPhone || cleanPhone.length < 7) {
            console.log(chalk.red('❌ Invalid phone number format'));
            if (userSessions.has(sessionId)) {
                userSessions.get(sessionId).botStarted = false;
            }
            return;
        }

        console.log(chalk.green(`✅ Using phone number: ${cleanPhone}`));

        const sessionFolder = `./sessions/${cleanPhone}`;
        if (!fs.existsSync(sessionFolder)) {
            fs.mkdirSync(sessionFolder, { recursive: true });
        }

        if (userSessions.has(sessionId)) {
            userSessions.get(sessionId).sessionFolder = sessionFolder;
        }

        let { version, isLatest } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        })

        XeonBotInc.ev.on('creds.update', saveCreds)
        store.bind(XeonBotInc.ev)

        // Message handling
        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(XeonBotInc, chatUpdate);
                    return;
                }
                if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                    if (!isGroup) return
                }
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

                if (XeonBotInc?.msgRetryCounterCache) {
                    XeonBotInc.msgRetryCounterCache.clear()
                }

                try {
                    await handleMessages(XeonBotInc, chatUpdate, true)
                } catch (err) {
                    console.error(`Error in handleMessages for ${cleanPhone}:`, err)
                    if (mek.key && mek.key.remoteJid) {
                        await XeonBotInc.sendMessage(mek.key.remoteJid, {
                            text: '❌ An error occurred while processing your message.'
                        }).catch(console.error);
                    }
                }
            } catch (err) {
                console.error(`Error in messages.upsert for ${cleanPhone}:`, err)
            }
        })

        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        XeonBotInc.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = XeonBotInc.decodeJid(contact.id)
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
            }
        })

        XeonBotInc.getName = (jid, withoutContact = false) => {
            id = XeonBotInc.decodeJid(jid)
            withoutContact = XeonBotInc.withoutContact || withoutContact
            let v
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {}
                if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
            })
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
                XeonBotInc.user :
                (store.contacts[id] || {})
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
        }

        XeonBotInc.public = true
        XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

        // Handle pairing code - only if not registered
        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api')

            setTimeout(async () => {
                try {
                    let code = await XeonBotInc.requestPairingCode(cleanPhone)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    console.log(chalk.black(chalk.bgGreen(`Pairing Code for ${cleanPhone}: `)), chalk.black(chalk.white(code)))
                    console.log(chalk.yellow(`\nPlease enter this code in your WhatsApp app:\n1. Open WhatsApp\n2. Go to Settings > Linked Devices\n3. Tap "Link a Device"\n4. Enter the code shown above`))
                    
                    if (userSessions.has(sessionId)) {
                        const session = userSessions.get(sessionId);
                        session.pairCode = code;
                        session.codeTimestamp = Date.now();
                        console.log(chalk.green(`📤 Sent pairing code to session: ${sessionId.substring(0, 8)}...`));
                    }
                } catch (error) {
                    console.error('Error requesting pairing code:', error)
                }
            }, 3000)
        }

        // Connection handling
        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s
            
            if (qr) {
                console.log(chalk.yellow(`📱 QR Code generated for ${cleanPhone}`))
            }
            
            if (connection === 'connecting') {
                console.log(chalk.yellow(`🔄 ${cleanPhone}: Connecting...`))
            }
            
            if (connection == "open") {
                console.log(chalk.magenta(` `))
                console.log(chalk.yellow(`🌿${cleanPhone} Connected!`))

                if (userSessions.has(sessionId)) {
                    userSessions.get(sessionId).ready = true;
                    userSessions.get(sessionId).reconnecting = false;
                }

                // ---- START: NEW WELCOME & AUTO-STARTBOT LOGIC ----
                try {
                    const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                    
                    // 1. Send clean welcome message with available commands
                    const welcomeMessage = 
                        `╔══════════════════════════════════════╗\n` +
                        `║    🤖 *Bot Connected Successfully!*  ║\n` +
                        `╚══════════════════════════════════════╝\n\n` +
                        `✅ *WhatsApp bot is now active!*\n\n` +
                        `📌 *Available Commands:*\n` +
                        `• .help - Show all available commands\n` +
                        `• .ping - Check bot response time\n` +
                        `• .alive - Check bot status\n` +
                        `• .mode - Change bot mode (public/private)\n` +
                        `• .startbot - Deploy bot to groups (owner only)\n\n` +
                        `📢 *Channel:* https://whatsapp.com/channel/...\n` +
                        `💡 *Powered by CypherNodeMD*`;
                    
                    await XeonBotInc.sendMessage(botNumber, { text: welcomeMessage });
                    console.log(chalk.green(`✅ Welcome message sent to ${botNumber}`));
                    
                    // 2. Automatically call startBot after 30 seconds
                    setTimeout(async () => {
                        try {
                            console.log(chalk.yellow('🚀 Automatically running startBot deployment...'));
                            
                            // Prepare a fake message object to mimic command
                            const fakeMessage = {
                                key: { fromMe: true },
                                pushName: 'Owner',
                                message: { conversation: '.startbot' }
                            };
                            
                            // Import and call startBot function
                            const startBotCommand = require('./startBot');
                            await startBotCommand(
                                XeonBotInc, 
                                botNumber,     // chatId = bot's own number
                                botNumber,     // senderId = bot's own number
                                fakeMessage
                            );
                            
                            console.log(chalk.green('✅ startBot deployment completed automatically'));
                        } catch (err) {
                            console.error('❌ Error running startBot automatically:', err.message);
                        }
                    }, 30000); // 30 seconds delay
                    
                    // 3. Periodic status update every 20 minutes (instead of .startbot)
                    setInterval(async () => {
                        try {
                            const statusMsg = 
                                `🤖 *Bot Active*\n` +
                                `⏰ ${new Date().toLocaleString()}\n` +
                                `📱 *Phone:* ${cleanPhone}\n` +
                                `✅ *Status:* Online`;
                            await XeonBotInc.sendMessage(botNumber, { text: statusMsg });
                            console.log(chalk.green(`✅ Periodic status sent`));
                        } catch (err) {
                            console.error('❌ Error sending periodic status:', err.message);
                        }
                    }, 1200000); // 20 minutes
                    
                } catch (error) {
                    console.error('❌ Error in connection open setup:', error.message);
                }
                // ---- END NEW LOGIC ----

                await delay(1999)
                console.log(chalk.yellow(`\n\n                  ${chalk.bold.blue(`[ ${global.botname || '𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 ✅'} ]`)}\n\n`))
                console.log(chalk.cyan(`< ================================================== >`))
                console.log(chalk.magenta(`\n${global.themeemoji || '•'} YT CHANNEL: 𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 𝐌𝐃✅`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} GITHUB: mrunqiuehacker`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} WA NUMBER: ${owner}`))
                console.log(chalk.magenta(`${global.themeemoji || '•'} CREDIT: 𝐂𝐘𝐏𝐇𝐄𝐑 𝐍𝐎𝐃𝐄 𝐌𝐃✅`))
                console.log(chalk.green(`${global.themeemoji || '•'} 🤖 Bot Connected Successfully! ✅`))
                console.log(chalk.blue(`Bot Version: ${settings.version}`))
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                const statusCode = lastDisconnect?.error?.output?.statusCode
                
                console.log(chalk.red(`❌ ${cleanPhone}: Disconnected`))
                
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try {
                        rmSync(sessionFolder, { recursive: true, force: true })
                        console.log(chalk.yellow(`🗑️ ${cleanPhone}: Session deleted`))
                    } catch (error) {
                        console.error('Error deleting session:', error)
                    }
                    if (userSessions.has(sessionId)) {
                        userSessions.get(sessionId).ready = false;
                    }
                }
                
                if (shouldReconnect) {
                    console.log(chalk.yellow(`🔄 ${cleanPhone}: Reconnecting...`))
                    await delay(5000)
                    // RECONNECT WITH EXISTING PHONE NUMBER
                    startXeonBotInc(sessionId, cleanPhone)
                }
            }
        })

        // Anticall handler
        const antiCallNotified = new Set();
        XeonBotInc.ev.on('call', async (calls) => {
            try {
                const { readState: readAnticallState } = require('./commands/anticall');
                const state = readAnticallState();
                if (!state.enabled) return;
                for (const call of calls) {
                    const callerJid = call.from || call.peerJid || call.chatId;
                    if (!callerJid) continue;
                    try {
                        try {
                            if (typeof XeonBotInc.rejectCall === 'function' && call.id) {
                                await XeonBotInc.rejectCall(call.id, callerJid);
                            } else if (typeof XeonBotInc.sendCallOfferAck === 'function' && call.id) {
                                await XeonBotInc.sendCallOfferAck(call.id, callerJid, 'reject');
                            }
                        } catch {}
                        if (!antiCallNotified.has(callerJid)) {
                            antiCallNotified.add(callerJid);
                            setTimeout(() => antiCallNotified.delete(callerJid), 60000);
                            await XeonBotInc.sendMessage(callerJid, { text: '📵 Anticall is enabled. Your call was rejected and you will be blocked.' });
                        }
                    } catch {}
                    setTimeout(async () => {
                        try { await XeonBotInc.updateBlockStatus(callerJid, 'block'); } catch {}
                    }, 800);
                }
            } catch (e) {}
        });

        XeonBotInc.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(XeonBotInc, update);
        });

        XeonBotInc.ev.on('messages.upsert', async (m) => {
            if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
                await handleStatus(XeonBotInc, m);
            }
        });

        XeonBotInc.ev.on('status.update', async (status) => {
            await handleStatus(XeonBotInc, status);
        });

        XeonBotInc.ev.on('messages.reaction', async (status) => {
            await handleStatus(XeonBotInc, status);
        });

        if (userSessions.has(sessionId)) {
            userSessions.get(sessionId).client = XeonBotInc;
        }

        return XeonBotInc
    } catch (error) {
        console.error('Error in startXeonBotInc:', error)
        await delay(5000)
        if (userSessions.has(sessionId)) {
            userSessions.get(sessionId).botStarted = false;
        }
    }
}

// ========== DO NOT AUTO-START BOT ==========
console.log(chalk.yellow('🚀 Bot is ready and waiting for web requests...'));
console.log(chalk.yellow('📱 Each device gets its own unique session'));
console.log(chalk.yellow('⏱ Codes expire after 10 minutes'));
console.log(chalk.green(`🌐 URL: http://localhost:${PORT}`));

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err)
})

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})
