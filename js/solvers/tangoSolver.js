// --- Elements for Tango Solver ---
const tangoClearButton = document.getElementById('tango-clear-button');
const tangoSolveButton = document.getElementById('tango-solve-button');

// Tango uses a fixed 6x6 grid of symbols
const tangoSymbolGridSize = 6;
// But our displayed grid will be 11x11 to include constraint spaces
const tangoDisplayGridSize = 11;
let tangoGridContainer; // Will be passed to initializeTangoSolver

// Track the state of the grid
// Symbol grid (6x6) - stores 'sun', 'moon', or null
const tangoSymbolGrid = Array(tangoSymbolGridSize).fill().map(() => Array(tangoSymbolGridSize).fill(null));
// Constraint grid - horizontal constraints are at (2i,2j+1), vertical at (2i+1,2j)
const tangoConstraintGrid = Array(tangoDisplayGridSize).fill().map(() => Array(tangoDisplayGridSize).fill(null));

function handleTangoCellClick(event, cell, row, col) {
    // Prevent text selection on double click
    event.preventDefault();
    
    // Determine if this is a symbol cell or a constraint cell
    const isSymbolCell = row % 2 === 0 && col % 2 === 0;
    const isHorizontalConstraint = row % 2 === 0 && col % 2 === 1;
    const isVerticalConstraint = row % 2 === 1 && col % 2 === 0;
    
    if (isSymbolCell) {
        // Convert display grid coordinates to symbol grid coordinates
        const symbolRow = row / 2;
        const symbolCol = col / 2;
        cycleSymbol(cell, symbolRow, symbolCol);
    } else if (isHorizontalConstraint || isVerticalConstraint) {
        cycleConstraint(cell, row, col);
    }
    // Ignore clicks on diagonal spaces (odd row, odd col)
}

function cycleSymbol(cell, symbolRow, symbolCol) {
    const currentValue = tangoSymbolGrid[symbolRow][symbolCol];
    
    if (currentValue === null) {
        // Empty -> Sun
        cell.textContent = '☀️';
        cell.classList.add('sun-cell');
        tangoSymbolGrid[symbolRow][symbolCol] = 'sun';
    } else if (currentValue === 'sun') {
        // Sun -> Moon
        cell.textContent = '🌙';
        cell.classList.remove('sun-cell');
        cell.classList.add('moon-cell');
        tangoSymbolGrid[symbolRow][symbolCol] = 'moon';
    } else {
        // Moon -> Empty
        cell.textContent = '';
        cell.classList.remove('moon-cell');
        tangoSymbolGrid[symbolRow][symbolCol] = null;
    }
}

function cycleConstraint(cell, row, col) {
    const currentValue = tangoConstraintGrid[row][col];
    
    if (currentValue === null) {
        // Empty -> Equal
        cell.textContent = '=';
        cell.classList.add('equal-constraint');
        tangoConstraintGrid[row][col] = 'equal';
    } else if (currentValue === 'equal') {
        // Equal -> Opposite
        cell.textContent = '×';
        cell.classList.remove('equal-constraint');
        cell.classList.add('opposite-constraint');
        tangoConstraintGrid[row][col] = 'opposite';
    } else {
        // Opposite -> Empty
        cell.textContent = '';
        cell.classList.remove('opposite-constraint');
        tangoConstraintGrid[row][col] = null;
    }
}

function clearTangoSelections() {
    // Reset symbol grid
    for (let i = 0; i < tangoSymbolGridSize; i++) {
        for (let j = 0; j < tangoSymbolGridSize; j++) {
            tangoSymbolGrid[i][j] = null;
        }
    }
    
    // Reset constraint grid
    for (let i = 0; i < tangoDisplayGridSize; i++) {
        for (let j = 0; j < tangoDisplayGridSize; j++) {
            tangoConstraintGrid[i][j] = null;
        }
    }
    
    // Redraw the grid
    redrawTangoGrid();
}

function redrawTangoGrid() {
    if (!tangoGridContainer) return;
    
    // Clear all cells
    for (let i = 0; i < tangoDisplayGridSize; i++) {
        for (let j = 0; j < tangoDisplayGridSize; j++) {
            const cellIndex = i * tangoDisplayGridSize + j;
            if (cellIndex < tangoGridContainer.children.length) {
                const cell = tangoGridContainer.children[cellIndex];
                
                // Reset all classes and content
                cell.textContent = '';
                cell.className = 'grid-cell';
                
                // Differentiate between symbol cells, constraint cells, and ignored cells
                const isSymbolCell = i % 2 === 0 && j % 2 === 0;
                const isHorizontalConstraint = i % 2 === 0 && j % 2 === 1;
                const isVerticalConstraint = i % 2 === 1 && j % 2 === 0;
                const isDiagonalSpace = i % 2 === 1 && j % 2 === 1;
                
                if (isSymbolCell) {
                    cell.classList.add('symbol-cell');
                    // Convert to symbol grid coordinates
                    const symbolRow = i / 2;
                    const symbolCol = j / 2;
                    
                    // Apply symbol if present
                    if (symbolRow < tangoSymbolGridSize && symbolCol < tangoSymbolGridSize) {
                        const symbol = tangoSymbolGrid[symbolRow][symbolCol];
                        if (symbol === 'sun') {
                            cell.textContent = '☀️';
                            cell.classList.add('sun-cell');
                        } else if (symbol === 'moon') {
                            cell.textContent = '🌙';
                            cell.classList.add('moon-cell');
                        }
                    }
                } else if (isHorizontalConstraint || isVerticalConstraint) {
                    cell.classList.add('constraint-cell');
                    if (isHorizontalConstraint) cell.classList.add('horizontal-constraint');
                    if (isVerticalConstraint) cell.classList.add('vertical-constraint');
                    
                    // Apply constraint if present
                    const constraint = tangoConstraintGrid[i][j];
                    if (constraint === 'equal') {
                        cell.textContent = '=';
                        cell.classList.add('equal-constraint');
                    } else if (constraint === 'opposite') {
                        cell.textContent = '×';
                        cell.classList.add('opposite-constraint');
                    }
                } else if (isDiagonalSpace) {
                    cell.classList.add('diagonal-space');
                    // These spaces are not interactive
                }
            }
        }
    }
}

function initializeTangoSolver(_gridContainer, _createGridFunc, _handlersObject) {
    tangoGridContainer = _gridContainer;

    const localTangoClearButton = document.getElementById('tango-clear-button');
    const localTangoSolveButton = document.getElementById('tango-solve-button');

    if (_handlersObject) {
        _handlersObject.handleCellClick = handleTangoCellClick;
        _handlersObject.getCurrentSize = () => tangoDisplayGridSize;
    }

    if (localTangoClearButton) {
        localTangoClearButton.addEventListener('click', clearTangoSelections);
    }

    if (localTangoSolveButton) {
        localTangoSolveButton.addEventListener('click', () => {
            solveTangoPuzzle();
        });
    }

    // Prevent text selection on double click for the entire grid
    if (tangoGridContainer) {
        tangoGridContainer.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
    }

    // Let the main.js createGrid function create the base grid
    _createGridFunc(tangoGridContainer, tangoDisplayGridSize, 'tango');
    
    // Now add appropriate classes and styles to all cells
    setupTangoGridLayout();
}

function setupTangoGridLayout() {
    if (!tangoGridContainer) return;
    
    // Get all cells and apply appropriate classes based on position
    const cells = tangoGridContainer.querySelectorAll('.grid-cell');
    
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Determine cell type based on position
        const isSymbolCell = row % 2 === 0 && col % 2 === 0;
        const isHorizontalConstraint = row % 2 === 0 && col % 2 === 1;
        const isVerticalConstraint = row % 2 === 1 && col % 2 === 0;
        const isDiagonalSpace = row % 2 === 1 && col % 2 === 1;
        
        if (isSymbolCell) {
            cell.classList.add('symbol-cell');
        } else if (isHorizontalConstraint) {
            cell.classList.add('constraint-cell', 'horizontal-constraint');
        } else if (isVerticalConstraint) {
            cell.classList.add('constraint-cell', 'vertical-constraint');
        } else if (isDiagonalSpace) {
            cell.classList.add('diagonal-space');
        }
    });
    
    // Clear any existing symbols or constraints
    clearTangoSelections();
}

// Helper function to convert between display grid and symbol grid coordinates
function displayToSymbolCoordinates(displayRow, displayCol) {
    if (displayRow % 2 !== 0 || displayCol % 2 !== 0) {
        return null; // Not a symbol cell
    }
    return {
        row: displayRow / 2,
        col: displayCol / 2
    };
}

// Helper function to get adjacent symbol cells for a constraint
function getAdjacentSymbolCells(constraintRow, constraintCol) {
    if (constraintRow % 2 === 0 && constraintCol % 2 === 1) {
        // Horizontal constraint - connects symbols at (row,col/2-0.5) and (row,col/2+0.5)
        const symbolRow = constraintRow / 2;
        const symbolCol1 = Math.floor(constraintCol / 2);
        const symbolCol2 = Math.ceil(constraintCol / 2);
        return [
            { row: symbolRow, col: symbolCol1 },
            { row: symbolRow, col: symbolCol2 }
        ];
    } else if (constraintRow % 2 === 1 && constraintCol % 2 === 0) {
        // Vertical constraint - connects symbols at (row/2-0.5,col) and (row/2+0.5,col)
        const symbolRow1 = Math.floor(constraintRow / 2);
        const symbolRow2 = Math.ceil(constraintRow / 2);
        const symbolCol = constraintCol / 2;
        return [
            { row: symbolRow1, col: symbolCol },
            { row: symbolRow2, col: symbolCol }
        ];
    }
    return null; // Not a constraint cell
}

// Solver implementation
function solveTangoPuzzle() {
    // Check if the current setup is valid before attempting to solve
    if (!isCurrentSetupValid()) {
        alert("The current constraints are contradictory and can't be solved.");
        return;
    }

    console.log("Starting to solve Tango puzzle...");
    
    // Create a copy of the existing grid for solving
    const gridCopy = tangoSymbolGrid.map(row => [...row]);
    
    // Start the solving process with a timeout to prevent browser freezing
    const startTime = performance.now();
    const timeout = 5000; // 5 seconds timeout
    
    try {
        const result = solveBacktrackingWithTimeout(gridCopy, 0, 0, startTime, timeout);
        
        if (result) {
            // Update the grid with the solution
            for (let i = 0; i < tangoSymbolGridSize; i++) {
                for (let j = 0; j < tangoSymbolGridSize; j++) {
                    tangoSymbolGrid[i][j] = gridCopy[i][j];
                }
            }
            redrawTangoGrid();
            console.log("Solution found in", (performance.now() - startTime).toFixed(2), "ms");
            
            // Verify the solution
            if (!validateSolution(gridCopy)) {
                console.error("Solution validation failed!");
                alert("Warning: The solution may contain errors. Please verify.");
            }
        } else {
            alert("No solution found with the current constraints.");
            console.log("No solution found after", (performance.now() - startTime).toFixed(2), "ms");
        }
    } catch (e) {
        if (e === "timeout") {
            alert("Solving took too long. The puzzle might be too complex or have no solution.");
        } else {
            console.error("Error solving puzzle:", e);
            alert("An error occurred while solving the puzzle.");
        }
    }
}

// Helper function to check if the current placement is valid
function isValidPlacement(grid, row, col) {
    const currentValue = grid[row][col];
    
    // Check horizontal constraint (no more than 2 same symbols in a row)
    // Check to the left
    if (col >= 2 && 
        grid[row][col-1] === currentValue && 
        grid[row][col-2] === currentValue) {
        return false;
    }
    
    // Check to the right
    if (col <= tangoSymbolGridSize - 3 && 
        grid[row][col+1] === currentValue && 
        grid[row][col+2] === currentValue) {
        return false;
    }
    
    // Check spanning (current cell is in the middle of three)
    if (col >= 1 && col < tangoSymbolGridSize - 1 && 
        grid[row][col-1] === currentValue && 
        grid[row][col+1] === currentValue) {
        return false;
    }
    
    // Check vertical constraint (no more than 2 same symbols in a column)
    // Check above
    if (row >= 2 && 
        grid[row-1][col] === currentValue && 
        grid[row-2][col] === currentValue) {
        return false;
    }
    
    // Check below
    if (row <= tangoSymbolGridSize - 3 && 
        grid[row+1][col] === currentValue && 
        grid[row+2][col] === currentValue) {
        return false;
    }
    
    // Check spanning (current cell is in the middle of three)
    if (row >= 1 && row < tangoSymbolGridSize - 1 && 
        grid[row-1][col] === currentValue && 
        grid[row+1][col] === currentValue) {
        return false;
    }
    
    // Check constraint cells (horizontal and vertical)
    // Check horizontal constraint to the left
    if (col > 0) {
        const constraintRow = row * 2;
        const constraintCol = col * 2 - 1;
        const constraint = tangoConstraintGrid[constraintRow][constraintCol];
        
        if (constraint && grid[row][col-1] !== null) {
            if (constraint === 'equal' && grid[row][col-1] !== currentValue) {
                return false;
            } else if (constraint === 'opposite' && grid[row][col-1] === currentValue) {
                return false;
            }
        }
    }
    
    // Check horizontal constraint to the right
    if (col < tangoSymbolGridSize - 1) {
        const constraintRow = row * 2;
        const constraintCol = col * 2 + 1;
        const constraint = tangoConstraintGrid[constraintRow][constraintCol];
        
        if (constraint && grid[row][col+1] !== null) {
            if (constraint === 'equal' && grid[row][col+1] !== currentValue) {
                return false;
            } else if (constraint === 'opposite' && grid[row][col+1] === currentValue) {
                return false;
            }
        }
    }
    
    // Check vertical constraint above
    if (row > 0) {
        const constraintRow = row * 2 - 1;
        const constraintCol = col * 2;
        const constraint = tangoConstraintGrid[constraintRow][constraintCol];
        
        if (constraint && grid[row-1][col] !== null) {
            if (constraint === 'equal' && grid[row-1][col] !== currentValue) {
                return false;
            } else if (constraint === 'opposite' && grid[row-1][col] === currentValue) {
                return false;
            }
        }
    }
    
    // Check vertical constraint below
    if (row < tangoSymbolGridSize - 1) {
        const constraintRow = row * 2 + 1;
        const constraintCol = col * 2;
        const constraint = tangoConstraintGrid[constraintRow][constraintCol];
        
        if (constraint && grid[row+1][col] !== null) {
            if (constraint === 'equal' && grid[row+1][col] !== currentValue) {
                return false;
            } else if (constraint === 'opposite' && grid[row+1][col] === currentValue) {
                return false;
            }
        }
    }
    
    // Check row and column balance (no more than half of each symbol)
    let rowSuns = 0, rowMoons = 0;
    for (let j = 0; j < tangoSymbolGridSize; j++) {
        if (grid[row][j] === 'sun') rowSuns++;
        else if (grid[row][j] === 'moon') rowMoons++;
    }
    if (rowSuns > tangoSymbolGridSize/2 || rowMoons > tangoSymbolGridSize/2) {
        return false;
    }
    
    let colSuns = 0, colMoons = 0;
    for (let i = 0; i < tangoSymbolGridSize; i++) {
        if (grid[i][col] === 'sun') colSuns++;
        else if (grid[i][col] === 'moon') colMoons++;
    }
    if (colSuns > tangoSymbolGridSize/2 || colMoons > tangoSymbolGridSize/2) {
        return false;
    }
    
    return true;
}

// Also update the isCurrentSetupValid function to check for the same patterns
function isCurrentSetupValid() {
    // Check all constraints for contradictions
    for (let i = 0; i < tangoDisplayGridSize; i++) {
        for (let j = 0; j < tangoDisplayGridSize; j++) {
            const constraint = tangoConstraintGrid[i][j];
            if (constraint) {
                const adjacent = getAdjacentSymbolCells(i, j);
                if (adjacent) {
                    const cell1 = tangoSymbolGrid[adjacent[0].row][adjacent[0].col];
                    const cell2 = tangoSymbolGrid[adjacent[1].row][adjacent[1].col];
                    
                    // If both cells have symbols, check if they satisfy the constraint
                    if (cell1 !== null && cell2 !== null) {
                        if (constraint === 'equal' && cell1 !== cell2) {
                            return false;
                        }
                        if (constraint === 'opposite' && cell1 === cell2) {
                            return false;
                        }
                    }
                }
            }
        }
    }
    
    // Check for more than 2 consecutive same symbols
    for (let i = 0; i < tangoSymbolGridSize; i++) {
        for (let j = 0; j < tangoSymbolGridSize; j++) {
            if (tangoSymbolGrid[i][j] !== null) {
                const currentValue = tangoSymbolGrid[i][j];
                
                // Check horizontally to the right
                if (j <= tangoSymbolGridSize - 3 && 
                    tangoSymbolGrid[i][j+1] === currentValue && 
                    tangoSymbolGrid[i][j+2] === currentValue) {
                    return false;
                }
                
                // Check vertically downward
                if (i <= tangoSymbolGridSize - 3 && 
                    tangoSymbolGrid[i+1][j] === currentValue && 
                    tangoSymbolGrid[i+2][j] === currentValue) {
                    return false;
                }
            }
        }
    }
    
    // Check for row and column balance
    for (let i = 0; i < tangoSymbolGridSize; i++) {
        let rowSuns = 0, rowMoons = 0, colSuns = 0, colMoons = 0;
        
        for (let j = 0; j < tangoSymbolGridSize; j++) {
            // Check row
            if (tangoSymbolGrid[i][j] === 'sun') rowSuns++;
            else if (tangoSymbolGrid[i][j] === 'moon') rowMoons++;
            
            // Check column
            if (tangoSymbolGrid[j][i] === 'sun') colSuns++;
            else if (tangoSymbolGrid[j][i] === 'moon') colMoons++;
        }
        
        if (rowSuns > tangoSymbolGridSize/2 || rowMoons > tangoSymbolGridSize/2) {
            return false;
        }
        
        if (colSuns > tangoSymbolGridSize/2 || colMoons > tangoSymbolGridSize/2) {
            return false;
        }
    }
    
    return true;
}

// Backtracking solver
function solveBacktracking(grid, row, col) {
    // If we've filled the entire grid, we've found a solution
    if (row >= tangoSymbolGridSize) {
        return true;
    }
    
    // Move to the next cell (next column or next row)
    let nextRow = row;
    let nextCol = col + 1;
    if (nextCol >= tangoSymbolGridSize) {
        nextRow = row + 1;
        nextCol = 0;
    }
    
    // If this cell already has a value, just move to the next one
    if (grid[row][col] !== null) {
        return solveBacktracking(grid, nextRow, nextCol);
    }
    
    // Try placing a sun and then a moon
    for (const symbol of ['sun', 'moon']) {
        grid[row][col] = symbol;
        
        // Only continue if the placement is valid
        if (isValidPlacement(grid, row, col)) {
            if (solveBacktracking(grid, nextRow, nextCol)) {
                return true;
            }
        }
    }
    
    // If neither worked, backtrack
    grid[row][col] = null;
    return false;
}

// Add timeout to backtracking to prevent browser freezing
function solveBacktrackingWithTimeout(grid, row, col, startTime, timeout) {
    // Check timeout
    if (performance.now() - startTime > timeout) {
        throw "timeout";
    }
    
    // If we've filled the entire grid, we've found a solution
    if (row >= tangoSymbolGridSize) {
        return validateSolution(grid);
    }
    
    // Move to the next cell (next column or next row)
    let nextRow = row;
    let nextCol = col + 1;
    if (nextCol >= tangoSymbolGridSize) {
        nextRow = row + 1;
        nextCol = 0;
    }
    
    // If this cell already has a value, just move to the next one
    if (grid[row][col] !== null) {
        return solveBacktrackingWithTimeout(grid, nextRow, nextCol, startTime, timeout);
    }
    
    // Try placing a sun and then a moon
    for (const symbol of ['sun', 'moon']) {
        grid[row][col] = symbol;
        
        // Only continue if the placement is valid
        if (isValidPlacement(grid, row, col)) {
            if (solveBacktrackingWithTimeout(grid, nextRow, nextCol, startTime, timeout)) {
                return true;
            }
        }
    }
    
    // If neither worked, backtrack
    grid[row][col] = null;
    return false;
}

// Add a final validation function to make absolutely sure the solution is correct
function validateSolution(grid) {
    // Check that every cell has a value
    for (let i = 0; i < tangoSymbolGridSize; i++) {
        for (let j = 0; j < tangoSymbolGridSize; j++) {
            if (grid[i][j] === null) {
                console.error(`Cell at ${i},${j} is empty`);
                return false;
            }
        }
    }
    
    // Check all rows for no more than 2 consecutive same symbols
    for (let i = 0; i < tangoSymbolGridSize; i++) {
        for (let j = 0; j < tangoSymbolGridSize - 2; j++) {
            if (grid[i][j] === grid[i][j+1] && grid[i][j] === grid[i][j+2]) {
                console.error(`Row ${i} has 3 consecutive ${grid[i][j]}`);
                return false;
            }
        }
    }
    
    // Check all columns for no more than 2 consecutive same symbols
    for (let j = 0; j < tangoSymbolGridSize; j++) {
        for (let i = 0; i < tangoSymbolGridSize - 2; i++) {
            if (grid[i][j] === grid[i+1][j] && grid[i][j] === grid[i+2][j]) {
                console.error(`Column ${j} has 3 consecutive ${grid[i][j]}`);
                return false;
            }
        }
    }
    
    // Check for equal number of suns and moons in each row
    for (let i = 0; i < tangoSymbolGridSize; i++) {
        let suns = 0, moons = 0;
        for (let j = 0; j < tangoSymbolGridSize; j++) {
            if (grid[i][j] === 'sun') suns++;
            else if (grid[i][j] === 'moon') moons++;
        }
        
        if (suns !== moons) {
            console.error(`Row ${i} has ${suns} suns and ${moons} moons`);
            return false;
        }
    }
    
    // Check for equal number of suns and moons in each column
    for (let j = 0; j < tangoSymbolGridSize; j++) {
        let suns = 0, moons = 0;
        for (let i = 0; i < tangoSymbolGridSize; i++) {
            if (grid[i][j] === 'sun') suns++;
            else if (grid[i][j] === 'moon') moons++;
        }
        
        if (suns !== moons) {
            console.error(`Column ${j} has ${suns} suns and ${moons} moons`);
            return false;
        }
    }
    
    // Check constraint cells
    for (let i = 0; i < tangoDisplayGridSize; i++) {
        for (let j = 0; j < tangoDisplayGridSize; j++) {
            const constraint = tangoConstraintGrid[i][j];
            if (constraint) {
                const adjacent = getAdjacentSymbolCells(i, j);
                if (adjacent) {
                    const cell1 = grid[adjacent[0].row][adjacent[0].col];
                    const cell2 = grid[adjacent[1].row][adjacent[1].col];
                    
                    if (constraint === 'equal' && cell1 !== cell2) {
                        console.error(`Constraint violation: Equal constraint at ${i},${j} between ${cell1} and ${cell2}`);
                        return false;
                    }
                    if (constraint === 'opposite' && cell1 === cell2) {
                        console.error(`Constraint violation: Opposite constraint at ${i},${j} between ${cell1} and ${cell2}`);
                        return false;
                    }
                }
            }
        }
    }
    
    return true;
}
