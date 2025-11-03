# Support

## 🆘 Getting Help

Thank you for using ArchDoc Generator! We're here to help you get the most out of the tool.

## 📚 Documentation

Before asking for help, please check our comprehensive documentation:

- **[User Guide](./docs/USER_GUIDE.md)** - Complete usage instructions and examples
- **[Configuration Guide](./docs/CONFIGURATION_GUIDE.md)** - Detailed configuration options
- **[API Documentation](./docs/API.md)** - Programmatic usage
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - How the tool works internally
- **[FAQ](./docs/USER_GUIDE.md#-faqs)** - Frequently asked questions

## 💬 Community Support

### GitHub Discussions

The best place to ask questions and discuss ideas:

- **[Q&A](https://github.com/techdebtgpt/architecture-doc-generator/discussions/categories/q-a)** - Ask questions
- **[Show and Tell](https://github.com/techdebtgpt/architecture-doc-generator/discussions/categories/show-and-tell)** - Share your documentation
- **[Ideas](https://github.com/techdebtgpt/architecture-doc-generator/discussions/categories/ideas)** - Suggest features

### Issue Tracker

For bugs and feature requests:

- **[Bug Reports](https://github.com/techdebtgpt/architecture-doc-generator/issues/new?template=bug_report.md)** - Report issues
- **[Feature Requests](https://github.com/techdebtgpt/architecture-doc-generator/issues/new?template=feature_request.md)** - Suggest improvements
- **[Search Existing Issues](https://github.com/techdebtgpt/architecture-doc-generator/issues)** - Check if your issue already exists

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Environment Details**:
   - OS (Windows/macOS/Linux version)
   - Node.js version (`node --version`)
   - Package version (`npm list @techdebtgpt/archdoc-generator`)
   - LLM provider (Anthropic/OpenAI/Google Gemini)

2. **Steps to Reproduce**:
   - Exact command you ran
   - Configuration file (sanitize API keys!)
   - Project size and languages

3. **Expected vs Actual Behavior**:
   - What you expected to happen
   - What actually happened

4. **Logs and Output**:
   - Run with `--verbose` flag
   - Include relevant error messages
   - Screenshots if applicable

## 🔒 Security Issues

**DO NOT** report security vulnerabilities through public issues!

Please follow our [Security Policy](./SECURITY.md) and email security concerns to the maintainers privately.

## 💡 Common Issues

### Installation Problems

**Problem**: `npm install` fails

```bash
# Solution: Use Node.js 18+ and clear cache
node --version  # Must be 18.0.0 or higher
npm cache clean --force
npm install
```

### Configuration Issues

**Problem**: "API key not found" error

```bash
# Solution: Initialize configuration
npx archdoc config --init
# Then edit .archdoc.config.json with your API key
```

### Analysis Failures

**Problem**: Agent fails with JSON parsing error

```bash
# Solution: Use retry logic (now built-in) or try again
# The system automatically retries with stricter prompts
```

**Problem**: "Token budget exceeded"

```bash
# Solution: Use quick mode or configure lower budget
npx archdoc analyze /path/to/project --depth quick
```

### Output Issues

**Problem**: Missing navigation in generated docs

```bash
# Solution: Already fixed in v0.3.19+
npm update @techdebtgpt/archdoc-generator
```

**Problem**: Mermaid diagrams not rendering

```bash
# Solution: View in VS Code with "Markdown Preview Mermaid Support" extension
# Or view on GitHub/GitLab (automatic rendering)
# Or copy to https://mermaid.live
```

## 🚀 Feature Requests

We love hearing your ideas! Before submitting a feature request:

1. **Search existing issues** - Your idea might already be discussed
2. **Provide use cases** - Explain why this feature would be valuable
3. **Consider alternatives** - Are there workarounds currently available?
4. **Be specific** - Clear requirements help us implement better features

## 🤝 Contributing

Want to contribute code or documentation?

- See [Contributing Guide](./docs/CONTRIBUTING.md) for development setup
- Read [Code of Conduct](./CODE_OF_CONDUCT.md) for community guidelines
- Check [Good First Issues](https://github.com/techdebtgpt/architecture-doc-generator/labels/good%20first%20issue) for starter tasks

## 📧 Contact

For other inquiries:

- **Website**: [techdebtgpt.com](https://techdebtgpt.com)
- **Twitter**: [@techdebtgpt](https://twitter.com/techdebtgpt) (if available)
- **Email**: [Contact form on website](https://techdebtgpt.com/contact)

## ⏰ Response Times

- **Community Support** (GitHub Discussions/Issues): Usually within 24-48 hours
- **Security Issues**: Acknowledged within 48 hours
- **Pull Requests**: Initial review within 1 week

We're a small team, so please be patient! Community members often help each other faster than we can respond.

## 🙏 Thank You

Thank you for using ArchDoc Generator! Your feedback helps us improve the tool for everyone.

---

**Remember**: Be kind, be respectful, and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) in all interactions.
