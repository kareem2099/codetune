 Contributing to CodeTune

Thank you for your interest in contributing to CodeTune! 🕌 We welcome contributions from developers of all backgrounds who share our vision of enhancing the coding experience with Islamic spirituality.

 🙏 Islamic Guidelines

As an Islamic-focused extension, we maintain the highest standards of authenticity and respect:

- Content Authenticity: All Islamic content must be sourced from authenticated religious authorities
- Cultural Respect: Contributions should reflect Islamic principles and values
- Inclusive Design: Ensure features work for Muslims worldwide, respecting diverse practices

 🚀 How to Contribute

 1. Fork & Setup
```bash
 Fork the repository on GitHub
 Clone your fork
git clone https://github.com/kareem2099/codetune.git
cd codetune

 Install dependencies
npm install

 Compile and test
npm run compile
npm test
```

 2. Development Workflow
```bash
 Create a feature branch
git checkout -b feature/your-feature-name

 Make your changes
 Follow our coding standards and Islamic guidelines

 Test thoroughly
npm run compile
npm test

 Commit with clear messages
git commit -m "Add: Brief description of Islamic enhancement"

 Push and create pull request
git push origin feature/your-feature-name
```

 3. Pull Request Process
- Clear Title: Describe the Islamic/spiritual value added
- Detailed Description: Explain the spiritual benefit and technical implementation
- Testing: Include tests for audio, UI, and Islamic content features
- Documentation: Update README and CHANGELOG if needed

 🎯 Contribution Areas

 🕌 Islamic Content & Features
- Authentic Content: Verified Adia, Hadis, Quranic wisdom additions
- Prayer Features: Enhanced prayer time calculations and notifications
- Dhikr Integration: New Islamic remembrance phrases and counters
- Cultural Features: Ramadan, Friday, and Islamic holiday support

 🎵 Audio & Quran Features
- Reciter Additions: New authenticated Islamic reciters
- Audio Quality: Enhanced streaming and playback features
- Quran Reader: Auto-reading improvements and new display modes
- Audio Controls: Better volume, speed, and navigation controls

 🌍 Localization & Accessibility
- New Languages: Arabic dialects, additional Islamic languages
- RTL Support: Proper right-to-left text rendering
- Accessibility: Screen reader support and keyboard navigation
- Cultural Adaptation: Region-specific Islamic content

 🎨 UI/UX Enhancements
- Islamic Design: Beautiful, culturally appropriate interfaces
- Responsive Design: Mobile and tablet compatibility
- Theme Integration: VS Code theme compatibility
- Animation: Smooth, respectful Islamic-themed animations

 🛠️ Technical Improvements
- Performance: Faster loading and better resource usage
- Security: Secure handling of Islamic content and user data
- Testing: Comprehensive test coverage for all features
- Documentation: Clear setup and usage instructions

 📋 Code Standards

 TypeScript/JavaScript
```typescript
// Good: Clear Islamic context
interface IslamicReminder {
  content: string;
  source: 'quran' | 'hadis' | 'authenticated';
  timing?: PrayerTime;
}

// Avoid: Generic naming
interface Reminder {
  text: string;
  type: string;
}
```

 Islamic Content Guidelines
- Source Attribution: Always credit Islamic sources (Quran chapter/verse, Hadis collection)
- Authenticity: Use only verified Islamic content from recognized authorities
- Respect: Handle sacred text with appropriate care and presentation
- Cultural Sensitivity: Consider diverse Islamic practices and interpretations

 Testing Requirements
```bash
 Run all tests
npm test

 Test specific components
npm run test:audio
npm run test:ui
npm run test:islamic
```

 🔧 Development Setup

 Prerequisites
- Node.js: 16+ (LTS recommended)
- VS Code: 1.74+ with extension development support
- Git: Latest version for version control

 Environment Setup
```bash
 Install development dependencies
npm install

 Set up VS Code for development
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension ms-vscode.vscode-eslint
```

 Testing Your Changes
```bash
 Compile TypeScript
npm run compile

 Run linting
npm run lint

 Execute tests
npm test

 Package for testing
npm run package
```

 📖 Documentation Standards

 README Updates
- Update feature descriptions with Islamic context
- Include screenshots of new Islamic features
- Document configuration options clearly

 CHANGELOG Entries
```markdown
 🕌 Islamic Feature Enhancement
- Spiritual Benefit: Brief description of Islamic value added
- Technical Implementation: How the feature works
- User Impact: How it enhances the Islamic coding experience
```

 🤝 Community Guidelines

 Communication
- Respectful Dialogue: Maintain Islamic principles in all discussions
- Constructive Feedback: Focus on improvement and spiritual enhancement
- Inclusive Language: Welcome contributors from all backgrounds

 Issue Reporting
- Bug Reports: Include VS Code version, OS, and steps to reproduce
- Feature Requests: Describe the Islamic/spiritual benefit clearly
- Security Issues: Report privately to maintainers

 Code Reviews
- Islamic Authenticity: Reviewers verify content authenticity
- Code Quality: Ensure maintainable, well-tested code
- Documentation: Confirm all changes are properly documented

 📜 License & Attribution

By contributing to CodeTune, you agree to:
- MIT License: All contributions licensed under MIT
- Islamic Attribution: Proper crediting of Islamic sources
- Community Standards: Maintaining respectful, inclusive environment

 🙏 Recognition

Contributors will be recognized in:
- CHANGELOG.md: Feature contributions with Islamic context
- README.md: Major contributors section
- GitHub Contributors: Automatic recognition through GitHub

 📞 Getting Help

- Issues: GitHub Issues for bugs and feature requests
- Discussions: GitHub Discussions for questions and ideas
- Documentation: Comprehensive README and inline code comments

---

*"And cooperate in righteousness and piety, but do not cooperate in sin and aggression."*
Surah Al-Ma'idah, Verse 2

Thank you for contributing to CodeTune and helping create a spiritually enriching coding environment! 🕌✨
