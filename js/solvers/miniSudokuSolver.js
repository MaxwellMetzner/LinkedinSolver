const MINI_SUDOKU_SIZE = 6;
const MINI_SUDOKU_REGION_ROWS = 2;
const MINI_SUDOKU_REGION_COLS = 3;

let miniSudokuGridContainer;
let miniSudokuGrid = createNumericGrid();
let miniSudokuUserCells = createBooleanGrid();
let miniSudokuSolverCells = createBooleanGrid();
let miniSudokuErrorCells = createBooleanGrid();
let miniSudokuLocked = false;
let miniSudokuNumberPicker;
let miniSudokuActiveCell = null;

function createNumericGrid() {
    return Array.from({ length: MINI_SUDOKU_SIZE }, () => Array(MINI_SUDOKU_SIZE).fill(0));
}

function createBooleanGrid() {
    return Array.from({ length: MINI_SUDOKU_SIZE }, () => Array(MINI_SUDOKU_SIZE).fill(false));
}

function handleMiniSudokuCellClick(event, cell, row, col) {
    event.preventDefault();
    event.stopPropagation();

    if (miniSudokuLocked) {
        return;
    }

    miniSudokuActiveCell = { row, col, cell };
    showMiniSudokuNumberPicker(cell, row, col);
}

function handleMiniSudokuCellContextMenu(event, cell, row, col) {
    event.preventDefault();

    if (miniSudokuLocked) {
        return;
    }

    setMiniSudokuCellValue(row, col, 0);
    hideMiniSudokuNumberPicker();
}

function handleMiniSudokuSolve() {
    if (!miniSudokuGridContainer) return;

    const boardBeforeSolve = miniSudokuGrid.map(row => [...row]);
    const validation = validateMiniSudoku(boardBeforeSolve);

    applyValidationResults(validation.invalidCells);
    refreshMiniSudokuGrid();

    if (!validation.isValid) {
        alert('There are conflicts in the puzzle. Please fix the highlighted cells before solving.');
        return;
    }

    miniSudokuSolverCells = createBooleanGrid();

    const boardToSolve = boardBeforeSolve.map(row => [...row]);
    const solved = solveMiniSudokuBoard(boardToSolve);

    if (!solved) {
        alert('No solution could be found for this configuration.');
        return;
    }

    miniSudokuGrid = boardToSolve;
    miniSudokuErrorCells = createBooleanGrid();

    for (let row = 0; row < MINI_SUDOKU_SIZE; row++) {
        for (let col = 0; col < MINI_SUDOKU_SIZE; col++) {
            const wasEmpty = boardBeforeSolve[row][col] === 0;
            miniSudokuSolverCells[row][col] = wasEmpty && miniSudokuGrid[row][col] !== 0 && !miniSudokuUserCells[row][col];
        }
    }

    setMiniSudokuLocked(true);
    hideMiniSudokuNumberPicker();
    refreshMiniSudokuGrid();
}

function handleMiniSudokuClear() {
    miniSudokuGrid = createNumericGrid();
    miniSudokuUserCells = createBooleanGrid();
    miniSudokuSolverCells = createBooleanGrid();
    miniSudokuErrorCells = createBooleanGrid();

    setMiniSudokuLocked(false);
    refreshMiniSudokuGrid();
}

function findMiniSudokuConflicts(board, row, col, value) {
    if (value === 0) return [];

    const conflicts = [];

    // Row
    for (let c = 0; c < MINI_SUDOKU_SIZE; c++) {
        if (c === col) continue;
        if (board[row][c] === value) {
            conflicts.push({ row, col: c });
        }
    }

    // Column
    for (let r = 0; r < MINI_SUDOKU_SIZE; r++) {
        if (r === row) continue;
        if (board[r][col] === value) {
            conflicts.push({ row: r, col });
        }
    }

    // Region
    const startRow = Math.floor(row / MINI_SUDOKU_REGION_ROWS) * MINI_SUDOKU_REGION_ROWS;
    const startCol = Math.floor(col / MINI_SUDOKU_REGION_COLS) * MINI_SUDOKU_REGION_COLS;

    for (let r = 0; r < MINI_SUDOKU_REGION_ROWS; r++) {
        for (let c = 0; c < MINI_SUDOKU_REGION_COLS; c++) {
            const rr = startRow + r;
            const cc = startCol + c;
            if (rr === row && cc === col) continue;
            if (board[rr][cc] === value) {
                conflicts.push({ row: rr, col: cc });
            }
        }
    }

    return conflicts;
}

function setMiniSudokuCellValue(row, col, value, validate = false) {
    if (validate && value !== 0) {
        const conflicts = findMiniSudokuConflicts(miniSudokuGrid, row, col, value);
        if (conflicts.length > 0) {
            miniSudokuErrorCells = createBooleanGrid();
            conflicts.forEach(({ row: r, col: c }) => {
                miniSudokuErrorCells[r][c] = true;
            });
            miniSudokuErrorCells[row][col] = true;
            refreshMiniSudokuGrid();
            return false;
        }
    }

    miniSudokuGrid[row][col] = value;
    miniSudokuUserCells[row][col] = value !== 0;
    miniSudokuSolverCells[row][col] = false;
    miniSudokuErrorCells = createBooleanGrid();
    refreshMiniSudokuGrid();
    return true;
}

function refreshMiniSudokuGrid() {
    if (!miniSudokuGridContainer) return;

    for (let row = 0; row < MINI_SUDOKU_SIZE; row++) {
        for (let col = 0; col < MINI_SUDOKU_SIZE; col++) {
            const cell = miniSudokuGridContainer.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (!cell) continue;

            const value = miniSudokuGrid[row][col];
            cell.textContent = value > 0 ? value : '';

            cell.classList.remove('mini-user-cell', 'mini-solved-cell', 'mini-error-cell');

            if (miniSudokuUserCells[row][col] && value > 0) {
                cell.classList.add('mini-user-cell');
            } else if (miniSudokuSolverCells[row][col] && value > 0) {
                cell.classList.add('mini-solved-cell');
            }

            if (miniSudokuErrorCells[row][col]) {
                cell.classList.add('mini-error-cell');
            }
        }
    }
}

function ensureMiniSudokuNumberPicker() {
    if (miniSudokuNumberPicker) return;

    const picker = document.createElement('div');
    picker.className = 'mini-number-picker';

    for (let num = 1; num <= MINI_SUDOKU_SIZE; num++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = String(num);
        btn.dataset.value = String(num);
        btn.addEventListener('click', () => handleMiniSudokuNumberSelect(num));
        picker.appendChild(btn);
    }

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'mini-number-clear';
    clearBtn.textContent = 'Clear';
    clearBtn.dataset.value = '0';
    clearBtn.addEventListener('click', () => handleMiniSudokuNumberSelect(0));
    picker.appendChild(clearBtn);

    document.body.appendChild(picker);
    miniSudokuNumberPicker = picker;
}

function showMiniSudokuNumberPicker(cell, row, col) {
    ensureMiniSudokuNumberPicker();
    if (!miniSudokuNumberPicker) return;

    miniSudokuNumberPicker.dataset.row = String(row);
    miniSudokuNumberPicker.dataset.col = String(col);
    miniSudokuNumberPicker.classList.add('visible');
    miniSudokuNumberPicker.style.visibility = 'hidden';
    miniSudokuNumberPicker.style.left = '0px';
    miniSudokuNumberPicker.style.top = '0px';

    const cellRect = cell.getBoundingClientRect();
    const pickerRect = miniSudokuNumberPicker.getBoundingClientRect();
    const offset = 8;

    let left = window.scrollX + cellRect.right + offset;
    let top = window.scrollY + cellRect.top;

    const viewportRight = window.scrollX + window.innerWidth;
    const viewportBottom = window.scrollY + window.innerHeight;

    if (left + pickerRect.width > viewportRight) {
        left = window.scrollX + cellRect.left - pickerRect.width - offset;
    }
    if (left < window.scrollX + 4) {
        left = window.scrollX + 4;
    }

    if (top + pickerRect.height > viewportBottom) {
        top = window.scrollY + cellRect.bottom - pickerRect.height;
    }
    if (top < window.scrollY + 4) {
        top = window.scrollY + 4;
    }

    miniSudokuNumberPicker.style.left = `${left}px`;
    miniSudokuNumberPicker.style.top = `${top}px`;
    miniSudokuNumberPicker.style.visibility = 'visible';
}

function hideMiniSudokuNumberPicker() {
    if (miniSudokuNumberPicker) {
        miniSudokuNumberPicker.classList.remove('visible');
    }
    miniSudokuActiveCell = null;
}

function handleMiniSudokuNumberSelect(value) {
    if (!miniSudokuActiveCell) return;

    const { row, col } = miniSudokuActiveCell;
    // Allow clear without validation so the user can always remove a value.
    if (value === 0) {
        setMiniSudokuCellValue(row, col, 0, false);
        hideMiniSudokuNumberPicker();
        return;
    }

    const placed = setMiniSudokuCellValue(row, col, value, true);
    if (placed) hideMiniSudokuNumberPicker();
}

function applyMiniSudokuStyling() {
    if (!miniSudokuGridContainer) return;
    const outerBorder = '3px solid #444';
    const regionBorder = '2px solid #666';
    const baseBorder = '1px solid #d4d4d4';

    const cells = miniSudokuGridContainer.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);

        if (Number.isNaN(row) || Number.isNaN(col)) return;

        cell.style.borderTop = row === 0
            ? outerBorder
            : (row % MINI_SUDOKU_REGION_ROWS === 0 ? regionBorder : baseBorder);

        cell.style.borderBottom = row === MINI_SUDOKU_SIZE - 1
            ? outerBorder
            : ((row + 1) % MINI_SUDOKU_REGION_ROWS === 0 ? regionBorder : baseBorder);

        cell.style.borderLeft = col === 0
            ? outerBorder
            : (col % MINI_SUDOKU_REGION_COLS === 0 ? regionBorder : baseBorder);

        cell.style.borderRight = col === MINI_SUDOKU_SIZE - 1
            ? outerBorder
            : ((col + 1) % MINI_SUDOKU_REGION_COLS === 0 ? regionBorder : baseBorder);
    });
}

function setMiniSudokuLocked(locked) {
    miniSudokuLocked = locked;
    if (miniSudokuGridContainer) {
        miniSudokuGridContainer.classList.toggle('mini-locked', locked);
    }
}

function validateMiniSudoku(board) {
    const invalidCells = new Set();

    // Rows
    for (let row = 0; row < MINI_SUDOKU_SIZE; row++) {
        const seen = new Map();
        for (let col = 0; col < MINI_SUDOKU_SIZE; col++) {
            const value = board[row][col];
            if (value === 0) continue;
            if (seen.has(value)) {
                invalidCells.add(`${row},${col}`);
                invalidCells.add(`${row},${seen.get(value)}`);
            } else {
                seen.set(value, col);
            }
        }
    }

    // Columns
    for (let col = 0; col < MINI_SUDOKU_SIZE; col++) {
        const seen = new Map();
        for (let row = 0; row < MINI_SUDOKU_SIZE; row++) {
            const value = board[row][col];
            if (value === 0) continue;
            if (seen.has(value)) {
                invalidCells.add(`${row},${col}`);
                invalidCells.add(`${seen.get(value)},${col}`);
            } else {
                seen.set(value, row);
            }
        }
    }

    // Regions
    for (let startRow = 0; startRow < MINI_SUDOKU_SIZE; startRow += MINI_SUDOKU_REGION_ROWS) {
        for (let startCol = 0; startCol < MINI_SUDOKU_SIZE; startCol += MINI_SUDOKU_REGION_COLS) {
            const seen = new Map();
            for (let row = 0; row < MINI_SUDOKU_REGION_ROWS; row++) {
                for (let col = 0; col < MINI_SUDOKU_REGION_COLS; col++) {
                    const r = startRow + row;
                    const c = startCol + col;
                    const value = board[r][c];
                    if (value === 0) continue;
                    if (seen.has(value)) {
                        const previous = seen.get(value);
                        invalidCells.add(`${r},${c}`);
                        invalidCells.add(`${previous.row},${previous.col}`);
                    } else {
                        seen.set(value, { row: r, col: c });
                    }
                }
            }
        }
    }

    return {
        isValid: invalidCells.size === 0,
        invalidCells
    };
}

function applyValidationResults(invalidCellsSet) {
    miniSudokuErrorCells = createBooleanGrid();
    invalidCellsSet.forEach(key => {
        const [rowStr, colStr] = key.split(',');
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);
        if (Number.isNaN(row) || Number.isNaN(col)) return;
        if (row >= 0 && row < MINI_SUDOKU_SIZE && col >= 0 && col < MINI_SUDOKU_SIZE) {
            miniSudokuErrorCells[row][col] = true;
        }
    });
}

function solveMiniSudokuBoard(board) {
    const emptyCell = findEmptyCell(board);
    if (!emptyCell) {
        return true;
    }

    const { row, col } = emptyCell;

    for (let num = 1; num <= MINI_SUDOKU_SIZE; num++) {
        if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (solveMiniSudokuBoard(board)) {
                return true;
            }
            board[row][col] = 0;
        }
    }

    return false;
}

function findEmptyCell(board) {
    for (let row = 0; row < MINI_SUDOKU_SIZE; row++) {
        for (let col = 0; col < MINI_SUDOKU_SIZE; col++) {
            if (board[row][col] === 0) {
                return { row, col };
            }
        }
    }
    return null;
}

function isSafe(board, row, col, num) {
    // Row
    for (let c = 0; c < MINI_SUDOKU_SIZE; c++) {
        if (board[row][c] === num) return false;
    }

    // Column
    for (let r = 0; r < MINI_SUDOKU_SIZE; r++) {
        if (board[r][col] === num) return false;
    }

    // Region
    const startRow = Math.floor(row / MINI_SUDOKU_REGION_ROWS) * MINI_SUDOKU_REGION_ROWS;
    const startCol = Math.floor(col / MINI_SUDOKU_REGION_COLS) * MINI_SUDOKU_REGION_COLS;

    for (let r = 0; r < MINI_SUDOKU_REGION_ROWS; r++) {
        for (let c = 0; c < MINI_SUDOKU_REGION_COLS; c++) {
            if (board[startRow + r][startCol + c] === num) return false;
        }
    }

    return true;
}

function initializeMiniSudokuSolver(gridContainer, createGridFunc, handlersObject) {
    miniSudokuGridContainer = gridContainer;

    const solveButton = document.getElementById('mini-solve-button');
    const clearButton = document.getElementById('mini-clear-button');

    if (handlersObject) {
        handlersObject.handleCellClick = handleMiniSudokuCellClick;
        handlersObject.handleCellContextMenu = handleMiniSudokuCellContextMenu;
        handlersObject.getCurrentSize = () => MINI_SUDOKU_SIZE;
        handlersObject.onAfterGridCreate = () => {
            applyMiniSudokuStyling();
            refreshMiniSudokuGrid();
            setMiniSudokuLocked(miniSudokuLocked);
        };
    }

    if (solveButton) {
        solveButton.addEventListener('click', handleMiniSudokuSolve);
    }

    if (clearButton) {
        clearButton.addEventListener('click', handleMiniSudokuClear);
    }

    document.addEventListener('click', (event) => {
        if (!miniSudokuNumberPicker || !miniSudokuNumberPicker.classList.contains('visible')) return;
        const target = event.target;
        if (miniSudokuNumberPicker.contains(target)) return;
        if (miniSudokuGridContainer && miniSudokuGridContainer.contains(target)) return;
        hideMiniSudokuNumberPicker();
    });

    setMiniSudokuLocked(false);
    createGridFunc(miniSudokuGridContainer, MINI_SUDOKU_SIZE, 'mini');
}
