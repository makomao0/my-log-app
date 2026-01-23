// ==========================================
// 1. 基本設定とデータ
// ==========================================
const STORAGE_KEY = 'kodama_logs_v2';
const POINT_KEY = 'user_points';
const LEVEL_KEY = 'currentLevel';

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

// 全てのイベント登録をここに集約
document.addEventListener('DOMContentLoaded', () => {
    init();

    // スワイプ検知の整理
    let startX = 0;
    document.addEventListener('touchstart', e => startX = e.touches[0].pageX);
    document.addEventListener('touchend', e => {
        let diff = e.changedTouches[0].pageX - startX;
        if (Math.abs(diff) > 70) { // 感度を少し下げて誤爆防止
            changeDate(diff > 0 ? -1 : 1);
        }
    });

    // 部位タップ
    document.addEventListener('pointerdown', (e) => {
        const area = e.target.closest('.touch-area');
        if (area) {
            e.preventDefault();
            const partName = area.id.replace('area-', '').replace('part-', '');
            countUpAtLocation(partName, e);

            // ぷるん！
            area.style.transition = 'none';
            area.style.backgroundColor = 'rgba(255, 200, 0, 0.12)'; // 押した瞬間だけ明るい黄色に
            area.style.transform = 'scale(1.2)';

            setTimeout(() => {
                area.style.transition = 'all 0.4s ease';
                updateVisualization(); // 自動的にヒートマップのオレンジに戻る
            }, 100);
        }
    });
});

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
    displayPoints();
    if (document.getElementById('current-date-display')) updateVisualization();
    if (document.getElementById('history-body')) renderHistory();
    if (document.getElementById('calendar-grid')) renderCalendar();
}

document.addEventListener('DOMContentLoaded', init);

// タッチエリアのイベント一括登録
document.addEventListener('pointerdown', (e) => {
    const area = e.target.closest('.touch-area');
    if (area) {
        e.preventDefault();
        const partName = area.id.replace('area-', '').replace('part-', '');
        countUpAtLocation(partName, e);
        area.style.transform = 'scale(1.2)';
        setTimeout(() => area.style.transform = 'scale(1.0)', 100);
    }
});

// スワイプ検知
let startX = 0;
document.addEventListener('touchstart', e => startX = e.touches[0].pageX);
document.addEventListener('touchend', e => {
    let diff = e.changedTouches[0].pageX - startX;
    if (Math.abs(diff) > 50) changeDate(diff > 0 ? -1 : 1);
});

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
    const dateStrCompare = viewingDate.toLocaleDateString();
    const dateDisplay = document.getElementById("current-date-display");
    if (dateDisplay) {
        const y = viewingDate.getFullYear();
        const m = String(viewingDate.getMonth() + 1).padStart(2, '0');
        const d = String(viewingDate.getDate()).padStart(2, '0');
        dateDisplay.innerText = `${y}/${m}/${d}`;
    }

    // リセット
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

    for (let part in summary) {
        const targetEl = document.getElementById(`part-${part}`) || document.getElementById(`area-${part}`);
        if (targetEl) {
            const damage = summary[part];

            // 【改善点1】分母を小さくして色がつきやすくする（30くらいがおすすめ）
            // 【改善点2】最低値を0.5にして、1回目からハッキリ見せる
            const opacity = Math.max(0.5, Math.min(damage / 30, 0.9));

            // 【改善点3】ぼかしサイズを調整
            const blurRadius = Math.max(10, Math.min(damage, 30));

            targetEl.style.border = 'none';
            // より鮮やかなオレンジ〜赤に変更
            targetEl.style.backgroundColor = `rgba(255, 80, 0, ${opacity})`;

            // じわっとした光の演出（外側の光を強くする）
            targetEl.style.boxShadow = `0 0 ${blurRadius}px ${blurRadius / 2}px rgba(255, 100, 0, ${opacity * 0.8})`;

            // 【改善点4】全体ぼかしを弱める（ここが強いと色が消えます）
            targetEl.style.filter = 'blur(2px)';

            const label = targetEl.querySelector('span');
            if (label) label.style.display = 'none';
        }
    }

    const targetPartEl = document.getElementById('target-part');
    if (targetPartEl) {
        // hasLogForThisDay に名前を合わせる
        targetPartEl.innerText = hasLogForThisDay ? "痛いところを押してね" : "この日の記録はありません";
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




function showTapEffect(e, partName) {
    // 1. 数字のポップアップ (+5)
    const effect = document.createElement('div');
    effect.className = 'tap-effect';
    effect.innerText = '+5';
    effect.style.position = 'absolute';
    effect.style.left = (e.pageX - 15) + 'px';
    effect.style.top = (e.pageY - 30) + 'px';
    effect.style.color = '#ff9800';
    effect.style.fontWeight = 'bold';
    effect.style.fontSize = '20px';
    effect.style.pointerEvents = 'none';
    effect.style.zIndex = '1000';
    document.body.appendChild(effect);

    effect.animate([
        { transform: 'translateY(0) scale(1)', opacity: 1 },
        { transform: 'translateY(-50px) scale(1.5)', opacity: 0 }
    ], { duration: 600, easing: 'ease-out' });

    // 2. パーティクル（飛び散る粒）の演出
    for (let i = 0; i < 6; i++) {
        const p = document.createElement('div');
        p.style.position = 'absolute';
        p.style.width = '6px';
        p.style.height = '6px';
        p.style.borderRadius = '50%';
        p.style.backgroundColor = '#ffeb3b'; // 黄色いキラキラ
        p.style.left = e.pageX + 'px';
        p.style.top = e.pageY + 'px';
        p.style.pointerEvents = 'none';
        document.body.appendChild(p);

        const angle = (i / 6) * Math.PI * 2;
        const velocity = 40 + Math.random() * 20;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        p.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
        ], { duration: 400, easing: 'ease-out' });

        setTimeout(() => p.remove(), 400);
    }

    setTimeout(() => effect.remove(), 600);
}

// ==========================================
// 5. イベント登録（「凹む」動きを追加）
// ==========================================
document.addEventListener('pointerdown', (e) => {
    const area = e.target.closest('.touch-area');
    if (area) {
        e.preventDefault();

        // 1. 記録処理
        const partName = area.id.replace('area-', '').replace('part-', '');
        countUpAtLocation(partName, e);

        // 2. 「押した感」を出すアニメーション
        // 一瞬小さくなって（凹む）、パッと明るくなる
        area.style.transition = 'none';
        area.style.transform = 'scale(0.92)'; // 少し凹む
        area.style.filter = 'brightness(1.5)'; // 一瞬光る

        // 指を離すか、少し経つと元に戻る
        setTimeout(() => {
            area.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            area.style.transform = 'scale(1)';
            area.style.filter = 'none';
        }, 80);

        showTapEffect(e, partName);
    }
});


// 左右スワイプ検知
let touchstartX = 0;
let touchendX = 0;



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
