// ==UserScript==
// @name         UNIT3D chatbox - polishtorrent.top edition
// @author       mehech
// @version      1.0
// @description  PTT chat helper
// @match        https://polishtorrent.top/*
// @grant        none
// @license      MIT
// @namespace    PTTchathelper
// ==/UserScript==

(() => {
    'use strict';

    const BOTNICKS = ['SYSTEM', 'NERDBOT'];
    const USER_COLORS = {
        'ace': '#ef008c',
        'TheoneandonlyPook': '#ef008c',
        'Demonic': '#ffac6b'
    };

    const rgbToHex = (rgb) => {
        const rgbArray = rgb.match(/\d+/g);
        if (!rgbArray || rgbArray.length !== 3) return rgb;
        return `#${rgbArray.map(v => Number(v).toString(16).padStart(2, '0')).join('')}`;
    }

    const extractUser = () => {
        const userLink = document.querySelector('a.top-nav__username--highresolution');
        if (userLink) {
            const span = userLink.querySelector('span');
            if (span) {
                return span.textContent.replace(/^\s*|\s*$/g, '').replace(/\s+/, '').trim();
            }
            const url = new URL(userLink.href);
            return url.pathname.split('/').pop();
        }
        return null;
    }

    const setupBBCodePanel = (chatbox) => {
        if (!chatbox) return false;
        if (document.getElementById('bbCodesPanelContainer')) return true;

        const container = document.createElement('div');
        container.id = 'bbCodesPanelContainer';
        container.innerHTML = `
            <div id="bbCodesPanel">
                <button type="button" class="bbc-btn" data-bbcode="[b][/b]" title="Bold">B</button>
                <button type="button" class="bbc-btn" data-bbcode="[i][/i]" title="Italic"><span style="font-style:italic">I</span></button>
                <button type="button" class="bbc-btn" data-bbcode="[u][/u]" title="Underline"><span style="text-decoration:underline">U</span></button>
                <button type="button" class="bbc-btn" id="imgButton" data-bbcode="[img][/img]" title="Add image">IMG</button>
                <button type="button" class="bbc-btn" id="urlButton" data-bbcode="[url][/url]" title="Add URL">URL</button>
                <button type="button" class="bbc-btn" id="videoButton" title="Add YouTube video">VIDEO</button>
                <button type="button" class="bbc-btn" id="colorButton" title="Insert color BBCode">Color</button>
                <input type="color" id="colorPicker" style="cursor:pointer;margin-left:4px;display:none;width:18px;height:16px;background:none;border:none;" title="Select Color">
                <button type="button" class="bbc-btn" id="emojiButton" title="Insert emoji" style="font-size:17px;">😊</button>
                <div id="emojiMenu" style="display:none;position:absolute;left:8px;top:30px;background:#191926;border:1px solid #544ea5;z-index:10000;border-radius:7px;padding:2.5px 6px;font-size:15px;min-width:120px;box-shadow:0 1px 7px #0003;">
                    <span class="emoji" data-emoji="😊">😊</span>
                    <span class="emoji" data-emoji="😂">😂</span>
                    <span class="emoji" data-emoji="😍">😍</span>
                    <span class="emoji" data-emoji="😇">😇</span>
                    <span class="emoji" data-emoji="🥳">🥳</span>
                    <span class="emoji" data-emoji="😴">😴</span>
                    <span class="emoji" data-emoji="💩">💩</span>
                    <span class="emoji" data-emoji="🔥">🔥</span>
                </div>
            </div>
        `;
        let parent = chatbox.closest('form, .chatbox__footer, .chatbox__form, .chatbox__actions, .chatbox');
        if (parent && parent !== chatbox && parent.parentElement) {
            parent.parentElement.insertBefore(container, parent);
        } else {
            chatbox.before(container);
        }
        container.querySelectorAll('.bbc-btn[data-bbcode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const bbCode = btn.getAttribute('data-bbcode');
                if (!bbCode) return;
                if (bbCode === '[img][/img]') insertImgBBCodeWithClipboard(bbCode, chatbox);
                else if (bbCode === '[url][/url]') insertBBCodeWithClipboard(bbCode, chatbox);
                else insertBBCode(chatbox, bbCode);
            });
        });
        // Improved: colorPicker will wrap BBCode around selection or insert at cursor
        container.querySelector('#colorButton').addEventListener('click', () => {
            document.getElementById('colorPicker').style.display = 'inline-block';
        });
        container.querySelector('#colorPicker').addEventListener('input', e => {
            const color = e.target.value;
            const chatbox = document.querySelector('#chatbox__messages-create');
            if (!chatbox) return;
            const selStart = chatbox.selectionStart;
            const selEnd = chatbox.selectionEnd;
            if (selStart !== undefined && selEnd !== undefined && selStart !== selEnd) {
                // Wrap selection
                const before = chatbox.value.substring(0, selStart);
                const selected = chatbox.value.substring(selStart, selEnd);
                const after = chatbox.value.substring(selEnd);
                const colorBBCode = `[color=${color}]${selected}[/color]`;
                chatbox.value = before + colorBBCode + after;
                chatbox.setSelectionRange(before.length + colorBBCode.length, before.length + colorBBCode.length);
            } else {
                // Insert at cursor, position cursor in the middle
                const pos = chatbox.selectionStart || chatbox.value.length;
                const colorBBCode = `[color=${color}][/color]`;
                chatbox.value = chatbox.value.slice(0, pos) + colorBBCode + chatbox.value.slice(pos);
                chatbox.setSelectionRange(pos + colorBBCode.length - 8, pos + colorBBCode.length - 8);
            }
            chatbox.focus();
            document.getElementById('colorPicker').style.display = 'none';
        });
        container.querySelector('#videoButton').addEventListener('click', () => {
            insertVideoBBCodeWithClipboard(chatbox);
        });
        container.querySelector('#emojiButton').addEventListener('click', () => {
            const menu = document.getElementById('emojiMenu');
            menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
        });
        container.querySelector('#emojiMenu').addEventListener('click', e => {
            if (e.target.classList.contains('emoji')) {
                insertEmoji(e.target.getAttribute('data-emoji'), chatbox);
                document.getElementById('emojiMenu').style.display = 'none';
            }
        });
        document.addEventListener('click', e => {
            const menu = document.getElementById('emojiMenu');
            const btn = document.getElementById('emojiButton');
            if (menu && e.target !== menu && e.target !== btn && !menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
        return true;
    }
    const insertEmoji = (emoji, chatbox) => {
        const pos = chatbox.selectionStart || chatbox.value.length;
        chatbox.value = chatbox.value.substring(0, pos) + emoji + chatbox.value.substring(pos);
        chatbox.setSelectionRange(pos + emoji.length, pos + emoji.length);
        chatbox.focus();
    }
    const insertBBCode = (chatbox, bbCode) => {
        const textSelected = chatbox.value.substring(chatbox.selectionStart, chatbox.selectionEnd);
        const startTag = bbCode.substring(0, bbCode.indexOf(']') + 1);
        const endTag = bbCode.substring(bbCode.lastIndexOf('['));
        if (textSelected.length > 0) {
            const newText = startTag + textSelected + endTag;
            chatbox.value = chatbox.value.substring(0, chatbox.selectionStart) + newText + ' ' + chatbox.value.substring(chatbox.selectionEnd);
            const newPos = chatbox.value.lastIndexOf(' ') + 1;
            chatbox.setSelectionRange(newPos, newPos);
        } else {
            const pos = chatbox.selectionStart + startTag.length;
            chatbox.value += startTag + endTag + ' ';
            chatbox.setSelectionRange(pos, pos);
        }
        chatbox.focus();
    }
    const insertBBCodeWithClipboard = (tag, chatbox) => {
        navigator.clipboard.readText().then(clipText => {
            const newContent = clipText.trim().length > 0
                ? tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1${clipText}$3`)
                : tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1$2$3`);
            chatbox.value += newContent + ' ';
            chatbox.focus();
        }).catch(() => {
            chatbox.value += tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1$2$3`) + ' ';
            chatbox.focus();
        });
    }
    const insertImgBBCodeWithClipboard = (tag, chatbox) => {
        navigator.clipboard.readText().then(clipText => {
            const newContent = clipText.trim().length > 0
                ? tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1${clipText}$3`)
                : tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1$2$3`);
            chatbox.value += newContent + '\n';
            chatbox.focus();
        }).catch(() => {
            chatbox.value += tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1$2$3`) + '\n';
            chatbox.focus();
        });
    }
    const insertVideoBBCodeWithClipboard = (chatbox) => {
        navigator.clipboard.readText().then(clipText => {
            const ytLink = clipText.trim();
            let videoId = '';
            if (ytLink.match(/^https:\/\/youtu\.be\//)) {
                videoId = ytLink.split('/').pop();
            } else if (ytLink.match(/youtube\.com\/watch\?v=/)) {
                try {
                    const urlParams = new URLSearchParams((new URL(ytLink)).search);
                    videoId = urlParams.get('v') || '';
                } catch {
                    videoId = '';
                }
            }
            if (videoId) {
                chatbox.value += `[youtube]${videoId}[/youtube] `;
            } else {
                chatbox.value += `[youtube]${ytLink}[/youtube] `;
            }
            chatbox.focus();
        }).catch(() => {
            chatbox.value += '[youtube][/youtube] ';
            chatbox.focus();
        });
    }
    const addReplyButtonsEach = () => {
        const userSelf = extractUser();
        document.querySelectorAll('.enh-chat-btn-action').forEach(i => i.remove());
        document.querySelectorAll('address.chatbox-message__address.user-tag').forEach(address => {
            if (!address) return;
            const link = address.querySelector('.user-tag__link');
            const span = link && link.querySelector('span');
            if (!link || !span) return;
            let username = span.textContent.replace(/^\s*|\s*$/g, '').replace(/\s+/, '').trim();
            const isBot = BOTNICKS.some(bot => bot.toLowerCase() === username.toLowerCase());
            if (!username || isBot) return;
            if (span.nextSibling && span.nextSibling.className && span.nextSibling.className.includes('enh-chat-btn-action')) return;
            let rootMsg = address.closest('.chatbox-message');
            if (!rootMsg) rootMsg = address.parentNode;
            const contentSection = rootMsg.querySelector('.chatbox-message__content, section.bbcode-rendered');
            const content = contentSection ? contentSection.innerText.trim() : '';
            const atBtn = document.createElement('button');
            atBtn.className = 'enh-chat-btn-action';
            atBtn.textContent = '@';
            atBtn.title = 'Mention user';
            atBtn.style.marginLeft = '5px';
            atBtn.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                const chatbox = document.querySelector('#chatbox__messages-create');
                if (!chatbox) return;
                let userColor = '#ecc846';
                if (USER_COLORS.hasOwnProperty(username)) {
                    userColor = USER_COLORS[username];
                } else {
                    const msgUsername = Array.from(document.querySelectorAll('.chatbox-message__address.user-tag span, .message-username span')).find(el => el.textContent.trim() === username);
                    if (msgUsername) {
                        const style = window.getComputedStyle(msgUsername);
                        userColor = rgbToHex(style.color);
                    }
                }
                const mentionText = `[url=https://polishtorrent.top/users/${username}][color=${userColor}]@${username}[/color][/url] `;
                chatbox.value += mentionText;
                chatbox.focus();
            };
            const reply = document.createElement('button');
            reply.className = 'enh-chat-btn-action';
            reply.textContent = '↩️';
            reply.title = 'Reply';
            reply.style.marginLeft = '2px';
            reply.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                const chatbox = document.querySelector('#chatbox__messages-create');
                if (!chatbox) return;
                let userColor = '#ecc846';
                if (USER_COLORS.hasOwnProperty(username)) {
                    userColor = USER_COLORS[username];
                } else {
                    const msgUsername = Array.from(document.querySelectorAll('.chatbox-message__address.user-tag span, .message-username span')).find(el => el.textContent.trim() === username);
                    if (msgUsername) {
                        const style = window.getComputedStyle(msgUsername);
                        userColor = rgbToHex(style.color);
                    }
                }
                const quoteText = `[color=${userColor}][b]${username}[/b][/color]: [color=#ffff80][i]"${content}"[/i][/color]\n\n`;
                chatbox.value += quoteText;
                chatbox.focus();
            };
            const msg = document.createElement('button');
            msg.className = 'enh-chat-btn-action';
            msg.textContent = '✉️';
            msg.title = 'Private message';
            msg.style.marginLeft = '2px';
            msg.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                const myUsername = extractUser();
                if (!myUsername) return;
                const url = `/users/${myUsername}/conversations/create?username=${encodeURIComponent(username)}`;
                window.open(url, '_blank');
            };
            // Edit message only if this is self
            let editBtn = null;
            if (username === userSelf) {
                editBtn = document.createElement('button');
                editBtn.className = 'enh-chat-btn-action';
                editBtn.title = 'Edit message';
                editBtn.style.marginLeft = '2px';
                editBtn.innerHTML = '&#9998;';
                editBtn.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    let rootMsg = address.closest('.chatbox-message');
                    if (!rootMsg) return;
                    let contentSection = rootMsg.querySelector('.chatbox-message__content, section.bbcode-rendered');
                    let content = contentSection ? contentSection.innerText.trim() : '';
                    const chatbox = document.querySelector('#chatbox__messages-create');
                    if (!chatbox) return;
                    chatbox.value = content;
                    chatbox.focus();
                    chatbox.setSelectionRange(chatbox.value.length, chatbox.value.length);
                };
            }
            let insertAfter = span;
            let node = span.nextSibling;
            while (
                node &&
                (node.nodeType === 1 || node.nodeType === 3) &&
                (
                    (node.nodeType === 1 && (
                        node.tagName === 'IMG' ||
                        node.tagName === 'SPAN' ||
                        node.tagName === 'I' ||
                        node.tagName === 'SVG'
                    )) ||
                    (node.nodeType === 3 && node.textContent.trim() === '')
                )
            ) {
                insertAfter = node;
                node = node.nextSibling;
            }
            if (insertAfter.nextSibling) {
                insertAfter.parentNode.insertBefore(atBtn, insertAfter.nextSibling);
                insertAfter.parentNode.insertBefore(reply, atBtn.nextSibling);
                insertAfter.parentNode.insertBefore(msg, reply.nextSibling);
                if (editBtn) insertAfter.parentNode.insertBefore(editBtn, msg.nextSibling);
            } else {
                insertAfter.parentNode.appendChild(atBtn);
                insertAfter.parentNode.appendChild(reply);
                insertAfter.parentNode.appendChild(msg);
                if (editBtn) insertAfter.parentNode.appendChild(editBtn);
            }
        });
    }
    const init = () => {
        let tryCount = 0;
        const check = setInterval(() => {
            const chatbox = document.querySelector('#chatbox__messages-create');
            const chat = document.querySelector('.chatroom__messages');
            if (chatbox && chat) {
                const ok = setupBBCodePanel(chatbox);
                if (ok) {
                    clearInterval(check);
                    addReplyButtonsEach();
                    const observer = new MutationObserver(() => addReplyButtonsEach());
                    observer.observe(chat, { childList: true });
                }
            }
            if (++tryCount > 50) clearInterval(check);
        }, 800);
    }
    const style = document.createElement('style');
    style.innerHTML = `
    #bbCodesPanelContainer {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        margin: 0 0 6px 0 !important;
        position: relative !important;
        left: 0 !important;
        float: none !important;
        clear: none !important;
    }
    #bbCodesPanel {
        display: flex !important;
        flex-direction: row !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        justify-content: flex-start !important;
        align-items: center !important;
        background: transparent !important;
        color: white !important;
        padding: 2px 7px 2px 7px !important;
        border-radius: 7px !important;
        border: none !important;
        gap: 6px !important;
        margin: 0 !important;
        box-shadow: none !important;
        align-self: flex-start !important;
        left: 0 !important;
    }
    #bbCodesPanel .bbc-btn, .enh-chat-btn-action {
        font-size: 13.5px !important;
        font-family: inherit !important;
        background: #383868 !important;
        color: #ffe266 !important;
        border-radius: 4.2px !important;
        margin-left: 5px !important;
        margin-right: 0 !important;
        padding: 2.5px 9px 2.5px 9px !important;
        vertical-align:middle !important;
        cursor: pointer !important;
        border:none !important;
        box-shadow:none !important;
        font-weight: 600 !important;
        transition: background 0.13s;
        outline: none !important;
        line-height: 1.2 !important;
        display:inline-block !important;
        min-width:24px !important;
        min-height:24px !important;
    }
    #bbCodesPanel .bbc-btn:hover, #bbCodesPanel .bbc-btn:focus,
    .enh-chat-btn-action:hover, .enh-chat-btn-action:focus {
        background: #b068e7 !important;
        color: #fff !important;
    }
    #bbCodesPanel input[type=color] {
        padding: 0 !important; margin-left:5px !important; background:none !important;border:none !important; width:18px !important;height:16px !important;
    }
    `;
    document.head.appendChild(style);
    const hideTypingStyle = document.createElement('style');
    hideTypingStyle.innerHTML = `
    .chatbox__typing, .chatbox-typing, .typing-indicator,
    .chatroom__user-typing, .chat__user-typing,
    .user-typing, .typing, .is-typing-banner,
    .chatbox__footer__is-typing,
    [data-typing],
    span[x-show*="activePeer"] {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
        height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
    `;
    document.head.appendChild(hideTypingStyle);
    init();
})();
