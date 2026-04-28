// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-button');
    const solvers = document.querySelectorAll('.game-solver');
    const homePage = document.getElementById('home');
    const solverSelectCards = document.querySelectorAll('.solver-select-card');
    const logoLink = document.querySelector('.logo');
    const gridContainers = {
        zip: document.getElementById('zip-grid'),
        tango: document.getElementById('tango-grid'),
        queens: document.getElementById('queens-grid'),
        patches: document.getElementById('patches-grid'),
        mini: document.getElementById('mini-grid'),
    };

    // This object will be populated by each solver's initialize function
    // with their specific event handlers.
    const solverEventHandlers = {
        zip: {},
        tango: {},
        queens: {},
        patches: {},
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
        const gapSize = 1;   // pixels (matches CSS gap)
        container.innerHTML = ''; // Clear previous grid
        container.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
        container.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
        // Let the grid size itself naturally based on content - don't set explicit width/height
        // This prevents clipping issues with the border
        container.style.width = '';
        container.style.height = '';
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

    function setUrlHash(viewName) {
        const nextHash = `#${viewName}`;
        if (window.location.hash !== nextHash) {
            window.history.pushState(null, '', nextHash);
        }
    }

    function clearActiveSolverTabs() {
        tabs.forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
    }

    function showHome(updateHash = true) {
        if (homePage) {
            homePage.classList.add('active');
        }
        solvers.forEach(solver => solver.classList.remove('active'));
        clearActiveSolverTabs();

        if (updateHash) {
            setUrlHash('home');
        }
    }

    function showSolver(gameName, updateHash = true) {
        const activeSolver = document.getElementById(`${gameName}-solver`);
        const activeTab = Array.from(tabs).find(tab => tab.dataset.tab === gameName);

        if (!activeSolver || !activeTab) {
            showHome(updateHash);
            return;
        }

        if (homePage) {
            homePage.classList.remove('active');
        }
        solvers.forEach(solver => solver.classList.remove('active'));
        clearActiveSolverTabs();

        activeSolver.classList.add('active');
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        initializeActiveSolverGrid(gameName);

        if (updateHash) {
            setUrlHash(gameName);
        }
    }

    function routeFromHash() {
        const requestedView = window.location.hash.replace('#', '');
        if (requestedView && gridContainers[requestedView]) {
            showSolver(requestedView, false);
            return;
        }
        showHome(false);
    }

    // --- View switching logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            showSolver(tab.dataset.tab);
        });
    });

    solverSelectCards.forEach(card => {
        card.addEventListener('click', () => {
            showSolver(card.dataset.tab);
        });
    });

    if (logoLink) {
        logoLink.addEventListener('click', event => {
            event.preventDefault();
            showHome();
        });
    }

    window.addEventListener('popstate', routeFromHash);
    window.addEventListener('hashchange', routeFromHash);

    // --- Initialization Function for Active Solver Grid ---
    function initializeActiveSolverGrid(gameName) {
        const container = gridContainers[gameName];
        const handlers = solverEventHandlers[gameName];
        if (!container || !handlers || typeof handlers.getCurrentSize !== 'function') return;

        if (container.children.length === 0) {
            createGrid(container, handlers.getCurrentSize(), gameName);
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
    if (typeof initializePatchesSolver === 'function') {
        initializePatchesSolver(gridContainers.patches, createGrid, solverEventHandlers.patches);
    }
    if (typeof initializeMiniSudokuSolver === 'function') {
        initializeMiniSudokuSolver(gridContainers.mini, createGrid, solverEventHandlers.mini);
    }

    // --- Initial setup on DOMContentLoaded ---
    routeFromHash();
    console.log("Main.js loaded and initialized.");
});

