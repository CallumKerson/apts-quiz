import { defineConfig } from 'vite';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

// Plugin to load APTS quiz data and inject it into the HTML
function aptsDataPlugin() {
  return {
    name: 'apts-data',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // Load quiz data from YAML
        const yamlPath = path.resolve('src/data/questions.yaml');
        const yamlContent = fs.readFileSync(yamlPath, 'utf8');
        const data = yaml.load(yamlContent);

        // Convert to the same format as the old generator
        const config = transformToAPTSConfig(data);
        const jsConfig = `const APTS_CONFIG = ${JSON.stringify(config, null, 2)};`;

        // Replace placeholder in HTML
        return html.replace('{{ quiz_config | safe }}', jsConfig);
      },
    },
  };
}

// Transform YAML data to APTS config format
function transformToAPTSConfig(data) {
  const questions = {};
  const subscales = {};
  const compositeScores = {};
  const likertScale = data.likert_scale || [];

  // Process questions
  if (data.questions) {
    data.questions.forEach((q) => {
      questions[q.id] = {
        id: q.id,
        text: q.text,
        subscale: q.subscale,
      };
    });
  }

  // Process subscales
  if (data.subscales) {
    Object.entries(data.subscales).forEach(([key, subscale]) => {
      subscales[key] = {
        key: key,
        name: subscale.name,
        description: subscale.description,
        questions: subscale.questions || [],
        parent: subscale.parent || null,
      };
    });
  }

  // Process composite scores
  if (data.composite_scores) {
    Object.entries(data.composite_scores).forEach(([key, composite]) => {
      compositeScores[key] = {
        key: key,
        name: composite.name,
        description: composite.description,
        components: composite.components || [],
      };
    });
  }

  // Generate pages for quiz flow
  const pages = [];
  let pageNumber = 1;
  const totalPages = Object.keys(subscales).length;

  Object.entries(subscales).forEach(([key, subscale]) => {
    const pageQuestions = subscale.questions.map((qId) => questions[qId]).filter(Boolean);

    pages.push({
      page_number: pageNumber,
      subscale_key: key,
      subscale_name: subscale.name,
      questions: pageQuestions,
      total_pages: totalPages,
      is_first: pageNumber === 1,
      is_last: pageNumber === totalPages,
    });

    pageNumber++;
  });

  return {
    questions,
    subscales,
    compositeScores,
    likertScale,
    pages,
  };
}

export default defineConfig({
  base: '/apts-quiz/',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 8000,
    open: true,
  },
  plugins: [aptsDataPlugin()],
});
