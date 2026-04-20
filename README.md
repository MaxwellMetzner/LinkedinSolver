# LinkedinSolver

LinkedinSolver is a lightweight browser app for solving LinkedIn's daily puzzle games: Zip, Tango, Queens, Patches, and Mini Sudoku. Enter the board state from the game, run the solver, and use the result to check your progress or finish the puzzle faster.

The project is a static site built with plain HTML, CSS, and JavaScript, so it runs entirely in the browser with no backend or build step.

## Included solvers

- **Zip:** Build a path by ordering points and blocking edges; solved with pruned backtracking.
- **Tango:** Fill the 6x6 sun/moon grid under adjacency and edge constraints using propagation plus backtracking.
- **Queens:** Paint regions on an N x N board and solve under row, column, region, and diagonal queen rules.
- **Patches:** Place source tiles with rectangle types and optional areas, then fill the board with non-overlapping rectangles that satisfy each clue.
- **Mini Sudoku:** Enter a 6x6 puzzle, validate row/column/box rules, and solve with depth-first search.

## How to use

- Open the app in a browser.
- Select the puzzle tab you want.
- Enter the clues or board layout from LinkedIn.
- Click **Solve** to generate a solution, or **Clear** to reset the board.

## Behind the scenes

- Each puzzle has its own interactive grid and input handlers.
- Inputs are validated before search to reject impossible states early.
- The solvers use backtracking, with puzzle-specific constraints to reduce the search space.
- The UI highlights clues, solver-filled cells, and invalid states to make corrections easier.
