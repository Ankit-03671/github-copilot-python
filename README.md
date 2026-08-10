# Project Overview

Flask-based Sudoku web application.
Developed using Python, HTML, CSS, and JavaScript.
Improved and refactored with GitHub Copilot.
Focuses on better structure, usability, testing, and responsive design.

# Main Features
Sudoku puzzle generation.
Easy, Medium, and Hard difficulty levels.
Unique solvable Sudoku puzzles.
Locked prefilled cells.
Hint functionality.
Check Solution functionality.
Incorrect-cell highlighting.
Game timer.
Congratulations message after completion.
Player name entry.
Top 10 leaderboard.
LocalStorage for saving scores.
Tracks player name, time, difficulty, and hints.
Light Mode and Dark Mode.
Responsive desktop and mobile interface.
Technologies Used
Backend: Python, Flask
Frontend: HTML5, CSS3, JavaScript
Testing: pytest
Storage: Browser LocalStorage
Development Assistant: GitHub Copilot

# Project Structure
starter/app.py – Flask application and routes.
starter/sudoku_logic.py – Sudoku generation and validation.
starter/templates/index.html – Web page structure.
starter/static/main.js – Game interaction and functionality.
starter/static/styles.css – UI styling and responsive design.
starter/tests/ – Automated tests.
instruction.md – Project-specific Copilot instructions.
Screenshots/ – Project evidence and screenshots.

# How to Run
Open the project in VS Code.
Navigate to the starter folder.
Create/activate the Python virtual environment.
Install dependencies using requirements.txt.
Run python app.py.
Open http://127.0.0.1:5000/ in a browser.
Testing
Uses pytest for automated testing.
Tests Sudoku board generation.
Tests Sudoku validation.
Tests puzzle generation.
Tests difficulty functionality.

Run with:

python -m pytest
GitHub Copilot Usage
Used Copilot to assist with code refactoring.
Used Copilot for Sudoku logic improvements.
Used Copilot to set up testing.
Used Copilot for JavaScript functionality.
Used Copilot for responsive CSS.
Used Copilot for leaderboard and LocalStorage functionality.
Copilot suggestions were reviewed before being accepted.
Suggestions that did not meet project requirements were modified or rejected.

# Screenshots
Testing framework setup.
Sudoku unique-solution functionality.
Difficulty levels.
Top 10 leaderboard and LocalStorage.
3×3 grid styling.
Final running application.
Copilot prompt/suggestion evidence.