// ==UserScript==
// @name         UNIT3D chatbox - polishtorrent.top edition
// @author       mehech
// @version      2.1
// @description  PTT chat helper
// @match        https://polishtorrent.top/*
// @grant        none
// @license      MIT
// @namespace    PTTchathelper
// ==/UserScript==

(function () {
    'use strict';

    const BOTNICKS = ['SYSTEM', 'NERDBOT'];
    const USER_COLORS = {
        'ace': '#ef008c',
        'TheoneandonlyPook': '#ef008c',
        'Demonic': '#ffac6b'
    };

    // Converts CSS rgb/rgba to hex (#rrggbb)
    function cssColorToHex(color) {
        if (!color) return '#ecc846';
        color = color.trim();

        if (color[0] === '#') {
            if (color.length === 4) {
                return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
            }
            return color.toLowerCase();
        }

        let rgbMatch = color.match(/^rgb[a]?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
        if (rgbMatch) {
            let r = parseInt(rgbMatch[1]), g = parseInt(rgbMatch[2]), b = parseInt(rgbMatch[3]);
            return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        }

        const cssColors = {
            'black': '#000000', 'white': '#ffffff', 'red': '#ff0000', 'blue': '#0000ff', 'yellow': '#ffff00',
            'green': '#008000', 'orange': '#ffa500', 'purple': '#800080', 'pink': '#ffc0cb', 'gold': '#ffd700',
            'gray': '#808080', 'grey': '#808080', 'aqua': '#00ffff', 'fuchsia': '#ff00ff', 'lime': '#00ff00',
            'navy': '#000080', 'teal': '#008080', 'maroon': '#800000', 'olive': '#808000', 'silver': '#c0c0c0'
        };
        if (cssColors[color.toLowerCase()]) {
            return cssColors[color.toLowerCase()];
        }

        return '#ecc846';
    }

    // Extract current logged in username from the page
    function extractUser() {
        const userLink = document.querySelector('a.top-nav__username--highresolution');
        if (userLink) {
            const span = userLink.querySelector('span');
            if (span) {
                return span.textContent.trim();
            }
            try {
                const url = new URL(userLink.href);
                return url.pathname.split('/').pop();
            } catch {
                return null;
            }
        }
        return null;
    }

    // Convert HTML to BBCode
    function htmlToBBCode(html) {
        html = html.replace(/<iframe[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/gi, function(_, url) {
            let videoId = "";
            const ytMatch = url.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_\-]+)/i);
            if (ytMatch) {
                videoId = ytMatch[1];
            } else {
                videoId = url;
            }
            return '[video]' + videoId + '[/video]';
        });
        html = html.replace(/<video[^>]*src=["']([^"']+)["'][^>]*>.*?<\/video>/gi, '[video]$1[/video]');
        html = html.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, function(_, imgSrc) {
            const proxyMatch = imgSrc.match(/url=(.+)$/);
            if (proxyMatch) {
                try {
                    const originalUrl = decodeURIComponent(proxyMatch[1]);
                    return '[img]' + originalUrl + '[/img]';
                } catch {
                    return '[img]' + imgSrc + '[/img]';
                }
            }
            return '[img]' + imgSrc + '[/img]';
        });
        return html
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '[b]$1[/b]')
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '[b]$1[/b]')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '[i]$1[/i]')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '[i]$1[/i]')
            .replace(/<u[^>]*>(.*?)<\/u>/gi, '[u]$1[/u]')
            .replace(/<span[^>]*style\s*=\s*["'][^"']*color:\s*([^;"']+)[^"']*["'][^>]*>(.*?)<\/span>/gi,
                (_, color, text) => '[color=' + cssColorToHex(color) + ']' + text + '[/color]')
            .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[url=$1]$2[/url]')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?(span|div)[^>]*>/gi, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/<\/?[^>]+(>|$)/g, '')
            .trim();
    }

    // Continuously remove placeholder (for dynamic frameworks like Alpine.js)
    function removePlaceholder(chatbox) {
        if (chatbox && chatbox.getAttribute('placeholder')) {
            chatbox.removeAttribute('placeholder');
        }
    }

    // Update live preview of BBCode
    function updatePreview(chatbox) {
        const previewArea = document.getElementById('bbCodePreviewArea');
        if (!previewArea) return;

        const val = chatbox.value.trim();

        if (!val) {
            previewArea.style.display = 'none';
            return;
        }

        previewArea.style.display = 'block';

        // Convert BBCode to HTML for preview - improved regex
        let html = val
            // [url=link]text[/url]
            .replace(/\[url=([^\]]+?)\]([\s\S]+?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>')
            // [url]link[/url]
            .replace(/\[url\]([^\[]+?)\[\/url\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/\[b\]([\s\S]+?)\[\/b\]/gi, '<b>$1</b>')
            .replace(/\[i\]([\s\S]+?)\[\/i\]/gi, '<i>$1</i>')
            .replace(/\[u\]([\s\S]+?)\[\/u\]/gi, '<u>$1</u>')
            .replace(/\[color=([^\]]+?)\]([\s\S]+?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
            .replace(/\[img\]([^\[]+?)\[\/img\]/gi, '<img src="$1" style="max-width:100%; max-height:200px; border-radius:4px; margin:5px 0;" />')
            .replace(/\[video\]([^\[]+?)\[\/video\]/gi, function(_, videoId) {
                if (videoId.match(/^[a-zA-Z0-9_\-]{11}$/)) {
                    return '<iframe width="280" height="157" src="https://www.youtube.com/embed/' + videoId + '" frameborder="0" allowfullscreen style="border-radius:4px; margin:5px 0;"></iframe>';
                }
                return '<span style="color:#888;">[Video: ' + videoId + ']</span>';
            })
            .replace(/\n/g, '<br>');

        previewArea.innerHTML = '<small style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Live Preview</small><br>' + html;
    }

    function setupBBCodePanel(chatbox) {
        if (!chatbox) return false;
        if (document.getElementById('bbCodePreviewArea')) return true;

        // Create preview area BEFORE chatbox
        const previewDiv = document.createElement('div');
        previewDiv.id = 'bbCodePreviewArea';
        chatbox.parentNode.insertBefore(previewDiv, chatbox);

        // Create button panel AFTER chatbox
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'bbCodesPanel';
        buttonContainer.innerHTML = `
            <button type="button" class="bbc-btn" data-bbcode="[b][/b]" title="Bold">B</button>
            <button type="button" class="bbc-btn" data-bbcode="[i][/i]" title="Italic">I</button>
            <button type="button" class="bbc-btn" data-bbcode="[u][/u]" title="Underline">U</button>
            <button type="button" class="bbc-btn" data-bbcode="[img][/img]" title="Image">IMG</button>
            <button type="button" class="bbc-btn" data-bbcode="[url][/url]" title="URL">URL</button>
            <button type="button" class="bbc-btn" id="videoButton" title="Video">VIDEO</button>
            <button type="button" class="bbc-btn" id="colorButton" title="Color">Color</button>
            <input type="color" id="colorPicker" style="display:none;" value="#ecc846">
            <button type="button" class="bbc-btn" id="emojiButton" title="Emoji">😀</button>
            <div id="emojiMenu" style="display:none;">
                <span class="emoji" data-emoji="😀">😀</span>
                <span class="emoji" data-emoji="😁">😁</span>
                <span class="emoji" data-emoji="😂">😂</span>
                <span class="emoji" data-emoji="🤣">🤣</span>
                <span class="emoji" data-emoji="😊">😊</span>
                <span class="emoji" data-emoji="😎">😎</span>
                <span class="emoji" data-emoji="😎">😎</span>
                <span class="emoji" data-emoji="😍">😍</span>
                <span class="emoji" data-emoji="😘">😘</span>
                <span class="emoji" data-emoji="🤔">🤔</span>
                <span class="emoji" data-emoji="😢">😢</span>
                <span class="emoji" data-emoji="😭">😭</span>
                <span class="emoji" data-emoji="😡">😡</span>
                <span class="emoji" data-emoji="👍">👍</span>
                <span class="emoji" data-emoji="👎">👎</span>
                <span class="emoji" data-emoji="👌">👌</span>
                <span class="emoji" data-emoji="✌️">✌️</span>
                <span class="emoji" data-emoji="🔥">🔥</span>
                <span class="emoji" data-emoji="⭐">⭐</span>
                <span class="emoji" data-emoji="❤️">❤️</span>
                <span class="emoji" data-emoji="💯">💯</span>
            </div>
        `;
        chatbox.parentNode.insertBefore(buttonContainer, chatbox.nextSibling);

        buttonContainer.querySelectorAll('.bbc-btn[data-bbcode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const bbCode = btn.getAttribute('data-bbcode');
                if (!bbCode) return;

                if (bbCode === '[img][/img]') {
                    insertImgBBCodeWithClipboard(bbCode, chatbox);
                } else if (bbCode === '[url][/url]') {
                    insertBBCodeWithClipboard(bbCode, chatbox);
                } else {
                    insertBBCode(chatbox, bbCode);
                }
            });
        });

        const colorBtn = buttonContainer.querySelector('#colorButton');
        const picker = buttonContainer.querySelector('#colorPicker');
        colorBtn.addEventListener('click', () => picker.click());
        picker.addEventListener('input', function () {
            const color = this.value;
            const chatbox = document.querySelector('#chatbox__messages-create');
            if (!chatbox) return;

            const selStart = chatbox.selectionStart;
            const selEnd = chatbox.selectionEnd;

            if (selStart !== undefined && selEnd !== undefined && selStart !== selEnd) {
                const before = chatbox.value.substring(0, selStart);
                const selected = chatbox.value.substring(selStart, selEnd);
                const after = chatbox.value.substring(selEnd);
                const colorBBCode = `[color=${cssColorToHex(color)}]${selected}[/color]`;
                chatbox.value = before + colorBBCode + after;
                chatbox.setSelectionRange(before.length + colorBBCode.length, before.length + colorBBCode.length);
            } else {
                const pos = chatbox.selectionStart || chatbox.value.length;
                const colorBBCode = `[color=${cssColorToHex(color)}][/color]`;
                chatbox.value = chatbox.value.slice(0, pos) + colorBBCode + chatbox.value.slice(pos);
                chatbox.setSelectionRange(pos + colorBBCode.length - 8, pos + colorBBCode.length - 8);
            }
            chatbox.focus();
            updatePreview(chatbox);
        });

        buttonContainer.querySelector('#videoButton').addEventListener('click', () => insertVideoBBCodeWithClipboard(chatbox));

        buttonContainer.querySelector('#emojiButton').addEventListener('click', () => {
            const menu = document.getElementById('emojiMenu');
            menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
        });

        buttonContainer.querySelector('#emojiMenu').addEventListener('click', e => {
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

        chatbox.addEventListener('input', () => {
            updatePreview(chatbox);
            removePlaceholder(chatbox);
        });
        chatbox.addEventListener('keyup', () => updatePreview(chatbox));
        chatbox.addEventListener('focus', () => removePlaceholder(chatbox));

        const placeholderObserver = new MutationObserver(() => {
            removePlaceholder(chatbox);
        });
        placeholderObserver.observe(chatbox, { 
            attributes: true, 
            attributeFilter: ['placeholder'] 
        });

        return true;
    }

    function insertEmoji(emoji, chatbox) {
        const pos = chatbox.selectionStart || chatbox.value.length;
        chatbox.value = chatbox.value.substring(0, pos) + emoji + chatbox.value.substring(pos);
        chatbox.setSelectionRange(pos + emoji.length, pos + emoji.length);
        chatbox.focus();
        updatePreview(chatbox);
    }

    function insertBBCode(chatbox, bbCode) {
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
        updatePreview(chatbox);
    }

    function insertBBCodeWithClipboard(tag, chatbox) {
        navigator.clipboard.readText().then(clipText => {
            const newContent = clipText.trim().length > 0
                ? tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1${clipText}$3`)
                : tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1$2$3`);
            chatbox.value += newContent + ' ';
            chatbox.focus();
            updatePreview(chatbox);
        }).catch(() => {
            chatbox.value += tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1$2$3`) + ' ';
            chatbox.focus();
            updatePreview(chatbox);
        });
    }

    function insertImgBBCodeWithClipboard(tag, chatbox) {
        navigator.clipboard.readText().then(clipText => {
            const newContent = clipText.trim().length > 0
                ? tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1${clipText}$3`)
                : tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1$2$3`);
            chatbox.value += newContent + '\n';
            chatbox.focus();
            updatePreview(chatbox);
        }).catch(() => {
            chatbox.value += tag.replace(/(\[.*?\])(.*?)(\[\/.*?\])/, `$1$2$3`) + '\n';
            chatbox.focus();
            updatePreview(chatbox);
        });
    }

    function insertVideoBBCodeWithClipboard(chatbox) {
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
                chatbox.value += `[video]${videoId}[/video] `;
            } else {
                chatbox.value += `[video]${ytLink}[/video] `;
            }
            chatbox.focus();
            updatePreview(chatbox);
        }).catch(() => {
            chatbox.value += '[video][/video] ';
            chatbox.focus();
            updatePreview(chatbox);
        });
    }

    function addReplyButtonsEach() {
        const userSelf = extractUser();
        document.querySelectorAll('.enh-chat-btn-action').forEach(i => i.remove());

        document.querySelectorAll('address.chatbox-message__address.user-tag').forEach(address => {
            if (!address) return;

            if (address.querySelector('.enh-chat-btn-action')) {
                return;
            }

            const link = address.querySelector('.user-tag__link');
            const span = link && link.querySelector('span');
            if (!link || !span) return;

            let username = span.textContent.replace(/^\s*|\s*$/g, '').replace(/\s+/, '').trim();
            const isBot = BOTNICKS.some(bot => bot.toLowerCase() === username.toLowerCase());
            if (!username || isBot) return;

            let rootMsg = address.closest('.chatbox-message');
            if (!rootMsg) rootMsg = address.parentNode;

            const contentSection = rootMsg.querySelector('.chatbox-message__content, section.bbcode-rendered');
            const contentText = contentSection ? contentSection.textContent.trim() : '';

            let rawColor = '#ecc846';
            if (span && span.style && span.style.color && span.style.color !== '') {
                rawColor = span.style.color;
            } else if (link && link.style && link.style.color && link.style.color !== '') {
                rawColor = link.style.color;
            } else {
                try {
                    rawColor = window.getComputedStyle(span).color;
                } catch (e) { }
            }

            if ((!rawColor || rawColor === 'inherit' || rawColor === '#ecc846') && USER_COLORS.hasOwnProperty(username)) {
                rawColor = USER_COLORS[username];
            }

            let userColor = cssColorToHex(rawColor);

            const atBtn = document.createElement('button');
            atBtn.className = 'enh-chat-btn-action';
            atBtn.textContent = '@';
            atBtn.title = 'Mention user';
            atBtn.onclick = function (event) {
                event.preventDefault();
                event.stopPropagation();
                const chatbox = document.querySelector('#chatbox__messages-create');
                if (!chatbox) return;

                const mentionText = `[url=https://polishtorrent.top/users/${username}][color=${userColor}]@${username}[/color][/url] `;
                chatbox.value += mentionText;
                chatbox.focus();
                updatePreview(chatbox);
            };

            const reply = document.createElement('button');
            reply.className = 'enh-chat-btn-action';
            reply.textContent = '↩️';
            reply.title = 'Reply';
            reply.style.marginLeft = '2px';
            reply.onclick = function (event) {
                event.preventDefault();
                event.stopPropagation();
                const chatbox = document.querySelector('#chatbox__messages-create');
                if (!chatbox) return;

                const quoteText = `[url=https://polishtorrent.top/users/${username}][color=${userColor}][b]${username}[/b][/color][/url]: [color=#ffff80][i]"${contentText}"[/i][/color]\n\n`;
                chatbox.value += quoteText;
                chatbox.focus();
                updatePreview(chatbox);
            };

            const msg = document.createElement('button');
            msg.className = 'enh-chat-btn-action';
            msg.textContent = '✉️';
            msg.title = 'Private message';
            msg.style.marginLeft = '2px';
            msg.onclick = function (event) {
                event.preventDefault();
                event.stopPropagation();
                const myUsername = extractUser();
                if (!myUsername) return;

                const url = `/users/${myUsername}/conversations/create?username=${encodeURIComponent(username)}`;
                window.open(url, '_blank');
            };

            let additionalBtn;
            if (username === userSelf) {
                additionalBtn = document.createElement('button');
                additionalBtn.className = 'enh-chat-btn-action';
                additionalBtn.title = 'Edit message';
                additionalBtn.style.marginLeft = '2px';
                additionalBtn.innerHTML = '✎';
                additionalBtn.onclick = function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    let rootMsg = address.closest('.chatbox-message');
                    if (!rootMsg) return;

                    const contentSection = rootMsg.querySelector('.chatbox-message__content, section.bbcode-rendered');
                    const htmlMsg = contentSection ? contentSection.innerHTML.trim() : '';
                    const bbcode = htmlToBBCode(htmlMsg);

                    const chatbox = document.querySelector('#chatbox__messages-create');
                    if (!chatbox) return;

                    chatbox.value = bbcode;
                    chatbox.focus();
                    chatbox.setSelectionRange(chatbox.value.length, chatbox.value.length);
                    updatePreview(chatbox);
                };
            } else {
                additionalBtn = document.createElement('button');
                additionalBtn.className = 'enh-chat-btn-action';
                additionalBtn.textContent = '🎁';
                additionalBtn.title = 'Send Gift';
                additionalBtn.style.marginLeft = '2px';
                additionalBtn.onclick = function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    const tokenMeta = document.querySelector('meta[name="csrf-token"]');
                    const token = tokenMeta ? tokenMeta.content : '';
                    const myUsername = extractUser();
                    if (!myUsername) return;

                    addGiftDialog(token, myUsername, username);
                };
            }

            address.appendChild(atBtn);
            address.appendChild(reply);
            address.appendChild(msg);
            address.appendChild(additionalBtn);
        });
    }

    function addGiftDialog(token, user, username) {
        const existing = document.getElementById('gift-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'gift-panel';
        panel.innerHTML = `
            <form method="POST" action="/users/${username}/gifts">
                <div class="gift-panel-header">Send Gift to: ${username}</div>
                <label>Amount</label>
                <input type="number" name="bonus_points" min="100" step="100" value="100" required>
                <label>Message (optional)</label>
                <textarea name="message" rows="3"></textarea>
                <input type="hidden" name="_token" value="${token}">
                <div class="gift-panel-buttons">
                    <button type="submit">Send</button>
                    <button type="button" id="cancel-gift-btn">Cancel</button>
                </div>
            </form>
        `;
        document.body.appendChild(panel);

        const st = document.createElement('style');
        st.textContent = `
            #gift-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -51%);
                background: #232229;
                color: #ffe266;
                border-radius: 13px;
                min-width: 340px;
                max-width: 97vw;
                padding: 26px 30px 20px 30px;
                z-index: 9999;
                border: 1.5px solid #3d3c44;
                font-family: inherit;
                box-shadow: 0 2px 22px #000a;
            }
            #gift-panel .gift-panel-header {
                font-size: 1.17em;
                font-weight: 700;
                color: #ffe266;
                margin-bottom: 19px;
                border-bottom: 1px solid #544ea5;
                padding-bottom: 11px;
                letter-spacing: 0.7px;
            }
            #gift-panel label {
                display: block;
                margin-bottom: 12px;
                color: #fffad0;
                font-size: 1em;
                font-weight: 500;
            }
            #gift-panel input[type="number"], #gift-panel textarea {
                width: 100%;
                background: #292939;
                color: #ffe266;
                border: 1.5px solid #b068e7;
                border-radius: 6px;
                padding: 10px 14px;
                font-size: 1em;
                margin-top: 3px;
                margin-bottom: 14px;
                box-sizing: border-box;
                font-family: inherit;
                outline: none;
            }
            #gift-panel input[type="number"]:focus, #gift-panel textarea:focus {
                border-color: #ffe266;
                background: #383868;
            }
            #gift-panel .gift-panel-buttons {
                text-align: right;
                margin-top: 13px;
            }
            #gift-panel button[type="submit"], #gift-panel button[type="button"] {
                background: #383868;
                color: #ffe266;
                font-weight: 600;
                border: none;
                border-radius: 4.2px;
                cursor: pointer;
                font-size: 1em;
                padding: 7px 24px;
                margin-right: 10px;
                margin-bottom: 3px;
                transition: background 0.13s, color 0.13s;
            }
            #gift-panel button[type="submit"]:hover, #gift-panel button[type="button"]:hover {
                background: #b068e7;
                color: #fff;
            }
            #gift-panel button[type="button"]:last-child {
                margin-right: 0;
            }
        `;
        document.head.appendChild(st);

        panel.querySelector('#cancel-gift-btn').onclick = function () {
            panel.remove();
            st.remove();
        };

        panel.querySelector('form').onsubmit = function (e) {
            e.preventDefault();
            const form = this;
            const formData = new FormData(form);

            fetch(form.action, {
                method: 'POST',
                credentials: 'include',
                body: formData
            })
                .then(r => r.text())
                .then(() => {
                    panel.remove();
                    st.remove();
                })
                .catch(() => {
                    panel.remove();
                    st.remove();
                });
            return false;
        };
    }

    function init() {
        let tryCount = 0;
        const check = setInterval(() => {
            const chatbox = document.querySelector('#chatbox__messages-create');
            const chat = document.querySelector('.chatroom__messages');

            if (chatbox && chat) {
                removePlaceholder(chatbox);
                setInterval(() => removePlaceholder(chatbox), 100);

                const ok = setupBBCodePanel(chatbox);
                if (ok) {
                    clearInterval(check);
                    addReplyButtonsEach();

                    const observer = new MutationObserver(() => addReplyButtonsEach());
                    observer.observe(chat, { childList: true });
                }
            }

            if (++tryCount > 50) {
                clearInterval(check);
            }
        }, 800);
    }

    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        /* Keep textarea normal size like original */
        #chatbox__messages-create {
            height: 38px !important;
            min-height: 38px !important;
            max-height: 38px !important;
            resize: none !important;
            overflow-y: auto !important;
            padding: 8px 12px !important;
        }

        /* Preview ABOVE textarea */
        #bbCodePreviewArea {
            display: none;
            background: rgba(35, 34, 41, 0.95);
            color: #fff !important;
            padding: 12px 16px;
            border-radius: 7px;
            border: 1.5px solid #3d3c44;
            margin-bottom: 8px;
            font-size: 13.5px;
            line-height: 1.6;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            max-height: 300px;
            overflow-y: auto;
        }
        #bbCodePreviewArea a {
            color: #b068e7 !important;
            text-decoration: underline !important;
            cursor: pointer;
        }
        #bbCodePreviewArea a:hover {
            color: #d080ff !important;
        }
        #bbCodePreviewArea img {
            display: block;
            margin: 5px 0;
        }

        /* Buttons BELOW textarea */
        #bbCodesPanel {
            display: flex;
            flex-direction: row;
            width: 100%;
            justify-content: flex-start;
            gap: 6px;
            background: transparent;
            color: white;
            border-radius: 7px;
            border: none;
            position: relative;
            margin-top: 6px;
        }
        #bbCodesPanel .bbc-btn,
        .enh-chat-btn-action {
            font-size: 13.5px;
            font-family: inherit;
            background: #383868;
            color: #ffe266;
            border-radius: 4.2px;
            margin-left: 5px;
            margin-right: 0;
            padding: 2.5px 9px 2.5px 9px;
            cursor: pointer;
            border: none;
            font-weight: 600;
            transition: background 0.13s;
            outline: none;
            line-height: 1.2;
            display: inline-block;
            min-width: 24px;
            min-height: 24px;
            box-shadow: none;
            vertical-align: middle;
        }
        #bbCodesPanel .bbc-btn:hover,
        #bbCodesPanel .bbc-btn:focus,
        .enh-chat-btn-action:hover,
        .enh-chat-btn-action:focus {
            background: #b068e7;
            color: #fff;
        }
        #emojiMenu {
            position: absolute;
            top: 35px;
            left: 0;
            background: #232229;
            border: 1.5px solid #3d3c44;
            border-radius: 7px;
            padding: 10px;
            z-index: 1000;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 5px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
        }
        #emojiMenu .emoji {
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
            transition: background 0.13s;
            text-align: center;
        }
        #emojiMenu .emoji:hover {
            background: #383868;
        }

        /* Hide label above chatbox */
        label[for="chatbox__messages-create"],
        .chatbox__messages-create-container label,
        .form__label[for="chatbox__messages-create"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            opacity: 0 !important;
        }

        /* Aggressive placeholder removal */
        #chatbox__messages-create::placeholder,
        #chatbox__messages-create::-webkit-input-placeholder,
        #chatbox__messages-create::-moz-placeholder,
        #chatbox__messages-create:-ms-input-placeholder {
            content: '' !important;
            color: transparent !important;
            opacity: 0 !important;
            font-size: 0 !important;
            visibility: hidden !important;
        }

        /* Hide typing indicators */
        .chatbox__typing,
        .chatbox-typing,
        .typing-indicator,
        .chatroom__user-typing,
        .chat__user-typing,
        .user-typing,
        .typing,
        .is-typing-banner,
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
    document.head.appendChild(styleFix);

    init();
})();
