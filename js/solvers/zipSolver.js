// --- Elements for Zip Solver ---
const zipGridSizeSlider = document.getElementById('zip-grid-size-slider');
const zipGridSizeLabel = document.getElementById('zip-grid-size-label');
const zipClearButton = document.getElementById('zip-clear-button');
const zipSolveButton = document.getElementById('zip-solve-button');

let zipSelectedPoints = [];
let zipCurrentSize = 6; // Default, will be updated
let zipSolutionPath = []; // To store the found solution path for Zip
let zipBlocks = []; // To store blocks between cells

// CSS for block indicators
const blockStyleElement = document.createElement('style');
blockStyleElement.textContent = `
.block-indicator {
    position: absolute;
    background-color: #444;
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
    zipSolutionPath.forEach((p, index) => {
        const cellElement = container.querySelector(`[data-row="${p.r}"][data-col="${p.c}"]`);
        if (cellElement) {
            cellElement.classList.add('solved-path');
            cellElement.classList.remove('user-selected'); 
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
    const allCells = zipGridContainer.querySelectorAll('.grid-cell.solved-path');
    allCells.forEach(cell => {
        cell.classList.remove('solved-path');
        if (!cell.classList.contains('user-selected')) {
            cell.textContent = '';
        }
    });
}

let zipSolverIterations = 0;
const MAX_SOLVER_ITERATIONS = 5000000; // Limit iterations to prevent browser freezing

// Check if a move from (row, col) to (newRow, newCol) is blocked by a barrier
function isBlockedMove(row, col, newRow, newCol) {
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
}

// Check if the current path could potentially cover all remaining cells
function canCompleteFullPath(gridSize, visited, row, col) {
    // Quick check: If we've already visited all cells, we're good
    const totalCells = gridSize * gridSize;
    const visitedCount = visited.flat().filter(v => v).length;
    
    if (visitedCount === totalCells) return true;
    
    // For performance, we don't do complex connectivity checks
    // We'll just rely on the backtracking to discover if it's possible
    return true;
}

// Main solver function
function solveZipPuzzle() {
    const gridSize = zipCurrentSize;
    const visited = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
    zipSolutionPath = [];
    zipSolverIterations = 0;
    
    // Sort points by order before solving
    prepareSelectedPoints();
    
    if (zipSelectedPoints.length === 0) {
        alert("Please select at least one starting point for the Zip puzzle.");
        return false;
    }
    
    const startPoint = zipSelectedPoints[0];
    
    // Start the recursive solving process from the first selected point
    const found = solveZipRecursive(startPoint.row, startPoint.col, 1, 0, gridSize, visited);
    
    return found;
}

// Recursive backtracking function for finding a solution
function solveZipRecursive(row, col, pathLength, currentTargetIdx, gridSize, visited) {
    zipSolverIterations++;
    if (zipSolverIterations >= MAX_SOLVER_ITERATIONS) {
        return false; // Prevent browser from hanging on very complex puzzles
    }
    
    // Add current position to path
    zipSolutionPath.push({ r: row, c: col });
    visited[row][col] = true;
    
    let nextTargetIdx = currentTargetIdx;
    
    // Check if we're at a required point and update the target index
    if (currentTargetIdx < zipSelectedPoints.length && 
        row === zipSelectedPoints[currentTargetIdx].row && 
        col === zipSelectedPoints[currentTargetIdx].col) {
        nextTargetIdx++;
    } else if (zipSelectedPoints.some(p => p.row === row && p.col === col && 
              p.order - 1 !== currentTargetIdx)) {
        // We hit a required point out of order - invalid path
        visited[row][col] = false;
        zipSolutionPath.pop();
        return false;
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
    
    // Quick check if we can possibly complete a full path from here
    if (!canCompleteFullPath(gridSize, visited, row, col)) {
        visited[row][col] = false;
        zipSolutionPath.pop();
        return false;
    }
    
    // Define the four possible directions (up, down, left, right)
    const moves = [
        { dr: -1, dc: 0 }, // Up
        { dr: 1, dc: 0 },  // Down
        { dr: 0, dc: -1 }, // Left
        { dr: 0, dc: 1 }   // Right
    ];
    
    // If we have a next target, prioritize moves toward it
    if (nextTargetIdx < zipSelectedPoints.length) {
        const targetRow = zipSelectedPoints[nextTargetIdx].row;
        const targetCol = zipSelectedPoints[nextTargetIdx].col;
        
        moves.sort((a, b) => {
            const distA = Math.abs(row + a.dr - targetRow) + Math.abs(col + a.dc - targetCol);
            const distB = Math.abs(row + b.dr - targetRow) + Math.abs(col + b.dc - targetCol);
            return distA - distB;
        });
    }
    
    // Try each possible direction
    for (const move of moves) {
        const newRow = row + move.dr;
        const newCol = col + move.dc;
        
        // Check if the move is valid:
        // 1. Within grid bounds
        // 2. Cell not already visited
        // 3. Move not blocked by a barrier
        if (newRow >= 0 && newRow < gridSize && 
            newCol >= 0 && newCol < gridSize && 
            !visited[newRow][newCol] && 
            !isBlockedMove(row, col, newRow, newCol)) {
            
            // Recursively try this path
            if (solveZipRecursive(newRow, newCol, pathLength + 1, nextTargetIdx, gridSize, visited)) {
                return true; // Solution found
            }
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
    
    // Clear previous solution display
    const allCells = zipGridContainer.querySelectorAll('.grid-cell');
    allCells.forEach(cell => {
        cell.classList.remove('solved-path');
        if (!cell.classList.contains('user-selected')) {
            cell.textContent = '';
        } else {
            const point = zipSelectedPoints.find(p => 
                parseInt(p.element.dataset.row) === parseInt(cell.dataset.row) && 
                parseInt(p.element.dataset.col) === parseInt(cell.dataset.col)
            );
            if (point) {
                cell.textContent = point.order;
            }
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
        if (zipSolverIterations >= MAX_SOLVER_ITERATIONS) {
            alert(`Solver timed out after ${timeTaken} seconds. The puzzle may be too complex or unsolvable.`);
        } else {
            alert(`No solution found after ${timeTaken} seconds. This puzzle configuration has no valid solution.`);
        }
    }
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
