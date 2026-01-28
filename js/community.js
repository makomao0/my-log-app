// ==========================================
// 初期設定とデータ
// ==========================================
const STORAGE_KEY = 'kodama_logs_v2';
const COMMUNITY_KEY = 'community_posts';
const NOTIF_KEY = 'user_notifications';

let currentTopPart = "all";
let currentSort = 'new';
let editingPostId = null;
let currentBase64Image = null;

const HEALTH_DATABASE = {
    'head': { title: '緊張型頭痛（かも？）', text: '首や肩のコリ、ストレスが原因かもしれません。目を休めて温めてみて。' },
    'ear-r': { title: '右耳の違和感', text: '耳を触りすぎていませんか？静かな場所で休みましょう。' },
    'ear-l': { title: '左耳の違和感', text: '疲れが溜まっているサインかも。気圧の変化も影響します。' },
    'neck': { title: '首のコリ・痛み（かも？）', text: 'スマホを長時間見ていませんか？ゆっくりストレッチしましょう。' },
    'chest': { title: '胸の痛み・動悸（かも？）', text: 'ストレスや胃酸の逆流の可能性も。深呼吸をしてみて。' },
    'stomach': { title: '消化不良・腹痛（かも？）', text: 'お腹を温めて、消化に良いうどんやお粥を食べましょう。' },
    'arm-r': { title: '右腕のだるさ（かも？）', text: '使いすぎかもしれません。手首を回して筋肉をほぐして。' },
    'arm-l': { title: '左腕のだるさ（かも？）', text: '肩甲骨から動かすようにストレッチしてみましょう。' },
    'back': { title: '筋肉の疲れ（かも？）', text: '同じ姿勢が続いていませんか？軽い腰の運動が効果的。' },
    'leg-r': { title: '右足の疲れ（かも？）', text: '重心が偏っているかも。お風呂でマッサージしてね。' },
    'leg-l': { title: '左足の疲れ（かも？）', text: 'むくみやすい部位です。足を高くして寝てみて。' }
};

const PART_LABELS = {
    'head': 'あたま', 'ear-r': 'みぎみみ', 'ear-l': 'ひだりみみ',
    'neck': 'くび', 'chest': 'むね', 'stomach': 'おなか',
    'arm-r': 'みぎうで', 'arm-l': 'ひだりうで', 'back': 'こし・せなか',
    'leg-r': 'みぎあし', 'leg-l': 'ひだりあし', 'all': 'すべての部位'
};

const STAMP_TYPES = [
    { id: 'wakaru', emoji: '🤝', label: 'わかる' },
    { id: 'yattemiru', emoji: '🏃', label: 'やってみる' },
    { id: 'saiko', emoji: '✨', label: '最高' }
];

// ==========================================
// 分析機能
// ==========================================
// ==========================================
// 分析機能 (修正版)
// ==========================================
function renderAnalysis() {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const resultTitle = document.getElementById('type-result');
    const adviceText = document.getElementById('advice-text');
    const topPartName = document.getElementById('top-part-name');

    // データがない場合の処理
    if (!logs || logs.length === 0) {
        if (resultTitle) resultTitle.innerText = "データがまだありません";
        if (topPartName) topPartName.innerText = "---";
        return;
    }

    const totals = {};

    // 1. データの集計：各部位ごとの記録回数をカウント
    logs.forEach(l => {
        if (l.details) {
            for (let p in l.details) {
                // すでにキーがある場合は加算、なければ1を代入
                totals[p] = (totals[p] || 0) + 1;
            }
        }
    });

    // 2. もっとも多い部位（TopPart）を特定
    // totals が空でないか確認してから計算
    const keys = Object.keys(totals);
    if (keys.length === 0) {
        if (resultTitle) resultTitle.innerText = "記録がありません";
        return;
    }

    currentTopPart = keys.reduce((a, b) => totals[a] > totals[b] ? a : b);

    // 3. 表示の更新：PART_LABELS を使って日本語に変換
    if (topPartName) {
        // ここで PART_LABELS[currentTopPart] を使うことで日本語になります
        topPartName.innerText = PART_LABELS[currentTopPart] || currentTopPart;
    }

    const guide = HEALTH_DATABASE[currentTopPart];
    if (guide && resultTitle) {
        resultTitle.innerText = guide.title;
        adviceText.innerHTML = guide.text;
    }

    // 4. ヒートスポットの表示切り替え
    document.querySelectorAll('.heat-spot').forEach(s => s.style.display = 'none');
    const targetSpot = document.getElementById(`heat-${currentTopPart}`);
    if (targetSpot) targetSpot.style.display = 'block';
}

function goToSolutions() {
    const filter = document.getElementById('part-filter');
    if (filter) {
        filter.value = currentTopPart;
        renderPosts();
        filter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ==========================================
// 知恵袋（掲示板）機能
// ==========================================
function renderPosts() {
    const postList = document.getElementById('post-list');
    if (!postList) return;

    const posts = JSON.parse(localStorage.getItem(COMMUNITY_KEY) || '[]');
    const filterPart = document.getElementById('part-filter').value;
    const keywordInput = document.getElementById('keyword-search');
    const keyword = keywordInput ? keywordInput.value.toLowerCase() : "";

    posts.sort((a, b) => (currentSort === 'popular') ? (b.thanks || 0) - (a.thanks || 0) : b.id - a.id);

    const displayPosts = posts.filter(post => {
        const matchPart = (filterPart === 'all' || post.part === filterPart);
        const matchKey = post.text.toLowerCase().includes(keyword);
        return matchPart && matchKey;
    });

    postList.innerHTML = displayPosts.map(post => `
    <div class="post-card" id="post-${post.id}">
        <div class="user-avatar">
            <img src="${post.avatar || 'imgs/icons/1.png'}" width="40" height="40">
        </div>
        <div class="post-main">
            <div class="post-header">
                <span class="username">
                    ${post.isMine ? '<span class="my-post-label">あなたの投稿</span>' : '匿名ログさん'} 
                    <span class="tag">#${PART_LABELS[post.part] || post.part}</span>
                </span>
                <span class="post-date">${post.date}</span>
            </div>
            <p class="post-text">${post.text}</p>
            ${post.image ? `<div class="post-attached-image"><img src="${post.image}" onclick="window.open(this.src)"></div>` : ''}
            
            <div class="post-actions">
                <button class="action-item" onclick="addThank(${post.id})">✨ 役に立った (${post.thanks || 0})</button>
                <div class="stamp-container">
                    ${STAMP_TYPES.map(s => `
                        <button class="stamp-btn" onclick="addStamp(${post.id}, '${s.id}')">
                            ${s.emoji} <span class="count">${(post.stamps && post.stamps[s.id]) || 0}</span>
                        </button>
                    `).join('')}
                </div>
                ${post.isMine ? `
                    <button class="btn-edit" onclick="openEditModal(${post.id})">✏️</button>
                    <button class="btn-delete" onclick="deletePost(${post.id})">🗑</button>
                ` : ''}
            </div>
        </div>
    </div>
    `).join('') || '<p style="text-align:center; color:#888; padding:20px;">まだ投稿がありません。</p>';
}

// ==========================================
// 投稿・編集・削除
// ==========================================
function openModal() {
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('post-text').value = '';
    editingPostId = null;
    document.querySelector('.modal-content h3').innerText = "✨ 知恵をシェアする";
    document.querySelector('.btn-submit').innerText = "投稿する";
    clearPostImage();
}

function openEditModal(postId) {
    const posts = JSON.parse(localStorage.getItem(COMMUNITY_KEY) || '[]');
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    editingPostId = postId;
    document.getElementById('post-part').value = post.part;
    document.getElementById('post-text').value = post.text;

    // アイコンの復元
    document.getElementById('current-selected-icon-img').src = post.avatar || 'imgs/icons/1.png';
    document.getElementById('post-avatar-hidden-value').value = post.avatar || 'imgs/icons/1.png';

    document.querySelector('.modal-content h3').innerText = "✨ 投稿を編集する";
    document.querySelector('.btn-submit').innerText = "更新する";
    openModal();
}

function submitPost() {
    const part = document.getElementById('post-part').value;
    const text = document.getElementById('post-text').value;
    const avatar = document.getElementById('post-avatar-hidden-value').value;

    if (!text.trim()) return;

    let posts = JSON.parse(localStorage.getItem(COMMUNITY_KEY) || '[]');

    if (editingPostId) {
        const index = posts.findIndex(p => p.id === editingPostId);
        if (index !== -1) {
            posts[index].part = part;
            posts[index].text = text;
            posts[index].avatar = avatar;
        }
        showSuccessAnimation("修正したよ！ありがとう✨");
    } else {
        posts.unshift({
            id: Date.now(),
            part: part,
            text: text,
            avatar: avatar,
            image: currentBase64Image,
            thanks: 0,
            stamps: {},
            date: new Date().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            isMine: true
        });
        showSuccessAnimation("投稿ありがとう！🧸");
    }

    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));
    renderPosts();
    closeModal();
}

function deletePost(postId) {
    if (!confirm('この投稿を削除してもよろしいですか？')) return;
    let posts = JSON.parse(localStorage.getItem(COMMUNITY_KEY) || '[]');
    posts = posts.filter(p => p.id !== postId);
    localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));
    renderPosts();
}

// ==========================================
// リアクション・通知
// ==========================================
function addThank(postId) {
    const posts = JSON.parse(localStorage.getItem(COMMUNITY_KEY) || '[]');
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.thanks++;
        localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));

        const notifs = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
        notifs.unshift({
            id: Date.now(),
            targetPostId: postId,
            text: `あなたの「#${PART_LABELS[post.part] || post.part}」の知恵が参考にされました！✨`,
            isRead: false,
            date: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        });
        localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));

        renderPosts();
        updateNotifBadge();
    }
}

function addStamp(postId, stampId) {
    const posts = JSON.parse(localStorage.getItem(COMMUNITY_KEY) || '[]');
    const post = posts.find(p => p.id === postId);
    if (post) {
        if (!post.stamps) post.stamps = {};
        post.stamps[stampId] = (post.stamps[stampId] || 0) + 1;
        localStorage.setItem(COMMUNITY_KEY, JSON.stringify(posts));
        renderPosts();
        if (post.isMine) {
            const emoji = STAMP_TYPES.find(s => s.id === stampId).emoji;
            showSuccessAnimation(`${emoji} スタンプが届いたよ！`);
        }
    }
}

function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const notifs = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
    badge.style.display = notifs.some(n => !n.isRead) ? 'block' : 'none';
}

function changeSort(sortType) {
    currentSort = sortType;
    const newBtn = document.getElementById('sort-new');
    const popBtn = document.getElementById('sort-popular');
    if (newBtn) newBtn.classList.toggle('active', sortType === 'new');
    if (popBtn) popBtn.classList.toggle('active', sortType === 'popular');
    renderPosts();
}

// ==========================================
// 画像・アイコン操作
// ==========================================
function previewPostImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentBase64Image = e.target.result;
            document.getElementById('post-image-preview').src = currentBase64Image;
            document.getElementById('image-preview-container').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function clearPostImage() {
    currentBase64Image = null;
    const input = document.getElementById('post-image-input');
    if (input) input.value = "";
    const preview = document.getElementById('image-preview-container');
    if (preview) preview.style.display = 'none';
}

function openAvatarModal() {
    document.getElementById('avatar-modal-overlay').style.display = 'flex';
}

function closeAvatarModal() {
    document.getElementById('avatar-modal-overlay').style.display = 'none';
}

function selectAvatar(imagePath) {
    document.getElementById('current-selected-icon-img').src = imagePath;
    document.getElementById('post-avatar-hidden-value').value = imagePath;
    closeAvatarModal();
}

function showSuccessAnimation(msg) {
    const toast = document.getElementById('success-toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toast) return;
    toastMsg.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

/**
 * 履歴テーブルを日本語で描画する関数
 */
function renderStatsList() {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const container = document.getElementById('stats-list-container'); // HTML側のIDに合わせてください
    if (!container) return;

    const totals = {};
    logs.forEach(l => {
        if (l.details) {
            for (let p in l.details) {
                totals[p] = (totals[p] || 0) + 1;
            }
        }
    });

    const html = Object.keys(totals).map(p => {
        // ここで PART_LABELS を使い、英語を日本語に変換します
        const jpName = PART_LABELS[p] || p;
        const count = totals[p];
        const level = count * 5; // 例として1回につきLv5加算

        return `
            <div class="history-row" style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                <div style="flex: 1;">
                    <span class="tag" style="background: #fff5eb; color: #ff8c00; padding: 2px 8px; border-radius: 5px; font-size: 0.8rem;">
                        ${jpName}
                    </span>
                </div>
                <div style="flex: 1; text-align: center;">
                    <span style="background: #f0f4f8; padding: 4px 12px; border-radius: 15px; font-size: 0.8rem; color: #555;">
                        ${count}回の記録
                    </span>
                </div>
                <div style="flex: 1; text-align: right; font-weight: bold;">
                    Lv.${level}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html || '<p style="text-align:center; padding:20px; color:#888;">履歴がありません</p>';
}

window.onload = function () {
    renderAnalysis();
    renderPosts();
    updateNotifBadge();
    renderStatsList(); // これを追加！
};