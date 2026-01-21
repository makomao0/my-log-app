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
/**
 * グラフの描画
 */
/**
 * グラフの描画（詳細内訳機能付き）
 */
function renderDamageChart() {
    const root = document.getElementById('damage-chart-root');
    if (!root) return;

    const data = getAggregatedLogs();
    const recentData = data.slice(-10);

    if (recentData.length === 0) {
        root.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">データがありません</div>';
        return;
    }

    const maxVal = Math.max(...recentData.map(d => d.totalLevel), 50);

    let html = `
        <div class="chart-header">
            <span class="chart-dot"></span> 直近の痛み推移（タップで詳細）
        </div>
        <div class="chart-viewport" style="display:flex; align-items:flex-end; height:160px; gap:8px; padding:20px 10px; justify-content: space-around;">
    `;

    recentData.forEach(d => {
        const date = new Date(d.timestamp);
        const timeStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        const lv = d.totalLevel;
        const color = lv >= 50 ? "#ef4444" : "#ea7824";
        const h = Math.max((lv / maxVal) * 100, 15);

        // 部位の内訳をテキストにする
        const partsDetail = d.parts.join('・');

        html += `
            <div class="chart-bar-group" 
                 style="flex:1; display:flex; flex-direction: column-reverse; align-items:center; position:relative; cursor:pointer;"
                 onclick="showTimeModal('${timeStr} の詳細', ['部位: ${partsDetail}', '合計: Lv.${lv}'])">
                
                <div class="chart-tooltip-content" style="background:#334155; color:#fff; border-radius:4px; padding:5px; font-size:10px; position:absolute; bottom:110%; white-space:nowrap; z-index:100; display:none;">
                    ${partsDetail}
                </div>

                
                                <span class="chart-label" style="font-size:10px; color:#94a3b8; margin-top:8px;">${timeStr}</span>
                  <div class="chart-bar" style="height:${h}%; width:14px; background-color:${color}; border-radius:3px 3px 0 0; transition: height 0.3s;"></div>
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
function updateHistoryTable(selectedDateStr) {
    const body = document.getElementById('history-body');
    if (!body) return;

    // 引数がない場合は今日の日付を使用
    const targetDate = selectedDateStr ? new Date(selectedDateStr) : new Date();
    const targetDateKey = targetDate.toLocaleDateString();

    const rawLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const summaryByPart = {};

    // 1. 選択された日付のデータのみを抽出して部位ごとに集計
    rawLogs.forEach(log => {
        const logDate = new Date(log.date);
        if (logDate.toLocaleDateString() !== targetDateKey) return;

        const part = log.details ? Object.keys(log.details)[0] : "不明";
        const lv = Number(log.totalLevel) || 0;
        const timeStr = `${logDate.getHours()}:${String(logDate.getMinutes()).padStart(2, '0')}`;

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

    // 2. HTML生成（真ん中の列をクリック可能に）
    body.innerHTML = entries.map(([partName, data]) => {
        const timesJson = JSON.stringify(data.records);
        return `
            <tr>
                <td><span class="part-tag">${partName}</span></td>
                <td>
                    <button class="time-detail-btn" onclick='showTimeModal("${partName}", ${timesJson})'>
                        ${data.records.length}回 の記録
                    </button>
                </td>
                <td style="text-align: right; font-weight: bold;">Lv.${data.totalLv}</td>
            </tr>
        `;
    }).join('');
}

/**
 * 詳細時間を表示する簡易モーダル
 */
function showTimeModal(partName, times) {
    const timeList = times.map(t => `<li>${t}</li>`).join('');
    const modalHtml = `
        <div id="custom-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:2000;">
            <div style="background:#fff; padding:20px; border-radius:15px; width:80%; max-width:300px; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                <h3 style="margin-top:0; color:#55bbbf;">${partName} の記録時間</h3>
                <ul style="list-style:none; padding:0; margin:15px 0; max-height:200px; overflow-y:auto; border-top:1px solid #eee; border-bottom:1px solid #eee;">
                    ${timeList}
                </ul>
                <button onclick="document.getElementById('custom-modal').remove()" style="background:#55bbbf; color:#fff; border:none; padding:10px 20px; border-radius:20px; cursor:pointer; width:100%;">閉じる</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

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

// 読み込み時に実行
document.addEventListener('DOMContentLoaded', () => {
    renderDamageChart();
    updateHistoryTable();
});
