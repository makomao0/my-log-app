// ==========================================
// 初期設定とデータ
// ==========================================
const STORAGE_KEY = 'kodama_logs_v2';
let currentTopPart = "all";
let currentSort = 'new';
let editingPostId = null; // 編集中の投稿IDを保持する
let currentBase64Image = null; // 画像データを一時保存する変数


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

// ==========================================
// 分析機能
// ==========================================
function renderAnalysis() {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const resultTitle = document.getElementById('type-result');
    const adviceText = document.getElementById('advice-text');
    const topPartName = document.getElementById('top-part-name');

    if (!logs || logs.length === 0) {
        if (resultTitle) resultTitle.innerText = "データがありません";
        return;
    }

    const totals = {};
    logs.forEach(l => {
        for (let p in l.details) {
            const engKey = Object.keys(PART_LABELS).find(key => PART_LABELS[key] === p) || p;
            totals[engKey] = (totals[engKey] || 0) + l.details[p];
        }
    });

    currentTopPart = Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b, "all");

    if (topPartName) topPartName.innerText = PART_LABELS[currentTopPart];
    const guide = HEALTH_DATABASE[currentTopPart];
    if (guide && resultTitle) {
        resultTitle.innerText = guide.title;
        adviceText.innerHTML = guide.text;
    }

    document.querySelectorAll('.heat-spot').forEach(s => s.style.display = 'none');
    const targetSpot = document.getElementById(`heat-${currentTopPart}`);
    if (targetSpot) targetSpot.style.display = 'block';
}

// 💡 「解決策をもっと見る」ボタン（この機能が絞り込みの鍵！）
function goToSolutions() {
    const filter = document.getElementById('part-filter');
    if (filter) {
        filter.value = currentTopPart; // フィルターを現在の最大部位に合わせる
        renderPosts(); // 絞り込みを即座に反映
        filter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ==========================================
// 知恵袋（掲示板）機能
// ==========================================
function renderPosts() {
    const postList = document.getElementById('post-list');
    if (!postList) return;

    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
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
             // postList.innerHTML 内の post-actions 部分を書き換え
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
        </div>
    `).join('') || '<p style="text-align:center; color:#888; padding:20px;">まだ投稿がありません。</p>';
}


// 投稿を削除する
function deletePost(postId) {
    if (!confirm('この投稿を削除してもよろしいですか？')) return;

    let posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
    // 指定したID以外の投稿だけを残す（＝削除）
    posts = posts.filter(p => p.id !== postId);

    localStorage.setItem('community_posts', JSON.stringify(posts));
    renderPosts(); // 画面を更新
}

// ==========================================
// 4. 投稿・リアクション・通知
// ==========================================
// 編集モードでモーダルを開く
function openEditModal(postId) {
    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    editingPostId = postId; // どの投稿を編集するか記憶

    // モーダルの中身を現在の投稿内容に書き換える
    document.getElementById('post-part').value = post.part;
    document.getElementById('post-text').value = post.text;

    // タイトルとボタンの文字を変える
    document.querySelector('.modal-content h3').innerText = "✨ 投稿を編集する";
    document.querySelector('.btn-submit').innerText = "更新する";

    openModal();
}


// お礼アニメーションを表示する関数
function showSuccessAnimation(msg) {
    const toast = document.getElementById('success-toast');
    const toastMsg = document.getElementById('toast-message');

    if (!toast) return;

    toastMsg.innerText = msg;
    toast.classList.add('show');

    // 2.5秒後に自動で消える
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}


// 既存の submitPost を「新規」と「編集」両方対応できるように修正
function submitPost() {
    const part = document.getElementById('post-part').value;
    const text = document.getElementById('post-text').value;
    // ★ 選択されたアイコンを取得
    const avatar = document.getElementById('post-avatar-value').value;

    if (!text.trim()) return;

    let posts = JSON.parse(localStorage.getItem('community_posts') || '[]');

    if (editingPostId) {
        const index = posts.findIndex(p => p.id === editingPostId);
        if (index !== -1) {
            posts[index].part = part;
            posts[index].text = text;
            posts[index].avatar = avatar; // 編集時も更新
        }
        editingPostId = null;
    } else {
        posts.unshift({
            id: Date.now(),
            part: part,
            text: text,
            avatar: avatar, // ★ 保存
            image: currentBase64Image, // ★ここを追加
            thanks: 0,
            date: new Date().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            isMine: true
        });
    }

    localStorage.setItem('community_posts', JSON.stringify(posts));
    renderPosts();
    closeModal();
    clearPostImage();

    // ★ 最後にアニメーションを呼び出す
    if (editingPostId) {
        showSuccessAnimation("修正したよ！ありがとう✨");
    } else {
        showSuccessAnimation("投稿ありがとう！🧸");
    }
}

// closeModal も修正（文字を元に戻す）
function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('post-text').value = '';
    editingPostId = null;
    document.querySelector('.modal-content h3').innerText = "✨ 知恵をシェアする";
    document.querySelector('.btn-submit').innerText = "投稿する";
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
// 「役に立った」＆ 通知機能
// ==========================================
function addThank(postId) {
    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.thanks++;
        localStorage.setItem('community_posts', JSON.stringify(posts));

        // 通知登録
        const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
        notifs.unshift({
            id: Date.now(),
            targetPostId: postId,
            text: `あなたの「#${PART_LABELS[post.part] || post.part}」の知恵が参考にされました！✨`,
            isRead: false,
            date: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        });
        localStorage.setItem('user_notifications', JSON.stringify(notifs));

        renderPosts();
        updateNotifBadge();
    }
}

function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    const hasUnread = notifs.some(n => !n.isRead);
    badge.style.display = hasUnread ? 'block' : 'none';
}

// ==========================================
// 画面操作系（モーダルなど）
// ==========================================
function changeSort(sortType) {
    currentSort = sortType;
    document.getElementById('sort-new').classList.toggle('active', sortType === 'new');
    document.getElementById('sort-popular').classList.toggle('active', sortType === 'popular');
    renderPosts();
}

function openModal() { document.getElementById('modal-overlay').style.display = 'flex'; }
function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; document.getElementById('post-text').value = ''; }
function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    badge.style.display = notifs.some(n => !n.isRead) ? 'block' : 'none';
}

// ページ読み込み時に1回だけ実行
window.onload = function () {
    renderAnalysis();
    renderPosts();
    updateNotifBadge();
    if (typeof displayPoints === 'function') displayPoints();
};

function jumpToPost(postId) {
    closeNotif();
    const targetElement = document.getElementById(`post-${postId}`);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetElement.classList.add('highlight-post');
        setTimeout(() => {
            targetElement.classList.remove('highlight-post');
        }, 2000);
    }
}


function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return; // 要素がなくてもエラーにしない
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    badge.style.display = notifs.some(n => !n.isRead) ? 'block' : 'none';
}


// アイコンモーダルを開く
function openAvatarModal() {
    document.getElementById('avatar-modal-overlay').style.display = 'flex';
}

// アイコンモーダルを閉じる
function closeAvatarModal() {
    document.getElementById('avatar-modal-overlay').style.display = 'none';
}

// アイコンを選択した時の処理
function selectAvatar(imagePath) {
    // 表示（imgタグのsrc）を更新
    document.getElementById('current-selected-icon-img').src = imagePath;
    // 隠し入力（保存用）の値を更新
    document.getElementById('post-avatar-value').value = imagePath;

    closeAvatarModal();
}



// 画像を選んだ時にプレビューを表示する
function previewPostImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentBase64Image = e.target.result; // 画像をBase64文字列に変換
            document.getElementById('post-image-preview').src = currentBase64Image;
            document.getElementById('image-preview-container').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// 選択した画像をリセットする
function clearPostImage() {
    currentBase64Image = null;
    document.getElementById('post-image-input').value = "";
    document.getElementById('image-preview-container').style.display = 'none';
}

// スタンプの種類を定義
const STAMP_TYPES = [
    { id: 'wakaru', emoji: '🤝', label: 'わかる' },
    { id: 'yattemiru', emoji: '🏃', label: 'やってみる' },
    { id: 'saiko', emoji: '✨', label: '最高' }
];

// スタンプを押す関数
function addStamp(postId, stampId) {
    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
    const post = posts.find(p => p.id === postId);

    if (post) {
        if (!post.stamps) post.stamps = {}; // スタンプ保存用オブジェクトがなければ作成
        post.stamps[stampId] = (post.stamps[stampId] || 0) + 1;

        localStorage.setItem('community_posts', JSON.stringify(posts));
        renderPosts(); // 再描画

        // 自分の投稿にスタンプがついたら通知する
        if (post.isMine) {
            showSuccessAnimation(`${STAMP_TYPES.find(s => s.id === stampId).emoji} スタンプが届いたよ！`);
        }
    }
}
