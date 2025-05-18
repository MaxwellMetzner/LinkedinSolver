// js/solvers/queensSolver.js

// --- DOM Element References ---
let queensGridSizeSlider, queensGridSizeLabel, queensClearButton, queensSolveButton;
let queensGridContainer;
let queensCreateGridFunc;

// --- State Variables ---
const STATE = {
    currentSize: 8, // Default size
    isLeftMouseDown: false,
    currentDrawingRegionId: null,
    nextRegionId: 1,
    regions: {}, // { regionId: { cells: Set<string> ('r-c'), color: string } }
    cellToRegionId: {}, // Map 'r-c' string to regionId
    placedQueens: [], // Array of {row, col, element} for user-placed queens
    isDrawingNewRegion: false, // Flag for tracking new region drawing
    colorPalette: ['#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#E0E0E0', '#FFACC4', '#C5E1A5', '#FFE082', '#BCAAA4', '#B0BEC5']
};

// --- Helper Functions ---
function getRegionColor(regionId) {
    return STATE.colorPalette[regionId % STATE.colorPalette.length];
}

function getCell(row, col) {
    return queensGridContainer.querySelector(`.grid-cell[data-row='${row}'][data-col='${col}']`);
}

function getCellKey(row, col) {
    return `${row}-${col}`;
}

function clearState() {
    STATE.isLeftMouseDown = false;
    STATE.currentDrawingRegionId = null;
    STATE.nextRegionId = 1;
    STATE.regions = {};
    STATE.cellToRegionId = {};
    STATE.placedQueens = [];
    STATE.isDrawingNewRegion = false;
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
}

// Grid population from matrix data
function loadZones(zoneMatrix) {
    clearQueensStateAndGrid();
    const N = zoneMatrix.length;
    STATE.currentSize = N;
    
    zoneMatrix.forEach((rowArr, r) => {
        rowArr.forEach((rid, c) => {
            if (!STATE.regions[rid]) {
                const idNum = parseInt(rid, 10);
                STATE.regions[rid] = { 
                    cells: new Set(), 
                    color: getRegionColor(idNum - 1) 
                };
            }
            const key = getCellKey(r, c);
            STATE.regions[rid].cells.add(key);
            STATE.cellToRegionId[key] = rid;
        });
    });
    
    // Redraw grid and color cells
    if (typeof queensCreateGridFunc === 'function') {
        queensCreateGridFunc(queensGridContainer, N, 'queens');
        
        // Color cells based on regions
        Object.entries(STATE.regions).forEach(([rid, reg]) => {
            reg.cells.forEach(key => {
                const [r, c] = key.split('-').map(Number);
                const cell = getCell(r, c);
                if (cell) cell.style.backgroundColor = reg.color;
            });
        });
    }
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

// --- Event Handlers ---
function handleQueensCellMouseDown(event, cell, row, col) {
    if (event.button === 0) { // Left click
        event.preventDefault();
        STATE.isLeftMouseDown = true;
        const cellKey = getCellKey(row, col);

        // Remove any queen at this location
        removeQueen(row, col);

        if (STATE.cellToRegionId[cellKey]) {
            // Existing region clicked, prepare to expand it
            STATE.currentDrawingRegionId = STATE.cellToRegionId[cellKey];
            STATE.isDrawingNewRegion = false;
        } else {
            // Start a new region
            STATE.isDrawingNewRegion = true;
            STATE.currentDrawingRegionId = STATE.nextRegionId;
            STATE.regions[STATE.currentDrawingRegionId] = {
                cells: new Set(),
                color: getRegionColor(STATE.currentDrawingRegionId - 1)
            };
            
            STATE.regions[STATE.currentDrawingRegionId].cells.add(cellKey);
            STATE.cellToRegionId[cellKey] = STATE.currentDrawingRegionId;
            cell.style.backgroundColor = STATE.regions[STATE.currentDrawingRegionId].color;
        }
    }
}

function handleQueensCellMouseMove(event, cell, row, col) {
    if (STATE.isLeftMouseDown && STATE.currentDrawingRegionId) {
        event.preventDefault();
        const cellKey = getCellKey(row, col);
        const targetRegionId = STATE.currentDrawingRegionId;
        const targetRegion = STATE.regions[targetRegionId];

        if (!targetRegion) return;

        const existingRegionIdOfCell = STATE.cellToRegionId[cellKey];

        // Handle moving from one region to another
        if (existingRegionIdOfCell && existingRegionIdOfCell !== targetRegionId) {
            const oldRegion = STATE.regions[existingRegionIdOfCell];
            if (oldRegion) {
                oldRegion.cells.delete(cellKey);
            }
        }

        // Add cell to target region if not already there
        if (existingRegionIdOfCell !== targetRegionId) {
            targetRegion.cells.add(cellKey);
            STATE.cellToRegionId[cellKey] = targetRegionId;
            cell.style.backgroundColor = targetRegion.color;

            // Remove any queen on this cell
            removeQueen(row, col);
        }
    }
}

function handleQueensGridMouseUp(event) { 
    if (event.button === 0) { // Left click release
        if (STATE.isLeftMouseDown && STATE.currentDrawingRegionId) {
            if (STATE.isDrawingNewRegion) {
                const currentRegion = STATE.regions[STATE.currentDrawingRegionId];
                if (currentRegion && currentRegion.cells.size > 0) {
                    STATE.nextRegionId++;
                } else if (currentRegion && currentRegion.cells.size === 0) {
                    delete STATE.regions[STATE.currentDrawingRegionId];
                }
            }
        }
        STATE.isLeftMouseDown = false;
        STATE.currentDrawingRegionId = null;
        STATE.isDrawingNewRegion = false;
    }
}

function handleQueensCellContextMenu(event, cell, row, col) {
    event.preventDefault();
    const cellKey = getCellKey(row, col);
    
    if (!STATE.cellToRegionId[cellKey]) {
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
        if (regionId && STATE.regions[regionId]) {
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
        
        if (regionId && STATE.regions[regionId]) {
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
    
    if (!regionId || regionUsed[regionId]) {
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
        queensGridSizeLabel.textContent = `${STATE.currentSize}x${STATE.currentSize}`;
        
        // Initial grid draw
        _createGridFunc(queensGridContainer, STATE.currentSize, 'queens');

        // Set up slider event
        queensGridSizeSlider.addEventListener('input', () => {
            STATE.currentSize = parseInt(queensGridSizeSlider.value, 10);
            queensGridSizeLabel.textContent = `${STATE.currentSize}x${STATE.currentSize}`;
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
