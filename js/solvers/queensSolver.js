// js/solvers/queensSolver.js

// --- DOM Element References ---
let queensGridSizeSlider, queensGridSizeLabel, queensClearButton, queensSolveButton;
let queensGridContainer;
let queensCreateGridFunc;
let queensColorPalette;

// --- State Variables ---
const STATE = {
    currentSize: 8, // Default size
    isLeftMouseDown: false,
    selectedColorIndex: 0, // Currently selected color (0 = first color, -1 = eraser)
    regions: {}, // { regionId: { cells: Set<string> ('r-c'), color: string } }
    cellToRegionId: {}, // Map 'r-c' string to regionId
    placedQueens: [], // Array of {row, col, element} for user-placed queens
    // Rainbow color palette - will be generated based on grid size
    colorPalette: []
};

// Generate aesthetically pleasing rainbow colors for N regions
function generateRainbowPalette(n) {
    const colors = [];
    // Use HSL for smooth rainbow distribution
    // Saturation and lightness tuned for pleasant, distinguishable colors
    for (let i = 0; i < n; i++) {
        const hue = Math.round((i / n) * 360);
        // Vary saturation slightly for visual interest
        const saturation = 70 + (i % 3) * 5; // 70-80%
        const lightness = 65 + (i % 2) * 5;  // 65-70% for good visibility
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
}

// --- Helper Functions ---
function getRegionColor(colorIndex) {
    if (colorIndex < 0 || colorIndex >= STATE.colorPalette.length) {
        return STATE.colorPalette[0];
    }
    return STATE.colorPalette[colorIndex];
}

function getCell(row, col) {
    return queensGridContainer.querySelector(`.grid-cell[data-row='${row}'][data-col='${col}']`);
}

function getCellKey(row, col) {
    return `${row}-${col}`;
}

function updateColorUsageIndicators() {
    if (!queensColorPalette) return;
    const usedColors = new Set(
        Object.values(STATE.cellToRegionId)
            .map(v => Number(v))
            .filter(v => v >= 0)
    );
    const swatches = queensColorPalette.querySelectorAll('.color-swatch');
    swatches.forEach((swatch, i) => {
        if (i >= STATE.colorPalette.length) return; // Skip the eraser swatch
        const check = swatch.querySelector('.swatch-check');
        if (!check) return;
        check.classList.toggle('visible', usedColors.has(i));
    });
}

function clearState() {
    STATE.isLeftMouseDown = false;
    STATE.regions = {};
    STATE.cellToRegionId = {};
    STATE.placedQueens = [];
    // Don't reset selectedColorIndex - keep user's selection
}

function clearGrid() {
    if (queensGridContainer) {
        queensGridContainer.querySelectorAll('.grid-cell').forEach(cell => {
            cell.style.backgroundColor = '';
            cell.textContent = '';
            cell.classList.remove('queen-placed', 'solved-queen');
        });
    }
}

function clearQueensStateAndGrid() {
    clearState();
    clearGrid();
    updateColorUsageIndicators();
}

// Grid population from matrix data
function loadZones(zoneMatrix) {
    clearQueensStateAndGrid();
    const N = zoneMatrix.length;
    STATE.currentSize = N;
    STATE.colorPalette = generateRainbowPalette(N);
    renderColorPalette();
    
    zoneMatrix.forEach((rowArr, r) => {
        rowArr.forEach((rid, c) => {
            const colorIndex = parseInt(rid, 10) - 1;
            if (!STATE.regions[colorIndex]) {
                STATE.regions[colorIndex] = { 
                    cells: new Set(), 
                    color: getRegionColor(colorIndex) 
                };
            }
            const key = getCellKey(r, c);
            STATE.regions[colorIndex].cells.add(key);
            STATE.cellToRegionId[key] = colorIndex;
        });
    });
    
    // Redraw grid and color cells
    if (typeof queensCreateGridFunc === 'function') {
        queensCreateGridFunc(queensGridContainer, N, 'queens');
        
        // Color cells based on regions
        Object.entries(STATE.regions).forEach(([colorIdx, reg]) => {
            reg.cells.forEach(key => {
                const [r, c] = key.split('-').map(Number);
                const cell = getCell(r, c);
                if (cell) cell.style.backgroundColor = reg.color;
            });
        });
    }

    updateColorUsageIndicators();
}

// --- Queen Management ---
function removeQueen(row, col) {
    const queenIndex = STATE.placedQueens.findIndex(q => q.row === row && q.col === col);
    if (queenIndex > -1) {
        const removedQueen = STATE.placedQueens.splice(queenIndex, 1)[0];
        if (removedQueen.element) {
            removedQueen.element.textContent = '';
            removedQueen.element.classList.remove('queen-placed');
        }
        return true;
    }
    return false;
}

// --- Color Palette Management ---
function renderColorPalette() {
    if (!queensColorPalette) return;
    
    queensColorPalette.innerHTML = '';
    
    // Add color swatches
    STATE.colorPalette.forEach((color, index) => {
        const swatch = document.createElement('button');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.setAttribute('aria-label', `Color ${index + 1}`);
        swatch.setAttribute('title', `Region ${index + 1}`);
        if (index === STATE.selectedColorIndex) {
            swatch.classList.add('active');
        }
        const check = document.createElement('span');
        check.className = 'swatch-check';
        check.setAttribute('aria-hidden', 'true');
        swatch.appendChild(check);
        swatch.addEventListener('click', () => selectColor(index));
        queensColorPalette.appendChild(swatch);
    });
    
    // Add eraser
    const eraser = document.createElement('button');
    eraser.className = 'color-swatch eraser';
    eraser.innerHTML = '✕';
    eraser.setAttribute('aria-label', 'Eraser');
    eraser.setAttribute('title', 'Eraser - remove cells from regions');
    if (STATE.selectedColorIndex === -1) {
        eraser.classList.add('active');
    }
    eraser.addEventListener('click', () => selectColor(-1));
    queensColorPalette.appendChild(eraser);

    updateColorUsageIndicators();
}

function selectColor(index) {
    STATE.selectedColorIndex = index;
    
    // Update visual selection
    const swatches = queensColorPalette.querySelectorAll('.color-swatch');
    swatches.forEach((swatch, i) => {
        if (i < STATE.colorPalette.length) {
            swatch.classList.toggle('active', i === index);
        } else {
            // Eraser is the last swatch
            swatch.classList.toggle('active', index === -1);
        }
    });
}

// --- Event Handlers ---
function handleQueensCellMouseDown(event, cell, row, col) {
    if (event.button === 0) { // Left click
        event.preventDefault();
        STATE.isLeftMouseDown = true;
        paintCell(cell, row, col);
    }
}

function handleQueensCellMouseMove(event, cell, row, col) {
    if (STATE.isLeftMouseDown) {
        event.preventDefault();
        paintCell(cell, row, col);
    }
}

function paintCell(cell, row, col) {
    const cellKey = getCellKey(row, col);
    const colorIndex = STATE.selectedColorIndex;
    
    // Remove any queen at this location when painting
    removeQueen(row, col);
    
    if (colorIndex === -1) {
        // Eraser mode - remove cell from its region
        const existingRegionId = STATE.cellToRegionId[cellKey];
        if (existingRegionId !== undefined && STATE.regions[existingRegionId]) {
            STATE.regions[existingRegionId].cells.delete(cellKey);
            delete STATE.cellToRegionId[cellKey];
            cell.style.backgroundColor = '';
        }
    } else {
        // Paint mode - assign cell to selected color region
        const existingRegionId = STATE.cellToRegionId[cellKey];
        
        // Remove from old region if different
        if (existingRegionId !== undefined && existingRegionId !== colorIndex) {
            if (STATE.regions[existingRegionId]) {
                STATE.regions[existingRegionId].cells.delete(cellKey);
            }
        }
        
        // Add to new region
        if (!STATE.regions[colorIndex]) {
            STATE.regions[colorIndex] = {
                cells: new Set(),
                color: getRegionColor(colorIndex)
            };
        }
        
        STATE.regions[colorIndex].cells.add(cellKey);
        STATE.cellToRegionId[cellKey] = colorIndex;
        cell.style.backgroundColor = STATE.regions[colorIndex].color;
    }

    updateColorUsageIndicators();
}

function handleQueensGridMouseUp(event) { 
    if (event.button === 0) { // Left click release
        STATE.isLeftMouseDown = false;
    }
}

function handleQueensCellContextMenu(event, cell, row, col) {
    event.preventDefault();
    const cellKey = getCellKey(row, col);
    
    if (STATE.cellToRegionId[cellKey] === undefined) {
        alert("Please define a region for this cell before placing a queen.");
        return;
    }

    const existingQueenIndex = STATE.placedQueens.findIndex(q => q.row === row && q.col === col);

    if (existingQueenIndex > -1) { 
        // Remove queen
        STATE.placedQueens.splice(existingQueenIndex, 1);
        cell.textContent = '';
        cell.classList.remove('queen-placed');
        
        // Restore region color
        const regionId = STATE.cellToRegionId[cellKey];
        if (regionId !== undefined && STATE.regions[regionId]) {
            cell.style.backgroundColor = STATE.regions[regionId].color;
        } else {
            cell.style.backgroundColor = '';
        }
    } else { 
        // Place queen with crown symbol
        STATE.placedQueens.push({ row, col, element: cell });
        cell.textContent = '♕'; // Unicode queen symbol
        cell.classList.add('queen-placed');
    }
}

// --- Solver Implementation ---
function solveQueensAlgorithm() {
    const N = STATE.currentSize;
    if (N === 0) {
        console.log("Grid size is 0, cannot solve.");
        return;
    }

    // Validate regions
    const regionIds = Object.keys(STATE.regions).filter(id => 
        STATE.regions[id] && STATE.regions[id].cells.size > 0
    );
    
    if (regionIds.length !== N) {
        alert(`Define exactly ${N} regions before solving.`);
        return;
    }

    // Clear any previously displayed solution
    clearSolution();
    
    // Prepare tracking arrays
    const rowUsed = Array(N).fill(false);
    const colUsed = Array(N).fill(false);
    const regionUsed = {}; // Track which regions have queens
    regionIds.forEach(id => regionUsed[id] = false);
    
    // Start with user-placed queens if any
    const solution = [...STATE.placedQueens];
    let validStart = prepareInitialState(solution, rowUsed, colUsed, regionUsed);
    
    if (!validStart) {
        alert("User-placed queens create an invalid starting position. Please adjust them.");
        return;
    }
    
    // Attempt to solve
    if (solveRecursive(0, N, rowUsed, colUsed, regionUsed, solution)) {
        displaySolution(solution);
        console.log("Queens puzzle solved successfully!");
    } else {
        alert("No solution found for this configuration.");
    }
}

// Clear any previously displayed solution queens
function clearSolution() {
    queensGridContainer.querySelectorAll('.grid-cell.solved-queen').forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('solved-queen');
        
        // Restore region color
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const cellKey = getCellKey(row, col);
        const regionId = STATE.cellToRegionId[cellKey];
        
        if (regionId !== undefined && STATE.regions[regionId]) {
            cell.style.backgroundColor = STATE.regions[regionId].color;
        }
    });
}

// Prepare the initial state with user-placed queens
function prepareInitialState(solution, rowUsed, colUsed, regionUsed) {
    // Validate and mark user-placed queens
    for (const queen of STATE.placedQueens) {
        const { row, col } = queen;
        const cellKey = getCellKey(row, col);
        const regionId = STATE.cellToRegionId[cellKey];
        
        // Check if this violates any constraint
        if (rowUsed[row] || colUsed[col] || regionUsed[regionId]) {
            return false; // Violates basic constraints
        }
        
        // Check adjacency constraint with other placed queens
        for (const other of STATE.placedQueens) {
            if (other !== queen && isAdjacent(row, col, other.row, other.col)) {
                return false; // Queens are adjacent
            }
        }
        
        // Mark as used
        rowUsed[row] = true;
        colUsed[col] = true;
        regionUsed[regionId] = true;
    }
    
    return true;
}

// Check if two positions are adjacent (including diagonally)
function isAdjacent(row1, col1, row2, col2) {
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    return rowDiff <= 1 && colDiff <= 1;
}

// Recursive backtracking solver
function solveRecursive(currentRow, N, rowUsed, colUsed, regionUsed, solution) {
    // Base case: we've filled all rows
    if (currentRow >= N) {
        return true;
    }
    
    // Skip rows that already have queens placed by the user
    if (rowUsed[currentRow]) {
        return solveRecursive(currentRow + 1, N, rowUsed, colUsed, regionUsed, solution);
    }
    
    // Try each column in the current row
    for (let col = 0; col < N; col++) {
        if (canPlaceQueen(currentRow, col, N, rowUsed, colUsed, regionUsed, solution)) {
            // Place the queen
            const cellKey = getCellKey(currentRow, col);
            const regionId = STATE.cellToRegionId[cellKey];
            
            rowUsed[currentRow] = true;
            colUsed[col] = true;
            regionUsed[regionId] = true;
            solution.push({ row: currentRow, col });
            
            // Recursively try to solve the rest
            if (solveRecursive(currentRow + 1, N, rowUsed, colUsed, regionUsed, solution)) {
                return true;
            }
            
            // Backtrack
            solution.pop();
            rowUsed[currentRow] = false;
            colUsed[col] = false;
            regionUsed[regionId] = false;
        }
    }
    
    return false; // No solution found
}

// Check if a queen can be placed at a position
function canPlaceQueen(row, col, N, rowUsed, colUsed, regionUsed, currentSolution) {
    // Check row and column constraints
    if (rowUsed[row] || colUsed[col]) {
        return false;
    }
    
    // Check region constraint
    const cellKey = getCellKey(row, col);
    const regionId = STATE.cellToRegionId[cellKey];
    
    if (regionId === undefined || regionUsed[regionId]) {
        return false;
    }
    
    // Check adjacency constraint with existing queens
    for (const queen of currentSolution) {
        if (isAdjacent(row, col, queen.row, queen.col)) {
            return false;
        }
    }
    
    return true;
}

// Display the solution on the grid
function displaySolution(solution) {
    // Show only the solver-placed queens (not user-placed ones)
    const userQueenPositions = new Set(STATE.placedQueens.map(q => 
        `${q.row}-${q.col}`
    ));
    
    for (const queen of solution) {
        // Skip user-placed queens as they're already shown
        if (userQueenPositions.has(`${queen.row}-${queen.col}`)) {
            continue;
        }
        
        const cell = getCell(queen.row, queen.col);
        if (cell) {
            cell.textContent = '♕'; // Unicode queen symbol
            cell.classList.add('solved-queen');
            // Don't override the region background color
        }
    }
}

// --- Initialization ---
function initializeQueensSolver(_gridContainer, _createGridFunc, _handlersObject) {
    // Store references
    queensGridContainer = _gridContainer;
    queensCreateGridFunc = _createGridFunc;

    // Fetch control elements
    queensGridSizeSlider = document.getElementById('queens-grid-size-slider');
    queensGridSizeLabel = document.getElementById('queens-grid-size-label');
    queensClearButton = document.getElementById('queens-clear-button');
    queensSolveButton = document.getElementById('queens-solve-button');
    queensColorPalette = document.getElementById('queens-color-palette');

    // Set up event handlers
    if (_handlersObject) {
        _handlersObject.handleCellMouseDown = handleQueensCellMouseDown;
        _handlersObject.handleCellMouseMove = handleQueensCellMouseMove;
        _handlersObject.handleGridMouseUp = handleQueensGridMouseUp;
        _handlersObject.handleCellContextMenu = handleQueensCellContextMenu;
        _handlersObject.getCurrentSize = () => STATE.currentSize;
    }

    // Initialize UI controls
    if (queensGridSizeSlider && queensGridSizeLabel) {
        STATE.currentSize = parseInt(queensGridSizeSlider.value, 10);
        queensGridSizeLabel.textContent = `${STATE.currentSize}×${STATE.currentSize}`;
        
        // Generate initial color palette
        STATE.colorPalette = generateRainbowPalette(STATE.currentSize);
        STATE.selectedColorIndex = 0;
        renderColorPalette();
        
        // Initial grid draw
        _createGridFunc(queensGridContainer, STATE.currentSize, 'queens');

        // Set up slider event
        queensGridSizeSlider.addEventListener('input', () => {
            STATE.currentSize = parseInt(queensGridSizeSlider.value, 10);
            queensGridSizeLabel.textContent = `${STATE.currentSize}×${STATE.currentSize}`;
            
            // Regenerate palette for new size
            STATE.colorPalette = generateRainbowPalette(STATE.currentSize);
            STATE.selectedColorIndex = 0;
            renderColorPalette();
            
            clearQueensStateAndGrid();
            _createGridFunc(queensGridContainer, STATE.currentSize, 'queens');
        });
    }

    // Set up button events
    if (queensClearButton) {
        queensClearButton.addEventListener('click', () => {
            clearQueensStateAndGrid();
            _createGridFunc(queensGridContainer, STATE.currentSize, 'queens');
        });
    }

    if (queensSolveButton) {
        queensSolveButton.addEventListener('click', solveQueensAlgorithm);
    }
}

// Export for testing if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports.loadZones = loadZones;
}
