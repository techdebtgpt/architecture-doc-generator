# Contributing to Architecture Doc Generator

First off, thank you for considering contributing! We welcome any help, from bug reports and feature requests to code contributions and documentation improvements. Every contribution is appreciated.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Git**
- An API key from **Anthropic, OpenAI, or Google** for LLM access.

### Setup

1.  **Fork & Clone**:

    ```bash
    git clone https://github.com/YOUR_USERNAME/architecture-doc-generator.git
    cd architecture-doc-generator
    ```

2.  **Install Dependencies**:

    ```bash
    npm install
    ```

3.  **Configure**: Create a `.archdoc.config.json` file in the root directory and add your API keys. You can start by copying the example:

    ```bash
    node dist/cli/index.js config --init
    ```

    Then, edit the newly created `.archdoc.config.json` to add your keys.

4.  **Build & Test**:
    ```bash
    npm run build
    npm test
    ```

## 🛠️ Development Workflow

1.  **Create a Branch**: Name your branch using prefixes like `feature/`, `fix/`, or `docs/`.

    ```bash
    git checkout -b feature/my-awesome-feature
    ```

2.  **Make Changes**: Write your code, following the project's style guidelines.

3.  **Test Your Changes**:

    ```bash
    npm run lint:fix   # Fix linting issues
    npm test           # Run all unit tests
    ```

4.  **Commit Your Work**: Use [Conventional Commits](https://www.conventionalcommits.org/) for clear and descriptive commit messages.

    ```bash
    git commit -m "feat: add new security analysis agent"
    ```

5.  **Create a Pull Request**: Push your branch to your fork and open a pull request against the `main` branch. Provide a clear description of your changes.

## 🧬 Creating a Custom Agent

Agents are the core of the analysis process. Here’s how to create one:

1.  **Create the Agent File**: Create a new file in `src/agents/my-new-agent.ts`.
2.  **Implement the `Agent` Interface**: Your class must implement the `Agent` interface from `src/agents/agent.interface.ts`.
3.  **Define Metadata**: The `getMetadata()` method should describe your agent's name, purpose, and priority.
4.  **Implement `execute()`**: This is where your agent's logic goes. Use **LangChain Expression Language (LCEL)** to build your analysis chain for better tracing and composability.
5.  **Register the Agent**: Add your new agent to the `AgentRegistry` in `src/agents/agent-registry.ts`.
6.  **Add Tests**: Create a corresponding test file in `tests/agents/`. Mock the LLM service to avoid making real API calls in tests.

> **Key Tip**: For unified tracing in LangSmith, **do not** use `.withConfig()` on the main `RunnableSequence`. Instead, pass the `runnableConfig` from `options` directly into the `.invoke()` call.

## 🎨 Code Style & Conventions

- **Language**: TypeScript with `strict` mode enabled.
- **Formatting**: We use Prettier. Run `npm run format` to format your code.
- **Linting**: We use ESLint. Run `npm run lint` to check for issues.
- **Naming**:
  - `PascalCase` for classes and types (`MyAgent`).
  - `camelCase` for functions and variables (`myFunction`).
  - `kebab-case` for filenames (`my-agent.ts`).
- **Comments**: Use JSDoc for all public-facing APIs.

## ✅ Pull Request Process

1.  **Ensure Checks Pass**: Before submitting, make sure your code lints, tests pass, and your branch is up-to-date with `main`.
2.  **Use the PR Template**: Fill out the pull request template with details about your changes.
3.  **Engage in Review**: Respond to feedback from maintainers. We appreciate your collaboration!

## 🔗 Resources

- **🌐 Website**: [techdebtgpt.com](https://techdebtgpt.com)
- **📦 GitHub**: [github.com/techdebtgpt/architecture-doc-generator](https://github.com/techdebtgpt/architecture-doc-generator)
- **💬 Discussions**: [GitHub Discussions](https://github.com/techdebtgpt/architecture-doc-generator/discussions)
- **🐛 Issues**: [Report Issues](https://github.com/techdebtgpt/architecture-doc-generator/issues)

---

**Thank you for your contribution!**

**Made with ❤️ by [TechDebtGPT](https://techdebtgpt.com)**
