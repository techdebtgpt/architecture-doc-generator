# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| < 0.3   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an email to the maintainers at [INSERT SECURITY EMAIL]. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

### What to Include

When reporting a vulnerability, please include:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Assessment**: Within 7 days, we will provide an assessment of the vulnerability
- **Resolution**: Security patches will be released as soon as possible, depending on complexity
- **Public Disclosure**: After a patch is released, we will publish a security advisory

## Security Best Practices

When using this tool:

1. **API Keys**: Never commit API keys or secrets to the repository. Use environment variables or configuration files (excluded from git).
2. **Dependencies**: Regularly update dependencies to patch known vulnerabilities.
3. **Input Validation**: Be cautious when analyzing untrusted codebases.
4. **Output Sanitization**: Review generated documentation before publishing, especially if analyzing proprietary code.

## Security Features

This project includes:

- **No External Data Transmission**: All analysis is performed locally unless explicitly configured otherwise
- **Sandboxed Execution**: Code analysis does not execute the analyzed code
- **Token Budget Limits**: Built-in safeguards to prevent excessive API usage
- **Configurable LLM Providers**: Support for self-hosted LLM endpoints for sensitive projects

## Disclosure Policy

We follow responsible disclosure practices:

1. Security issues are fixed privately
2. A patch is released
3. Security advisory is published with credit to reporter (if desired)
4. CVE is requested if applicable

## Contact

For security-related questions or concerns, please contact:

- Email: [INSERT SECURITY EMAIL]
- PGP Key: [INSERT PGP KEY FINGERPRINT IF AVAILABLE]

Thank you for helping keep this project and its users safe!
