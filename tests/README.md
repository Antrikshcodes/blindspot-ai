# 🧪 Tests — Blindspot AI

> Test suites for the Blindspot AI project.

## Status

🚧 **Under Development** — Testing framework to be decided.

## Test Categories

| Type | Description | Location |
|---|---|---|
| **Unit Tests** | Test individual functions and components in isolation | `tests/unit/` |
| **Integration Tests** | Test interactions between services and modules | `tests/integration/` |
| **End-to-End Tests** | Test complete user workflows through the full stack | `tests/e2e/` |

## Running Tests

```bash
# Testing framework and commands TBD

# Run all tests:
# npm test          (Node.js)
# pytest            (Python)

# Run specific test suite:
# npm test -- --grep "unit"
# pytest tests/unit/
```

## Structure

```
tests/
├── README.md
├── unit/           (to be created)
├── integration/    (to be created)
└── e2e/            (to be created)
```

## Writing Tests

Guidelines for writing tests will be established once the testing framework is selected. Key principles:

- **Descriptive names** — Test names should clearly describe what is being tested
- **Arrange-Act-Assert** — Follow the AAA pattern for test structure
- **Isolation** — Each test should be independent and not rely on other tests
- **Coverage** — Aim for meaningful coverage of critical paths

## Contributing

See the [main CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
