// 初期化：データの読み込みと描画
window.onload = function () {
    renderPosts();
    updateNotifBadge(); // 追加：通知バッジの初期表示
};

let currentSort = 'new';

// 1. ソート切り替え
function changeSort(sortType) {
    currentSort = sortType;
    document.querySelectorAll('.sort-options button').forEach(btn => {
        const isTarget = (sortType === 'new' && btn.innerText.includes('新着')) ||
            (sortType === 'popular' && btn.innerText.includes('人気'));
        btn.classList.toggle('active', isTarget);
    });
    renderPosts();
}

// 2. モーダル操作
function openModal() {
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('post-text').value = '';
}

function closeNotif() {
    document.getElementById('notif-modal').style.display = 'none';
}

// 3. 投稿の送信
function submitPost() {
    const part = document.getElementById('post-part').value;
    const text = document.getElementById('post-text').value;

    if (!text.trim()) return;

    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
    const newPost = {
        id: Date.now(),
        part: part,
        text: text,
        thanks: 0,
        date: new Date().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    posts.unshift(newPost);
    localStorage.setItem('community_posts', JSON.stringify(posts));

    renderPosts();
    closeModal();
}

// 4. 掲示板の描画
function renderPosts() {
    const postList = document.getElementById('post-list');
    if (!postList) return;

    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
    const filterPart = document.getElementById('part-filter').value;
    const keyword = document.getElementById('keyword-search').value.toLowerCase();

    // ソート処理
    if (currentSort === 'popular') {
        posts.sort((a, b) => (b.thanks || 0) - (a.thanks || 0));
    } else {
        posts.sort((a, b) => b.id - a.id);
    }

    postList.innerHTML = '';

    let displayPosts = posts.filter(post => {
        const matchPart = (filterPart === 'all' || post.part === filterPart);
        const matchKey = (post.text.toLowerCase().includes(keyword));
        return matchPart && matchKey;
    });

    displayPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        // ★ ここが重要！背番号（ID）をセット
        card.id = `post-${post.id}`;

        card.innerHTML = `
            <div class="user-avatar">🧸</div>
            <div class="post-main">
                <div class="post-header">
                    <span class="username">匿名ログさん <span class="tag">#${post.part}</span></span>
                    <span class="post-date">${post.date}</span>
                </div>
                <p class="post-text">${post.text}</p>
                <div class="post-actions">
                    <button class="action-item" onclick="addThank(${post.id})">✨ 役に立った (${post.thanks || 0})</button>
                </div>
            </div>
        `;
        postList.appendChild(card);
    });

    if (displayPosts.length === 0) {
        postList.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">まだ投稿がありません。</p>';
    }
}

// 5. 「参考になった」ボタン & 通知生成
function addThank(postId) {
    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
    const post = posts.find(p => p.id === postId);

    if (post) {
        post.thanks++;
        localStorage.setItem('community_posts', JSON.stringify(posts));

        // 通知を作成
        const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
        notifs.unshift({
            id: Date.now(),
            targetPostId: postId,
            text: `あなたの「#${post.part}」の知恵が参考にされました！✨`,
            isRead: false,
            date: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        });
        localStorage.setItem('user_notifications', JSON.stringify(notifs));

        updateNotifBadge();
        renderPosts();

        if (navigator.vibrate) navigator.vibrate(10);
    }
}

// 6. 通知機能関連
function updateNotifBadge() {
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    const hasUnread = notifs.some(n => !n.isRead);
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.style.display = hasUnread ? 'block' : 'none';
    }
}

function openNotification() {
    const list = document.getElementById('notif-list');
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    list.innerHTML = '';

    if (notifs.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#ccc;">通知はありません</p>';
    }

    notifs.forEach(n => {
        const item = document.createElement('div');
        item.className = `notif-item ${n.isRead ? '' : 'new'}`;
        item.onclick = () => jumpToPost(n.targetPostId);
        item.innerHTML = `<div>${n.text}</div><small>${n.date}</small>`;
        list.appendChild(item);
        n.isRead = true;
    });
    localStorage.setItem('user_notifications', JSON.stringify(notifs));
    document.getElementById('notif-modal').style.display = 'flex';
    updateNotifBadge();
}

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

