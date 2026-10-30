# Security Policy

## Supported Versions

The following versions of Blindspot AI are currently supported with security updates:

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

> [!NOTE]
> As the project is in active early development, the latest version on the `main` branch is always the supported version.

---

## Reporting a Vulnerability

We take the security of Blindspot AI seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**⚠️ Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report vulnerabilities privately via email:

📧 **[antrikshcodes@gmail.com](mailto:antrikshcodes@gmail.com)**

### What to Include

When reporting a vulnerability, please provide as much detail as possible:

- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** and severity assessment
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### What to Expect

| Step | Timeline |
|---|---|
| Acknowledgment of your report | Within **48 hours** |
| Initial assessment and triage | Within **5 business days** |
| Status update on the fix | Within **10 business days** |
| Security patch release | As soon as a fix is verified |

We will keep you informed throughout the process and credit you for the discovery (unless you prefer to remain anonymous).

---

## Security Best Practices for Contributors

All contributors must follow these security practices to protect the project and its users:

### 🔐 Never Commit Secrets

- **Do NOT commit** `.env` files, API keys, tokens, passwords, or any credentials.
- Always use `.env.example` files with placeholder values for documentation.
- Verify your commits with `git diff --staged` before pushing.

### 🛡️ Environment Variables

- Store all sensitive configuration in environment variables.
- Use `.env` files locally — they are included in `.gitignore` and must never be tracked.
- If you accidentally commit a secret, **rotate it immediately** and notify the maintainers.

### 📦 Dependencies

- Keep dependencies up-to-date to avoid known vulnerabilities.
- Use lock files (`package-lock.json`, `requirements.txt`) for deterministic builds.
- Review dependency changes in pull requests carefully.
- Run `npm audit` or `pip audit` regularly to check for known vulnerabilities.

### 🔍 Code Security

- Validate and sanitize all user inputs.
- Use parameterized queries to prevent SQL injection.
- Implement proper authentication and authorization checks.
- Avoid logging sensitive information.
- Follow the principle of least privilege.

### 🌐 API Security

- Use HTTPS for all external communications.
- Implement rate limiting on API endpoints.
- Validate and sanitize all API inputs and outputs.
- Use proper CORS configuration.

---

## Security Checks in CI

Our CI pipeline includes automated security checks:

- **Secret scanning**: The pipeline fails if `.env` files are detected in the repository.
- **Dependency auditing**: Known vulnerabilities in dependencies are flagged during CI runs.

---

## Disclosure Policy

- We follow a **coordinated disclosure** process.
- Security issues will be addressed before any public disclosure.
- Credit will be given to reporters in the release notes (with consent).

---

Thank you for helping keep **Blindspot AI** and its users safe. 🙏
