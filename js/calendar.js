/**
 * calendar-page.js
 * カレンダー表示と特定日のイベントリスト表示に特化したスクリプト
 */

const STORAGE_KEY = 'kodama_logs_v2';
let displayDate = new Date(); // 表示している年月
let selectedDate = new Date(); // 選択されている日

/**
 * 初期化処理
 */
function initCalendarPage() {
    renderCalendar();
    updateEventList(); // 初回表示（今日）のイベントを表示
}

/**
 * カレンダーを描画する
 */
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('current-month');
    if (!grid || !monthLabel) return;

    grid.innerHTML = '';
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    monthLabel.innerText = `${year}年 ${month + 1}月`;

    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 全データ取得
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    // 前月の余白
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'cal-day empty';
        grid.appendChild(emptyDiv);
    }

    // 日付の生成
    for (let i = 1; i <= lastDate; i++) {
        const dateStr = formatDate(new Date(year, month, i));

        // その日にデータがあるかチェック
        const dayLogs = logs.filter(l => formatDate(new Date(l.date)) === dateStr);

        const el = document.createElement('div');
        el.className = 'cal-day';

        // 記録がある日のスタイル
        if (dayLogs.length > 0) el.classList.add('active');

        // 今日
        const todayStr = formatDate(new Date());
        if (dateStr === todayStr) el.classList.add('today');

        // 選択中
        if (dateStr === formatDate(selectedDate)) el.classList.add('selected');

        // 中身（日付番号とアイコン）
        el.innerHTML = `<span>${i}</span>${dayLogs.length ? '<div class="mark">👾</div>' : ''}`;

        // クリックイベント
        el.onclick = () => {
            selectedDate = new Date(year, month, i);
            renderCalendar(); // ハイライト更新のため再描画
            updateEventList(); // 下の詳細枠を更新
        };

        grid.appendChild(el);
    }
}

/**
 * 選択された日のイベントリストを更新する
 */
function updateEventList() {
    const container = document.getElementById('event-list-container');
    if (!container) return;

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const targetDateStr = formatDate(selectedDate);
    const dayLogs = logs.filter(l => formatDate(new Date(l.date)) === targetDateStr);

    let html = `
        <div class="event-date-header">
            ${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日の記録
        </div>
    `;

    if (dayLogs.length > 0) {
        // カードを包む「縦スクロール・カルーセル」の枠
        html += `<div class="vertical-carousel">`;

        dayLogs.forEach(log => {
            const time = new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const parts = log.details ? Object.keys(log.details).join('・') : "記録";

            html += `
                <div class="carousel-card">
                    <div class="card-top">
                        <span class="card-time">${time}</span>
                        <span class="card-badge">Lv.${log.totalLevel}</span>
                    </div>
                    <div class="card-body">
                        <strong>${parts}</strong> の痛み
                    </div>
                </div>
            `;
        });

        html += `</div>`; // .vertical-carousel 終了

        const totalDamage = dayLogs.reduce((sum, l) => sum + l.totalLevel, 0);
        html += `<div class="event-summary">1日の合計レベル: ${totalDamage}</div>`;
    } else {
        html += `<div class="no-event">この日の記録はありません</div>`;
    }

    container.innerHTML = html;
}
/**
 * ヘルパー：日付比較用のフォーマット (YYYY-MM-DD)
 */
function formatDate(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/**
 * 月の切り替え
 */
function changeMonth(diff) {
    displayDate.setMonth(displayDate.getMonth() + diff);
    renderCalendar();
}

// ページ読み込み完了時に起動
window.addEventListener('DOMContentLoaded', initCalendarPage);
