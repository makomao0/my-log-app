// ==========================================
// 1. 基本設定とデータ
// ==========================================
const STORAGE_KEY = 'kodama_logs_v2';
const POINT_KEY = 'user_points';
const LEVEL_KEY = 'currentLevel';
const POINT_STORAGE_KEY = 'user_total_points';

let displayDate = new Date(); // カレンダー画面用
let isBackView = false;       // 背面表示フラグ

// 修正案：日付を保持する
let viewingDate = sessionStorage.getItem('lastViewDate')
    ? new Date(sessionStorage.getItem('lastViewDate'))
    : new Date();

function updateVisualization() {
    // ... 既存の処理 ...

    // 表示中の日付を一時保存（リロード対策）
    sessionStorage.setItem('lastViewDate', viewingDate.toISOString());
}


function getYMD(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// 1. データの定義（マップ用とウェブ検索用を分ける）
const MEDICAL_GUIDE = {
    '薬': {
        title: 'お薬のアドバイス',
        text: '用法用量を守って飲みましょう。お薬手帳を持って医師に相談するのが一番安心です。',
        mapSearch: '近くのドラッグストア',
        webSearch: '市販薬 飲み合わせ 注意'
    },
    '病院': {
        title: '受診の目安',
        text: '「いつもと違う痛み」や「強い痛み」がある場合は、早めに受診しましょう。何科か迷う場合は、まずは内科や整形外科へ。',
        mapSearch: '近くの総合病院',
        webSearch: '症状から何科か調べる'
    },
    '冷やす': {
        title: '冷やす',
        text: 'ズキズキ痛む時や熱がある時は、保冷剤をタオルで巻いて当ててみて。',
        mapSearch: '近くのコンビニ 保冷剤',
        webSearch: '正しいアイシングの方法'
    },
    '温める': {
        title: '温める',
        text: 'お腹が痛い時や筋肉が凝っている時は、ゆっくりお風呂に浸かって温めよう。',
        mapSearch: '近くの銭湯',
        webSearch: 'お腹を温める効果的な方法'
    },
    '休む': {
        title: '休む',
        text: '一番の薬は睡眠です。スマホを置いて、暗い部屋でゆっくり休みましょう。',
        mapSearch: '近くのホテル',
        webSearch: '早く寝るためのリラックス方法'
    },
    '水分': {
        title: '水分補給',
        text: '一度にたくさん飲まず、こまめに少しずつ常温の水を飲みましょう。',
        mapSearch: '近くの自動販売機',
        webSearch: '経口補水液の作り方'
    },
    '呼吸': {
        title: 'リラックス呼吸',
        text: '鼻から吸って、口からゆっくり吐く。5回繰り返すと落ち着くよ。',
        mapSearch: '近くの公園',
        webSearch: '自律神経を整える呼吸法'
    },
    '食事': {
        title: '食事のアドバイス',
        text: '消化に良いうどんやお粥を選ぼう。刺激物は控えめに。',
        mapSearch: '近くのうどん屋',
        webSearch: '消化に良い食べ物 レシピ'
    },
    '相談': {
        title: '相談しよう',
        text: '一人で抱え込まず、信頼できる人や学校の先生にこの記録を見せてみて。',
        mapSearch: '近くの保健所',
        webSearch: 'こども健康相談窓口 無料'
    }
};

// 2. モーダルを表示する関数
function openGoogleMap(query) {
    const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    window.open(mapUrl, '_blank');
}

function openGoogleSearch(query) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
}

function showDetail(type) {
    const modal = document.getElementById('modal-detail');
    const title = document.getElementById('detail-title');
    const text = document.getElementById('detail-text');
    const guide = MEDICAL_GUIDE[type];

    if (guide && modal) {
        title.innerText = guide.title;
        let content = `<p>${guide.text}</p>`;
        content += `<div style="margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px; display: flex; flex-direction: column; gap: 10px;">`;

        if (guide.mapSearch) {
            content += `<button style="..." onclick="openGoogleMap('${guide.mapSearch}')">📍 ${guide.mapSearch}をマップで探す</button>`;
        }
        if (guide.webSearch) {
            content += `<button style="..." onclick="openGoogleSearch('${guide.webSearch}')">🔍 「${guide.webSearch}」を調べる</button>`;
        }
        content += `</div>`;
        text.innerHTML = content;
        modal.style.display = 'block';
    }
}
// 4. モーダルを閉じる
function closeDetail() {
    document.getElementById('modal-detail').style.display = 'none';
}


// ==========================================
// 5. 初期化（すべてのページ共通）
// ==========================================

function init() {
    updateDisplayUserPoints(); // ここでポイントを表示
    displayPoints();
    if (document.getElementById('current-date-display')) updateVisualization();
    if (document.getElementById('history-body')) renderHistory();
    if (document.getElementById('calendar-grid')) renderCalendar();
}






// ==========================================
// 2. 痛みの記録機能
// ==========================================
function countUpAtLocation(part, event) {
    const damage = 5;
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    // ログ保存
    logs.push({
        date: new Date().toISOString(),
        details: { [part]: damage },
        totalLevel: damage
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    // ポイント加算
    let pts = parseInt(localStorage.getItem(POINT_KEY) || '0');
    localStorage.setItem(POINT_KEY, pts + 1);
    displayPoints();

    // UI更新（本日分の合計値を計算）
    const todayStr = new Date().toLocaleDateString();
    const todayTotal = logs
        .filter(l => new Date(l.date).toLocaleDateString() === todayStr)
        .reduce((sum, l) => sum + l.totalLevel, 0);

    const lvEl = document.getElementById('lv');
    if (lvEl) lvEl.innerText = todayTotal;

    updateFace(todayTotal);
    updateVisualization();
    if (event) showTapEffect(event);
}




function autoSave(part, amount) {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    logs.push({ date: new Date().toISOString(), details: { [part]: amount }, totalLevel: amount });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    let pts = parseInt(localStorage.getItem(POINT_KEY) || '0');
    localStorage.setItem(POINT_KEY, pts + 1);
    displayPoints();
    updateVisualization(); // 記録直後にヒートマップ更新
}







// 日付を変更する関数
function changeDate(offset) {
    viewingDate.setDate(viewingDate.getDate() + offset);
    updateVisualization();
}



function resetToToday() {
    viewingDate = new Date();
    updateVisualization();
}


// ==========================================
// 3. 視覚化（ヒートマップ）の更新
// ==========================================

function updateVisualization() {
    const dateDisplay = document.getElementById("current-date-display");
    if (dateDisplay) {
        const y = viewingDate.getFullYear();
        const m = String(viewingDate.getMonth() + 1).padStart(2, '0');
        const d = String(viewingDate.getDate()).padStart(2, '0');
        dateDisplay.innerText = `${y}/${m}/${d}`;
    }

    // --- 1. 全エリアのリセット ---
    document.querySelectorAll('.touch-area').forEach(a => {
        a.style.backgroundColor = 'transparent';
        a.style.boxShadow = 'none';
        a.style.filter = 'none';
    });

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const summary = {};
    let hasLogForThisDay = false;

    logs.forEach(log => {
        const logDate = new Date(log.date);
        const isSameDay = logDate.getFullYear() === viewingDate.getFullYear() &&
            logDate.getMonth() === viewingDate.getMonth() &&
            logDate.getDate() === viewingDate.getDate();

        if (isSameDay) {
            hasLogForThisDay = true;
            for (let part in log.details) {
                summary[part] = (summary[part] || 0) + (Number(log.details[part]) || 0);
            }
        }
    });

    // --- 2. ヒートマップの適用 ---
    for (let part in summary) {
        const targetEl = document.getElementById(`part-${part}`) || document.getElementById(`area-${part}`);
        if (targetEl) {
            const damage = summary[part];

            // 【調整】100ダメージで最大になるように設定
            const intensity = Math.min(damage / 10000, 1.0);
            const opacity = 0.4 + (intensity * 0.4); // 0.4〜0.8
            const blurSize = 5 + (intensity * 15);   // 5px〜20px

            // 背景色
            targetEl.style.backgroundColor = `rgba(249, 202, 120, ${opacity})`;

            // 外側の光（これが「ボワッ」とした質感を出す）
            targetEl.style.boxShadow = `0 0 ${blurSize}px ${blurSize / 2}px rgba(249, 202, 120, ${opacity})`;

            // 全体のぼかし（これが反映されない場合、親要素の overflow: hidden を疑う）
            targetEl.style.filter = `blur(${Math.max(2, blurSize / 3)}px)`;

            // 【重要】z-indexを上げて他の要素に消されないようにする
            targetEl.style.zIndex = "100";
        }
    }


}


function showTapEffect(e) {
    // 1. 数字のポップアップ (+5)
    const effect = document.createElement('div');
    effect.className = 'tap-effect';
    effect.innerText = '+5';
    effect.style.position = 'absolute';
    effect.style.left = (e.pageX - 20) + 'px';
    effect.style.top = (e.pageY - 40) + 'px';
    effect.style.fontSize = '24px';
    document.body.appendChild(effect);

    effect.animate([
        { transform: 'translateY(0) scale(0.5) rotate(-10deg)', opacity: 0 },
        { transform: 'translateY(-30px) scale(1.2) rotate(5deg)', opacity: 1, offset: 0.3 },
        { transform: 'translateY(-60px) scale(1) rotate(0deg)', opacity: 0 }
    ], {
        duration: 800,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' // 弾むイージング
    });

    // 2. パーティクル（キラキラ）
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 8 + 4;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = e.pageX + 'px';
        p.style.top = e.pageY + 'px';
        document.body.appendChild(p);

        const angle = (i / 8) * Math.PI * 2;
        const velocity = 50 + Math.random() * 30;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        p.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
        ], { duration: 500, easing: 'ease-out' });

        setTimeout(() => p.remove(), 500);
    }

    setTimeout(() => effect.remove(), 800);
}


// タイマーを管理する変数を外側に置いておく（チカチカ防止用）
let messageTimer;

document.addEventListener('pointerdown', (e) => {
    const area = e.target.closest('.touch-area');
    if (!area) return;

    e.preventDefault();
    const partName = area.id.replace('area-', '').replace('part-', '');

    // 1. spanの中身（あたま、おなか等）を取得
    const labelName = area.querySelector('span') ? area.querySelector('span').innerText : partName;

    // 2. 「〇〇を記録しました」という文章を作る
    const message = `${labelName}を記録しました`;

    // 3. 表示用の要素を書き換える
    const targetPartEl = document.getElementById('target-part');
    if (targetPartEl) {
        // すでに動いているタイマーがあればキャンセル（連続タップ対策）
        clearTimeout(messageTimer);

        targetPartEl.innerText = message;
        targetPartEl.style.color = "#d98817"; // 強調色
        targetPartEl.style.fontWeight = "bold";

        // 3秒後に元の案内に戻す
        messageTimer = setTimeout(() => {
            targetPartEl.innerText = "痛いところを押してね";
            targetPartEl.style.color = "";
            targetPartEl.style.fontWeight = "";
        }, 3000);
    }

    // 既存の記録・エフェクト処理
    countUpAtLocation(partName, e);

    // アニメーション（縮小）
    area.style.setProperty('--s', '0.92');
    setTimeout(() => {
        area.style.setProperty('--s', '1');
    }, 80);
});


// スワイプ管理用変数
let startX = 0;
let startY = 0;

// タッチ開始
document.addEventListener('touchstart', e => {
    // 【重要】シルエット部分やボタンを触ったときはスワイプ開始座標をリセットして反応させない
    if (e.target.closest('.touch-area') || e.target.closest('button')) {
        startX = 0;
        return;
    }
    startX = e.touches[0].pageX;
    startY = e.touches[0].pageY;
}, { passive: true });

// タッチ終了
document.addEventListener('touchend', e => {
    if (startX === 0) return; // 無視フラグが立っていたら終了

    let diffX = e.changedTouches[0].pageX - startX;
    let diffY = e.changedTouches[0].pageY - startY;

    // 横に100px以上動き、かつ縦の動きより大きい場合のみ日付変更
    if (Math.abs(diffX) > 100 && Math.abs(diffX) > Math.abs(diffY)) {
        changeDate(diffX > 0 ? -1 : 1);
    }
    startX = 0;
});


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

function checkHomeNotifications() {
    const notifs = JSON.parse(localStorage.getItem('user_notifications') || '[]');
    const hasUnread = notifs.some(n => !n.isRead);
    const homeBadge = document.getElementById('home-notif-badge');
    if (homeBadge) homeBadge.style.display = hasUnread ? 'block' : 'none';
}





// ==========================================
// お薬手帳（履歴一覧）表示機能
// ==========================================
function renderHistory() {
    const body = document.getElementById('history-body');
    if (!body) return;

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (logs.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center;">記録がありません</td></tr>';
        return;
    }

    body.innerHTML = [...logs].reverse().map(log => {
        const d = new Date(log.date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `
            <tr>
                <td>${dateStr}</td>
                <td><span class="part-tag">${Object.keys(log.details).join(', ')}</span></td>
                <td><span class="lv-badge">${log.totalLevel}</span></td>
            </tr>
        `;
    }).join('');
}



// 履歴画面の初期化
function initHistoryPage() {
    // 1. グラフを描画
    renderDamageChart();
    // 2. 履歴テーブルを描画
    renderHistory();
}

// グラフ描画ロジック
function renderDamageChart() {
    const viewport = document.querySelector('.chart-viewport');
    if (!viewport) return;

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const now = new Date();
    const hourlyData = new Array(24).fill(0);

    logs.forEach(log => {
        const logDate = new Date(log.date);
        const diffHours = Math.floor((now - logDate) / (1000 * 60 * 60));
        if (diffHours >= 0 && diffHours < 24) {
            hourlyData[23 - diffHours] += Number(log.totalLevel) || 0;
        }
    });

    const maxVal = Math.max(...hourlyData, 10);
    viewport.innerHTML = hourlyData.map((val, i) => {
        const height = (val / maxVal) * 100;
        const hourLabel = (now.getHours() - (23 - i) + 24) % 24;
        const barColor = val >= 50 ? '#ef4444' : '#ea7824';
        const labelText = hourLabel % 3 === 0 ? `${hourLabel}h` : '';

        return `
            <div class="chart-bar-group">
                <div class="chart-value" style="opacity: ${val > 0 ? 0.8 : 0}">${val}</div>
                <div class="chart-bar" style="height: ${height}%; background: ${barColor};"></div>
                <div class="chart-label">${labelText}</div>
            </div>
        `;
    }).join('');
}
// 既存の init 関数を拡張
const originalInit = init;
init = function () {
    originalInit();
    if (document.getElementById('history-body')) {
        initHistoryPage();
    }
};




function toggleBodyView() {
    isBackView = !isBackView;
    const btn = document.getElementById('view-flip-btn');
    const frontParts = document.querySelectorAll('.front-part');
    const backPart = document.getElementById('part-back');
    const mainImg = document.querySelector('.body-silhouette');

    if (isBackView) {
        btn.innerText = "まえを表示";
        frontParts.forEach(el => el.style.display = 'none');
        if (backPart) backPart.style.display = 'flex';
        if (mainImg) mainImg.style.filter = "brightness(0.7) sepia(0.3)";
    } else {
        btn.innerText = "うしろを表示";
        frontParts.forEach(el => el.style.display = 'flex');
        if (backPart) backPart.style.display = 'none';
        if (mainImg) mainImg.style.filter = "none";
    }

    if (!document.getElementById('view-flip-btn')) {
        const wrapper = document.querySelector('.body-canvas-wrapper');
        if (wrapper) {
            const btn = document.createElement('button');
            btn.id = 'view-flip-btn';
            btn.innerText = 'うしろを表示';
            btn.onclick = toggleBodyView;
            // スタイルはCSSに書くか、ここで直接指定
            btn.style = "position: absolute; top: -50px; left: 10px; z-index: 110;";
            wrapper.appendChild(btn);
        }
    }
}




window.addEventListener('load', () => {
    // 確実にDOMとスタイルが読み込まれてから実行
    init();
});



// index.html側での表示例
function displayPoints() {
    const el = document.getElementById('point-display');
    const pts = localStorage.getItem('user_total_points') || '0';
    if (el) el.innerText = pts;
}

// ==========================================
// ポイント表示・更新（役割ごとに分離）
// ==========================================

// 1. user_points (POINT_KEY) の表示
function updateDisplayUserPoints() {
    const el = document.getElementById('point-display');
    const pts = localStorage.getItem(POINT_KEY) || '0';
    if (el) el.innerText = pts;
}

// 2. user_total_points (POINT_STORAGE_KEY) の表示
// ※もし別の場所に表示しているならこちらを使う
function updateDisplayTotalPoints() {
    const el = document.getElementById('total-points-display'); // 別のIDがある場合
    const totalPts = localStorage.getItem(POINT_STORAGE_KEY) || '0';
    if (el) el.innerText = totalPts;
}

// これを1つだけ残す
function countUpAtLocation(part, event) {
    const damage = 5;
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    // 1. ログ保存
    logs.push({
        date: new Date().toISOString(),
        details: { [part]: damage },
        totalLevel: damage
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    // 2. ポイント加算（両方のキーを更新）
    let pts = parseInt(localStorage.getItem(POINT_KEY) || '0');
    localStorage.setItem(POINT_KEY, (pts + 1).toString());

    let total = parseInt(localStorage.getItem(POINT_STORAGE_KEY) || '0');
    localStorage.setItem(POINT_STORAGE_KEY, (total + 1).toString());

    // 3. UI表示更新（ポイント）
    updateDisplayUserPoints();

    // 4. UI表示更新（今日の合計ダメージ）
    const todayStr = new Date().toLocaleDateString();
    const todayTotal = logs
        .filter(l => new Date(l.date).toLocaleDateString() === todayStr)
        .reduce((sum, l) => sum + l.totalLevel, 0);

    const lvEl = document.getElementById('lv');
    if (lvEl) {
        lvEl.innerText = todayTotal;
        // 数字が更新された時に少し跳ねるアニメーション（任意）
        lvEl.animate([
            { transform: 'scale(1.1)', color: '#65261a' },
            { transform: 'scale(1)', color: '' }
        ], { duration: 200 });
    }

    // 5. その他更新（顔、ヒートマップ、エフェクト）
    updateFace(todayTotal);
    updateVisualization();
    if (event) showTapEffect(event);
}