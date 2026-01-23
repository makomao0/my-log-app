const GRID_SIZE = 8;
// 0の代わりにタイプ名を保存することで、盤面の色を維持する
let gridData = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
let totalScore = 0;
let draggingPieceShape = null;
let draggingPieceType = null; // ドラッグ中のタイプを保持
let currentDockPieces = [null, null, null];

let activePiece = null;
let startX = 0;
let startY = 0;
let currentDockId = null;

const PIECE_TYPES = {
    // --- 基本系 ---
    'dot': [[0, 0]],
    'bar2-h': [[0, 0], [0, 1]],           // 横2
    'bar2-v': [[0, 0], [1, 0]],           // 縦2
    'bar3-h': [[0, -1], [0, 0], [0, 1]],  // 横3
    'bar3-v': [[-1, 0], [0, 0], [1, 0]],  // 縦3
    'bar4-h': [[0, -1], [0, 0], [0, 1], [0, 2]],
    'bar4-v': [[-1, 0], [0, 0], [1, 0], [2, 0]],
    'bar5-h': [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2]], // 長い5
    'bar5-v': [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]],

    // --- 四角形系 ---
    'square': [[0, 0], [0, 1], [1, 0], [1, 1]],
    'BigSq': [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]], // 3x3

    // --- L字・J字（4ブロック版） ---
    'L-4': [[-1, 0], [0, 0], [1, 0], [1, 1]],
    'J-4': [[-1, 0], [0, 0], [1, 0], [1, -1]],
    'L-small': [[0, 0], [1, 0], [1, 1]], // 小さいL字(3ブロック)

    // --- S字・Z字（テトリス風） ---
    'S-shape': [[0, 0], [0, 1], [1, -1], [1, 0]],
    'Z-shape': [[0, -1], [0, 0], [1, 0], [1, 1]],

    // --- 特殊・高難易度 ---
    'T-shape': [[0, -1], [0, 0], [0, 1], [1, 0]],
    'Plus': [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]],
    'U-shape': [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1]], // U字型
    'Stair': [[-1, -1], [0, -1], [0, 0], [1, 0], [1, 1]],  // 階段型
};

// タイプに応じた色（CSSクラス用）の定義
function getColorClass(type) {
    if (!type) return '';
    if (type.includes('bar')) return 'p-bar';     // 棒状はすべて青
    if (type.includes('L-') || type.includes('J-')) return 'p-L'; // L/J字は紫
    if (type.includes('Sq')) return 'p-square';  // 四角形は緑
    if (type.includes('shape')) return 'p-T';    // T字やS字は黄色
    if (type === 'dot') return 'p-dot';          // ドットは赤
    return 'p-BigSq';                            // その他（Plus, U字など）はピンク
}

function initGrid() {
    const gridElement = document.getElementById('grid');
    gridElement.innerHTML = '';
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`;
            gridElement.appendChild(cell);
        }
    }
    refreshDock();
    setupPointerEvents();
}

function refreshDock() {
    const keys = Object.keys(PIECE_TYPES);
    for (let i = 0; i < 3; i++) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        currentDockPieces[i] = randomKey;
        const el = document.getElementById(`p${i + 1}`);

        el.className = `piece-item ${getColorClass(randomKey)}`;
        el.innerHTML = '';
        el.style.visibility = 'visible';
        el.style.opacity = '1';

        const shape = PIECE_TYPES[randomKey];
        shape.forEach(([dr, dc]) => {
            const block = document.createElement('div');
            block.className = 'p-block';
            block.style.gridRow = dr + 3;
            block.style.gridColumn = dc + 3;
            el.appendChild(block);
        });
    }
}

function setupPointerEvents() {
    document.querySelectorAll('.piece-item').forEach(piece => {
        piece.addEventListener('pointerdown', onPointerDown);
    });
}




function onPointerDown(e) {
    // 指やマウスのデフォルト挙動を防止
    if (e.cancelable) e.preventDefault();

    activePiece = e.currentTarget;
    currentDockId = activePiece.id;
    const pieceIdx = parseInt(currentDockId.replace('p', '')) - 1;
    draggingPieceType = currentDockPieces[pieceIdx];

    if (!draggingPieceType) return;
    draggingPieceShape = PIECE_TYPES[draggingPieceType];

    // --- 【修正】一度強制的にリセットして正確な元のサイズを測る ---
    activePiece.classList.remove('dragging');
    activePiece.style.transform = 'none';
    activePiece.style.transition = 'none';

    // getBoundingClientRectは1倍の状態のサイズを返す
    const rect = activePiece.getBoundingClientRect();
    startX = rect.width / 2;
    startY = rect.height / 2;

    // ドラッグ用スタイル適用
    activePiece.classList.add('dragging');
    activePiece.style.position = 'fixed';
    activePiece.style.zIndex = '10000';
    activePiece.style.pointerEvents = 'none';

    // 中心軸を固定して2.5倍に
    activePiece.style.transformOrigin = 'center center';
    activePiece.style.transform = 'scale(2.5)';

    // 初期座標の即時反映
    moveAt(e.clientX, e.clientY);

    // スマホ特有のカクつきを防ぐため、オプションで passive: false を指定
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp, { passive: false });
}

const OFFSET_Y = 120; // 浮かせる高さ

function moveAt(pageX, pageY) {
    // ピースの「中心(startX/startY)」をマウス位置(pageX/pageY)に合わせる
    // transform-origin: center center なので、scaleに関係なくこれで中心が合います
    activePiece.style.left = (pageX - startX) + 'px';
    activePiece.style.top = (pageY - startY - OFFSET_Y) + 'px';
}
let isSnapping = false; // 吸い付き中かどうかのフラグ

function onPointerMove(e) {
    if (!activePiece) return;
    if (e.cancelable) e.preventDefault();

    const clientX = e.clientX;
    const clientY = e.clientY;

    clearPreviews();

    const elementBelow = document.elementFromPoint(clientX, clientY - OFFSET_Y);
    const cell = elementBelow ? elementBelow.closest('.cell') : null;

    if (cell) {
        const [_, r, c] = cell.id.split('-').map(Number);
        if (canPlace(draggingPieceShape, r, c)) {
            const cellRect = cell.getBoundingClientRect();

            // --- ★ 吸い付きモードの処理 ---
            if (!isSnapping) {
                // 吸い付く瞬間だけ、少しだけ滑らかにする（カクつき防止）
                activePiece.style.transition = 'left 0.1s ease-out, top 0.1s ease-out';
                isSnapping = true;
            }

            activePiece.style.left = (cellRect.left + cellRect.width / 2 - startX) + 'px';
            activePiece.style.top = (cellRect.top + cellRect.height / 2 - startY) + 'px';

            updatePreview(r, c);
            return;
        }
    }

    // --- ★ 通常追従モードの処理 ---
    if (isSnapping) {
        // 吸い付きが外れたら、即座にtransitionを切って指に密着させる
        activePiece.style.transition = 'none';
        isSnapping = false;
    }

    activePiece.style.left = (clientX - startX) + 'px';
    activePiece.style.top = (clientY - startY - OFFSET_Y) + 'px';
}
function updatePreview(r, c) {
    if (!draggingPieceShape) return;
    const canPlaceHere = canPlace(draggingPieceShape, r, c);
    const colorClass = getColorClass(draggingPieceType);

    draggingPieceShape.forEach(([dr, dc]) => {
        const targetCell = document.getElementById(`cell-${r + dr}-${c + dc}`);
        if (targetCell) {
            targetCell.classList.add(canPlaceHere ? 'preview' : 'invalid');
            if (canPlaceHere) targetCell.classList.add(colorClass);
        }
    });
}

function onPointerUp(e) {
    if (!activePiece) return;

    // --- 3. 離した時の判定位置も修正 ---
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY - OFFSET_Y);
    const cell = elementBelow ? elementBelow.closest('.cell') : null;

    if (cell) {
        const [_, r, c] = cell.id.split('-').map(Number);
        handlePlacement(r, c);
    }

    clearPreviews();
    resetPieceStyle(activePiece);
    activePiece = null;
    draggingPieceShape = null;
    draggingPieceType = null;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
}

function handlePlacement(r, c) {
    if (canPlace(draggingPieceShape, r, c)) {
        draggingPieceShape.forEach(([dr, dc]) => {
            // タイプ名を保存して色を保持
            gridData[r + dr][c + dc] = draggingPieceType;
        });

        const pieceIdx = parseInt(currentDockId.replace('p', '')) - 1;
        currentDockPieces[pieceIdx] = null;
        activePiece.style.visibility = 'hidden';

        updateBoard();
        checkAndClearLines();

        if (currentDockPieces.every(p => p === null)) refreshDock();
        checkGameOver();
    }
}

function canPlace(shape, r, c) {
    return shape.every(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        return nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && gridData[nr][nc] === null;
    });
}

function clearPreviews() {
    document.querySelectorAll('.cell').forEach(cell => {
        // 全ての形状クラスを削除
        cell.classList.remove('preview', 'invalid', 'p-dot', 'p-bar', 'p-square', 'p-L', 'p-T', 'p-BigSq');
    });
}

function updateBoard() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            const type = gridData[r][c];
            // 既存のクラスを一度リセット
            cell.className = 'cell';
            if (type) {
                cell.classList.add('active', getColorClass(type));
            }
        }
    }
}

function checkAndClearLines() {
    let rowsToClear = [], colsToClear = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        if (gridData[i].every(v => v !== null)) rowsToClear.push(i);
        let colFull = true;
        for (let j = 0; j < GRID_SIZE; j++) if (gridData[j][i] === null) colFull = false;
        if (colFull) colsToClear.push(i);
    }

    if (rowsToClear.length > 0 || colsToClear.length > 0) {
        rowsToClear.forEach(r => {
            for (let c = 0; c < GRID_SIZE; c++) document.getElementById(`cell-${r}-${c}`).style.transform = 'scale(0)';
        });
        colsToClear.forEach(c => {
            for (let r = 0; r < GRID_SIZE; r++) document.getElementById(`cell-${r}-${c}`).style.transform = 'scale(0)';
        });

        setTimeout(() => {
            rowsToClear.forEach(r => gridData[r].fill(null));
            colsToClear.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) gridData[r][c] = null; });
            // 既存の checkAndClearLines のスコア更新部分に加えると良いです
            totalScore += (rowsToClear.length + colsToClear.length) * 100;
            document.getElementById('score').innerText = totalScore;
            // ここで中間保存しておくと、万が一途中で閉じても安心です
            localStorage.setItem('temp_puzzle_score', totalScore);
            updateBoard();
            document.querySelectorAll('.cell').forEach(el => el.style.transform = 'scale(1)');
        }, 200);
    }
}

function resetPieceStyle(el) {
    el.classList.remove('dragging');
    el.style.position = '';
    el.style.zIndex = '';
    el.style.left = '';
    el.style.top = '';
    el.style.transform = '';
    el.style.pointerEvents = 'auto';
}

function checkGameOver() {
    const available = currentDockPieces.filter(p => p !== null);
    const canMove = available.some(type => {
        const shape = PIECE_TYPES[type];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) if (canPlace(shape, r, c)) return true;
        }
        return false;
    });
    if (!canMove && available.length > 0) document.getElementById('game-over').style.display = 'block';
}

initGrid();

function finishGame() {
    const earnedPoints = Math.floor(totalScore / 10);
    const currentTotal = parseInt(localStorage.getItem('user_total_points') || '0');
    localStorage.setItem('user_total_points', currentTotal + earnedPoints);
    alert(`${earnedPoints} ポイント獲得しました！`);
    location.href = 'index.html';
}
