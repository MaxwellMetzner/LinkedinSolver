const PATCHES_DEFAULT_SIZE = 6;
const PATCHES_MIN_SIZE = 4;
const PATCHES_MAX_SIZE = 10;
const PATCHES_MAX_ITERATIONS = 250000;
const PATCHES_MAX_SOLVE_TIME_MS = 4000;

const PATCHES_SHAPES = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
    SQUARE: 'square',
    FREE: 'free'
};

const PATCHES_SHAPE_LABELS = {
    [PATCHES_SHAPES.HORIZONTAL]: 'Horizontal',
    [PATCHES_SHAPES.VERTICAL]: 'Vertical',
    [PATCHES_SHAPES.SQUARE]: 'Square',
    [PATCHES_SHAPES.FREE]: 'Free'
};

let patchesGridContainer;
let patchesCreateGridFunc;
let patchesGridSizeSlider;
let patchesGridSizeLabel;
let patchesAreaInput;
let patchesRemoveButton;
let patchesRemoveButtonGroup;
let patchesShapeButtons = [];

const PATCHES_STATE = {
    currentSize: PATCHES_DEFAULT_SIZE,
    selectedCell: null,
    selectedShape: null,
    sources: new Map(),
    solution: null,
    lastSolveStats: null
};

function getPatchesCellKey(row, col) {
    return `${row}-${col}`;
}

function getPatchesCell(row, col) {
    if (!patchesGridContainer) return null;
    return patchesGridContainer.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function getSortedPatchesSources() {
    return Array.from(PATCHES_STATE.sources.values()).sort((sourceA, sourceB) => {
        if (sourceA.row !== sourceB.row) {
            return sourceA.row - sourceB.row;
        }
        return sourceA.col - sourceB.col;
    });
}

function getPatchesAreaValue(source) {
    return Number.isInteger(source.area) && source.area > 0 ? source.area : 0;
}

function getPatchesAreaInputValue(source) {
    const area = getPatchesAreaValue(source);
    return area > 0 ? String(area) : '';
}

function getPatchesAreaSummary(source) {
    const area = getPatchesAreaValue(source);
    return area > 0 ? `area ${area}` : 'no number';
}

function setPatchesStatus(message, tone = 'info') {
    if (tone === 'error') {
        window.alert(message);
        return;
    }

    if (tone === 'success') {
        console.info(message);
    }
}

function clearPatchesSolution() {
    PATCHES_STATE.solution = null;
    PATCHES_STATE.lastSolveStats = null;
}

function selectPatchesCell(row, col) {
    PATCHES_STATE.selectedCell = { row, col };

    const source = PATCHES_STATE.sources.get(getPatchesCellKey(row, col));
    if (source) {
        patchesAreaInput.value = getPatchesAreaInputValue(source);
        setSelectedPatchesShape(source.type);
    } else {
        patchesAreaInput.value = '';
        setSelectedPatchesShape(null);
    }

    updatePatchesInspector();
    renderPatchesGrid();
}

function setSelectedPatchesShape(shape) {
    PATCHES_STATE.selectedShape = shape;
    patchesShapeButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.shape === shape);
        button.setAttribute('aria-pressed', button.dataset.shape === shape ? 'true' : 'false');
    });
}

function getSelectedPatchesSource() {
    if (!PATCHES_STATE.selectedCell) return null;
    return PATCHES_STATE.sources.get(getPatchesCellKey(PATCHES_STATE.selectedCell.row, PATCHES_STATE.selectedCell.col)) || null;
}

function updatePatchesInspector() {
    const selectedSource = getSelectedPatchesSource();

    if (!PATCHES_STATE.selectedCell) {
        if (patchesRemoveButtonGroup) {
            patchesRemoveButtonGroup.hidden = true;
        }
        patchesRemoveButton.disabled = true;
        patchesAreaInput.value = '';
        setSelectedPatchesShape(null);
        return;
    }

    if (selectedSource) {
        if (patchesRemoveButtonGroup) {
            patchesRemoveButtonGroup.hidden = false;
        }
        patchesRemoveButton.disabled = false;
    } else {
        if (patchesRemoveButtonGroup) {
            patchesRemoveButtonGroup.hidden = true;
        }
        patchesRemoveButton.disabled = true;
    }
}

function handlePatchesCellClick(event, _cell, row, col) {
    event.preventDefault();
    selectPatchesCell(row, col);
}

function handlePatchesCellContextMenu(event, _cell, row, col) {
    event.preventDefault();

    const sourceKey = getPatchesCellKey(row, col);
    if (!PATCHES_STATE.sources.has(sourceKey)) {
        selectPatchesCell(row, col);
        return;
    }

    PATCHES_STATE.sources.delete(sourceKey);
    clearPatchesSolution();
    setPatchesStatus(`Removed source at row ${row + 1}, col ${col + 1}.`, 'info');
    selectPatchesCell(row, col);
}

function buildPatchesSourceForSelection(row, col, shape) {
    const rawValue = patchesAreaInput.value.trim();
    let area = 0;

    if (rawValue !== '') {
        area = Number.parseInt(rawValue, 10);
    }

    if (!Number.isInteger(area) || area < 0 || area > PATCHES_STATE.currentSize * PATCHES_STATE.currentSize) {
        return {
            ok: false,
            message: `Area must be blank or an integer from 0 to ${PATCHES_STATE.currentSize * PATCHES_STATE.currentSize}.`
        };
    }

    if (!shape) {
        return {
            ok: false,
            message: 'Choose a region type for the selected tile.'
        };
    }

    return {
        ok: true,
        source: {
            row,
            col,
            area,
            type: shape
        }
    };
}

function commitPatchesSelection(shapeOverride = PATCHES_STATE.selectedShape) {
    if (!PATCHES_STATE.selectedCell) {
        return false;
    }

    const { row, col } = PATCHES_STATE.selectedCell;
    const sourceCreation = buildPatchesSourceForSelection(row, col, shapeOverride);
    if (!sourceCreation.ok) {
        setPatchesStatus(sourceCreation.message, 'error');
        return false;
    }

    const nextSource = sourceCreation.source;
    const nextSources = new Map(PATCHES_STATE.sources);
    nextSources.set(getPatchesCellKey(row, col), nextSource);

    const candidates = generatePatchesCandidatesForSource(nextSource, nextSources, PATCHES_STATE.currentSize);
    if (candidates.length === 0) {
        setPatchesStatus('That source has no legal rectangle placements on the current board.', 'error');
        return false;
    }

    PATCHES_STATE.selectedShape = nextSource.type;
    PATCHES_STATE.sources = nextSources;
    clearPatchesSolution();
    updatePatchesInspector();
    renderPatchesGrid();
    return true;
}

function removeSelectedPatchesSource() {
    if (!PATCHES_STATE.selectedCell) {
        setPatchesStatus('Select a source to remove it.', 'error');
        return;
    }

    const sourceKey = getPatchesCellKey(PATCHES_STATE.selectedCell.row, PATCHES_STATE.selectedCell.col);
    if (!PATCHES_STATE.sources.has(sourceKey)) {
        setPatchesStatus('The selected cell is not currently a source.', 'error');
        return;
    }

    PATCHES_STATE.sources.delete(sourceKey);
    clearPatchesSolution();
    patchesAreaInput.value = '';
    setSelectedPatchesShape(null);
    updatePatchesInspector();
    renderPatchesGrid();
}

function clearAllPatchesSources() {
    PATCHES_STATE.sources = new Map();
    PATCHES_STATE.selectedCell = null;
    clearPatchesSolution();
    updatePatchesInspector();
    renderPatchesGrid();
}

function handlePatchesGridResize() {
    PATCHES_STATE.currentSize = Number.parseInt(patchesGridSizeSlider.value, 10);
    patchesGridSizeLabel.textContent = `${PATCHES_STATE.currentSize}×${PATCHES_STATE.currentSize}`;
    patchesAreaInput.max = String(PATCHES_STATE.currentSize * PATCHES_STATE.currentSize);
    PATCHES_STATE.selectedCell = null;
    PATCHES_STATE.sources = new Map();
    clearPatchesSolution();
    patchesCreateGridFunc(patchesGridContainer, PATCHES_STATE.currentSize, 'patches');
    updatePatchesInspector();
}

function isAllowedPatchesDimension(width, height, shape) {
    if (shape === PATCHES_SHAPES.HORIZONTAL) {
        return width > height;
    }
    if (shape === PATCHES_SHAPES.VERTICAL) {
        return height > width;
    }
    if (shape === PATCHES_SHAPES.SQUARE) {
        return width === height;
    }
    return true;
}

function rectangleContainsForeignSource(top, left, bottom, right, sourceKey, sources) {
    for (const [otherKey, otherSource] of sources.entries()) {
        if (otherKey === sourceKey) continue;
        if (
            otherSource.row >= top &&
            otherSource.row <= bottom &&
            otherSource.col >= left &&
            otherSource.col <= right
        ) {
            return true;
        }
    }

    return false;
}

function generatePatchesCandidatesForSource(source, sources, size) {
    const sourceKey = getPatchesCellKey(source.row, source.col);
    const candidates = [];

    for (let top = 0; top <= source.row; top++) {
        for (let bottom = source.row; bottom < size; bottom++) {
            const height = bottom - top + 1;

            for (let left = 0; left <= source.col; left++) {
                for (let right = source.col; right < size; right++) {
                    const width = right - left + 1;
                    const area = width * height;

                    if (!isAllowedPatchesDimension(width, height, source.type)) {
                        continue;
                    }

                    if (getPatchesAreaValue(source) > 0 && area !== getPatchesAreaValue(source)) {
                        continue;
                    }

                    if (rectangleContainsForeignSource(top, left, bottom, right, sourceKey, sources)) {
                        continue;
                    }

                    const candidateKey = `${top}:${left}:${bottom}:${right}`;
                    const cells = [];
                    for (let row = top; row <= bottom; row++) {
                        for (let col = left; col <= right; col++) {
                            cells.push(getPatchesCellKey(row, col));
                        }
                    }

                    candidates.push({
                        id: `${sourceKey}:${candidateKey}`,
                        sourceKey,
                        top,
                        left,
                        bottom,
                        right,
                        width,
                        height,
                        area,
                        cells
                    });
                }
            }
        }
    }

    return candidates;
}

function candidateOverlapsOccupied(candidate, occupiedCells) {
    for (const cellKey of candidate.cells) {
        if (occupiedCells.has(cellKey)) {
            return true;
        }
    }
    return false;
}

function buildPatchesSolverContext() {
    const size = PATCHES_STATE.currentSize;
    const cellKeys = [];
    const candidatesBySource = new Map();
    const candidatesByCell = new Map();
    const sources = PATCHES_STATE.sources;
    let candidateCount = 0;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cellKey = getPatchesCellKey(row, col);
            cellKeys.push(cellKey);
            candidatesByCell.set(cellKey, []);
        }
    }

    for (const source of getSortedPatchesSources()) {
        const sourceKey = getPatchesCellKey(source.row, source.col);
        const candidates = generatePatchesCandidatesForSource(source, sources, size);
        candidatesBySource.set(sourceKey, candidates);
        candidateCount += candidates.length;

        for (const candidate of candidates) {
            for (const cellKey of candidate.cells) {
                candidatesByCell.get(cellKey).push(candidate);
            }
        }
    }

    return {
        size,
        sources,
        cellKeys,
        candidatesBySource,
        candidatesByCell,
        candidateCount,
        iterations: 0,
        startTime: performance.now(),
        timedOut: false
    };
}

function assignPatchesCandidate(candidate, assignedCandidates, occupiedCells, remainingSourceKeys) {
    if (assignedCandidates.has(candidate.sourceKey)) {
        return assignedCandidates.get(candidate.sourceKey).id === candidate.id;
    }

    if (candidateOverlapsOccupied(candidate, occupiedCells)) {
        return false;
    }

    assignedCandidates.set(candidate.sourceKey, candidate);
    remainingSourceKeys.delete(candidate.sourceKey);
    candidate.cells.forEach(cellKey => occupiedCells.add(cellKey));
    return true;
}

function buildSourceOptions(context, remainingSourceKeys, occupiedCells) {
    const sourceOptions = new Map();
    const activeCandidateIds = new Set();

    for (const sourceKey of remainingSourceKeys) {
        const candidates = context.candidatesBySource.get(sourceKey) || [];
        const options = candidates.filter(candidate => !candidateOverlapsOccupied(candidate, occupiedCells));
        if (options.length === 0) {
            return null;
        }

        sourceOptions.set(sourceKey, options);
        options.forEach(candidate => activeCandidateIds.add(candidate.id));
    }

    return { sourceOptions, activeCandidateIds };
}

function buildCellOptions(context, occupiedCells, activeCandidateIds) {
    const cellOptions = new Map();

    for (const cellKey of context.cellKeys) {
        if (occupiedCells.has(cellKey)) {
            continue;
        }

        const options = (context.candidatesByCell.get(cellKey) || []).filter(candidate => activeCandidateIds.has(candidate.id));
        if (options.length === 0) {
            return null;
        }

        cellOptions.set(cellKey, options);
    }

    return cellOptions;
}

function propagatePatchesState(context, state) {
    const assignedCandidates = new Map(state.assignedCandidates);
    const occupiedCells = new Set(state.occupiedCells);
    const remainingSourceKeys = new Set(state.remainingSourceKeys);

    while (true) {
        const sourceOptionBuild = buildSourceOptions(context, remainingSourceKeys, occupiedCells);
        if (!sourceOptionBuild) {
            return null;
        }

        const { sourceOptions, activeCandidateIds } = sourceOptionBuild;
        const cellOptions = buildCellOptions(context, occupiedCells, activeCandidateIds);
        if (!cellOptions) {
            return null;
        }

        const forcedCandidates = new Map();

        for (const options of sourceOptions.values()) {
            if (options.length === 1) {
                forcedCandidates.set(options[0].id, options[0]);
            }
        }

        for (const options of cellOptions.values()) {
            if (options.length === 1) {
                forcedCandidates.set(options[0].id, options[0]);
            }
        }

        if (forcedCandidates.size === 0) {
            return {
                assignedCandidates,
                occupiedCells,
                remainingSourceKeys,
                sourceOptions,
                cellOptions
            };
        }

        for (const candidate of forcedCandidates.values()) {
            if (!assignPatchesCandidate(candidate, assignedCandidates, occupiedCells, remainingSourceKeys)) {
                return null;
            }
        }
    }
}

function choosePatchesBranchTarget(reducedState) {
    let bestSource = null;
    let bestSourceOptions = null;

    for (const [sourceKey, options] of reducedState.sourceOptions.entries()) {
        if (options.length <= 1) continue;
        if (!bestSourceOptions || options.length < bestSourceOptions.length) {
            bestSource = sourceKey;
            bestSourceOptions = options;
        }
    }

    let bestCell = null;
    let bestCellOptions = null;

    for (const [cellKey, options] of reducedState.cellOptions.entries()) {
        if (options.length <= 1) continue;
        if (!bestCellOptions || options.length < bestCellOptions.length) {
            bestCell = cellKey;
            bestCellOptions = options;
        }
    }

    if (bestCellOptions && (!bestSourceOptions || bestCellOptions.length < bestSourceOptions.length)) {
        return {
            type: 'cell',
            key: bestCell,
            options: bestCellOptions
        };
    }

    if (bestSourceOptions) {
        return {
            type: 'source',
            key: bestSource,
            options: bestSourceOptions
        };
    }

    return null;
}

function clonePatchesStateForBranch(reducedState) {
    return {
        assignedCandidates: new Map(reducedState.assignedCandidates),
        occupiedCells: new Set(reducedState.occupiedCells),
        remainingSourceKeys: new Set(reducedState.remainingSourceKeys)
    };
}

function solvePatchesRecursive(context, state) {
    context.iterations += 1;
    if (context.iterations > PATCHES_MAX_ITERATIONS || performance.now() - context.startTime > PATCHES_MAX_SOLVE_TIME_MS) {
        context.timedOut = true;
        return null;
    }

    const reducedState = propagatePatchesState(context, state);
    if (!reducedState) {
        return null;
    }

    if (reducedState.remainingSourceKeys.size === 0) {
        if (reducedState.occupiedCells.size === context.cellKeys.length) {
            return reducedState.assignedCandidates;
        }
        return null;
    }

    const branchTarget = choosePatchesBranchTarget(reducedState);
    if (!branchTarget) {
        return null;
    }

    const sortedOptions = [...branchTarget.options].sort((candidateA, candidateB) => {
        if (candidateA.top !== candidateB.top) {
            return candidateA.top - candidateB.top;
        }
        if (candidateA.left !== candidateB.left) {
            return candidateA.left - candidateB.left;
        }
        if (candidateA.width !== candidateB.width) {
            return candidateA.width - candidateB.width;
        }
        return candidateA.height - candidateB.height;
    });

    for (const candidate of sortedOptions) {
        const nextState = clonePatchesStateForBranch(reducedState);
        if (!assignPatchesCandidate(candidate, nextState.assignedCandidates, nextState.occupiedCells, nextState.remainingSourceKeys)) {
            continue;
        }

        const result = solvePatchesRecursive(context, nextState);
        if (result) {
            return result;
        }
    }

    return null;
}

function generatePatchesPalette(count) {
    const palette = [];

    for (let index = 0; index < count; index++) {
        const hue = Math.round((index / Math.max(count, 1)) * 360);
        palette.push({
            fill: `hsl(${hue}, 75%, 82%)`,
            border: `hsl(${hue}, 55%, 42%)`,
            stroke: `hsl(${hue}, 60%, 34%)`
        });
    }

    return palette;
}

function buildPatchesSolution(assignedCandidates, context) {
    const placements = Array.from(assignedCandidates.values()).sort((candidateA, candidateB) => {
        const sourceA = context.sources.get(candidateA.sourceKey);
        const sourceB = context.sources.get(candidateB.sourceKey);

        if (sourceA.row !== sourceB.row) {
            return sourceA.row - sourceB.row;
        }
        return sourceA.col - sourceB.col;
    });

    const palette = generatePatchesPalette(placements.length);
    const placementByCell = new Map();

    const decoratedPlacements = placements.map((candidate, index) => {
        const source = context.sources.get(candidate.sourceKey);
        const color = palette[index];
        const placement = {
            ...candidate,
            source,
            color
        };

        candidate.cells.forEach(cellKey => placementByCell.set(cellKey, placement));
        return placement;
    });

    return {
        placements: decoratedPlacements,
        placementByCell,
        candidateCount: context.candidateCount,
        elapsedMs: performance.now() - context.startTime,
        iterations: context.iterations
    };
}

function solvePatchesPuzzle() {
    if (PATCHES_STATE.sources.size === 0) {
        setPatchesStatus('Add at least one source before solving.', 'error');
        return;
    }

    const sortedSources = getSortedPatchesSources();
    const boardArea = PATCHES_STATE.currentSize * PATCHES_STATE.currentSize;
    const knownArea = sortedSources.reduce((sum, source) => sum + getPatchesAreaValue(source), 0);
    const unnumberedSources = sortedSources.filter(source => getPatchesAreaValue(source) === 0).length;

    if (knownArea > boardArea) {
        setPatchesStatus(`Numbered source area totals ${knownArea}, but the board only has ${boardArea} cells.`, 'error');
        return;
    }

    if (knownArea + unnumberedSources > boardArea) {
        setPatchesStatus(
            `The current clues require at least ${knownArea + unnumberedSources} cells, but the board only has ${boardArea}.`,
            'error'
        );
        return;
    }

    if (unnumberedSources === 0 && knownArea !== boardArea) {
        setPatchesStatus(`Total source area is ${knownArea}, but the board needs ${boardArea} cells covered.`, 'error');
        return;
    }

    const context = buildPatchesSolverContext();
    for (const source of sortedSources) {
        const sourceKey = getPatchesCellKey(source.row, source.col);
        const candidates = context.candidatesBySource.get(sourceKey) || [];
        if (candidates.length === 0) {
            setPatchesStatus(`Source at row ${source.row + 1}, col ${source.col + 1} has no valid rectangle placements.`, 'error');
            return;
        }
    }

    const startingState = {
        assignedCandidates: new Map(),
        occupiedCells: new Set(),
        remainingSourceKeys: new Set(context.candidatesBySource.keys())
    };

    const assignedCandidates = solvePatchesRecursive(context, startingState);
    if (!assignedCandidates) {
        if (context.timedOut) {
            setPatchesStatus('Solver timed out before finding a solution. Try simplifying the board or checking the clues.', 'error');
            return;
        }

        setPatchesStatus('No valid tiling fits the current sources.', 'error');
        return;
    }

    PATCHES_STATE.solution = buildPatchesSolution(assignedCandidates, context);
    PATCHES_STATE.lastSolveStats = {
        iterations: PATCHES_STATE.solution.iterations,
        elapsedMs: PATCHES_STATE.solution.elapsedMs,
        candidateCount: PATCHES_STATE.solution.candidateCount
    };

    renderPatchesGrid();

    const elapsedSeconds = (PATCHES_STATE.solution.elapsedMs / 1000).toFixed(2);
    setPatchesStatus(`Solved in ${elapsedSeconds}s after ${PATCHES_STATE.solution.iterations} iterations across ${PATCHES_STATE.solution.candidateCount} candidate rectangles.`, 'success');
}

function createPatchesSourceMarker(source, variant = 'grid') {
    const area = getPatchesAreaValue(source);
    const marker = document.createElement('span');
    marker.className = `patches-source-marker patches-source-marker-${source.type} patches-source-marker-${variant}`;

    if (area > 0) {
        marker.textContent = String(area);
    } else {
        marker.classList.add('is-empty');
        marker.setAttribute('aria-label', `${PATCHES_SHAPE_LABELS[source.type]} source with no number`);
    }

    return marker;
}

function createPatchesCellContent(cell, source, placement) {
    cell.innerHTML = '';

    const content = document.createElement('div');
    content.className = 'patches-cell-content';

    if (source) {
        content.appendChild(createPatchesSourceMarker(source, 'grid'));
    }

    if (!source && placement) {
        const ghost = document.createElement('span');
        ghost.className = 'patches-cell-ghost';
        ghost.textContent = '';
        content.appendChild(ghost);
    }

    cell.appendChild(content);
}

function renderPatchesGrid() {
    if (!patchesGridContainer) return;

    const selectedKey = PATCHES_STATE.selectedCell
        ? getPatchesCellKey(PATCHES_STATE.selectedCell.row, PATCHES_STATE.selectedCell.col)
        : null;

    for (let row = 0; row < PATCHES_STATE.currentSize; row++) {
        for (let col = 0; col < PATCHES_STATE.currentSize; col++) {
            const cell = getPatchesCell(row, col);
            if (!cell) continue;

            const cellKey = getPatchesCellKey(row, col);
            const source = PATCHES_STATE.sources.get(cellKey) || null;
            const placement = PATCHES_STATE.solution ? PATCHES_STATE.solution.placementByCell.get(cellKey) : null;

            cell.classList.remove(
                'patches-selected-cell',
                'patches-source-cell',
                'patches-solved-cell',
                'patches-source-solved-cell'
            );

            cell.style.backgroundColor = '';
            cell.style.boxShadow = '';
            cell.style.color = '';

            if (placement) {
                cell.classList.add('patches-solved-cell');
                cell.style.backgroundColor = placement.color.fill;
                cell.style.boxShadow = `inset 0 0 0 1px ${placement.color.border}`;
                cell.style.color = '#1f2937';
            }

            if (source) {
                cell.classList.add('patches-source-cell');
                if (placement) {
                    cell.classList.add('patches-source-solved-cell');
                }
            }

            if (selectedKey === cellKey) {
                cell.classList.add('patches-selected-cell');
            }

            createPatchesCellContent(cell, source, placement);
        }
    }
}

function initializePatchesSolver(gridContainer, createGridFunc, handlersObject) {
    patchesGridContainer = gridContainer;
    patchesCreateGridFunc = createGridFunc;

    patchesGridSizeSlider = document.getElementById('patches-grid-size-slider');
    patchesGridSizeLabel = document.getElementById('patches-grid-size-label');
    patchesAreaInput = document.getElementById('patches-area-input');
    patchesRemoveButton = document.getElementById('patches-remove-source-button');
    patchesRemoveButtonGroup = document.getElementById('patches-remove-button-group');
    patchesShapeButtons = Array.from(document.querySelectorAll('.patches-shape-button'));

    PATCHES_STATE.currentSize = Number.parseInt(patchesGridSizeSlider.value, 10) || PATCHES_DEFAULT_SIZE;
    patchesGridSizeLabel.textContent = `${PATCHES_STATE.currentSize}×${PATCHES_STATE.currentSize}`;
    patchesAreaInput.min = '0';
    patchesAreaInput.max = String(PATCHES_STATE.currentSize * PATCHES_STATE.currentSize);

    if (handlersObject) {
        handlersObject.handleCellClick = handlePatchesCellClick;
        handlersObject.handleCellContextMenu = handlePatchesCellContextMenu;
        handlersObject.getCurrentSize = () => PATCHES_STATE.currentSize;
        handlersObject.onAfterGridCreate = () => {
            renderPatchesGrid();
        };
    }

    patchesShapeButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!PATCHES_STATE.selectedCell) {
                setPatchesStatus('Select a tile before choosing a region type.', 'error');
                return;
            }

            setSelectedPatchesShape(button.dataset.shape);
            commitPatchesSelection(button.dataset.shape);
        });
    });

    patchesGridSizeSlider.addEventListener('input', handlePatchesGridResize);
    patchesRemoveButton.addEventListener('click', removeSelectedPatchesSource);
    document.getElementById('patches-clear-button').addEventListener('click', clearAllPatchesSources);
    document.getElementById('patches-solve-button').addEventListener('click', solvePatchesPuzzle);
    patchesAreaInput.addEventListener('change', () => {
        if (!PATCHES_STATE.selectedCell || !PATCHES_STATE.selectedShape) {
            return;
        }

        commitPatchesSelection();
    });
    patchesAreaInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (PATCHES_STATE.selectedCell && PATCHES_STATE.selectedShape) {
                commitPatchesSelection();
            }
        }
    });

    setSelectedPatchesShape(PATCHES_STATE.selectedShape);
    updatePatchesInspector();
    createGridFunc(patchesGridContainer, PATCHES_STATE.currentSize, 'patches');

    if (PATCHES_STATE.currentSize < PATCHES_MIN_SIZE || PATCHES_STATE.currentSize > PATCHES_MAX_SIZE) {
        PATCHES_STATE.currentSize = PATCHES_DEFAULT_SIZE;
    }
}