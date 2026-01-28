/* --- 1. 定数・ラベルの定義 --- */
const STORAGE_KEY = 'kodama_logs_v2';

// 重要：ここに入力側（action.html）と同じキーをすべて登録します
const PART_LABELS = {
    'head': 'あたま',
    'ear-r': 'みぎみみ',
    'ear-l': 'ひだりみみ',
    'neck': 'くび',
    'chest': 'むね',
    'stomach': 'おなか',
    'arm-r': 'みぎうで',
    'arm-l': 'ひだりうで',
    'back': 'こし・せなか',
    'leg-r': 'みぎあし',
    'leg-l': 'ひだりあし',
    'all': 'すべての部位'
};

let displayDate = new Date(); // 表示月の管理
let selectedDate = new Date(); // 選択日の管理

/**
 * 日付オブジェクトを YYYY-MM-DD 形式の文字列に変換（比較用）
 */
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function init() {
    renderCalendar();
    updateHistoryTable();
}

/**
 * カレンダーを描画
 */
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

    // 前月の空白
    for (let i = 0; i < firstDay; i++) {
        grid.insertAdjacentHTML('beforeend', '<div class="cal-day empty"></div>');
    }

    // 日付セル
    for (let i = 1; i <= lastDate; i++) {
        const currentDate = new Date(year, month, i);
        const dateStr = formatDate(currentDate);

        // その日に記録があるかチェック
        const hasData = logs.some(log => formatDate(new Date(log.date)) === dateStr);

        const el = document.createElement('div');
        el.className = 'cal-day';
        if (hasData) el.classList.add('active');
        if (dateStr === formatDate(selectedDate)) el.classList.add('selected');

        el.innerHTML = `<span>${i}</span>${hasData ? '<div class="mark">●</div>' : ''}`;

        el.onclick = () => {
            selectedDate = new Date(year, month, i);
            renderCalendar();
            updateHistoryTable();
        };
        grid.appendChild(el);
    }
}

/**
 * 履歴テーブルを更新
 */
function updateHistoryTable() {
    const body = document.getElementById('history-body');
    const label = document.getElementById('selected-date-label');
    const linkContainer = document.getElementById('chart-link-container');

    if (!body) return;
    if (linkContainer) linkContainer.innerHTML = '';

    label.innerText = `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日の記録`;

    const logs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const targetKey = formatDate(selectedDate);
    const summaryByPart = {};

    logs.forEach(log => {
        const logDate = new Date(log.date);
        if (formatDate(logDate) !== targetKey) return;

        // 部位キーの取得（無い場合は "unknown"）
        const partKey = log.details ? Object.keys(log.details)[0] : "unknown";
        const lv = Number(log.totalLevel) || 0;
        const timeStr = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (!summaryByPart[partKey]) {
            summaryByPart[partKey] = { totalLv: 0, records: [] };
        }
        summaryByPart[partKey].totalLv += lv;
        summaryByPart[partKey].records.push(timeStr);
    });

    const entries = Object.entries(summaryByPart);

    if (entries.length === 0) {
        body.innerHTML = '<tr><td colspan="3" class="no-data-msg">この日の記録はありません</td></tr>';
        return;
    }

    // グラフへのボタンを表示（CSSのクラスを活用）
    if (linkContainer) {
        const dateParam = formatDate(selectedDate);
        linkContainer.innerHTML = `
            <div style="text-align: center;">
                <button class="btn-submit" onclick="location.href='history.html?date=${dateParam}'" 
                        style="padding: 16px 30px; border-radius: 30px;">
                     この日のグラフを見る
                </button>
            </div>
        `;
    }

    // テーブル更新
    body.innerHTML = entries.map(([partKey, data]) => {
        const partNameJP = PART_LABELS[partKey] || `不明（${partKey}）`; // キーも表示してデバッグしやすく
        return `
        <tr>
            <td><span class="part-tag">${partNameJP}</span></td>
            <td>
                <button class="time-detail-btn" onclick='showTimeModal("${partNameJP}", ${JSON.stringify(data.records)})'>
                    ${data.records.length}回 の記録
                </button>
            </td>
            <td style="text-align:center; font-weight: bold; color: #f37e18;">Lv.${data.totalLv}</td>
        </tr>
    `;
    }).join('');
}

/**
 * モーダル表示
 */
function showTimeModal(title, listArray) {
    const oldModal = document.getElementById('custom-modal');
    if (oldModal) oldModal.remove();

    const listHtml = listArray.map(item => `<li>${item}</li>`).join('');
    const modalHtml = `
        <div id="custom-modal" class="modal-overlay" onclick="this.remove()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <h3 style="margin-bottom:10px;">${title} の記録時刻</h3>
                <ul style="list-style:none; padding:0; margin-bottom:20px;">${listHtml}</ul>
                <button class="btn-cancel" style="width:100%" onclick="document.getElementById('custom-modal').remove()">とじる</button>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 月移動関数
function changeMonth(diff) {
    displayDate.setMonth(displayDate.getMonth() + diff);
    renderCalendar();
}

document.addEventListener('DOMContentLoaded', init);