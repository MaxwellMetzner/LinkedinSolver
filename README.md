# LinkedinSolver
Solvers for the LinkedIn daily puzzles (Zip, Queens, Tango, Mini Sudoku).

## Pages
- **Zip:** Build a path by ordering points and blocking edges; solver is a pruned backtracking path finder.
- **Tango:** 6x6 sun/moon grid with edge constraints; uses constraint propagation plus backtracking.
- **Queens:** Draw regions on an N x N board; search enforces one queen per region, row, column, and diagonal.
- **Mini Sudoku:** 6x6 grid with number picker and right-click clear; validates row/col/box, then DFS solves.

## Behind the scenes
- Grids are created per tab; each solver wires its own click and context handlers.
- Inputs are validated before search to trim impossible states early.
- Core solving is depth-first backtracking with puzzle-specific domain checks.
- UI highlights distinguish user clues, solver-filled cells, and conflicts to guide fixes fast.

