# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-13

### Added
- Initial release of Astro Shibui Template
- Core configuration system (`src/lib/config.ts`)
- Environment variable template (`.env.example`)
- Multi-language support (Chinese and English)
- Algolia search integration
- Optional podcast functionality (disabled by default)
- Responsive design with cover layout
- Markdown-based content management
- RSS feed generation
- KaTeX math formula support
- Syntax highlighting for code blocks
- Social image generation
- Print-friendly styles

### Changed
- Migrated from personal blog to reusable template
- Removed all analytics tools (Umami, Clarity) for privacy
- Made podcast and search features configurable
- Updated package.json for template distribution
- Added comprehensive documentation

### Removed
- Umami Analytics integration
- Microsoft Clarity integration
- API proxy routes for analytics
- Personal content and images
- Hard-coded site information

### Security
- Removed all tracking scripts
- No third-party analytics by default
- Privacy-first design

## [Unreleased]

### Planned
- Giscus comments integration (optional)
- More theme customization options
- Additional language support
- Enhanced search functionality
EOF
echo "CHANGELOG.md created"