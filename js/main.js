// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-button');
    const solvers = document.querySelectorAll('.game-solver');
    const gridContainers = {
        zip: document.getElementById('zip-grid'),
        tango: document.getElementById('tango-grid'),
        queens: document.getElementById('queens-grid'),
        mini: document.getElementById('mini-grid'),
    };

    // This object will be populated by each solver's initialize function
    // with their specific event handlers.
    const solverEventHandlers = {
        zip: {},
        tango: {},
        queens: {},
        mini: {}
    };

    // --- Generic function to create a grid ---
    function createGrid(container, size, gameName) {
        if (!container) {
            console.error(`Grid container for ${gameName} not found.`);
            return;
        }

        // Special case for Tango which has custom cell sizes
        if (gameName === 'tango') {
            container.innerHTML = ''; // Clear previous grid
            
            // Reset any existing styles
            container.style = '';
            
            // Create all cells for the 11x11 grid
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const cell = document.createElement('div');
                    cell.classList.add('grid-cell');
                    cell.dataset.row = i;
                    cell.dataset.col = j;
                    cell.dataset.game = gameName;

                    // Attach event handlers
                    const handlers = solverEventHandlers[gameName];
                    if (handlers && handlers.handleCellClick) {
                        cell.addEventListener('click', (e) => handlers.handleCellClick(e, cell, i, j));
                    }
                    container.appendChild(cell);
                }
            }
            
            return;
        }

        // Standard grid for other games
        const cellSize = 40; // pixels
        const gapSize = 2;   // pixels
        container.innerHTML = ''; // Clear previous grid
        container.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
        container.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
        container.style.width = `${size * cellSize + (size - 1) * gapSize}px`;
        container.style.height = `${size * cellSize + (size - 1) * gapSize}px`;
        container.style.gap = `${gapSize}px`;
        container.style.display = 'grid'; // Ensure grid display type

        for (let i = 0; i < size * size; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            const row = Math.floor(i / size);
            const col = i % size;
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.game = gameName;

            // Attach event handlers based on the gameName and populated solverEventHandlers
            const handlers = solverEventHandlers[gameName];
            if (handlers) {
                if (handlers.handleCellClick) {
                    cell.addEventListener('click', (e) => handlers.handleCellClick(e, cell, row, col));
                }
                if (handlers.handleCellMouseDown) {
                    cell.addEventListener('mousedown', (e) => handlers.handleCellMouseDown(e, cell, row, col));
                }
                if (handlers.handleCellMouseMove) {
                    cell.addEventListener('mousemove', (e) => handlers.handleCellMouseMove(e, cell, row, col));
                }
                if (handlers.handleCellContextMenu) {
                    cell.addEventListener('contextmenu', (e) => handlers.handleCellContextMenu(e, cell, row, col));
                }
            }
            container.appendChild(cell);
        }

        // Attach grid-level event handlers
        const handlers = solverEventHandlers[gameName];
        if (handlers && container) {
            if (handlers.handleGridMouseUp) {
                container.addEventListener('mouseup', (e) => handlers.handleGridMouseUp(e));
            }
            if (handlers.handleGridMouseLeave) { // Optional: some solvers might need this
                container.addEventListener('mouseleave', (e) => handlers.handleGridMouseLeave(e));
            } else if (handlers.handleGridMouseUp) { // Fallback for Queens: stop drawing if mouse leaves grid
                 if (gameName === 'queens') { // Queens specific mouseleave behavior
                    container.addEventListener('mouseleave', (e) => handlers.handleGridMouseUp(e));
                 }
            }
            if (typeof handlers.onAfterGridCreate === 'function') {
                handlers.onAfterGridCreate(container, size);
            }
        }
    }

    // --- Tab switching logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            solvers.forEach(s => s.classList.remove('active'));

            tab.classList.add('active');
            const targetSolverId = `${tab.dataset.tab}-solver`;
            const activeSolver = document.getElementById(targetSolverId);
            
            if (activeSolver) {
                activeSolver.classList.add('active');
                const gameName = tab.dataset.tab;
                initializeActiveSolverGrid(gameName);
            }
        });
    });

    // --- Initialization Function for Active Solver Grid ---
    function initializeActiveSolverGrid(gameName) {
        const container = gridContainers[gameName];
        if (!container) return;

        // Each solver's initialize function is expected to set its current size
        // and call createGrid itself, or we retrieve the size and call it here.
        // For now, the solver initializers will call createGrid.
        // We just need to ensure the correct one is called.
        // The individual solver initializers should handle creating their first grid.
        // This function is more for re-initializing or ensuring it's drawn if not already.

        // Let's refine: the initializers will set up listeners.
        // The actual first grid creation for the *default active tab* will be triggered here.
        // For other tabs, it will be triggered on tab click.

        if (gameName === 'zip') {
            // Check if zipGridSizeSlider exists to get current size
            const slider = document.getElementById('zip-grid-size-slider');
            if (slider) {
                 // initializeZipSolver should have already been called and set up its own grid.
                 // This call might be redundant if initializeZipSolver already creates the grid.
                 // However, it ensures that if a tab is switched TO, its grid is definitely (re)created.
                 // Let's assume initialize functions *don't* create the grid, main.js does.
                 // Modifying solver initializers to NOT call createGrid directly.
                if (typeof initializeZipSolver === 'function' && solverEventHandlers.zip.getCurrentSize) {
                     createGrid(container, solverEventHandlers.zip.getCurrentSize(), 'zip');
                } else if (typeof zipCurrentSize !== 'undefined') { // Fallback to global if exposed (not ideal)
                     createGrid(container, zipCurrentSize, 'zip');
                }
            }
        } else if (gameName === 'tango') {
            const slider = document.getElementById('tango-grid-size-slider');
            if (slider) {
                if (typeof initializeTangoSolver === 'function' && solverEventHandlers.tango.getCurrentSize) {
                    createGrid(container, solverEventHandlers.tango.getCurrentSize(), 'tango');
                } else if (typeof tangoCurrentSize !== 'undefined') {
                     createGrid(container, tangoCurrentSize, 'tango');
                }
            }
        } else if (gameName === 'queens') {
            const slider = document.getElementById('queens-grid-size-slider');
            if (slider) {
                 if (typeof initializeQueensSolver === 'function' && solverEventHandlers.queens.getCurrentSize) {
                    createGrid(container, solverEventHandlers.queens.getCurrentSize(), 'queens');
                 } else if (typeof queensCurrentSize !== 'undefined') { // Fallback
                    createGrid(container, queensCurrentSize, 'queens');
                 }
            }
        }
    }

    // --- Initialize Solvers ---
    // These functions are defined in their respective solver files (e.g., js/solvers/zipSolver.js)
    // They should populate the solverEventHandlers object and set up their specific controls.
    // We pass createGrid so they can use it, and the relevant grid container.
    if (typeof initializeZipSolver === 'function') {
        initializeZipSolver(gridContainers.zip, createGrid, solverEventHandlers.zip);
    }
    if (typeof initializeTangoSolver === 'function') {
        initializeTangoSolver(gridContainers.tango, createGrid, solverEventHandlers.tango);
    }
    if (typeof initializeQueensSolver === 'function') {
        initializeQueensSolver(gridContainers.queens, createGrid, solverEventHandlers.queens);
    }
    if (typeof initializeMiniSudokuSolver === 'function') {
        initializeMiniSudokuSolver(gridContainers.mini, createGrid, solverEventHandlers.mini);
    }

    // --- Initial setup on DOMContentLoaded ---
    // Activate the first tab by default and create its grid
    if (tabs.length > 0) {
        const firstTab = tabs[0];
        firstTab.classList.add('active');
        const firstSolverId = `${firstTab.dataset.tab}-solver`;
        const firstSolver = document.getElementById(firstSolverId);
        if (firstSolver) {
            firstSolver.classList.add('active');
            const gameName = firstTab.dataset.tab;
            // The solver initializer should now handle its first grid creation.
            // So, calling initializeActiveSolverGrid here might be redundant if initializers do it.
            // Let's adjust solver initializers: they should NOT create the grid.
            // main.js will call createGrid after initialization.

            // After initializers have run and populated handlers & potentially current sizes:
            if (gameName === 'zip' && typeof solverEventHandlers.zip.getCurrentSize === 'function') {
                createGrid(gridContainers.zip, solverEventHandlers.zip.getCurrentSize(), 'zip');
            } else if (gameName === 'tango' && typeof solverEventHandlers.tango.getCurrentSize === 'function') {
                 createGrid(gridContainers.tango, solverEventHandlers.tango.getCurrentSize(), 'tango');
            } else if (gameName === 'queens' && typeof solverEventHandlers.queens.getCurrentSize === 'function') {
                 createGrid(gridContainers.queens, solverEventHandlers.queens.getCurrentSize(), 'queens');
            }
        }
    }
    console.log("Main.js loaded and initialized.");
});

// Note: Individual solver files (zipSolver.js, tangoSolver.js, queensSolver.js)
// will need to be adjusted:
// 1. Their `initializeSolverName` function should accept `(gridContainer, createGridFn, handlersObject)`
// 2. They should populate the `handlersObject` with their specific functions like `handleCellClick`, etc.
// 3. They should add a function to `handlersObject` like `getCurrentSize()` that returns their current grid size.
// 4. They should NOT call `createGrid` themselves directly within their `initializeSolverName` function.
//    `main.js` will handle calling `createGrid` after initialization and on tab switches.
// 5. Their event listeners for controls (slider, clear, solve) should use `createGridFn` when they need to redraw the grid.
