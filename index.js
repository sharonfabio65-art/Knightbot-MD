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
    <title>CypherNodeMD Bot - Pairing</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
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
            align-items: flex-start;
            padding: 20px;
            background: #0a0e17;
            overflow-y: auto;
            position: relative;
        }
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
        .bg-animation .orb:nth-child(1) { width: 400px; height: 400px; background: #25D366; top: -100px; left: -100px; animation-delay: 0s; }
        .bg-animation .orb:nth-child(2) { width: 350px; height: 350px; background: #128C7E; bottom: -100px; right: -100px; animation-delay: -5s; }
        .bg-animation .orb:nth-child(3) { width: 250px; height: 250px; background: #075E54; top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -10s; }
        .bg-animation .orb:nth-child(4) { width: 200px; height: 200px; background: #34B7F1; top: 20%; right: 10%; animation-delay: -3s; }
        @keyframes floatOrb {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(50px, -50px) scale(1.1); }
            66% { transform: translate(-30px, 30px) scale(0.9); }
        }
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
        .container {
            position: relative;
            z-index: 1;
            background: rgba(31, 44, 51, 0.75);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 24px;
            max-width: 480px;
            width: 100%;
            padding: 30px 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.05);
            transition: transform 0.3s ease;
            margin: auto;
            max-height: 95vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        .container:hover { transform: translateY(-2px); }
        .header { text-align: center; margin-bottom: 24px; }
        .header .logo {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #25D366, #128C7E);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 12px;
            box-shadow: 0 0 40px rgba(37, 211, 102, 0.3);
            animation: pulseGlow 2s ease-in-out infinite;
            position: relative;
        }
        .header .logo::after {
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
        .header .logo i { font-size: 30px; color: white; }
        .header .bot-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(37, 211, 102, 0.15);
            border: 1px solid rgba(37, 211, 102, 0.2);
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 10px;
            color: #25D366;
            font-weight: 500;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .header .bot-badge i { font-size: 8px; }
        .header h1 { color: #E9EDEF; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
        .header h1 span {
            background: linear-gradient(135deg, #25D366, #34B7F1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .header p { color: #8696A0; font-size: 13px; margin-top: 4px; }
        .steps-container {
            background: rgba(11, 20, 26, 0.5);
            border-radius: 12px;
            padding: 4px 0;
            margin-bottom: 8px;
        }
        .step {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 14px;
            border-bottom: 1px solid rgba(42, 57, 66, 0.5);
            transition: background 0.2s;
        }
        .step:last-child { border-bottom: none; }
        .step:hover { background: rgba(255,255,255,0.02); }
        .step-icon {
            width: 32px;
            height: 32px;
            background: rgba(37, 211, 102, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            border: 1px solid rgba(37, 211, 102, 0.1);
        }
        .step-icon i { font-size: 13px; color: #25D366; }
        .step-content { flex: 1; }
        .step-content .title { color: #E9EDEF; font-size: 13px; font-weight: 500; margin-bottom: 2px; }
        .step-content .desc { color: #8696A0; font-size: 12px; line-height: 1.4; }
        .step-content .highlight { color: #25D366; font-weight: 500; }
        .divider {
            border-top: 1px solid rgba(42, 57, 66, 0.5);
            margin: 16px 0 20px;
        }
        .input-group {
            margin-top: 4px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        .input-group .country-code {
            color: #E9EDEF;
            font-size: 16px;
            font-weight: 500;
            padding: 10px 0;
            min-width: 18px;
        }
        .input-group input {
            flex: 1;
            padding: 12px 14px;
            background: rgba(42, 57, 66, 0.6);
            border: 1px solid rgba(59, 74, 84, 0.5);
            border-radius: 10px;
            color: #E9EDEF;
            font-size: 15px;
            outline: none;
            transition: all 0.3s ease;
            min-width: 120px;
            width: 100%;
        }
        .input-group input:focus {
            border-color: #25D366;
            box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.1);
            background: rgba(42, 57, 66, 0.8);
        }
        .input-group input::placeholder { color: #5A6A74; font-size: 14px; }
        .input-group button {
            padding: 12px 20px;
            background: linear-gradient(135deg, #25D366, #1DA851);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 16px rgba(37, 211, 102, 0.3);
            min-width: 100px;
            justify-content: center;
        }
        .input-group button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(37, 211, 102, 0.4);
            background: linear-gradient(135deg, #2BDE6E, #1DA851);
        }
        .input-group button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .input-group button .spinner {
            display: none;
            width: 18px;
            height: 18px;
            border: 2.5px solid rgba(255,255,255,0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        .input-group button.loading .spinner { display: inline-block; }
        .input-group button.loading .btn-text { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status-message {
            margin-top: 14px;
            padding: 12px 16px;
            border-radius: 10px;
            font-size: 13px;
            display: none;
            animation: slideDown 0.3s ease;
            word-wrap: break-word;
        }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .status-message.show { display: block; }
        .status-message.success { background: rgba(11, 59, 30, 0.8); color: #25D366; border: 1px solid rgba(37, 211, 102, 0.2); }
        .status-message.error { background: rgba(59, 30, 30, 0.8); color: #E74C3C; border: 1px solid rgba(231, 76, 60, 0.2); }
        .status-message.info { background: rgba(30, 42, 59, 0.8); color: #60A5FA; border: 1px solid rgba(96, 165, 250, 0.2); }
        .code-display {
            margin-top: 16px;
            padding: 16px;
            background: rgba(11, 20, 26, 0.6);
            border-radius: 12px;
            text-align: center;
            display: none;
            border: 1px solid rgba(37, 211, 102, 0.1);
            animation: slideDown 0.4s ease;
        }
        .code-display.active { display: block; }
        .code-display .code-label {
            color: #8696A0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 6px;
        }
        .code-display .code {
            font-size: 28px;
            font-weight: 700;
            color: #25D366;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            user-select: all;
            padding: 10px 16px;
            border-radius: 8px;
            transition: all 0.2s;
            display: inline-block;
            background: rgba(0,0,0,0.2);
            word-break: break-all;
            max-width: 100%;
        }
        .code-display .code:hover { background: rgba(37, 211, 102, 0.1); }
        .code-display .copy-hint { color: #5A6A74; font-size: 11px; margin-top: 6px; }
        .code-display .copy-hint i { margin-right: 4px; }
        .code-display .expiry {
            color: #8696A0;
            font-size: 10px;
            margin-top: 6px;
        }
        .connected-badge {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: rgba(11, 59, 30, 0.8);
            color: #25D366;
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 500;
            margin-top: 14px;
            border: 1px solid rgba(37, 211, 102, 0.2);
            animation: slideDown 0.4s ease;
        }
        .connected-badge i { font-size: 14px; }
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #5A6A74;
            font-size: 11px;
            letter-spacing: 0.3px;
        }
        .footer a { color: #25D366; text-decoration: none; transition: color 0.2s; }
        .footer a:hover { color: #34B7F1; }
        .footer .heart { color: #E74C3C; }
        .device-id {
            font-size: 9px;
            color: #3B4A54;
            text-align: center;
            margin-top: 10px;
            font-family: monospace;
            letter-spacing: 0.5px;
        }
        
        /* Mobile Responsive */
        @media (max-width: 480px) {
            body { padding: 10px; }
            .container { 
                padding: 20px 16px; 
                border-radius: 16px;
                max-height: 98vh;
            }
            .input-group { 
                flex-direction: column; 
                align-items: stretch;
                gap: 8px;
            }
            .input-group .country-code { display: none; }
            .input-group button { 
                justify-content: center; 
                padding: 12px;
                width: 100%;
                min-width: unset;
            }
            .input-group input {
                width: 100%;
                font-size: 16px; /* Prevents zoom on iOS */
                padding: 14px;
            }
            .header .logo { 
                width: 56px; 
                height: 56px; 
            }
            .header .logo i { font-size: 26px; }
            .header h1 { font-size: 20px; }
            .step { 
                padding: 10px 12px; 
                gap: 10px;
            }
            .step-icon { width: 28px; height: 28px; }
            .step-icon i { font-size: 12px; }
            .step-content .title { font-size: 12px; }
            .step-content .desc { font-size: 11px; }
            .code-display .code { 
                font-size: 24px; 
                letter-spacing: 2px; 
                padding: 8px 12px;
            }
            .status-message { 
                font-size: 12px; 
                padding: 10px 14px;
            }
            .header .bot-badge { font-size: 9px; padding: 3px 12px; }
            .connected-badge { font-size: 12px; padding: 6px 14px; }
            .footer { font-size: 10px; }
            .device-id { font-size: 8px; }
            .container { 
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }
        }
        
        @media (max-width: 380px) {
            .container { padding: 16px 12px; }
            .header h1 { font-size: 18px; }
            .code-display .code { font-size: 20px; letter-spacing: 1px; }
            .step { padding: 8px 10px; }
        }
        
        /* Fix for iOS Safari */
        @supports (-webkit-touch-callout: none) {
            .container {
                max-height: 90vh;
            }
        }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(31, 44, 51, 0.3); }
        ::-webkit-scrollbar-thumb { background: #25D366; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #1DA851; }
    </style>
</head>
<body>
    <div class="bg-animation">
        <div class="orb"></div>
        <div class="orb"></div>
        <div class="orb"></div>
        <div class="orb"></div>
    </div>
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
    <div class="container">
        <div class="header">
            <div class="logo">
                <i class="fas fa-robot"></i>
            </div>
            <div class="bot-badge">
                <i class="fas fa-circle" style="font-size: 6px;"></i>
                <span>CypherNodeMD Bot</span>
                <i class="fas fa-circle" style="font-size: 6px;"></i>
            </div>
            <h1>Link a <span>Device</span></h1>
            <p>Connect your phone to the bot</p>
        </div>
        <div class="steps-container">
            <div class="step">
                <div class="step-icon"><i class="fas fa-phone"></i></div>
                <div class="step-content">
                    <div class="title">Enter your phone number</div>
                    <div class="desc">Use the number linked to your WhatsApp account</div>
                </div>
            </div>
            <div class="step">
                <div class="step-icon"><i class="fas fa-shield-alt"></i></div>
                <div class="step-content">
                    <div class="title">Get pairing code</div>
                    <div class="desc">We'll generate a <span class="highlight">secure one-time code</span> for you</div>
                </div>
            </div>
            <div class="step">
                <div class="step-icon"><i class="fas fa-link"></i></div>
                <div class="step-content">
                    <div class="title">Link your device</div>
                    <div class="desc">Open WhatsApp → Settings → <span class="highlight">Linked Devices</span> → Link a Device</div>
                </div>
            </div>
        </div>
        <div class="divider"></div>
        <div class="input-group">
            <span class="country-code">+</span>
            <input type="tel" id="phoneInput" placeholder="254712345678" autocomplete="tel" inputmode="numeric" pattern="[0-9]*">
            <button id="startBtn" onclick="startSession()">
                <span class="btn-text">Connect</span>
                <span class="spinner"></span>
            </button>
        </div>
        <div id="statusMessage" class="status-message"></div>
        <div id="codeDisplay" class="code-display">
            <div class="code-label"><i class="fas fa-key"></i> Pairing Code</div>
            <div class="code" id="pairCode" onclick="copyCode()">------</div>
            <div class="copy-hint"><i class="fas fa-copy"></i> Click code to copy</div>
            <div class="expiry" id="expiryText">⏱ Code expires in 10 minutes</div>
        </div>
        <div id="connectedBadge" class="connected-badge">
            <i class="fas fa-check-circle"></i>
            <span>Connected successfully</span>
        </div>
        <div class="footer">
            <span>Powered with <span class="heart">♥</span> by <a href="#">CypherNodeMD</a></span>
        </div>
        <div class="device-id">🔑 Device: ${sessionId.substring(0, 12)}...</div>
    </div>
    <script>
        const sessionId = '${sessionId}';
        let pollInterval = null;
        let expiryTimer = null;
        
        function setLoading(loading) {
            const btn = document.getElementById('startBtn');
            if (loading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }
        
        function showStatus(message, type) {
            const el = document.getElementById('statusMessage');
            el.textContent = message;
            el.className = 'status-message show ' + type;
            if (type === 'error') {
                setTimeout(() => {
                    el.classList.remove('show');
                }, 6000);
            }
        }
        
        function copyCode() {
            const codeEl = document.getElementById('pairCode');
            const code = codeEl.textContent;
            if (code && code !== '------' && code !== 'Loading...' && code !== 'Expired') {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        showStatus('✅ Code copied to clipboard!', 'success');
                    }).catch(() => {
                        copyCodeFallback(codeEl);
                    });
                } else {
                    copyCodeFallback(codeEl);
                }
            }
        }
        
        function copyCodeFallback(codeEl) {
            const range = document.createRange();
            range.selectNode(codeEl);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            try {
                document.execCommand('copy');
                showStatus('✅ Code copied!', 'success');
            } catch (e) {
                showStatus('❌ Failed to copy. Please select and copy manually.', 'error');
            }
            window.getSelection().removeAllRanges();
        }
        
        function startExpiryTimer() {
            let minutes = 10;
            const expiryEl = document.getElementById('expiryText');
            if (expiryTimer) clearInterval(expiryTimer);
            expiryTimer = setInterval(() => {
                minutes--;
                if (minutes <= 0) {
                    clearInterval(expiryTimer);
                    expiryEl.textContent = '⏱ Code expired';
                    document.getElementById('pairCode').textContent = 'Expired';
                    document.getElementById('pairCode').style.color = '#E74C3C';
                    showStatus('Code has expired. Please request a new one.', 'error');
                } else {
                    expiryEl.textContent = '⏱ Code expires in ' + minutes + ' minute' + (minutes > 1 ? 's' : '');
                }
            }, 60000);
        }
        
        async function startSession() {
            const phone = document.getElementById('phoneInput').value.trim();
            if (!phone) {
                showStatus('Please enter your phone number', 'error');
                return;
            }
            
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            if (cleanPhone.length < 7 || cleanPhone.length > 15) {
                showStatus('Please enter a valid phone number (7-15 digits)', 'error');
                return;
            }
            
            setLoading(true);
            showStatus('Starting session for ' + cleanPhone + '...', 'info');
            
            try {
                const res = await fetch('/start-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        phoneNumber: cleanPhone,
                        sessionId: sessionId 
                    })
                });
                const data = await res.json();
                
                if (!data.success) {
                    showStatus('Error: ' + (data.error || 'Failed to start session'), 'error');
                    setLoading(false);
                    return;
                }
                
                showStatus('Waiting for pairing code...', 'info');
                document.getElementById('codeDisplay').classList.add('active');
                document.getElementById('pairCode').textContent = 'Loading...';
                document.getElementById('pairCode').style.color = '#25D366';
                
                startExpiryTimer();
                
                if (pollInterval) clearInterval(pollInterval);
                pollInterval = setInterval(pollStatus, 2000);
                pollStatus();
                
            } catch (err) {
                showStatus('Error: ' + err.message, 'error');
                setLoading(false);
            }
        }
        
        async function pollStatus() {
            try {
                const res = await fetch('/session-status/' + sessionId);
                if (!res.ok) throw new Error('Status check failed');
                const data = await res.json();
                
                if (data.pairCode) {
                    document.getElementById('pairCode').textContent = data.pairCode;
                    document.getElementById('pairCode').style.color = '#25D366';
                    showStatus('Code received! Follow the steps to link your device.', 'success');
                    setLoading(false);
                }
                
                if (data.ready) {
                    document.getElementById('connectedBadge').style.display = 'flex';
                    document.getElementById('pairCode').textContent = '✅ Connected';
                    showStatus('Device linked successfully! You can close this page.', 'success');
                    if (pollInterval) {
                        clearInterval(pollInterval);
                        pollInterval = null;
                    }
                    if (expiryTimer) {
                        clearInterval(expiryTimer);
                        expiryTimer = null;
                    }
                    setLoading(false);
                }
            } catch (e) {
                console.warn('Poll error:', e);
            }
        }
        
        async function checkExisting() {
            try {
                const res = await fetch('/session-status/' + sessionId);
                if (res.ok) {
                    const data = await res.json();
                    if (data.pairCode) {
                        document.getElementById('codeDisplay').classList.add('active');
                        document.getElementById('pairCode').textContent = data.pairCode;
                        startExpiryTimer();
                        if (pollInterval) clearInterval(pollInterval);
                        pollInterval = setInterval(pollStatus, 2000);
                    }
                    if (data.ready) {
                        document.getElementById('connectedBadge').style.display = 'flex';
                        document.getElementById('pairCode').textContent = '✅ Connected';
                        if (pollInterval) {
                            clearInterval(pollInterval);
                            pollInterval = null;
                        }
                        if (expiryTimer) {
                            clearInterval(expiryTimer);
                            expiryTimer = null;
                        }
                    }
                }
            } catch (e) {}
        }
        checkExisting();
        
        document.getElementById('phoneInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                startSession();
            }
        });
    </script>
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

                try {
                    const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
                    await XeonBotInc.sendMessage(botNumber, {
                        text: `.startbot`
                    });
                    console.log(chalk.green(`✅ StartBot message sent`));
                } catch (error) {
                    console.error('❌ Error sending message:', error.message)
                }

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
