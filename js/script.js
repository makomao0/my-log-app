// 1. 定数・変数の定義
const STORAGE_KEY = 'kodama_logs_v2';
let sessionLogs = {};
let displayDate = new Date(); // カレンダー表示用

// 2. 記録ロジック（即時保存版）
function countUpAtLocation(part, event) {
    // セッション合計（画面のLv表示や顔の変化用）
    sessionLogs[part] = (sessionLogs[part] || 0) + 5;
    let totalLv = Object.values(sessionLogs).reduce((a, b) => a + b, 0);
    if (totalLv > 1000) totalLv = 1000;

    // UI表示更新
    const lvEl = document.getElementById('lv');
    const partEl = document.getElementById('target-part');
    if (lvEl) lvEl.innerText = totalLv;
    if (partEl) partEl.innerText = `【${part}】を記録中...`;

    updateFace(totalLv);
    if (event) showTapEffect(event);

    // ★ 確定ボタンなしで即保存
    autoSave(part);
}

function autoSave(part) {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    // 1タップを1つの記録として追加
    logs.push({
        date: new Date().toISOString(),
        details: { [part]: 5 },
        totalLevel: 5
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));

    // ポイントを静かに加算（アラートなし）
    silentAddPoints(1);
}

function silentAddPoints(amount) {
    let currentPoints = parseInt(localStorage.getItem('user_points') || '0');
    currentPoints += amount;
    localStorage.setItem('user_points', currentPoints);
    displayPoints();
}

// 3. 視覚演出
function showTapEffect(e) {
    const effect = document.createElement('div');
    effect.className = 'tap-effect';
    effect.innerHTML = '+5';
    effect.style.left = e.pageX + 'px';
    effect.style.top = e.pageY + 'px';
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

function updateFace(lv) {
    const face = document.getElementById('face');
    if (!face) return;
    // Lvに応じて1〜12の画像に切り替え
    let iconNum = Math.min(Math.floor(lv / 100) + 1, 12);
    face.innerHTML = `<img src='imgs/icons/${iconNum}.png' alt='' width='100px'>`;
}

// 4. 分析・ヒートマップ表示
function renderAnalysis() {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const res = document.getElementById('type-result');
    const container = document.getElementById('analysis-container');
    if (!res) return;

    if (logs.length === 0) {
        res.innerText = "データ収集中...";
        return;
    }

    // 蓄積型の判定
    const avg = logs.reduce((s, l) => s + l.totalLevel, 0) / logs.length;
    res.innerText = avg > 700 ? "🚨 蓄積型：かなりお疲れかも" : "🌱 変動型：リズムを大事に";

    // 最新のヒートマップ描画
    if (container) {
        const lastLog = logs[logs.length - 1];
        let html = `<div class="analysis-body" style="position:relative; font-size:100px; text-align:center;">🧍‍♀️`;
        for (let part in lastLog.details) {
            let intensity = Math.min(lastLog.details[part] / 500, 1);
            html += `<div class="heat-spot spot-${part}" style="opacity: ${intensity}"></div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
    }
}

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

function openActionModal() { document.getElementById('modal-action').style.display = 'block'; }
function closeActionModal() { document.getElementById('modal-action').style.display = 'none'; }
function showDetail(type) {
    document.getElementById('detail-title').innerText = type;
    document.getElementById('detail-text').innerText = knowledge[type];
    document.getElementById('modal-detail').style.display = 'block';
}
function closeDetail() { document.getElementById('modal-detail').style.display = 'none'; }