// --- Elements for Zip Solver ---
const zipGridSizeSlider = document.getElementById('zip-grid-size-slider');
const zipGridSizeLabel = document.getElementById('zip-grid-size-label');
const zipClearButton = document.getElementById('zip-clear-button');
const zipSolveButton = document.getElementById('zip-solve-button');

let zipSelectedPoints = [];
let zipCurrentSize = 6; // Default, will be updated
let zipSolutionPath = []; // To store the found solution path for Zip
let zipBlocks = []; // To store blocks between cells
let zipRequiredOrderLookup = new Map();

const zipGradientStartColor = { r: 52, g: 199, b: 89 };   // Green
const zipGradientMidColor = { r: 255, g: 228, b: 92 };    // Yellow
const zipGradientEndColor = { r: 220, g: 53, b: 69 };     // Red

// CSS for block indicators
const blockStyleElement = document.createElement('style');
blockStyleElement.textContent = `
.block-indicator {
    position: absolute;
    background-color: var(--zip-block-color);
    z-index: 20; /* Increased z-index to ensure visibility */
    pointer-events: none; /* Allow clicks to pass through to cell */
}
.block-horizontal {
    height: 4px;
    width: 100%;
    bottom: -2px;
    left: 0;
}
.block-vertical {
    width: 4px;
    height: 100%;
    right: -2px;
    top: 0;
}
.grid-cell {
    position: relative;
    z-index: 1;
}
.user-selected {
    z-index: 10; /* Lower than block indicators */
}
`;
document.head.appendChild(blockStyleElement);

function handleZipCellClick(event, cell, row, col) {
    // Only handle left clicks for path points
    if (event.button !== 0) return;
    
    // Check if this cell has any block indicators before changing its state
    const blockElements = Array.from(cell.querySelectorAll('.block-indicator'));
    
    const existingPointIndex = zipSelectedPoints.findIndex(p => p.row === row && p.col === col);
    if (existingPointIndex > -1) {
        zipSelectedPoints.splice(existingPointIndex, 1);
        cell.classList.remove('user-selected');
        cell.textContent = '';
        // Re-number remaining points
        zipSelectedPoints.forEach((p, index) => {
            if (p.element) p.element.textContent = index + 1;
        });
    } else {
        const order = zipSelectedPoints.length + 1;
        zipSelectedPoints.push({ row, col, element: cell, order });
        cell.classList.add('user-selected');
        cell.textContent = order;
    }
    
    // Re-attach any block indicators that might have been affected
    if (blockElements.length > 0) {
        blockElements.forEach(blockElement => {
            cell.appendChild(blockElement);
        });
    }
}

function handleZipCellContextMenu(event, cell, row, col) {
    event.preventDefault(); // Prevent context menu from appearing
    
    // Determine which edge was clicked
    const rect = cell.getBoundingClientRect();
    const x = event.clientX - rect.left; // X position within the cell
    const y = event.clientY - rect.top;  // Y position within the cell
    
    const cellWidth = rect.width;
    const cellHeight = rect.height;
    
    const margin = 10; // pixels from edge to detect edge click
    
    // Determine the edge
    let edgeType = null;
    let neighborRow = row;
    let neighborCol = col;
    
    if (x < margin) { // Left edge
        edgeType = 'vertical';
        neighborCol = col - 1;
    } else if (x > cellWidth - margin) { // Right edge
        edgeType = 'vertical';
        // neighborCol stays the same, we're referring to the right edge of current cell
    } else if (y < margin) { // Top edge
        edgeType = 'horizontal';
        neighborRow = row - 1;
    } else if (y > cellHeight - margin) { // Bottom edge
        edgeType = 'horizontal';
        // neighborRow stays the same, we're referring to the bottom edge of current cell
    }
    
    // Only process edge clicks
    if (!edgeType) return;
    
    // Check if neighbor cell is within grid bounds
    if (neighborRow < 0 || neighborRow >= zipCurrentSize || 
        neighborCol < 0 || neighborCol >= zipCurrentSize) {
        return; // Out of bounds
    }
    
    // Create a unique identifier for this block
    const blockId = edgeType === 'horizontal' 
        ? `h_${Math.min(row, neighborRow)}_${col}`
        : `v_${row}_${Math.min(col, neighborCol)}`;
    
    // Check if block already exists
    const existingBlockIndex = zipBlocks.findIndex(b => b.id === blockId);
    
    if (existingBlockIndex > -1) {
        // Remove existing block
        const block = zipBlocks[existingBlockIndex];
        if (block.element) {
            block.element.remove();
        }
        zipBlocks.splice(existingBlockIndex, 1);
    } else {
        // Add new block
        const blockElement = document.createElement('div');
        blockElement.classList.add('block-indicator');
        blockElement.classList.add(edgeType === 'horizontal' ? 'block-horizontal' : 'block-vertical');
        
        // Append to the correct cell
        let targetCell = cell;
        if (edgeType === 'horizontal' && neighborRow < row) {
            // Target the top cell for horizontal blocks between rows
            targetCell = zipGridContainer.querySelector(`[data-row="${neighborRow}"][data-col="${col}"]`);
        } else if (edgeType === 'vertical' && neighborCol < col) {
            // Target the left cell for vertical blocks between columns
            targetCell = zipGridContainer.querySelector(`[data-row="${row}"][data-col="${neighborCol}"]`);
        }
        
        targetCell.appendChild(blockElement);
        
        // Store block reference
        zipBlocks.push({
            id: blockId,
            type: edgeType,
            row: edgeType === 'horizontal' ? Math.min(row, neighborRow) : row,
            col: edgeType === 'vertical' ? Math.min(col, neighborCol) : col,
            element: blockElement
        });
    }
}

function displayZipSolutionOnGrid(gridSize, container) {
    if (!container) {
        console.error("Zip grid container not provided for displaying solution.");
        return;
    }
    const total = zipSolutionPath.length;
    zipSolutionPath.forEach((p, index) => {
        const cellElement = container.querySelector(`[data-row="${p.r}"][data-col="${p.c}"]`);
        if (cellElement) {
            const t = total > 1 ? index / (total - 1) : 0;
            const color = getZipGradientColor(t);

            cellElement.classList.remove('user-selected');
            cellElement.classList.add('zip-solution-cell');
            cellElement.classList.toggle('zip-solution-start', index === 0);
            cellElement.classList.toggle('zip-solution-end', index === total - 1);

            cellElement.style.backgroundColor = color;
            cellElement.textContent = index + 1;
        }
    });
}

function clearZipSelections() {
    if (!zipGridContainer) return;

    // Clear selected points
    zipSelectedPoints.forEach(p => {
        if (p.element) {
            p.element.classList.remove('user-selected', 'solved-path');
            p.element.textContent = '';
        }
    });
    zipSelectedPoints = [];
    zipSolutionPath = [];

    // Clear blocks
    zipBlocks.forEach(block => {
        if (block.element && block.element.parentNode) {
            block.element.parentNode.removeChild(block.element);
        }
    });
    zipBlocks = [];

    // Clear any remaining solved path indicators
    const solvedCells = zipGridContainer.querySelectorAll('.grid-cell');
    solvedCells.forEach(cell => {
        cell.classList.remove('solved-path');
        clearZipSolutionStyling(cell);
        if (!cell.classList.contains('user-selected')) {
            cell.textContent = '';
        }
    });
}

let zipSolverIterations = 0;
const MAX_SOLVER_ITERATIONS = 5000000; // Limit iterations to prevent browser freezing
const zipDirections = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
];

// Check if a move from (row, col) to (newRow, newCol) is blocked by a barrier
function isBlockedMove(row, col, newRow, newCol, blockSet) {
    // Determine if the move is horizontal or vertical
    let blockType = row === newRow ? 'horizontal' : 'vertical';
    let blockId;
    
    if (blockType === 'horizontal') {
        // Moving horizontally - check for vertical block
        const minCol = Math.min(col, newCol);
        blockId = `v_${row}_${minCol}`;
    } else {
        // Moving vertically - check for horizontal block
        const minRow = Math.min(row, newRow);
        blockId = `h_${minRow}_${col}`;
    }
    
    if (blockSet) {
        return blockSet.has(blockId);
    }

    return zipBlocks.some(block => block.id === blockId);
}

// Check if all required points have been visited in the right order
function checkRequiredPointsVisited(path, currentTargetIdx) {
    // If we have a current target, we haven't visited all required points yet
    if (currentTargetIdx < zipSelectedPoints.length) return false;
    
    // Verify each selected point was visited in the right order
    for (let i = 0; i < zipSelectedPoints.length; i++) {
        const point = zipSelectedPoints[i];
        const pathIndex = path.findIndex(p => p.r === point.row && p.c === point.col);
        
        // Point not found in path or visited in wrong order
        if (pathIndex === -1 || pathIndex !== path.findIndex(p => p.r === zipSelectedPoints[i].row && p.c === zipSelectedPoints[i].col)) {
            return false;
        }
    }
    
    return true;
}

// Sort zipSelectedPoints by order before starting the solver
function prepareSelectedPoints() {
    zipSelectedPoints.sort((a, b) => a.order - b.order);
    zipRequiredOrderLookup = new Map();
    zipSelectedPoints.forEach((p, idx) => {
        zipRequiredOrderLookup.set(`${p.row}_${p.col}`, idx);
    });
}

function buildZipBlockSet() {
    const blockSet = new Set();
    zipBlocks.forEach(block => blockSet.add(block.id));
    return blockSet;
}

function getZipNeighborMoves(row, col, visited, gridSize, blockSet) {
    const moves = [];
    for (const { dr, dc } of zipDirections) {
        const newRow = row + dr;
        const newCol = col + dc;

        if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) continue;
        if (visited[newRow][newCol]) continue;
        if (isBlockedMove(row, col, newRow, newCol, blockSet)) continue;

        moves.push({ newRow, newCol });
    }
    return moves;
}

function countZipUnvisitedNeighbors(row, col, visited, gridSize, blockSet) {
    let count = 0;
    for (const { dr, dc } of zipDirections) {
        const newRow = row + dr;
        const newCol = col + dc;

        if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize) continue;
        if (visited[newRow][newCol]) continue;
        if (isBlockedMove(row, col, newRow, newCol, blockSet)) continue;

        count++;
    }
    return count;
}

function zipHasDisconnectedRegions(visited, gridSize, blockSet) {
    let unvisitedCount = 0;
    let startCell = null;

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (!visited[r][c]) {
                unvisitedCount++;
                if (!startCell) {
                    startCell = { r, c };
                }
            }
        }
    }

    if (!startCell) {
        return false;
    }

    const seen = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
    const queue = [startCell];
    seen[startCell.r][startCell.c] = true;
    let reachable = 0;

    while (queue.length > 0) {
        const { r, c } = queue.shift();
        reachable++;

        for (const { dr, dc } of zipDirections) {
            const nr = r + dr;
            const nc = c + dc;

            if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
            if (visited[nr][nc]) continue;
            if (seen[nr][nc]) continue;
            if (isBlockedMove(r, c, nr, nc, blockSet)) continue;

            seen[nr][nc] = true;
            queue.push({ r: nr, c: nc });
        }
    }

    return reachable !== unvisitedCount;
}

function zipIsTargetReachable(row, col, targetRow, targetCol, visited, gridSize, blockSet) {
    if (row === targetRow && col === targetCol) return true;

    const queue = [{ r: row, c: col }];
    const seen = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
    seen[row][col] = true;

    while (queue.length > 0) {
        const { r, c } = queue.shift();

        for (const { dr, dc } of zipDirections) {
            const nr = r + dr;
            const nc = c + dc;

            if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) continue;
            if (isBlockedMove(r, c, nr, nc, blockSet)) continue;
            if (visited[nr][nc] && !(nr === targetRow && nc === targetCol)) continue;
            if (seen[nr][nc]) continue;

            if (nr === targetRow && nc === targetCol) {
                return true;
            }

            seen[nr][nc] = true;
            queue.push({ r: nr, c: nc });
        }
    }

    return false;
}

function orderZipMoves(row, col, moves, visited, gridSize, blockSet, nextTargetIdx) {
    if (moves.length <= 1) return moves;

    const target = nextTargetIdx < zipSelectedPoints.length ? zipSelectedPoints[nextTargetIdx] : null;

    const enriched = moves.map(move => {
        const onward = countZipUnvisitedNeighbors(move.newRow, move.newCol, visited, gridSize, blockSet);
        const distance = target ? Math.abs(move.newRow - target.row) + Math.abs(move.newCol - target.col) : 0;
        return {
            ...move,
            onward,
            distance,
            forced: onward === 1
        };
    });

    const forcedMoves = enriched.filter(m => m.forced);
    const remainingMoves = enriched.filter(m => !m.forced);

    forcedMoves.sort((a, b) => a.onward - b.onward || a.distance - b.distance);
    remainingMoves.sort((a, b) => a.onward - b.onward || a.distance - b.distance);

    return [...forcedMoves, ...remainingMoves].map(({ newRow, newCol }) => ({ newRow, newCol }));
}

// Main solver function
function solveZipPuzzle() {
    const gridSize = zipCurrentSize;
    const visited = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
    zipSolutionPath = [];
    zipSolverIterations = 0;
    const blockSet = buildZipBlockSet();
    
    // Sort points by order before solving
    prepareSelectedPoints();
    
    if (zipSelectedPoints.length === 0) {
        alert("Please select at least one starting point for the Zip puzzle.");
        return false;
    }
    
    const startPoint = zipSelectedPoints[0];
    
    // Start the recursive solving process from the first selected point
    const found = solveZipRecursive(startPoint.row, startPoint.col, 1, 0, gridSize, visited, blockSet);
    
    return found;
}

// Recursive backtracking function for finding a solution
function solveZipRecursive(row, col, pathLength, currentTargetIdx, gridSize, visited, blockSet) {
    zipSolverIterations++;
    if (zipSolverIterations >= MAX_SOLVER_ITERATIONS) {
        return false; // Prevent browser from hanging on very complex puzzles
    }
    
    // Add current position to path
    zipSolutionPath.push({ r: row, c: col });
    visited[row][col] = true;
    
    let nextTargetIdx = currentTargetIdx;
    
    // Check if we're at a required point and update the target index
    const pointKey = `${row}_${col}`;
    if (zipRequiredOrderLookup.has(pointKey)) {
        const requiredIdx = zipRequiredOrderLookup.get(pointKey);
        if (requiredIdx === currentTargetIdx) {
            nextTargetIdx++;
        } else if (requiredIdx > currentTargetIdx) {
        // We hit a required point out of order - invalid path
        visited[row][col] = false;
        zipSolutionPath.pop();
        return false;
    }
    }
    
    // Check if we've completed a valid path
    if (pathLength === gridSize * gridSize) {
        // Make sure all required points were visited in order
        if (nextTargetIdx === zipSelectedPoints.length) {
            return true; // Valid solution found
        } else {
            // Path filled all cells but missed some required points
            visited[row][col] = false;
            zipSolutionPath.pop();
            return false;
        }
    }
    
    if (zipHasDisconnectedRegions(visited, gridSize, blockSet)) {
        visited[row][col] = false;
        zipSolutionPath.pop();
        return false;
    }

    if (nextTargetIdx < zipSelectedPoints.length) {
        const target = zipSelectedPoints[nextTargetIdx];
        if (!zipIsTargetReachable(row, col, target.row, target.col, visited, gridSize, blockSet)) {
            visited[row][col] = false;
            zipSolutionPath.pop();
            return false;
        }
    }

    const moves = getZipNeighborMoves(row, col, visited, gridSize, blockSet);

    if (moves.length === 0) {
        visited[row][col] = false;
        zipSolutionPath.pop();
        return false;
    }
    
    const orderedMoves = orderZipMoves(row, col, moves, visited, gridSize, blockSet, nextTargetIdx);

    for (const move of orderedMoves) {
        if (solveZipRecursive(move.newRow, move.newCol, pathLength + 1, nextTargetIdx, gridSize, visited, blockSet)) {
            return true; // Solution found
        }
    }
    
    // If we get here, no solution was found from this position
    visited[row][col] = false;
    zipSolutionPath.pop();
    return false;
}

// Update the solve button click handler
function zipSolverButtonClick() {
    if (zipSelectedPoints.length === 0) {
        alert("Please select at least one starting point for the Zip puzzle.");
        return;
    }
    
    // Clear previous solution display, preserve user-selected numbered tiles
    const allCells = zipGridContainer.querySelectorAll('.grid-cell');
    allCells.forEach(cell => {
        cell.classList.remove('solved-path');
        clearZipSolutionStyling(cell);
        if (!cell.classList.contains('user-selected')) {
            cell.textContent = '';
        }
    });
    
    // Run the solver
    const startTime = performance.now();
    const found = solveZipPuzzle();
    const endTime = performance.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
    
    if (found) {
        displayZipSolutionOnGrid(zipCurrentSize, zipGridContainer);
        console.log(`Solution found in ${timeTaken} seconds (${zipSolverIterations} iterations)`);
    } else {
        // On failed solve, clear blocks from the board but keep numbered tiles
        zipBlocks.forEach(block => {
            if (block.element && block.element.parentNode) {
                block.element.parentNode.removeChild(block.element);
            }
        });
        zipBlocks = [];
        
        if (zipSolverIterations >= MAX_SOLVER_ITERATIONS) {
            alert(`Solver timed out after ${timeTaken} seconds. The puzzle may be too complex or unsolvable.`);
        } else {
            alert(`No solution found after ${timeTaken} seconds. This puzzle configuration has no valid solution.`);
        }
    }
}

function getZipGradientColor(t) {
    if (t <= 0.5) {
        const ratio = t / 0.5;
        return interpolateZipColor(zipGradientStartColor, zipGradientMidColor, ratio);
    }
    const ratio = (t - 0.5) / 0.5;
    return interpolateZipColor(zipGradientMidColor, zipGradientEndColor, ratio);
}

function clearZipSolutionStyling(cell) {
    cell.classList.remove('zip-solution-cell', 'zip-solution-start', 'zip-solution-end');
    cell.style.removeProperty('background');
    cell.style.removeProperty('background-color');
}

function interpolateZipColor(colorA, colorB, ratio) {
    const r = Math.round(colorA.r + (colorB.r - colorA.r) * ratio);
    const g = Math.round(colorA.g + (colorB.g - colorA.g) * ratio);
    const b = Math.round(colorA.b + (colorB.b - colorA.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
}

function initializeZipSolver(_gridContainer, _createGridFunc, _handlersObject) {
    zipGridContainer = _gridContainer;

    if (!zipGridSizeSlider || !zipGridSizeLabel || !zipClearButton || !zipSolveButton) {
        console.error("Zip solver DOM elements not found!");
        return;
    }

    // Populate event handlers for main.js/createGrid to use
    if (_handlersObject) {
        _handlersObject.handleCellClick = handleZipCellClick;
        _handlersObject.handleCellContextMenu = handleZipCellContextMenu;
        _handlersObject.getCurrentSize = () => zipCurrentSize;
    }

    zipCurrentSize = parseInt(zipGridSizeSlider.value);
    zipGridSizeLabel.textContent = `${zipCurrentSize}x${zipCurrentSize}`;

    zipGridSizeSlider.addEventListener('input', () => {
        zipCurrentSize = parseInt(zipGridSizeSlider.value);
        zipGridSizeLabel.textContent = `${zipCurrentSize}x${zipCurrentSize}`;
        clearZipSelections();
        _createGridFunc(zipGridContainer, zipCurrentSize, 'zip');
    });

    zipClearButton.addEventListener('click', () => {
        clearZipSelections();
        _createGridFunc(zipGridContainer, zipCurrentSize, 'zip'); 
    });

    zipSolveButton.addEventListener('click', zipSolverButtonClick);
}
