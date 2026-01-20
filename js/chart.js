const STORAGE_KEY = 'kodama_logs_v2';

/**
 * データを「分単位」で完全に合算する
 */
function getAggregatedLogs() {
    const rawLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const aggregated = {};

    rawLogs.forEach(log => {
        const date = new Date(log.date);
        // 年/月/日 時:分 をキーにして、同じ1分間のデータを統合
        const timeKey = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;

        const part = log.details ? Object.keys(log.details)[0] : "記録";
        const level = Number(log.totalLevel) || 0;

        if (!aggregated[timeKey]) {
            aggregated[timeKey] = {
                timestamp: date.getTime(),
                dateStr: timeKey,
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
 * グラフの描画
 */
function renderDamageChart() {
    const root = document.getElementById('damage-chart-root');
    if (!root) return;

    const data = getAggregatedLogs();
    // 画面に収まるよう最新の「10件」に絞る（これで重なりを防ぐ）
    const recentData = data.slice(-10);

    if (recentData.length === 0) {
        root.innerHTML = '<div style="padding:20px; text-align:center;">データがありません</div>';
        return;
    }

    // Lv.50 を基準に最大値を決める
    const maxVal = Math.max(...recentData.map(d => d.totalLevel), 50);

    let html = `
        <div class="chart-header">
            <span class="chart-dot"></span> 合計ダメージ（分単位）
        </div>
        <div class="chart-viewport" style="display:flex; align-items:flex-end; height:160px; gap:10px; padding:20px 10px; justify-content: space-around;">
    `;

    recentData.forEach(d => {
        const date = new Date(d.timestamp);
        const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        const lv = d.totalLevel;

        // 【重要】Lv.50以上なら赤、それ以外はオレンジ
        const isCritical = lv >= 50;
        const color = isCritical ? "#ef4444" : "#ea7824";

        const h = Math.max((lv / maxVal) * 100, 10); // 最低でも10%の高さ

        html += `
            <div class="chart-bar-group" style="flex:1; display:flex; flex-direction:column; align-items:center; position:relative;">
                <div class="chart-tooltip-content" style="background:#fff; border:1px solid #ddd; border-radius:4px; padding:5px; font-size:10px; position:absolute; bottom:110%; white-space:nowrap; z-index:100; box-shadow:0 2px 5px rgba(0,0,0,0.1); display:none;">
                    ${d.parts.join('・')}<br>合計 Lv.${lv}
                </div>
                
                <span class="chart-value" style="font-size:11px; font-weight:bold; color:${color}; margin-bottom:4px;">${lv}</span>
                <div class="chart-bar" style="height:${h}%; width:16px; background-color:${color}; border-radius:3px 3px 0 0; transition: height 0.3s;"></div>
                <span class="chart-label" style="font-size:10px; color:#94a3b8; margin-top:8px;">${timeStr}</span>
            </div>
        `;
    });

    html += `</div>`;
    root.innerHTML = html;
}

/**
 * 履歴テーブルの更新
 */
function updateHistoryTable() {
    const body = document.getElementById('history-body');
    if (!body) return;

    // テーブルは詳細が見たいので、合算前の生データを表示
    const rawLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const sortedLogs = [...rawLogs].reverse();

    body.innerHTML = sortedLogs.map(log => {
        const date = new Date(log.date);
        const time = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        const part = log.details ? Object.keys(log.details)[0] : "不明";
        const lv = Number(log.totalLevel) || 0;

        // Lv.50以上は赤太文字
        const lvStyle = lv >= 50 ? 'style="color:#ef4444; font-weight:bold;"' : '';

        return `
            <tr>
                <td>${time}</td>
                <td><span class="part-tag">${part}</span></td>
                <td ${lvStyle}>Lv.${lv}</td>
            </tr>
        `;
    }).join('');
}

// 読み込み時に実行
document.addEventListener('DOMContentLoaded', () => {
    renderDamageChart();
    updateHistoryTable();
});
