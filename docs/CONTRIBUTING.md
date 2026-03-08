
# Contributing to LeafWise

Thank you for your interest in contributing to LeafWise! Whether it's bug reports, feature suggestions, or code contributions, your help is appreciated.

## How to Contribute

*   **Reporting Bugs**: If you find a bug, please open an issue on the project's GitHub repository (if available) with detailed steps to reproduce, expected behavior, and actual behavior.
*   **Suggesting Enhancements**: For feature requests or enhancements, please open an issue detailing your suggestion and its potential benefits.
*   **Pull Requests**:
    1.  Fork the repository.
    2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name` or `bugfix/issue-description`).
    3.  Make your changes.
    4.  Ensure your code adheres to the project's coding style and guidelines.
    5.  Commit your changes (`git commit -am 'Add some feature'`).
    6.  Push to the branch (`git push origin feature/your-feature-name`).
    7.  Open a Pull Request.

## Development Setup

Please refer to the main `README.md` for instructions on setting up the development environment.

### AI Flows Development

AI flows run on a Lambda function (defined in `amplify/functions/ai-flows/`). For local development:

1. Set `NEXT_PUBLIC_AI_API_URL=http://localhost:4100` in `.env.local`.
2. Run `npm run ai:dev` to start the local AI dev server (port 4100).
3. Run `npm run dev` in a separate terminal for the Next.js frontend.

The local dev server mirrors the Lambda handler API without JWT validation.

## Coding Style

*   Follow existing coding patterns.
*   Ensure code is clear, concise, and well-commented where necessary.
*   Before committing, run `npm run lint` and `npm run typecheck` to ensure code style and type safety.

Thank you for helping make LeafWise better!
