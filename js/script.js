
// ==========================================
// 1. 基本設定とデータ
// ==========================================
const STORAGE_KEY = 'kodama_logs_v2';
const POINT_KEY = 'user_points';
let sessionLogs = {};
let displayDate = new Date();
let currentTopPart = "all"; // 現在の分析で一番痛い部位

// アドバイスと病院検索のデータベース
const HEALTH_DATABASE = {
    'あたま': {
        title: '緊張型頭痛（かも？）',
        text: '首や肩のコリ、ストレスが原因かもしれません。目を休めて温めてみて。',
        search: '近くの脳神経外科 内科'
    },
    'おなか': {
        title: '消化不良・腹痛（かも？）',
        text: 'お腹を温めて、消化に良いうどんやお粥を食べましょう。',
        search: '近くの消化器内科'
    },
    'こし・せなか': {
        title: '筋肉の疲れ（かも？）',
        text: '同じ姿勢が続いていませんか？軽いストレッチが効果的です。',
        search: '近くの整形外科'
    },
    '薬': { title: 'お薬のアドバイス', text: '用法用量を守って飲みましょう。お薬手帳を忘れずに。', search: '近くの薬局' },
    '病院': { title: '受診の目安', text: '強い痛みが続く場合は、我慢せず医師に相談してください。', search: '近くの総合病院' },
    '冷やす': { title: '冷やす', text: 'ズキズキ痛む時や熱がある時は、タオル越しに冷やして。' },
    '温める': { title: '温める', text: 'お腹の痛みや、慢性的なコリは温めると楽になります。' },
    '休む': { title: '休む', text: '一番の薬は睡眠です。スマホを置いてゆっくり休みましょう。' },
    '水分': { title: '水分補給', text: 'こまめに少しずつ、常温の水を飲みましょう。' },
    '呼吸': { title: 'リラックス呼吸', text: '鼻から吸って口から吐く。5回繰り返すと落ち着くよ。' },
    '食事': { title: '食事のアドバイス', text: '消化に良いものを選び、刺激物は控えましょう。' },
    '相談': { title: '相談しよう', text: '一人で悩まず、信頼できる人にこのログを見せてみて。' }
};

// ==========================================
// 2. 分析機能（analysis.html用）
// ==========================================
function renderAnalysis() {
    console.log("分析を開始します...");
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const resultTitle = document.getElementById('type-result');
    const adviceText = document.getElementById('advice-text');
    const topPartName = document.getElementById('top-part-name');

    if (!logs || logs.length === 0) {
        if (resultTitle) resultTitle.innerText = "データ収集中";
        if (adviceText) adviceText.innerText = "ホームで体をタップして記録してね！";
        if (topPartName) topPartName.innerText = "なし";
        return;
    }

    // 集計
    const totals = {};
    logs.forEach(l => {
        for (let p in l.details) totals[p] = (totals[p] || 0) + l.details[p];
    });

    // 最大部位の特定
    currentTopPart = Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b);

    // UI更新
    if (topPartName) topPartName.innerText = currentTopPart;
    const guide = HEALTH_DATABASE[currentTopPart];
    if (guide) {
        if (resultTitle) resultTitle.innerText = guide.title;
        if (adviceText) adviceText.innerHTML = guide.text;
    }

    // ヒートマップ
    const idMap = { 'あたま': 'heat-head', 'おなか': 'heat-stomach', 'こし・せなか': 'heat-back' };
    document.querySelectorAll('.heat-spot').forEach(s => s.style.display = 'none');
    const spotId = idMap[currentTopPart];
    if (spotId && document.getElementById(spotId)) {
        document.getElementById(spotId).style.display = 'block';
    }
}

// 分析から知恵袋へ
function goToSolutions() {
    const filter = document.getElementById('part-filter');
    if (filter) {
        filter.value = currentTopPart === "all" ? "all" : currentTopPart;
        renderPosts();
        filter.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==========================================
// 3. 知恵袋機能（analysis.html / community.html用）
// ==========================================
function renderPosts() {
    const list = document.getElementById('post-list');
    if (!list) return;

    const filter = document.getElementById('part-filter').value;
    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');

    const filtered = filter === 'all' ? posts : posts.filter(p => p.part === filter);

    list.innerHTML = filtered.reverse().map(p => `
        <div class="post-card">
            <div class="post-header">
                <span class="post-tag">#${p.part}</span>
                <span class="post-date">${new Date().toLocaleDateString()}</span>
            </div>
            <p>${p.text}</p>
        </div>
    `).join('') || '<p style="text-align:center; padding:20px;">まだ投稿がありません。</p>';
}

// ==========================================
// 4. アクション・詳細表示（action.html用）
// ==========================================
function showDetail(type) {
    const modal = document.getElementById('modal-detail') || document.getElementById('modal-overlay');
    const title = document.getElementById('detail-title');
    const text = document.getElementById('detail-text');
    const guide = HEALTH_DATABASE[type];

    if (guide && title && text) {
        title.innerText = guide.title;
        text.innerHTML = `<p>${guide.text}</p>` + (guide.search ?
            `<button class="btn-solve" style="width:100%; margin-top:15px;" onclick="searchHospital('${guide.search}')">🏥 ${guide.search}を検索</button>` : '');
    }
    if (modal) modal.style.display = 'block';
}

function searchHospital(query) {
    const q = query || "近くの病院";
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(q)}`, '_blank');
}

function closeModal() {
    const modal = document.getElementById('modal-detail') || document.getElementById('modal-overlay');
    if (modal) modal.style.display = 'none';
}

// ==========================================
// 5. 初期化（すべてのページ共通）
// ==========================================

function init() {
    displayPoints();

    // ホーム画面（index.html）の場合
    const lvEl = document.getElementById('lv');
    if (lvEl) {
        // 保存されたログから合計ダメージを計算
        const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const total = logs.reduce((sum, log) => sum + log.totalLevel, 0);

        lvEl.innerText = total;
        updateFace(total); // ページ読み込み時に顔をセット
    }
}

// これひとつで確実に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
// ==========================================
// 2. 痛みの記録機能
// ==========================================
function countUpAtLocation(part, event) {
    sessionLogs[part] = (sessionLogs[part] || 0) + 5;
    let totalLv = Object.values(sessionLogs).reduce((a, b) => a + b, 0);

    // UI更新
    const lvEl = document.getElementById('lv');
    const partEl = document.getElementById('target-part');
    if (lvEl) lvEl.innerText = Math.min(totalLv, 1000);
    if (partEl) partEl.innerText = `【${part}】を記録中...`;

    if (event) showTapEffect(event);
    autoSave(part);
}

function autoSave(part) {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    logs.push({ date: new Date().toISOString(), details: { [part]: 5 }, totalLevel: 5 });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    let points = parseInt(localStorage.getItem(POINT_KEY) || '0');
    localStorage.setItem(POINT_KEY, points + 1);
    displayPoints();
}

function showTapEffect(e) {
    const effect = document.createElement('div');
    effect.className = 'tap-effect';
    effect.innerHTML = '+5';
    effect.style.left = e.pageX + 'px';
    effect.style.top = e.pageY + 'px';
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}




function searchHospital(query) {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, '_blank');
}

function closeDetail() {
    document.getElementById('modal-detail').style.display = 'none';
}

// ==========================================
// 5. カレンダー・知恵袋・初期化
// ==========================================

function displayPoints() {
    const el = document.getElementById('point-display');
    if (el) el.innerText = localStorage.getItem(POINT_KEY) || '0';
}

window.onload = function () {
    displayPoints(); // ポイント表示

    // 今いるページが「分析画面」だったら解析を実行
    if (document.getElementById('type-result')) {
        renderAnalysis();
    }

    // 今いるページが「知恵袋」だったら投稿を表示
    if (document.getElementById('post-list')) {
        renderPosts();
    }
};
// 5. カレンダー描画（月切り替え対応版に統合）
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('current-month');
    if (!grid || !monthLabel) return;

    grid.innerHTML = '';
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    monthLabel.innerText = `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    // 空白埋め
    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(Object.assign(document.createElement('div'), { className: 'cal-day empty' }));
    }

    // 日付生成
    for (let i = 1; i <= lastDate; i++) {
        const dayLogs = logs.filter(l => {
            const d = new Date(l.date);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === i;
        });

        const el = document.createElement('div');
        el.className = 'cal-day' + (dayLogs.length ? ' active' : '');

        // 今日の日付に目印をつける（任意）
        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && i === today.getDate()) {
            el.classList.add('today');
        }

        el.innerHTML = `<span>${i}</span>${dayLogs.length ? '👾' : ''}`;

        el.onclick = () => {
            if (dayLogs.length) {
                const total = dayLogs.reduce((s, l) => s + l.totalLevel, 0);
                alert(`【${month + 1}/${i}の記録】\n合計ダメージ: ${total}\n記録回数: ${dayLogs.length}回`);
            }
        };
        grid.appendChild(el);
    }
}
// レベルに応じて「にわとり」の顔を変える
function updateFace(lv) {
    const face = document.getElementById('face');
    if (!face) return;

    let iconNum = 1;

    // 数値の判定
    if (lv === 0) iconNum = 1;
    else if (lv < 50) iconNum = 2;
    else if (lv < 100) iconNum = 3;
    else if (lv < 200) iconNum = 4;
    else if (lv < 300) iconNum = 5;
    else if (lv < 400) iconNum = 6;
    else if (lv < 500) iconNum = 7;
    else if (lv < 600) iconNum = 8;
    else if (lv < 700) iconNum = 9;
    else if (lv < 800) iconNum = 10;
    else if (lv < 900) iconNum = 11;
    else if (lv < 1000) iconNum = 12;
    else iconNum = 5; // 1000以上はとりあえず5

    // 画像をセット
    face.innerHTML = `<img src="imgs/icons/${iconNum}.png" alt="にわとり" width="100px" id="char-img">`;

    // つぶやきメッセージも一緒に更新する（前の手順で作った関数）
    if (typeof updateNiwaStatus === 'function') {
        updateNiwaStatus();
    }
}
// 月を切り替える関数
function changeMonth(diff) {
    displayDate.setMonth(displayDate.getMonth() + diff);
    renderCalendar();
}

// 6. 共通処理（ポイント・通知）
function displayPoints() {
    const el = document.getElementById('point-display');
    if (el) el.innerText = localStorage.getItem('user_points') || '0';
}

function checkHomeNotifications() {
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    const hasUnread = notifs.some(n => !n.isRead);
    const homeBadge = document.getElementById('home-notif-badge');
    if (homeBadge) homeBadge.style.display = hasUnread ? 'block' : 'none';
}

// 初期化
window.onload = function () {
    displayPoints();
    checkHomeNotifications();
    const path = window.location.pathname;
    if (path.includes('analysis.html')) renderAnalysis();
    if (path.includes('calendar.html')) renderCalendar();
};


// 6. ACTION: 救急BOX・知識カード
const knowledge = {
    '薬': '用法用量を守って飲みましょう。お薬手帳を持って医師に相談するのが一番安心です。',
    '病院': '無理せず早めに受診しましょう。これまでのログを見せるとスムーズです。',
    '冷やす': '熱がある時や、ズキズキ痛む時は保冷剤をタオルで巻いて当ててみて。',
    '温める': 'お腹が痛い時や体がだるい時は、ゆっくりお風呂に浸かったりカイロで温めよう。',
    '休む': '一番の薬は睡眠です。スマホを置いて、暗い部屋で目を閉じよう。',
    '水分': '一度にたくさん飲まず、こまめに少しずつ常温の水を飲みましょう。',
    '呼吸': '鼻から吸って、口からゆっくり吐く。これを5回繰り返すとリラックスできるよ。',
    '食事': '消化に良いうどんやお粥を選ぼう。お菓子や刺激物は控えめに。',
    '相談': '一人で抱え込まず、保健室の先生や親にこの「お薬手帳」の画面を見せてみて。'
};

function showDetail(type) {
    const modal = document.getElementById('modal-detail');
    const title = document.getElementById('detail-title');
    const text = document.getElementById('detail-text');
    const guide = HEALTH_DATABASE[type];

    if (guide) {
        title.innerText = guide.title;
        let content = `<p>${guide.text}</p>`;

        // 検索ワードがある場合のみボタンを表示
        if (guide.search) {
            content += `
                <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
                    <button class="btn-save" style="width: 100%;" onclick="searchHospital('${guide.search}')">
                        🏥 ${guide.search}を検索
                    </button>
                </div>`;
        }
        text.innerHTML = content;
    } else {
        title.innerText = type;
        text.innerText = "アドバイスを準備中です。";
    }
    modal.style.display = 'block';
}


const MEDICAL_INFO = {
    '病院': {
        title: '病院へ行くタイミング',
        text: '・強い痛みが3日以上続く<br>・夜眠れないほどの痛みがある<br>・しびれや麻痺がある<br><br>これらに当てはまる場合は早めの受診を。',
        action: '<button class="btn-save" onclick="searchHospital()">🏥 近くの病院を検索</button>'
    },
    '薬': {
        title: 'お薬のアドバイス',
        text: '市販の鎮痛剤は、用法用量を守って使いましょう。飲みすぎや空腹時の服用には注意が必要です。',
        action: '<a href="https://www.kusurino-shiori.jp/" target="_blank">📖 くすりのしおりで調べる</a>'
    }
};

function showDetail(type) {
    const modal = document.getElementById('modal-detail');
    const title = document.getElementById('detail-title');
    const text = document.getElementById('detail-text');

    // 基本データ
    title.innerText = type;

    // 詳細データがあれば差し替え、なければデフォルト
    if (MEDICAL_INFO[type]) {
        text.innerHTML = MEDICAL_INFO[type].text + '<br><br>' + (MEDICAL_INFO[type].action || "");
    } else {
        text.innerText = `${type}についての一般的な対処法を表示します...`;
    }

    modal.style.display = 'block';
}

function searchHospital(query) {
    // 正しいGoogleマップ検索URL
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(mapUrl, '_blank');
}

function closeDetail() {
    document.getElementById('modal-detail').style.display = 'none';
}

// 症状に応じた解説と推奨される診療科のデータ
const MEDICAL_GUIDE = {
    '薬': {
        title: 'お薬のアドバイス',
        text: '市販の鎮痛剤は、用法用量を守って使いましょう。飲みすぎや空腹時の服用には注意が必要です。痛みが引かない場合は成分の異なる薬を試す前に医師に相談してください。',
        search: '近くのドラッグストア'
    },
    '病院': {
        title: '受診の目安',
        text: '「いつもと違う痛み」「急激な悪化」「しびれを伴う」場合は、迷わず受診しましょう。何科に行けばいいか迷う場合は、まずは内科か整形外科が一般的です。',
        search: '近くの総合病院'
    },
    'あたま': { // 部位別の解説も追加可能
        title: '緊張型頭痛（かもしれない）',
        text: '後頭部から首筋にかけて、重苦しい感じや締め付けられるような痛みが特徴です。ストレスや長時間の同じ姿勢が原因であることが多いです。',
        search: '近くの脳神経外科 内科'
    },
    'こし・せなか': {
        title: '筋筋膜性腰痛（かもしれない）',
        text: '急な動作や長時間のデスクワークで筋肉が過度に緊張している状態です。安静にしすぎず、痛みのない範囲で動かす方が回復が早いこともあります。',
        search: '近くの整形外科'
    }
};

// 病院検索を実行する関数
function searchHospital(query) {
    if (!query) query = "近くの病院";
    // Googleマップの検索用URLを生成
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(mapUrl, '_blank');
}

function showDetail(type) {
    const modal = document.getElementById('modal-detail');
    const title = document.getElementById('detail-title');
    const text = document.getElementById('detail-text');

    // データがある場合は詳細を表示
    const guide = MEDICAL_GUIDE[type];

    if (guide) {
        title.innerText = guide.title;
        // テキスト + 検索ボタンを挿入
        text.innerHTML = `
            ${guide.text}
            <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
                <p style="font-size: 0.8em; color: #666;">▼ 今すぐ探す</p>
                <button class="btn-save" style="width: 100%;" onclick="searchHospital('${guide.search}')">
                    🔍 ${guide.search}を表示
                </button>
            </div>
        `;
    } else {
        // デフォルト表示
        title.innerText = type;
        text.innerText = `${type}に関するアドバイスを準備中です。`;
    }

    modal.style.display = 'block';
}


// 4. 知恵袋投稿表示（community.html用）
function renderPosts() {
    const postList = document.getElementById('post-list');
    const partFilter = document.getElementById('part-filter').value;
    const posts = JSON.parse(localStorage.getItem('community_posts') || '[]');
    postList.innerHTML = '';

    const filteredPosts = partFilter === 'all' ? posts : posts.filter(p => p.part === partFilter);

    filteredPosts.reverse().forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `  
            <div class="post-header">
                <span class="post-tag">#${post.part}</span>
                <span class="post-date">${new Date().toLocaleDateString()}</span>
            </div>
            <p>${post.text}</p>
        `;
        postList.appendChild(card);
    }
    );

    if (filteredPosts.length === 0) {
        postList.innerHTML = '<p style="text-align:center; padding:20px;">まだ投稿がありません。</p>';
    }
}


// ==========================================
// にわとりのつぶやき & 変化機能
// ==========================================

function countUpAtLocation(part, event) {
    sessionLogs[part] = (sessionLogs[part] || 0) + 5;
    let totalLv = Object.values(sessionLogs).reduce((a, b) => a + b, 0);

    const lvEl = document.getElementById('lv');
    if (lvEl) {
        lvEl.innerText = totalLv;
        // 【ここが重要！】レベルが変わったので顔を更新
        updateFace(totalLv);
    }

    if (event) showTapEffect(event);
    autoSave(part);
}


// ==========================================
// お薬手帳（履歴一覧）表示機能
// ==========================================
function renderHistory() {
    const historyBody = document.getElementById('history-body');
    const noHistory = document.getElementById('no-history');
    const historyList = document.getElementById('history-list');

    if (!historyBody) return; // 履歴画面じゃない場合は何もしない

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (logs.length === 0) {
        if (noHistory) noHistory.style.display = 'block';
        if (historyList) historyList.style.display = 'none';
        return;
    }

    // 新しい順（降順）に並び替え
    const sortedLogs = logs.reverse();

    historyBody.innerHTML = sortedLogs.map(log => {
        const date = new Date(log.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

        // 部位を取り出す（detailsオブジェクトのキーを取得）
        const parts = Object.keys(log.details).join(', ');

        return `
            <tr>
                <td>${dateStr}</td>
                <td><span class="part-tag">${parts}</span></td>
                <td><span class="lv-badge">${log.totalLevel}</span></td>
            </tr>
        `;
    }).join('');
}

// 初期化(init)を修正
function init() {
    displayPoints();
    // 既存の処理...
    if (document.getElementById('history-body')) renderHistory();
}
