## Description

<!-- Provide a clear and concise description of your changes -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring
- [ ] Agent development/improvement
- [ ] Test coverage improvement

## Related Issues

<!-- Link to related issues using #issue_number -->

Closes #
Related to #

## Motivation and Context

<!-- Why is this change required? What problem does it solve? -->

## How Has This Been Tested?

<!-- Describe the tests you ran to verify your changes -->

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Tested on sample projects

**Test Configuration:**

- Node.js version:
- OS:
- LLM Provider used:

## Screenshots/Examples

<!-- If applicable, add screenshots or example outputs -->

**Before:**

```
<!-- Example before the change -->
```

**After:**

```
<!-- Example after the change -->
```

## Checklist

<!-- Mark completed items with an "x" -->

- [ ] My code follows the project's code style (ran `npm run lint:fix`)
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Agent-Specific Checklist

<!-- If you're adding or modifying an agent, complete this section -->

- [ ] Agent implements all required abstract methods
- [ ] Agent has proper error handling with debug logging
- [ ] Agent uses dynamic response length guidance
- [ ] Agent generates files via `generateFiles()` method
- [ ] Agent has proper LangSmith trace naming
- [ ] Agent has appropriate token budget estimates
- [ ] Agent metadata is properly configured

## Performance Impact

<!-- Describe any performance implications of your changes -->

- Token usage impact: [None / Minimal / Moderate / Significant]
- Execution time impact: [None / <10% / 10-30% / >30%]
- Memory usage impact: [None / Minimal / Moderate / Significant]

## Breaking Changes

<!-- If this is a breaking change, describe the migration path -->

**What breaks:**

**Migration guide:**

## Additional Notes

<!-- Add any additional information that reviewers should know -->

## Reviewer Notes

<!-- Area for reviewers to add comments during review -->
