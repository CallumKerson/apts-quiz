# Adult Playfulness Trait Scale (APTS) Quiz

An interactive web-based implementation of the Adult Playfulness Trait Scale (APTS) assessment tool built with modern web technologies.

## Features

- 🎈 **19-question assessment** measuring adult playfulness across five dimensions
- 📱 **Mobile-responsive design** with intuitive paginated interface
- 📊 **Interactive visualizations** including pentagon radar chart
- ⚡ **Fast and modern** - built with Vite for optimal performance
- 🔒 **Privacy-focused** - completely client-side, no data storage
- 🎨 **Beautiful UI** - styled with Tailwind CSS

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone repository
git clone https://github.com/CallumKerson/apts-quiz.git
cd apts-quiz

# Install dependencies
npm install

# Start development server with hot reloading
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev          # Start dev server at http://localhost:8000
npm run preview      # Preview production build

# Building
npm run build        # Build for production to dist/
npm run clean        # Clean build directory

# Quality Assurance
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code with ESLint
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Project Structure

```
src/
├── index.html          # Main HTML template
├── static/
│   ├── styles.css      # Custom styles
│   └── quiz.js         # Quiz logic and interactions
└── data/
    └── questions.yaml  # Quiz questions and configuration

tests/
└── vite-build.test.js  # Test suite

vite.config.js          # Vite configuration with YAML data plugin
```

### Technology Stack

- **[Vite](https://vite.dev/)** - Modern build tool with fast HMR
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Chart.js](https://www.chartjs.org/)** - Interactive charts and graphs
- **[js-yaml](https://github.com/nodeca/js-yaml)** - YAML data processing
- **[Jest](https://jestjs.io/)** - JavaScript testing framework
- **[ESLint](https://eslint.org/) + [Prettier](https://prettier.io/)** - Code quality tools

### Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
```

Tests validate:

- YAML data structure integrity
- Scoring calculation logic
- Question assignment consistency
- End-to-end quiz flow simulation

### Deployment

The project automatically deploys to GitHub Pages when pushing to the main branch. The GitHub Actions workflow:

1. Runs linting and tests
2. Builds the production bundle with Vite
3. Deploys to GitHub Pages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run quality checks: `npm run format && npm run lint && npm test`
5. Submit a pull request

## License

MIT License

## Attribution

Based on the Adult Playfulness Trait Scale (APTS) by Dr. Xiangyou Shen.
