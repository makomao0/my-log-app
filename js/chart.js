const STORAGE_KEY = 'kodama_logs_v2';
let viewDate = new Date(); // 表示中の日付（初期値は今日）

const PART_LABELS = {
    'head': 'あたま', 'ear-r': 'みぎみみ', 'ear-l': 'ひだりみみ',
    'neck': 'くび', 'chest': 'むね', 'stomach': 'おなか',
    'arm-r': 'みぎうで', 'arm-l': 'ひだりうで', 'back': 'こし・せなか',
    'leg-r': 'みぎあし', 'leg-l': 'ひだりあし'
};
function changeDate(days) {
    viewDate.setDate(viewDate.getDate() + days);
    updateDisplay();
}

function updateDisplay() {
    // 日付ラベルの更新
    const dateLabel = document.getElementById('current-display-date');
    if (dateLabel) {
        dateLabel.innerText = viewDate.toLocaleDateString();
    }

    // グラフとテーブルを再描画
    renderDamageChart();
    updateHistoryTable(viewDate.toLocaleDateString()); // 前に作った関数に日付を渡す
}

/**
 * データを「分単位」で完全に合算する
 */
/**
 * データを「表示中の日付」のみ抽出し、分単位で合算する
 */
function getAggregatedLogs() {
    const rawLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const aggregated = {};

    // 表示中の日付（YYYY/MM/DD形式）を取得
    const targetDateStr = viewDate.toLocaleDateString();

    rawLogs.forEach(log => {
        const date = new Date(log.date);

        // 表示中の日付と一致しないデータは無視する
        if (date.toLocaleDateString() !== targetDateStr) return;

        // 時:分 をキーにする
        const timeKey = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

        const part = log.details ? Object.keys(log.details)[0] : "記録";
        const level = Number(log.totalLevel) || 0;

        if (!aggregated[timeKey]) {
            aggregated[timeKey] = {
                timestamp: date.getTime(),
                timeStr: timeKey,
                totalLevel: 0,
                parts: []
            };
        }
        aggregated[timeKey].totalLevel += level;
        if (!aggregated[timeKey].parts.includes(part)) {
            aggregated[timeKey].parts.push(part);
        }
    });

    // 時間順に並べて配列で返す
    return Object.values(aggregated).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 
 * グラフの描画（表示中の日付の推移）
 */
function renderDamageChart() {
    const root = document.getElementById('damage-chart-root');
    if (!root) return;

    // 表示中の日付の集計データを取得
    const dayData = getAggregatedLogs();

    if (dayData.length === 0) {
        root.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">この日の記録はありません</div>';
        return;
    }

    // Y軸の最大値を計算（最低でも50Lv分は確保）
    const maxVal = Math.max(...dayData.map(d => d.totalLevel), 50);

    let html = `
        <div class="chart-header">
            <span class="chart-dot"></span> ${viewDate.getMonth() + 1}月${viewDate.getDate()}日の痛み推移
        </div>
        <div class="chart-viewport" style="display:flex; align-items:flex-end; height:160px; gap:8px; padding:20px 10px; overflow-x: auto; justify-content: flex-start;">
    `;

    dayData.forEach(d => {
        const lv = d.totalLevel;
        const color = lv >= 50 ? "#ef4444" : "#ea7824";
        const h = Math.max((lv / maxVal) * 100, 15);
        const partsDetail = d.parts.map(p => PART_LABELS[p] || p).join('・');
        html += `
            <div class="chart-bar-group" 
                 style="flex:0 0 40px; display:flex; flex-direction: column-reverse; align-items:center; position:relative; cursor:pointer;"
                 onclick="showTimeModal('${d.timeStr} の詳細', ['部位: ${partsDetail}', '合計: Lv.${lv}'])">
                
                <span class="chart-label" style="font-size:10px; color:#94a3b8; margin-top:8px;">${d.timeStr}</span>
                <div class="chart-bar" style="height:${h}%; width:16px; background-color:${color}; border-radius:3px 3px 0 0; transition: height 0.3s;"></div>
                <span class="chart-value" style="font-size:11px; font-weight:bold; color:${color}; margin-bottom:4px;">${lv}</span>
            </div>
        `;
    });

    html += `</div>`;
    root.innerHTML = html;
}

/**
 * 履歴テーブルの更新
 */
/**
 * 部位ごとに集計して履歴テーブルを表示する
 */
/**
 * 部位ごとに集計（選択された日付のみ）
 */
function updateHistoryTable(targetDateStr) {
    const body = document.getElementById('history-body');
    if (!body) return;

    const rawLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const summaryByPart = {};
    const targetKey = targetDateStr || viewDate.toLocaleDateString();

    rawLogs.forEach(log => {
        const logDate = new Date(log.date);
        if (logDate.toLocaleDateString() !== targetKey) return;

        const part = log.details ? Object.keys(log.details)[0] : "不明";
        const lv = Number(log.totalLevel) || 0;
        const timeStr = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (!summaryByPart[part]) {
            summaryByPart[part] = { totalLv: 0, records: [] };
        }
        summaryByPart[part].totalLv += lv;
        summaryByPart[part].records.push(timeStr);
    });

    const entries = Object.entries(summaryByPart);
    if (entries.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#94a3b8;">この日の記録はありません</td></tr>';
        return;
    }

    body.innerHTML = entries.map(([partName, data]) => {
        // --- ここで日本語に変換 ---
        const jpName = PART_LABELS[partName] || partName;

        return `
            <tr>
                <td><span class="part-tag">${jpName}</span></td> <td>
                    <button class="time-detail-btn" onclick='showTimeModal("${jpName}", ${JSON.stringify(data.records)})'>
                        ${data.records.length}回 の記録
                    </button>
                </td>
                <td style="text-align: right; font-weight: bold;">Lv.${data.totalLv}</td>
            </tr>
        `;
    }).join('');
}


/**
/**
 * 詳細時間を表示する簡易モーダル
 */


/**
 * 汎用モーダル表示
 */
function showTimeModal(title, listArray) {
    const listHtml = listArray.map(item => `<li>${item}</li>`).join('');
    const modalHtml = `
        <div id="custom-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:2000;" onclick="this.remove()">
            <div style="background:#fff; padding:20px; border-radius:15px; width:80%; max-width:300px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
                <h3 style="margin-top:0; color:#55bbbf;">${title}</h3>
                <ul style="list-style:none; padding:0; margin:15px 0; max-height:200px; overflow-y:auto; border-top:1px solid #eee; border-bottom:1px solid #eee; text-align:left;">
                    ${listHtml}
                </ul>
                <button onclick="document.getElementById('custom-modal').remove()" style="background:#55bbbf; color:#fff; border:none; padding:12px 20px; border-radius:25px; cursor:pointer; width:100%; font-weight:bold;">とじる</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ページ読み込み時に実行
// chart.js の読み込み部分を修正
document.addEventListener('DOMContentLoaded', () => {
    // URLから日付パラメータを取得 (?date=2026-1-22)
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');

    if (dateParam) {
        // パラメータがあればその日をセット
        viewDate = new Date(dateParam);
    } else {
        // なければ今日
        viewDate = new Date();
    }

    updateDisplay();
});
