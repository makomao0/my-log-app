
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
    // --- 既存の項目 ---
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

    // --- 新しく追加する項目 ---
    'みみ': {
        title: '耳の違和感（かも？）',
        text: '耳鳴りや詰まった感じはありませんか？気圧の変化や疲れでも起こります。',
        search: '近くの耳鼻咽喉科'
    },
    'みぎみみ': { title: '右耳の違和感', text: '耳を触りすぎていませんか？静かな場所で休みましょう。', search: '近くの耳鼻咽喉科' },
    'ひだりみみ': { title: '左耳の違和感', text: '疲れが溜まっているサインかも。ゆっくり耳の周りをほぐして。', search: '近くの耳鼻咽喉科' },

    'くび': {
        title: '首のコリ・痛み（かも？）',
        text: 'スマホを長時間見ていませんか？「ストレートネック」に注意。',
        search: '近くの整形外科'
    },
    'むね': {
        title: '胸の痛み・動悸（かも？）',
        text: 'チクチク、ズキズキする場合は、ストレスや胃酸の逆流の可能性も。',
        search: '近くの循環器内科 内科'
    },
    'うで': {
        title: '腕のだるさ・疲れ（かも？）',
        text: 'キーボード操作や重い荷物で筋肉が張っています。手首を回して。',
        search: '近くの整形外科'
    },
    'みぎうで': { title: '右腕の疲れ', text: '利き腕の使いすぎかもしれません。', search: '近くの整形外科' },
    'ひだりうで': { title: '左腕の疲れ', text: '無理な姿勢で寝ていませんでしたか？', search: '近くの整形外科' },

    'あし': {
        title: '足の疲れ・むくみ（かも？）',
        text: '立ち仕事や歩きすぎが原因かも。足首を回したり、高くして寝てみて。',
        search: '近くの整形外科'
    },
    'みぎあし': { title: '右足の疲れ', text: '重心が右に偏っているかもしれません。', search: '近くの整形外科' },
    'ひだりあし': { title: '左足の疲れ', text: 'ストレッチで血行を良くしましょう。', search: '近くの整形外科' },
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


const MEDICAL_GUIDE = {
    '薬': {
        title: 'お薬のアドバイス',
        text: '用法用量を守って飲みましょう。お薬手帳を持って医師に相談するのが一番安心です。',
        search: '近くのドラッグストア'
    },
    '病院': {
        title: '受診の目安',
        text: '「いつもと違う痛み」や「強い痛み」がある場合は、早めに受診しましょう。何科か迷う場合は、まずは内科や整形外科へ。',
        search: '近くの総合病院'
    },
    '冷やす': { title: '冷やす', text: 'ズキズキ痛む時や熱がある時は、保冷剤をタオルで巻いて当ててみて。' },
    '温める': { title: '温める', text: 'お腹が痛い時や筋肉が凝っている時は、ゆっくりお風呂に浸かって温めよう。' },
    '休む': { title: '休む', text: '一番の薬は睡眠です。スマホを置いて、暗い部屋でゆっくり休みましょう。' },
    '水分': { title: '水分補給', text: '一度にたくさん飲まず、こまめに少しずつ常温の水を飲みましょう。' },
    '呼吸': { title: 'リラックス呼吸', text: '鼻から吸って、口からゆっくり吐く。5回繰り返すと落ち着くよ。' },
    '食事': { title: '食事のアドバイス', text: '消化に良いうどんやお粥を選ぼう。刺激物は控えめに。' },
    '相談': { title: '相談しよう', text: '一人で抱え込まず、信頼できる人や学校の先生にこの記録を見せてみて。' }
};

// 2. モーダルを表示する関数
function showDetail(type) {
    const modal = document.getElementById('modal-detail');
    const title = document.getElementById('detail-title');
    const text = document.getElementById('detail-text');

    const guide = MEDICAL_GUIDE[type];

    if (guide) {
        title.innerText = guide.title;
        let content = `<p>${guide.text}</p>`;

        // 検索ワードがある場合だけ、病院検索ボタンを追加
        if (guide.search) {
            content += `
                <div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px;">
                    <button class="btn-solve" style="width: 100%; background-color: #ff9800; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;" 
                        onclick="searchHospital('${guide.search}')">
                        🏥 ${guide.search}を検索
                    </button>
                </div>`;
        }
        text.innerHTML = content;
    }
    modal.style.display = 'block';
}

// 3. 病院検索（Googleマップ）へ飛ばす関数
function searchHospital(query) {
    const q = query || "近くの病院";
    // ブラウザが認識しやすい標準的なURL形式に修正
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    window.open(mapUrl, '_blank');
}

// 4. モーダルを閉じる関数
function closeDetail() {
    document.getElementById('modal-detail').style.display = 'none';
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





function closeDetail() {
    document.getElementById('modal-detail').style.display = 'none';
}





let viewingDate = new Date(); // 現在表示している日付

// 日付を変更する関数
function changeDate(offset) {
    viewingDate.setDate(viewingDate.getDate() + offset);
    updateVisualization();
}

// 視覚化の更新
function updateVisualization() {
    const dateStr = viewingDate.toLocaleDateString();
    const resultElement = document.getElementById("result");
    if (resultElement) {
        resultElement.innerText = "データを更新しました";
    }


    // ログを取得
    const logs = JSON.parse(localStorage.getItem('kodama_logs_v2') || '[]');

    // 全エリアの色をリセット
    const areas = document.querySelectorAll('.touch-area');
    areas.forEach(a => a.style.backgroundColor = 'transparent');

    // 指定日の部位ごとの合計ダメージを集計
    const summary = {};
    logs.forEach(log => {
        const logDate = new Date(log.date).toLocaleDateString();
        if (logDate === dateStr) {
            const part = log.details ? Object.keys(log.details)[0] : null;
            if (part) {
                summary[part] = (summary[part] || 0) + (Number(log.totalLevel) || 0);
            }
        }
    });

    // ダメージ量に応じて赤色を塗る
    for (const part in summary) {
        const targetEl = document.getElementById(`part-${part}`);
        if (targetEl) {
            const damage = summary[part];
            // 透明度をダメージ量で変える (最大Lv.100と想定)
            const opacity = Math.min(damage / 100, 0.8);
            targetEl.style.backgroundColor = `rgba(255, 0, 0, ${opacity})`;

            // 視覚的に「熱い」感じを出すための影
            targetEl.style.boxShadow = `0 0 ${damage / 5}px rgba(255, 0, 0, 0.5)`;
        }
    }
}

// htmlのonclickの代わりにJS側で一括設定する場合
// 判定エリアへの一括イベント登録
document.querySelectorAll('.touch-area').forEach(area => {
    // pointerdownを使うことでスマホの反応を速くします
    area.addEventListener('pointerdown', (e) => {
        e.preventDefault(); // ブラウザのデフォルト動作を防止

        // IDから「area-」や「part-」を取り除いて部位名を取得
        // HTML側で id="area-あたま" のように設定されている前提です
        const partName = e.currentTarget.id.replace('area-', '').replace('part-', '');

        // 記録処理
        countUpAtLocation(partName, e);

        // 視覚フィードバック（ぷるん）
        e.currentTarget.style.transition = 'transform 0.1s';
        e.currentTarget.style.transform = 'scale(1.2)';
        setTimeout(() => {
            e.currentTarget.style.transform = 'scale(1.0)';
        }, 100);
    });
});

// タップエフェクト（+5）の座標修正
function showTapEffect(e) {
    const effect = document.createElement('div');
    effect.className = 'tap-effect';
    effect.innerHTML = '+5';

    // スクロール分を考慮した座標設定
    effect.style.left = e.pageX + 'px';
    effect.style.top = e.pageY + 'px';

    document.body.appendChild(effect);

    // アニメーションが終わったら削除
    setTimeout(() => effect.remove(), 500);
}

// 左右スワイプ検知
let touchstartX = 0;
let touchendX = 0;

document.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    handleGesture();
});

function handleGesture() {
    if (touchendX < touchstartX - 50) changeDate(1);  // 左スワイプで翌日
    if (touchendX > touchstartX + 50) changeDate(-1); // 右スワイプで前日
}

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', () => {
    updateVisualization();
});




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
