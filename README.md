# Cider Code WH App - Electron Application

## 🚀 Overview

Modern Electron-based application for warehouse management with secure certificate management, printer integration, and real-time order processing.

## ✨ Features

- **🔒 TLS Certificate Management** - Secure HTTPS connections with Let's Encrypt integration
- **🖨️ Printer Integration** - USB and Serial port printer support with ZPL label printing
- **📦 Order Management** - Real-time order processing and tracking
- **🌙 Dark/Light Theme** - Modern UI with theme switching
- **🔧 Development Tools** - Hot reload, testing, and debugging support

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- Windows (primary development platform)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd cider-code-wh-app

# Install dependencies
npm install

# Generate development certificates
npm run certs:generate-dev

# Start development server
npm run dev

# In another terminal, start Electron app
npm run dev:electron
```

## 📜 Available Scripts

### Development
- `npm run dev` - Start Vite development server
- `npm run dev:electron` - Start Electron application
- `npm run dev:all` - Start both Vite and Electron concurrently

### Build & Package
- `npm run build` - Build for production
- `npm run build:beta` - Build beta version
- `npm run build:release` - Build stable release
- `npm run package` - Create Electron package
- `npm run make` - Create distributables

### Certificate Management
- `npm run certs:generate-dev` - Generate development certificates
- `npm run certs:generate-letsencrypt` - Generate Let's Encrypt certificates
- `npm run certs:renew` - Renew existing certificates
- `npm run certs:setup-auto-renewal` - Setup automatic renewal

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:components` - Test React components
- `npm run test:scripts` - Test certificate scripts

### Code Quality
- `npm run lint` - Check code style
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier

## 🏗️ Architecture

### Core Technologies
- **Electron** - Desktop application framework
- **React + TypeScript** - UI framework with type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **Vitest** - Testing framework

### Security Features
- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Content Security Policy
- ✅ Secure certificate management
- ✅ Encrypted storage for sensitive data

## 📁 Project Structure

```
src/
├── main.ts                 # Electron main process
├── preload.ts             # Preload script (IPC bridge)
├── renderer.tsx           # React app entry point
├── components/            # React components
├── config/               # Configuration files
├── hooks/                # Custom React hooks
├── ipc/                  # IPC handlers and bridges
├── services/             # API services
├── store/                # Zustand state management
├── types/                # TypeScript type definitions
└── utils/                # Utility functions

scripts/                  # Build and certificate scripts
docs/                    # Documentation
tests/                   # Test files
```

## 🔐 Certificate Management

The application includes a comprehensive certificate management system:

### Development Mode
- Self-signed certificates for local development
- Automatic certificate generation and renewal
- Hot reload with certificate updates

### Production Mode
- Let's Encrypt integration for domain-based certificates
- Automatic certificate renewal with cron jobs
- Support for custom CA certificates

### Certificate Commands
```bash
# Generate development certificates
npm run certs:generate-dev

# Generate Let's Encrypt certificates (requires domain)
npm run certs:generate-letsencrypt

# Setup automatic renewal
npm run certs:setup-auto-renewal
```

## 🖨️ Printer Integration

### Supported Printers
- USB thermal label printers
- Serial port printers
- ZPL (Zebra Programming Language) support
- Custom label templates

### Configuration
1. Connect your printer via USB or Serial port
2. Configure printer settings in the application
3. Test printing with sample labels
4. Use the application for real order label printing

## 🧪 Testing

The project includes comprehensive testing:
- **Unit tests** for components and utilities
- **Integration tests** for API services
- **Script tests** for certificate management
- **Component tests** with React Testing Library

Run tests:
```bash
npm test                    # All tests
npm run test:components     # React components
npm run test:scripts       # Certificate scripts
npm run test:api           # API services
```

## 🚀 Deployment

### Beta Release
```bash
npm run build:beta
npm run make
```

### Stable Release
```bash
npm run build:release
npm run make
```

### CI/CD
The project is configured for GitHub Actions with:
- Automated testing on push/PR
- Cross-platform builds (Windows, macOS, Linux)
- Automatic version bumping
- Release artifact generation

## 📚 Documentation

- `docs/secure-certificate-setup.md` - Certificate setup guide
- `docs/alternative-certificate-management.md` - Alternative certificate solutions
- `docs/tls-integration-guide.md` - TLS integration details
- `CERTIFICATE_SYSTEM_COMPLETE.md` - Implementation summary

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the documentation in `docs/`
2. Search existing GitHub issues
3. Create a new issue with detailed information

---

**Built with ❤️ using Electron, React, and TypeScript**
